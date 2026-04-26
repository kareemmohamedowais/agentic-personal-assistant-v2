# 🤖 Baseline Model — Agentic Personal Assistant

> **Project:** Agentic Personal Assistant — A Multi-Model RAG-Based Intelligent System  
> **Date:** March 2026  
> **Focus:** النماذج الأساسية المستخدمة في المشروع ومعماريتها وطريقة عملها

---

## 1. نظرة عامة (Overview)

يعتمد المشروع على **معمارية Agentic RAG** كنموذج أساسي (Baseline Model)، حيث يجمع بين:

1. **LLM (Large Language Model)** — نماذج ذكاء اصطناعي كبيرة للتوليد
2. **RAG (Retrieval-Augmented Generation)** — تعزيز الردود بمعلومات مسترجعة
3. **Agent System** — وكيل ذكي يقرر متى وكيف يستخدم الأدوات المتاحة

```
┌──────────────────────────────────────────────────────────────┐
│                     Baseline Model Architecture               │
│                                                               │
│  User Query → Agent (LangGraph) → Tool Selection → LLM       │
│                    ↕                    ↕                      │
│              Memory (History)    ┌──────┴──────┐              │
│                                  │   Tools:     │              │
│                                  │ • KB Search  │              │
│                                  │ • Web Search │              │
│                                  │ • DevDocs    │              │
│                                  │ • GitHub     │              │
│                                  └─────────────┘              │
│                                        ↓                      │
│                              Context-Enriched Response        │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. نماذج الذكاء الاصطناعي (AI Models)

### 2.1 كتالوج النماذج المتاحة

يدعم النظام **7 نماذج** من **3 مزودين** مختلفين:

| # | الموديل | المزود | الحجم | السرعة | الدقة | الاستخدام المثالي |
|---|---------|--------|-------|--------|-------|------------------|
| 1 | **Llama 3.3 70B** | Groq | 70B params | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | **الافتراضي** — أفضل توازن بين السرعة والدقة |
| 2 | **Kimi K2** | Groq | Large | ⚡⚡ | ⭐⭐⭐⭐⭐ | مهام معقدة تتطلب ذكاء عالي |
| 3 | **Qwen3 32B** | Groq | 32B params | ⚡⚡⚡ | ⭐⭐⭐⭐ | تفكير عميق وتحليل |
| 4 | **Llama 4 Maverick** | Groq | Large | ⚡⚡ | ⭐⭐⭐⭐ | أحدث نماذج Meta |
| 5 | **Llama 3.1 8B** | Groq | 8B params | ⚡⚡⚡⚡⚡ | ⭐⭐⭐ | المهام السريعة والخفيفة |
| 6 | **Gemma 3 12B** | OpenRouter | 12B params | ⚡⚡⚡ | ⭐⭐⭐⭐ | مجاني بالكامل من Google |
| 7 | **Gemini 2.5 Flash Lite** | Google | — | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | سريع (حصة قد تنفد) |

### 2.2 تفاصيل كل مزود

#### Groq (`server/providers/groq.js`)

```javascript
import { ChatGroq } from "@langchain/groq";

const model = new ChatGroq({
  model: "llama-3.3-70b-versatile",  // أو موديل آخر
  temperature: 0.7,
  apiKey: userApiKey || process.env.GROQ_API_KEY
});
```

- **ميزة**: أسرع Inference في السوق بفضل LPU (Language Processing Unit)
- **النماذج**: Llama 3.3 70B, Kimi K2, Qwen3 32B, Llama 4 Maverick, Llama 3.1 8B
- **الحد**: Rate limits تعتمد على الـ tier
- **Retry**: محاولة واحدة فقط (بدون rotation)

#### Google Gemini (`server/providers/gemini.js`)

```javascript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  temperature: 0.7,
  apiKey: currentKey  // يتدور بين 6 مفاتيح
});
```

- **ميزة خاصة**: نظام تدوير 6 مفاتيح API
  - **RPM Limit (429)** → حظر المفتاح 65 ثانية → الانتقال للمفتاح التالي
  - **Daily Quota** → حظر المفتاح 6 ساعات
  - **3 محاولات** لكل طلب (ينتقل لمفتاح آخر بعد كل فشل)

```javascript
// Key rotation logic
class GeminiKeyManager {
  constructor(keys) {
    this.keys = keys;           // 6 مفاتيح
    this.currentIndex = 0;
    this.blockedUntil = {};     // وقت انتهاء الحظر لكل مفتاح
  }

  getAvailableKey() {
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      if (!this.isBlocked(idx)) {
        this.currentIndex = idx;
        return this.keys[idx];
      }
    }
    throw new Error('All keys blocked');
  }

  blockKey(index, duration) {
    this.blockedUntil[index] = Date.now() + duration;
  }
}
```

#### OpenRouter (`server/providers/openrouter.js`)

```javascript
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: "google/gemma-3-12b-it:free",
  temperature: 0.7,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: userApiKey || process.env.OPENROUTER_API_KEY
  }
});
```

- **ميزة**: وصول لنماذج مجانية (Gemma 3 12B)
- **API**: متوافق مع OpenAI API format
- **Retry**: محاولة واحدة

### 2.3 نظام Provider Factory (`server/providers/index.js`)

```javascript
export function getModel(provider, modelId, options = {}) {
  switch (provider) {
    case 'groq':
      return createGroqModel(modelId, options);
    case 'gemini':
      return createGeminiModel(modelId, options);
    case 'openrouter':
      return createOpenRouterModel(modelId, options);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```

**Smart Fallback Chain:**
```
الموديل المختار → فشل؟ → موديل بديل من نفس المزود → فشل؟ → مزود آخر
```

---

## 3. معمارية الـ Agent — النموذج الأساسي

### 3.1 LangGraph Agent (`server/agent.js`)

النظام يستخدم **LangGraph** لبناء Agent كـ **State Machine**:

```
┌─────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│  START   │────▶│  AGENT   │────▶│   TOOLS   │────▶│  AGENT   │
│          │     │ (Think)  │     │ (Execute) │     │ (Answer) │
└─────────┘     └──────────┘     └───────────┘     └──────────┘
                     │                                    │
                     │ (لا يحتاج أدوات)                    │
                     └──────────────▶ END ◀───────────────┘
```

#### State Machine Flow:
1. **START** — استلام رسالة المستخدم مع السياق
2. **AGENT (Think)** — الموديل يقرر:
   - هل يحتاج بحث في قاعدة المعرفة؟
   - هل يحتاج بحث ويب؟
   - هل يمكنه الإجابة مباشرة؟
3. **TOOLS (Execute)** — تنفيذ الأداة المطلوبة واسترجاع النتائج
4. **AGENT (Answer)** — دمج النتائج وتوليد الرد النهائي
5. **END** — إرسال الرد للمستخدم

### 3.2 الأدوات المتاحة للـ Agent (`server/tools.js`)

```javascript
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// أداة 1: البحث في قاعدة المعرفة الشخصية
const knowledgeBaseSearch = tool(
  async ({ query }) => {
    const results = await vectorStore.similaritySearch(query, 10, {
      namespace: `user_${userId}`
    });
    return results.map(r => r.pageContent).join('\n\n');
  },
  {
    name: "knowledge_base_search",
    description: "Search the user's uploaded documents for relevant information",
    schema: z.object({
      query: z.string().describe("The search query")
    })
  }
);

// أداة 2: بحث الويب
const webSearch = tool(
  async ({ query }) => {
    const results = await tavilySearch(query, 5);
    return results.map(r => `${r.title}: ${r.content}`).join('\n\n');
  },
  {
    name: "web_search",
    description: "Search the internet for current information",
    schema: z.object({
      query: z.string().describe("The search query")
    })
  }
);
```

### 3.3 بناء System Prompt

```javascript
function buildSystemPrompt(persona, summary, kbContext, devDocsContext, githubContext) {
  let prompt = persona?.content || DEFAULT_SYSTEM_PROMPT;
  
  // إضافة ملخص المحادثات السابقة
  if (summary) {
    prompt += `\n\nPrevious conversation summary:\n${summary}`;
  }
  
  // إضافة سياق من قاعدة المعرفة
  if (kbContext) {
    prompt += `\n\nRelevant documents:\n${kbContext}`;
  }
  
  // إضافة سياق من التوثيقات التقنية
  if (devDocsContext) {
    prompt += `\n\nDeveloper documentation:\n${devDocsContext}`;
  }
  
  // إضافة سياق من أكواد GitHub
  if (githubContext) {
    prompt += `\n\nRelevant code:\n${githubContext}`;
  }
  
  return prompt;
}
```

---

## 4. نموذج RAG (Retrieval-Augmented Generation)

### 4.1 المفهوم الأساسي

RAG يحل مشكلة أساسية: نماذج LLM لا تعرف المعلومات الخاصة بالمستخدم. الحل:

```
┌────────────────────────────────────────────────────────────┐
│                    RAG Architecture                         │
│                                                             │
│  Query: "ما هو الفصل الثالث في الكتاب؟"                      │
│                                                             │
│  1. Embedding: Query → Vector [0.12, -0.34, 0.56, ...]    │
│  2. Search:    Vector → Pinecone → Top 10 similar chunks   │
│  3. Augment:   Query + Retrieved chunks → LLM prompt       │
│  4. Generate:  LLM produces answer with context            │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Embedding Model

| المعامل | القيمة |
|---------|--------|
| **Model** | `llama-text-embed-v2` |
| **Provider** | Pinecone (مستضاف) |
| **Dimensions** | 1024 |
| **Type** | Dense embedding |
| **Similarity** | Cosine similarity |

### 4.3 Vector Store — Pinecone

```javascript
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index(process.env.PINECONE_INDEX);

// بحث دلالي
const results = await vectorStore.similaritySearch(
  query,      // نص البحث
  10,         // عدد النتائج
  { namespace: `user_${userId}` }  // عزل المستخدم
);
```

### 4.4 Triple RAG System

النظام يطبق RAG على 3 مصادر بيانات مختلفة:

```
┌─────────────────────────────────────────────────────┐
│                 Triple RAG System                     │
├─────────────────────────────────────────────────────┤
│                                                       │
│  RAG 1: Personal Documents                            │
│  ├── Namespace: user_{userId}                         │
│  ├── Sources: PDF, DOCX, PPTX, TXT, CSV             │
│  ├── Chunk: 1000 chars / 200 overlap                 │
│  └── Results: Top 10                                  │
│                                                       │
│  RAG 2: Developer Documentation                       │
│  ├── Namespace: dev_docs                              │
│  ├── Sources: 10+ framework websites                  │
│  ├── Chunk: 1500 chars / 200 overlap                 │
│  └── Filter: user's enabled frameworks only           │
│                                                       │
│  RAG 3: GitHub Code                                   │
│  ├── Namespace: github_repos                          │
│  ├── Sources: Public repos (git clone)                │
│  ├── Chunk: Code-aware splitting                      │
│  └── Filter: user's enabled repos only                │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## 5. نظام الـ Streaming (SSE)

### 5.1 البنية

```
Client (EventSource) ←── SSE Connection ──→ Server (Express)
                                              ↓
                                         LLM (streaming)
                                              ↓
                                    Token by token → Client
```

### 5.2 Server-Side Implementation

```javascript
app.post("/api/chat/stream", requireAuth, async (req, res) => {
  // إعداد SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // إرسال metadata أولاً
  res.write(`data: ${JSON.stringify({ 
    type: 'metadata', 
    conversationId, 
    mediaUrl 
  })}\n\n`);

  // بث tokens
  const stream = await model.stream(messages);
  for await (const chunk of stream) {
    const token = chunk.content;
    res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
  }

  // إنهاء
  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
});
```

### 5.3 Client-Side Implementation

```javascript
const eventSource = new EventSource('/api/chat/stream', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ message, conversationId })
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'metadata':
      setConversationId(data.conversationId);
      break;
    case 'token':
      appendToMessage(data.content);  // يظهر حرف بحرف
      break;
    case 'done':
      eventSource.close();
      break;
  }
};
```

---

## 6. نموذج تحليل البيانات (Data Analyst Baseline)

### 6.1 المعمارية

```
┌──────────────────────────────────────────────────────────┐
│              Data Analyst Engine Flow                      │
│                                                           │
│  User Question (Natural Language)                         │
│       ↓                                                   │
│  AI Model (LLM) → Generate Python Code                   │
│       ↓                                                   │
│  Security Validator → Check banned patterns               │
│       ↓                                                   │
│  Python Sandbox → Execute (30s timeout, 512MB RAM)       │
│       ↓                                                   │
│  Output Parser → Extract: text, tables, charts           │
│       ↓                                                   │
│  Response Builder → Format for frontend                   │
└──────────────────────────────────────────────────────────┘
```

### 6.2 AI Code Generation (`server/dataAnalyst/engine.js`)

الـ AI يتلقى:
- **ملخص البيانات**: أسماء الأعمدة، الأنواع، الإحصائيات
- **سؤال المستخدم**: بلغة طبيعية
- **تعليمات**: توليد كود Python يستخدم pandas, matplotlib, etc.

```javascript
const analysisPrompt = `
You are a data analyst. Given this dataset summary:
${datasetSummary}

User's question: ${userQuestion}

Generate Python code that:
1. Reads the data from: ${filePath}
2. Performs the requested analysis
3. Prints results clearly
4. Creates visualizations if appropriate (save as PNG)

IMPORTANT:
- Use pandas for data manipulation
- Use matplotlib/seaborn for charts
- Print all results using print()
- Save charts to: ${outputDir}
`;
```

### 6.3 Sandbox الآمن (`server/dataAnalyst/executor.js`)

```javascript
async function executeCode(code, datasetPath, outputDir) {
  // 1. التحقق من الأمان
  validateCode(code);  // يرفض الأوامر الخطرة
  
  // 2. كتابة السكربت
  const scriptPath = path.join(sandboxDir, 'scripts', `${uuid()}.py`);
  fs.writeFileSync(scriptPath, code);
  
  // 3. التنفيذ في بيئة معزولة
  const result = await execWithTimeout(
    `${pythonPath} ${scriptPath}`,
    {
      timeout: 30000,    // 30 ثانية
      maxBuffer: 512 * 1024 * 1024,  // 512MB
      cwd: sandboxDir,
      env: { ...minimalEnv }  // بيئة محدودة
    }
  );
  
  // 4. جمع المخرجات
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    charts: findGeneratedCharts(outputDir),
    exitCode: result.exitCode
  };
}
```

### 6.4 المكتبات المتاحة في Sandbox

```
# server/sandbox/requirements.txt
pandas>=2.0
numpy>=1.24
matplotlib>=3.7
seaborn>=0.12
plotly>=5.15
scikit-learn>=1.3
scipy>=1.11
openpyxl>=3.1        # Excel support
xlrd>=2.0            # Legacy Excel
pyarrow>=12.0        # Parquet support
```

---

## 7. نموذج تحسين الأسئلة (Prompt Optimizer)

### 7.1 المفهوم

```
سؤال بسيط → Prompt Optimizer (AI) → سؤال محسّن ومفصّل → LLM الأساسي
```

### 7.2 التنفيذ (`server/promptOptimizer.js`)

```javascript
import { ChatGroq } from "@langchain/groq";

const optimizer = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0.3  // حرارة منخفضة للدقة
});

async function optimizePrompt(userMessage) {
  // لا تحسّن الرسائل القصيرة
  if (userMessage.length < 5) return userMessage;

  const optimized = await optimizer.invoke([
    {
      role: "system",
      content: `You are a prompt optimizer. Improve the user's question to be:
        - More specific and clear
        - Include relevant constraints
        - Structured with steps if needed
        - Keep the original language
        Do NOT change the meaning. Return ONLY the improved prompt.`
    },
    { role: "user", content: userMessage }
  ]);

  return optimized.content;
}
```

---

## 8. نموذج الذاكرة والسياق (Memory Model)

### 8.1 آلية الذاكرة

```
┌──────────────────────────────────────────────────┐
│              Memory Management                     │
│                                                    │
│  Messages < 30:                                   │
│  └── إرسال آخر 20 رسالة كاملة مع كل طلب          │
│                                                    │
│  Messages >= 30:                                   │
│  └── تلخيص أقدم 20 رسالة                           │
│      └── حذف الرسائل الملخصة                       │
│      └── حفظ الملخص في conversation.summary        │
│      └── إضافة الملخص في System Prompt             │
│                                                    │
│  ملخصات متراكمة (مفصولة بـ ---):                   │
│  └── ملخص 1 (أول 20 رسالة)                        │
│  └── ---                                           │
│  └── ملخص 2 (الـ 20 رسالة التالية)                 │
│  └── ---                                           │
│  └── ... وهكذا                                     │
└──────────────────────────────────────────────────┘
```

### 8.2 تنسيق الذاكرة في System Prompt

```
[System Prompt / Persona]

--- Previous Conversation Summary ---
الملخص 1: ناقش المستخدم موضوع X وسأل عن Y وتم الاتفاق على Z
---
الملخص 2: استكمل المستخدم بالسؤال عن A وطلب تفاصيل B
--- End of Summary ---

[Retrieved Context from Knowledge Base]
[Retrieved Context from DevDocs]
[Retrieved Context from GitHub]
```

---

## 9. مقاييس الأداء (Performance Metrics)

### 9.1 أوقات الاستجابة المتوقعة

| العملية | الوقت المتوقع | Timeout |
|---------|-------------|---------|
| KB Search (Pinecone) | 500ms - 2s | 4 ثوانٍ |
| Web Search (Tavily) | 1-3s | 5 ثوانٍ |
| LLM Response (Groq) | 1-5s | — |
| LLM Response (Gemini) | 2-8s | — |
| Python Execution | 1-15s | 30 ثانية |
| Document Ingestion | 5-30s | — |
| Repo Indexing | 30s-5min | — |

### 9.2 حدود النظام

| المعامل | القيمة |
|---------|--------|
| حجم الملفات المرفوعة | 25MB (مستندات) / 100MB (datasets) |
| حجم الوسائط | 10MB (صور + صوت) |
| عدد نتائج البحث | 10 (KB) / 5 (Web) |
| تاريخ المحادثة | آخر 20 رسالة |
| حد التلخيص | عند 30 رسالة |
| عدد المحادثات المعروضة | 50 |
| مفاتيح Gemini | 6 مفاتيح متدورة |
| محاولات لكل طلب | 3 (Gemini) / 1 (Groq, OpenRouter) |

---

## 10. مقارنة النماذج (Model Comparison)

### 10.1 أداء النماذج السبعة

| النموذج | نوع المهام | نقاط القوة | نقاط الضعف |
|---------|-----------|------------|------------|
| **Llama 3.3 70B** | عام | دقة عالية + سرعة ممتازة | حصة Groq محدودة |
| **Kimi K2** | معقدة | ذكاء استثنائي في التحليل | أبطأ قليلاً |
| **Qwen3 32B** | تحليلية | تفكير عميق ومنطقي | أصغر حجماً |
| **Llama 4 Maverick** | عام | أحدث تقنيات Meta | قد لا يكون مستقراً |
| **Llama 3.1 8B** | بسيطة | أسرع نموذج — ملائم للمهام الخفيفة | أقل دقة |
| **Gemma 3 12B** | عام | مجاني بالكامل | أبطأ عبر OpenRouter |
| **Gemini 2.5 Flash Lite** | سريعة | سريع من Google | حصة يومية قد تنفد |

### 10.2 متى تستخدم كل نموذج

```
┌─────────────────────────────────────────────────┐
│           Model Selection Guide                   │
├─────────────────────────────────────────────────┤
│                                                   │
│  "أريد أفضل رد ممكن"                              │
│  → Llama 3.3 70B أو Kimi K2                      │
│                                                   │
│  "أريد رد سريع لسؤال بسيط"                        │
│  → Llama 3.1 8B                                   │
│                                                   │
│  "أريد تحليل عميق أو حل مشكلة"                    │
│  → Qwen3 32B أو Kimi K2                          │
│                                                   │
│  "ميزانيتي محدودة (مجاني)"                        │
│  → Gemma 3 12B (OpenRouter free)                  │
│                                                   │
│  "كل النماذج مشغولة"                               │
│  → Smart Fallback يختار تلقائياً                   │
│                                                   │
└─────────────────────────────────────────────────┘
```

---

## 11. نقاط التحسين المستقبلية (Future Improvements)

| # | التحسين | التأثير المتوقع |
|---|---------|----------------|
| 1 | **Fine-tuning** على بيانات المستخدم | ردود أدق وأكثر تخصصاً |
| 2 | **Reranking Model** بعد البحث الدلالي | تحسين جودة النتائج المسترجعة |
| 3 | **Hybrid Search** (Dense + Sparse) | تغطية أفضل للاستعلامات الدقيقة |
| 4 | **Multi-hop RAG** | إجابة أسئلة تتطلب ربط معلومات من عدة مستندات |
| 5 | **Adaptive Chunking** | تقطيع يراعي بنية المستند (عناوين، أقسام) |
| 6 | **Caching Layer** | تسريع الاستعلامات المتكررة |
| 7 | **Model Evaluation Pipeline** | مقارنة منهجية بين النماذج على مهام محددة |
| 8 | **Local Model Support** | تشغيل نماذج محلية (Ollama) لعدم الاعتماد على APIs |

---

## 12. الخلاصة (Conclusion)

النموذج الأساسي (Baseline Model) للمشروع يعتمد على:

1. **Agentic RAG Architecture** — وكيل ذكي يجمع بين الاسترجاع والتوليد
2. **7 نماذج LLM** من 3 مزودين مع Smart Fallback
3. **Triple RAG System** — 3 مصادر بيانات (مستندات، توثيقات، أكواد)
4. **Streaming (SSE)** — بث مباشر للردود حرف بحرف
5. **Python Sandbox** — تنفيذ آمن لأكواد تحليل البيانات
6. **Memory Management** — ذاكرة محادثة مع تلخيص تلقائي

هذه البنية توفر أساساً قوياً وقابلاً للتوسع لبناء مساعد شخصي ذكي يلبي احتياجات متنوعة.
