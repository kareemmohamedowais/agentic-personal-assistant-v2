# 📚 Developer Docs Helper — خطة التنفيذ الكاملة

> نظام RAG شبه منفصل لتوثيق التقنيات البرمجية داخل المساعد الذكي

---

## 🏗 نظرة عامة على الهيكل

```
المشروع الحالي
├── server/                    ← الباك اند الحالي
│   ├── devDocs/               ← 🆕 نظام Developer Docs (شبه منفصل)
│   │   ├── crawler.js         ← زاحف المواقع
│   │   ├── parser.js          ← محلل HTML → نص نظيف
│   │   ├── indexer.js         ← معالجة + تقسيم + تخزين vectors
│   │   ├── search.js          ← بحث في dev docs (Pinecone)
│   │   ├── frameworks.js      ← تعريف الـ frameworks + URLs
│   │   └── routes.js          ← API routes خاصة بـ dev docs
│   ├── agent.js               ← تعديل بسيط لدعم dev docs mode
│   └── index.js               ← إضافة routes جديدة
│
├── client/src/
│   ├── components/
│   │   └── DevDocsPanel.jsx   ← 🆕 لوحة التحكم في الـ docs
│   └── pages/
│       └── Chat.jsx           ← تعديل: زر Developer Docs + integration
```

---

## 📐 المبدأ الأساسي: شبه منفصل

| الجزء          | مشترك مع المشروع                  | خاص بـ Dev Docs                 |
| -------------- | --------------------------------- | ------------------------------- |
| Pinecone       | نفس الحساب والـ API Key           | namespace مختلف: `dev_docs`     |
| Embeddings     | نفس الموديل `llama-text-embed-v2` | —                               |
| SQLite         | نفس قاعدة البيانات                | جدول جديد `dev_docs_packs`      |
| Express Server | نفس السيرفر                       | routes جديدة `/api/dev-docs/*`  |
| Chat UI        | نفس الشات                         | زر + panel جديد                 |
| Agent          | نفس الـ agent                     | system prompt معدّل + بحث إضافي |

**الفصل**: الـ namespace `dev_docs` مشترك لكل المستخدمين (الـ documentation واحدة للجميع)، على عكس `user_${id}` الخاص بملفات كل مستخدم.

---

## � Pinecone Free Tier — تحليل الحدود

| الميزة             | Pinecone Starter (مجاني) |
| ------------------ | ------------------------ |
| عدد الـ Vectors    | **حتى 100,000 vector**   |
| عدد الـ Indexes    | 5 indexes                |
| Storage            | 2 GB                     |
| Namespaces         | **مدعوم** (unlimited)    |
| Metadata Filtering | **مدعوم**                |
| Serverless         | نعم                      |

### حساب الاستهلاك المتوقع:

| Framework   | صفحات تقريبية | chunks متوقعة | vectors     |
| ----------- | ------------- | ------------- | ----------- |
| Laravel     | ~150          | ~2,000        | 2,000       |
| React       | ~200          | ~2,500        | 2,500       |
| Next.js     | ~180          | ~2,200        | 2,200       |
| Node.js     | ~100          | ~1,500        | 1,500       |
| Python      | ~250          | ~3,500        | 3,500       |
| FastAPI     | ~80           | ~1,200        | 1,200       |
| Django      | ~200          | ~2,800        | 2,800       |
| Docker      | ~120          | ~1,800        | 1,800       |
| Kubernetes  | ~150          | ~2,000        | 2,000       |
| Git         | ~80           | ~1,000        | 1,000       |
| **المجموع** | **~1,510**    | **~20,500**   | **~20,500** |

**الخلاصة**: ~20,500 vector للـ docs + vectors المستخدمين العاديين → **يتسع بسهولة في حدود الـ 100K المجانية**.

### استراتيجية التحسين:

- **Smart Chunking**: نقلل `maxPages` للـ frameworks الضخمة ونركز على الأساسيات
- **Deduplication**: نتجنب الصفحات المكررة
- **Priority Pages**: نأخذ الصفحات الأهم أولاً (tutorials, guides, API reference)
- **مراقبة**: عرض عدد الـ vectors المستهلكة في لوحة الـ Admin

---

## �🗃 Phase 1 — Database Schema

### جدول جديد: `dev_docs_packs`

```sql
CREATE TABLE IF NOT EXISTS dev_docs_packs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    framework TEXT NOT NULL UNIQUE,        -- 'laravel', 'react', etc.
    display_name TEXT NOT NULL,            -- 'Laravel'
    icon TEXT DEFAULT '📄',                -- emoji icon
    version TEXT,                          -- '12', '19', etc.
    status TEXT DEFAULT 'available',       -- available | installing | ready | error
    docs_url TEXT NOT NULL,                -- URL المصدر الرسمي
    chunk_count INTEGER DEFAULT 0,        -- عدد الأجزاء المفهرسة
    page_count INTEGER DEFAULT 0,         -- عدد الصفحات المزحوفة
    installed_at TEXT,                     -- تاريخ التثبيت
    installed_by INTEGER,                  -- user_id (Admin)
    error_message TEXT,                    -- رسالة الخطأ إن وجدت
    created_at TEXT DEFAULT (datetime('now'))
);
```

### جدول: `dev_docs_user_prefs`

```sql
CREATE TABLE IF NOT EXISTS dev_docs_user_prefs (
    user_id INTEGER NOT NULL,
    framework TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,            -- 1 = مفعّل في الشات
    PRIMARY KEY (user_id, framework),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🕷 Phase 2 — Documentation Crawler

### الملف: `server/devDocs/crawler.js`

**المسؤولية**: زحف صفحات التوثيق من المواقع الرسمية

**الخوارزمية**:

```
1. قراءة sitemap.xml أو قائمة URLs محددة مسبقاً
2. لكل صفحة:
   a. تحميل HTML عبر fetch
   b. استخلاص المحتوى الرئيسي (تجاهل nav, footer, sidebar)
   c. تمرير للـ parser
3. Rate limiting: تأخير 500ms بين الطلبات
4. حفظ عدد الصفحات المزحوفة
```

**المكتبات المستخدمة**:

```json
{
  "cheerio": "^1.0.0", // HTML parsing (خفيف وسريع)
  "p-limit": "^5.0.0" // Rate limiting للطلبات المتوازية
}
```

**الاستراتيجية لكل Framework**:

| Framework  | طريقة الزحف                          | ملاحظات                         |
| ---------- | ------------------------------------ | ------------------------------- |
| Laravel    | Sitemap + `/docs/*` paths            | توثيق منظم بشكل ممتاز           |
| React      | `/learn/*` + `/reference/*`          | React.dev بنية واضحة            |
| NextJS     | `/docs/**`                           | تقسيم App Router / Pages Router |
| NodeJS     | `/docs/latest/api/*`                 | API reference                   |
| Python     | `/3/library/*` + `/3/tutorial/*`     | مكتبة + tutorial                |
| FastAPI    | `/tutorial/*` + `/advanced/*`        | Markdown-based                  |
| Django     | `/en/stable/*`                       | شامل جداً                       |
| Docker     | `/get-started/*` + `/reference/*`    | أقسام متعددة                    |
| Kubernetes | `/docs/concepts/*` + `/docs/tasks/*` | ضخم - نأخذ الأساسيات            |
| Git        | `/docs/*`                            | Man pages + Book                |

---

## 🔧 Phase 3 — HTML Parser

### الملف: `server/devDocs/parser.js`

**المسؤولية**: تحويل HTML إلى نص نظيف مع حفظ الهيكل

```javascript
// المخرجات لكل صفحة:
{
    title: "Routing - Laravel",
    content: "نص نظيف بدون HTML tags...",
    codeBlocks: ["Route::get(...)", ...],   // أمثلة الكود محفوظة
    url: "https://laravel.com/docs/routing",
    headings: ["Basic Routing", "Route Parameters", ...],
    framework: "laravel",
    section: "routing"
}
```

**خطوات المعالجة**:

1. إزالة `<nav>`, `<footer>`, `<header>`, `.sidebar`
2. استخلاص محتوى `<main>` أو `<article>` أو `.content`
3. حفظ `<code>` و `<pre>` كـ code blocks
4. تحويل `<h1>-<h6>` إلى headings
5. إزالة HTML tags والحفاظ على النص
6. تنظيف المسافات الزائدة

---

## 📦 Phase 4 — Document Indexer

### الملف: `server/devDocs/indexer.js`

**المسؤولية**: تقسيم النصوص وإنشاء embeddings وتخزينها

```
Parsed docs
    ↓
RecursiveCharacterTextSplitter (chunkSize: 1500, overlap: 300)
    ↓
إضافة metadata لكل chunk:
{
    framework: "laravel",
    page: "routing",
    section: "route-parameters",
    url: "https://...",
    title: "Route Parameters",
    version: "12",
    hasCode: true,
    source: "official_docs"
}
    ↓
Batch upsert إلى Pinecone
(namespace: "dev_docs", batch: 96)
    ↓
تحديث dev_docs_packs (status: ready, chunk_count)
```

**حجم الـ chunks أكبر** (1500 بدل 1000) لأن التوثيق يحتاج سياق أكثر.

---

## 🔍 Phase 5 — Search System

### الملف: `server/devDocs/search.js`

**المسؤولية**: بحث ذكي في توثيق الـ frameworks

```javascript
export async function searchDevDocs(query, enabledFrameworks, topK = 5) {
  // 1. إنشاء embedding للسؤال
  // 2. بحث في namespace "dev_docs"
  // 3. فلترة بالـ frameworks المختارة
  // 4. إرجاع النتائج مع metadata

  const filter = {
    framework: { $in: enabledFrameworks }, // ["laravel", "react"]
  };

  return await store.similaritySearch(query, topK, filter);
}
```

**ميزة اكتشاف Framework تلقائي** (Smart Detection):

```javascript
// إذا المستخدم كتب "Laravel middleware" → نعطي أولوية لـ Laravel
// إذا كتب "React hooks" → أولوية React
// يتم ذلك عبر keyword matching + metadata filter boost
```

---

## 🌐 Phase 6 — API Routes

### الملف: `server/devDocs/routes.js`

```
GET    /api/dev-docs/frameworks          ← قائمة الـ frameworks المتاحة مع حالتها
POST   /api/dev-docs/install/:framework  ← تثبيت docs (Admin فقط)
DELETE /api/dev-docs/uninstall/:framework ← حذف docs (Admin فقط)
POST   /api/dev-docs/update/:framework   ← إعادة فهرسة (تحديث يدوي - Admin فقط)
GET    /api/dev-docs/status/:framework   ← حالة التثبيت
GET    /api/dev-docs/my-prefs            ← تفضيلات المستخدم (أي docs مفعّلة)
PUT    /api/dev-docs/my-prefs            ← تحديث تفضيلات (كل مستخدم يختار docs خاصة به)
```

### مثال Response لـ `GET /api/dev-docs/frameworks`:

```json
[
  {
    "framework": "laravel",
    "displayName": "Laravel",
    "icon": "🔴",
    "version": "12",
    "status": "ready",
    "chunkCount": 2340,
    "pageCount": 156,
    "docsUrl": "https://laravel.com/docs",
    "enabled": true
  },
  {
    "framework": "react",
    "displayName": "React",
    "icon": "⚛️",
    "version": "19",
    "status": "available",
    "chunkCount": 0,
    "pageCount": 0,
    "docsUrl": "https://react.dev",
    "enabled": false
  }
]
```

---

## 🤖 Phase 7 — Agent Integration

### تعديل: `server/agent.js`

**التغيير**: عند تفعيل `devDocsMode`:

```javascript
// في streamAgent و runAgent:
// 1. فحص هل devDocsMode مفعّل
// 2. إذا نعم → بحث في dev_docs namespace بالإضافة للبحث العادي
// 3. إضافة system prompt مخصص للمطورين

// System prompt إضافي:
const DEV_DOCS_SYSTEM_PROMPT = `
You are a Developer Documentation Assistant. 
When answering programming questions:
1. Use the provided documentation context as your primary source
2. Include code examples when available
3. Reference the specific framework version
4. If the documentation context doesn't cover the question, say so clearly
5. Always mention the source URL for reference
6. Format code blocks with the correct language identifier
`;
```

**تدفق البحث مع Dev Docs**:

```
سؤال المستخدم
    ↓
    ├── بحث عادي في KB (user namespace) ← الموجود حالياً
    │
    └── بحث في Dev Docs (dev_docs namespace) ← جديد
         ↓ (filter: frameworks المفعّلة)
    ↓
دمج النتائج في System Prompt
    ↓
LLM Response
```

---

## 🎨 Phase 8 — Frontend UI

### 8.1 زر Developer Docs في الشات

**الموقع**: بجانب زر "بحث 🌐" في شريط أدوات الـ Composer

```jsx
{
  /* زر Developer Docs */
}
<button
  onClick={() => setDevDocsOpen(!devDocsOpen)}
  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border
        ${
          devDocsEnabled
            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
            : "border-slate-700 text-slate-500 hover:text-emerald-400"
        }`}
>
  <span>📚</span>
  <span>Dev Docs</span>
  {enabledCount > 0 && (
    <span
      className="bg-emerald-500 text-white text-[9px] rounded-full w-4 h-4 
                         flex items-center justify-center"
    >
      {enabledCount}
    </span>
  )}
</button>;
```

### 8.2 لوحة DevDocsPanel

**الملف**: `client/src/components/DevDocsPanel.jsx`

```
┌─────────────────────────────────────┐
│  📚 Developer Documentation Helper  │
│─────────────────────────────────────│
│                                     │
│  ✅ 🔴 Laravel 12      [مثبّت]     │
│  ✅ ⚛️  React 19       [مثبّت]     │
│  ☐  ▲  NextJS 15      [تثبيت]     │
│  ☐  🟢 NodeJS 22      [تثبيت]     │
│  ☐  🐍 Python 3.12    [تثبيت]     │
│  ☐  ⚡ FastAPI 0.115   [تثبيت]     │
│  ☐  🟩 Django 5.1     [تثبيت]     │
│  ☐  🐳 Docker         [تثبيت]     │
│  ☐  ☸️  Kubernetes     [تثبيت]     │
│  ☐  📦 Git            [تثبيت]     │
│                                     │
│  ─────────────────────────────────  │
│  📊 إجمالي: 4,680 chunk مفهرس      │
│  💡 فعّل الـ docs التي تحتاجها     │
└─────────────────────────────────────┘
```

**السلوك**:

- ✅ Checkbox = مفعّل في الشات (يُسأل عنها)
- زر [تثبيت] = يبدأ عملية الـ crawl + index (Admin فقط)
- بعد التثبيت: Checkbox يظهر ويمكن تفعيله/تعطيله
- عداد الـ chunks لكل framework
- مؤشر تقدم أثناء التثبيت

---

## 📡 Phase 9 — Streaming Integration

### تعديل `POST /api/chat/stream`

```javascript
// إضافة حقل جديد في FormData:
formData.append("devDocsMode", "true");
formData.append("devDocsFrameworks", JSON.stringify(["laravel", "react"]));

// في السيرفر:
const devDocsMode = req.body.devDocsMode === "true";
const devDocsFrameworks = JSON.parse(req.body.devDocsFrameworks || "[]");

// تمرير للـ agent:
const result = await streamAgent({
  ...existingParams,
  devDocsMode,
  devDocsFrameworks,
});
```

### SSE Event جديد:

```json
{ "type": "dev_docs_context", "frameworks": ["laravel"], "resultsCount": 3 }
```

---

## 🔐 Phase 10 — Permissions

| عملية                    | مَن يمكنه | السبب                                |
| ------------------------ | --------- | ------------------------------------ |
| تثبيت docs               | Admin فقط | عملية ثقيلة تستهلك quota             |
| حذف docs                 | Admin فقط | تؤثر على كل المستخدمين               |
| تحديث docs (إعادة فهرسة) | Admin فقط | يدوي عند صدور نسخة جديدة             |
| تفعيل/تعطيل docs         | أي مستخدم | كل مستخدم يختار الـ docs المناسبة له |
| البحث في docs            | أي مستخدم | فقط في الـ docs المفعّلة عنده        |

---

## 👤 Phase 10.1 — User Docs Selection (تفضيلات المستخدم)

### الفكرة:

كل مستخدم يختار الـ docs التي يريد استخدامها فقط.

**مثال**: مطور Laravel + React يفعّل هاتين فقط، ولا يرى نتائج Docker أو Python.

### لوحة اختيار الـ Docs (داخل DevDocsPanel):

```
┌─────────────────────────────────────────┐
│  📚 اختر التوثيقات التي تحتاجها        │
│─────────────────────────────────────────│
│                                         │
│  ── Frontend ──                         │
│  🔘 ⚛️  React 19         2,500 chunks  │
│  🔘 ▲  Next.js 15       2,200 chunks  │
│                                         │
│  ── Backend ──                          │
│  🔘 🔴 Laravel 12       2,000 chunks  │
│  ⚪ 🟢 Node.js 22       1,500 chunks  │
│  ⚪ 🐍 Python 3.12      3,500 chunks  │
│  ⚪ ⚡ FastAPI 0.115     1,200 chunks  │
│  ⚪ 🟩 Django 5.1       2,800 chunks  │
│                                         │
│  ── DevOps ──                           │
│  ⚪ 🐳 Docker            1,800 chunks  │
│  ⚪ ☸️  Kubernetes        2,000 chunks  │
│  ⚪ 📦 Git               1,000 chunks  │
│                                         │
│  ─────────────────────────────────────  │
│  ✅ 3 docs مفعّلة | 6,700 chunk متاح    │
│  💡 كلما قل العدد، زادت دقة الإجابات    │
└─────────────────────────────────────────┘
```

### السلوك:

- 🔘 = مفعّل (يبحث فيه عند السؤال)
- ⚪ = متاح لكن غير مفعّل
- عرض مجمّع حسب Category (Frontend / Backend / DevOps)
- حفظ تلقائي عند التبديل (`PUT /api/dev-docs/my-prefs`)
- عرض عدد الـ docs المفعّلة في زر الشات
- ملاحظة: "كلما قل العدد، زادت دقة الإجابات" (لتشجيع الاختيار المدروس)

### API لتفضيلات المستخدم:

```javascript
// حفظ التفضيلات
PUT /api/dev-docs/my-prefs
Body: { "enabledFrameworks": ["laravel", "react", "nextjs"] }

// جلب التفضيلات
GET /api/dev-docs/my-prefs
Response: { "enabledFrameworks": ["laravel", "react", "nextjs"] }
```

### كيف تعمل مع الشات:

```
1. المستخدم يفعّل Dev Docs mode في الشات
2. النظام يقرأ تفضيلاته (أي frameworks مفعّلة)
3. يبحث فقط في الـ frameworks المختارة
4. filter: { framework: { $in: ["laravel", "react"] } }
5. النتائج تكون مركزة ودقيقة
```

### Default Behavior:

- أول مرة يفتح المستخدم Dev Docs → **كل الـ docs المثبّتة مفعّلة**
- يمكنه تعطيل ما لا يحتاجه
- الإعدادات محفوظة في `dev_docs_user_prefs`

---

## 📋 Phase 11 — Frameworks Configuration

### الملف: `server/devDocs/frameworks.js`

```javascript
export const FRAMEWORKS = [
  {
    id: "laravel",
    name: "Laravel",
    icon: "🔴",
    version: "12",
    docsUrl: "https://laravel.com/docs",
    category: "backend",
    priority: 1, // المرحلة 1
    crawlConfig: {
      baseUrl: "https://laravel.com/docs/12",
      sitemapUrl: null,
      pathPatterns: ["/docs/12/*"],
      contentSelector: ".content, .docs-content, main",
      excludeSelectors: ["nav", "footer", ".sidebar", ".header"],
      maxPages: 200,
    },
    keywords: [
      "laravel",
      "eloquent",
      "blade",
      "artisan",
      "migration",
      "middleware",
    ],
  },
  {
    id: "react",
    name: "React",
    icon: "⚛️",
    version: "19",
    docsUrl: "https://react.dev",
    category: "frontend",
    priority: 1,
    crawlConfig: {
      baseUrl: "https://react.dev",
      pathPatterns: ["/learn/*", "/reference/*"],
      contentSelector: "article, main, .content",
      excludeSelectors: ["nav", "footer", "aside"],
      maxPages: 300,
    },
    keywords: [
      "react",
      "hooks",
      "useState",
      "useEffect",
      "component",
      "jsx",
      "props",
    ],
  },
  {
    id: "nextjs",
    name: "Next.js",
    icon: "▲",
    version: "15",
    docsUrl: "https://nextjs.org/docs",
    category: "frontend",
    priority: 1,
    crawlConfig: {
      baseUrl: "https://nextjs.org/docs",
      pathPatterns: ["/docs/*"],
      contentSelector: "article, main",
      excludeSelectors: ["nav", "footer"],
      maxPages: 250,
    },
    keywords: [
      "nextjs",
      "next.js",
      "app router",
      "pages",
      "server component",
      "ssr",
    ],
  },
  {
    id: "nodejs",
    name: "Node.js",
    icon: "🟢",
    version: "22",
    docsUrl: "https://nodejs.org/docs",
    category: "backend",
    priority: 2,
    crawlConfig: {
      baseUrl: "https://nodejs.org/docs/latest/api",
      pathPatterns: ["/docs/latest/api/*"],
      contentSelector: "#apicontent, main",
      excludeSelectors: ["nav", "footer", "#toc"],
      maxPages: 150,
    },
    keywords: ["nodejs", "node.js", "express", "npm", "fs", "http", "stream"],
  },
  {
    id: "python",
    name: "Python",
    icon: "🐍",
    version: "3.12",
    docsUrl: "https://docs.python.org/3",
    category: "backend",
    priority: 2,
    crawlConfig: {
      baseUrl: "https://docs.python.org/3",
      pathPatterns: ["/3/library/*", "/3/tutorial/*", "/3/reference/*"],
      contentSelector: ".body, .document",
      excludeSelectors: ["nav", ".sphinxsidebar", "footer"],
      maxPages: 400,
    },
    keywords: [
      "python",
      "pip",
      "django",
      "flask",
      "async",
      "decorator",
      "class",
    ],
  },
  {
    id: "fastapi",
    name: "FastAPI",
    icon: "⚡",
    version: "0.115",
    docsUrl: "https://fastapi.tiangolo.com",
    category: "backend",
    priority: 2,
    crawlConfig: {
      baseUrl: "https://fastapi.tiangolo.com",
      pathPatterns: ["/tutorial/*", "/advanced/*", "/reference/*"],
      contentSelector: "article, .md-content, main",
      excludeSelectors: ["nav", "footer", "header"],
      maxPages: 150,
    },
    keywords: [
      "fastapi",
      "pydantic",
      "uvicorn",
      "endpoint",
      "dependency injection",
    ],
  },
  {
    id: "django",
    name: "Django",
    icon: "🟩",
    version: "5.1",
    docsUrl: "https://docs.djangoproject.com",
    category: "backend",
    priority: 2,
    crawlConfig: {
      baseUrl: "https://docs.djangoproject.com/en/5.1",
      pathPatterns: ["/en/5.1/topics/*", "/en/5.1/ref/*", "/en/5.1/howto/*"],
      contentSelector: "#docs-content, .document",
      excludeSelectors: ["nav", "footer", "#doc-sidebar"],
      maxPages: 300,
    },
    keywords: [
      "django",
      "orm",
      "model",
      "view",
      "template",
      "urlconf",
      "admin",
    ],
  },
  {
    id: "docker",
    name: "Docker",
    icon: "🐳",
    version: "latest",
    docsUrl: "https://docs.docker.com",
    category: "devops",
    priority: 3,
    crawlConfig: {
      baseUrl: "https://docs.docker.com",
      pathPatterns: [
        "/get-started/*",
        "/engine/*",
        "/compose/*",
        "/reference/*",
      ],
      contentSelector: "article, main, .content",
      excludeSelectors: ["nav", "footer", "aside"],
      maxPages: 200,
    },
    keywords: [
      "docker",
      "container",
      "dockerfile",
      "docker-compose",
      "image",
      "volume",
    ],
  },
  {
    id: "kubernetes",
    name: "Kubernetes",
    icon: "☸️",
    version: "1.31",
    docsUrl: "https://kubernetes.io/docs",
    category: "devops",
    priority: 3,
    crawlConfig: {
      baseUrl: "https://kubernetes.io/docs",
      pathPatterns: ["/docs/concepts/*", "/docs/tasks/*", "/docs/reference/*"],
      contentSelector: "main, .td-content, article",
      excludeSelectors: ["nav", "footer", ".sidebar"],
      maxPages: 250,
    },
    keywords: [
      "kubernetes",
      "k8s",
      "pod",
      "deployment",
      "service",
      "kubectl",
      "helm",
    ],
  },
  {
    id: "git",
    name: "Git",
    icon: "📦",
    version: "latest",
    docsUrl: "https://git-scm.com/docs",
    category: "devops",
    priority: 3,
    crawlConfig: {
      baseUrl: "https://git-scm.com",
      pathPatterns: ["/docs/*", "/book/en/v2/*"],
      contentSelector: "#main, .book-content, .man-content",
      excludeSelectors: ["nav", "footer", "header"],
      maxPages: 150,
    },
    keywords: ["git", "commit", "branch", "merge", "rebase", "remote", "stash"],
  },
];
```

---

## 🔄 Phase 12 — Installation Flow

### عملية تثبيت docs لـ framework واحد:

```
Admin يضغط [تثبيت] Laravel
    ↓
POST /api/dev-docs/install/laravel
    ↓
إنشاء سجل في dev_docs_packs (status: installing)
    ↓
Background Job يبدأ:
    1. Crawler يزحف صفحات Laravel docs
       → تقدم: 0/156 صفحة
    2. Parser ينظف HTML لكل صفحة
       → تقدم: 45/156 صفحة
    3. Indexer يقسم ويعمل embeddings
       → تقدم: 120/156 صفحة
    4. Batch upsert إلى Pinecone
       → تقدم: 156/156 ✅
    ↓
تحديث: status = 'ready', chunk_count = 2340
    ↓
إرسال notification (اختياري)
```

### Server-Sent Events للتقدم:

```
GET /api/dev-docs/install-progress/:framework

data: {"progress": 45, "total": 156, "phase": "crawling"}
data: {"progress": 120, "total": 156, "phase": "indexing"}
data: {"progress": 156, "total": 156, "phase": "complete"}
```

---

## 🧪 Phase 13 — Testing Plan

### اختبارات أساسية:

```
✅ 1. تثبيت Laravel docs → chunk_count > 0
✅ 2. بحث "Laravel middleware" → نتائج من laravel namespace
✅ 3. تفعيل React + Laravel → بحث يعطي نتائج من كليهما
✅ 4. تعطيل React → بحث لا يعطي نتائج React
✅ 5. سؤال "How to create middleware in Laravel?" → إجابة مع code
✅ 6. سؤال "Explain React useEffect" → إجابة مع examples
✅ 7. حذف docs → chunks تُمسح من Pinecone
✅ 8. Dev Docs mode OFF → لا بحث في dev_docs namespace
✅ 9. Dev Docs mode ON بدون frameworks مفعّلة → لا نتائج
✅ 10. Multiple frameworks → نتائج مدمجة بذكاء
```

---

## 📁 ملخص الملفات المطلوبة

### ملفات جديدة (Backend):

| #   | الملف                          | الوصف                         |
| --- | ------------------------------ | ----------------------------- |
| 1   | `server/devDocs/frameworks.js` | تعريف الـ 10 frameworks       |
| 2   | `server/devDocs/crawler.js`    | زاحف المواقع                  |
| 3   | `server/devDocs/parser.js`     | محلل HTML → نص                |
| 4   | `server/devDocs/indexer.js`    | تقسيم + embeddings + Pinecone |
| 5   | `server/devDocs/search.js`     | بحث في dev_docs               |
| 6   | `server/devDocs/routes.js`     | API endpoints                 |

### ملفات جديدة (Frontend):

| #   | الملف                                    | الوصف              |
| --- | ---------------------------------------- | ------------------ |
| 7   | `client/src/components/DevDocsPanel.jsx` | لوحة تحكم الـ docs |

### ملفات معدّلة:

| #   | الملف                       | التعديل                  |
| --- | --------------------------- | ------------------------ |
| 8   | `server/db.js`              | إضافة جداول dev_docs     |
| 9   | `server/index.js`           | ربط routes جديدة         |
| 10  | `server/agent.js`           | دعم devDocsMode          |
| 11  | `client/src/pages/Chat.jsx` | زر + panel + integration |
| 12  | `server/package.json`       | إضافة cheerio + p-limit  |

---

## ⏱ ترتيب التنفيذ

### المرحلة A — الأساس

1. `frameworks.js` — تعريف الـ 10 frameworks
2. `db.js` — إنشاء الجداول
3. `crawler.js` — الزاحف
4. `parser.js` — المحلل
5. `indexer.js` — المفهرس
6. `search.js` — البحث

### المرحلة B — الـ API

7. `routes.js` — endpoints
8. `index.js` — ربط الـ routes
9. `agent.js` — دعم dev docs mode

### المرحلة C — الواجهة

10. `DevDocsPanel.jsx` — لوحة التحكم + اختيار المستخدم
11. `Chat.jsx` — الزر + التكامل

### المرحلة D — الاختبار

12. تثبيت كل الـ 10 frameworks مرة واحدة
13. اختبار البحث والشات وتفضيلات المستخدم

---

## ✅ القرارات النهائية

| السؤال                   | القرار                                                                          |
| ------------------------ | ------------------------------------------------------------------------------- |
| Pinecone Quota           | Free Starter: **100K vectors** — يكفي بسهولة (~20K للـ docs + مساحة للمستخدمين) |
| Embedding Quota          | `llama-text-embed-v2` من Pinecone — **مجاني مع الحساب**                         |
| Documentation Versioning | **الأحدث فقط** — نسخة واحدة لكل framework                                       |
| التحديث                  | **يدوي** — Admin يضغط "تحديث" عند صدور نسخة جديدة                               |
| حق التثبيت/الحذف         | **Admin فقط**                                                                   |
| اختيار المستخدم          | **كل مستخدم يختار** أي docs يريد استخدامها في الشات                             |
| أولوية التنفيذ           | **الكل مرة واحدة** — 10 frameworks                                              |

---

## 🚀 جاهز للتنفيذ

الخطة مكتملة — سيتم التنفيذ بالترتيب:

### المرحلة A — الأساس (Backend)

1. `frameworks.js` + `db.js` (جداول + تعريفات)
2. `crawler.js` + `parser.js` (جلب + تحليل التوثيق)
3. `indexer.js` + `search.js` (فهرسة + بحث)

### المرحلة B — الـ API

4. `routes.js` + `index.js` (endpoints)
5. `agent.js` (دعم dev docs mode)

### المرحلة C — الواجهة

6. `DevDocsPanel.jsx` (لوحة اختيار الـ docs)
7. `Chat.jsx` (زر + تكامل)

### المرحلة D — الاختبار

8. تثبيت كل الـ frameworks
9. اختبار البحث والشات

**هل نبدأ التنفيذ؟** 🔥
