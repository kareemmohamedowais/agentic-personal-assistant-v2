# 📊 Data Preprocessing — Agentic Personal Assistant

> **Project:** Agentic Personal Assistant — A Multi-Model RAG-Based Intelligent System  
> **Date:** March 2026  
> **Focus:** عمليات المعالجة المسبقة للبيانات في جميع أنظمة المشروع

---

## 1. نظرة عامة (Overview)

يتعامل المشروع مع **4 أنواع رئيسية من البيانات** تمر بمراحل معالجة مسبقة مختلفة:

| نوع البيانات         | المصدر                                | الأداة                | المخرجات                      |
| -------------------- | ------------------------------------- | --------------------- | ----------------------------- |
| **مستندات المستخدم** | رفع ملفات (PDF, DOCX, PPTX, TXT, CSV) | Document RAG Pipeline | Vector embeddings في Pinecone |
| **توثيقات تقنية**    | زحف مواقع الويب (10+ frameworks)      | DevDocs Crawler       | Chunks مفهرسة في Pinecone     |
| **أكواد GitHub**     | استنساخ مستودعات عامة                 | GitHub Repos Pipeline | Code embeddings في Pinecone   |
| **بيانات تحليلية**   | رفع ملفات (CSV, XLSX, JSON, Parquet)  | Data Analyst Engine   | بيانات منظفة ومعالجة          |

---

## 2. معالجة المستندات — Document RAG Pipeline

### 2.1 خط سير المعالجة (Pipeline)

```
رفع الملف → التحقق من النوع → تحميل المحتوى → تقطيع النص → توليد Embeddings → تخزين في Pinecone
```

### 2.2 تحميل المستندات (`server/documentLoader.js`)

يدعم النظام 5 تنسيقات مختلفة، وكل تنسيق يستخدم loader مخصص:

| التنسيق  | المكتبة المستخدمة                       | آلية التحميل                                |
| -------- | --------------------------------------- | ------------------------------------------- |
| **PDF**  | `pdf-parse` (via LangChain `PDFLoader`) | استخراج النص من كل صفحة                     |
| **DOCX** | `mammoth`                               | تحويل Word → HTML → نص مع الحفاظ على البنية |
| **PPTX** | `officeparser`                          | استخراج النص من كل شريحة                    |
| **TXT**  | Native Node.js `fs`                     | قراءة مباشرة للنص الخام                     |
| **CSV**  | Native Node.js `fs`                     | قراءة وتنسيق كسطور مفصولة بفواصل            |

#### مثال على معالجة PDF:

```javascript
// documentLoader.js
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

export async function loadDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".pdf":
      const loader = new PDFLoader(filePath);
      return await loader.load();
    case ".docx":
      return await loadDocx(filePath);
    case ".pptx":
      return await loadPptx(filePath);
    case ".txt":
      return await loadTxt(filePath);
    case ".csv":
      return await loadCsv(filePath);
  }
}
```

### 2.3 تقطيع النصوص (Text Splitting) — `server/ingest.js`

يستخدم النظام **RecursiveCharacterTextSplitter** من LangChain لتقسيم النصوص إلى أجزاء مناسبة للبحث الدلالي:

| المعامل          | القيمة                    | السبب                                                 |
| ---------------- | ------------------------- | ----------------------------------------------------- |
| **chunkSize**    | 1000 حرف                  | حجم مثالي يحافظ على السياق دون تجاوز حد الـ embedding |
| **chunkOverlap** | 200 حرف                   | تداخل يمنع فقدان المعلومات عند الحدود                 |
| **separators**   | `["\n\n", "\n", " ", ""]` | تقسيم هرمي: فقرات → سطور → كلمات                      |

```javascript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const chunks = await textSplitter.splitDocuments(documents);
```

#### مثال عملي للتقطيع:

```
وثيقة أصلية (3200 حرف)
    ↓
Chunk 1: [0-1000]     ← أول 1000 حرف
Chunk 2: [800-1800]   ← تداخل 200 حرف مع Chunk 1
Chunk 3: [1600-2600]  ← تداخل 200 حرف مع Chunk 2
Chunk 4: [2400-3200]  ← الباقي مع تداخل
```

### 2.4 توليد Embeddings وتخزينها

| المعامل              | القيمة                                                      |
| -------------------- | ----------------------------------------------------------- |
| **Embedding Model**  | `llama-text-embed-v2` (Pinecone-hosted)                     |
| **Vector Dimension** | 1024                                                        |
| **Namespace**        | `user_{userId}` — عزل كامل لكل مستخدم                       |
| **Metadata**         | `docId`, `source`, `page` — لربط الـ chunks بالمستند الأصلي |

```javascript
import { PineconeStore } from "@langchain/pinecone";

// تخزين chunks مع metadata في Pinecone namespace خاص بالمستخدم
await PineconeStore.fromDocuments(chunks, embeddings, {
  pineconeIndex: index,
  namespace: `user_${userId}`,
  // metadata يتضمن docId لتمكين الحذف لاحقاً
});
```

### 2.5 حذف البيانات

عند حذف مستند:

1. البحث عن كل الـ vectors التي تحمل `docId` المحدد
2. حذفها من Pinecone namespace المستخدم
3. حذف سجل الملف من SQLite

---

## 3. معالجة التوثيقات التقنية — DevDocs Pipeline

### 3.1 خط سير المعالجة

```
تحديد الإطار → زحف BFS → تحليل HTML → تنظيف → تقطيع → فهرسة في Pinecone
```

### 3.2 الزحف (`server/devDocs/crawler.js`)

| المعامل        | القيمة                       | السبب                      |
| -------------- | ---------------------------- | -------------------------- |
| **Algorithm**  | BFS (Breadth-First Search)   | زحف منظم يغطي كل المستويات |
| **Max Pages**  | 200-400 لكل إطار عمل         | تغطية شاملة دون إغراق      |
| **Rate Limit** | 600ms بين كل طلب             | احترام الخوادم ومنع الحظر  |
| **Parser**     | Cheerio (Server-side jQuery) | سريع وخفيف لتحليل HTML     |

#### خوارزمية الزحف:

```javascript
async function crawl(startUrl, maxPages) {
  const queue = [startUrl]; // طابور BFS
  const visited = new Set(); // صفحات تمت زيارتها
  const results = []; // المحتوى المستخرج

  while (queue.length > 0 && results.length < maxPages) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    const html = await fetch(url);
    const $ = cheerio.load(html);

    // استخراج المحتوى
    const content = extractMainContent($);
    results.push({ url, content });

    // استخراج الروابط وإضافتها للطابور
    $("a[href]").each((_, el) => {
      const link = resolveUrl(url, $(el).attr("href"));
      if (isValidDocLink(link) && !visited.has(link)) {
        queue.push(link);
      }
    });

    await sleep(600); // Rate limiting
  }
  return results;
}
```

### 3.3 تحليل المحتوى (`server/devDocs/parser.js`)

تحويل HTML → Markdown نظيف مع الحفاظ على:

- **العناوين** (h1-h6) → Markdown headings
- **بلوكات الكود** → ```language blocks
- **القوائم** → Markdown lists
- **الجداول** → Markdown tables
- **إزالة**: Navigation, Footer, Sidebar, Scripts, Styles

```javascript
function parseHtml(html, url) {
  const $ = cheerio.load(html);

  // إزالة العناصر غير الضرورية
  $("nav, footer, .sidebar, script, style, .ad").remove();

  // استخراج المحتوى الرئيسي
  const mainContent = $("main, article, .content, .docs-content").first();

  // تحويل لـ Markdown
  return htmlToMarkdown(mainContent.html());
}
```

### 3.4 الفهرسة (`server/devDocs/indexer.js`)

| المعامل          | القيمة                                 |
| ---------------- | -------------------------------------- |
| **chunkSize**    | 1500 حرف (أكبر من المستندات العادية)   |
| **chunkOverlap** | 200 حرف                                |
| **Namespace**    | `dev_docs` (مشترك بين جميع المستخدمين) |
| **Metadata**     | `framework`, `url`, `title`, `section` |
| **Batch Size**   | دفعات لتقليل الضغط على Pinecone        |

### 3.5 الأطر المدعومة

| #   | الإطار     | الفئة            | تقريباً عدد الصفحات |
| --- | ---------- | ---------------- | ------------------- |
| 1   | Laravel    | Backend (PHP)    | ~400                |
| 2   | React      | Frontend (JS)    | ~300                |
| 3   | Node.js    | Runtime (JS)     | ~350                |
| 4   | Python     | Language         | ~400                |
| 5   | FastAPI    | Backend (Python) | ~200                |
| 6   | Django     | Backend (Python) | ~400                |
| 7   | Docker     | DevOps           | ~250                |
| 8   | Kubernetes | DevOps           | ~350                |
| 9   | Git        | Version Control  | ~200                |
| 10+ | أطر إضافية | Mixed            | متغير               |

---

## 4. معالجة أكواد GitHub — GitHub Repos Pipeline

### 4.1 خط سير المعالجة

```
git clone --depth 1 → فلترة الملفات → قراءة الأكواد → بناء شجرة الملفات → تقطيع → فهرسة
```

### 4.2 جلب المستودع (`server/githubRepos/fetcher.js`)

```javascript
// استنساخ سطحي (shallow clone) لتوفير المساحة والوقت
await exec(`git clone --depth 1 ${repoUrl} ${tempDir}`);
```

### 4.3 فلترة الملفات (`server/githubRepos/parser.js`)

**الملفات المقبولة:**

```javascript
const CODE_EXTENSIONS = [
  ".js",
  ".ts",
  ".jsx",
  ".tsx", // JavaScript/TypeScript
  ".py",
  ".rb",
  ".go",
  ".rs", // Python, Ruby, Go, Rust
  ".java",
  ".kt",
  ".scala", // JVM languages
  ".c",
  ".cpp",
  ".h",
  ".hpp", // C/C++
  ".cs", // C#
  ".php",
  ".swift", // PHP, Swift
  ".vue",
  ".svelte", // Frontend frameworks
  ".md",
  ".txt", // Documentation
  ".json",
  ".yaml",
  ".yml", // Config
  ".toml",
  ".env.example", // Config
  ".sql", // Database
  ".sh",
  ".bash", // Scripts
  ".dockerfile",
  ".docker-compose.yml", // Docker
];
```

**الملفات/المجلدات المستبعدة:**

```javascript
const IGNORE_PATTERNS = [
  "node_modules/",
  "vendor/",
  ".git/",
  "dist/",
  "build/",
  "__pycache__/",
  "*.min.js",
  "*.min.css",
  "*.lock",
  "package-lock.json",
  "*.png",
  "*.jpg",
  "*.gif",
  "*.ico",
  "*.woff",
  "*.ttf",
  "*.eot",
  ".DS_Store",
  "Thumbs.db",
];
```

### 4.4 التقطيع الذكي للأكواد

يختلف تقطيع الأكواد عن النصوص العادية:

- يراعي بنية الكود (functions, classes, imports)
- الـ metadata يتضمن: `language`, `filePath`, `repoName`, `owner`
- يحتفظ بسياق أكبر لفهم المنطق البرمجي

### 4.5 الفهرسة

| المعامل            | القيمة                                                   |
| ------------------ | -------------------------------------------------------- |
| **Namespace**      | `github_repos`                                           |
| **Metadata**       | `repo_id`, `owner`, `repo_name`, `file_path`, `language` |
| **Per-User Limit** | `MAX_REPOS_PER_USER` (قابل للتهيئة)                      |

---

## 5. معالجة بيانات التحليل — Data Analyst Pipeline

### 5.1 خط سير المعالجة

```
رفع الملف → التحقق → قراءة الـ metadata → توليد ملخص → تنظيف (اختياري) → تحليل
```

### 5.2 أنواع الملفات المدعومة (`server/dataAnalyst/datasetManager.js`)

| التنسيق | الامتداد        | الحد الأقصى | طريقة القراءة           |
| ------- | --------------- | ----------- | ----------------------- |
| CSV     | `.csv`          | 100MB       | `pandas.read_csv()`     |
| Excel   | `.xlsx`, `.xls` | 100MB       | `pandas.read_excel()`   |
| JSON    | `.json`         | 100MB       | `pandas.read_json()`    |
| Parquet | `.parquet`      | 100MB       | `pandas.read_parquet()` |

### 5.3 توليد الملخص الإحصائي

عند رفع ملف بيانات، يتم تلقائياً:

```python
import pandas as pd

df = pd.read_csv(file_path)

summary = {
    "rows": len(df),
    "columns": len(df.columns),
    "column_info": [],
    "missing_values": {},
    "data_quality_score": 0
}

for col in df.columns:
    info = {
        "name": col,
        "dtype": str(df[col].dtype),
        "non_null": int(df[col].notna().sum()),
        "null_count": int(df[col].isna().sum()),
        "unique": int(df[col].nunique())
    }

    if df[col].dtype in ['int64', 'float64']:
        info["min"] = float(df[col].min())
        info["max"] = float(df[col].max())
        info["mean"] = float(df[col].mean())
        info["std"] = float(df[col].std())
        info["median"] = float(df[col].median())

    summary["column_info"].append(info)
```

### 5.4 تنظيف البيانات التلقائي (`server/dataAnalyst/cleaner.js`)

يُنفَّذ عند طلب المستخدم عبر endpoint:

```
POST /api/data-analyst/datasets/:id/clean
```

#### خطوات التنظيف:

| الخطوة | العملية                   | التفاصيل                                            |
| ------ | ------------------------- | --------------------------------------------------- |
| 1      | **إزالة التكرارات**       | `df.drop_duplicates()` — حذف الصفوف المكررة بالكامل |
| 2      | **معالجة القيم المفقودة** | أعمدة رقمية → median, نصية → mode أو "Unknown"      |
| 3      | **تصحيح أنواع البيانات**  | تحويل تلقائي للأنواع (str→int, str→date) حيث ممكن   |
| 4      | **معالجة القيم الشاذة**   | كشف بـ IQR (Interquartile Range) — تقييد لا حذف     |
| 5      | **تنظيف النصوص**          | إزالة مسافات زائدة، توحيد الحالة                    |
| 6      | **حفظ النسخة المنظفة**    | حفظ كملف جديد `_cleaned.csv`                        |

```python
# مثال على معالجة القيم المفقودة
for col in df.select_dtypes(include=['number']).columns:
    if df[col].isna().sum() > 0:
        median_val = df[col].median()
        df[col].fillna(median_val, inplace=True)

for col in df.select_dtypes(include=['object']).columns:
    if df[col].isna().sum() > 0:
        mode_val = df[col].mode()
        if len(mode_val) > 0:
            df[col].fillna(mode_val[0], inplace=True)
        else:
            df[col].fillna("Unknown", inplace=True)
```

### 5.5 Data Preview

يوفر النظام معاينة للبيانات:

```
GET /api/data-analyst/datasets/:id/preview?rows=20
```

- يعرض أول N صف (الافتراضي 20)
- يعرض أسماء الأعمدة وأنواعها
- يحسب إحصائيات أساسية لكل عمود

---

## 6. معالجة السياق في نظام المحادثة

### 6.1 بناء السياق للـ Agent

عند كل رسالة، يتم بناء سياق متعدد المصادر:

```
┌──────────────────────────────────────────┐
│            Context Building              │
├──────────────────────────────────────────┤
│ 1. Knowledge Base Search (4s timeout)    │
│    → أفضل 10 نتائج من مستندات المستخدم   │
│                                          │
│ 2. DevDocs Search (if enabled)           │
│    → نتائج من التوثيقات التقنية المفعّلة  │
│                                          │
│ 3. GitHub Repos Search (if enabled)      │
│    → نتائج من أكواد GitHub المفعّلة      │
│                                          │
│ 4. Web Search (if needed)                │
│    → أفضل 5 نتائج من Tavily              │
│                                          │
│ 5. Conversation History (last 20 msgs)   │
│    + Summary (if > 30 messages)          │
│                                          │
│ 6. System Prompt (persona)               │
│    + Prompt Optimization (if enabled)    │
└──────────────────────────────────────────┘
```

### 6.2 البحث في قاعدة المعرفة (`server/tools.js`)

```javascript
// بحث تشابهي مع timeout
const searchWithTimeout = async (query, userId) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Search timeout")), 4000),
  );

  const searchPromise = vectorStore.similaritySearch(query, 10, {
    namespace: `user_${userId}`,
  });

  return Promise.race([searchPromise, timeoutPromise]);
};
```

### 6.3 تلخيص المحادثات الطويلة

عند تجاوز **30 رسالة**:

```
أقدم 20 رسالة → إرسال لموديل AI → ملخص مكثف → حذف الرسائل الأصلية → حفظ الملخص
```

- الملخص يُضاف في System Prompt كسياق
- الملخصات تتراكم مع الوقت (مفصولة بـ `---`)
- يضمن عدم فقدان السياق في المحادثات الطويلة

---

## 7. أمان معالجة البيانات

### 7.1 التحقق من الملفات المرفوعة

```javascript
// Multer configuration
const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB للمستندات
    // 100MB لملفات البيانات
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".docx", ".pptx", ".txt", ".csv"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }
  },
});
```

### 7.2 أمان تنفيذ Python

```javascript
// الأوامر المحظورة في sandbox
const BANNED_PATTERNS = [
  "os.system",
  "subprocess",
  "socket",
  "eval(",
  "exec(",
  "__import__",
  "open(",
  "shutil",
  "pathlib",
  "requests",
  "urllib",
  "http.client",
];

// حدود التنفيذ
const EXECUTION_LIMITS = {
  timeout: 30000, // 30 ثانية
  maxMemory: 512 * 1024 * 1024, // 512MB
};
```

### 7.3 عزل بيانات المستخدمين

| الآلية                  | التطبيق                                          |
| ----------------------- | ------------------------------------------------ |
| **Pinecone Namespaces** | كل مستخدم في namespace منفصل (`user_{id}`)       |
| **SQLite Queries**      | كل استعلام يُفلتر بـ `WHERE user_id = ?`         |
| **File Storage**        | ملفات كل مستخدم في مجلد فرعي `uploads/{userId}/` |
| **JWT Verification**    | كل طلب يتحقق من التوكن ويستخرج userId            |

---

## 8. ملخص تقنيات المعالجة المسبقة

```
┌─────────────────────────────────────────────────────────────┐
│                  Data Preprocessing Summary                   │
├──────────────┬──────────────────────────────────────────────┤
│ Documents    │ Load → Split (1000/200) → Embed → Pinecone   │
│ DevDocs      │ Crawl → Parse HTML → Split (1500/200) → Pin  │
│ GitHub Code  │ Clone → Filter → Parse → Split → Pinecone    │
│ Datasets     │ Upload → Validate → Summary → Clean → Store  │
│ Chat Context │ KB Search + DevDocs + GitHub + Web + History  │
│ Long Convos  │ Summarize oldest 20 msgs → inject as context │
└──────────────┴──────────────────────────────────────────────┘
```

---

## 9. المكتبات المستخدمة في المعالجة

| المكتبة                       | الإصدار  | الدور في المعالجة                             |
| ----------------------------- | -------- | --------------------------------------------- |
| `@langchain/textsplitters`    | 0.1.0    | تقطيع النصوص (RecursiveCharacterTextSplitter) |
| `@langchain/pinecone`         | 1.0.1    | إنشاء وتخزين vectors                          |
| `@pinecone-database/pinecone` | 5.1.2    | عمليات Pinecone (CRUD)                        |
| `pdf-parse`                   | 1.1.1    | استخراج نص PDF                                |
| `mammoth`                     | 1.11.0   | تحويل DOCX → HTML                             |
| `officeparser`                | 6.0.4    | استخراج نص PPTX                               |
| `cheerio`                     | 1.2.0    | تحليل HTML (DevDocs crawler)                  |
| `multer`                      | 2.0.0    | معالجة رفع الملفات                            |
| `pandas`                      | (Python) | قراءة وتنظيف datasets                         |
| `numpy`                       | (Python) | عمليات حسابية على البيانات                    |
