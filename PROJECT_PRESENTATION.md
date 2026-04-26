<div dir="rtl">

# 🤖 المساعد الذكي الشخصي — Agentic Personal Assistant

## عرض المشروع التقني الشامل | Full Project Presentation

---

<div align="center">

### نظام ذكاء اصطناعي متكامل مع RAG وتعدد مزوّدات الـ AI

**Express.js · React 19 · Pinecone · LangChain · Tailwind CSS**

</div>

---

## 📋 جدول المحتويات

| #   | القسم                                                          | الوصف                      |
| --- | -------------------------------------------------------------- | -------------------------- |
| 1   | [نظرة عامة على المشروع](#-1-نظرة-عامة-على-المشروع)             | ماهو المشروع ولماذا؟       |
| 2   | [المعمارية التقنية](#-2-المعمارية-التقنية)                     | البنية العامة والتقنيات    |
| 3   | [التقنيات المستخدمة](#-3-التقنيات-المستخدمة)                   | كل المكتبات والأدوات       |
| 4   | [نظام المصادقة والمستخدمين](#-4-نظام-المصادقة-والمستخدمين)     | تسجيل الدخول والصلاحيات    |
| 5   | [نظام المحادثات والـ AI](#-5-نظام-المحادثات-والـ-ai)           | المحادثات والبث المباشر    |
| 6   | [مزوّدات الذكاء الاصطناعي](#-6-مزوّدات-الذكاء-الاصطناعي)       | Gemini, Groq, OpenRouter   |
| 7   | [الشخصيات (Personas/Prompts)](#-7-الشخصيات-personasprompts)    | أنماط المحادثة             |
| 8   | [نظام رفع المستندات والـ RAG](#-8-نظام-رفع-المستندات-والـ-rag) | رفع الملفات والبحث المتجهي |
| 9   | [Developer Docs Helper](#-9-developer-docs-helper)             | نظام التوثيقات البرمجية    |
| 10  | [البحث في الويب](#-10-البحث-في-الويب)                          | تكامل Tavily               |
| 11  | [محسّن الـ Prompt](#-11-محسّن-الـ-prompt)                      | تحسين الأسئلة تلقائياً     |
| 12  | [لوحة الأدمن](#-12-لوحة-الأدمن)                                | إدارة المستخدمين والنظام   |
| 13  | [الإحصائيات والتحليلات](#-13-الإحصائيات-والتحليلات)            | رسوم بيانية واستخدام       |
| 14  | [قاعدة البيانات](#-14-قاعدة-البيانات)                          | الجداول والعلاقات          |
| 15  | [واجهات API](#-15-واجهات-api-الكاملة)                          | كل الـ Endpoints           |
| 16  | [واجهة المستخدم](#-16-واجهة-المستخدم)                          | الصفحات والمكوّنات         |
| 17  | [هيكل الملفات](#-17-هيكل-الملفات-الكامل)                       | خريطة المشروع              |
| 18  | [الأمان](#-18-الأمان)                                          | الحماية والتشفير           |
| 19  | [المتغيرات البيئية](#-19-المتغيرات-البيئية)                    | Environment Variables      |
| 20  | [كيفية التشغيل](#-20-كيفية-التشغيل)                            | خطوات التشغيل              |

---

## 🎯 1. نظرة عامة على المشروع

### ما هو هذا المشروع؟

**المساعد الذكي الشخصي** هو تطبيق ويب متكامل يعمل كمساعد ذكاء اصطناعي شخصي يدعم:

- 💬 **محادثات ذكية** مع بث مباشر (SSE Streaming)
- 🧠 **تعدد مزوّدات AI** — Google Gemini, Groq, OpenRouter (7 نماذج)
- 📄 **رفع مستندات** (PDF, DOCX, PPTX, TXT, CSV) والبحث فيها بالـ RAG
- 📚 **توثيقات المطورين** — زحف وفهرسة 10 frameworks رسمية
- 🌐 **بحث في الويب** عبر Tavily API
- ✨ **تحسين الأسئلة تلقائياً** بنموذج Llama 3.3 70B
- 🎭 **5 شخصيات AI جاهزة** + إنشاء شخصيات مخصصة
- 🖼️ **دعم الوسائط** — صور وصوت في المحادثات
- 📊 **لوحة إحصائيات** مع رسوم بيانية
- 🛡️ **لوحة أدمن** لإدارة المستخدمين والنظام
- 🌙 **وضع داكن/فاتح**

### لمن هذا المشروع؟

- مطورين يحتاجون مساعد ذكي يفهم التوثيقات الرسمية
- فرق عمل تريد مساعد AI خاص يبحث في مستنداتهم
- أي شخص يريد محادثة AI متقدمة مع مصادر معرفية خاصة

---

## 🏗 2. المعمارية التقنية

### البنية العامة

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AGENTIC PERSONAL ASSISTANT                      │
│                    نظام مساعد ذكاء اصطناعي شخصي متكامل                  │
└─────────────────────────────────────────────────────────────────────────┘

╔════════════════════╗         ╔══════════════════════╗
║   CLIENT (React)   ║         ║   SERVER (Express)   ║
║                    ║  HTTP   ║                      ║
║  React 19 + Vite   ║ ◄────► ║  Node.js + Express   ║
║  Tailwind CSS v4   ║  SSE   ║  LangChain           ║
║  React Router v7   ║  JWT   ║  Pinecone            ║
╚════════════════════╝         ╚═══════╦══════════════╝
                                       ║
                    ┌──────────────────┼──────────────────┐
                    │                  │                   │
              ╔═════╧═════╗    ╔═══════╧══════╗    ╔══════╧══════╗
              ║  SQLite   ║    ║  Pinecone    ║    ║ AI Models   ║
              ║ (Local)   ║    ║ (Vector DB)  ║    ║ (External)  ║
              ║           ║    ║              ║    ║             ║
              ║ • Users   ║    ║ • user_{id}  ║    ║ • Gemini    ║
              ║ • Chats   ║    ║   namespace  ║    ║ • Groq      ║
              ║ • Docs    ║    ║ • dev_docs   ║    ║ • OpenRouter║
              ║ • Prefs   ║    ║   namespace  ║    ║ • Tavily    ║
              ╚═══════════╝    ╚══════════════╝    ╚═════════════╝
```

### تدفق الطلب الكامل (Request Flow)

```
  المستخدم يكتب سؤال
       │
       ▼
  ┌─────────────┐    POST /api/chat/stream (FormData + JWT)
  │  React App  │ ──────────────────────────────────────────►
  │  (Browser)  │                                           │
  └─────────────┘                                           ▼
                                                   ┌──────────────┐
                                                   │  Express.js  │
                                                   │   Server     │
                                                   └──────┬───────┘
                                                          │
                                    ┌─────────────────────┼─────────────────────┐
                                    │                     │                     │
                              ┌─────▼─────┐        ┌─────▼─────┐        ┌──────▼─────┐
                              │ Knowledge │        │ DevDocs   │        │ Web Search │
                              │ Base RAG  │        │ RAG       │        │ (Tavily)   │
                              │ (Pinecone)│        │ (Pinecone)│        │            │
                              └─────┬─────┘        └─────┬─────┘        └──────┬─────┘
                                    │                     │                     │
                                    └─────────────┬───────┘─────────────────────┘
                                                  │
                                                  ▼
                                         ┌────────────────┐
                                         │ System Prompt   │
                                         │ + KB Context    │
                                         │ + Docs Context  │
                                         │ + Web Results   │
                                         │ + User Message  │
                                         └───────┬────────┘
                                                  │
                                                  ▼
                                         ┌────────────────┐
                                         │  AI Provider   │
                                         │ (Gemini/Groq/  │
                                         │  OpenRouter)   │
                                         └───────┬────────┘
                                                  │ SSE Stream
  ┌─────────────┐    ◄── text/event-stream ───────┘
  │  React App  │    data: {"type":"token","content":"..."}
  │  (Browser)  │    data: {"type":"done","messageId":"..."}
  └─────────────┘
```

---

## 🛠 3. التقنيات المستخدمة

### Backend (السيرفر)

| التقنية                         | الإصدار | الاستخدام                          |
| ------------------------------- | ------- | ---------------------------------- |
| **Node.js**                     | 22.x    | بيئة التشغيل                       |
| **Express.js**                  | 5.x     | إطار الـ API                       |
| **LangChain**                   | 1.x+    | تكامل AI + RAG + أدوات             |
| **@langchain/google-genai**     | —       | Google Gemini provider             |
| **@langchain/groq**             | —       | Groq provider                      |
| **@langchain/openai**           | —       | OpenRouter (ChatOpenAI compatible) |
| **@langchain/pinecone**         | —       | Pinecone vector store              |
| **@langchain/textsplitters**    | —       | تقسيم النصوص                       |
| **@langchain/community**        | —       | PDF loader + أدوات إضافية          |
| **@pinecone-database/pinecone** | 5.1.2   | عميل Pinecone                      |
| **better-sqlite3**              | —       | قاعدة بيانات محلية (WAL mode)      |
| **bcryptjs**                    | —       | تشفير كلمات المرور                 |
| **jsonwebtoken**                | —       | JWT tokens                         |
| **multer**                      | —       | رفع الملفات                        |
| **cheerio**                     | —       | تحليل HTML (الزاحف)                |
| **mammoth**                     | —       | قراءة DOCX                         |
| **officeparser**                | —       | قراءة PPTX                         |
| **pdf-parse**                   | —       | قراءة PDF                          |
| **zod**                         | —       | التحقق من البيانات                 |
| **p-limit**                     | —       | التحكم في التزامن                  |
| **dotenv**                      | —       | متغيرات البيئة                     |
| **cors**                        | —       | Cross-Origin Resource Sharing      |

### Frontend (العميل)

| التقنية                      | الإصدار | الاستخدام                |
| ---------------------------- | ------- | ------------------------ |
| **React**                    | 19.2.0  | إطار الواجهة             |
| **Vite**                     | 7.2.4   | أداة البناء              |
| **React Router**             | 7.13.1  | التوجيه (SPA)            |
| **Tailwind CSS**             | 4.2.1   | التنسيق                  |
| **react-markdown**           | 10.1.0  | عرض Markdown             |
| **remark-gfm**               | —       | GitHub Flavored Markdown |
| **remark-math**              | —       | معادلات رياضية           |
| **rehype-katex**             | —       | عرض KaTeX                |
| **katex**                    | 0.16.35 | محرك المعادلات           |
| **react-syntax-highlighter** | 16.1.1  | تلوين الأكواد            |
| **recharts**                 | 3.7.0   | رسوم بيانية              |

### بنية تحتية

| الخدمة                   | الاستخدام                              |
| ------------------------ | -------------------------------------- |
| **Pinecone** (Free Tier) | قاعدة بيانات متجهية — تخزين embeddings |
| **Google Gemini API**    | نموذج AI (دعم 6 مفاتيح مع تدوير)       |
| **Groq API**             | نماذج AI سريعة (Llama, Qwen, Kimi)     |
| **OpenRouter API**       | نماذج مجانية (Gemma 3)                 |
| **Tavily API**           | بحث في الويب                           |

---

## 🔐 4. نظام المصادقة والمستخدمين

### كيف يعمل؟

```
التسجيل                                  تسجيل الدخول
┌───────────────┐                      ┌───────────────┐
│ name          │                      │ email         │
│ email         │ → bcrypt(password)   │ password      │ → bcrypt.compare()
│ password (≥6) │ → INSERT users       │               │ → SELECT user
└───────┬───────┘                      └───────┬───────┘
        │                                      │
        ▼                                      ▼
   JWT Token  ◄──────────────────────────  JWT Token
   (expires: 7 days)                     (expires: 7 days)
        │
        ▼
   localStorage.setItem("token", ...)
   localStorage.setItem("user", JSON.stringify(...))
```

### الصلاحيات

| الصلاحية                 | المستخدم العادي | الأدمن |
| ------------------------ | :-------------: | :----: |
| المحادثات                |       ✅        |   ✅   |
| رفع المستندات            |       ✅        |   ✅   |
| البحث في المستندات       |       ✅        |   ✅   |
| تفعيل DevDocs            |       ✅        |   ✅   |
| تثبيت DevDocs Frameworks |       ❌        |   ✅   |
| حذف DevDocs Frameworks   |       ❌        |   ✅   |
| إدارة المستخدمين         |       ❌        |   ✅   |
| إحصائيات النظام          |       ❌        |   ✅   |
| تفعيل/تعطيل حسابات       |       ❌        |   ✅   |
| ترقية الصلاحيات          |       ❌        |   ✅   |

### تدفق الحماية (Middleware)

```
كل طلب API
     │
     ▼
requireAuth(req, res, next)
     │
     ├── لا يوجد Token → 401 "غير مصرح"
     │
     ├── Token منتهي → 401 "غير مصرح"
     │
     └── Token صالح → req.user = { id, email, name, role }
                           │
                           ▼
                    requireAdmin (اختياري)
                           │
                           ├── role ≠ "admin" → 403 "صلاحيات المسؤول مطلوبة"
                           │
                           └── role === "admin" → next() ✓
```

---

## 💬 5. نظام المحادثات والـ AI

### الميزات الأساسية

- **محادثات متعددة** — كل مستخدم لديه محادثات مستقلة
- **بث مباشر (SSE)** — الرد يظهر كلمة بكلمة في الوقت الحقيقي
- **تاريخ المحادثات** — آخر 20 رسالة تُحمّل كسياق
- **تلخيص تلقائي** — عند تجاوز 30 رسالة، الرسائل القديمة تُلخّص
- **دعم الوسائط** — صور (JPEG, PNG, GIF, WebP) + صوت (MP3, WAV, WebM, OGG, MP4)
- **تثبيت المحادثات** — Pin/Unpin
- **بحث في المحادثات** — بحث بالعنوان
- **وسوم (Tags)** — تصنيف المحادثات
- **إعادة تسمية** — تعديل عنوان المحادثة

### تدفق إرسال رسالة (مع البث المباشر)

````
  المستخدم يكتب رسالة + يختار media (اختياري)
         │
         ▼
  ┌─── FormData ────────────────────────────────────────────┐
  │  message: "كيف أعمل authentication في Laravel?"        │
  │  conversationId: "conv_abc123"                          │
  │  provider: "groq"                                       │
  │  model: "llama-3.3-70b-versatile"                      │
  │  media: [image.png]          (اختياري)                  │
  │  devDocsMode: "true"         (اختياري)                  │
  │  devDocsFrameworks: '["laravel"]'  (اختياري)            │
  │  enableWebSearch: "true"     (اختياري)                  │
  │  optimize: "true"            (اختياري)                  │
  │  promptId: "2"               (اختياري — الشخصية)        │
  └─────────────────────────────────────────────────────────┘
         │
  POST /api/chat/stream  (Authorization: Bearer <token>)
         │
         ▼
  ┌──── السيرفر ────────────────────────────────────────────┐
  │                                                          │
  │  1. حفظ رسالة المستخدم في DB                             │
  │  2. تحميل تاريخ المحادثة (آخر 20 رسالة)                  │
  │  3. البحث في قاعدة المعرفة (Pinecone user namespace)     │
  │  4. البحث في DevDocs (Pinecone dev_docs namespace)       │
  │  5. البحث في الويب (Tavily — إذا مفعّل)                  │
  │  6. تحسين السؤال (Groq — إذا مفعّل)                      │
  │  7. بناء System Prompt + كل السياقات                      │
  │  8. استدعاء نموذج AI مع البث                              │
  │                                                          │
  └─────────────────────────────────┬────────────────────────┘
                                    │
              ◄── SSE Events ───────┘
              │
              ├── data: {"type":"token","content":"## المصادقة\n"}
              ├── data: {"type":"token","content":"لإعداد..."}
              ├── data: {"type":"token","content":"```php\n"}
              ├── ... (كلمة بكلمة)
              ├── data: {"type":"done","messageId":152,"provider":"groq"}
              └── (connection closed)
````

### تلخيص المحادثات الطويلة

```
عدد الرسائل > 30؟
     │
     ├── لا → تحميل آخر 20 رسالة عادياً
     │
     └── نعم → تلخيص الرسائل القديمة
                    │
                    ▼
              ┌──────────────────────────────────────┐
              │ نموذج Groq يُنشئ ملخص مختصر:         │
              │ "المستخدم ناقش routing في Laravel     │
              │  وأعداد middleware وcontrollers..."   │
              │                                      │
              │ الملخص يُحفظ في conversations.summary │
              │ الرسائل القديمة تُحذف (آخر 20 تبقى)  │
              └──────────────────────────────────────┘
```

---

## 🤖 6. مزوّدات الذكاء الاصطناعي

### النماذج المتاحة (7 نماذج)

| #   | النموذج                   | المزوّد    | الوصف                      | الافتراضي |
| --- | ------------------------- | ---------- | -------------------------- | :-------: |
| 1   | **Llama 3.3 70B**         | Groq       | الأقوى والموصى به          |    ✅     |
| 2   | **Kimi K2 Instruct**      | Groq       | Moonshot AI، ذكاء عالي     |     —     |
| 3   | **Qwen3 32B**             | Groq       | Alibaba، تفكير عميق        |     —     |
| 4   | **Llama 4 Maverick 17B**  | Groq       | أحدث إصدار من Llama 4      |     —     |
| 5   | **Llama 3.1 8B**          | Groq       | الأسرع، خفيف الوزن         |     —     |
| 6   | **Gemma 3 12B**           | OpenRouter | مجاني من Google            |     —     |
| 7   | **Gemini 2.5 Flash Lite** | Gemini     | Google (مع تدوير المفاتيح) |     —     |

### نظام تدوير مفاتيح Gemini

```
6 مفاتيح API (GOOGLE_API_KEY → GOOGLE_API_KEY_6)
     │
     ▼
  ┌────────────────────────────────────────────────┐
  │  Key 1 ── استخدام ──→ 429 (limit) ──→ محظور   │
  │  Key 2 ── استخدام ──→ 429 (quota) ──→ محظور 6h│
  │  Key 3 ── استخدام ──→ ✅ نجاح                  │
  │  Key 4 ── احتياطي                               │
  │  Key 5 ── احتياطي                               │
  │  Key 6 ── احتياطي                               │
  └────────────────────────────────────────────────┘

  حالات الحظر:
  • Rate Limit (RPM)  → حظر مؤقت (دقائق)
  • Daily Quota       → حظر 6 ساعات
  • كل المفاتيح محظورة → ينتقل إلى Groq (fallback)
```

### سلسلة الاحتياط (Fallback Chain)

```
النموذج المختار (مثلاً Gemini)
     │
     ├── نجح → ✅ إرجاع النتيجة
     │
     └── فشل (429/error)
          │
          ▼
     تدوير المفاتيح (Gemini: 3 محاولات)
          │
          ├── نجح → ✅ إرجاع النتيجة
          │
          └── كل المفاتيح فشلت
               │
               ▼
     الانتقال إلى Groq (Llama 3.3 70B)
               │
               ├── نجح → ✅ إرجاع النتيجة
               │
               └── فشل → الانتقال إلى OpenRouter
                              │
                              ├── نجح → ✅ إرجاع النتيجة
                              │
                              └── فشل → ❌ خطأ للمستخدم
```

---

## 🎭 7. الشخصيات (Personas/Prompts)

### 5 شخصيات افتراضية

| #   | الشخصية          | الأيقونة | الاستخدام             |
| --- | ---------------- | -------- | --------------------- |
| 1   | **مساعد عام**    | 🤖       | إجابات شاملة لأي سؤال |
| 2   | **مطور برمجيات** | 💻       | أكواد ومساعدة تقنية   |
| 3   | **كاتب محتوى**   | ✍️       | كتابة مقالات ومحتوى   |
| 4   | **مترجم**        | 🌐       | ترجمة بين اللغات      |
| 5   | **محلل بيانات**  | 📊       | تحليل بيانات ورسوم    |

### كيف تعمل الشخصيات؟

```
المستخدم يختار شخصية "مطور برمجيات"
     │
     ▼
  System Prompt يُبنى بناءً على الشخصية المختارة
     │
     ▼
  "أنت مطور برمجيات خبير. ساعد المستخدم في كتابة
   أكواد نظيفة وفعّالة. قدم أمثلة عملية مع شرح..."
     │
     + سياق قاعدة المعرفة (إذا وُجد)
     + سياق DevDocs (إذا مفعّل)
     + نتائج بحث الويب (إذا مفعّل)
     │
     ▼
  Prompt كامل يُرسل إلى AI
```

الشخصيات المخصصة: المستخدم يمكنه إنشاء شخصيات خاصة مع System Prompt مخصص.

---

## 📄 8. نظام رفع المستندات والـ RAG

### المفهوم: Retrieval-Augmented Generation

```
بدون RAG:                          مع RAG:
┌──────────┐                      ┌──────────┐
│ سؤال     │                      │ سؤال     │
│    ↓     │                      │    ↓     │
│ AI Model │                      │ البحث في │
│ (ذاكرة   │                      │ مستنداتك │
│  قديمة)  │                      │    ↓     │
│    ↓     │                      │ سياق     │
│ إجابة    │                      │ + AI     │
│ (قد تكون │                      │    ↓     │
│  خاطئة)  │                      │ إجابة    │
└──────────┘                      │ دقيقة ✓  │
                                  └──────────┘
```

### الملفات المدعومة

| النوع    | المكتبة                        | الحجم الأقصى |
| -------- | ------------------------------ | ------------ |
| **PDF**  | @langchain/community PDFLoader | 25 MB        |
| **DOCX** | mammoth                        | 25 MB        |
| **PPTX** | officeparser                   | 25 MB        |
| **TXT**  | fs/readFile                    | 25 MB        |
| **CSV**  | fs/readFile                    | 25 MB        |

### خط أنابيب المعالجة

```
  المستخدم يرفع ملف PDF
         │
         ▼
  ┌───────────────────────────────────────────────────────────┐
  │  1. Multer يستقبل الملف (حد: 25MB)                        │
  │  2. يُحفظ في /uploads/ مؤقتاً                              │
  │  3. يُسجّل في DB (status: "processing")                    │
  │                                                            │
  │  4. DocumentLoader يقرأ الملف حسب النوع:                    │
  │     • PDF  → PDFLoader (يقرأ كل صفحة)                      │
  │     • DOCX → mammoth (يحوّل إلى نص)                         │
  │     • PPTX → officeparser (يستخرج النص)                     │
  │     • TXT  → readFile (يقرأ مباشرة)                         │
  │     • CSV  → readFile (يقرأ كنص)                            │
  │                                                            │
  │  5. RecursiveCharacterTextSplitter:                         │
  │     • حجم القطعة: 1,000 حرف                                │
  │     • التداخل: 200 حرف                                     │
  │                                                            │
  │  6. كل قطعة تُضاف لها metadata:                             │
  │     { docId, userId, source: filename }                    │
  │                                                            │
  │  7. رفع إلى Pinecone (namespace: user_{userId})            │
  │     • بدفعات 96 vectors لكل طلب                             │
  │     • Embedding: llama-text-embed-v2                        │
  │                                                            │
  │  8. تحديث DB (status: "ready", chunk_count)                │
  └───────────────────────────────────────────────────────────┘
```

### كيف يُستخدم RAG في المحادثة؟

```
  المستخدم يسأل سؤال
         │
         ▼
  searchKnowledgeBase(userId, query)
         │
         ├── يبحث في Pinecone (namespace: user_{userId})
         ├── Similarity Search (أقرب 4 نتائج)
         ├── مهلة: 4 ثوانٍ
         │
         ▼
  النتائج تُضاف إلى System Prompt:
  ┌─────────────────────────────────────────┐
  │ ## معلومات من قاعدة معارفك الشخصية:     │
  │                                          │
  │ [من: company-policy.pdf]                 │
  │ "إجازة الموظف السنوية 21 يوم عمل..."    │
  │                                          │
  │ [من: handbook.docx]                      │
  │ "ساعات العمل من 9ص إلى 5م..."           │
  └─────────────────────────────────────────┘
```

---

## 📚 9. Developer Docs Helper

### المفهوم

نظام **RAG متخصص** يزحف مواقع التوثيق الرسمية للـ frameworks ويخزّنها كـ vectors لاستخدامها في المحادثات.

### الأُطر المدعومة (10 Frameworks)

| #   | Framework      | الأيقونة | الإصدار | الفئة    | الحد الأقصى |
| --- | -------------- | -------- | ------- | -------- | ----------- |
| 1   | **React**      | ⚛️       | 19      | Frontend | 300 صفحة    |
| 2   | **Next.js**    | ▲        | 15      | Frontend | 250 صفحة    |
| 3   | **Laravel**    | 🔴       | 12      | Backend  | 200 صفحة    |
| 4   | **Node.js**    | 🟢       | 22      | Backend  | 150 صفحة    |
| 5   | **Python**     | 🐍       | 3.12    | Backend  | 400 صفحة    |
| 6   | **FastAPI**    | ⚡       | 0.115   | Backend  | 150 صفحة    |
| 7   | **Django**     | 🟢       | 5.1     | Backend  | 300 صفحة    |
| 8   | **Docker**     | 🐋       | Latest  | DevOps   | 200 صفحة    |
| 9   | **Kubernetes** | ☸️       | 1.31    | DevOps   | 250 صفحة    |
| 10  | **Git**        | 🔀       | Latest  | DevOps   | 150 صفحة    |

### خط أنابيب التثبيت (4 مراحل)

````
  الأدمن يضغط "تثبيت"
         │
  ═══════╪════════════════════════════════════════════════════
  المرحلة 1: الزاحف (Crawler)
  ═══════╪════════════════════════════════════════════════════
         │
         ▼
  ┌──────────────────────────────────────────────────────────┐
  │  • يبدأ من seedUrls + baseUrl                            │
  │  • يتبع الروابط حسب linkSelector (CSS)                   │
  │  • بحث عرضي (BFS) — نفس الدومين فقط                     │
  │  • تأخير 600ms بين الطلبات                               │
  │  • مهلة 15 ثانية لكل طلب                                │
  │  • يتجاهل: PDF, PNG, CSS, JS                            │
  │  • يُرجع: [{url, html}, ...]                            │
  └──────────────────────────────────────────────────────────┘
         │
  ═══════╪════════════════════════════════════════════════════
  المرحلة 2: المحلّل (Parser)
  ═══════╪════════════════════════════════════════════════════
         │
         ▼
  ┌──────────────────────────────────────────────────────────┐
  │  • يحذف: nav, footer, sidebar, scripts                  │
  │  • يستخرج العنوان من <h1>                                │
  │  • يحوّل الأكواد إلى ```code blocks                      │
  │  • يحوّل العناوين إلى # Markdown                         │
  │  • يتجاهل صفحات < 100 حرف                                │
  │  • يُرجع: [{title, content, url, framework}, ...]       │
  └──────────────────────────────────────────────────────────┘
         │
  ═══════╪════════════════════════════════════════════════════
  المرحلة 3: المُفهرس (Indexer)
  ═══════╪════════════════════════════════════════════════════
         │
         ▼
  ┌──────────────────────────────────────────────────────────┐
  │  • RecursiveCharacterTextSplitter                        │
  │    - حجم القطعة: 1,500 حرف                              │
  │    - التداخل: 300 حرف                                   │
  │  • Metadata لكل قطعة:                                    │
  │    { framework, title, url, version, source }            │
  │  • رفع بدفعات 96 vectors                                 │
  │  • Namespace: "dev_docs"                                 │
  └──────────────────────────────────────────────────────────┘
         │
  ═══════╪════════════════════════════════════════════════════
  المرحلة 4: التحديث (DB Update)
  ═══════╪════════════════════════════════════════════════════
         │
         ▼
  status: "installing" → "ready" ✓
  chunk_count: 3036
  page_count: 100
````

### الأرقام الفعلية المُثبّتة حالياً

| Framework     | الصفحات المزحوفة | القطع (Vectors) | الحالة  |
| ------------- | :--------------: | :-------------: | :-----: |
| React 19      |       185        |      1,549      | ✅ جاهز |
| Node.js 22    |        84        |      3,103      | ✅ جاهز |
| Python 3.12   |       400        |      8,756      | ✅ جاهز |
| FastAPI 0.115 |       107        |      1,488      | ✅ جاهز |
| Laravel 12    |       100        |      3,036      | ✅ جاهز |
| **المجموع**   |     **876**      |   **17,932**    |    —    |

### مسار البحث أثناء المحادثة

```
  المستخدم: "How to create middleware in Laravel?"
         │
         ▼
  searchDevDocs(query, ["laravel"], topK=5)
         │
         ├── Embedding: llama-text-embed-v2
         ├── Pinecone namespace: "dev_docs"
         ├── Filter: { framework: { $in: ["laravel"] } }
         ├── Top-K: 5 نتائج
         ├── مهلة: 5 ثوانٍ
         │
         ▼
  ┌─────────────────────────────────────────────────────┐
  │  ## Developer Documentation Context                  │
  │                                                      │
  │  [Laravel — Middleware](https://laravel.com/docs/...) │
  │  "Middleware provide a convenient mechanism for       │
  │   inspecting and filtering HTTP requests..."         │
  │                                                      │
  │  [Laravel — Routing](https://laravel.com/docs/...)    │
  │  "All Laravel routes are defined in your route       │
  │   files, which are located in the routes dir..."     │
  └─────────────────────────────────────────────────────┘
         │
         ▼
  يُضاف إلى System Prompt → AI يُجيب بناءً على التوثيق الرسمي ✓
```

---

## 🌐 10. البحث في الويب

### تكامل Tavily API

```
  المستخدم يفعّل 🌐 "بحث" ويسأل سؤال
         │
         ▼
  webSearch(query)
         │
         ├── Tavily REST API
         ├── Max Results: 5
         │
         ▼
  ┌─────────────────────────────────────────┐
  │  🌐 نتائج البحث في الويب:               │
  │                                          │
  │  1. [عنوان](رابط)                       │
  │     "ملخص المحتوى..."                    │
  │                                          │
  │  2. [عنوان](رابط)                       │
  │     "ملخص المحتوى..."                    │
  │     ...                                  │
  └─────────────────────────────────────────┘
         │
         ▼
  يُضاف إلى System Prompt كسياق إضافي
```

---

## ✨ 11. محسّن الـ Prompt

### كيف يعمل؟

```
  المستخدم يكتب: "اشرح react hooks"
         │
         ├── optimize = true
         │
         ▼
  Groq (llama-3.3-70b-versatile, temp: 0.2)
         │
  System: "أنت خبير في هندسة الـ Prompts.
           حسّن الـ prompt التالي ليكون أكثر
           وضوحاً وتحديداً..."
         │
         ▼
  "اشرح React Hooks بالتفصيل مع أمثلة عملية
   لكل من useState, useEffect, useContext.
   قارن بين الـ Class Components والـ Hooks
   من حيث الأداء وقابلية القراءة."
         │
         ▼
  السؤال المحسّن يُرسل إلى AI بدلاً من الأصلي
```

**القواعد:**

- يحتفظ بنفس اللغة (عربي → عربي، English → English)
- يتجاهل أسئلة أقل من 5 أحرف
- إذا فشل Groq، يُستخدم السؤال الأصلي (graceful fallback)

---

## 🛡 12. لوحة الأدمن

### إحصائيات النظام

```
  ┌──────────────────────────────────────────────┐
  │           📊 لوحة تحكم المسؤول               │
  ├──────────┬──────────┬──────────┬─────────────┤
  │ المستخدمين│ النشطين  │ المحادثات │ رسائل اليوم │
  │    25    │    18    │    142   │     89      │
  ├──────────┴──────────┴──────────┴─────────────┤
  │                                               │
  │  👤 أحمد محمد                                  │
  │     ahmed@email.com | admin | نشط              │
  │     📝 15 محادثة | 💬 234 رسالة | 📄 5 ملفات   │
  │     [تعطيل] [تخفيض إلى مستخدم]                │
  │                                               │
  │  👤 سارة علي                                   │
  │     sara@email.com | user | نشط                │
  │     📝 8 محادثات | 💬 95 رسالة | 📄 2 ملفات     │
  │     [تعطيل] [ترقية إلى أدمن]                   │
  │                                               │
  └──────────────────────────────────────────────┘
```

### صلاحيات الأدمن

| العملية           | الوصف                    |
| ----------------- | ------------------------ |
| تفعيل/تعطيل حساب  | إيقاف مستخدم عن الدخول   |
| ترقية إلى أدمن    | منح صلاحيات إدارية       |
| تخفيض إلى مستخدم  | إزالة صلاحيات إدارية     |
| تثبيت DevDocs     | زحف وفهرسة توثيقات جديدة |
| حذف DevDocs       | إزالة توثيقات مثبّتة     |
| مشاهدة الإحصائيات | إحصائيات النظام الكلية   |

---

## 📊 13. الإحصائيات والتحليلات

### الرسوم البيانية

- **Area Chart:** عدد الرسائل اليومية (آخر 30 يوم)
- **Donut Chart:** توزيع أنواع الملفات المرفوعة

### الإحصائيات المعروضة

| الإحصائية        | الوصف                     |
| ---------------- | ------------------------- |
| إجمالي الرسائل   | كل رسائل المستخدم والـ AI |
| إجمالي المحادثات | عدد المحادثات             |
| إجمالي المستندات | عدد الملفات المرفوعة      |
| إجمالي القطع     | عدد vectors في Pinecone   |
| توزيع الأدوار    | رسائل المستخدم vs الـ AI  |
| الرسائل اليومية  | تقسيم يومي آخر 30 يوم     |
| أنواع الملفات    | PDF vs DOCX vs TXT etc.   |

---

## 🗄 14. قاعدة البيانات

### SQLite مع WAL Mode

8 جداول:

```sql
── 1. users ──────────────────────────────────────────
id          INTEGER PRIMARY KEY
email       TEXT UNIQUE NOT NULL
password    TEXT NOT NULL              -- bcrypt hash
name        TEXT NOT NULL
role        TEXT DEFAULT 'user'        -- 'user' | 'admin'
is_active   INTEGER DEFAULT 1         -- 1=نشط, 0=معطّل
created_at  TEXT DEFAULT datetime('now')

── 2. conversations ──────────────────────────────────
id          INTEGER PRIMARY KEY
user_id     INTEGER → users(id)
title       TEXT NOT NULL
summary     TEXT                       -- ملخص تلقائي
prompt_id   INTEGER → prompts(id)      -- الشخصية
ai_provider TEXT
ai_model    TEXT
is_pinned   INTEGER DEFAULT 0
tags        TEXT                        -- JSON array
created_at  TEXT
updated_at  TEXT

── 3. messages ───────────────────────────────────────
id              INTEGER PRIMARY KEY
user_id         INTEGER → users(id)
conversation_id INTEGER → conversations(id)
role            TEXT     -- 'user' | 'ai'
content         TEXT NOT NULL
media_type      TEXT     -- 'image' | 'audio' | NULL
media_url       TEXT
created_at      TEXT

── 4. documents ──────────────────────────────────────
id             INTEGER PRIMARY KEY
user_id        INTEGER → users(id)
filename       TEXT NOT NULL
original_name  TEXT NOT NULL
file_size      INTEGER
file_type      TEXT             -- 'pdf', 'docx', etc.
chunk_count    INTEGER DEFAULT 0
status         TEXT              -- 'processing' | 'ready' | 'error'
created_at     TEXT

── 5. prompts ────────────────────────────────────────
id             INTEGER PRIMARY KEY
user_id        INTEGER → users(id)   -- NULL = default prompt
name           TEXT NOT NULL
description    TEXT
system_prompt  TEXT NOT NULL
icon           TEXT
is_default     INTEGER DEFAULT 0
created_at     TEXT

── 6. user_settings ──────────────────────────────────
user_id            INTEGER PRIMARY KEY → users(id)
default_provider   TEXT
default_model      TEXT
groq_api_key       TEXT                -- مشفّر
openrouter_api_key TEXT                -- مشفّر
auto_optimize      INTEGER DEFAULT 0
updated_at         TEXT

── 7. dev_docs_packs ─────────────────────────────────
id             INTEGER PRIMARY KEY
framework      TEXT UNIQUE NOT NULL    -- "laravel", "react"
display_name   TEXT NOT NULL
icon           TEXT DEFAULT '📦'
version        TEXT
status         TEXT                    -- 'available'|'installing'|'ready'|'error'
docs_url       TEXT
chunk_count    INTEGER DEFAULT 0
page_count     INTEGER DEFAULT 0
installed_at   TEXT
installed_by   INTEGER → users(id)
error_message  TEXT
created_at     TEXT

── 8. dev_docs_user_prefs ────────────────────────────
user_id    INTEGER → users(id) ON DELETE CASCADE
framework  TEXT NOT NULL
enabled    INTEGER DEFAULT 1
PRIMARY KEY (user_id, framework)
```

### العلاقات

```
  users ──1:N──→ conversations ──1:N──→ messages
    │
    ├──1:N──→ documents
    │
    ├──1:N──→ prompts (custom)
    │
    ├──1:1──→ user_settings
    │
    └──1:N──→ dev_docs_user_prefs

  dev_docs_packs ──→ (standalone, admin-managed)
```

---

## 🌐 15. واجهات API الكاملة

### المصادقة (Auth)

| Method | Endpoint             | Auth | الوصف           |
| ------ | -------------------- | :--: | --------------- |
| POST   | `/api/auth/register` |  ❌  | تسجيل حساب جديد |
| POST   | `/api/auth/login`    |  ❌  | تسجيل الدخول    |

### المحادثات (Conversations)

| Method | Endpoint                          | Auth | الوصف                         |
| ------ | --------------------------------- | :--: | ----------------------------- |
| GET    | `/api/conversations`              |  ✅  | قائمة المحادثات (مع بحث/tags) |
| POST   | `/api/conversations`              |  ✅  | إنشاء محادثة جديدة            |
| GET    | `/api/conversations/:id/messages` |  ✅  | رسائل محادثة                  |
| DELETE | `/api/conversations/:id`          |  ✅  | حذف محادثة                    |
| PUT    | `/api/conversations/:id/pin`      |  ✅  | تثبيت/إلغاء تثبيت             |
| PUT    | `/api/conversations/:id/rename`   |  ✅  | إعادة تسمية                   |
| PUT    | `/api/conversations/:id/prompt`   |  ✅  | تغيير الشخصية                 |
| PUT    | `/api/conversations/:id/tags`     |  ✅  | تعديل الوسوم                  |

### المحادثة مع AI

| Method | Endpoint           | Auth | الوصف                      |
| ------ | ------------------ | :--: | -------------------------- |
| POST   | `/api/chat`        |  ✅  | إرسال رسالة (بدون بث)      |
| POST   | `/api/chat/stream` |  ✅  | إرسال رسالة (بث مباشر SSE) |

### المستندات (Documents)

| Method | Endpoint             | Auth | الوصف                 |
| ------ | -------------------- | :--: | --------------------- |
| POST   | `/api/ingest`        |  ✅  | رفع ومعالجة ملف       |
| GET    | `/api/documents`     |  ✅  | قائمة المستندات       |
| DELETE | `/api/documents/:id` |  ✅  | حذف مستند (+ vectors) |

### الشخصيات (Prompts)

| Method | Endpoint           | Auth | الوصف                           |
| ------ | ------------------ | :--: | ------------------------------- |
| GET    | `/api/prompts`     |  ✅  | جلب الشخصيات (افتراضية + مخصصة) |
| POST   | `/api/prompts`     |  ✅  | إنشاء شخصية مخصصة               |
| DELETE | `/api/prompts/:id` |  ✅  | حذف شخصية مخصصة                 |

### الإعدادات (Settings)

| Method | Endpoint             | Auth | الوصف                 |
| ------ | -------------------- | :--: | --------------------- |
| GET    | `/api/user-settings` |  ✅  | جلب إعدادات المستخدم  |
| PUT    | `/api/user-settings` |  ✅  | حفظ الإعدادات         |
| POST   | `/api/test-provider` |  ✅  | اختبار مفتاح API      |
| GET    | `/api/models`        |  ✅  | قائمة النماذج المتاحة |

### DevDocs (التوثيقات البرمجية)

| Method | Endpoint                      |   Auth   | الوصف                       |
| ------ | ----------------------------- | :------: | --------------------------- |
| GET    | `/api/dev-docs/frameworks`    |    ✅    | كل الـ frameworks مع حالتها |
| POST   | `/api/dev-docs/install/:fw`   | 🔒 Admin | تثبيت framework             |
| DELETE | `/api/dev-docs/uninstall/:fw` | 🔒 Admin | حذف framework               |
| POST   | `/api/dev-docs/update/:fw`    | 🔒 Admin | إعادة فهرسة                 |
| GET    | `/api/dev-docs/status/:fw`    |    ✅    | حالة التثبيت                |
| GET    | `/api/dev-docs/my-prefs`      |    ✅    | تفضيلات المستخدم            |
| PUT    | `/api/dev-docs/my-prefs`      |    ✅    | حفظ التفضيلات               |

### الأدمن (Admin)

| Method | Endpoint                      |   Auth   | الوصف            |
| ------ | ----------------------------- | :------: | ---------------- |
| GET    | `/api/admin/stats`            | 🔒 Admin | إحصائيات النظام  |
| GET    | `/api/admin/users`            | 🔒 Admin | قائمة المستخدمين |
| PUT    | `/api/admin/users/:id/toggle` | 🔒 Admin | تفعيل/تعطيل حساب |
| PUT    | `/api/admin/users/:id/role`   | 🔒 Admin | تغيير الصلاحية   |

### الإحصائيات

| Method | Endpoint         | Auth | الوصف             |
| ------ | ---------------- | :--: | ----------------- |
| GET    | `/api/analytics` |  ✅  | بيانات الإحصائيات |

**المجموع: ~30 API Endpoint**

---

## 🖥 16. واجهة المستخدم

### الصفحات (9 صفحات)

| #   | الصفحة             | المسار       | الوصف                         |
| --- | ------------------ | ------------ | ----------------------------- |
| 1   | **تسجيل الدخول**   | `/login`     | نموذج email + password        |
| 2   | **إنشاء حساب**     | `/register`  | نموذج name + email + password |
| 3   | **المحادثة**       | `/chat`      | الصفحة الرئيسية — محادثة AI   |
| 4   | **رفع الملفات**    | `/upload`    | Drag & Drop + تتبع التقدم     |
| 5   | **مستنداتي**       | `/documents` | إدارة الملفات المرفوعة        |
| 6   | **Developer Docs** | `/dev-docs`  | إدارة التوثيقات (admin)       |
| 7   | **الإحصائيات**     | `/analytics` | رسوم بيانية                   |
| 8   | **الإعدادات**      | `/settings`  | نموذج AI + مفاتيح API         |
| 9   | **لوحة التحكم**    | `/admin`     | إدارة المستخدمين (admin)      |

### المكوّنات (Components)

| المكوّن            | الملف                | الوظيفة                                |
| ------------------ | -------------------- | -------------------------------------- |
| **Sidebar**        | `Sidebar.jsx`        | القائمة الجانبية + Docs Helper         |
| **DevDocsPanel**   | `DevDocsPanel.jsx`   | بانل اختيار الـ frameworks             |
| **ModelSelector**  | `ModelSelector.jsx`  | اختيار نموذج AI (compact/full)         |
| **CodeBlock**      | `CodeBlock.jsx`      | عرض الكود + syntax highlighting + copy |
| **ProtectedRoute** | `ProtectedRoute.jsx` | حماية المسارات                         |
| **AppLayout**      | `AppLayout.jsx`      | Layout رئيسي (Sidebar + Content)       |

### Contexts (الحالة المشتركة)

| Context            | الملف                | البيانات                            |
| ------------------ | -------------------- | ----------------------------------- |
| **AuthContext**    | `AuthContext.jsx`    | user, token, login(), logout()      |
| **ThemeContext**   | `ThemeContext.jsx`   | theme, toggleTheme()                |
| **DevDocsContext** | `DevDocsContext.jsx` | devDocsEnabled, frameworks, toggles |

---

## 📁 17. هيكل الملفات الكامل

```
agentic-personal-assistant/
│
├── package.json                 ← Root (concurrently)
├── DEV_DOCS_SYSTEM.md           ← وثيقة DevDocs
├── DOCS.md                      ← توثيق عام
├── FEATURES.md                  ← قائمة الميزات
├── TESTING.md                   ← خطة الاختبار
├── README.md                    ← دليل البداية
├── LICENSE                      ← الرخصة
│
├── server/                      ← السيرفر (Express.js)
│   ├── package.json             ← Dependencies
│   ├── index.js                 ← نقطة الدخول + 30 API route
│   ├── agent.js                 ← منطق AI + RAG + Streaming
│   ├── db.js                    ← SQLite schema (8 جداول)
│   ├── auth.js                  ← تسجيل + دخول (bcrypt + JWT)
│   ├── middleware.js             ← requireAuth + requireAdmin
│   ├── tools.js                 ← Pinecone search + web search
│   ├── ingest.js                ← معالجة المستندات → vectors
│   ├── documentLoader.js        ← قراءة PDF/DOCX/PPTX/TXT/CSV
│   ├── promptOptimizer.js       ← تحسين الأسئلة (Groq)
│   │
│   ├── providers/               ← مزوّدات AI
│   │   ├── index.js             ← Factory + retry + fallback
│   │   ├── models.js            ← 7 نماذج AI
│   │   ├── gemini.js            ← Google Gemini (6 keys rotation)
│   │   ├── groq.js              ← Groq API
│   │   └── openrouter.js        ← OpenRouter API
│   │
│   ├── devDocs/                 ← نظام التوثيقات
│   │   ├── frameworks.js        ← 10 framework configs
│   │   ├── routes.js            ← 7 API endpoints
│   │   ├── crawler.js           ← زاحف الويب (BFS + cheerio)
│   │   ├── parser.js            ← HTML → Markdown
│   │   ├── indexer.js           ← Text → Pinecone vectors
│   │   └── search.js            ← Vector similarity search
│   │
│   └── uploads/                 ← ملفات مرفوعة
│       └── media/               ← صور وصوتيات
│
└── client/                      ← العميل (React 19)
    ├── package.json             ← Dependencies
    ├── vite.config.js           ← Vite configuration
    ├── index.html               ← HTML shell
    │
    └── src/
        ├── main.jsx             ← Entry point
        ├── App.jsx              ← Routes (9 صفحات)
        ├── App.css              ← أنماط عامة
        ├── index.css            ← Tailwind directives
        │
        ├── contexts/            ← React Contexts
        │   ├── AuthContext.jsx   ← المصادقة
        │   ├── ThemeContext.jsx  ← السمة
        │   └── DevDocsContext.jsx← DevDocs state
        │
        ├── layouts/
        │   └── AppLayout.jsx    ← Sidebar + Outlet
        │
        ├── components/          ← مكوّنات مشتركة
        │   ├── Sidebar.jsx      ← القائمة الجانبية
        │   ├── DevDocsPanel.jsx ← بانل التوثيقات
        │   ├── ModelSelector.jsx← اختيار النموذج
        │   ├── CodeBlock.jsx    ← عرض الكود
        │   └── ProtectedRoute.jsx← حماية المسارات
        │
        └── pages/               ← صفحات التطبيق
            ├── Chat.jsx         ← المحادثة الرئيسية
            ├── Login.jsx        ← تسجيل الدخول
            ├── Register.jsx     ← إنشاء حساب
            ├── Upload.jsx       ← رفع الملفات
            ├── Documents.jsx    ← إدارة المستندات
            ├── DevDocs.jsx      ← إدارة التوثيقات
            ├── Analytics.jsx    ← الإحصائيات
            ├── Settings.jsx     ← الإعدادات
            └── Admin.jsx        ← لوحة التحكم
```

---

## 🔒 18. الأمان

| المجال             | التطبيق                                    |
| ------------------ | ------------------------------------------ |
| **كلمات المرور**   | bcrypt (10 rounds) — لا تُخزّن كنص صريح    |
| **المصادقة**       | JWT tokens (7 أيام، Bearer scheme)         |
| **الصلاحيات**      | Role-based: user / admin                   |
| **حماية المسارات** | `requireAuth` middleware على كل API        |
| **حماية الأدمن**   | `requireAdmin` middleware إضافي            |
| **رفع الملفات**    | Multer مع حدود حجم (25MB docs, 10MB media) |
| **أنواع الملفات**  | تصفية MIME types محددة فقط                 |
| **عزل البيانات**   | كل مستخدم namespace خاص في Pinecone        |
| **مفاتيح API**     | مُشفّرة في user_settings                   |
| **CORS**           | مفعّل                                      |
| **SQL Injection**  | Parameterized queries (better-sqlite3)     |

---

## ⚙ 19. المتغيرات البيئية

```env
# ─── Server ─────────────────────────────
PORT=3001
JWT_SECRET=your-secret-key

# ─── Google Gemini (حتى 6 مفاتيح) ──────
GOOGLE_API_KEY=AIzaSy...
GOOGLE_API_KEY_2=AIzaSy...
GOOGLE_API_KEY_3=AIzaSy...
GOOGLE_API_KEY_4=AIzaSy...
GOOGLE_API_KEY_5=AIzaSy...
GOOGLE_API_KEY_6=AIzaSy...

# ─── Groq ───────────────────────────────
GROQ_API_KEY=gsk_...

# ─── OpenRouter ─────────────────────────
OPENROUTER_API_KEY=sk-or-...

# ─── Pinecone ───────────────────────────
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX=your-index-name

# ─── Tavily (Web Search) ────────────────
TAVILY_API_KEY=tvly-...
```

---

## 🚀 20. كيفية التشغيل

### المتطلبات

- Node.js 22+
- حساب Pinecone (Free Tier كافي)
- مفتاح API واحد على الأقل (Gemini أو Groq)

### خطوات التشغيل

```bash
# 1. استنساخ المشروع
git clone <repo-url>
cd agentic-personal-assistant

# 2. تثبيت كل التبعيات
npm run install:all

# 3. إعداد المتغيرات البيئية
cp server/.env.example server/.env
# تعديل المفاتيح في .env

# 4. تشغيل المشروع
npm run dev
# → Server: http://localhost:3001
# → Client: http://localhost:5173
```

### أول استخدام

1. **إنشاء حساب** عبر `/register`
2. **ترقية إلى أدمن** (يدوياً عبر SQLite: `UPDATE users SET role='admin'`)
3. **إضافة مفتاح Groq/OpenRouter** من `/settings` (اختياري)
4. **رفع مستندات** من `/upload` (اختياري)
5. **تثبيت DevDocs** من `/dev-docs` (اختياري — أدمن فقط)
6. **بدء المحادثة** من `/chat` ✓

---

<div align="center">

## 📊 ملخص المشروع بالأرقام

```
╔═══════════════════════════════════════════════════════════╗
║         AGENTIC PERSONAL ASSISTANT — بالأرقام            ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  📁 ملفات السيرفر:              16 ملف                    ║
║  📁 ملفات العميل:               15 ملف                    ║
║  🌐 API Endpoints:              ~30 endpoint              ║
║  🗄  جداول قاعدة البيانات:       8 جداول                   ║
║  🤖 نماذج AI:                   7 نماذج                   ║
║  🔌 مزوّدات AI:                 3 مزوّدات                  ║
║  📄 أنواع الملفات المدعومة:      5 أنواع                   ║
║  📚 Frameworks مُعدّة:           10 frameworks             ║
║  📚 Frameworks مُثبّتة:          5 frameworks              ║
║  📊 Vectors في Pinecone:        17,932 vector             ║
║  🎭 شخصيات افتراضية:            5 شخصيات                  ║
║  🖥  صفحات الواجهة:              9 صفحات                   ║
║  🧩 React Components:           6 مكوّنات                  ║
║  🔐 React Contexts:             3 contexts                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

</div>

---

**تم إعداد هذه الوثيقة — 6 مارس 2026**

</div>
