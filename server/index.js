import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { readFile, unlink, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { runAgent, streamAgent, getKeysStatus } from "./agent.js";
import { ingestData } from "./ingest.js";
import { deleteDocumentVectors } from "./tools.js";
import { MODELS, PROVIDERS } from "./providers/models.js";
import { isSupportedFile, SUPPORTED_EXTENSIONS } from "./documentLoader.js";
import authRouter from "./auth.js";
import devDocsRouter from "./devDocs/routes.js";
import githubReposRouter from "./githubRepos/routes.js";
import { requireAuth, requireAdmin } from "./middleware.js";
import db from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.join(__dirname, "uploads", "media");
fs.mkdirSync(MEDIA_DIR, { recursive: true });

const app = express();

// ─── Security: Helmet HTTP headers ──────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// ─── Security: CORS restricted to allowed origins ───────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3001"];
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json());

// ─── Security: Rate limiting ────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "طلبات كثيرة جداً — حاول بعد قليل" },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات كثيرة — حاول بعد 15 دقيقة" },
});

// ─── Health check (before auth) ─────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// ─── Serve uploaded media files (protected) ─────────────────
app.get("/api/media/:filename", requireAuth, (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(MEDIA_DIR, safeFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "الملف غير موجود" });
  }
  res.sendFile(filePath);
});

// ─── Auth routes (public, rate-limited) ─────────────────────
app.use("/api/auth", authLimiter, authRouter);

// ─── General API rate limiter ───────────────────────────────
app.use("/api", generalLimiter);

// ─── Developer Docs Helper routes ───────────────────────────
app.use("/api/dev-docs", devDocsRouter);

// ─── GitHub Repos Knowledge routes ──────────────────────────
app.use("/api/github-repos", githubReposRouter);

// ─── Multer for PDF uploads ─────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = isSupportedFile(file.mimetype, file.originalname);
    cb(
      allowed
        ? null
        : new Error(`Unsupported file type. Allowed: ${SUPPORTED_EXTENSIONS.join(", ")}`),
      allowed
    );
  },
  limits: { fileSize: 25 * 1024 * 1024 },
});

// ─── Multer for chat media (images + audio) ─────────────────
const ALLOWED_MEDIA_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
];

const chatUpload = multer({
  storage: multer.diskStorage({
    destination: MEDIA_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = ALLOWED_MEDIA_MIMES.includes(file.mimetype);
    cb(allowed ? null : new Error("Unsupported media type"), allowed);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ─── Conversations routes (protected) ────────────────────────

// قائمة محادثات المستخدم مرتبة من الأحدث

app.get("/api/conversations", requireAuth, (req, res) => {
  const { search, tag } = req.query;
  let query = `SELECT id, title, created_at, updated_at, is_pinned, tags, prompt_id FROM conversations WHERE user_id = ?`;
  const params = [req.user.userId];
  if (search) {
    query += ` AND title LIKE ?`;
    params.push(`%${search}%`);
  }
  if (tag) {
    query += ` AND (',' || tags || ',') LIKE ?`;
    params.push(`%,${tag},%`);
  }
  query += ` ORDER BY is_pinned DESC, updated_at DESC LIMIT 50`;
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// إنشاء محادثة جديدة
app.post("/api/conversations", requireAuth, (req, res) => {
  const result = db
    .prepare(`INSERT INTO conversations (user_id, title) VALUES (?, ?)`)
    .run(req.user.userId, req.body.title || "محادثة جديدة");
  const conv = db
    .prepare(`SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?`)
    .get(result.lastInsertRowid);
  res.status(201).json(conv);
});

// رسائل محادثة محددة
app.get("/api/conversations/:id/messages", requireAuth, (req, res) => {
  const conv = db
    .prepare(`SELECT id FROM conversations WHERE id = ? AND user_id = ?`)
    .get(req.params.id, req.user.userId);
  if (!conv) return res.status(404).json({ error: "المحادثة غير موجودة" });

  const messages = db
    .prepare(
      `SELECT role, content, created_at, media_type, media_url FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`
    )
    .all(req.params.id);
  res.json(messages);
});

// حذف محادثة
app.delete("/api/conversations/:id", requireAuth, (req, res) => {
  const result = db
    .prepare(`DELETE FROM conversations WHERE id = ? AND user_id = ?`)
    .run(req.params.id, req.user.userId);
  if (result.changes === 0) return res.status(404).json({ error: "المحادثة غير موجودة" });
  res.json({ ok: true });
});

// تثبيت / إلغاء تثبيت محادثة
app.put("/api/conversations/:id/pin", requireAuth, (req, res) => {
  const conv = db
    .prepare(`SELECT id, is_pinned FROM conversations WHERE id = ? AND user_id = ?`)
    .get(req.params.id, req.user.userId);
  if (!conv) return res.status(404).json({ error: "المحادثة غير موجودة" });
  const newVal = conv.is_pinned ? 0 : 1;
  db.prepare(`UPDATE conversations SET is_pinned = ? WHERE id = ?`).run(newVal, conv.id);
  res.json({ is_pinned: newVal });
});

// تغيير عنوان المحادثة
app.put("/api/conversations/:id/rename", requireAuth, (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "العنوان مطلوب" });
  const conv = db
    .prepare(`SELECT id FROM conversations WHERE id = ? AND user_id = ?`)
    .get(req.params.id, req.user.userId);
  if (!conv) return res.status(404).json({ error: "المحادثة غير موجودة" });
  const newTitle = title.trim().slice(0, 100);
  db.prepare(`UPDATE conversations SET title = ? WHERE id = ?`).run(newTitle, conv.id);
  res.json({ ok: true, title: newTitle });
});

// تغيير شخصية المحادثة
app.put("/api/conversations/:id/prompt", requireAuth, (req, res) => {
  const conv = db
    .prepare(`SELECT id FROM conversations WHERE id = ? AND user_id = ?`)
    .get(req.params.id, req.user.userId);
  if (!conv) return res.status(404).json({ error: "المحادثة غير موجودة" });
  const promptId = req.body.promptId ?? null;
  db.prepare(`UPDATE conversations SET prompt_id = ? WHERE id = ?`).run(promptId, conv.id);
  res.json({ ok: true, prompt_id: promptId });
});

// تعديل تاجات المحادثة
app.put("/api/conversations/:id/tags", requireAuth, (req, res) => {
  const conv = db
    .prepare(`SELECT id FROM conversations WHERE id = ? AND user_id = ?`)
    .get(req.params.id, req.user.userId);
  if (!conv) return res.status(404).json({ error: "المحادثة غير موجودة" });
  const tags = (req.body.tags || []).join(",");
  db.prepare(`UPDATE conversations SET tags = ? WHERE id = ?`).run(tags, conv.id);
  res.json({ ok: true, tags });
});

// ─── Documents management (protected) ───────────────────────

// قائمة ملفات المستخدم
app.get("/api/documents", requireAuth, (req, res) => {
  const docs = db
    .prepare(
      `SELECT id, original_name, file_size, file_type, chunk_count, status, created_at
       FROM documents WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(req.user.userId);
  res.json(docs);
});

// حذف ملف
app.delete("/api/documents/:id", requireAuth, async (req, res) => {
  const doc = db
    .prepare(`SELECT id, original_name FROM documents WHERE id = ? AND user_id = ?`)
    .get(req.params.id, req.user.userId);
  if (!doc) return res.status(404).json({ error: "الملف غير موجود" });

  try {
    // حذف الـ vectors من Pinecone أولاً
    await deleteDocumentVectors(req.user.userId, req.params.id);

    // حذف السجل من SQLite
    db.prepare(`DELETE FROM documents WHERE id = ?`).run(req.params.id);
    console.log(`🗑️ [user:${req.user.userId}] Deleted document: ${doc.original_name}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting document:", err);
    res.status(500).json({ error: "فشل حذف الملف" });
  }
});

// ─── Prompts endpoints (protected) ──────────────────────────

// قائمة الـ Prompts (الافتراضية + الخاصة بالمستخدم)
app.get("/api/prompts", requireAuth, (req, res) => {
  const prompts = db
    .prepare(
      `SELECT id, name, description, icon, is_default, created_at
       FROM prompts WHERE user_id IS NULL OR user_id = ?
       ORDER BY is_default DESC, created_at ASC`
    )
    .all(req.user.userId);
  res.json(prompts);
});

// إنشاء prompt خاص
app.post("/api/prompts", requireAuth, (req, res) => {
  const { name, description, system_prompt, icon } = req.body;
  if (!name || !system_prompt) {
    return res.status(400).json({ error: "الاسم والـ prompt مطلوبان" });
  }

  const result = db
    .prepare(
      `INSERT INTO prompts (user_id, name, description, system_prompt, icon, is_default)
       VALUES (?, ?, ?, ?, ?, 0)`
    )
    .run(req.user.userId, name, description || "", system_prompt, icon || "🤖");

  const prompt = db
    .prepare(`SELECT id, name, description, icon, is_default, created_at FROM prompts WHERE id = ?`)
    .get(result.lastInsertRowid);
  res.status(201).json(prompt);
});

// حذف prompt خاص (لا يمكن حذف الافتراضي)
app.delete("/api/prompts/:id", requireAuth, (req, res) => {
  const result = db
    .prepare(`DELETE FROM prompts WHERE id = ? AND user_id = ? AND is_default = 0`)
    .run(req.params.id, req.user.userId);
  if (result.changes === 0)
    return res.status(404).json({ error: "الـ Prompt غير موجود أو لا يمكن حذفه" });
  res.json({ ok: true });
});

// ─── Chat endpoint (protected) ──────────────────────────────
app.post("/api/chat", requireAuth, async (req, res) => {
  try {
    let { message, conversationId, promptId, tag } = req.body;
    if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

    // إنشاء محادثة تلقائياً إذا لم تُرسل معلومة
    if (!conversationId) {
      const result = db
        .prepare(`INSERT INTO conversations (user_id, title, prompt_id, tags) VALUES (?, ?, ?, ?)`)
        .run(req.user.userId, message.slice(0, 60), promptId || null, tag || null);
      conversationId = result.lastInsertRowid;
    } else {
      // التحقق من ملكية المحادثة
      const conv = db
        .prepare(`SELECT id, prompt_id, tags FROM conversations WHERE id = ? AND user_id = ?`)
        .get(conversationId, req.user.userId);
      if (!conv) return res.status(403).json({ error: "غير مصرح" });
      if (!promptId && conv.prompt_id) promptId = conv.prompt_id;
      if (!tag && conv.tags) tag = conv.tags;
    }

    const requestedTag = String(tag || "").toLowerCase();
    const requestedWebSearch =
      req.body.enableWebSearch === true || req.body.enableWebSearch === "true";
    const requestedDevDocsMode = req.body.devDocsMode === true || req.body.devDocsMode === "true";
    const requestedGithubReposMode =
      req.body.githubReposMode === true || req.body.githubReposMode === "true";

    const enforceSingleSource = {
      enableWebSearch: requestedWebSearch,
      devDocsMode: requestedDevDocsMode,
      githubReposMode: requestedGithubReposMode,
    };

    if (requestedTag === "document") {
      enforceSingleSource.enableWebSearch = false;
      enforceSingleSource.devDocsMode = false;
      enforceSingleSource.githubReposMode = false;
    } else if (requestedTag === "github") {
      enforceSingleSource.enableWebSearch = false;
      enforceSingleSource.devDocsMode = false;
      enforceSingleSource.githubReposMode = true;
    } else if (requestedTag === "devdocs") {
      enforceSingleSource.enableWebSearch = false;
      enforceSingleSource.devDocsMode = true;
      enforceSingleSource.githubReposMode = false;
    }

    const answer = await runAgent({
      userId: req.user.userId,
      conversationId,
      message,
      promptId,
      provider: req.body.provider,
      model: req.body.model,
      optimize: req.body.optimize === true || req.body.optimize === "true",
      enableWebSearch: enforceSingleSource.enableWebSearch,
      devDocsMode: enforceSingleSource.devDocsMode,
      devDocsFrameworks: req.body.devDocsFrameworks || [],
      githubReposMode: enforceSingleSource.githubReposMode,
      githubRepos: req.body.githubRepos || [],
    });
    const output = answer?.output || answer?.text || "";

    if (!output || output.trim() === "") {
      return res.json({
        answer: "لم أتمكن من توليد إجابة. حاول إعادة صياغة السؤال.",
        conversationId,
      });
    }

    res.json({ answer: output, conversationId });
  } catch (err) {
    console.error(err);

    const msg = err.message || "";

    // تجاوز حصة API
    if (msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota")) {
      const retryMatch = msg.match(/(\d+)s/);
      const seconds = retryMatch ? parseInt(retryMatch[1]) : null;
      return res.status(429).json({
        error: "quota_exceeded",
        message: seconds
          ? `تجاوزت الحد المسموح به من الطلبات. يرجى الانتظار ${seconds} ثانية ثم المحاولة مجدداً.`
          : "تجاوزت الحد المسموح به من الطلبات. حاول مجدداً بعد قليل.",
        retryAfter: seconds,
      });
    }

    // مشكلة في الاتصال بـ API
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("ENOTFOUND")) {
      return res.status(503).json({
        error: "network_error",
        message: "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.",
      });
    }

    res.status(500).json({ error: "server_error", message: "حدث خطأ داخلي. حاول مجدداً." });
  }
});

// ─── Streaming Chat endpoint (SSE) — supports media ─────────
app.post("/api/chat/stream", requireAuth, chatUpload.single("media"), async (req, res) => {
  try {
    let { message, conversationId, promptId, tag } = req.body;
    message = message || "";

    // يجب أن يكون هناك نص أو ملف وسائط
    if (!message.trim() && !req.file) {
      return res.status(400).json({ error: "الرسالة أو الملف مطلوب" });
    }

    // معالجة الملف المرفق
    let mediaData = null;
    if (req.file) {
      const mediaType = req.file.mimetype.startsWith("image/") ? "image" : "audio";
      const mediaUrl = `/api/media/${req.file.filename}`;

      // قراءة الملف كـ base64 لإرساله لـ Gemini
      const buffer = await readFile(req.file.path);
      const base64 = buffer.toString("base64");

      mediaData = {
        type: mediaType,
        mimeType: req.file.mimetype,
        base64,
        url: mediaUrl,
      };
    }

    // إنشاء محادثة تلقائياً إذا لم تُرسل
    if (!conversationId) {
      const title = message.trim()
        ? message.slice(0, 60)
        : mediaData
          ? `${mediaData.type === "image" ? "🖼️ صورة" : "🎤 صوت"}`
          : "محادثة جديدة";
      const result = db
        .prepare(`INSERT INTO conversations (user_id, title, prompt_id, tags) VALUES (?, ?, ?, ?)`)
        .run(req.user.userId, title, promptId || null, tag || null);
      conversationId = result.lastInsertRowid;
    } else {
      const conv = db
        .prepare(`SELECT id, prompt_id, tags FROM conversations WHERE id = ? AND user_id = ?`)
        .get(conversationId, req.user.userId);
      if (!conv) return res.status(403).json({ error: "غير مصرح" });
      if (!promptId && conv.prompt_id) promptId = conv.prompt_id;
      if (!tag && conv.tags) tag = conv.tags;
    }

    const requestedTag = String(tag || "").toLowerCase();
    const requestedWebSearch =
      req.body.enableWebSearch === "true" || req.body.enableWebSearch === true;
    const requestedDevDocsMode = req.body.devDocsMode === "true" || req.body.devDocsMode === true;
    const requestedGithubReposMode =
      req.body.githubReposMode === "true" || req.body.githubReposMode === true;

    const enforceSingleSource = {
      enableWebSearch: requestedWebSearch,
      devDocsMode: requestedDevDocsMode,
      githubReposMode: requestedGithubReposMode,
    };

    if (requestedTag === "document") {
      enforceSingleSource.enableWebSearch = false;
      enforceSingleSource.devDocsMode = false;
      enforceSingleSource.githubReposMode = false;
    } else if (requestedTag === "github") {
      enforceSingleSource.enableWebSearch = false;
      enforceSingleSource.devDocsMode = false;
      enforceSingleSource.githubReposMode = true;
    } else if (requestedTag === "devdocs") {
      enforceSingleSource.enableWebSearch = false;
      enforceSingleSource.devDocsMode = true;
      enforceSingleSource.githubReposMode = false;
    }

    // إعداد SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // إرسال conversationId + mediaUrl فوراً
    res.write(
      `data: ${JSON.stringify({ type: "meta", conversationId, mediaUrl: mediaData?.url || null })}\n\n`
    );

    try {
      const { stream, saveAndSummarize, optimizedPrompt, usedProvider, usedModel } =
        await streamAgent({
          userId: req.user.userId,
          conversationId,
          message:
            message.trim() ||
            (mediaData?.type === "image" ? "ما في هذه الصورة؟" : "ما محتوى هذا التسجيل الصوتي؟"),
          promptId,
          mediaData,
          provider: req.body.provider,
          model: req.body.model,
          optimize: req.body.optimize === "true" || req.body.optimize === true,
          enableWebSearch: enforceSingleSource.enableWebSearch,
          devDocsMode: enforceSingleSource.devDocsMode,
          devDocsFrameworks: req.body.devDocsFrameworks
            ? JSON.parse(req.body.devDocsFrameworks)
            : [],
          githubReposMode: enforceSingleSource.githubReposMode,
          githubRepos: req.body.githubRepos ? JSON.parse(req.body.githubRepos) : [],
        });

      // إرسال الـ prompt المحسّن إذا وجد
      if (optimizedPrompt) {
        res.write(
          `data: ${JSON.stringify({ type: "optimized_prompt", content: optimizedPrompt })}\n\n`
        );
      }

      // إذا تم الانتقال لموديل بديل (fallback)
      const requestedModel = req.body.model;
      if (usedModel && usedModel !== requestedModel) {
        res.write(`data: ${JSON.stringify({ type: "fallback", usedProvider, usedModel })}\n\n`);
      }

      let fullResponse = "";

      for await (const chunk of stream) {
        const token = typeof chunk.content === "string" ? chunk.content : "";
        if (token) {
          fullResponse += token;
          res.write(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`);
        }
      }

      if (!fullResponse.trim()) {
        fullResponse = "لم أتمكن من توليد إجابة. حاول إعادة صياغة السؤال.";
        res.write(`data: ${JSON.stringify({ type: "token", content: fullResponse })}\n\n`);
      }

      await saveAndSummarize(fullResponse, mediaData);

      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    } catch (innerErr) {
      console.error("Stream error:", innerErr);
      const msg = innerErr.message || "";
      let errorData = {
        type: "error",
        error: "server_error",
        message: `حدث خطأ: ${msg}`,
      };

      if (innerErr.code === "ALL_KEYS_EXHAUSTED") {
        errorData = {
          type: "error",
          error: "quota_exceeded",
          message: innerErr.message || "كل مفاتيح API وصلت للحد.",
          retryAfter: innerErr.retryAfter || null,
        };
      } else if (msg.includes("429") || msg.includes("quota")) {
        errorData = {
          type: "error",
          error: "quota_exceeded",
          message: "تجاوزت الحد المسموح به. حاول بعد قليل.",
        };
      } else if (msg.includes("fetch") || msg.includes("network")) {
        errorData = { type: "error", error: "network_error", message: "تعذّر الاتصال بالخادم." };
      }

      res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    }

    res.end();
  } catch (err) {
    console.error("SSE setup error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "server_error", message: "حدث خطأ داخلي." });
    }
  }
});

// ─── File ingestion endpoint (protected) ─────────────────────
app.post("/api/ingest", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.path) {
      return res.status(400).json({ error: "الملف مطلوب" });
    }

    const docId = await ingestData(
      req.file.path,
      req.user.userId,
      req.file.originalname,
      req.file.size
    );
    await unlink(req.file.path).catch(() => undefined);

    return res.json({ ok: true, docId });
  } catch (err) {
    if (req.file?.path) {
      await unlink(req.file.path).catch(() => undefined);
    }
    return res.status(500).json({ error: err.message });
  }
});

// ─── Analytics endpoint (protected) ─────────────────────────
app.get("/api/analytics", requireAuth, (req, res) => {
  const userId = req.user.userId;

  try {
    const totalMessages = db
      .prepare(`SELECT COUNT(*) as cnt FROM messages WHERE user_id = ?`)
      .get(userId).cnt;

    const totalConversations = db
      .prepare(`SELECT COUNT(*) as cnt FROM conversations WHERE user_id = ?`)
      .get(userId).cnt;

    const totalDocuments = db
      .prepare(`SELECT COUNT(*) as cnt FROM documents WHERE user_id = ?`)
      .get(userId).cnt;

    const totalChunks = db
      .prepare(
        `SELECT COALESCE(SUM(chunk_count), 0) as total FROM documents WHERE user_id = ? AND status = 'ready'`
      )
      .get(userId).total;

    // الرسائل اليومية (آخر 30 يوم)
    const dailyMessages = db
      .prepare(
        `SELECT date(created_at) as date, COUNT(*) as count
         FROM messages WHERE user_id = ?
         AND created_at >= datetime('now', '-30 days')
         GROUP BY date(created_at) ORDER BY date ASC`
      )
      .all(userId);

    // أنواع الملفات
    const fileTypes = db
      .prepare(
        `SELECT file_type as type, COUNT(*) as count
         FROM documents WHERE user_id = ?
         GROUP BY file_type ORDER BY count DESC`
      )
      .all(userId);

    // متوسط الرسائل يومياً
    const avgResult = db
      .prepare(
        `SELECT ROUND(AVG(cnt), 1) as avg FROM (
          SELECT COUNT(*) as cnt FROM messages
          WHERE user_id = ? GROUP BY date(created_at)
        )`
      )
      .get(userId);

    // رسائل المستخدم vs الـ AI
    const messageSplit = db
      .prepare(`SELECT role, COUNT(*) as count FROM messages WHERE user_id = ? GROUP BY role`)
      .all(userId);

    res.json({
      totalMessages,
      totalConversations,
      totalDocuments,
      totalChunks,
      dailyMessages,
      fileTypes,
      avgMessagesPerDay: avgResult?.avg || 0,
      messageSplit,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "فشل تحميل الإحصائيات" });
  }
});

// ─── API Keys status (diagnostic) ───────────────────────
app.get("/api/keys-status", requireAuth, (req, res) => {
  res.json(getKeysStatus());
});

// ─── Available models ───────────────────────────────
app.get("/api/models", requireAuth, (_req, res) => {
  res.json(MODELS);
});

// ─── User Settings ───────────────────────────────────
app.get("/api/user-settings", requireAuth, (req, res) => {
  let row = db.prepare(`SELECT * FROM user_settings WHERE user_id = ?`).get(req.user.userId);
  if (!row) {
    // إنشاء سجل افتراضي
    db.prepare(`INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)`).run(req.user.userId);
    row = db.prepare(`SELECT * FROM user_settings WHERE user_id = ?`).get(req.user.userId);
  }
  // لا نرجع المفاتيح كاملة — فقط مؤشر إذا موجود
  res.json({
    defaultProvider: row.default_provider,
    defaultModel: row.default_model,
    autoOptimize: row.auto_optimize === 1,
    hasGroqKey: !!row.groq_api_key,
    hasOpenRouterKey: !!row.openrouter_api_key,
  });
});

app.put("/api/user-settings", requireAuth, (req, res) => {
  const { defaultProvider, defaultModel, autoOptimize, groqApiKey, openrouterApiKey } = req.body;
  db.prepare(`INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)`).run(req.user.userId);

  const updates = [];
  const values = [];

  if (defaultProvider !== undefined) {
    updates.push("default_provider = ?");
    values.push(defaultProvider);
  }
  if (defaultModel !== undefined) {
    updates.push("default_model = ?");
    values.push(defaultModel);
  }
  if (autoOptimize !== undefined) {
    updates.push("auto_optimize = ?");
    values.push(autoOptimize ? 1 : 0);
  }
  // إذا أرسل مفتاح جديد (null = حذف، empty string = تجاهل)
  if (groqApiKey !== undefined) {
    updates.push("groq_api_key = ?");
    values.push(groqApiKey || null);
  }
  if (openrouterApiKey !== undefined) {
    updates.push("openrouter_api_key = ?");
    values.push(openrouterApiKey || null);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(req.user.userId);
    db.prepare(`UPDATE user_settings SET ${updates.join(", ")} WHERE user_id = ?`).run(...values);
  }

  res.json({ ok: true });
});

// ─── Test provider connection ──────────────────────────
app.post("/api/test-provider", requireAuth, async (req, res) => {
  const { provider, apiKey } = req.body;
  if (!provider || !apiKey)
    return res.status(400).json({ ok: false, error: "provider و apiKey مطلوبان" });
  try {
    const { createProvider } = await import("./providers/index.js");
    const { model } = createProvider(provider, null, {
      userApiKeys: { [provider]: apiKey },
    });
    const resp = await model.invoke([
      new (await import("@langchain/core/messages")).HumanMessage("Hi"),
    ]);
    res.json({ ok: true, response: resp?.content?.slice(0, 50) });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ─── Optimize prompt (standalone) ─────────────────────
app.post("/api/optimize-prompt", requireAuth, async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ ok: false, error: "message مطلوب" });
  try {
    const { optimizePrompt } = await import("./promptOptimizer.js");
    const optimized = await optimizePrompt(message.trim());
    res.json({ ok: true, optimized });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Admin Panel endpoints ───────────────────────────────

// قائمة المستخدمين
app.get("/api/admin/users", requireAuth, requireAdmin, (req, res) => {
  const users = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at,
              (SELECT COUNT(*) FROM conversations WHERE user_id = u.id) as conversations_count,
              (SELECT COUNT(*) FROM messages WHERE user_id = u.id) as messages_count,
              (SELECT COUNT(*) FROM documents WHERE user_id = u.id) as documents_count
       FROM users u ORDER BY u.created_at DESC`
    )
    .all();
  res.json(users);
});

// إحصائيات عامة للأدمن
app.get("/api/admin/stats", requireAuth, requireAdmin, (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  const totalConversations = db.prepare("SELECT COUNT(*) as c FROM conversations").get().c;
  const totalMessages = db.prepare("SELECT COUNT(*) as c FROM messages").get().c;
  const totalDocuments = db.prepare("SELECT COUNT(*) as c FROM documents").get().c;
  const activeUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE is_active = 1").get().c;
  const todayMessages = db
    .prepare("SELECT COUNT(*) as c FROM messages WHERE created_at >= date('now')")
    .get().c;
  res.json({
    totalUsers,
    totalConversations,
    totalMessages,
    totalDocuments,
    activeUsers,
    todayMessages,
  });
});

// تعطيل/تفعيل مستخدم
app.put("/api/admin/users/:id/toggle", requireAuth, requireAdmin, (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.userId) return res.status(400).json({ error: "لا يمكنك تعطيل حسابك" });
  const user = db.prepare("SELECT id, is_active FROM users WHERE id = ?").get(targetId);
  if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
  const newVal = user.is_active ? 0 : 1;
  db.prepare("UPDATE users SET is_active = ? WHERE id = ?").run(newVal, targetId);
  res.json({ is_active: newVal });
});

// تغيير صلاحية مستخدم (ترقية/تخفيض)
app.put("/api/admin/users/:id/role", requireAuth, requireAdmin, (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.userId)
    return res.status(400).json({ error: "لا يمكنك تغيير صلاحياتك" });
  const { role } = req.body;
  if (!["user", "admin"].includes(role)) return res.status(400).json({ error: "صلاحية غير صالحة" });
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, targetId);
  res.json({ ok: true, role });
});

// ─── Serve client build in production ────────────────────────
if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

// ─── Start server ───────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
