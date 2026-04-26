// ─── GitHub Repos — Fetcher (clone + cleanup) ───────────────────────────────
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile); //تشغيل git clone بشكل غير متزامن
const CLONE_TIMEOUT = 120_000; // 2 minutes

/**
 * Parse a GitHub URL into { owner, name, fullName }
 * Supports: https://github.com/owner/repo, github.com/owner/repo, owner/repo
 *           https://github.com/kareemmohamedowais/agentic-personal-assistant
 */
export function parseGitHubUrl(input) {
  const trimmed = input
    .trim()
    .replace(/\/+$/, "")       // احذف أي / في آخر الرابط
    .replace(/\.git$/, "");    // احذف .git في نهاية الرابط إذا كان موجوداً

  // Full URL: https://github.com/owner/repo
  const urlMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/
  );
// ^(?:https?:\/\/)?     // http أو https (اختياري)
// (?:www\.)?            // www (اختياري)
// github\.com\/         // github.com/
// ([A-Za-z0-9_.-]+)     // owner
// \/
// ([A-Za-z0-9_.-]+)     // repo
  if (urlMatch) {
    return { owner: urlMatch[1], name: urlMatch[2], fullName: `${urlMatch[1]}/${urlMatch[2]}` };
  }

  // Short form: owner/repo
  const shortMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      name: shortMatch[2],
      fullName: `${shortMatch[1]}/${shortMatch[2]}`,
    };
  }

  return null;
}
// https://github.com/karim/my-app
// {
//   owner: "karim",
//   name: "my-app",
//   fullName: "karim/my-app"
// }
/**
 * Fetch basic repo info from GitHub API (no auth needed for public repos)
 */
export async function fetchRepoInfo(owner, name) {
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,//${encodeURIComponent(owner)} يحمي من أي characters غريبة
    {
      headers: { Accept: "application/vnd.github.v3+json" },
    }
  );

  if (!res.ok) {
    if (res.status === 404) throw new Error("المستودع غير موجود أو خاص");
    if (res.status === 403) throw new Error("تم تجاوز حد الطلبات لـ GitHub API، حاول لاحقاً");
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name,
    description: data.description || "",
    language: data.language || "",
    stars: data.stargazers_count || 0,
    defaultBranch: data.default_branch || "main",
    isPrivate: data.private,
    size: data.size * 1024, // GitHub returns size in KB
  };
}

/**
 * Shallow clone a repo into a temp directory
 * Returns the path to the cloned directory
 */
export async function cloneRepo(owner, name, branch = "main") {
  const cloneDir = path.join(os.tmpdir(), `gh_repo_${owner}_${name}_${Date.now()}`);
  // os.tmpdir()
  // مسار الفولدر المؤقت في السيستم
  // C:\Users\...\AppData\Local\Temp

  const repoUrl = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}.git`;

  try {
    await execFileAsync(
      "git",
      ["clone", "--depth", "1", "--branch", branch, "--single-branch", repoUrl, cloneDir],
      { timeout: CLONE_TIMEOUT }
    );
    console.log(` [GitHub] Cloned ${owner}/${name} → ${cloneDir}`);
    return cloneDir;
  } catch (err) {
    // Cleanup on failure
    cleanupClone(cloneDir);
    throw new Error(`فشل استنساخ المستودع: ${err.message}`);
  }
}

/**
 * Remove cloned directory
 */
export function cleanupClone(cloneDir) {
  try {
    if (cloneDir && fs.existsSync(cloneDir)) {
      fs.rmSync(cloneDir, { recursive: true, force: true });
      console.log(` [GitHub] Cleaned up ${cloneDir}`);
    }
  } catch (err) {
    console.warn(` Cleanup failed for ${cloneDir}:`, err.message);
  }
}
//  recursive: true

//  يمسح:

// الفولدر + كل اللي جواه

//  force: true

//  حتى لو:

// فيه مشاكل permissions
// أو الفولدر مش موجود

//  بيمنع errors