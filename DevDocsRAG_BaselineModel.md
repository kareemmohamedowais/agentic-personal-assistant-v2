# 🤖 Baseline Model — DevDocs RAG System

> **System:** Developer Documentation RAG (Retrieval-Augmented Generation)  
> **Project:** Agentic Personal Assistant  
> **Date:** March 2026

---

## 1. نظرة عامة (Overview)

الـ Baseline Model لـ DevDocs RAG يعتمد على نفس البنية التحتية لنموذج Document RAG مع إضافات خاصة بالتوثيقات التقنية:

1. **Embedding Model** — نفس النموذج (`llama-text-embed-v2`)
2. **Vector Store** — Pinecone مع namespace مشترك وفلترة بالإطار
3. **Search Engine** — محرك بحث متخصص مع اكتشاف تلقائي للإطار
4. **AI Agent Integration** — دمج مع ReAct Agent كأداة بحث إضافية

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
import { PineconeEmbeddings } from "@langchain/pinecone";
const embeddings = new PineconeEmbeddings({ model: "llama-text-embed-v2" });
```

> **ملاحظة:** نفس نموذج الـ embedding المستخدم في Document RAG — يضمن consistency عبر كل أنظمة RAG في المشروع.

---

## 3. Vector Store

### 3.1 Namespace Strategy

```
Pinecone Index
├── user_1/          → Document RAG (user isolation)
├── user_2/          → Document RAG
├── dev_docs/        → DevDocs RAG (ALL frameworks) ← هذا الـ namespace
├── github_repos/    → GitHub RAG
└── ...
```

**فرق جوهري عن Document RAG:**

- Document RAG: namespace **لكل مستخدم** (`user_{id}`)
- DevDocs RAG: namespace **واحد مشترك** (`dev_docs`) — الفلترة بـ metadata

### 3.2 الوصول للـ Store

```javascript
const DEV_DOCS_NAMESPACE = "dev_docs";

async function getDevDocsVectorStore() {
  return getVectorStore(DEV_DOCS_NAMESPACE);
  // يستخدم نفس cache mechanism (storeCache Map)
}
```

---

## 4. محرك البحث (Search Engine)

### 4.1 البحث الدلالي

```javascript
export async function searchDevDocs(query, enabledFrameworks, topK = 5) {
  const TIMEOUT_MS = 5000;

  const store = await getDevDocsVectorStore();

  // فلتر بالأطر المفعّلة فقط
  const filter = {
    framework: { $in: enabledFrameworks },
  };

  // بحث مع timeout
  const results = await Promise.race([
    store.similaritySearch(query, topK, filter),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Search timeout")), TIMEOUT_MS),
    ),
  ]);

  if (!results || results.length === 0) return null;

  // تنسيق النتائج مع headers
  return results
    .map((doc) => {
      const { framework, title, url } = doc.metadata;
      return `### ${title} (${framework})\n**Source:** ${url}\n\n${doc.pageContent}`;
    })
    .join("\n\n---\n\n");
}
```

### 4.2 معاملات البحث

| المعامل             | القيمة                    | المقارنة مع DocRAG |
| ------------------- | ------------------------- | ------------------ |
| **Top K**           | 5                         | DocRAG: 10         |
| **Timeout**         | 5000ms                    | DocRAG: 4000ms     |
| **Filter**          | `framework: {$in: [...]}` | DocRAG: لا فلتر    |
| **Score Threshold** | لا يوجد                   | لا يوجد            |
| **Namespace**       | `"dev_docs"`              | `"user_{id}"`      |

### 4.3 لماذا Top K = 5 بدلاً من 10؟

- التوثيقات التقنية أكثر تركيزاً وتحديداً
- chunk size أكبر (1500 vs 1000) = كل نتيجة تحتوي معلومات أكثر
- الفلترة بالإطار تقلل النتائج غير ذات الصلة
- 5 نتائج × 1500 حرف ≈ 7500 حرف — كافي للسياق

### 4.4 تنسيق النتائج

```markdown
### Routing - Laravel (laravel)

**Source:** https://laravel.com/docs/12.x/routing

Laravel routes are defined in route files located in the routes directory...

---

### Middleware - Laravel (laravel)

**Source:** https://laravel.com/docs/12.x/middleware

Middleware provide a convenient mechanism for inspecting...
```

- كل نتيجة تتضمن: **العنوان** + **الإطار** + **الرابط المصدر** + **المحتوى**
- يفصل بين النتائج بـ `---`

---

## 5. اكتشاف تلقائي للإطار (Framework Detection)

### 5.1 آلية الاكتشاف

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

### 5.2 كلمات مفتاحية لكل إطار

| Framework      | Keywords                                          |
| -------------- | ------------------------------------------------- |
| **Laravel**    | laravel, eloquent, blade, artisan, migration      |
| **React**      | react, jsx, hooks, useState, useEffect, component |
| **Next.js**    | nextjs, next.js, getServerSideProps, app router   |
| **Node.js**    | nodejs, node.js, express, npm, require            |
| **Python**     | python, pip, virtualenv, decorator                |
| **FastAPI**    | fastapi, fast api, pydantic, uvicorn              |
| **Django**     | django, django rest, orm, manage.py               |
| **Docker**     | docker, dockerfile, container, compose, image     |
| **Kubernetes** | kubernetes, k8s, kubectl, pod, deployment, helm   |
| **Git**        | git, github, commit, branch, merge, rebase        |

### 5.3 مثال على الاكتشاف

```
// Input:
query = "How to create a React component with useState hook?"

// Process:
lowerQuery = "how to create a react component with usestate hook?"
→ matches "react" keyword for React framework
→ matches "usestate" keyword for React framework

// Output:
detected = ["react"]
```

```
// Input:
query = "Deploy Django app with Docker compose"

// Process:
→ matches "django" for Django
→ matches "docker" for Docker
→ matches "compose" for Docker

// Output:
detected = ["django", "docker"]
```

---

## 6. الدمج مع AI Agent

### 6.1 كيف يُستخدم في المحادثة

DevDocs search مدمج كأداة في ReAct Agent:

```javascript
// agent.js — إنشاء أداة بحث DevDocs
const devDocsSearchTool = tool(
  async ({ query }) => {
    // 1. اكتشاف الأطر من الاستعلام
    const detected = detectFrameworks(query);

    // 2. دمج مع تفضيلات المستخدم
    const enabledFrameworks =
      userPrefs.length > 0
        ? userPrefs
        : detected.length > 0
          ? detected
          : allInstalledFrameworks;

    // 3. بحث
    const results = await searchDevDocs(query, enabledFrameworks);
    return results || "No relevant documentation found.";
  },
  {
    name: "search_dev_docs",
    description:
      "Search developer documentation for frameworks like React, Laravel, Django, etc.",
    schema: z.object({
      query: z.string().describe("The technical question to search for"),
    }),
  },
);
```

### 6.2 سلسلة القرار

```
┌─────────────────────────────────────────────────┐
│           DevDocs Search Decision Flow           │
├─────────────────────────────────────────────────┤
│                                                  │
│  User Query                                      │
│       ↓                                          │
│  detectFrameworks(query)                         │
│       ↓                                          │
│  ┌─── Has user preferences? ───┐                │
│  │                              │                │
│  Yes                            No               │
│  ↓                              ↓                │
│  Use user prefs      ┌─── Detected any? ───┐    │
│                      │                      │    │
│                      Yes                    No   │
│                      ↓                      ↓    │
│                Use detected    Use ALL installed  │
│                      ↓              ↓            │
│  ┌───────────────────┴──────────────┘            │
│  ↓                                               │
│  searchDevDocs(query, frameworks, topK=5)        │
│       ↓                                          │
│  Pinecone similarity search                      │
│  filter: {framework: {$in: frameworks}}          │
│       ↓                                          │
│  Format results with titles + URLs               │
│       ↓                                          │
│  Return to Agent → Generate answer               │
└─────────────────────────────────────────────────┘
```

---

## 7. إدارة تفضيلات المستخدم

### 7.1 نموذج التفضيلات

```sql
-- كل مستخدم يختار الأطر التي يريد البحث فيها
CREATE TABLE dev_docs_preferences (
  user_id INTEGER NOT NULL,
  framework_id TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,    -- 1 = مفعّل, 0 = معطّل
  PRIMARY KEY (user_id, framework_id)
);
```

### 7.2 API

```javascript
// GET /api/devdocs/my-prefs
// Response: { frameworks: ["laravel", "react", "docker"] }

// PUT /api/devdocs/my-prefs
// Body: { frameworks: ["laravel", "react", "nextjs"] }
```

### 7.3 أثر التفضيلات على البحث

- إذا حدد المستخدم أطراً مفضّلة → يبحث فيها فقط
- إذا لم يحدد → يستخدم الاكتشاف التلقائي من الاستعلام
- إذا لم يُكتشف شيء → يبحث في جميع الأطر المثبّتة

---

## 8. نماذج الذكاء الاصطناعي

### 8.1 النماذج المتاحة للمحادثة

> نفس النماذج المستخدمة في Document RAG — الاختيار يعتمد على المستخدم

#### Groq (مجاني — سريع)

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

### 8.2 Temperature

```javascript
temperature: 0.7; // لجميع المزودين
```

---

## 9. إدارة الحالات (State Management)

### 9.1 حالات التثبيت

```
not_installed → installing → installed
                     ↓
                   error
```

### 9.2 متابعة التقدم

```javascript
const installProgress = new Map();

// أثناء التثبيت:
installProgress.set(frameworkId, {
  phase: "crawling" | "parsing" | "indexing",
  progress: 0 - 100, // نسبة مئوية
  message: "Crawling 45/200 pages...",
});

// Endpoint لقراءة التقدم:
// GET /api/devdocs/status/:framework
```

### 9.3 نسبة التقدم

```
0%  — بداية الزحف
33% — انتهاء الزحف، بداية التحليل
33% — انتهاء التحليل، بداية الفهرسة
100% — اكتمل كل شيء
```

---

## 10. مقاييس الأداء

### 10.1 معاملات الأداء

| المقياس                 | القيمة                                   |
| ----------------------- | ---------------------------------------- |
| **Crawl Speed**         | ~1.67 pages/sec (limited by 600ms delay) |
| **Search Latency**      | < 5 seconds                              |
| **Top K**               | 5 results                                |
| **Chunk Size**          | 1500 chars (~300-375 words)              |
| **Max Frameworks**      | 10                                       |
| **Max Pages/Framework** | 150-400                                  |
| **Total Max Pages**     | ~2,350 across all frameworks             |

### 10.2 تقدير حجم البيانات

| Framework  | Pages     | Est. Chunks (avg 3/page) |
| ---------- | --------- | ------------------------ |
| Laravel    | 200       | ~600                     |
| React      | 300       | ~900                     |
| Next.js    | 250       | ~750                     |
| Node.js    | 150       | ~450                     |
| Python     | 400       | ~1,200                   |
| FastAPI    | 150       | ~450                     |
| Django     | 300       | ~900                     |
| Docker     | 200       | ~600                     |
| Kubernetes | 250       | ~750                     |
| Git        | 150       | ~450                     |
| **Total**  | **2,350** | **~7,050**               |

---

## 11. نقاط القوة والتحسين

### 11.1 نقاط القوة

- اكتشاف تلقائي للإطار من نص الاستعلام
- فلترة بالإطار تحسّن دقة النتائج
- حفظ أمثلة الكود في Markdown
- تفضيلات شخصية لكل مستخدم
- rate limiting يحترم المواقع المصدر
- تقدم مرئي أثناء التثبيت

### 11.2 نقاط التحسين المحتملة

- لا يوجد incremental crawling (يعيد الزحف كاملاً عند التحديث)
- لا يوجد score threshold (يُرجع أقرب 5 حتى لو ضعيفة)
- لا يوجد reranking للنتائج
- Cache في الذاكرة فقط (يُفقد عند إعادة التشغيل)
- لا يدعم nested code blocks في HTML

---

## 12. ملخص المعمارية

```
┌────────────────────────────────────────────────────────────────┐
│               DevDocs RAG Baseline Model                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────┐   ┌─────────────────────┐   ┌───────────────┐  │
│  │ User Query │──→│ AI Agent (ReAct)     │──→│ SSE Stream    │  │
│  └───────────┘   └──────────┬──────────┘   └───────────────┘  │
│                             │                                   │
│                   ┌─────────▼──────────┐                       │
│                   │  Tool: search_dev_  │                       │
│                   │  docs              │                       │
│                   └─────────┬──────────┘                       │
│                             │                                   │
│                   ┌─────────▼──────────┐                       │
│                   │ detectFrameworks()  │                       │
│                   │ → keyword matching  │                       │
│                   └─────────┬──────────┘                       │
│                             │                                   │
│                   ┌─────────▼──────────┐                       │
│                   │ User Preferences    │                       │
│                   │ OR detected         │                       │
│                   │ OR all installed    │                       │
│                   └─────────┬──────────┘                       │
│                             │                                   │
│                   ┌─────────▼──────────────────────────────┐   │
│                   │ Pinecone: namespace "dev_docs"          │   │
│                   │ filter: {framework: {$in: [...]}}       │   │
│                   │ topK: 5                                 │   │
│                   │ embedding: llama-text-embed-v2 (1024d)  │   │
│                   │ timeout: 5000ms                         │   │
│                   └────────────────────────────────────────┘   │
│                                                                 │
│  10 Frameworks: Laravel, React, Next.js, Node.js, Python,     │
│                 FastAPI, Django, Docker, Kubernetes, Git        │
│  7 AI Models: Groq(3) + Gemini(2) + OpenRouter(2)             │
└────────────────────────────────────────────────────────────────┘
```
