# 📊 Data Preprocessing — GitHub Repos RAG System

> **System:** GitHub Repository RAG (Retrieval-Augmented Generation)  
> **Project:** Agentic Personal Assistant  
> **Date:** March 2026

---

## 1. نظرة عامة (Overview)

خط المعالجة المسبقة لـ GitHub Repos RAG هو الأكثر تعقيداً بين أنظمة RAG الثلاثة، ويتكون من 3 مراحل:

```
استنساخ المستودع (Cloning) → تحليل الملفات (Parsing) → تقطيع وفهرسة (Indexing)
```

---

## 2. المرحلة الأولى: استنساخ المستودع (Cloning)

### 2.1 الملف: `server/githubRepos/fetcher.js`

### 2.2 تحليل رابط GitHub

```javascript
export function parseGitHubUrl(input) {
  // يدعم 3 تنسيقات:

  // Format 1: "owner/name"
  const simpleMatch = input.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);

  // Format 2: "https://github.com/owner/name"
  const httpsMatch = input.match(
    /github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/,
  );

  // Format 3: "git@github.com:owner/name.git"
  const sshMatch = input.match(
    /git@github\.com:([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/,
  );

  // Returns: { owner, name } or null
}
```

### 2.3 جلب معلومات المستودع

```javascript
export async function fetchRepoInfo(owner, name) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${name}`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        // Optional: Authorization header if GITHUB_TOKEN exists
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        }),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    language: data.language,
    stars: data.stargazers_count,
    defaultBranch: data.default_branch,
  };
}
```

### 2.4 استنساخ المستودع

```javascript
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

export async function cloneRepo(owner, name, branch = "main") {
  const cloneDir = path.join(os.tmpdir(), `github_clone_${Date.now()}`);
  const repoUrl = `https://github.com/${owner}/${name}.git`;

  const CLONE_TIMEOUT = 120000; // 120 seconds

  await execAsync(
    `git clone --depth 1 --branch ${branch} ${repoUrl} ${cloneDir}`,
    { timeout: CLONE_TIMEOUT },
  );

  return cloneDir;
}
```

| المعامل      | القيمة        | السبب                               |
| ------------ | ------------- | ----------------------------------- |
| `--depth 1`  | Shallow clone | يجلب آخر commit فقط — أسرع وأصغر    |
| `--branch`   | Branch اسم    | يستنسخ الفرع المحدد (default: main) |
| **Timeout**  | 120 ثانية     | حد زمني للمستودعات الكبيرة          |
| **Location** | `os.tmpdir()` | تخزين مؤقت — يُحذف بعد الفهرسة      |

### 2.5 تنظيف بعد الفهرسة

```javascript
export async function cleanupClone(cloneDir) {
  await fs.rm(cloneDir, { recursive: true, force: true });
}
```

---

## 3. المرحلة الثانية: تحليل الملفات (Parsing)

### 3.1 الملف: `server/githubRepos/parser.js`

### 3.2 الدالة الرئيسية

```javascript
export async function parseRepoFiles(cloneDir, repoFullName, onProgress) {
  const files = [];
  const stats = { code: 0, docs: 0, config: 0, skipped: 0 };

  // 1. المشي في الشجرة
  await walkDirectory(cloneDir, cloneDir, files, stats, onProgress);

  // 2. ترتيب بالأولوية
  files.sort((a, b) => getPriority(a.type) - getPriority(b.type));

  // 3. حد الملفات
  const limitedFiles = files.slice(0, MAX_FILES_PER_REPO); // 500

  // 4. توليد شجرة المشروع
  const tree = generateProjectTree(cloneDir, 5); // maxDepth=5

  return { files: limitedFiles, tree, stats };
}
```

### 3.3 المشي في المجلدات (Walk Directory)

```javascript
async function walkDirectory(dir, rootDir, files, stats, onProgress) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    // تجاهل المجلدات المحظورة
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        stats.skipped++;
        continue;
      }
      await walkDirectory(fullPath, rootDir, files, stats, onProgress);
      continue;
    }

    // فحص الملف
    if (!entry.isFile()) continue;

    // تجاهل الملفات الكبيرة
    const stat = await fs.stat(fullPath);
    if (stat.size > MAX_FILE_SIZE) {
      // 100KB
      stats.skipped++;
      continue;
    }

    // تحديد النوع
    const fileType = getFileType(entry.name);
    if (!fileType) {
      stats.skipped++;
      continue;
    }

    // كشف الملفات الثنائية
    if (await isBinary(fullPath)) {
      stats.skipped++;
      continue;
    }

    // قراءة المحتوى
    const content = await fs.readFile(fullPath, "utf-8");

    files.push({
      path: relativePath,
      content,
      type: fileType, // "code" | "docs" | "config"
      language: getLanguage(entry.name), // "javascript", "python", ...
      size: stat.size,
    });

    stats[fileType]++;
    onProgress?.({ phase: "parsing", current: files.length });
  }
}
```

### 3.4 تصنيف الملفات

```javascript
function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const base = path.basename(filename);

  // ملفات مهمة — دائماً تُقبل
  if (IMPORTANT_FILES.has(base)) return "docs";

  if (CODE_EXTENSIONS.has(ext)) return "code";
  if (DOCS_EXTENSIONS.has(ext)) return "docs";
  if (CONFIG_EXTENSIONS.has(ext)) return "config";

  return null; // غير مدعوم — يُتجاهل
}
```

### 3.5 خريطة اللغات (50+ امتداد)

```javascript
const EXT_LANGUAGE_MAP = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".java": "java",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".hpp": "cpp",
  ".cs": "csharp",
  ".go": "go",
  ".rs": "rust",
  ".rb": "ruby",
  ".php": "php",
  ".swift": "swift",
  ".kt": "kotlin",
  ".scala": "scala",
  ".r": "r",
  ".lua": "lua",
  ".sh": "shell",
  ".bash": "shell",
  ".ps1": "powershell",
  ".sql": "sql",
  ".dart": "dart",
  ".ex": "elixir",
  ".exs": "elixir",
  ".clj": "clojure",
  ".hs": "haskell",
  ".erl": "erlang",
  ".elm": "elm",
  // ... والمزيد
};
```

### 3.6 كشف الملفات الثنائية (Binary Detection)

```javascript
async function isBinary(filePath) {
  const buffer = Buffer.alloc(512);
  const fd = await fs.open(filePath, "r");

  try {
    const { bytesRead } = await fd.read(buffer, 0, 512, 0);

    // البحث عن null bytes
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) return true;
    }

    return false;
  } finally {
    await fd.close();
  }
}
```

- يقرأ أول 512 byte
- إذا وجد `0x00` (null byte) → الملف binary → يُتجاهل

### 3.7 شجرة المشروع (Project Tree)

```javascript
function generateProjectTree(dirPath, maxDepth = 5) {
  let tree = "";

  function walk(dir, prefix, depth) {
    if (depth > maxDepth) return;

    const entries = readdirSync(dir, { withFileTypes: true })
      .filter((e) => !IGNORED_DIRS.has(e.name))
      .sort((a, b) => {
        // المجلدات أولاً
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

    for (let i = 0; i < entries.length; i++) {
      const isLast = i === entries.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const childPrefix = isLast ? "    " : "│   ";

      tree += `${prefix}${connector}${entries[i].name}\n`;

      if (entries[i].isDirectory()) {
        walk(path.join(dir, entries[i].name), prefix + childPrefix, depth + 1);
      }
    }
  }

  walk(dirPath, "", 0);
  return tree;
}
```

**مثال خرج:**

```
├── src/
│   ├── components/
│   │   ├── App.jsx
│   │   └── Header.jsx
│   ├── utils/
│   │   └── helpers.js
│   └── index.js
├── package.json
├── README.md
└── Dockerfile
```

### 3.8 ترتيب الأولويات

```javascript
function getPriority(type) {
  switch (type) {
    case "docs":
      return 1; // README + docs أولاً
    case "config":
      return 2; // إعدادات ثانياً
    case "code":
      return 3; // كود ثالثاً
    default:
      return 4;
  }
}
```

إذا تجاوز عدد الملفات 500، يتم الاحتفاظ بالأهم:

```
docs (README, *.md) → config (package.json, Dockerfile) → code → باقي
```

---

## 4. المرحلة الثالثة: التقطيع والفهرسة (Indexing)

### 4.1 الملف: `server/githubRepos/indexer.js`

### 4.2 معاملات التقطيع (حسب نوع الملف)

| نوع الملف  | Chunk Size | Chunk Overlap | السبب                       |
| ---------- | ---------- | ------------- | --------------------------- |
| **Code**   | 3000 حرف   | 500 حرف       | كبير — يحافظ على دوال كاملة |
| **Docs**   | 2000 حرف   | 400 حرف       | متوسط — فقرات كاملة         |
| **Config** | 1500 حرف   | 200 حرف       | صغير — إعدادات مختصرة       |

> **مقارنة:** Document RAG يستخدم 1000/200، DevDocs يستخدم 1500/300

### 4.3 التقطيع الذكي حسب اللغة (Language-Aware Splitting)

```javascript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

function getSplitter(fileType, language) {
  const config = {
    code: { chunkSize: CODE_CHUNK_SIZE, chunkOverlap: 500 }, // 3000/500
    docs: { chunkSize: DOCS_CHUNK_SIZE, chunkOverlap: 400 }, // 2000/400
    config: { chunkSize: CONFIG_CHUNK_SIZE, chunkOverlap: 200 }, // 1500/200
  }[fileType];

  // إذا كان كود واللغة لها فواصل مخصصة
  if (fileType === "code" && language && CODE_SEPARATORS[language]) {
    return new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
      separators: CODE_SEPARATORS[language],
    });
  }

  return new RecursiveCharacterTextSplitter({
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
  });
}
```

### 4.4 فواصل مخصصة لـ 16 لغة

```javascript
const CODE_SEPARATORS = {
  javascript: [
    "\nfunction ", // دوال
    "\nconst ", // ثوابت
    "\nlet ", // متغيرات
    "\nvar ", // متغيرات قديمة
    "\nclass ", // أصناف
    "\nexport ", // تصديرات
    "\nimport ", // استيرادات
    "\nif ", // شروط
    "\nfor ", // حلقات
    "\nwhile ",
    "\nswitch ",
    "\n\n", // فقرات
    "\n", // أسطر
    " ", // كلمات
    "", // أحرف
  ],
  python: [
    "\nclass ", // أصناف
    "\ndef ", // دوال
    "\n\ndef ", // دوال بفاصل
    "\n\nclass ", // أصناف بفاصل
    "\nif ", // شروط
    "\nfor ", // حلقات
    "\nwhile ",
    "\ntry:",
    "\nexcept:",
    "\nwith ",
    "\n\n",
    "\n",
    " ",
    "",
  ],
  // ... 14 لغة أخرى
};
```

**المبدأ:** يحاول التقسيم على حدود الدوال/الأصناف أولاً — يحافظ على وحدات كود كاملة ومعنوية.

### 4.5 إضافة Header لكل Chunk

```javascript
export async function indexRepoFiles(parsed, repoFullName, userId, onProgress) {
  const chunks = [];

  for (const file of parsed.files) {
    const splitter = getSplitter(file.type, file.language);
    const splits = await splitter.splitText(file.content);

    for (let i = 0; i < splits.length; i++) {
      // إضافة header وصفي لكل chunk
      const header = [
        `Repository: ${repoFullName}`,
        `File: ${file.path}`,
        file.language ? `Language: ${file.language}` : null,
        `Type: ${file.type}`,
        `Chunk: ${i + 1}/${splits.length}`,
      ]
        .filter(Boolean)
        .join(" | ");

      chunks.push({
        pageContent: `${header}\n\n${splits[i]}`,
        metadata: {
          repo: repoFullName, // "owner/name"
          userId: String(userId), // عزل المستخدم
          file: file.path, // مسار الملف
          language: file.language || "unknown",
          type: file.type, // "code" | "docs" | "config"
          chunkIndex: i, // ترتيب Chunk
          totalChunks: splits.length,
          source: "github_repos",
        },
      });
    }
  }

  // إضافة شجرة المشروع كـ document خاص
  if (parsed.tree) {
    chunks.push({
      pageContent: `Project Structure for ${repoFullName}:\n\n${parsed.tree}`,
      metadata: {
        repo: repoFullName,
        userId: String(userId),
        file: "__PROJECT_TREE__",
        type: "tree",
        source: "github_repos",
      },
    });
  }

  // تخزين في Pinecone
  const store = await getGitHubVectorStore();
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

### 4.6 بنية الـ Header

كل chunk يبدأ بسطر وصفي:

```
Repository: facebook/react | File: src/hooks/useState.js | Language: javascript | Type: code | Chunk: 2/5

export function useState(initialState) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}
...
```

**الفائدة:** يمنح نموذج الـ embedding سياقاً إضافياً — يعرف أن Chunk ينتمي لملف معين في مستودع معين بلغة معينة.

### 4.7 بنية Metadata

| Field         | Type   | مثال               | الغرض              |
| ------------- | ------ | ------------------ | ------------------ |
| `repo`        | string | `"facebook/react"` | فلترة بالمستودع    |
| `userId`      | string | `"1"`              | عزل المستخدم       |
| `file`        | string | `"src/App.jsx"`    | الملف المصدر       |
| `language`    | string | `"javascript"`     | لغة الملف          |
| `type`        | string | `"code"`           | نوع الملف          |
| `chunkIndex`  | number | `0`                | ترتيب القطعة       |
| `totalChunks` | number | `5`                | إجمالي القطع للملف |
| `source`      | string | `"github_repos"`   | تمييز النظام       |

### 4.8 شجرة المشروع كـ Document خاص

```javascript
// يُخزن كـ document منفصل بـ metadata خاص
{
  pageContent: "Project Structure for facebook/react:\n\n├── src/\n│   ├── ...",
  metadata: {
    repo: "facebook/react",
    userId: "1",
    file: "__PROJECT_TREE__",   // ← marker خاص
    type: "tree",
    source: "github_repos",
  }
}
```

---

## 5. Namespace والتخزين

```javascript
const GITHUB_REPOS_NAMESPACE = "github_repos";

async function getGitHubVectorStore() {
  return getVectorStore(GITHUB_REPOS_NAMESPACE);
}
```

```
Pinecone Index
├── user_1/          → Document RAG
├── dev_docs/        → DevDocs RAG
├── github_repos/    → GitHub RAG (ALL users, ALL repos) ← هذا الـ namespace
│   ├── facebook/react vectors (userId: "1")
│   ├── vercel/next.js vectors (userId: "1")
│   ├── django/django vectors (userId: "2")
│   └── ...
```

**فرق مهم:** العزل بين المستخدمين يتم عبر **metadata filter** (`userId`) وليس عبر namespaces (مثل Document RAG).

---

## 6. حذف بيانات مستودع

```javascript
export async function deleteRepoVectors(repoFullName, userId) {
  const pc = new PineconeClient({ apiKey });
  const index = pc.Index(indexName).namespace(GITHUB_REPOS_NAMESPACE);

  await index.deleteMany({
    repo: { $eq: repoFullName },
    userId: { $eq: String(userId) },
  });

  storeCache.delete(GITHUB_REPOS_NAMESPACE);
}
```

يحذف بفلتر مزدوج: `repo` + `userId` — يضمن حذف بيانات المستخدم فقط.

---

## 7. عملية الـ Ingestion الكاملة

```javascript
// routes.js — Background ingestion
async function runRepoIngestion(repoId, owner, name, userId) {
  try {
    // Phase 1: Clone
    updateStatus(repoId, "cloning");
    const cloneDir = await cloneRepo(owner, name, branch);

    // Phase 2: Parse
    updateStatus(repoId, "parsing");
    const parsed = await parseRepoFiles(cloneDir, fullName, (p) => {
      // progress callback
    });

    // Phase 3: Index
    updateStatus(repoId, "indexing");
    const chunkCount = await indexRepoFiles(parsed, fullName, userId, (p) => {
      // progress callback
    });

    // Phase 4: Cleanup
    await cleanupClone(cloneDir);

    // Update DB
    db.prepare(
      `UPDATE github_repos
       SET status = 'ready', file_count = ?, chunk_count = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(parsed.files.length, chunkCount, repoId);
  } catch (error) {
    db.prepare(
      `UPDATE github_repos SET status = 'error', error_message = ? WHERE id = ?`,
    ).run(error.message, repoId);
  }
}
```

---

## 8. ملخص خط المعالجة الكامل

```
┌────────────────────────────────────────────────────────────────────┐
│              GitHub Repos RAG Preprocessing Pipeline                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase 1: CLONING                                                  │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ GitHub Fetcher                                             │    │
│  │ • parseGitHubUrl() — supports 3 URL formats               │    │
│  │ • fetchRepoInfo() — GitHub API (owner, name, stars, ...)  │    │
│  │ • cloneRepo() — git clone --depth 1                       │    │
│  │ • CLONE_TIMEOUT: 120s                                     │    │
│  │ • Location: os.tmpdir() (temporary)                       │    │
│  │ Output: cloneDir path                                     │    │
│  └────────────────────────────────────────────────────────────┘    │
│                           ↓                                         │
│  Phase 2: PARSING                                                  │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ File Parser                                                │    │
│  │ • walkDirectory() — recursive file walk                   │    │
│  │ • IGNORED_DIRS: 13 dirs (node_modules, .git, ...)        │    │
│  │ • MAX_FILE_SIZE: 100KB filter                             │    │
│  │ • isBinary() — null byte detection (512 bytes)           │    │
│  │ • getFileType() → code | docs | config                   │    │
│  │ • getLanguage() → 50+ extension mapping                  │    │
│  │ • Priority: docs → config → code                         │    │
│  │ • MAX_FILES_PER_REPO: 500                                │    │
│  │ • generateProjectTree(maxDepth=5)                        │    │
│  │ Output: { files[], tree, stats }                         │    │
│  └────────────────────────────────────────────────────────────┘    │
│                           ↓                                         │
│  Phase 3: INDEXING                                                 │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Language-Aware Indexer                                      │    │
│  │ • Code:   chunkSize=3000, overlap=500, 16 lang separators │    │
│  │ • Docs:   chunkSize=2000, overlap=400                     │    │
│  │ • Config: chunkSize=1500, overlap=200                     │    │
│  │ • Header prepended: repo | file | language | type | chunk │    │
│  │ • Metadata: repo, userId, file, language, type, chunkIndex│    │
│  │ • Project tree → special Document (__PROJECT_TREE__)      │    │
│  │ • Embedding: PineconeEmbeddings (llama-text-embed-v2)     │    │
│  │ • Storage: Pinecone namespace="github_repos"              │    │
│  │ • Batch size: 96 chunks per batch                         │    │
│  │ Output: chunk_count stored in DB                          │    │
│  └────────────────────────────────────────────────────────────┘    │
│                           ↓                                         │
│  CLEANUP: cleanupClone(cloneDir) — rm -rf temp directory          │
│  RESULT: DB → status='ready', file_count, chunk_count              │
│  ON ERROR: DB → status='error', error_message                      │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 9. مقارنة أنظمة RAG الثلاثة

| المعامل            | Document RAG          | DevDocs RAG    | GitHub RAG               |
| ------------------ | --------------------- | -------------- | ------------------------ |
| **مصدر البيانات**  | ملفات مرفوعة          | مواقع ويب      | مستودعات Git             |
| **أنواع الملفات**  | PDF,DOCX,PPTX,TXT,CSV | HTML→Markdown  | 50+ lang + docs + config |
| **Chunk Size**     | 1000                  | 1500           | 3000/2000/1500           |
| **Chunk Overlap**  | 200                   | 300            | 500/400/200              |
| **Language-Aware** | ❌                    | ❌             | ✅ (16 languages)        |
| **File Priority**  | N/A                   | N/A            | docs→config→code         |
| **Project Tree**   | ❌                    | ❌             | ✅                       |
| **Chunk Header**   | ❌                    | ❌             | ✅                       |
| **Namespace**      | `user_{id}`           | `dev_docs`     | `github_repos`           |
| **User Isolation** | namespace             | ❌ (shared)    | metadata filter          |
| **Metadata**       | docId, userId         | framework, url | repo, file, language     |
