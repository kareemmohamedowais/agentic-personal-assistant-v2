# 🤖 Baseline Model — GitHub Repos RAG System

> **System:** GitHub Repository RAG (Retrieval-Augmented Generation)  
> **Project:** Agentic Personal Assistant  
> **Date:** March 2026

---

## 1. نظرة عامة (Overview)

الـ Baseline Model لـ GitHub Repos RAG هو الأكثر تقدماً بين أنظمة RAG الثلاثة، ويتميز بـ:

1. **Embedding Model** — نفس النموذج (مشترك مع الأنظمة الأخرى)
2. **Vector Store** — فلترة مزدوجة (repo + userId)
3. **Advanced Search** — تجميع بالملف + شجرة مشروع + score threshold
4. **Language-Aware Processing** — 16 لغة مع فواصل مخصصة
5. **Rich Context** — headers وصفية + project tree

---

## 2. نموذج الـ Embedding

### 2.1 المواصفات

| المعامل        | القيمة                        |
| -------------- | ----------------------------- |
| **Model**      | `llama-text-embed-v2`         |
| **Provider**   | Pinecone (Embedded Inference) |
| **Dimensions** | 1024                          |
| **Metric**     | Cosine Similarity             |

```javascript
const embeddings = new PineconeEmbeddings({ model: "llama-text-embed-v2" });
```

> **ملاحظة:** نفس النموذج المستخدم في Document RAG و DevDocs RAG — يضمن consistency في quality الـ embeddings عبر كل أنظمة RAG.

---

## 3. Vector Store

### 3.1 Namespace Strategy

```
Pinecone Index
├── user_1/          → Document RAG
├── user_2/          → Document RAG
├── dev_docs/        → DevDocs RAG
├── github_repos/    → GitHub RAG (ALL users) ← هذا الـ namespace
└── ...
```

### 3.2 عزل البيانات (Data Isolation)

| الخاصية              | Document RAG        | DevDocs RAG             | GitHub RAG                    |
| -------------------- | ------------------- | ----------------------- | ----------------------------- |
| **Namespace**        | `user_{id}`         | `dev_docs`              | `github_repos`                |
| **User isolation**   | By namespace        | None (shared)           | By metadata (`userId`)        |
| **Entity isolation** | By `docId` metadata | By `framework` metadata | By `repo` + `userId` metadata |

GitHub RAG يستخدم **فلتر مزدوج** لأن:

- namespace واحد مشترك بين كل المستخدمين
- `userId` يعزل بيانات كل مستخدم
- `repo` يعزل بيانات كل مستودع

---

## 4. محرك البحث (Search Engine)

### 4.1 البحث الدلالي

```javascript
export async function searchGithubRepos(
  query,
  enabledRepos,
  userId,
  topK = 10,
) {
  const TIMEOUT_MS = 8000;

  const store = await getGitHubVectorStore();

  // فلتر مزدوج: مستودعات + مستخدم
  const filter = {
    repo: { $in: enabledRepos },
    userId: { $eq: String(userId) },
  };

  // بحث مع timeout
  const results = await Promise.race([
    store.similaritySearchWithScore(query, topK * 2, filter),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Search timeout")), TIMEOUT_MS),
    ),
  ]);

  if (!results || results.length === 0) return null;

  // فلترة بالنقاط
  const filtered = results.filter(
    ([_, score]) => score >= SEARCH_SCORE_THRESHOLD, // 0.25
  );

  // أخذ topK فقط
  const topResults = filtered.slice(0, topK);

  // تجميع بالملف وترتيب
  const grouped = groupByFile(topResults);

  // جلب شجرة المشروع
  const tree = await getProjectTree(enabledRepos, userId);

  // تنسيق النتائج
  return formatResults(grouped, tree);
}
```

### 4.2 معاملات البحث

| المعامل             | القيمة                         | المقارنة                              |
| ------------------- | ------------------------------ | ------------------------------------- |
| **Top K**           | 10 (fetches 20, filters to 10) | DocRAG: 10, DevDocs: 5                |
| **Timeout**         | 8000ms                         | DocRAG: 4000ms, DevDocs: 5000ms       |
| **Score Threshold** | 0.25                           | DocRAG: ❌, DevDocs: ❌               |
| **Filter**          | `repo + userId`                | DocRAG: namespace, DevDocs: framework |
| **Namespace**       | `github_repos`                 | -                                     |

### 4.3 لماذا يجلب 20 نتيجة ويفلتر إلى 10؟

```javascript
// يجلب topK * 2 = 20 نتيجة
const results = await store.similaritySearchWithScore(query, topK * 2, filter);

// يفلتر بالنقاط (score >= 0.25)
const filtered = results.filter(([_, score]) => score >= 0.25);

// يأخذ أفضل 10
const topResults = filtered.slice(0, topK);
```

- يجلب ضعف العدد المطلوب
- يحذف النتائج ذات النقاط الضعيفة (< 0.25)
- يضمن أن كل نتيجة **ذات صلة فعلية** — لا يُرجع نتائج ضعيفة

### 4.4 `similaritySearchWithScore` vs `similaritySearch`

```javascript
// Document RAG & DevDocs RAG:
store.similaritySearch(query, topK);
// Returns: [{ pageContent, metadata }]

// GitHub RAG:
store.similaritySearchWithScore(query, topK, filter);
// Returns: [[{ pageContent, metadata }, score], ...]
// score: 0.0-1.0 (cosine similarity)
```

GitHub RAG يستخدم `WithScore` لأنه يحتاج score threshold — الأنظمة الأخرى لا تفلتر بالنقاط.

---

## 5. تجميع النتائج بالملف (Group by File)

### 5.1 آلية التجميع

```javascript
function groupByFile(results) {
  const fileGroups = new Map();

  for (const [doc, score] of results) {
    const filePath = doc.metadata.file;

    if (!fileGroups.has(filePath)) {
      fileGroups.set(filePath, {
        file: filePath,
        repo: doc.metadata.repo,
        language: doc.metadata.language,
        type: doc.metadata.type,
        chunks: [],
      });
    }

    fileGroups.get(filePath).chunks.push({
      content: doc.pageContent,
      chunkIndex: doc.metadata.chunkIndex,
      score,
    });
  }

  // ترتيب chunks داخل كل ملف بترتيب الكود (chunkIndex)
  for (const group of fileGroups.values()) {
    group.chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  return Array.from(fileGroups.values());
}
```

### 5.2 مثال

```
Query: "How does authentication work?"

Before grouping (5 results):
  1. src/auth/login.js chunk 0 (score: 0.82)
  2. src/auth/login.js chunk 1 (score: 0.75)
  3. src/middleware/auth.js chunk 0 (score: 0.71)
  4. README.md chunk 3 (score: 0.45)
  5. src/auth/login.js chunk 2 (score: 0.40)

After grouping:
  File: src/auth/login.js
    chunk 0 → chunk 1 → chunk 2  (sorted by index, continuous code)

  File: src/middleware/auth.js
    chunk 0

  File: README.md
    chunk 3
```

**الفائدة:** بدلاً من عرض chunks متفرقة، يُظهر الملفات مع أجزاء الكود المتتالية — يوفر سياق أفضل للفهم.

---

## 6. شجرة المشروع في نتائج البحث

### 6.1 جلب الشجرة

```javascript
async function getProjectTree(enabledRepos, userId) {
  const store = await getGitHubVectorStore();

  for (const repo of enabledRepos) {
    try {
      const results = await store.similaritySearch(
        `project structure ${repo}`,
        1,
        {
          repo: { $eq: repo },
          userId: { $eq: String(userId) },
          file: { $eq: "__PROJECT_TREE__" },
        },
      );

      if (results.length > 0) {
        return results[0].pageContent;
      }
    } catch {
      continue;
    }
  }

  return null;
}
```

### 6.2 تنسيق النتائج مع الشجرة

```javascript
function formatResults(grouped, tree) {
  let output = "";

  // إضافة شجرة المشروع أولاً (إذا وجدت)
  if (tree) {
    output += `## Project Structure\n\n\`\`\`\n${tree}\n\`\`\`\n\n---\n\n`;
  }

  // إضافة نتائج كل ملف
  for (const group of grouped) {
    output += `### ${group.file} (${group.repo})\n`;
    output += `**Language:** ${group.language} | **Type:** ${group.type}\n\n`;

    for (const chunk of group.chunks) {
      output += `${chunk.content}\n\n`;
    }

    output += "---\n\n";
  }

  return output;
}
```

### 6.3 مثال خرج كامل

```markdown
## Project Structure
```

├── src/
│ ├── auth/
│ │ ├── login.js
│ │ └── middleware.js
│ ├── routes/
│ └── index.js
├── package.json
└── README.md

```

---

### src/auth/login.js (owner/repo)
**Language:** javascript | **Type:** code

Repository: owner/repo | File: src/auth/login.js | Language: javascript | Type: code | Chunk: 1/3

export async function login(email, password) {
  const user = await User.findByEmail(email);
  if (!user || !await bcrypt.compare(password, user.hash)) {
    throw new AuthError('Invalid credentials');
  }
  return generateToken(user);
}

Repository: owner/repo | File: src/auth/login.js | Language: javascript | Type: code | Chunk: 2/3

function generateToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '24h' });
}

---
```

---

## 7. الدمج مع AI Agent

### 7.1 أداة البحث في المستودعات

```javascript
const githubSearchTool = tool(
  async ({ query }) => {
    // جلب تفضيلات المستخدم
    const prefs = getUserGitHubPrefs(userId);
    const enabledRepos = prefs.length > 0 ? prefs : allUserRepos;

    const results = await searchGithubRepos(query, enabledRepos, userId);
    return results || "No relevant code found in your repositories.";
  },
  {
    name: "search_github_repos",
    description:
      "Search through indexed GitHub repositories for code, documentation, and configuration files.",
    schema: z.object({
      query: z
        .string()
        .describe("The search query about code or repository content"),
    }),
  },
);
```

### 7.2 سلسلة القرار

```
┌─────────────────────────────────────────────────────────┐
│           GitHub Search Decision Flow                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  User Query                                              │
│       ↓                                                  │
│  Agent decides to use search_github_repos                │
│       ↓                                                  │
│  Get user preferences (enabled repos)                    │
│       ↓                                                  │
│  searchGithubRepos(query, repos, userId, topK=10)       │
│       ↓                                                  │
│  Pinecone similaritySearchWithScore()                    │
│  filter: { repo: {$in:}, userId: {$eq:} }               │
│       ↓                                                  │
│  Score filtering (>= 0.25)                               │
│       ↓                                                  │
│  Group by file + sort by chunkIndex                      │
│       ↓                                                  │
│  Fetch project tree (if available)                       │
│       ↓                                                  │
│  Format: tree + grouped file results                     │
│       ↓                                                  │
│  Return to Agent → Generate answer                       │
└─────────────────────────────────────────────────────────┘
```

---

## 8. نماذج الذكاء الاصطناعي

> نفس النماذج المتاحة في Document RAG و DevDocs RAG:

#### Groq (مجاني)

| Model         | Model ID                                    |
| ------------- | ------------------------------------------- |
| LLaMA 4 Scout | `meta-llama/llama-4-scout-17b-16e-instruct` |
| LLaMA 3.3 70B | `llama-3.3-70b-versatile`                   |
| DeepSeek R1   | `deepseek-r1-distill-llama-70b`             |

#### Gemini (مجاني)

| Model            | Model ID                         |
| ---------------- | -------------------------------- |
| Gemini 2.0 Flash | `gemini-2.0-flash`               |
| Gemini 2.5 Flash | `gemini-2.5-flash-preview-04-17` |

#### OpenRouter (مدفوع)

| Model            | Model ID                     |
| ---------------- | ---------------------------- |
| GPT-4o Mini      | `openai/gpt-4o-mini`         |
| Claude 3.5 Haiku | `anthropic/claude-3.5-haiku` |

---

## 9. إدارة التفضيلات

### 9.1 نموذج التفضيلات

```sql
CREATE TABLE github_repos_preferences (
  user_id INTEGER NOT NULL,
  repo_id INTEGER NOT NULL,
  enabled INTEGER DEFAULT 1,
  PRIMARY KEY (user_id, repo_id)
);
```

### 9.2 تأثير التفضيلات

```
User has repos: [repo-A, repo-B, repo-C]
User enabled:   [repo-A, repo-C]

Search filter: { repo: { $in: ["repo-A", "repo-C"] } }
→ يبحث فقط في المستودعات المفعّلة
```

---

## 10. إدارة الحالات (State Management)

### 10.1 مراحل الـ Ingestion

```
pending → cloning → parsing → indexing → ready
                                  ↓
                                error
```

### 10.2 متابعة التقدم

```javascript
// أثناء الـ ingestion:
// Phase 1: cloning (no progress — binary operation)
// Phase 2: parsing → { phase: "parsing", current: filesProcessed }
// Phase 3: indexing → { phase: "indexing", current: chunksProcessed, total: totalChunks }
```

---

## 11. مقاييس الأداء

### 11.1 معاملات الأداء

| المقياس                  | القيمة                        |
| ------------------------ | ----------------------------- |
| **Clone Timeout**        | 120 seconds                   |
| **Search Latency**       | < 8 seconds                   |
| **Score Threshold**      | 0.25 (25% minimum similarity) |
| **Top K**                | 10 results (fetches 20)       |
| **Code Chunk Size**      | 3000 chars (~600-750 words)   |
| **Max Repos/User**       | 20                            |
| **Max Files/Repo**       | 500                           |
| **Batch Size**           | 96 chunks per batch           |
| **Supported Languages**  | 16 (with custom separators)   |
| **Supported Extensions** | 50+                           |

### 11.2 تقدير حجم البيانات

لمستودع متوسط (200 ملف كود + 10 docs + 5 config):

```
Code: 200 files × avg 3 chunks = 600 chunks
Docs: 10 files × avg 2 chunks = 20 chunks
Config: 5 files × avg 1 chunk = 5 chunks
Tree: 1 document
Total: ~626 chunks per repo

Max per user: 20 repos × 626 = ~12,520 chunks
```

---

## 12. نقاط القوة والتحسين

### 12.1 نقاط القوة

- Language-aware splitting — يحافظ على وحدات كود كاملة
- Score threshold — يحذف النتائج الضعيفة
- Group by file — يعرض كود متتالي بدلاً من chunks متفرقة
- Project tree context — يوفر سياق هيكلي
- Rich headers — يمنح الـ embedding سياقاً إضافياً
- File priority — يضمن فهرسة الأهم أولاً
- Binary detection — يتجنب الملفات الثنائية
- Dual filter (repo + userId) — عزل قوي

### 12.2 نقاط التحسين المحتملة

- لا يوجد incremental update (يعيد الفهرسة كاملة عند التحديث)
- لا يدعم المستودعات الخاصة بدون token
- لا يوجد reranking متقدم (فقط score threshold)
- لا يوجد code-specific embedding model
- لا يوجد diff tracking (لا يعرف ما تغيّر)

---

## 13. ملخص المعمارية

```
┌──────────────────────────────────────────────────────────────────┐
│              GitHub Repos RAG Baseline Model                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────┐   ┌─────────────────────┐   ┌───────────────┐    │
│  │ User Query │──→│ AI Agent (ReAct)     │──→│ SSE Stream    │    │
│  └───────────┘   └──────────┬──────────┘   └───────────────┘    │
│                             │                                     │
│                   ┌─────────▼───────────┐                        │
│                   │ Tool: search_github_ │                        │
│                   │ repos               │                        │
│                   └─────────┬───────────┘                        │
│                             │                                     │
│                   ┌─────────▼──────────────────────────────┐     │
│                   │ Pinecone: namespace "github_repos"      │     │
│                   │                                         │     │
│                   │  filter: {                              │     │
│                   │    repo: {$in: enabledRepos},           │     │
│                   │    userId: {$eq: userId}                │     │
│                   │  }                                      │     │
│                   │                                         │     │
│                   │  similaritySearchWithScore()            │     │
│                   │  topK: 10 (fetch 20, filter by score)  │     │
│                   │  score threshold: 0.25                  │     │
│                   │  timeout: 8000ms                        │     │
│                   └─────────┬──────────────────────────────┘     │
│                             │                                     │
│                   ┌─────────▼───────────┐                        │
│                   │ Post-Processing      │                        │
│                   │ • Score filter ≥0.25 │                        │
│                   │ • Group by file      │                        │
│                   │ • Sort by chunkIndex │                        │
│                   │ • Fetch project tree │                        │
│                   │ • Format markdown    │                        │
│                   └─────────────────────┘                        │
│                                                                   │
│  Embedding: llama-text-embed-v2 (1024d, Pinecone-hosted)         │
│  Language Support: 16 languages with custom separators            │
│  Chunk Sizes: Code=3000, Docs=2000, Config=1500                  │
│  Models: Groq(3) + Gemini(2) + OpenRouter(2) = 7 total          │
│  Limits: 20 repos/user, 500 files/repo, 100KB/file              │
└──────────────────────────────────────────────────────────────────┘
```
