# 📊 Data Preprocessing — DevDocs RAG System

> **System:** Developer Documentation RAG (Retrieval-Augmented Generation)  
> **Project:** Agentic Personal Assistant  
> **Date:** March 2026

---

## 1. نظرة عامة (Overview)

خط المعالجة المسبقة لـ DevDocs RAG يتكون من 3 مراحل رئيسية:

```
زحف الويب (Crawling) → تحليل HTML (Parsing) → تقطيع وفهرسة (Indexing)
```

كل مرحلة تعمل كوحدة مستقلة مع callback للتقدم (`onProgress`).

---

## 2. المرحلة الأولى: زحف الويب (Web Crawling)

### 2.1 الملف: `server/devDocs/crawler.js`

### 2.2 الخوارزمية: BFS (Breadth-First Search)

```javascript
export async function crawlDocs(frameworkId, onProgress) {
  const framework = FRAMEWORKS.find((f) => f.id === frameworkId);
  const { crawlConfig } = framework;

  const visited = new Set();
  const queue = [...crawlConfig.seedUrls];
  const pages = [];

  while (queue.length > 0 && pages.length < crawlConfig.maxPages) {
    const url = queue.shift();
    const normalizedUrl = normalizeUrl(url);

    if (visited.has(normalizedUrl)) continue;
    visited.add(normalizedUrl);

    const html = await fetchPage(url);
    if (!html) continue;

    pages.push({ url, html });

    // استخراج روابط جديدة وإضافتها للطابور
    const links = extractLinks(html, url, crawlConfig);
    for (const link of links) {
      if (!visited.has(normalizeUrl(link))) {
        queue.push(link);
      }
    }

    onProgress?.({
      phase: "crawling",
      current: pages.length,
      total: crawlConfig.maxPages,
    });

    // Rate limiting
    await delay(DELAY_MS);
  }

  return pages;
}
```

### 2.3 ثوابت الزحف

| الثابت            | القيمة                  | الغرض                                 |
| ----------------- | ----------------------- | ------------------------------------- |
| `DELAY_MS`        | 600ms                   | تأخير بين كل طلب HTTP (rate limiting) |
| `REQUEST_TIMEOUT` | 15,000ms (15s)          | حد زمني لكل صفحة                      |
| `maxPages`        | 150-400 (per framework) | حد أقصى لعدد الصفحات                  |

### 2.4 تطبيع الروابط (URL Normalization)

```javascript
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    // إزالة hash و trailing slash و query params غير ضرورية
    u.hash = "";
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    return u.toString();
  } catch {
    return url;
  }
}
```

- يزيل `#fragments`
- يزيل trailing slashes
- يوحّد التنسيق لمنع زيارة نفس الصفحة مرتين

### 2.5 التحقق من صلاحية الرابط

```javascript
function isValidDocUrl(url, crawlConfig) {
  try {
    const u = new URL(url);
    const base = new URL(crawlConfig.baseUrl);

    // يجب أن يكون من نفس الدومين
    if (u.hostname !== base.hostname) return false;

    // يجب أن يبدأ بنفس المسار الأساسي
    if (!u.pathname.startsWith(base.pathname)) return false;

    // تجاهل ملفات الميديا
    const skipExtensions = [
      ".png",
      ".jpg",
      ".gif",
      ".svg",
      ".css",
      ".js",
      ".zip",
    ];
    if (skipExtensions.some((ext) => u.pathname.endsWith(ext))) return false;

    return true;
  } catch {
    return false;
  }
}
```

### 2.6 جلب الصفحة (Fetch Page)

```javascript
async function fetchPage(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DevDocsBot/1.0)",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    return await response.text();
  } catch {
    return null;
  }
}
```

**الخصائص:**

- `AbortController` للتحكم في timeout
- `User-Agent` header يعرّف الـ bot
- يتحقق من `content-type` — يقبل HTML فقط
- يتجاهل الأخطاء بصمت (يُرجع null)

### 2.7 مثال: إعدادات زحف Laravel

```javascript
{
  id: "laravel",
  name: "Laravel",
  version: "12.x",
  crawlConfig: {
    baseUrl: "https://laravel.com/docs/12.x",
    linkSelector: "nav a, .docs-sidebar a",
    contentSelector: "main, .content, article",
    excludeSelectors: ["nav", "footer", ".header", ".sidebar"],
    maxPages: 200,
    seedUrls: [
      "https://laravel.com/docs/12.x",
      "https://laravel.com/docs/12.x/installation",
      "https://laravel.com/docs/12.x/routing"
    ]
  },
  keywords: ["laravel", "eloquent", "blade", "artisan", "migration"]
}
```

---

## 3. المرحلة الثانية: تحليل HTML (Parsing)

### 3.1 الملف: `server/devDocs/parser.js`

### 3.2 الأدوات

| الأداة           | الاستخدام                                |
| ---------------- | ---------------------------------------- |
| **Cheerio**      | تحليل HTML (jQuery-like API على السيرفر) |
| **Custom logic** | تحويل HTML→Markdown                      |

### 3.3 الدالة الرئيسية

```javascript
export function parsePage(html, url, frameworkId, crawlConfig) {
  const $ = cheerio.load(html);

  // 1. إزالة العناصر غير المرغوبة
  for (const selector of crawlConfig.excludeSelectors) {
    $(selector).remove();
  }

  // 2. استخراج المحتوى باستخدام contentSelector
  const contentElement = $(crawlConfig.contentSelector).first();
  if (!contentElement.length) return null;

  // 3. استخراج العنوان
  const title =
    $("title").text().trim() || $("h1").first().text().trim() || url;

  // 4. تحويل HTML → Markdown
  const markdown = htmlToMarkdown(contentElement, $);

  // 5. التحقق من الحد الأدنى
  if (!markdown || markdown.trim().length < 100) return null;

  return {
    title,
    url,
    framework: frameworkId,
    content: markdown,
  };
}
```

### 3.4 تحويل HTML إلى Markdown

```javascript
function htmlToMarkdown(element, $) {
  let markdown = "";

  element.contents().each(function () {
    const node = $(this);

    if (this.type === "text") {
      markdown += node.text();
      return;
    }

    const tag = this.tagName?.toLowerCase();

    switch (tag) {
      // === Headings ===
      case "h1":
        markdown += `\n# ${node.text().trim()}\n\n`;
        break;
      case "h2":
        markdown += `\n## ${node.text().trim()}\n\n`;
        break;
      case "h3":
        markdown += `\n### ${node.text().trim()}\n\n`;
        break;
      case "h4":
        markdown += `\n#### ${node.text().trim()}\n\n`;
        break;
      case "h5":
        markdown += `\n##### ${node.text().trim()}\n\n`;
        break;
      case "h6":
        markdown += `\n###### ${node.text().trim()}\n\n`;
        break;

      // === Code Blocks ===
      case "pre": {
        const codeEl = node.find("code");
        const lang = codeEl.attr("class")?.match(/language-(\w+)/)?.[1] || "";
        const code = codeEl.length ? codeEl.text() : node.text();
        markdown += `\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`;
        break;
      }

      // === Inline Code ===
      case "code":
        if (!node.parent().is("pre")) {
          markdown += `\`${node.text()}\``;
        }
        break;

      // === Lists ===
      case "ul":
      case "ol":
        node.children("li").each(function (i) {
          const prefix = tag === "ol" ? `${i + 1}. ` : "- ";
          markdown += `${prefix}${$(this).text().trim()}\n`;
        });
        markdown += "\n";
        break;

      // === Paragraphs ===
      case "p":
        markdown += `\n${htmlToMarkdown(node, $).trim()}\n\n`;
        break;

      // === Links ===
      case "a": {
        const href = node.attr("href");
        const text = node.text().trim();
        if (href && text) {
          markdown += `[${text}](${href})`;
        }
        break;
      }

      // === Bold / Italic ===
      case "strong":
      case "b":
        markdown += `**${node.text().trim()}**`;
        break;
      case "em":
      case "i":
        markdown += `*${node.text().trim()}*`;
        break;

      // === Tables ===
      case "table":
        // يُحوّل الجدول لنص بسيط
        markdown += `\n${node.text().trim()}\n\n`;
        break;

      // === Default: recurse ===
      default:
        markdown += htmlToMarkdown(node, $);
    }
  });

  return markdown;
}
```

### 3.5 خصائص التحليل

| الخاصية          | التفاصيل                                                       |
| ---------------- | -------------------------------------------------------------- |
| **حفظ الكود**    | `<pre><code>` → ` ```lang\ncode\n``` ` — يحافظ على لغة البرمجة |
| **اكتشاف اللغة** | يستخرج من `class="language-php"`                               |
| **حد أدنى**      | يرفض الصفحات < 100 حرف                                         |
| **إزالة عناصر**  | nav, footer, header, sidebar — يُبقي المحتوى فقط               |
| **تكرارية**      | recursive function — تعالج HTML المتداخل                       |

### 3.6 معالجة دفعية (Batch Processing)

```javascript
export function parsePages(pages, frameworkId, crawlConfig) {
  const parsed = [];

  for (const page of pages) {
    const result = parsePage(page.html, page.url, frameworkId, crawlConfig);
    if (result) {
      parsed.push(result);
    }
  }

  return parsed;
}
```

---

## 4. المرحلة الثالثة: التقطيع والفهرسة (Indexing)

### 4.1 الملف: `server/devDocs/indexer.js`

### 4.2 معاملات التقطيع

| المعامل           | القيمة   | المقارنة مع Document RAG |
| ----------------- | -------- | ------------------------ |
| **CHUNK_SIZE**    | 1500 حرف | (Document RAG: 1000)     |
| **CHUNK_OVERLAP** | 300 حرف  | (Document RAG: 200)      |
| **BATCH_SIZE**    | 96       | (نفس Document RAG)       |

> **لماذا 1500/300 بدلاً من 1000/200؟**
> التوثيقات التقنية تحتوي على code blocks أطول — حجم chunk أكبر يحافظ على أمثلة الكود كاملة

### 4.3 خوارزمية التقطيع

```javascript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE, // 1500
  chunkOverlap: CHUNK_OVERLAP, // 300
});
```

**Separators (default — مرتبة هرمياً):**

```
"\n\n"  →  فقرات
"\n"    →  أسطر
" "     →  كلمات
""      →  أحرف
```

### 4.4 إضافة Metadata

```javascript
export async function indexDocs(parsedDocs, frameworkId, version, onProgress) {
  const chunks = [];

  for (const doc of parsedDocs) {
    const splits = await splitter.splitText(doc.content);

    for (let i = 0; i < splits.length; i++) {
      chunks.push({
        pageContent: splits[i],
        metadata: {
          framework: frameworkId, // "laravel", "react", ...
          page: doc.url, // URL المصدر
          title: doc.title, // عنوان الصفحة
          url: doc.url, // URL مكرر للمرجعية
          version: version, // "12.x", "19", ...
          source: "dev_docs", // نوع المصدر
        },
      });
    }
  }

  // تخزين في Pinecone
  const store = await getDevDocsVectorStore();
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    await store.addDocuments(batch);

    onProgress?.({
      phase: "indexing",
      current: Math.min(i + BATCH_SIZE, chunks.length),
      total: chunks.length,
    });
  }

  return chunks.length;
}
```

### 4.5 بنية Metadata لكل Chunk

| Field       | Type   | مثال                                      | الغرض               |
| ----------- | ------ | ----------------------------------------- | ------------------- |
| `framework` | string | `"laravel"`                               | فلترة البحث بالإطار |
| `page`      | string | `"https://laravel.com/docs/12.x/routing"` | المصدر              |
| `title`     | string | `"Routing - Laravel"`                     | عنوان العرض         |
| `url`       | string | نفس page                                  | مرجعية              |
| `version`   | string | `"12.x"`                                  | تتبع الإصدار        |
| `source`    | string | `"dev_docs"`                              | تمييز النوع         |

### 4.6 Namespace والتخزين

```javascript
const DEV_DOCS_NAMESPACE = "dev_docs";

async function getDevDocsVectorStore() {
  return getVectorStore(DEV_DOCS_NAMESPACE);
}
```

**ملاحظة مهمة:** جميع أطر العمل تُخزن في **namespace واحد** (`dev_docs`) — والفلترة تتم عبر `metadata.framework`.

```
Pinecone Index
├── user_1/           (Document RAG)
├── user_2/           (Document RAG)
├── dev_docs/         (DevDocs RAG — كل الأطر هنا)   ← Namespace واحد
│   ├── laravel chunks
│   ├── react chunks
│   ├── django chunks
│   └── ...
├── github_repos/     (GitHub RAG)
└── ...
```

---

## 5. حذف بيانات إطار (Delete Framework Vectors)

```javascript
export async function deleteFrameworkVectors(frameworkId) {
  const pc = new PineconeClient({ apiKey });
  const index = pc.Index(indexName).namespace(DEV_DOCS_NAMESPACE);

  // حذف كل vectors لهذا الإطار
  await index.deleteMany({
    framework: { $eq: frameworkId },
  });

  // إبطال cache
  storeCache.delete(DEV_DOCS_NAMESPACE);
}
```

---

## 6. إعادة الفهرسة (Reindex Framework)

```javascript
export async function reindexFramework(frameworkId, version, onProgress) {
  // 1. حذف القديم
  await deleteFrameworkVectors(frameworkId);

  // 2. زحف جديد
  const pages = await crawlDocs(frameworkId, onProgress);

  // 3. تحليل
  const framework = FRAMEWORKS.find((f) => f.id === frameworkId);
  const parsed = parsePages(pages, frameworkId, framework.crawlConfig);

  // 4. فهرسة
  const chunkCount = await indexDocs(parsed, frameworkId, version, onProgress);

  return { pageCount: parsed.length, chunkCount };
}
```

---

## 7. معالجة الاستعلام (Query Processing)

### 7.1 اكتشاف الإطار التلقائي

```javascript
export function detectFrameworks(query) {
  const lowerQuery = query.toLowerCase();
  const detected = [];

  for (const framework of FRAMEWORKS) {
    const keywords = framework.keywords || [
      framework.id,
      framework.name.toLowerCase(),
    ];

    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        detected.push(framework.id);
        break;
      }
    }
  }

  return detected;
}
```

**مثال:**

```
Query: "how to use Eloquent relationships in Laravel"
Keywords matched: ["laravel", "eloquent"]
Result: ["laravel"]
```

### 7.2 البحث الدلالي

```javascript
export async function searchDevDocs(query, enabledFrameworks, topK = 5) {
  const TIMEOUT_MS = 5000;

  const store = await getDevDocsVectorStore();

  const filter = {
    framework: { $in: enabledFrameworks },
  };

  const results = await Promise.race([
    store.similaritySearch(query, topK, filter),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Search timeout")), TIMEOUT_MS),
    ),
  ]);

  if (!results || results.length === 0) return null;

  // تنسيق النتائج
  return results
    .map((doc) => {
      const { framework, title, url } = doc.metadata;
      return `### ${title} (${framework})\n**Source:** ${url}\n\n${doc.pageContent}`;
    })
    .join("\n\n---\n\n");
}
```

### 7.3 معاملات البحث

| المعامل       | القيمة                    | الشرح                                             |
| ------------- | ------------------------- | ------------------------------------------------- |
| **Top K**     | 5                         | أقل من Document RAG (10) لأن النتائج أكثر تحديداً |
| **Timeout**   | 5000ms                    | حد زمني                                           |
| **Filter**    | `framework: {$in: [...]}` | يبحث فقط في الأطر المفعّلة                        |
| **Namespace** | `"dev_docs"`              | namespace مشترك لكل الأطر                         |

---

## 8. خط المعالجة الكامل (Full Pipeline)

### 8.1 عملية التثبيت

```javascript
// routes.js — Background installation
async function runInstallation(frameworkId, version) {
  installProgress.set(frameworkId, {
    phase: "crawling",
    progress: 0,
    message: "Starting crawl...",
  });

  try {
    // Phase 1: Crawl
    const pages = await crawlDocs(frameworkId, (p) => {
      installProgress.set(frameworkId, {
        phase: "crawling",
        progress: (p.current / p.total) * 33,
        message: `Crawling ${p.current}/${p.total} pages...`,
      });
    });

    // Phase 2: Parse
    installProgress.set(frameworkId, {
      phase: "parsing",
      progress: 33,
      message: "Parsing HTML content...",
    });
    const parsed = parsePages(pages, frameworkId, crawlConfig);

    // Phase 3: Index
    const chunkCount = await indexDocs(parsed, frameworkId, version, (p) => {
      installProgress.set(frameworkId, {
        phase: "indexing",
        progress: 33 + (p.current / p.total) * 67,
        message: `Indexing ${p.current}/${p.total} chunks...`,
      });
    });

    // Update DB
    db.prepare(
      `UPDATE dev_docs_frameworks
       SET status = 'installed', page_count = ?, chunk_count = ?, installed_at = datetime('now')
       WHERE id = ?`,
    ).run(parsed.length, chunkCount, frameworkId);
  } catch (error) {
    db.prepare(
      `UPDATE dev_docs_frameworks SET status = 'error', error_message = ? WHERE id = ?`,
    ).run(error.message, frameworkId);
  }
}
```

### 8.2 ملخص بصري

````
┌──────────────────────────────────────────────────────────────────┐
│              DevDocs RAG Preprocessing Pipeline                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Phase 1: CRAWLING (0-33%)                                       │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ BFS Crawler                                              │    │
│  │ • seedUrls → queue → fetch → extract links → repeat     │    │
│  │ • DELAY_MS: 600ms between requests                      │    │
│  │ • REQUEST_TIMEOUT: 15s per page                         │    │
│  │ • normalizeUrl() to prevent duplicates                  │    │
│  │ • isValidDocUrl() — same domain + path validation       │    │
│  │ • User-Agent: "DevDocsBot/1.0"                          │    │
│  │ • maxPages: 150-400 per framework                       │    │
│  │ Output: [{url, html}, ...]                              │    │
│  └──────────────────────────────────────────────────────────┘    │
│                           ↓                                       │
│  Phase 2: PARSING (33%)                                          │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ HTML → Markdown Converter (Cheerio)                      │    │
│  │ • Remove excludeSelectors (nav, footer, etc.)           │    │
│  │ • Extract content via contentSelector                   │    │
│  │ • Convert headings: <h1>→#, <h2>→##, ...               │    │
│  │ • Preserve code: <pre><code>→```lang\n...\n```          │    │
│  │ • Convert lists: <ul><li>→"- ", <ol><li>→"1. "         │    │
│  │ • Convert formatting: <strong>→**, <em>→*               │    │
│  │ • Min content: 100 chars (reject smaller)               │    │
│  │ Output: [{title, url, framework, content}, ...]         │    │
│  └──────────────────────────────────────────────────────────┘    │
│                           ↓                                       │
│  Phase 3: INDEXING (33-100%)                                     │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Text Splitting + Embedding + Storage                     │    │
│  │ • RecursiveCharacterTextSplitter                        │    │
│  │   chunkSize: 1500 | chunkOverlap: 300                   │    │
│  │ • Metadata: framework, page, title, url, version        │    │
│  │ • Embedding: PineconeEmbeddings (llama-text-embed-v2)   │    │
│  │ • Storage: Pinecone namespace="dev_docs"                │    │
│  │ • Batch size: 96 chunks per batch                       │    │
│  │ Output: chunk_count stored in DB                        │    │
│  └──────────────────────────────────────────────────────────┘    │
│                           ↓                                       │
│  RESULT: DB updated → status = 'installed'                       │
│  ON ERROR: DB updated → status = 'error' + error_message         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
````

---

## 9. مقارنة مع Document RAG

| المعامل           | Document RAG              | DevDocs RAG                    |
| ----------------- | ------------------------- | ------------------------------ |
| **مصدر البيانات** | ملفات مرفوعة              | مواقع ويب (crawling)           |
| **أنواع الملفات** | PDF, DOCX, PPTX, TXT, CSV | HTML → Markdown                |
| **Chunk Size**    | 1000                      | 1500                           |
| **Chunk Overlap** | 200                       | 300                            |
| **Namespace**     | `user_{userId}` (منفصل)   | `"dev_docs"` (مشترك)           |
| **Top K**         | 10                        | 5                              |
| **Filter**        | لا يوجد                   | `framework: {$in: [...]}`      |
| **Metadata**      | docId, userId             | framework, title, url, version |
| **Timeout**       | 4s (search)               | 5s (search), 15s (fetch)       |
