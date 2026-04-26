# 📋 Proposal Submission — GitHub Repos RAG System

> **System:** GitHub Repository RAG (Retrieval-Augmented Generation)  
> **Project:** Agentic Personal Assistant  
> **Date:** March 2026

---

## 1. مقدمة المشروع (Project Introduction)

### 1.1 اسم النظام

**GitHub Repos RAG System** — نظام استرجاع معزز بالذكاء الاصطناعي لمستودعات GitHub

### 1.2 المشكلة

المطورون يعملون مع مستودعات كود متعددة وكبيرة، ويحتاجون لفهم الكود بسرعة — البحث اليدوي في آلاف الملفات مرهق وبطيء.

### 1.3 الحل المقترح

نظام ذكي يقوم بـ:

1. **استنساخ (Cloning)** — shallow clone لمستودعات GitHub
2. **تحليل (Parsing)** — قراءة وتصنيف الملفات حسب النوع واللغة
3. **فهرسة (Indexing)** — تقطيع ذكي حسب لغة البرمجة وتخزين في vector store
4. **بحث دلالي (Semantic Search)** — بحث ذكي بالمعنى مع فلترة بالمستودع وتجميع بالملف

---

## 2. الأهداف (Objectives)

| #   | الهدف             | الوصف                                           |
| --- | ----------------- | ----------------------------------------------- |
| 1   | دعم أي مستودع عام | استنساخ أي repo عام من GitHub                   |
| 2   | تحليل 50+ لغة     | دعم الملفات البرمجية والتوثيقية والإعدادات      |
| 3   | تقطيع ذكي         | language-aware splitting مع فواصل مخصصة لكل لغة |
| 4   | بحث مع سياق       | تجميع النتائج بالملف + شجرة المشروع             |
| 5   | عزل المستخدمين    | كل مستخدم يرى مستودعاته فقط                     |
| 6   | حدود موارد        | حماية النظام من الاستخدام المفرط                |

---

## 3. حدود النظام (System Limits)

### 3.1 القيود المفروضة

| الحد                       | القيمة    | السبب                                      |
| -------------------------- | --------- | ------------------------------------------ |
| **MAX_REPOS_PER_USER**     | 20 مستودع | حماية من الاستهلاك المفرط                  |
| **MAX_FILES_PER_REPO**     | 500 ملف   | حماية من المستودعات الضخمة                 |
| **MAX_FILE_SIZE**          | 100 KB    | تجاهل الملفات الكبيرة (generated/minified) |
| **CLONE_TIMEOUT**          | 120 ثانية | حد زمني للاستنساخ                          |
| **SEARCH_TOP_K**           | 10 نتائج  | أقصى نتائج البحث                           |
| **SEARCH_SCORE_THRESHOLD** | 0.25      | حد النقاط الأدنى                           |

### 3.2 أنواع الملفات المدعومة

#### ملفات الكود (50+ امتداد)

```javascript
const CODE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".cs",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".swift",
  ".kt",
  ".scala",
  ".r",
  ".m",
  ".mm",
  ".pl",
  ".pm",
  ".lua",
  ".sh",
  ".bash",
  ".zsh",
  ".ps1",
  ".bat",
  ".cmd",
  ".sql",
  ".graphql",
  ".proto",
  ".zig",
  ".nim",
  ".ex",
  ".exs",
  ".clj",
  ".hs",
  ".erl",
  ".elm",
  ".dart",
  ".v",
  ".sv",
  ".vhdl",
  ".asm",
  ".s",
  ".f90",
  ".f95",
]);
```

#### ملفات التوثيق

```javascript
const DOCS_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".rst",
  ".txt",
  ".adoc",
  ".org",
]);
```

#### ملفات الإعدادات

```javascript
const CONFIG_EXTENSIONS = new Set([
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".env",
  ".env.example",
  ".properties",
]);
```

#### ملفات مهمة (دائماً تُفهرس)

```javascript
const IMPORTANT_FILES = new Set([
  "README.md",
  "readme.md",
  "LICENSE",
  "CHANGELOG.md",
  "package.json",
  "Cargo.toml",
  "go.mod",
  "requirements.txt",
  "Makefile",
  "Dockerfile",
  "docker-compose.yml",
  ".gitignore",
]);
```

#### مجلدات مُتجاهلة

```javascript
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "__pycache__",
  ".next",
  "dist",
  "build",
  "target",
  "vendor",
  ".idea",
  ".vscode",
  "coverage",
  ".cache",
  "tmp",
  "temp",
  "logs",
  ".env",
]);
```

---

## 4. المعمارية العامة (Architecture)

### 4.1 مخطط النظام

```
┌──────────────────────────────────────────────────────────────────┐
│                  GitHub Repos RAG Architecture                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                  React Frontend                           │    │
│  │  GitHubReposPanel: [Add Repo] [Remove] [Reindex] [Prefs] │    │
│  └────────────────────────┬─────────────────────────────────┘    │
│                           │ REST API                              │
│  ┌────────────────────────▼─────────────────────────────────┐    │
│  │                  GitHub Routes (Express)                   │    │
│  │  7 endpoints: repos, add, remove, reindex, status,        │    │
│  │  my-prefs, update-prefs                                   │    │
│  └────────────────────────┬─────────────────────────────────┘    │
│                           │                                       │
│  ┌────────────────────────▼─────────────────────────────────┐    │
│  │             Background Ingestion Process                   │    │
│  │  runRepoIngestion(repoId, owner, name, userId)            │    │
│  │                                                            │    │
│  │  Phase 1: Cloning   ──→ git clone --depth 1               │    │
│  │  Phase 2: Parsing   ──→ File walk + classify + tree       │    │
│  │  Phase 3: Indexing  ──→ Language-aware split + embed       │    │
│  └────────────────────────┬─────────────────────────────────┘    │
│                           │                                       │
│  ┌────────────────────────▼─────────────────────────────────┐    │
│  │             Pinecone Vector Store                          │    │
│  │  namespace: "github_repos"                                │    │
│  │  metadata: {repo, userId, file, language, type, ...}     │    │
│  └────────────────────────┬─────────────────────────────────┘    │
│                           │                                       │
│  ┌────────────────────────▼─────────────────────────────────┐    │
│  │             Semantic Search                                │    │
│  │  searchGithubRepos(query, repos, userId, topK=10)        │    │
│  │  + score threshold 0.25 + group by file + project tree   │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 المكونات (Components)

| Component   | File                            | الدور                            |
| ----------- | ------------------------------- | -------------------------------- |
| **Config**  | `server/githubRepos/config.js`  | ثوابت وإعدادات وخرائط اللغات     |
| **Fetcher** | `server/githubRepos/fetcher.js` | استنساخ من GitHub                |
| **Parser**  | `server/githubRepos/parser.js`  | تحليل الملفات وبناء شجرة المشروع |
| **Indexer** | `server/githubRepos/indexer.js` | تقطيع ذكي وفهرسة                 |
| **Search**  | `server/githubRepos/search.js`  | بحث دلالي متقدم                  |
| **Routes**  | `server/githubRepos/routes.js`  | 7 API endpoints                  |

---

## 5. التقنيات المستخدمة (Technology Stack)

### 5.1 Backend

| Technology               | الاستخدام                       |
| ------------------------ | ------------------------------- |
| **Node.js + Express**    | خادم API                        |
| **child_process (exec)** | تنفيذ `git clone`               |
| **fs/promises**          | قراءة الملفات                   |
| **GitHub REST API**      | جلب معلومات المستودع            |
| **LangChain**            | Text splitting (language-aware) |
| **Pinecone SDK**         | Vector store                    |

### 5.2 AI / ML

| Technology                         | الاستخدام                |
| ---------------------------------- | ------------------------ |
| **PineconeEmbeddings**             | embedding model          |
| **llama-text-embed-v2**            | 1024-dim vectors         |
| **RecursiveCharacterTextSplitter** | Language-aware splitting |
| **Cosine Similarity**              | similarity metric        |

### 5.3 Frontend

| Technology             | الاستخدام             |
| ---------------------- | --------------------- |
| **React 19**           | واجهة المستخدم        |
| **GitHubReposPanel**   | مكون إدارة المستودعات |
| **GitHubReposContext** | حالة React مشتركة     |

### 5.4 Database

| Technology   | الاستخدام                          |
| ------------ | ---------------------------------- |
| **SQLite**   | تخزين بيانات المستودعات والتفضيلات |
| **Pinecone** | تخزين vectors                      |

---

## 6. واجهة API (API Endpoints)

| Method   | Endpoint                  | Auth  | الوصف                   |
| -------- | ------------------------- | ----- | ----------------------- |
| `GET`    | `/api/github/repos`       | User  | قائمة مستودعات المستخدم |
| `POST`   | `/api/github/add`         | User  | إضافة مستودع جديد       |
| `DELETE` | `/api/github/remove/:id`  | User  | حذف مستودع              |
| `POST`   | `/api/github/reindex/:id` | Admin | إعادة فهرسة مستودع      |
| `GET`    | `/api/github/status/:id`  | User  | حالة المستودع           |
| `GET`    | `/api/github/my-prefs`    | User  | تفضيلات البحث           |
| `PUT`    | `/api/github/my-prefs`    | User  | تحديث التفضيلات         |

---

## 7. قاعدة البيانات (Database Schema)

### 7.1 جدول github_repos

```sql
CREATE TABLE IF NOT EXISTS github_repos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,      -- "owner/name"
  description TEXT,
  language TEXT,                 -- اللغة الرئيسية
  stars INTEGER DEFAULT 0,
  default_branch TEXT DEFAULT 'main',
  status TEXT DEFAULT 'pending', -- pending, cloning, parsing, indexing, ready, error
  file_count INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, full_name)
);
```

### 7.2 جدول github_repos_preferences

```sql
CREATE TABLE IF NOT EXISTS github_repos_preferences (
  user_id INTEGER NOT NULL,
  repo_id INTEGER NOT NULL,
  enabled INTEGER DEFAULT 1,
  PRIMARY KEY (user_id, repo_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (repo_id) REFERENCES github_repos(id)
);
```

---

## 8. دعم 16 لغة برمجة (Language-Aware Splitting)

النظام يوفر فواصل تقطيع مخصصة (separators) لـ 16 لغة برمجة:

| #   | Language       | Key Separators                                             |
| --- | -------------- | ---------------------------------------------------------- |
| 1   | **JavaScript** | `\nfunction`, `\nconst`, `\nclass`, `\nif`, `\nfor`        |
| 2   | **TypeScript** | `\ninterface`, `\ntype`, `\nfunction`, `\nclass`           |
| 3   | **Python**     | `\nclass`, `\ndef`, `\nif`, `\nfor`, `\nwhile`             |
| 4   | **Java**       | `\npublic`, `\nprivate`, `\nclass`, `\ninterface`          |
| 5   | **C**          | `\nint`, `\nvoid`, `\nstruct`, `\n#include`                |
| 6   | **C++**        | `\nclass`, `\ntemplate`, `\nnamespace`, `\nvirtual`        |
| 7   | **Go**         | `\nfunc`, `\ntype`, `\npackage`, `\nimport`                |
| 8   | **Rust**       | `\nfn`, `\npub`, `\nstruct`, `\nimpl`, `\nenum`            |
| 9   | **Ruby**       | `\ndef`, `\nclass`, `\nmodule`, `\ndo`                     |
| 10  | **PHP**        | `\nfunction`, `\nclass`, `\npublic`, `\nnamespace`         |
| 11  | **Swift**      | `\nfunc`, `\nclass`, `\nstruct`, `\nenum`, `\nprotocol`    |
| 12  | **Kotlin**     | `\nfun`, `\nclass`, `\nobject`, `\ndata class`             |
| 13  | **Scala**      | `\ndef`, `\nclass`, `\nobject`, `\ntrait`                  |
| 14  | **C#**         | `\npublic`, `\nprivate`, `\nclass`, `\ninterface`          |
| 15  | **Shell**      | `\nfunction`, `\nif`, `\nfor`, `\nwhile`, `\ncase`         |
| 16  | **SQL**        | `\nSELECT`, `\nCREATE`, `\nINSERT`, `\nUPDATE`, `\nDELETE` |

---

## 9. خصائص فريدة (Unique Features)

### 9.1 شجرة المشروع (Project Tree)

- يُولّد شجرة directory tree لكل مستودع (حتى عمق 5)
- تُخزن كـ Document خاص في Pinecone
- تُرفق مع نتائج البحث لتوفير سياق هيكلي

### 9.2 الأولوية في التحليل (File Priority)

```
1. README.md → أولوية قصوى
2. docs/*.md → توثيق
3. config files → إعدادات (package.json, Dockerfile, ...)
4. code files → كود المصدر
```

### 9.3 كشف الملفات الثنائية (Binary Detection)

- يتحقق من أول 512 byte
- يبحث عن null bytes (0x00)
- يتجاهل الملفات الثنائية تلقائياً

### 9.4 فلترة ذكية

- يتجاهل 13 مجلد شائع (node_modules, .git, ...)
- يتجاهل ملفات > 100KB
- يتجاهل الملفات بدون امتداد معروف
- يصنّف الملفات إلى: code / docs / config

---

## 10. الأمان والصلاحيات (Security)

| العملية          | الصلاحية                                              |
| ---------------- | ----------------------------------------------------- |
| إضافة/حذف مستودع | مستخدم عادي (owner)                                   |
| إعادة فهرسة      | مسؤول (admin only)                                    |
| عرض المستودعات   | مستخدم عادي (owner — يرى مستودعاته فقط)               |
| البحث            | مستخدم عادي (يبحث في مستودعاته فقط — `userId` filter) |
| التفضيلات        | مستخدم عادي (owner)                                   |

### 10.1 عزل البيانات

- كل vector يحمل `userId` في metadata
- البحث يفلتر بـ `userId` — مستحيل الوصول لبيانات مستخدم آخر
- حتى داخل namespace واحد (`github_repos`), العزل مضمون

---

## 11. مخرجات النظام (Deliverables)

1. **Config Module** — ثوابت وإعدادات شاملة + خرائط لغات (50+ امتداد)
2. **Fetcher Module** — استنساخ من GitHub مع timeout وتنظيف
3. **Parser Module** — تحليل ملفات + شجرة مشروع + كشف binary
4. **Indexer Module** — language-aware splitting لـ 16 لغة
5. **Search Module** — بحث متقدم مع فلترة وتجميع وشجرة سياقية
6. **Routes Module** — 7 API endpoints مع إدارة كاملة
7. **Frontend Components** — واجهة إدارة المستودعات والتفضيلات
