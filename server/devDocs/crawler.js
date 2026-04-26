// ─── Documentation Crawler ──────────────────────────────────────────────────
// زحف صفحات التوثيق الرسمية لكل framework
import * as cheerio from "cheerio";
import { getFrameworkById } from "./frameworks.js";

const DELAY_MS = 600; // تأخير بين الطلبات لتجنب الحظر
const REQUEST_TIMEOUT = 15000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * زحف التوثيق لـ framework محدد
 * @param {string} frameworkId
 * @param {function} onProgress - callback: (crawled, total, phase)
 * @returns {Promise<Array<{url, html}>>}
 */
export async function crawlDocs(frameworkId, onProgress) {
  const fw = getFrameworkById(frameworkId);
  if (!fw) throw new Error(`Framework "${frameworkId}" not found`);

  const { crawlConfig } = fw;
  const visited = new Set();
  const pages = [];
  const toVisit = [crawlConfig.baseUrl, ...(crawlConfig.seedUrls || [])];

  // اكتشاف الروابط من الصفحة الأولى
  console.log(`🕷️ [${frameworkId}] Starting crawl from: ${crawlConfig.baseUrl}`);

  while (toVisit.length > 0 && visited.size < crawlConfig.maxPages) {
    const url = toVisit.shift();
    const normalized = normalizeUrl(url, crawlConfig.baseUrl);
    if (!normalized || visited.has(normalized)) continue;
    visited.add(normalized);

    try {
      const html = await fetchPage(normalized);
      if (!html) continue;

      pages.push({ url: normalized, html });

      // استخراج روابط جديدة
      const $ = cheerio.load(html);
      $(crawlConfig.linkSelector).each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          const absolute = resolveUrl(href, normalized, crawlConfig.baseUrl);
          if (absolute && !visited.has(absolute) && isValidDocUrl(absolute, crawlConfig.baseUrl)) {
            toVisit.push(absolute);
          }
        }
      });

      if (onProgress) {
        onProgress(
          visited.size,
          Math.min(toVisit.length + visited.size, crawlConfig.maxPages),
          "crawling"
        );
      }

      await sleep(DELAY_MS);
    } catch (err) {
      console.warn(`⚠️ [${frameworkId}] Failed to fetch: ${normalized} — ${err.message}`);
    }
  }

  console.log(`✅ [${frameworkId}] Crawled ${pages.length} pages`);
  return pages;
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "DevDocsHelper/1.0 (Documentation Indexer)",
        Accept: "text/html",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;
    return await res.text();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

function normalizeUrl(url, baseUrl) {
  try {
    const u = new URL(url, baseUrl);
    u.hash = "";
    u.search = "";
    // إزالة trailing slash
    let path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.origin}${path}`;
  } catch {
    return null;
  }
}

function resolveUrl(href, currentUrl, baseUrl) {
  try {
    if (href.startsWith("mailto:") || href.startsWith("javascript:") || href.startsWith("#")) {
      return null;
    }
    const resolved = new URL(href, currentUrl);
    const base = new URL(baseUrl);

    // نفس الدومين فقط
    if (resolved.hostname !== base.hostname) return null;

    return normalizeUrl(resolved.href, baseUrl);
  } catch {
    return null;
  }
}

function isValidDocUrl(url, baseUrl) {
  try {
    const u = new URL(url);
    const b = new URL(baseUrl);
    if (u.hostname !== b.hostname) return false;

    // تجاهل ملفات غير html
    const ext = u.pathname.split(".").pop()?.toLowerCase();
    const skipExts = [
      "png",
      "jpg",
      "jpeg",
      "gif",
      "svg",
      "css",
      "js",
      "json",
      "xml",
      "zip",
      "pdf",
      "ico",
    ];
    if (skipExts.includes(ext)) return false;

    return true;
  } catch {
    return false;
  }
}
