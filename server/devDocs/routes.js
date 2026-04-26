// ─── Developer Docs API Routes ──────────────────────────────────────────────
import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware.js";
import { FRAMEWORKS, CATEGORIES, getFrameworkById } from "./frameworks.js";
import { crawlDocs } from "./crawler.js";
import { parsePages } from "./parser.js";
import { indexDocs, deleteFrameworkVectors, reindexFramework } from "./indexer.js";
import db from "../db.js";

const router = Router();

// ─── Installation progress tracking ─────────────────────────
const installProgress = new Map(); // frameworkId → { progress, total, phase }

// ─── GET /api/dev-docs/frameworks ───────────────────────────
// قائمة الـ frameworks مع حالة التثبيت + تفضيلات المستخدم
router.get("/frameworks", requireAuth, (req, res) => {
  const userId = req.user.userId;

  // جلب حالة الـ packs المثبتة
  const packs = db.prepare("SELECT * FROM dev_docs_packs").all();
  const packsMap = new Map(packs.map((p) => [p.framework, p]));

  // جلب تفضيلات المستخدم
  const userPrefs = db
    .prepare("SELECT framework, enabled FROM dev_docs_user_prefs WHERE user_id = ?")
    .all(userId);
  const prefsMap = new Map(userPrefs.map((p) => [p.framework, p.enabled === 1]));

  const result = FRAMEWORKS.map((fw) => {
    const pack = packsMap.get(fw.id);
    const isReady = pack?.status === "ready";

    return {
      framework: fw.id,
      displayName: fw.name,
      icon: fw.icon,
      version: fw.version,
      category: fw.category,
      docsUrl: fw.docsUrl,
      status: pack?.status || "available",
      chunkCount: pack?.chunk_count || 0,
      pageCount: pack?.page_count || 0,
      installedAt: pack?.installed_at || null,
      errorMessage: pack?.error_message || null,
      // تفعيل المستخدم: default = true إذا مثبت, false إذا لا
      enabled: isReady ? (prefsMap.has(fw.id) ? prefsMap.get(fw.id) : true) : false,
    };
  });

  res.json({ frameworks: result, categories: CATEGORIES.map((c) => c.id) });
});

// ─── POST /api/dev-docs/install/:framework ──────────────────
// تثبيت docs (Admin فقط) — يعمل في الخلفية
router.post("/install/:framework", requireAuth, requireAdmin, async (req, res) => {
  const frameworkId = req.params.framework;
  const fw = getFrameworkById(frameworkId);
  if (!fw) return res.status(404).json({ error: "Framework غير موجود" });

  // فحص: هل هو مثبت بالفعل أو يتم تثبيته؟
  const existing = db
    .prepare("SELECT status FROM dev_docs_packs WHERE framework = ?")
    .get(frameworkId);
  if (existing?.status === "installing") {
    return res.status(409).json({ error: "جاري التثبيت بالفعل" });
  }

  // إنشاء أو تحديث سجل
  db.prepare(
    `
    INSERT INTO dev_docs_packs (framework, display_name, icon, version, status, docs_url, installed_by)
    VALUES (?, ?, ?, ?, 'installing', ?, ?)
    ON CONFLICT(framework) DO UPDATE SET
      status = 'installing', error_message = NULL, installed_by = ?
  `
  ).run(frameworkId, fw.name, fw.icon, fw.version, fw.docsUrl, req.user.userId, req.user.userId);

  // رد فوري
  res.json({ ok: true, message: `بدأ تثبيت ${fw.name}`, framework: frameworkId });

  // تشغيل في الخلفية
  runInstallation(frameworkId, fw).catch((err) => {
    console.error(`❌ [${frameworkId}] Installation failed:`, err.message);
  });
});

// ─── عملية التثبيت في الخلفية ───────────────────────────────
async function runInstallation(frameworkId, fw) {
  try {
    installProgress.set(frameworkId, { progress: 0, total: 0, phase: "crawling" });

    // 1. زحف
    const pages = await crawlDocs(frameworkId, (crawled, total, phase) => {
      installProgress.set(frameworkId, { progress: crawled, total, phase });
    });

    if (pages.length === 0) {
      throw new Error("لم يتم العثور على صفحات للفهرسة");
    }

    // 2. تحليل
    installProgress.set(frameworkId, { progress: 0, total: pages.length, phase: "parsing" });
    const parsedDocs = parsePages(pages, frameworkId, fw.crawlConfig);

    if (parsedDocs.length === 0) {
      throw new Error("لم يتم استخراج محتوى من الصفحات");
    }

    // 3. فهرسة
    const chunkCount = await indexDocs(
      parsedDocs,
      frameworkId,
      fw.version,
      (indexed, total, phase) => {
        installProgress.set(frameworkId, { progress: indexed, total, phase });
      }
    );

    // 4. تحديث حالة النجاح
    db.prepare(
      `
      UPDATE dev_docs_packs
      SET status = 'ready', chunk_count = ?, page_count = ?, installed_at = datetime('now'), error_message = NULL
      WHERE framework = ?
    `
    ).run(chunkCount, parsedDocs.length, frameworkId);

    installProgress.delete(frameworkId);
    console.log(`🎉 [${frameworkId}] Installation complete! ${chunkCount} chunks indexed`);
  } catch (err) {
    db.prepare(
      `
      UPDATE dev_docs_packs SET status = 'error', error_message = ? WHERE framework = ?
    `
    ).run(err.message, frameworkId);
    installProgress.delete(frameworkId);
  }
}

// ─── DELETE /api/dev-docs/uninstall/:framework ──────────────
router.delete("/uninstall/:framework", requireAuth, requireAdmin, async (req, res) => {
  const frameworkId = req.params.framework;

  const pack = db.prepare("SELECT id FROM dev_docs_packs WHERE framework = ?").get(frameworkId);
  if (!pack) return res.status(404).json({ error: "غير مثبت" });

  try {
    // حذف vectors من Pinecone
    await deleteFrameworkVectors(frameworkId);

    // حذف سجلات DB
    db.prepare("DELETE FROM dev_docs_packs WHERE framework = ?").run(frameworkId);
    db.prepare("DELETE FROM dev_docs_user_prefs WHERE framework = ?").run(frameworkId);

    res.json({ ok: true, message: `تم حذف ${frameworkId}` });
  } catch (err) {
    console.error(`❌ Uninstall error for ${frameworkId}:`, err);
    res.status(500).json({ error: "فشل الحذف" });
  }
});

// ─── POST /api/dev-docs/update/:framework ───────────────────
// إعادة فهرسة يدوية (Admin فقط)
router.post("/update/:framework", requireAuth, requireAdmin, async (req, res) => {
  const frameworkId = req.params.framework;
  const fw = getFrameworkById(frameworkId);
  if (!fw) return res.status(404).json({ error: "Framework غير موجود" });

  const pack = db.prepare("SELECT status FROM dev_docs_packs WHERE framework = ?").get(frameworkId);
  if (!pack || pack.status !== "ready") {
    return res.status(400).json({ error: "يجب أن يكون مثبتاً أولاً" });
  }

  db.prepare("UPDATE dev_docs_packs SET status = 'installing' WHERE framework = ?").run(
    frameworkId
  );

  res.json({ ok: true, message: `بدأ تحديث ${fw.name}` });

  // تشغيل في الخلفية
  (async () => {
    try {
      const pages = await crawlDocs(frameworkId);
      const parsedDocs = parsePages(pages, frameworkId, fw.crawlConfig);
      const chunkCount = await reindexFramework(parsedDocs, frameworkId, fw.version);

      db.prepare(
        `
        UPDATE dev_docs_packs
        SET status = 'ready', chunk_count = ?, page_count = ?, installed_at = datetime('now'), error_message = NULL
        WHERE framework = ?
      `
      ).run(chunkCount, parsedDocs.length, frameworkId);
    } catch (err) {
      db.prepare(
        "UPDATE dev_docs_packs SET status = 'error', error_message = ? WHERE framework = ?"
      ).run(err.message, frameworkId);
    }
  })().catch(console.error);
});

// ─── GET /api/dev-docs/status/:framework ────────────────────
router.get("/status/:framework", requireAuth, (req, res) => {
  const frameworkId = req.params.framework;

  const pack = db.prepare("SELECT * FROM dev_docs_packs WHERE framework = ?").get(frameworkId);
  const progress = installProgress.get(frameworkId) || null;

  res.json({
    framework: frameworkId,
    status: pack?.status || "available",
    chunkCount: pack?.chunk_count || 0,
    pageCount: pack?.page_count || 0,
    installedAt: pack?.installed_at || null,
    errorMessage: pack?.error_message || null,
    progress,
  });
});

// ─── GET /api/dev-docs/my-prefs ─────────────────────────────
// تفضيلات المستخدم: أي frameworks مفعّلة
router.get("/my-prefs", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT framework, enabled FROM dev_docs_user_prefs WHERE user_id = ?")
    .all(req.user.userId);

  // الـ frameworks المثبتة والـ ready
  const readyFrameworks = db
    .prepare("SELECT framework FROM dev_docs_packs WHERE status = 'ready'")
    .all()
    .map((r) => r.framework);

  const prefsMap = new Map(rows.map((r) => [r.framework, r.enabled === 1]));

  // Default: كل الـ ready frameworks مفعّلة
  const enabledFrameworks = readyFrameworks.filter((fw) =>
    prefsMap.has(fw) ? prefsMap.get(fw) : true
  );

  res.json({ enabledFrameworks });
});

// ─── PUT /api/dev-docs/my-prefs ─────────────────────────────
// تحديث تفضيلات المستخدم
router.put("/my-prefs", requireAuth, (req, res) => {
  const { enabledFrameworks } = req.body;
  if (!Array.isArray(enabledFrameworks)) {
    return res.status(400).json({ error: "enabledFrameworks مطلوب كمصفوفة" });
  }

  const userId = req.user.userId;

  // Validate framework IDs
  const validIds = new Set(FRAMEWORKS.map((f) => f.id));
  const safeFrameworks = enabledFrameworks.filter((f) => validIds.has(f));

  // الـ frameworks المثبتة
  const readyFrameworks = db
    .prepare("SELECT framework FROM dev_docs_packs WHERE status = 'ready'")
    .all()
    .map((r) => r.framework);

  // حذف تفضيلات قديمة
  db.prepare("DELETE FROM dev_docs_user_prefs WHERE user_id = ?").run(userId);

  // إدراج التفضيلات الجديدة
  const insert = db.prepare(
    "INSERT INTO dev_docs_user_prefs (user_id, framework, enabled) VALUES (?, ?, ?)"
  );
  const transaction = db.transaction(() => {
    for (const fw of readyFrameworks) {
      insert.run(userId, fw, safeFrameworks.includes(fw) ? 1 : 0);
    }
  });
  transaction();

  res.json({ ok: true, enabledFrameworks: safeFrameworks });
});

export default router;
