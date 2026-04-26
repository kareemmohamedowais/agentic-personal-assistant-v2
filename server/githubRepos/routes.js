// ─── GitHub Repos API Routes ────────────────────────────────────────────────
import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware.js";
import { parseGitHubUrl, fetchRepoInfo, cloneRepo, cleanupClone } from "./fetcher.js";
import { parseRepoFiles } from "./parser.js";
import { indexRepoFiles, deleteRepoVectors } from "./indexer.js";
import { MAX_REPOS_PER_USER } from "./config.js";
import db from "../db.js";

const router = Router();

// ─── Installation progress tracking ─────────────────────────
const installProgress = new Map(); // repoFullName → { progress, total, phase }

// ─── GET /api/github-repos/repos ────────────────────────────
// All repos with status + user prefs
router.get("/repos", requireAuth, (req, res) => {
  const userId = req.user.userId;

  const repos = db
    .prepare("SELECT * FROM github_repos WHERE added_by = ? ORDER BY created_at DESC")
    .all(userId);
  const userPrefs = db
    .prepare("SELECT repo_id, enabled FROM github_repos_user_prefs WHERE user_id = ?")
    .all(userId);
  const prefsMap = new Map(userPrefs.map((p) => [p.repo_id, p.enabled === 1]));

  const result = repos.map((repo) => {
    const isReady = repo.status === "ready";
    return {
      id: repo.id,
      owner: repo.owner,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stars,
      defaultBranch: repo.default_branch,
      status: repo.status,
      fileCount: repo.file_count,
      chunkCount: repo.chunk_count,
      totalSize: repo.total_size,
      addedBy: repo.added_by,
      isPublic: repo.is_public === 1,
      indexedAt: repo.indexed_at,
      errorMessage: repo.error_message,
      createdAt: repo.created_at,
      enabled: isReady ? (prefsMap.has(repo.id) ? prefsMap.get(repo.id) : true) : false,
    };
  });

  res.json({ repos: result });
});

// ─── POST /api/github-repos/add ─────────────────────────────
// Add a new repo (any authenticated user)
router.post("/add", requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "رابط المستودع مطلوب" });

  // Parse URL
  const parsed = parseGitHubUrl(url);
  if (!parsed) return res.status(400).json({ error: "رابط GitHub غير صالح" });

  // Check limit
  const userRepoCount = db
    .prepare("SELECT COUNT(*) as cnt FROM github_repos WHERE added_by = ?")
    .get(userId);
  if (userRepoCount.cnt >= MAX_REPOS_PER_USER) {
    return res.status(400).json({ error: `تجاوزت الحد الأقصى (${MAX_REPOS_PER_USER} مستودع)` });
  }

  // Check if already added by THIS user
  const existing = db
    .prepare("SELECT id, status FROM github_repos WHERE full_name = ? AND added_by = ?")
    .get(parsed.fullName, userId);
  if (existing) {
    if (existing.status === "ready") {
      return res.status(409).json({ error: "المستودع مضاف بالفعل", repoId: existing.id });
    }
    if (["pending", "cloning", "parsing", "indexing"].includes(existing.status)) {
      return res.status(409).json({ error: "جاري معالجة المستودع بالفعل" });
    }
    // If error, allow re-add — delete old record
    db.prepare("DELETE FROM github_repos WHERE id = ?").run(existing.id);
  }

  // Fetch repo info from GitHub
  let repoInfo;
  try {
    repoInfo = await fetchRepoInfo(parsed.owner, parsed.name);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  if (repoInfo.isPrivate) {
    return res.status(400).json({ error: "المستودعات الخاصة غير مدعومة حالياً" });
  }

  // Insert into DB
  const result = db
    .prepare(
      `
    INSERT INTO github_repos (owner, name, full_name, description, language, stars, default_branch, status, added_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `
    )
    .run(
      repoInfo.owner,
      repoInfo.name,
      repoInfo.fullName,
      repoInfo.description,
      repoInfo.language,
      repoInfo.stars,
      repoInfo.defaultBranch,
      userId
    );

  const repoId = result.lastInsertRowid;

  res.json({
    ok: true,
    message: `بدأ معالجة ${repoInfo.fullName}`,
    repoId,
    repo: repoInfo,
  });

  // Run in background
  runRepoIngestion(repoId, repoInfo, userId).catch((err) => {
    console.error(`❌ [${repoInfo.fullName}] Ingestion failed:`, err.message);
  });
});

// ─── Background ingestion pipeline ──────────────────────────
async function runRepoIngestion(repoId, repoInfo, userId) {
  const fullName = repoInfo.fullName;
  let cloneDir = null;

  try {
    // Phase 1: Clone
    db.prepare("UPDATE github_repos SET status = 'cloning' WHERE id = ?").run(repoId);
    installProgress.set(fullName, { progress: 0, total: 0, phase: "cloning" });

    cloneDir = await cloneRepo(repoInfo.owner, repoInfo.name, repoInfo.defaultBranch);

    // Phase 2: Parse
    db.prepare("UPDATE github_repos SET status = 'parsing' WHERE id = ?").run(repoId);
    installProgress.set(fullName, { progress: 0, total: 0, phase: "parsing" });

    const parsed = parseRepoFiles(cloneDir, fullName, (progress, total, phase) => {
      installProgress.set(fullName, { progress, total, phase });
    });

    if (parsed.files.length === 0) {
      throw new Error("لم يتم العثور على ملفات قابلة للفهرسة في المستودع");
    }

    // Phase 3: Index
    db.prepare("UPDATE github_repos SET status = 'indexing' WHERE id = ?").run(repoId);

    const chunkCount = await indexRepoFiles(parsed, fullName, userId, (progress, total, phase) => {
      installProgress.set(fullName, { progress, total, phase });
    });

    // Phase 4: Success
    db.prepare(
      `
      UPDATE github_repos
      SET status = 'ready', file_count = ?, chunk_count = ?, total_size = ?,
          indexed_at = datetime('now'), error_message = NULL
      WHERE id = ?
    `
    ).run(parsed.stats.totalFiles, chunkCount, parsed.stats.totalSize, repoId);

    installProgress.delete(fullName);
    console.log(`🎉 [${fullName}] Ingestion complete! ${chunkCount} chunks indexed`);
  } catch (err) {
    db.prepare("UPDATE github_repos SET status = 'error', error_message = ? WHERE id = ?").run(
      err.message,
      repoId
    );
    installProgress.delete(fullName);
    console.error(`❌ [${fullName}] Ingestion error:`, err.message);
  } finally {
    if (cloneDir) cleanupClone(cloneDir);
  }
}

// ─── DELETE /api/github-repos/remove/:id ────────────────────
router.delete("/remove/:id", requireAuth, async (req, res) => {
  const repoId = parseInt(req.params.id);
  const userId = req.user.userId;
  const isAdmin = req.user.role === "admin";

  const repo = db.prepare("SELECT * FROM github_repos WHERE id = ?").get(repoId);
  if (!repo) return res.status(404).json({ error: "المستودع غير موجود" });

  // Only admin or the user who added can remove
  if (!isAdmin && repo.added_by !== userId) {
    return res.status(403).json({ error: "غير مصرح بحذف هذا المستودع" });
  }

  try {
    if (repo.status === "ready") {
      await deleteRepoVectors(repo.full_name, repo.added_by);
    }

    db.prepare("DELETE FROM github_repos_user_prefs WHERE repo_id = ?").run(repoId);
    db.prepare("DELETE FROM github_repos WHERE id = ?").run(repoId);

    res.json({ ok: true, message: `تم حذف ${repo.full_name}` });
  } catch (err) {
    console.error(`❌ Remove error for ${repo.full_name}:`, err);
    res.status(500).json({ error: "فشل الحذف" });
  }
});

// ─── POST /api/github-repos/reindex/:id ─────────────────────
router.post("/reindex/:id", requireAuth, requireAdmin, async (req, res) => {
  const repoId = parseInt(req.params.id);

  const repo = db.prepare("SELECT * FROM github_repos WHERE id = ?").get(repoId);
  if (!repo) return res.status(404).json({ error: "المستودع غير موجود" });
  if (repo.status !== "ready" && repo.status !== "error") {
    return res.status(400).json({ error: "يجب أن يكون المستودع جاهزاً أو في حالة خطأ" });
  }

  db.prepare("UPDATE github_repos SET status = 'pending' WHERE id = ?").run(repoId);

  const repoInfo = {
    owner: repo.owner,
    name: repo.name,
    fullName: repo.full_name,
    defaultBranch: repo.default_branch,
  };

  res.json({ ok: true, message: `بدأ إعادة فهرسة ${repo.full_name}` });

  runRepoIngestion(repoId, repoInfo).catch(console.error);
});

// ─── GET /api/github-repos/status/:id ───────────────────────
router.get("/status/:id", requireAuth, (req, res) => {
  const repoId = parseInt(req.params.id);
  const userId = req.user.userId;
  const isAdmin = req.user.role === "admin";

  const repo = db.prepare("SELECT * FROM github_repos WHERE id = ?").get(repoId);
  if (!repo) return res.status(404).json({ error: "المستودع غير موجود" });

  if (!isAdmin && repo.added_by !== userId) {
    return res.status(403).json({ error: "غير مصرح" });
  }

  const progress = installProgress.get(repo.full_name) || null;

  res.json({
    id: repo.id,
    fullName: repo.full_name,
    status: repo.status,
    fileCount: repo.file_count,
    chunkCount: repo.chunk_count,
    indexedAt: repo.indexed_at,
    errorMessage: repo.error_message,
    progress,
  });
});

// ─── GET /api/github-repos/my-prefs ─────────────────────────
router.get("/my-prefs", requireAuth, (req, res) => {
  const userId = req.user.userId;

  const rows = db
    .prepare("SELECT repo_id, enabled FROM github_repos_user_prefs WHERE user_id = ?")
    .all(userId);

  const readyRepos = db
    .prepare("SELECT id, full_name FROM github_repos WHERE status = 'ready' AND added_by = ?")
    .all(userId);

  const prefsMap = new Map(rows.map((r) => [r.repo_id, r.enabled === 1]));

  // Default: all ready repos enabled
  const enabledRepos = readyRepos
    .filter((r) => (prefsMap.has(r.id) ? prefsMap.get(r.id) : true))
    .map((r) => r.full_name);

  res.json({ enabledRepos });
});

// ─── PUT /api/github-repos/my-prefs ─────────────────────────
router.put("/my-prefs", requireAuth, (req, res) => {
  const { enabledRepos } = req.body;
  if (!Array.isArray(enabledRepos)) {
    return res.status(400).json({ error: "enabledRepos مطلوب كمصفوفة" });
  }

  const userId = req.user.userId;

  const readyRepos = db
    .prepare("SELECT id, full_name FROM github_repos WHERE status = 'ready' AND added_by = ?")
    .all(userId);
  const repoNameToId = new Map(readyRepos.map((r) => [r.full_name, r.id]));

  // Validate
  const safeRepos = enabledRepos.filter((name) => repoNameToId.has(name));

  // Delete old prefs
  db.prepare("DELETE FROM github_repos_user_prefs WHERE user_id = ?").run(userId);

  // Insert new prefs
  const insert = db.prepare(
    "INSERT INTO github_repos_user_prefs (user_id, repo_id, enabled) VALUES (?, ?, ?)"
  );
  const transaction = db.transaction(() => {
    for (const repo of readyRepos) {
      insert.run(userId, repo.id, safeRepos.includes(repo.full_name) ? 1 : 0);
    }
  });
  transaction();

  res.json({ ok: true, enabledRepos: safeRepos });
});

export default router;
