# 🤖 Baseline Model — Document RAG System

> **System:** Personal Document RAG (Retrieval-Augmented Generation)  
> **Project:** Agentic Personal Assistant  
> **Date:** March 2026

---

## 1. نظرة عامة (Overview)

يمثل الـ Baseline Model في Document RAG النموذج الأساسي للبحث والاسترجاع من المستندات الشخصية المرفوعة. يعتمد على ثلاث ركائز:

1. **Embedding Model** — لتحويل النصوص لـ vectors
2. **Vector Store** — لتخزين والبحث في الـ vectors
3. **AI Agent** — لمعالجة الاستعلامات واستخدام أدوات البحث

---

## 2. نموذج الـ Embedding (Embedding Model)

### 2.1 المواصفات الأساسية

| المعامل               | القيمة                                      |
| --------------------- | ------------------------------------------- |
| **Model Name**        | `llama-text-embed-v2`                       |
| **Provider**          | Pinecone (Embedded Inference)               |
| **Vector Dimensions** | 1024                                        |
| **Similarity Metric** | Cosine Similarity                           |
| **Hosting**           | مستضاف داخل Pinecone — لا حاجة لـ API خارجي |

### 2.2 الإعداد في الكود

```javascript
import { PineconeEmbeddings } from "@langchain/pinecone";

const embeddings = new PineconeEmbeddings({
  model: "llama-text-embed-v2",
});
```

### 2.3 كيف يعمل

```
Input Text → PineconeEmbeddings → [0.012, -0.034, 0.056, ...] (1024 dimensions)
```

- يحول كل chunk أو query إلى vector بـ 1024 بُعد
- يُستخدم في الفهرسة (indexing) والاستعلام (querying)
- يعمل مباشرة عبر Pinecone API — لا حاجة لـ endpoint منفصل

---

## 3. مخزن المتجهات (Vector Store)

### 3.1 Pinecone Configuration

```javascript
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";

const pc = new PineconeClient({ apiKey: process.env.PINECONE_API_KEY });
const pineconeIndex = pc.Index(process.env.PINECONE_INDEX);
```

### 3.2 Namespace Strategy — عزل المستخدمين

كل مستخدم له namespace منفصل:

```javascript
// namespace format: user_{userId}
export async function getVectorStoreForUser(userId) {
  const namespace = `user_${userId}`;
  return getVectorStore(namespace);
}
```

```
Pinecone Index
├── user_1/          (مستخدم #1 — مستنداته فقط)
│   ├── vector_001
│   ├── vector_002
│   └── ...
├── user_2/          (مستخدم #2 — مستنداته فقط)
│   ├── vector_101
│   └── ...
└── user_N/          (مستخدم #N)
```

### 3.3 التخزين المؤقت (Vector Store Cache)

```javascript
const storeCache = new Map();

const getVectorStore = async (namespace) => {
  if (storeCache.has(namespace)) {
    return storeCache.get(namespace);
  }

  const store = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    namespace,
  });

  storeCache.set(namespace, store);
  return store;
};
```

**آلية التخزين المؤقت:**

- أول طلب: يُنشئ `PineconeStore` ويحفظه في `Map`
- الطلبات التالية: يُرجع مباشرة من الـ cache
- عند الحذف: يُبطل الـ cache → `storeCache.delete(namespace)`

---

## 4. أداة البحث (Search Tool)

### 4.1 تعريف الأداة

```javascript
export function createSearchTool(userId) {
  const namespace = `user_${userId}`;

  return tool(
    async ({ query }) => {
      const store = await getVectorStore(namespace);
      const results = await store.similaritySearch(query, 10);

      if (results.length === 0) {
        return "No relevant information found in the knowledge base.";
      }

      return results.map((doc) => doc.pageContent).join("\n\n---\n\n");
    },
    {
      name: "search_knowledge_base",
      description:
        "Searches the internal knowledge base for technical info and documentation.",
      schema: z.object({
        query: z
          .string()
          .describe("The search query to look up in the knowledge base"),
      }),
    },
  );
}
```

### 4.2 معاملات البحث

| المعامل       | القيمة            | الشرح                          |
| ------------- | ----------------- | ------------------------------ |
| **Algorithm** | Similarity Search | بحث بالتشابه (cosine)          |
| **Top K**     | 10                | أقرب 10 نتائج                  |
| **Timeout**   | 4000ms            | حد زمني للبحث (يُطبق في Agent) |
| **Namespace** | `user_{userId}`   | يبحث فقط في مستندات المستخدم   |

### 4.3 تنسيق النتائج

```
Result 1 content text...

---

Result 2 content text...

---

Result 3 content text...
```

- يُرجع النص الخام لكل نتيجة
- يفصل بين النتائج بـ `---`
- يتجاهل الـ metadata في النتيجة النهائية (يُرجع `pageContent` فقط)

---

## 5. وكيل الذكاء الاصطناعي (AI Agent)

### 5.1 معمارية Agent

يستخدم النظام LangGraph `createReactAgent`:

```javascript
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";

const agent = createReactAgent({
  llm: model,              // أحد 7 نماذج متاحة
  tools: [searchTool, ...],
  checkpointSaver: new MemorySaver(),
  messageModifier: systemPrompt,
});
```

### 5.2 خطوات معالجة الاستعلام

```
┌────────────────────────────────────────────────────────────┐
│            Document RAG Query Flow                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User Query: "ما هو محتوى الفصل الثالث؟"                │
│                                                             │
│  2. Agent يستلم الاستعلام + System Prompt                    │
│                                                             │
│  3. Agent يقرر استخدام search_knowledge_base               │
│     → tool call: { query: "الفصل الثالث محتوى" }           │
│                                                             │
│  4. Search Tool:                                            │
│     a. يحول query → vector (1024d) عبر PineconeEmbeddings  │
│     b. يبحث في namespace user_{userId}                     │
│     c. يُرجع أقرب 10 chunks (cosine similarity)            │
│                                                             │
│  5. Agent يستلم نتائج البحث                                 │
│     → 10 chunks ذات صلة بالسؤال                             │
│                                                             │
│  6. Agent يُركّب الإجابة النهائية بناءً على:                │
│     • نتائج البحث (context)                                 │
│     • سجل المحادثة (memory)                                 │
│     • System Prompt (instructions)                          │
│                                                             │
│  7. يُرسل الإجابة كـ streaming response                     │
└────────────────────────────────────────────────────────────┘
```

### 5.3 نماذج الذكاء الاصطناعي المتاحة

يمكن للمستخدم اختيار أي نموذج من 7 نماذج عبر 3 مزودين:

#### Groq (مجاني — سريع)

| Model               | Model ID                                    |
| ------------------- | ------------------------------------------- |
| LLaMA 4 Scout       | `meta-llama/llama-4-scout-17b-16e-instruct` |
| LLaMA 3.3 70B       | `llama-3.3-70b-versatile`                   |
| DeepSeek R1 Distill | `deepseek-r1-distill-llama-70b`             |

#### Gemini (مجاني)

| Model            | Model ID                         |
| ---------------- | -------------------------------- |
| Gemini 2.0 Flash | `gemini-2.0-flash`               |
| Gemini 2.5 Flash | `gemini-2.5-flash-preview-04-17` |

#### OpenRouter (مدفوع — عالي الجودة)

| Model            | Model ID                     |
| ---------------- | ---------------------------- |
| GPT-4o Mini      | `openai/gpt-4o-mini`         |
| Claude 3.5 Haiku | `anthropic/claude-3.5-haiku` |

### 5.4 اختيار النموذج في الكود

```javascript
// providers/index.js
export function getModel(providerId, modelId) {
  const provider = providers[providerId];
  return provider.createModel(modelId);
}

// providers/groq.js
createModel(modelId) {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: modelId,
    temperature: 0.7,
  });
}

// providers/gemini.js
createModel(modelId) {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: modelId,
    temperature: 0.7,
  });
}

// providers/openrouter.js
createModel(modelId) {
  return new ChatOpenAI({
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    },
    modelName: modelId,
    temperature: 0.7,
  });
}
```

---

## 6. إدارة الذاكرة والسياق (Memory & Context)

### 6.1 MemorySaver (LangGraph)

```javascript
const checkpointer = new MemorySaver();

// عند إنشاء Agent:
const agent = createReactAgent({
  ...
  checkpointSaver: checkpointer,
});

// عند الاستدعاء:
const config = {
  configurable: {
    thread_id: `user_${userId}_${conversationId}`,
  },
};
```

- **Thread ID**: `user_{userId}_{conversationId}` — يربط كل محادثة بسجلها
- **In-Memory**: يحفظ السجل في الذاكرة (يُفقد عند إعادة التشغيل)
- **الغرض**: يسمح للـ Agent بتذكر الأسئلة السابقة في نفس المحادثة

### 6.2 System Prompt

```javascript
const systemPrompt = `You are a helpful AI assistant with access to a personal knowledge base.
When the user asks a question, search the knowledge base first for relevant information.
Use the search results to provide accurate, well-informed answers.
If the knowledge base doesn't contain relevant information, say so and answer based on your general knowledge.
Always cite which documents the information came from when possible.`;
```

---

## 7. Streaming Response

### 7.1 تدفق الاستجابة

```javascript
// في الـ route:
const stream = await agent.streamEvents(
  { messages: [{ role: "user", content: userMessage }] },
  { ...config, version: "v2" },
);

for await (const event of stream) {
  if (event.event === "on_chat_model_stream") {
    const token = event.data?.chunk?.content;
    if (token) {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
  }
}
res.write("data: [DONE]\n\n");
res.end();
```

- يستخدم **Server-Sent Events (SSE)** لبث الإجابة حرفاً بحرف
- يراقب حدث `on_chat_model_stream` لالتقاط كل token
- يُرسل `[DONE]` عند الانتهاء

---

## 8. حذف المستندات من الـ Vector Store

```javascript
export async function deleteDocumentVectors(userId, docId) {
  const namespace = `user_${userId}`;
  const pc = new PineconeClient({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.Index(process.env.PINECONE_INDEX).namespace(namespace);

  // حذف جميع vectors التي تنتمي لهذا المستند
  await index.deleteMany({
    docId: { $eq: String(docId) },
  });

  // إبطال cache
  storeCache.delete(namespace);
}
```

- يحذف بناءً على `docId` في metadata
- يُبطل cache الـ store لضمان بيانات حديثة

---

## 9. أدوات إضافية في الـ Agent

بالإضافة لـ `search_knowledge_base`، يستخدم Agent أداة:

### 9.1 Web Search (Tavily)

```javascript
export function createWebSearchTool() {
  return tool(
    async ({ query }) => {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          max_results: 5,
        }),
      });
      const data = await response.json();
      return data.results
        .map((r) => `**${r.title}**\n${r.url}\n${r.content}`)
        .join("\n\n---\n\n");
    },
    {
      name: "web_search",
      description: "Searches the web for current information.",
      schema: z.object({
        query: z.string().describe("The search query"),
      }),
    },
  );
}
```

- يُستخدم كـ fallback عندما لا تتوفر معلومات في قاعدة المعرفة
- Tavily API — محرك بحث محسّن لنتائج AI

---

## 10. مقاييس الأداء (Performance Metrics)

### 10.1 معاملات الأداء الحالية

| المقياس               | القيمة                                     |
| --------------------- | ------------------------------------------ |
| **Embedding Speed**   | ~96 chunks/batch (limited by Pinecone API) |
| **Search Latency**    | < 4 seconds (timeout limit)                |
| **Top K Results**     | 10 chunks per query                        |
| **Vector Dimensions** | 1024                                       |
| **Chunk Size**        | 1000 chars (~200-250 words)                |
| **Cache Strategy**    | In-memory Map per namespace                |

### 10.2 نقاط القوة

- عزل كامل بين المستخدمين (namespace isolation)
- بحث سريع بفضل Pinecone managed service
- Cache يمنع إعادة إنشاء connections
- دعم 7 نماذج AI مختلفة

### 10.3 نقاط التحسين المحتملة

- Memory مؤقت (يُفقد عند إعادة التشغيل)
- لا يوجد reranking للنتائج
- لا يوجد score threshold (يُرجع أقرب 10 حتى لو ضعيفة)
- لا يوجد hybrid search (keyword + semantic)

---

## 11. ملخص المعمارية

```
┌──────────────────────────────────────────────────────────────┐
│              Document RAG Baseline Model                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────┐ │
│  │ User Query   │───→│ AI Agent (ReAct) │───→│ Streaming   │ │
│  │              │    │ (LangGraph)      │    │ Response    │ │
│  └─────────────┘    └────────┬─────────┘    └─────────────┘ │
│                              │                                │
│                    ┌─────────▼──────────┐                    │
│                    │   Tool Selection    │                    │
│                    └─────────┬──────────┘                    │
│                    ┌─────────┴──────────┐                    │
│              ┌─────▼─────┐      ┌──────▼──────┐             │
│              │ KB Search  │      │ Web Search   │             │
│              │ (Pinecone) │      │ (Tavily API) │             │
│              └─────┬─────┘      └─────────────┘             │
│                    │                                          │
│              ┌─────▼─────────────────┐                       │
│              │ Pinecone Vector Store  │                       │
│              │ namespace: user_{id}   │                       │
│              │ embedding: llama-v2    │                       │
│              │ dimensions: 1024      │                       │
│              │ top_k: 10             │                       │
│              └───────────────────────┘                       │
│                                                               │
│  Models: Groq (3) | Gemini (2) | OpenRouter (2) = 7 total   │
│  Memory: MemorySaver (in-memory, per thread)                  │
│  Streaming: SSE (Server-Sent Events)                          │
└──────────────────────────────────────────────────────────────┘
```
