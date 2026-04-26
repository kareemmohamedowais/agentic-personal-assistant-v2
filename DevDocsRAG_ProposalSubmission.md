# 📋 Proposal Submission — DevDocs RAG System

> **System:** Developer Documentation RAG (Retrieval-Augmented Generation)  
> **Project:** Agentic Personal Assistant  
> **Date:** March 2026

---

## 1. مقدمة المشروع (Project Introduction)

### 1.1 اسم النظام

**DevDocs RAG System** — نظام استرجاع معزز بالذكاء الاصطناعي لتوثيق أطر العمل البرمجية

### 1.2 المشكلة

المطورون يقضون وقتاً كبيراً في البحث عبر توثيقات الأطر البرمجية المختلفة (Laravel, React, Django, ...). التوثيقات موزعة على مواقع متعددة، وقد يصعب إيجاد المعلومة المحددة المطلوبة بسرعة.

### 1.3 الحل المقترح

نظام ذكي يقوم بـ:

1. **زحف (Crawling)** — تلقائي لمواقع التوثيق الرسمية لـ 10 أطر عمل
2. **تحليل (Parsing)** — تحويل HTML إلى markdown منظم مع الحفاظ على أمثلة الكود
3. **فهرسة (Indexing)** — تقطيع ذكي وفهرسة في vector store
4. **بحث دلالي (Semantic Search)** — بحث ذكي بالمعنى مع فلترة بالإطار البرمجي

---

## 2. الأهداف (Objectives)

| #   | الهدف            | الوصف                                         |
| --- | ---------------- | --------------------------------------------- |
| 1   | تغطية 10 أطر عمل | دعم أهم الأطر في Frontend, Backend, DevOps    |
| 2   | زحف تلقائي       | BFS crawler مع احترام rate limiting           |
| 3   | حفظ أمثلة الكود  | تحويل HTML→Markdown مع الحفاظ على code blocks |
| 4   | بحث ذكي          | بحث دلالي مع فلترة بالإطار ودعم اكتشاف تلقائي |
| 5   | إدارة سهلة       | تثبيت وتحديث وحذف الأطر عبر واجهة إدارة       |
| 6   | تفضيلات شخصية    | كل مستخدم يختار الأطر التي يريد البحث فيها    |

---

## 3. الأطر البرمجية المدعومة (Supported Frameworks)

### 3.1 القائمة الكاملة (10 أطر)

| #   | Framework      | Category | Version | Max Pages | Base URL                                |
| --- | -------------- | -------- | ------- | --------- | --------------------------------------- |
| 1   | **Laravel**    | Backend  | 12.x    | 200       | `https://laravel.com/docs/12.x`         |
| 2   | **React**      | Frontend | 19      | 300       | `https://react.dev`                     |
| 3   | **Next.js**    | Frontend | 15      | 250       | `https://nextjs.org/docs`               |
| 4   | **Node.js**    | Backend  | 22      | 150       | `https://nodejs.org/docs/latest/api`    |
| 5   | **Python**     | Backend  | 3.13    | 400       | `https://docs.python.org/3`             |
| 6   | **FastAPI**    | Backend  | 0.115   | 150       | `https://fastapi.tiangolo.com`          |
| 7   | **Django**     | Backend  | 5.1     | 300       | `https://docs.djangoproject.com/en/5.1` |
| 8   | **Docker**     | DevOps   | latest  | 200       | `https://docs.docker.com`               |
| 9   | **Kubernetes** | DevOps   | 1.32    | 250       | `https://kubernetes.io/docs`            |
| 10  | **Git**        | DevOps   | latest  | 150       | `https://git-scm.com/doc`               |

### 3.2 التصنيفات

```
Frontend (2):  React, Next.js
Backend (5):   Laravel, Node.js, Python, FastAPI, Django
DevOps (3):    Docker, Kubernetes, Git
```

### 3.3 إعدادات الزحف لكل إطار (Crawl Config)

كل إطار له crawlConfig يحدد:

```javascript
{
  baseUrl: string,           // عنوان التوثيق الأساسي
  linkSelector: string,      // CSS selector للروابط (مثل: "nav a", ".sidebar a")
  contentSelector: string,   // CSS selector للمحتوى (مثل: "main", "article")
  excludeSelectors: string[],// عناصر يتم تجاهلها (nav, footer, ...)
  maxPages: number,          // الحد الأقصى للصفحات
  seedUrls: string[]         // روابط البداية للزحف
}
```

---

## 4. المعمارية العامة (Architecture)

### 4.1 مخطط النظام

```
┌─────────────────────────────────────────────────────────────────┐
│                    DevDocs RAG Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Admin Panel (React)                    │    │
│  │  [Install] [Update] [Uninstall] [Status] per framework  │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │ REST API                             │
│  ┌────────────────────────▼────────────────────────────────┐    │
│  │                  DevDocs Routes (Express)                │    │
│  │  7 endpoints: frameworks, install, update, uninstall,   │    │
│  │  status, my-prefs, update-prefs                         │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                      │
│  ┌────────────────────────▼────────────────────────────────┐    │
│  │              Background Installation Process             │    │
│  │  runInstallation(frameworkId, version)                   │    │
│  │                                                          │    │
│  │  Phase 1: Crawling  ──→ BFS web crawler                 │    │
│  │  Phase 2: Parsing   ──→ HTML to Markdown                │    │
│  │  Phase 3: Indexing  ──→ Split + Embed + Store           │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                      │
│  ┌────────────────────────▼────────────────────────────────┐    │
│  │              Pinecone Vector Store                        │    │
│  │  namespace: "dev_docs"                                   │    │
│  │  metadata: {framework, page, title, url, version}       │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                      │
│  ┌────────────────────────▼────────────────────────────────┐    │
│  │              Semantic Search                              │    │
│  │  searchDevDocs(query, enabledFrameworks, topK=5)        │    │
│  │  + detectFrameworks(query) — auto-detect                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              User Preferences                            │    │
│  │  Per-user framework selection: GET/PUT /my-prefs        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 المكونات (Components)

| Component      | File                           | الدور                    |
| -------------- | ------------------------------ | ------------------------ |
| **Crawler**    | `server/devDocs/crawler.js`    | زحف BFS لمواقع التوثيق   |
| **Parser**     | `server/devDocs/parser.js`     | تحويل HTML→Markdown      |
| **Indexer**    | `server/devDocs/indexer.js`    | تقطيع وفهرسة في Pinecone |
| **Search**     | `server/devDocs/search.js`     | بحث دلالي مع فلترة       |
| **Frameworks** | `server/devDocs/frameworks.js` | تعريفات الـ 10 أطر       |
| **Routes**     | `server/devDocs/routes.js`     | 7 API endpoints          |

---

## 5. التقنيات المستخدمة (Technology Stack)

### 5.1 Backend

| Technology            | الاستخدام               |
| --------------------- | ----------------------- |
| **Node.js + Express** | خادم API                |
| **Cheerio**           | تحليل HTML (خفيف وسريع) |
| **node-fetch**        | HTTP requests للزحف     |
| **LangChain**         | Text splitting          |
| **Pinecone SDK**      | Vector store            |

### 5.2 AI / ML

| Technology              | الاستخدام         |
| ----------------------- | ----------------- |
| **PineconeEmbeddings**  | embedding model   |
| **llama-text-embed-v2** | 1024-dim vectors  |
| **Cosine Similarity**   | similarity metric |

### 5.3 Frontend

| Technology         | الاستخدام         |
| ------------------ | ----------------- |
| **React 19**       | واجهة المستخدم    |
| **DevDocsPanel**   | مكون إدارة الأطر  |
| **DevDocsContext** | حالة React مشتركة |
| **Tailwind CSS 4** | تصميم             |

### 5.4 Database

| Technology   | الاستخدام                     |
| ------------ | ----------------------------- |
| **SQLite**   | تخزين حالة التثبيت والتفضيلات |
| **Pinecone** | تخزين vectors                 |

---

## 6. واجهة API (API Endpoints)

| Method   | Endpoint                            | Auth  | الوصف                       |
| -------- | ----------------------------------- | ----- | --------------------------- |
| `GET`    | `/api/devdocs/frameworks`           | User  | قائمة الأطر المتاحة وحالتها |
| `POST`   | `/api/devdocs/install/:framework`   | Admin | تثبيت إطار (زحف + فهرسة)    |
| `DELETE` | `/api/devdocs/uninstall/:framework` | Admin | حذف إطار وبياناته           |
| `POST`   | `/api/devdocs/update/:framework`    | Admin | تحديث إطار (إعادة زحف)      |
| `GET`    | `/api/devdocs/status/:framework`    | User  | حالة التثبيت والتقدم        |
| `GET`    | `/api/devdocs/my-prefs`             | User  | تفضيلات المستخدم            |
| `PUT`    | `/api/devdocs/my-prefs`             | User  | تحديث تفضيلات المستخدم      |

---

## 7. قاعدة البيانات (Database Schema)

### 7.1 جدول dev_docs_frameworks

```sql
CREATE TABLE IF NOT EXISTS dev_docs_frameworks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT DEFAULT 'not_installed',   -- not_installed, installing, installed, error
  installed_at DATETIME,
  page_count INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  error_message TEXT
);
```

### 7.2 جدول dev_docs_preferences

```sql
CREATE TABLE IF NOT EXISTS dev_docs_preferences (
  user_id INTEGER NOT NULL,
  framework_id TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  PRIMARY KEY (user_id, framework_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 8. خصائص النظام (System Features)

### 8.1 تثبيت خلفي (Background Installation)

- التثبيت يعمل في الخلفية — لا يحجب الخادم
- متابعة التقدم في الوقت الحقيقي عبر `installProgress` Map
- يُحسب النسبة المئوية: `(الصفحات المعالجة / إجمالي الصفحات) × 100`

### 8.2 اكتشاف تلقائي للإطار (Auto Framework Detection)

- يحلل الاستعلام ويكتشف الإطار المذكور تلقائياً
- كل إطار له `keywords` محددة للاكتشاف
- مثال: "how to create routes in Laravel" → يكتشف "laravel"

### 8.3 تحديث ذكي (Smart Update)

- يحذف الـ vectors القديمة أولاً
- ثم يعيد الزحف والفهرسة بالإصدار الجديد
- يُحافظ على تفضيلات المستخدمين

### 8.4 Rate Limiting

- **600ms** تأخير بين كل طلب HTTP
- **15 ثانية** حد زمني لكل صفحة
- يحترم المواقع المصدر ولا يُرهقها

---

## 9. الأمان والصلاحيات (Security)

| العملية             | الصلاحية المطلوبة           |
| ------------------- | --------------------------- |
| عرض الأطر           | مستخدم عادي (authenticated) |
| تثبيت/تحديث/حذف     | مسؤول (admin only)          |
| عرض/تعديل التفضيلات | مستخدم عادي (owner)         |
| البحث               | مستخدم عادي (authenticated) |

---

## 10. مخرجات النظام (Deliverables)

1. **Crawler Module** — زاحف BFS قابل للتوسيع لأي موقع توثيق
2. **Parser Module** — محلل HTML→Markdown يحافظ على code blocks
3. **Indexer Module** — مفهرس ذكي مع metadata غني
4. **Search Module** — محرك بحث دلالي مع فلترة وكشف تلقائي
5. **Admin Interface** — واجهة إدارة لتثبيت وتحديث الأطر
6. **User Preferences** — نظام تفضيلات شخصي لكل مستخدم
7. **10 Framework Configs** — إعدادات زحف جاهزة لـ 10 أطر عمل
