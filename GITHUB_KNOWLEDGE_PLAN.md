<div dir="rtl">

# 🧭 GitHub Repository Knowledge System — خطة التنفيذ الكاملة

## Implementation Plan v1.0

---

## 📋 جدول المحتويات

| #   | القسم                                                             |
| --- | ----------------------------------------------------------------- |
| 0   | [أسئلة قبل التنفيذ](#-أسئلة-يجب-الإجابة-عليها-قبل-البدء)          |
| 1   | [نظرة عامة](#-1-نظرة-عامة)                                        |
| 2   | [المقارنة مع DevDocs](#-2-المقارنة-مع-devdocs)                    |
| 3   | [المعمارية](#-3-المعمارية-العامة)                                 |
| 4   | [هيكل الملفات](#-4-هيكل-الملفات)                                  |
| 5   | [Phase 1 — قاعدة البيانات](#-phase-1--قاعدة-البيانات)             |
| 6   | [Phase 2 — جلب الـ Repo](#-phase-2--جلب-الـ-repo-fetcher)         |
| 7   | [Phase 3 — تحليل الكود](#-phase-3--محلل-الكود-parser)             |
| 8   | [Phase 4 — التقسيم والفهرسة](#-phase-4--التقسيم-والفهرسة-indexer) |
| 9   | [Phase 5 — البحث](#-phase-5--البحث-search)                        |
| 10  | [Phase 6 — API Routes](#-phase-6--api-routes)                     |
| 11  | [Phase 7 — تكامل Agent](#-phase-7--تكامل-الـ-agent)               |
| 12  | [Phase 8 — واجهة المستخدم](#-phase-8--واجهة-المستخدم-client)      |
| 13  | [Phase 9 — الأمان](#-phase-9--الأمان-والحدود)                     |
| 14  | [ملاحظات على الخطة الأصلية](#-ملاحظات-على-الخطة-الأصلية)          |
| 15  | [خطة التنفيذ الزمنية](#-خطة-التنفيذ-المرحلية)                     |

---

## ❓ أسئلة يجب الإجابة عليها قبل البدء

> **هذه الأسئلة تؤثر على القرارات المعمارية — يجب الإجابة عليها أولاً:**

### 1. نطاق الاستخدام (Scope)

```
السؤال: من يضيف الـ repos — الأدمن فقط أم كل مستخدم؟

الخيار A: مثل DevDocs — الأدمن يثبت repos جاهزة للجميع
الخيار B: كل مستخدم يضيف repos خاصة به (مثل رفع المستندات)
الخيار C: الاثنين معاً (repos عامة من الأدمن + repos خاصة لكل مستخدم)
```

> **توصيتي: الخيار C** — لأنه يعطي أقصى مرونة.
> الأدمن يثبت repos مشهورة (مثل Repo Packs)، وكل مستخدم يضيف repos مشاريعه الخاصة.

---

### 2. طريقة الجلب (Fetch Strategy)

```
السؤال: كيف نجلب ملفات الـ repo — عبر GitHub API أم git clone؟

الخيار A: GitHub REST API (GET /repos/{owner}/{repo}/git/trees)
  ✅ لا يحتاج git مثبت على السيرفر
  ❌ Rate Limit: 5,000 طلب/ساعة (مع token)، 60 بدونه
  ❌ بطيء جداً للـ repos الكبيرة (طلب لكل ملف)
  ❌ ملفات أكبر من 1MB تحتاج Git Blob API

الخيار B: git clone --depth 1 (shallow clone)
  ✅ سريع جداً (clone كامل في ثوانٍ)
  ✅ لا rate limit
  ✅ يعمل مع ملفات كبيرة
  ❌ يحتاج git مثبت على السيرفر
  ❌ يحتاج مساحة تخزين مؤقتة

الخيار C: Hybrid — git clone كأساس + GitHub API كاحتياط
```

> **توصيتي: الخيار B (git clone)** — الأسرع والأبسط.
> الـ repo الكبير (مثل React: 4000+ ملف) عبر API يحتاج 4000+ HTTP request.
> عبر `git clone --depth 1`: عملية واحدة في ثوانٍ.

---

### 3. Pinecone Namespace Strategy

```
السؤال: كيف نُنظّم الـ vectors في Pinecone؟

الخيار A: namespace واحد "github_repos" + فلتر بالـ metadata
  ✅ بسيط
  ❌ بطيء في الحذف (deleteMany بالفلتر)
  ❌ Pinecone free tier: namespace واحد فقط مع index واحد

الخيار B: namespace لكل repo: "repo_{owner}_{name}"
  ✅ حذف سريع (deleteAll في namespace)
  ✅ عزل كامل
  ❌ Pinecone free tier قد يحد عدد الـ namespaces

الخيار C: namespace واحد "github_repos" مع metadata filter
  (مثل DevDocs الذي يستخدم "dev_docs" namespace مع framework filter)
```

> **توصيتي: الخيار C** — نفس نمط DevDocs بالضبط.
> `namespace: "github_repos"` مع `metadata.repo: "owner/name"` كفلتر.
> هذا يعمل مع Pinecone free tier ومتسق مع المشروع.

---

### 4. حجم الـ Repos المتوقع

```
السؤال: هل نضع حد أقصى لعدد الملفات/حجم الـ repo؟

المشكلة: بعض الـ repos ضخمة:
  - facebook/react     → 4,000+ ملف
  - torvalds/linux     → 70,000+ ملف (مستحيل)
  - vercel/next.js     → 8,000+ ملف

التوصية:
  - حد أقصى: 500 ملف كود (قابل للتعديل)
  - حجم أقصى للملف: 100 KB (الكود الأكبر غالباً generated)
  - repos أكبر: يُفهرس README + أهم المجلدات فقط
```

---

### 5. Private Repos

```
السؤال: هل ندعم private repos من البداية؟

التوصية:
  - Phase 1: public repos فقط (بدون token)
  - Phase 2: إضافة دعم GitHub Personal Access Token
  - يُخزّن token مشفر في user_settings (مثل groq_api_key)
```

---

## 🎯 1. نظرة عامة

### ما هو هذا النظام؟

**GitHub Repository Knowledge System** يحوّل أي GitHub repository إلى قاعدة معرفية (Knowledge Base) قابلة للبحث، بحيث المساعد الذكي يمكنه:

- **فهم كود أي مشروع** — يقرأ الملفات ويفهم الهيكل
- **الإجابة على أسئلة عن المشروع** — "كيف يعمل auth في هذا المشروع؟"
- **شرح functions/classes/files** — "اشرح ملف userController.js"
- **تحليل هيكل المشروع** — "ما هي الـ API endpoints في هذا المشروع؟"

### كيف يعمل (ملخص)؟

```
GitHub Repo URL
      │
      ▼
  git clone --depth 1  (أو GitHub API)
      │
      ▼
  اكتشاف وتصفية الملفات
  (فقط كود + config + docs)
      │
      ▼
  تقسيم ذكي للكود
  (function-aware / file-based)
      │
      ▼
  Embedding + Pinecone
  (namespace: github_repos)
      │
      ▼
  بحث RAG أثناء المحادثة
  "كيف يعمل routing في هذا المشروع؟"
```

---

## 🔄 2. المقارنة مع DevDocs

| الجانب          | DevDocs System                            | GitHub Knowledge                      |
| --------------- | ----------------------------------------- | ------------------------------------- |
| **المصدر**      | مواقع توثيق رسمية (HTML)                  | GitHub repos (كود مصدري)              |
| **الجلب**       | Web Crawler (BFS + cheerio)               | `git clone --depth 1` أو GitHub API   |
| **المحتوى**     | HTML → Markdown                           | كود + README + config files           |
| **التقسيم**     | RecursiveCharacterTextSplitter (1500/300) | Code-aware splitter (حسب functions)   |
| **Namespace**   | `dev_docs`                                | `github_repos`                        |
| **الفلتر**      | `framework: $in [...]`                    | `repo: $in [...]`                     |
| **ال Metadata** | framework, title, url, version            | repo, file, language, path            |
| **من يثبت**     | Admin فقط                                 | Admin (packs) + User (custom repos)   |
| **التحديث**     | يدوي (re-crawl)                           | يدوي (re-clone)                       |
| **DB Tables**   | dev_docs_packs, dev_docs_user_prefs       | github_repos, github_repos_user_prefs |

### ما يُعاد استخدامه من DevDocs:

```
✅ نمط الـ Routes (install/uninstall/update/status/prefs)
✅ نمط الـ DB Tables (packs + user_prefs)
✅ نمط الـ Indexer (LangChain + Pinecone batching)
✅ نمط الـ Search (similarity search + metadata filter)
✅ نمط الـ Agent Integration (buildSystemPrompt + context injection)
✅ نمط الـ Client (Context + Panel + Sidebar toggle)
✅ نمط الـ Progress Tracking (installProgress Map)
```

### ما هو مختلف:

```
🔄 Fetcher بدل Crawler (git clone بدل HTTP crawl)
🔄 Code Parser بدل HTML Parser
🔄 File Filtering (extensions, size, binary detection)
🔄 Code-aware Chunking (ليس text chunking عادي)
🔄 Metadata مختلفة (file path, language, repo)
🆕 Repo Structure Generation (شجرة الملفات كـ context)
🆕 User-owned repos (ليس admin فقط)
```

---

## 🏗 3. المعمارية العامة

```
┌───────────────────────────────────────────────────────────────┐
│                 GITHUB KNOWLEDGE SYSTEM                        │
│          (شبه منفصل — مثل DevDocs System)                     │
└───────────────────────────────────────────────────────────────┘

  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
  │  GitHub.com  │      │  Local Clone │      │   Pinecone   │
  │  (Source)    │ ──── │  (Temp Dir)  │ ──── │  (Vectors)   │
  │              │ git  │              │ embed│              │
  │  owner/repo  │clone │  /tmp/repos/ │      │ ns:github_   │
  │              │      │              │      │    repos     │
  └──────────────┘      └──────┬───────┘      └──────────────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
              ┌─────▼──┐ ┌────▼───┐ ┌────▼───┐
              │Fetcher │ │Parser  │ │Indexer │
              │(clone) │ │(code)  │ │(embed) │
              └────────┘ └────────┘ └────────┘
                    │          │          │
                    └──────────┼──────────┘
                               │
                         ┌─────▼─────┐
                         │  Routes   │
                         │  (API)    │
                         └─────┬─────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
        ┌─────▼─────┐   ┌─────▼─────┐   ┌──────▼──────┐
        │  SQLite   │   │  Agent    │   │   Client    │
        │  (state)  │   │ (search)  │   │  (React UI) │
        └───────────┘   └───────────┘   └─────────────┘
```

### تدفق الطلب الكامل

````
═══════════════════════════════════════════════════════════
  المرحلة 1: الأدمن/المستخدم يضيف repo
═══════════════════════════════════════════════════════════

  POST /api/github-repos/add
  body: { repoUrl: "https://github.com/owner/repo" }
       │
       ▼
  ┌──────────────────────────────────────────────────────┐
  │ 1. تحليل URL → { owner: "owner", name: "repo" }     │
  │ 2. GitHub API: GET /repos/{owner}/{repo}             │
  │    → تحقق Repo موجود + public + الحجم               │
  │ 3. INSERT INTO github_repos (status: "cloning")      │
  │ 4. رد فوري: { ok: true, repoId: 5 }                │
  │ 5. بدء عملية الخلفية ↓                               │
  └──────────────────────────────────────────────────────┘
       │
       ▼ (background)
  ┌──────────────────────────────────────────────────────┐
  │ Phase A: Clone                                        │
  │   git clone --depth 1 {url} /tmp/repos/{owner}_{repo}│
  │   status: "cloning" → "parsing"                       │
  │                                                       │
  │ Phase B: Parse                                        │
  │   • اكتشاف الملفات (filter by extension + size)      │
  │   • قراءة محتوى كل ملف                                │
  │   • بناء شجرة المشروع (tree structure)                │
  │   status: "parsing" → "indexing"                       │
  │                                                       │
  │ Phase C: Index                                        │
  │   • تقسيم الكود (code-aware chunks)                   │
  │   • إنشاء embeddings (llama-text-embed-v2)            │
  │   • رفع إلى Pinecone (namespace: github_repos)        │
  │   status: "indexing" → "ready"                        │
  │                                                       │
  │ Phase D: Cleanup                                      │
  │   • حذف /tmp/repos/{owner}_{repo}                     │
  │   • تحديث DB: chunk_count, file_count                 │
  └──────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════
  المرحلة 2: المستخدم يسأل سؤال
═══════════════════════════════════════════════════════════

  "كيف يعمل authentication في مشروع laravel/laravel؟"
       │
       ▼
  ┌──────────────────────────────────────────────────────┐
  │ 1. Chat.jsx يرسل: githubReposMode=true               │
  │    githubRepos=["laravel/laravel"]                    │
  │                                                       │
  │ 2. agent.js → searchGithubRepos(query, enabledRepos)  │
  │    → Pinecone similarity search                       │
  │    → filter: { repo: { $in: enabledRepos } }          │
  │    → top 5 results                                    │
  │                                                       │
  │ 3. buildSystemPrompt(..., githubContext)               │
  │    → يُضاف كقسم:                                     │
  │    "## GitHub Repository Code Context"                │
  │    "[laravel/laravel — app/Http/Middleware/Auth.php]"  │
  │    "```php\nclass Authenticate extends...\n```"        │
  │                                                       │
  │ 4. AI يُجيب بناءً على الكود الفعلي ✓                  │
  └──────────────────────────────────────────────────────┘
````

---

## 📁 4. هيكل الملفات

```
server/
└── githubRepos/              ← النظام الجديد (مثل devDocs/)
    ├── config.js             ← إعدادات عامة + repo packs جاهزة
    ├── fetcher.js            ← git clone + GitHub API (بدل crawler.js)
    ├── parser.js             ← قراءة وتصفية الملفات (بدل HTML parser)
    ├── indexer.js            ← تقسيم + embedding + Pinecone
    ├── search.js             ← بحث متجهي + تنسيق النتائج
    └── routes.js             ← API endpoints (7-8 routes)

client/src/
├── contexts/
│   └── GitHubReposContext.jsx  ← State management (مثل DevDocsContext)
├── components/
│   └── GitHubReposPanel.jsx    ← بانل في الـ Sidebar (مثل DevDocsPanel)
└── pages/
    └── GitHubRepos.jsx         ← صفحة إدارة (admin + user)
```

### المقارنة الهيكلية مع DevDocs:

```
devDocs/                    githubRepos/
├── frameworks.js      ←→   ├── config.js
├── crawler.js         ←→   ├── fetcher.js
├── parser.js          ←→   ├── parser.js
├── indexer.js         ←→   ├── indexer.js
├── search.js          ←→   ├── search.js
└── routes.js          ←→   └── routes.js
```

---

## 🗄 Phase 1 — قاعدة البيانات

### جدولان جديدان (مثل DevDocs بالضبط):

```sql
── github_repos ──────────────────────────────────────────
-- (يقابل dev_docs_packs)
CREATE TABLE IF NOT EXISTS github_repos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,

  -- معلومات الـ Repo
  owner         TEXT    NOT NULL,              -- "laravel"
  name          TEXT    NOT NULL,              -- "laravel"
  full_name     TEXT    NOT NULL UNIQUE,       -- "laravel/laravel"
  description   TEXT,                          -- من GitHub API
  language      TEXT,                          -- "PHP" (اللغة الرئيسية)
  stars         INTEGER DEFAULT 0,
  default_branch TEXT   DEFAULT 'main',

  -- حالة الفهرسة
  status        TEXT    NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending','cloning','parsing','indexing','ready','error')),

  -- إحصائيات
  file_count    INTEGER DEFAULT 0,            -- عدد الملفات المفهرسة
  chunk_count   INTEGER DEFAULT 0,            -- عدد الـ vectors
  total_size    INTEGER DEFAULT 0,            -- الحجم الكلي (bytes)

  -- من أضافه
  added_by      INTEGER REFERENCES users(id),
  is_public     INTEGER DEFAULT 1,            -- 1=متاح للجميع, 0=خاص بالمستخدم

  -- تواريخ
  indexed_at    TEXT,
  error_message TEXT,
  created_at    TEXT    DEFAULT (datetime('now')),

  UNIQUE(owner, name)
);


── github_repos_user_prefs ───────────────────────────────
-- (يقابل dev_docs_user_prefs)
CREATE TABLE IF NOT EXISTS github_repos_user_prefs (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo_id    INTEGER NOT NULL REFERENCES github_repos(id) ON DELETE CASCADE,
  enabled    INTEGER DEFAULT 1,
  PRIMARY KEY (user_id, repo_id)
);
```

### الفرق عن DevDocs:

| DevDocs                 | GitHub Repos            | السبب                          |
| ----------------------- | ----------------------- | ------------------------------ |
| `framework TEXT UNIQUE` | `full_name TEXT UNIQUE` | Repo = "owner/name"            |
| —                       | `owner TEXT, name TEXT` | نحتاج الاثنين لـ API calls     |
| —                       | `language TEXT`         | لعرض اللغة الرئيسية في الـ UI  |
| —                       | `stars INTEGER`         | لترتيب العرض                   |
| —                       | `is_public INTEGER`     | تمييز repos الأدمن vs المستخدم |
| `page_count`            | `file_count`            | ملفات كود بدل صفحات HTML       |
| `installed_by`          | `added_by`              | نفس المفهوم                    |

---

## 📥 Phase 2 — جلب الـ Repo (Fetcher)

### ملف: `server/githubRepos/fetcher.js`

```
الوظيفة: تحويل GitHub URL → ملفات محلية

المدخل:  "https://github.com/laravel/laravel"
المخرج:  { localPath: "/tmp/repos/laravel_laravel", repoInfo: {...} }
```

### الخطوات:

```
  1. parseGitHubUrl(url)
     │
     ├── يستخرج: owner, name
     ├── يقبل: github.com/owner/repo
     ├── يرفض: URLs غير GitHub
     │
     ▼
  2. fetchRepoInfo(owner, name)
     │
     ├── GitHub API: GET /repos/{owner}/{name}
     ├── يتحقق: exists? public? size < limit?
     ├── يأخذ: description, language, stars, default_branch
     │
     ▼
  3. cloneRepo(owner, name, branch)
     │
     ├── git clone --depth 1 --branch {branch} {url} {localPath}
     ├── localPath = path.join(os.tmpdir(), 'repos', `${owner}_${name}`)
     ├── timeout: 60 seconds
     ├── إذا المجلد موجود → حذفه أولاً
     │
     ▼
  4. return { localPath, repoInfo }
```

### Git Clone vs GitHub API:

```
مثال: laravel/laravel (≈200 ملف)

GitHub API:
  1 request → /repos/laravel/laravel/git/trees/main?recursive=1 → شجرة الملفات
  200 requests → /repos/laravel/laravel/contents/{path} → محتوى كل ملف
  المجموع: ~201 HTTP request
  الوقت: ~40 ثانية (مع rate limit)

git clone --depth 1:
  1 عملية → clone كامل
  الوقت: ~3 ثوانٍ
  ✅ أسرع 13x
```

### التعامل مع الأخطاء:

```
  URL خاطئ          → 400 "Invalid GitHub URL"
  Repo غير موجود    → 404 "Repository not found"
  Repo خاص          → 403 "Private repository (token required)"
  Repo كبير جداً    → 413 "Repository too large (> 500MB)"
  Clone فشل        → 500 + error_message in DB
  Clone timeout     → 500 "Clone timed out (60s)"
```

---

## 📝 Phase 3 — محلل الكود (Parser)

### ملف: `server/githubRepos/parser.js`

```
الوظيفة: قراءة الملفات من clone محلي → مصفوفة ملفات مُصفّاة

المدخل:  localPath (مجلد الـ clone)
المخرج:  [{ path, content, language, size }, ...]
```

### تصفية الملفات (Filter Rules):

```javascript
// ═══ ملفات الكود المقبولة ═══
const CODE_EXTENSIONS = new Set([
  // JavaScript / TypeScript
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  // Python
  ".py",
  // PHP
  ".php",
  // Go
  ".go",
  // Rust
  ".rs",
  // Java / Kotlin
  ".java",
  ".kt",
  // C / C++
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  // Ruby
  ".rb",
  // Swift
  ".swift",
  // CSS / HTML (templates)
  ".css",
  ".scss",
  ".html",
  ".vue",
  ".svelte",
  // Shell
  ".sh",
  ".bash",
  // SQL
  ".sql",
]);

// ═══ ملفات Config/Docs مهمة جداً ═══
const IMPORTANT_FILES = new Set([
  "README.md",
  "readme.md",
  "README.rst",
  "package.json",
  "composer.json",
  "Cargo.toml",
  "requirements.txt",
  "pyproject.toml",
  "setup.py",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  ".env.example",
  "Makefile",
  "tsconfig.json",
  "vite.config.js",
  "vite.config.ts",
  "webpack.config.js",
  "next.config.js",
  "next.config.mjs",
  "nuxt.config.ts",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "API.md",
  "DOCS.md",
]);

// ═══ مجلدات يتم تجاهلها تماماً ═══
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "vendor",
  ".next",
  ".nuxt",
  "__pycache__",
  ".cache",
  "coverage",
  ".idea",
  ".vscode",
  "target",
  "bin",
  "obj",
  "public/assets",
  "static/assets",
  ".github/workflows", // يمكن تضمينها لاحقاً
]);

// ═══ حدود ═══
const MAX_FILE_SIZE = 100 * 1024; // 100 KB لكل ملف
const MAX_FILES = 500; // أقصى عدد ملفات
```

### منطق التحليل:

```
  المجلد المحلي (/tmp/repos/laravel_laravel)
       │
       ▼
  1. مشي الشجرة (recursive readdir)
       │
       ├── تجاهل مجلدات: node_modules, .git, vendor, dist, build
       │
       ▼
  2. لكل ملف:
       │
       ├── هل الاسم في IMPORTANT_FILES? → ✅ قبول
       ├── هل الامتداد في CODE_EXTENSIONS? → ✅ قبول
       ├── هل الحجم > MAX_FILE_SIZE? → ❌ تجاهل
       ├── هل الملف binary? → ❌ تجاهل (فحص أول 512 bytes)
       └── ❌ خلاف ذلك → تجاهل
       │
       ▼
  3. قراءة المحتوى + تحديد اللغة:
       │
       ├── .js → "javascript"
       ├── .py → "python"
       ├── .php → "php"
       ├── README.md → "markdown"
       ├── package.json → "json"
       │
       ▼
  4. بناء شجرة المشروع (project tree):
       │
       "laravel/laravel
        ├── app/
        │   ├── Http/
        │   │   ├── Controllers/
        │   │   │   └── Controller.php
        │   │   └── Middleware/
        │   │       └── Authenticate.php
        │   └── Models/
        │       └── User.php
        ├── routes/
        │   ├── web.php
        │   └── api.php
        ├── config/
        ├── composer.json
        └── README.md"
       │
       ▼
  5. return {
       files: [{ path, content, language, size }],
       tree: "شجرة المشروع كنص",
       stats: { totalFiles, totalSize, languages: {...} }
     }
```

### شجرة المشروع كقطعة خاصة:

```
شجرة المشروع (tree) تُخزّن كـ chunk خاص في Pinecone
مع metadata: { repo, type: "tree", title: "Project Structure" }

هذا يسمح للـ AI بالإجابة على:
  "ما هو هيكل مشروع laravel/laravel?"
  "ما هي المجلدات الرئيسية؟"
  "أين ملفات الـ routes?"
```

---

## ✂️ Phase 4 — التقسيم والفهرسة (Indexer)

### ملف: `server/githubRepos/indexer.js`

### استراتيجية التقسيم:

```
الكود ≠ نص عادي!

❌ خاطئ: تقسيم كود Python كل 1500 حرف عشوائياً
   → قد يقطع function في المنتصف
   → النتيجة غير مفهومة للـ AI

✅ صحيح: تقسيم ذكي يحافظ على الوحدات المنطقية
   → كل chunk = function/class/block كامل
   → AI يفهم السياق
```

### القواعد:

```
═══════════════════════════════════════════════════════
  استراتيجية 1: للملفات الصغيرة (< 3000 حرف)
═══════════════════════════════════════════════════════

  الملف كاملاً = chunk واحد
  (معظم ملفات الكود القصيرة)

═══════════════════════════════════════════════════════
  استراتيجية 2: للملفات المتوسطة والكبيرة
═══════════════════════════════════════════════════════

  RecursiveCharacterTextSplitter مع separators مخصصة للكود:

  JavaScript/TypeScript:
    ["\nexport ", "\nfunction ", "\nclass ", "\nconst ", "\n\n", "\n"]

  Python:
    ["\ndef ", "\nclass ", "\nasync def ", "\n\n", "\n"]

  PHP:
    ["\npublic function ", "\nprotected function ",
     "\nprivate function ", "\nclass ", "\n\n", "\n"]

  Default (أي لغة):
    ["\n\n", "\n", " "]

  الإعدادات:
    chunkSize: 2000 حرف (أكبر من DevDocs لأن الكود يحتاج سياق أكثر)
    chunkOverlap: 200 حرف

═══════════════════════════════════════════════════════
  استراتيجية 3: README.md و config files
═══════════════════════════════════════════════════════

  RecursiveCharacterTextSplitter العادي (مثل DevDocs):
    chunkSize: 1500
    chunkOverlap: 300
```

### Metadata لكل Chunk:

```javascript
{
  // ─── تعريف الـ Repo ───
  repo: "laravel/laravel",           // للفلترة
  owner: "laravel",

  // ─── تعريف الملف ───
  file: "app/Http/Controllers/UserController.php",
  filename: "UserController.php",
  language: "php",

  // ─── نوع المحتوى ───
  type: "code",                      // "code" | "config" | "docs" | "tree"

  // ─── مصدر ───
  source: "github_repo",
}
```

### رفع إلى Pinecone:

```
  Namespace: "github_repos"  (ثابت — مثل "dev_docs")

  Batching: 96 documents per request (مثل DevDocs)

  Embedding: llama-text-embed-v2 (نفس المشروع)

  المجموع لـ repo متوسط:
    200 ملف × ~3 chunks/ملف = ~600 vector
    + 1 tree chunk
    + 1 README chunk
    ≈ 602 vectors
```

---

## 🔍 Phase 5 — البحث (Search)

### ملف: `server/githubRepos/search.js`

### مطابق تماماً لنمط DevDocs:

````javascript
// الواجهة (Interface) — مثل searchDevDocs():
export async function searchGithubRepos(query, enabledRepos, topK = 5) {
  // enabledRepos = ["laravel/laravel", "facebook/react"]
  // 1. Pinecone similarity search
  //    namespace: "github_repos"
  //    filter: { repo: { $in: enabledRepos } }
  // 2. تنسيق النتائج:
  //    [REPO — FILE](github_url)
  //    ```language
  //    code content
  //    ```
  // 3. Timeout: 5 seconds (مثل DevDocs)
  // 4. Return: string context أو null
}
````

### تنسيق النتائج (للـ System Prompt):

````
## GitHub Repository Code Context

[laravel/laravel — app/Http/Middleware/Authenticate.php](https://github.com/laravel/laravel/blob/main/app/Http/Middleware/Authenticate.php)
```php
class Authenticate extends Middleware
{
    protected function redirectTo(Request $request): ?string
    {
        return $request->expectsJson() ? null : route('login');
    }
}
‎```

---

[laravel/laravel — routes/web.php](https://github.com/laravel/laravel/blob/main/routes/web.php)
```php
Route::get('/', function () {
    return view('welcome');
});
‎```
````

### اكتشاف Repos تلقائي:

```javascript
// مثل detectFrameworks() في DevDocs:
export function detectRepos(query) {
  // يبحث عن أسماء repos في السؤال
  // "كيف يعمل auth في laravel?"
  // → يبحث في الـ repos المثبتة عن اسم يحتوي "laravel"
}
```

---

## 🌐 Phase 6 — API Routes

### ملف: `server/githubRepos/routes.js`

### الـ Endpoints (مطابق لنمط DevDocs):

```
POST   /api/github-repos/add                    ← إضافة repo جديد
DELETE /api/github-repos/:id                     ← حذف repo
POST   /api/github-repos/:id/reindex            ← إعادة فهرسة
GET    /api/github-repos/status/:id              ← حالة الفهرسة
GET    /api/github-repos/list                    ← كل الـ repos (مع حالة)
GET    /api/github-repos/my-prefs                ← تفضيلات المستخدم
PUT    /api/github-repos/my-prefs                ← حفظ التفضيلات
```

### تفاصيل كل Endpoint:

```
═══════════════════════════════════════════════════════
  POST /api/github-repos/add
═══════════════════════════════════════════════════════

  Auth:     requireAuth (كل المستخدمين — أو requireAdmin فقط)
  Body:     { repoUrl: "https://github.com/owner/repo" }

  المنطق:
    1. parseGitHubUrl(repoUrl) → { owner, name }
    2. التحقق: هل مضاف سابقاً؟ → 409 "Already added"
    3. fetchRepoInfo(owner, name) → { description, language, stars }
    4. INSERT INTO github_repos (status: "cloning")
    5. رد فوري: { ok: true, id: ..., fullName: "owner/name" }
    6. runIndexing(repoId) في الخلفية

  Response: { ok: true, id: 5, fullName: "laravel/laravel" }

═══════════════════════════════════════════════════════
  DELETE /api/github-repos/:id
═══════════════════════════════════════════════════════

  Auth:     requireAuth + (admin أو صاحب الـ repo)

  المنطق:
    1. حذف vectors من Pinecone (filter: repo = full_name)
    2. DELETE FROM github_repos WHERE id = ?
    3. DELETE FROM github_repos_user_prefs WHERE repo_id = ?

  Response: { ok: true }

═══════════════════════════════════════════════════════
  POST /api/github-repos/:id/reindex
═══════════════════════════════════════════════════════

  Auth:     requireAuth + (admin أو صاحب الـ repo)

  المنطق:
    1. حذف vectors القديمة
    2. حرف clone + parse + index من جديد
    3. (مفيد لتحديث repo بعد commits جديدة)

  Response: { ok: true, message: "Started reindexing" }

═══════════════════════════════════════════════════════
  GET /api/github-repos/list
═══════════════════════════════════════════════════════

  Auth:     requireAuth

  يُرجع:   كل الـ repos المتاحة (public + user's own)
            مع حالة كل واحد + هل المستخدم فعّله أو لا

  Response: {
    repos: [
      {
        id: 1,
        fullName: "laravel/laravel",
        owner: "laravel",
        name: "laravel",
        description: "Laravel application",
        language: "PHP",
        stars: 78000,
        status: "ready",
        fileCount: 156,
        chunkCount: 520,
        addedBy: 1,
        isPublic: true,
        enabled: true,          ← تفضيل المستخدم
        indexedAt: "2026-03-07"
      },
      ...
    ]
  }

═══════════════════════════════════════════════════════
  GET /api/github-repos/my-prefs
═══════════════════════════════════════════════════════

  مثل DevDocs my-prefs بالضبط.
  يُرجع: { enabledRepos: ["laravel/laravel", "facebook/react"] }

═══════════════════════════════════════════════════════
  PUT /api/github-repos/my-prefs
═══════════════════════════════════════════════════════

  Body:     { enabledRepoIds: [1, 3, 5] }
  مثل DevDocs my-prefs بالضبط.
```

### التسجيل في السيرفر:

```javascript
// في server/index.js — بجانب devDocs:
import githubReposRouter from "./githubRepos/routes.js";
app.use("/api/github-repos", githubReposRouter);
```

---

## 🧠 Phase 7 — تكامل الـ Agent

### التعديلات على `server/agent.js`:

```
التغييرات المطلوبة (3 تعديلات فقط):
```

### 1. إضافة import جديد:

```javascript
// الموجود:
import { searchDevDocs, detectFrameworks } from "./devDocs/search.js";

// يُضاف:
import { searchGithubRepos } from "./githubRepos/search.js";
```

### 2. إضافة parameters جديدة لـ `runAgent()` و `streamAgent()`:

```javascript
// الموجود:
devDocsMode = false,
devDocsFrameworks = [],

// يُضاف:
githubReposMode = false,
githubRepos = [],          // ["laravel/laravel", "facebook/react"]
```

### 3. إضافة بحث GitHub في `Promise.all`:

```javascript
// الموجود:
const [{ history, summary }, context, webContext, devDocsContext] = await Promise.all([
  ...
  devDocsMode ? searchDevDocs(...) : null,
]);

// يصبح:
const [{ history, summary }, context, webContext, devDocsContext, githubContext] = await Promise.all([
  ...
  devDocsMode ? searchDevDocs(...) : null,
  githubReposMode && githubRepos.length > 0
    ? searchGithubRepos(finalMessage, githubRepos).catch(e => {
        console.warn("GitHub repos search failed:", e.message);
        return null;
      })
    : Promise.resolve(null),
]);
```

### 4. إضافة context في System Prompt:

```javascript
// في buildSystemPrompt() — يُضاف parameter جديد:
function buildSystemPrompt(promptId, context, summary, webContext, devDocsContext, githubContext) {
  ...
  if (githubContext) {
    full += `\n\n## GitHub Repository Code Context\nThe following code excerpts come from GitHub repositories. Use them to answer questions about the codebase accurately:\n\n${githubContext}`;
  }
  return full;
}
```

---

## 💻 Phase 8 — واجهة المستخدم (Client)

### 3 ملفات جديدة + تعديلات بسيطة:

### 1. `GitHubReposContext.jsx` (مثل DevDocsContext):

```
State:
  githubReposEnabled: boolean       ← مفتاح رئيسي (on/off)
  enabledRepos: string[]            ← repos مفعّلة: ["laravel/laravel"]
  showGitHubPanel: boolean          ← UI panel ظاهر/مخفي

Functions:
  toggleRepo(repoFullName)          ← تفعيل/تعطيل repo
  toggleGithubRepos()               ← المفتاح الرئيسي
  savePrefs()                       ← حفظ التفضيلات في API
  loadPrefs()                       ← تحميل من API عند mount
```

### 2. `GitHubReposPanel.jsx` (مثل DevDocsPanel):

```
┌──────────────────────────────────────────┐
│  🐙 GitHub Repos        [بحث مفعّل ✓]   │
├──────────────────────────────────────────┤
│                                           │
│  ┌─ إضافة Repo ─────────────────────┐   │
│  │ https://github.com/owner/repo     │   │
│  │                          [إضافة]  │   │
│  └───────────────────────────────────┘   │
│                                           │
│  📦 Repos المثبتة:                        │
│                                           │
│  ┌──────────────────────────────────┐    │
│  │ ⭐ laravel/laravel        [✅]   │    │
│  │    PHP · 156 ملف · 520 chunks    │    │
│  │    Laravel application skeleton  │    │
│  └──────────────────────────────────┘    │
│                                           │
│  ┌──────────────────────────────────┐    │
│  │ ⭐ facebook/react         [✅]   │    │
│  │    JavaScript · 312 ملف          │    │
│  │    The library for web UIs       │    │
│  └──────────────────────────────────┘    │
│                                           │
│  ┌──────────────────────────────────┐    │
│  │ ⏳ vercel/next.js     [جاري...]  │    │
│  │    ████████░░  80%  indexing      │    │
│  └──────────────────────────────────┘    │
│                                           │
│                              [حفظ]       │
└──────────────────────────────────────────┘
```

### 3. `GitHubRepos.jsx` (صفحة الإدارة):

```
┌──────────────────────────────────────────────────────────┐
│              🐙 GitHub Repository Knowledge                │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  إحصائيات:                                                │
│  ┌─────────┬─────────┬──────────┬──────────┐             │
│  │ 5 repos │ 3 ready │ 2,340    │ 782 files│             │
│  │         │         │ vectors  │          │             │
│  └─────────┴─────────┴──────────┴──────────┘             │
│                                                           │
│  إضافة Repository:                                        │
│  ┌──────────────────────────────────────────────┐        │
│  │ https://github.com/                           │        │
│  │                                    [إضافة]   │        │
│  └──────────────────────────────────────────────┘        │
│                                                           │
│  ┌──────────────────────────────────────────────┐        │
│  │  laravel/laravel                    [حذف]    │        │
│  │  ⭐ 78K · PHP · 156 ملف · 520 chunks         │        │
│  │  ✅ جاهز · فُهرس في 2026-03-05              │        │
│  │                         [إعادة فهرسة]        │        │
│  ├──────────────────────────────────────────────┤        │
│  │  facebook/react                     [حذف]    │        │
│  │  ⭐ 220K · JavaScript · 312 ملف              │        │
│  │  ✅ جاهز                                     │        │
│  ├──────────────────────────────────────────────┤        │
│  │  vercel/next.js                              │        │
│  │  ⏳ جاري الفهرسة...  80%  (indexing)         │        │
│  │  ████████████████░░░░  420/520 chunks        │        │
│  └──────────────────────────────────────────────┘        │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### 4. تعديلات على الملفات الموجودة:

```
Sidebar.jsx:
  + زر "🐙 GitHub Repos" (مثل "📚 Docs Helper")
  + يفتح GitHubReposPanel
  + يعرض عداد + نقطة خضراء

Chat.jsx:
  + const { githubReposEnabled, enabledRepos } = useGithubRepos()
  + formData.append("githubReposMode", githubReposEnabled)
  + formData.append("githubRepos", JSON.stringify(enabledRepos))

AppLayout.jsx:
  + <GitHubReposProvider> wrapper

App.jsx:
  + <Route path="/github-repos" element={<GitHubRepos />} />
```

---

## 🔒 Phase 9 — الأمان والحدود

### Rate Limits & Quotas:

```
┌────────────────────────────────────────────┐
│  حدود لكل مستخدم:                          │
│                                             │
│  • أقصى عدد repos: 10 لكل مستخدم           │
│  • أقصى حجم repo: 500 MB                   │
│  • أقصى عدد ملفات: 500 ملف/repo            │
│  • أقصى حجم ملف: 100 KB                    │
│  • Cloning timeout: 60 seconds              │
│  • Indexing timeout: 5 minutes              │
│                                             │
│  حدود النظام:                               │
│                                             │
│  • أقصى repos كلي: 50 (Pinecone free tier)  │
│  • أقصى vectors: ~30,000 (600/repo × 50)   │
│                                             │
└────────────────────────────────────────────┘
```

### أمان URL:

```javascript
// فقط GitHub URLs مسموحة
function parseGitHubUrl(url) {
  const pattern =
    /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/;
  const match = url.match(pattern);
  if (!match) throw new Error("Invalid GitHub URL");
  return { owner: match[1], name: match[2] };
}
// ❌ يمنع: file://, localhost, internal IPs (SSRF protection)
```

### تنظيف الملفات المؤقتة:

```
بعد كل عملية فهرسة (نجاح أو فشل):
  → rm -rf /tmp/repos/{owner}_{name}

عند بدء السيرفر:
  → تنظيف /tmp/repos/ بالكامل (في حالة crash سابق)
```

### Private Repos (مستقبلاً):

```
  المستخدم يضيف GitHub Personal Access Token:
    PUT /api/user-settings
    body: { github_token: "ghp_..." }

  يُخزّن مشفّر في user_settings (مثل groq_api_key)

  git clone يستخدم:
    git clone https://{token}@github.com/owner/repo.git
```

---

## 📝 ملاحظات على الخطة الأصلية

### مراجعة ما اقترحته وما تم تعديله:

| #   | اقتراحك الأصلي                    | التعديل/التحسين                             | السبب                                                 |
| --- | --------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| 1   | GitHub API `/contents`            | **`git clone --depth 1`**                   | أسرع 10-50x، لا rate limit                            |
| 2   | Phase مرقمة 1-14                  | **9 مراحل منطقية**                          | تسلسل واضح كل مرحلة تبنى على السابقة                  |
| 3   | Basic text chunking               | **Code-aware chunking**                     | الكود يحتاج تقسيم ذكي يحافظ على functions             |
| 4   | namespace: `github_repos` واحد    | **نفس الفكرة ✅** + metadata filter         | الأفضل لـ Pinecone free tier                          |
| 5   | `/repo add URL` commands          | **POST /api/github-repos/add** + UI         | النظام web app وليس CLI                               |
| 6   | Repo Packs (React, Next.js)       | **مُؤجل لـ Phase 2**                        | يخلط بين repo code و documentation (DevDocs يغطي هذا) |
| 7   | `text-embedding-3-large`          | **`llama-text-embed-v2`**                   | نفس model المستخدم (مجاني، Pinecone native)           |
| 8   | Bug detection, API extraction     | **مُؤجل — smart features**                  | Phase 1 يركز على RAG الأساسي                          |
| 9   | لم يُذكر: file filtering          | **مفصّل بالكامل**                           | ضروري — بدونه سيفهرس node_modules                     |
| 10  | لم يُذكر: binary detection        | **مفصّل**                                   | ملفات صور/fonts يجب تجاهلها                           |
| 11  | لم يُذكر: project tree            | **chunk خاص لشجرة المشروع**                 | يسمح بسؤال "ما هيكل المشروع؟"                         |
| 12  | لم يُذكر: cleanup                 | **تنظيف /tmp بعد الفهرسة**                  | بدونه السيرفر يمتلئ                                   |
| 13  | Security: "requires GitHub token" | **مفصّل: SSRF protection + URL validation** | أمان حقيقي                                            |
| 14  | لم يُذكر: rate limits             | **حدود لكل مستخدم**                         | حماية Pinecone free tier                              |

---

## 📅 خطة التنفيذ المرحلية

### المرحلة الأولى (الأساس — MVP):

```
  ┌─────────────────────────────────────────────────────┐
  │  ✅ يمكن إضافة public repo بـ URL                    │
  │  ✅ git clone + parse + index في الخلفية             │
  │  ✅ بحث RAG أثناء المحادثة                           │
  │  ✅ تفعيل/تعطيل repos من الـ sidebar                 │
  │  ✅ زر الأدمن لإضافة/حذف repos                      │
  │  ✅ حالة الفهرسة مباشرة (polling)                    │
  └─────────────────────────────────────────────────────┘
```

### الملفات المطلوبة (بالترتيب):

```
═══ Server (6 ملفات جديدة + 3 تعديلات) ═══

  🆕 server/githubRepos/config.js       ← إعدادات + حدود
  🆕 server/githubRepos/fetcher.js      ← git clone + GitHub API
  🆕 server/githubRepos/parser.js       ← قراءة ملفات + تصفية + tree
  🆕 server/githubRepos/indexer.js      ← chunks + embeddings + Pinecone
  🆕 server/githubRepos/search.js       ← similarity search + تنسيق
  🆕 server/githubRepos/routes.js       ← 7 API endpoints

  ✏️  server/db.js                      ← إضافة جدولين (github_repos, prefs)
  ✏️  server/agent.js                   ← إضافة githubContext في buildSystemPrompt
  ✏️  server/index.js                   ← mount router

═══ Client (3 ملفات جديدة + 4 تعديلات) ═══

  🆕 client/src/contexts/GitHubReposContext.jsx
  🆕 client/src/components/GitHubReposPanel.jsx
  🆕 client/src/pages/GitHubRepos.jsx

  ✏️  client/src/layouts/AppLayout.jsx   ← GitHubReposProvider
  ✏️  client/src/components/Sidebar.jsx  ← زر GitHub Repos
  ✏️  client/src/pages/Chat.jsx          ← githubReposMode في FormData
  ✏️  client/src/App.jsx                 ← route /github-repos
```

### ترتيب التنفيذ:

```
  الخطوة 1: DB tables (db.js)
       ↓
  الخطوة 2: config.js (إعدادات)
       ↓
  الخطوة 3: fetcher.js (git clone)
       ↓
  الخطوة 4: parser.js (قراءة ملفات)
       ↓
  الخطوة 5: indexer.js (Pinecone)
       ↓
  الخطوة 6: search.js (بحث)
       ↓
  الخطوة 7: routes.js (API)
       ↓
  الخطوة 8: server/index.js (mount)
       ↓
  الخطوة 9: agent.js (integration)
       ↓
  الخطوة 10: GitHubReposContext.jsx
       ↓
  الخطوة 11: GitHubReposPanel.jsx
       ↓
  الخطوة 12: GitHubRepos.jsx (admin page)
       ↓
  الخطوة 13: Sidebar + Chat + AppLayout + App
       ↓
  الخطوة 14: اختبار كامل ✓
```

---

### المرحلة الثانية (تحسينات — مستقبلية):

```
  🔮 دعم Private Repos (GitHub token)
  🔮 Repo Packs جاهزة (مشاريع مشهورة)
  🔮 Auto-detect language/framework
  🔮 Smart code explanation
  🔮 Webhook لتحديث تلقائي عند push
  🔮 Branch selection (ليس main فقط)
  🔮 Monorepo support (فهرسة مجلد محدد)
  🔮 Code search by function name
```

---

### Dependencies الجديدة المطلوبة:

```
لا تبعيات جديدة! ✅

  • git → يجب أن يكون مثبت على السيرفر (عادةً موجود)
  • Pinecone → نفس الـ index والـ API key
  • LangChain → نفس المكتبات الموجودة
  • child_process → مبني في Node.js (لتشغيل git clone)
  • fs/promises → مبني في Node.js (لقراءة الملفات)
  • path, os → مبنيان في Node.js
```

---

<div align="center">

```
╔═══════════════════════════════════════════════════════════╗
║              GITHUB KNOWLEDGE SYSTEM                      ║
║                    خلاصة بالأرقام                         ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  📁 ملفات جديدة:                6 server + 3 client       ║
║  ✏️  ملفات تعديل:                3 server + 4 client       ║
║  🗄  جداول جديدة:                2 جداول                   ║
║  🌐 API Endpoints:              7 endpoints               ║
║  🧩 React Components:           2 (Panel + Page)          ║
║  🔐 React Contexts:             1 (GitHubReposContext)    ║
║  📦 تبعيات جديدة:               0 (صفر!)                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

</div>

</div>
