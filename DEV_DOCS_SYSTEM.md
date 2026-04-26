# 📚 Developer Docs Helper — نظام مساعد التوثيقات البرمجية

## وثيقة تقنية شاملة | Technical Documentation

---

## 📋 جدول المحتويات

1. [نظرة عامة](#-نظرة-عامة)
2. [المشكلة والحل](#-المشكلة-والحل)
3. [البنية المعمارية](#-البنية-المعمارية)
4. [المكونات التقنية](#-المكونات-التقنية)
5. [خط أنابيب التثبيت](#-خط-أنابيب-التثبيت-installation-pipeline)
6. [مسار البحث أثناء المحادثة](#-مسار-البحث-أثناء-المحادثة)
7. [واجهة المستخدم](#-واجهة-المستخدم-frontend)
8. [قاعدة البيانات](#-قاعدة-البيانات)
9. [واجهات API](#-واجهات-api)
10. [الأُطر المدعومة](#-الأُطر-المدعومة)
11. [الأداء والحدود](#-الأداء-والحدود)
12. [معالجة الأخطاء](#-معالجة-الأخطاء)
13. [ملخص الملفات](#-ملخص-الملفات)

---

## 🌟 نظرة عامة

**Developer Docs Helper** هو نظام **RAG (Retrieval-Augmented Generation)** مدمج في تطبيق المساعد الذكي الشخصي. يقوم بـ:

1. **زحف** مواقع التوثيق الرسمية للـ Frameworks والمكتبات البرمجية
2. **تحليل** صفحات HTML واستخراج المحتوى النظيف
3. **تقطيع** النصوص إلى أجزاء صغيرة (chunks)
4. **تخزينها** كـ vectors في Pinecone (قاعدة بيانات متجهية)
5. **البحث** فيها عند سؤال المستخدم وإضافتها كسياق للذكاء الاصطناعي

النتيجة: ردود أكثر دقة مبنية على التوثيق الرسمي بدلاً من الاعتماد على ذاكرة النموذج فقط.

---

## 🎯 المشكلة والحل

### المشكلة

نماذج الذكاء الاصطناعي (LLMs) قد تكون معلوماتها قديمة أو غير دقيقة بخصوص frameworks معيّنة — خاصة الإصدارات الجديدة (مثل Laravel 12، React 19، Python 3.12). قد تُعطي أكواد خاطئة أو تستخدم APIs تم إلغاؤها.

### الحل

بدلاً من الاعتماد على ذاكرة النموذج، نجلب المعلومات مباشرة من **الموقع الرسمي** للـ framework ونُضيفها كسياق (context) في الـ prompt. هذا يُعرف بنمط **RAG**.

```
سؤال المستخدم + سياق من التوثيق الرسمي = إجابة دقيقة ومحدّثة
```

---

## 🏗 البنية المعمارية

```
┌──────────────────────────────────────────────────────────────────┐
│                    DEVELOPER DOCS HELPER                         │
│                 (RAG System for Documentation)                   │
└──────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════
  مرحلة التثبيت (مرة واحدة لكل Framework — الأدمن فقط)
═══════════════════════════════════════════════════════════════════

  الموقع الرسمي         الزاحف            المحلّل          المُفهرس         Pinecone
  ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
  │ react.dev│─HTML→│ Crawler  │─HTML→│ Parser   │─Text→│ Indexer  │─Vec→ │ Vector   │
  │ docs.    │      │ (cheerio)│      │(cheerio) │      │(LangChain│      │ Database │
  │ python.  │      │ BFS      │      │→ Markdown│      │ splitter)│      │ ns:      │
  │ laravel. │      │ 200-400  │      │ تصفية    │      │ 1500char │      │ dev_docs │
  │ ...      │      │ pages    │      │ محتوى    │      │ chunks   │      │          │
  └──────────┘      └──────────┘      └──────────┘      └──────────┘      └──────────┘

═══════════════════════════════════════════════════════════════════
  مرحلة البحث (كل محادثة — المستخدم)
═══════════════════════════════════════════════════════════════════

  المستخدم يكتب                 السيرفر                    Pinecone
  ┌──────────────┐         ┌───────────────┐          ┌──────────────┐
  │ "كيف أعمل   │──POST──→│ searchDevDocs │──query──→│ Similarity   │
  │  routing في  │         │ filter:       │          │ Search       │
  │  Laravel?"   │         │ {framework:   │          │ top-5        │
  └──────────────┘         │  ["laravel"]} │          │ results      │
                           └───────────────┘          └──────────────┘
                                  │                          │
                                  ←──── نص من التوثيق ───────┘
                                  │
                           ┌──────┴──────┐
                           │ System      │
                           │ Prompt +    │
                           │ Docs Context│
                           │      ↓      │
                           │ AI Model    │
                           │ (Gemini/    │
                           │  Groq/OR)   │
                           └─────────────┘
                                  │
                           ┌──────┴──────┐
                           │ رد مبني على │
                           │ التوثيق     │
                           │ الرسمي ✓    │
                           └─────────────┘
```

---

## 🔧 المكونات التقنية

### التقنيات المستخدمة

| المكوّن            | التقنية                                    | الدور                                   |
| ------------------ | ------------------------------------------ | --------------------------------------- |
| **Backend**        | Express.js (Node.js)                       | API server                              |
| **Frontend**       | React 19 + Vite                            | واجهة المستخدم                          |
| **Vector DB**      | Pinecone (Free Tier)                       | تخزين واسترجاع المتجهات                 |
| **Embeddings**     | `llama-text-embed-v2`                      | تحويل النص إلى متجهات                   |
| **Web Scraping**   | Cheerio + node-fetch                       | زحف وتحليل HTML                         |
| **Text Splitting** | LangChain `RecursiveCharacterTextSplitter` | تقطيع النصوص                            |
| **Local DB**       | SQLite (better-sqlite3)                    | حالة الـ frameworks وتفضيلات المستخدمين |
| **Auth**           | JWT                                        | مصادقة المستخدمين                       |
| **Styling**        | Tailwind CSS v4                            | تصميم الواجهة                           |
| **State**          | React Context API                          | مشاركة الحالة بين المكوّنات             |

---

## 🔄 خط أنابيب التثبيت (Installation Pipeline)

عندما يضغط الأدمن على "تثبيت" لأي framework:

### المرحلة 1: الزحف (Crawler)

**الملف:** `server/devDocs/crawler.js`

```
                    الخطوات
                    ┌────────────────────────────────────┐
                    │ 1. قراءة إعدادات الـ crawlConfig   │
                    │ 2. البدء من seedUrls               │
                    │ 3. زيارة كل صفحة (BFS)             │
                    │ 4. استخراج الروابط (linkSelector)   │
                    │ 5. تصفية: نفس الدومين فقط          │
                    │ 6. تأخير 600ms بين الطلبات          │
                    │ 7. حد أقصى 200-400 صفحة            │
                    │ 8. إرجاع {url, html}[]             │
                    └────────────────────────────────────┘
```

**الإعدادات:**

- **تأخير بين الطلبات:** 600ms (لتجنب الحظر)
- **مهلة الطلب:** 15 ثانية
- **User-Agent:** `DevDocsHelper/1.0 (Documentation Indexer)`
- **يتجاهل:** ملفات PDF, PNG, JPG, CSS, JS, JSON

### المرحلة 2: التحليل (Parser)

**الملف:** `server/devDocs/parser.js`

````
                    HTML الخام
                        │
                    ┌───┴───────────────────────────────┐
                    │ 1. حذف العناصر غير المطلوبة        │
                    │    (nav, footer, sidebar, scripts)  │
                    │ 2. استخراج العنوان من <h1>           │
                    │ 3. تحويل الأكواد إلى ```blocks      │
                    │ 4. تحويل العناوين إلى # Markdown    │
                    │ 5. تحويل القوائم إلى bullets         │
                    │ 6. تنظيف المسافات الزائدة            │
                    │ 7. تجاهل الصفحات < 100 حرف          │
                    └───┬───────────────────────────────┘
                        │
                    نص Markdown نظيف
````

**المخرج:** مصفوفة من `{ title, content, url, framework, section }`

### المرحلة 3: الفهرسة (Indexer)

**الملف:** `server/devDocs/indexer.js`

```
                    نصوص محلّلة
                        │
                    ┌───┴───────────────────────────────┐
                    │ 1. RecursiveCharacterTextSplitter  │
                    │    - حجم القطعة: 1500 حرف          │
                    │    - التداخل: 300 حرف              │
                    │ 2. إنشاء LangChain Documents       │
                    │    + metadata لكل قطعة:            │
                    │    {                                │
                    │      framework: "laravel",          │
                    │      title: "Routing",              │
                    │      url: "https://...",            │
                    │      version: "12",                 │
                    │      source: "official_docs"        │
                    │    }                                │
                    │ 3. رفع إلى Pinecone بدفعات 96      │
                    │ 4. Namespace: "dev_docs"            │
                    └───┬───────────────────────────────┘
                        │
                    Vectors في Pinecone
```

**الأرقام الفعلية المُثبّتة:**

| Framework     | الصفحات | القطع (Chunks) |
| ------------- | ------- | -------------- |
| React 19      | 185     | 1,549          |
| Node.js 22    | 84      | 3,103          |
| Python 3.12   | 400     | 8,756          |
| FastAPI 0.115 | 107     | 1,488          |
| Laravel 12    | 100     | 3,036          |
| **المجموع**   | **876** | **17,932**     |

---

## 🔍 مسار البحث أثناء المحادثة

**الملف:** `server/devDocs/search.js` + `server/agent.js`

عندما يُرسل المستخدم رسالة والبحث في الدوكيومنتيشن مفعّل:

```
الخطوة 1: المستخدم يكتب سؤال في الشات
         "How do I create a middleware in Laravel?"
                    │
الخطوة 2: │ React يُرسل POST /api/chat/stream
         │ مع: devDocsMode: "true"
         │      devDocsFrameworks: ["laravel", "react"]
                    │
الخطوة 3: │ السيرفر يستدعي searchDevDocs()
         │ - يبحث في Pinecone (namespace: dev_docs)
         │ - فلتر: { framework: { $in: ["laravel", "react"] } }
         │ - Embedding model: llama-text-embed-v2
         │ - يجلب أفضل 5 نتائج (top-K = 5)
         │ - مهلة: 5 ثوانٍ
                    │
الخطوة 4: │ النتائج تُضاف إلى System Prompt:
         │ ┌──────────────────────────────────────┐
         │ │ ## Developer Documentation Context    │
         │ │                                       │
         │ │ [Laravel — Middleware](url)            │
         │ │ Middleware provide a convenient...     │
         │ │                                       │
         │ │ [Laravel — Routing](url)              │
         │ │ All Laravel routes are defined...      │
         │ └──────────────────────────────────────┘
                    │
الخطوة 5: │ الـ Prompt الكامل يُرسل إلى الـ AI:
         │ System Prompt + Docs Context + User Message
                    │
الخطوة 6: │ النموذج يُجيب بناءً على التوثيق الرسمي
         │ مع أكواد دقيقة ومحدّثة ✓
```

### كيف يُبنى الـ System Prompt

```javascript
// في agent.js - buildSystemPrompt()
let prompt = "أنت المساعد الذكي..."; // الـ prompt الأساسي

if (devDocsContext) {
  prompt += `
## Developer Documentation Context
The following excerpts come from official developer documentation.
Use them to provide accurate, up-to-date technical answers with code examples.
Always cite the source documentation when referencing these excerpts.

${devDocsContext}
`;
}
```

---

## 🎨 واجهة المستخدم (Frontend)

### هيكل المكوّنات

```
AppLayout.jsx
├── DevDocsProvider          ← يوفّر الحالة المشتركة
│   ├── Sidebar.jsx
│   │   ├── Navigation Links
│   │   ├── 📚 Developer Docs  → صفحة الإدارة (/dev-docs)
│   │   ├── 📚 Docs Helper     → زر فتح/إغلاق البانل
│   │   │   └── DevDocsPanel.jsx  ← يظهر بجانب الـ Sidebar
│   │   └── ...
│   │
│   └── Chat.jsx             ← يستخدم useDevDocs()
│       ├── devDocsEnabled    → هل البحث مفعّل؟
│       └── devDocsFrameworks → أي frameworks مختارة؟
```

### DevDocsContext (الحالة المشتركة)

**الملف:** `client/src/contexts/DevDocsContext.jsx`

```javascript
// القيم المتاحة في أي مكوّن:
{
  devDocsEnabled,         // boolean  — هل البحث مفعّل عمومياً؟
  devDocsFrameworks,      // string[] — الـ frameworks المختارة ["react", "laravel"]
  showDevDocsPanel,       // boolean  — هل البانل ظاهر؟
  setShowDevDocsPanel,    // function — إظهار/إخفاء البانل
  toggleFramework,        // function — تفعيل/تعطيل framework معيّن
  toggleDevDocs,          // function — تشغيل/إيقاف البحث ككل
  savePrefs,              // function — حفظ التفضيلات في الباك إند
}
```

### DevDocsPanel (بانل الإعدادات)

**الملف:** `client/src/components/DevDocsPanel.jsx`

```
┌─────────────────────────────────────────┐
│ 📚 Developer Docs                       │
│ 5 مثبّت · 3 مفعّل                      │
│                        [● بحث مفعّل] [✕]│
├─────────────────────────────────────────┤
│ 🎨 فرونت إند                            │
│ ┌─────────────────────────────────────┐ │
│ │ ⚛️ React v19  [جاهز ✓]  [Toggle ●]  │ │
│ │    1,549 chunks · 185 صفحة          │ │
│ ├─────────────────────────────────────┤ │
│ │ ▲ Next.js v15  [غير مثبت] [⬇ تثبيت]│ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ⚙️ باك إند                              │
│ ┌─────────────────────────────────────┐ │
│ │ 🔴 Laravel v12 [جاهز ✓] [Toggle ●] │ │
│ │    3,036 chunks · 100 صفحة          │ │
│ ├─────────────────────────────────────┤ │
│ │ 🟢 Node.js v22 [جاهز ✓] [Toggle ●] │ │
│ │    3,103 chunks · 84 صفحة           │ │
│ ├─────────────────────────────────────┤ │
│ │ 🐍 Python v3.12 [جاهز ✓] [Toggle ●]│ │
│ │    8,756 chunks · 400 صفحة          │ │
│ ├─────────────────────────────────────┤ │
│ │ ⚡ FastAPI v0.115 [جاهز ✓][Toggle ●]│ │
│ │    1,488 chunks · 107 صفحة          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 🐳 DevOps                               │
│ ┌─────────────────────────────────────┐ │
│ │ 🐋 Docker  [غير مثبت]   [⬇ تثبيت] │ │
│ │ ☸ Kubernetes [غير مثبت]  [⬇ تثبيت] │ │
│ │ 🔀 Git     [غير مثبت]   [⬇ تثبيت] │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ [       💾 حفظ التفضيلات       ] 3 مفعّل│
└─────────────────────────────────────────┘
```

### زر Docs Helper في الـ Sidebar

```
┌──────────────────────────────┐
│ 📚 Docs Helper     ● 3      │ ← أخضر = مفعّل, 3 = عدد الـ frameworks
│                              │
│ (الضغط → يفتح البانل)       │
└──────────────────────────────┘
```

**المؤشرات البصرية:**

| الحالة                       | المظهر                      |
| ---------------------------- | --------------------------- |
| معطّل (لا frameworks مختارة) | أيقونة رمادية + سهم ▶       |
| مفعّل (frameworks مختارة)    | بنفسجي + نقطة خضراء ● + عدد |
| البانل مفتوح                 | خلفية داكنة للزر            |

---

## 🗄 قاعدة البيانات

### جدول `dev_docs_packs` — حالة الـ Frameworks

**الملف:** `server/db.js`

```sql
CREATE TABLE dev_docs_packs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  framework     TEXT NOT NULL UNIQUE,      -- "laravel", "react", ...
  display_name  TEXT NOT NULL,             -- "Laravel", "React", ...
  icon          TEXT DEFAULT '📦',
  version       TEXT,                      -- "12", "19", ...
  status        TEXT CHECK(status IN
    ('available','installing','ready','error')),
  docs_url      TEXT,                      -- "https://laravel.com/docs"
  chunk_count   INTEGER DEFAULT 0,         -- عدد الـ vectors
  page_count    INTEGER DEFAULT 0,         -- عدد الصفحات
  installed_at  TEXT,                      -- تاريخ التثبيت
  installed_by  INTEGER REFERENCES users,  -- الأدمن الذي ثبّت
  error_message TEXT,                      -- تفاصيل الخطأ إن وجد
  created_at    TEXT DEFAULT (datetime('now'))
);
```

### جدول `dev_docs_user_prefs` — تفضيلات المستخدمين

```sql
CREATE TABLE dev_docs_user_prefs (
  user_id    INTEGER REFERENCES users ON DELETE CASCADE,
  framework  TEXT NOT NULL,
  enabled    INTEGER DEFAULT 1,   -- 1=مفعّل, 0=معطّل
  PRIMARY KEY (user_id, framework)
);
```

### دورة حياة الحالة (Status Lifecycle)

```
  available ──[أدمن يضغط تثبيت]──→ installing ──→ ready ✓
                                         │
                                         └──→ error ✗
                                              │
                                     [أدمن يعيد المحاولة]
                                              │
                                              └──→ installing ──→ ready ✓
```

---

## 🌐 واجهات API

### نقاط النهاية (Endpoints)

| Endpoint                             | Method | الصلاحية | الوصف                           |
| ------------------------------------ | ------ | -------- | ------------------------------- |
| `/api/dev-docs/frameworks`           | GET    | مستخدم   | جلب كل الـ frameworks مع حالتها |
| `/api/dev-docs/install/:framework`   | POST   | أدمن     | بدء تثبيت framework             |
| `/api/dev-docs/uninstall/:framework` | DELETE | أدمن     | حذف framework من Pinecone       |
| `/api/dev-docs/update/:framework`    | POST   | أدمن     | إعادة زحف وفهرسة                |
| `/api/dev-docs/status/:framework`    | GET    | مستخدم   | حالة التثبيت الحالية            |
| `/api/dev-docs/my-prefs`             | GET    | مستخدم   | جلب الـ frameworks المختارة     |
| `/api/dev-docs/my-prefs`             | PUT    | مستخدم   | حفظ الـ frameworks المختارة     |

### مثال: طلب تثبيت

```http
POST /api/dev-docs/install/laravel
Authorization: Bearer <admin-jwt-token>

Response: { success: true, message: "Installation started for laravel" }
```

### مثال: إرسال رسالة مع Docs

```http
POST /api/chat/stream
Content-Type: multipart/form-data
Authorization: Bearer <user-jwt-token>

FormData:
  message: "How to create a controller in Laravel?"
  conversationId: "abc123"
  provider: "gemini"
  model: "gemini-2.5-flash"
  devDocsMode: "true"
  devDocsFrameworks: '["laravel","nodejs"]'
```

---

## 📦 الأُطر المدعومة

### 10 Frameworks مُعدّة مسبقاً

| #   | Framework  | الأيقونة | الإصدار | الفئة    | الحد الأقصى للصفحات |
| --- | ---------- | -------- | ------- | -------- | ------------------- |
| 1   | React      | ⚛️       | 19      | Frontend | 300                 |
| 2   | Next.js    | ▲        | 15      | Frontend | 250                 |
| 3   | Node.js    | 🟢       | 22      | Backend  | 150                 |
| 4   | Python     | 🐍       | 3.12    | Backend  | 400                 |
| 5   | FastAPI    | ⚡       | 0.115   | Backend  | 150                 |
| 6   | Laravel    | 🔴       | 12      | Backend  | 200                 |
| 7   | Django     | 🟢       | 5.1     | Backend  | 300                 |
| 8   | Docker     | 🐋       | Latest  | DevOps   | 200                 |
| 9   | Kubernetes | ☸️       | 1.31    | DevOps   | 250                 |
| 10  | Git        | 🔀       | Latest  | DevOps   | 150                 |

### إعداد كل Framework

كل framework يحتوي على:

```javascript
{
  id: "laravel",                              // معرّف فريد
  name: "Laravel",                            // الاسم المعروض
  icon: "🔴",                                // أيقونة
  version: "12",                              // الإصدار
  docsUrl: "https://laravel.com/docs",        // رابط التوثيق
  category: "backend",                        // التصنيف
  crawlConfig: {
    baseUrl: "https://laravel.com/docs/12.x/installation",
    linkSelector: 'a[href*="/docs/12.x/"]',   // محدد CSS للروابط
    contentSelector: ".docs-content, article", // محدد CSS للمحتوى
    excludeSelectors: ["nav", "footer"],       // عناصر مستبعدة
    maxPages: 200,                             // حد أقصى
    seedUrls: [                                // روابط بداية
      "https://laravel.com/docs/12.x/routing",
      "https://laravel.com/docs/12.x/controllers",
      // ... 70 رابط
    ]
  },
  keywords: [                                  // كلمات مفتاحية للكشف التلقائي
    "laravel", "eloquent", "blade",
    "artisan", "migration", "middleware"
  ]
}
```

---

## ⚡ الأداء والحدود

### ثوابت النظام

| المعيار                    | القيمة    | السبب                        |
| -------------------------- | --------- | ---------------------------- |
| حجم القطعة (Chunk Size)    | 1,500 حرف | توازن بين السياق والدقة      |
| تداخل القطع (Overlap)      | 300 حرف   | منع فقد السياق عند الحدود    |
| تأخير الزحف                | 600ms     | تجنب حظر الموقع              |
| مهلة طلب الزحف             | 15 ثانية  | تجنب التعليق على مواقع بطيئة |
| مهلة البحث في Pinecone     | 5 ثوانٍ   | ضمان عدم تأخر المحادثة       |
| أفضل النتائج (top-K)       | 5         | توازن السرعة مع جودة السياق  |
| دُفعة الفهرسة (Batch Size) | 96 vector | تحسين throughput لـ Pinecone |
| استطلاع التثبيت (Polling)  | 4 ثوانٍ   | تحديث حالة التثبيت           |
| أقل محتوى للصفحة           | 100 حرف   | تجاهل الصفحات الفارغة        |

### Namespace في Pinecone

```
Pinecone Index
│
├── (default namespace)  ← مستندات المستخدمين (PDF, uploads)
│
└── dev_docs             ← توثيقات المطورين (10 frameworks)
    ├── framework: "react"     → 1,549 vectors
    ├── framework: "nodejs"    → 3,103 vectors
    ├── framework: "python"    → 8,756 vectors
    ├── framework: "fastapi"   → 1,488 vectors
    ├── framework: "laravel"   → 3,036 vectors
    └── (more when installed)
```

---

## 🛡 معالجة الأخطاء

| السيناريو                      | السلوك                                                         |
| ------------------------------ | -------------------------------------------------------------- |
| **Pinecone غير مُعَدّ**        | `searchDevDocs` يرجع `null`، المحادثة تستمر بدون docs          |
| **تجاوز مهلة البحث (5s)**      | يُسجَّل تحذير، المحادثة تستمر بشكل طبيعي                       |
| **فشل تثبيت framework**        | الحالة تتحول إلى `error` مع رسالة، الأدمن يمكنه إعادة المحاولة |
| **لا frameworks مختارة**       | `devDocsEnabled` يُعطَّل تلقائياً، الشات يتجاهل DevDocs        |
| **صفحة قصيرة جداً (<100 حرف)** | تُحذف بواسطة الـ Parser، لا تُفهرس                             |
| **محتوى غير HTML**             | يُتجاهل (PDF, PNG, JS, CSS)                                    |
| **روابط خارج الدومين**         | لا يُتابعها الزاحف                                             |
| **خطأ شبكة أثناء الزحف**       | يتجاهل الصفحة ويُكمل                                           |

---

## 📁 ملخص الملفات

### ملفات السيرفر (Backend)

| الملف                          | الأسطر | الوظيفة                                    |
| ------------------------------ | ------ | ------------------------------------------ |
| `server/devDocs/frameworks.js` | ~330   | إعدادات 10 frameworks + URLs + selectors   |
| `server/devDocs/crawler.js`    | ~170   | زاحف الويب (BFS, cheerio, rate limiting)   |
| `server/devDocs/parser.js`     | ~150   | تحويل HTML إلى Markdown نظيف               |
| `server/devDocs/indexer.js`    | ~150   | تقطيع النصوص + رفع إلى Pinecone            |
| `server/devDocs/search.js`     | ~130   | البحث المتجهي + تنسيق النتائج              |
| `server/devDocs/routes.js`     | ~300   | 7 نقاط API + تنسيق التثبيت                 |
| `server/agent.js`              | ~400+  | دمج نتائج البحث في prompt الذكاء الاصطناعي |
| `server/db.js`                 | ~350+  | جداول dev_docs_packs + dev_docs_user_prefs |
| `server/index.js`              | ~650+  | تسجيل مسارات /api/dev-docs                 |

### ملفات العميل (Frontend)

| الملف                                    | الأسطر | الوظيفة                                         |
| ---------------------------------------- | ------ | ----------------------------------------------- |
| `client/src/contexts/DevDocsContext.jsx` | ~85    | Context مشترك (enabled, frameworks, panel)      |
| `client/src/components/DevDocsPanel.jsx` | ~380   | بانل إدارة الـ frameworks (install/toggle/save) |
| `client/src/components/Sidebar.jsx`      | ~200+  | زر Docs Helper + فتح البانل                     |
| `client/src/pages/Chat.jsx`              | ~1000+ | استخدام useDevDocs() + إرسال devDocsMode        |
| `client/src/pages/DevDocs.jsx`           | ~350+  | صفحة إدارة كاملة (admin page)                   |
| `client/src/layouts/AppLayout.jsx`       | ~15    | DevDocsProvider wrapper                         |
| `client/src/App.jsx`                     | ~50    | تسجيل مسار /dev-docs                            |

---

## 🔑 كيف تضيف Framework جديد؟

1. **أضف الإعدادات** في `server/devDocs/frameworks.js`:
   - `id`, `name`, `icon`, `version`, `docsUrl`
   - `crawlConfig`: baseUrl, linkSelector, contentSelector, seedUrls
   - `keywords` للكشف التلقائي

2. **ادخل صفحة Admin** (`/dev-docs`) أو افتح بانل Docs Helper

3. **اضغط "تثبيت"** — سيبدأ:
   - الزحف → التحليل → الفهرسة → الحفظ في Pinecone

4. **فعّل الـ Framework** من بانل Docs Helper

5. **اسأل سؤال** — ستحصل على إجابة مبنية على التوثيق الرسمي ✓

---

## 📊 ملخص الأرقام

```
╔══════════════════════════════════════╗
║     Developer Docs Helper v1.0       ║
╠══════════════════════════════════════╣
║ Frameworks مُعدّة:        10         ║
║ Frameworks مُثبّتة:       5          ║
║ إجمالي الصفحات:           876        ║
║ إجمالي القطع (Vectors):   17,932     ║
║ Namespace:                dev_docs   ║
║ Embedding Model:  llama-text-embed-v2║
║ Vector DB:        Pinecone Free Tier ║
║ API Endpoints:             7         ║
║ React Components:          3         ║
║ Server Modules:            6         ║
╚══════════════════════════════════════╝
```

---

**تم بناء هذا النظام في جلسة عمل واحدة — 6 مارس 2026**
