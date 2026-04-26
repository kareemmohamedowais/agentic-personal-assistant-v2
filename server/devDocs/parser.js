// ─── HTML Parser for Documentation Pages ────────────────────────────────────
// تحويل HTML إلى نص نظيف مع حفظ أمثلة الكود والعناوين
import * as cheerio from "cheerio";

/**
 * تحليل صفحة HTML واستخراج المحتوى النصي المفيد
 * @param {string} html - HTML الخام
 * @param {string} url - URL الصفحة
 * @param {string} frameworkId - معرف الـ framework
 * @param {object} crawlConfig - إعدادات الزحف
 * @returns {{ title, content, url, framework, section }}
 */
export function parsePage(html, url, frameworkId, crawlConfig) {
  const $ = cheerio.load(html);

  // إزالة العناصر غير المرغوبة
  const excludeSelector = (crawlConfig.excludeSelectors || []).join(", ");
  if (excludeSelector) {
    $(excludeSelector).remove();
  }

  // استخراج العنوان
  const title =
    $("h1").first().text().trim() || $("title").text().trim() || extractSectionFromUrl(url);

  // استخراج المحتوى الرئيسي
  let $content;
  const selectors = (crawlConfig.contentSelector || "main, article")
    .split(",")
    .map((s) => s.trim());
  for (const sel of selectors) {
    $content = $(sel);
    if ($content.length > 0) break;
  }
  if (!$content || $content.length === 0) {
    $content = $("body");
  }

  // تحويل code blocks إلى نص مميز
  $content.find("pre code, pre").each((_, el) => {
    const $el = $(el);
    const lang = $el.attr("class")?.match(/language-(\w+)/)?.[1] || "";
    const code = $el.text().trim();
    if (code) {
      $el.replaceWith(`\n\`\`\`${lang}\n${code}\n\`\`\`\n`);
    }
  });

  // تحويل inline code
  $content.find("code").each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    if (text && !text.includes("\n")) {
      $el.replaceWith(` \`${text}\` `);
    }
  });

  // تحويل headings إلى markdown
  $content.find("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const $el = $(el);
    const level = parseInt(el.tagName[1]);
    const prefix = "#".repeat(level);
    const text = $el.text().trim();
    $el.replaceWith(`\n${prefix} ${text}\n`);
  });

  // تحويل lists
  $content.find("li").each((_, el) => {
    const $el = $(el);
    $el.replaceWith(`\n- ${$el.text().trim()}`);
  });

  // استخراج النص النهائي
  let content = $content.text();

  // تنظيف
  content = content
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n") // تقليل الأسطر الفارغة
    .replace(/[ \t]+/g, " ") // مسافات مكررة
    .replace(/\n /g, "\n") // مسافة أول السطر
    .trim();

  // تجاهل الصفحات الفارغة أو القصيرة جداً
  if (content.length < 100) return null;

  const section = extractSectionFromUrl(url);

  return {
    title,
    content,
    url,
    framework: frameworkId,
    section,
  };
}

function extractSectionFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    // آخر جزء من الـ path
    return parts[parts.length - 1] || "index";
  } catch {
    return "unknown";
  }
}

/**
 * معالجة مجموعة صفحات مزحوفة
 * @param {Array<{url, html}>} pages
 * @param {string} frameworkId
 * @param {object} crawlConfig
 * @returns {Array<{title, content, url, framework, section}>}
 */
export function parsePages(pages, frameworkId, crawlConfig) {
  const results = [];
  for (const page of pages) {
    const parsed = parsePage(page.html, page.url, frameworkId, crawlConfig);
    if (parsed) results.push(parsed);
  }
  console.log(`📄 [${frameworkId}] Parsed ${results.length}/${pages.length} pages successfully`);
  return results;
}
