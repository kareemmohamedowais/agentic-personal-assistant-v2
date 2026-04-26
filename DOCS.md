# 📚 Agentic Personal Assistant — توثيق المشروع

## 🧭 نظرة عامة

**مساعد شخصي ذكي مبني على Agentic RAG** (Retrieval-Augmented Generation).  
يسمح لكل مستخدم برفع ملفات PDF خاصة به، ثم محادثة ذكاء اصطناعي يبحث في تلك الملفات ويجيب بمعلومات دقيقة.  
كل مستخدم معزول بالكامل — بيانات منفصلة، ملفات منفصلة، محادثات منفصلة.

---

## 🏗️ معمارية المشروع

```
┌─────────────────────────────────────────────────────────┐
│                      Client (React)                      │
│  Login/Register → Chat (مع سجل محادثات) → Upload PDF     │
│  Tailwind CSS · React Router · React Markdown            │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (Vite Proxy → :3001)
┌──────────────────────▼──────────────────────────────────┐
│                    Server (Express)                       │
│  Auth (JWT) → Conversations CRUD → Chat → Ingest PDF     │
├──────────────┬──────────────┬───────────────────────────┤
│   SQLite     │  LangChain   │   Pinecone                 │
│  (users,     │  Agent +     │  Vector Store               │
│   messages,  │  MemorySaver │  (per-user namespace)       │
│   convs)     │              │                             │
└──────────────┴──────┬───────┴───────────────────────────┘
                      │
            ┌─────────▼─────────┐
            │  Google Gemini AI  │
            │  (gemini-3-flash)  │
            └────────────────────┘
```

---

## 🛠️ التقنيات المستخدمة

### الواجهة الأمامية (Frontend)

| التقنية            | الإصدار | لماذا استخدمناها؟                                                                |
| ------------------ | ------- | -------------------------------------------------------------------------------- |
| **React**          | 19      | مكتبة UI الأكثر انتشاراً — component-based، virtual DOM سريع، ecosystem ضخم      |
| **Vite**           | 7       | أسرع بكثير من Webpack في التطوير — يستخدم ESModules مباشرة، HMR فوري             |
| **Tailwind CSS**   | 4       | يكتب CSS مباشرة في JSX بدون ملفات منفصلة — سريع، متسق، سهل التخصيص               |
| **React Router**   | 7       | التوجيه بين الصفحات (Login, Chat, Upload) — يدعم protected routes و lazy loading |
| **React Markdown** | 10      | عرض ردود الذكاء الاصطناعي بتنسيق Markdown (عناوين، قوائم، كود)                   |

### الواجهة الخلفية (Backend)

| التقنية                     | الإصدار        | لماذا استخدمناها؟                                                                       |
| --------------------------- | -------------- | --------------------------------------------------------------------------------------- |
| **Node.js + Express**       | —              | خادم HTTP خفيف وسريع — مناسب لـ API و real-time، نفس لغة الـ frontend                   |
| **LangChain**               | 1.2            | إطار عمل لبناء تطبيقات AI — يوفر أدوات جاهزة للتعامل مع LLMs وVector Stores وAgents     |
| **LangGraph**               | 1.1            | يبني Agent كـ state machine — يتحكم في تدفق المحادثة ومتى يستخدم الأدوات                |
| **MemorySaver**             | —              | يحفظ حالة الـ Agent في RAM أثناء الجلسة — يتيح المتابعة بين الرسائل                     |
| **Google Gemini**           | gemini-3-flash | نموذج LLM من Google — سريع، مجاني (حصة محدودة)، دقيق في الاستجابة                       |
| **Pinecone**                | 5.1            | قاعدة بيانات Vector — تخزن embeddings الملفات وتبحث فيها بسرعة عالية (semantic search)  |
| **SQLite** (better-sqlite3) | 12             | قاعدة بيانات محلية — لا تحتاج خادم منفصل، مثالية لتخزين المستخدمين والمحادثات والرسائل  |
| **JWT** (jsonwebtoken)      | 9              | نظام مصادقة stateless — التوكن يُرسل مع كل طلب بدون الحاجة لجلسات على الخادم            |
| **bcryptjs**                | 3              | تشفير كلمات المرور — يستخدم salt + hashing لحماية كلمات السر من التسريب                 |
| **Multer**                  | 2              | معالجة رفع الملفات — يقبل PDF فقط، يخزن مؤقتاً ثم يعالج                                 |
| **pdf-parse**               | 1.1            | استخراج النص من ملفات PDF — يحوّل الملف لنص يمكن تقسيمه وتحويله لـ embeddings           |
| **dotenv**                  | 17             | قراءة المتغيرات البيئية (.env) — يفصل الأسرار (API keys) عن الكود                       |
| **Zod**                     | 3.23           | تحقق من صحة البيانات (validation) — يُستخدم داخلياً مع LangChain لتعريف أدوات الـ Agent |
| **express-rate-limit**      | 8              | حماية من الإساءة — يحد من عدد الطلبات لكل مستخدم خلال فترة زمنية                        |

### أمان وعزل المستخدمين

| الآلية                  | الشرح                                                                 |
| ----------------------- | --------------------------------------------------------------------- |
| **JWT Middleware**      | كل طلب API محمي — يتحقق من التوكن ويستخرج `userId`                    |
| **Pinecone Namespaces** | كل مستخدم له namespace منفصل (`user_1`, `user_2`) — لا يرى ملفات غيره |
| **SQLite Foreign Keys** | الرسائل والمحادثات مرتبطة بـ `user_id` — استعلامات مفلترة دائماً      |

---

## 📁 هيكل الملفات

```
agentic-personal-assistant/
├── server/
│   ├── index.js          # نقطة الدخول — Express routes (auth, chat, conversations, ingest)
│   ├── agent.js          # إنشاء وتشغيل الـ AI Agent مع تحميل/حفظ التاريخ
│   ├── tools.js          # أداة البحث في Pinecone (per-user namespace)
│   ├── ingest.js         # قراءة PDF → تقسيم → embeddings → Pinecone
│   ├── db.js             # إعداد SQLite (users, conversations, messages)
│   ├── auth.js           # routes التسجيل وتسجيل الدخول
│   ├── middleware.js      # JWT verification middleware
│   └── app.db            # قاعدة البيانات (يُنشأ تلقائياً)
│
├── client/src/
│   ├── App.jsx           # React Router setup
│   ├── main.jsx          # نقطة الدخول
│   ├── contexts/
│   │   └── AuthContext.jsx    # إدارة حالة المصادقة (login, logout, token)
│   ├── components/
│   │   ├── Sidebar.jsx        # القائمة الجانبية (تنقّل + معلومات المستخدم)
│   │   └── ProtectedRoute.jsx # حماية الصفحات من الوصول بدون تسجيل دخول
│   ├── layouts/
│   │   └── AppLayout.jsx      # Layout مشترك (Sidebar + المحتوى)
│   └── pages/
│       ├── Chat.jsx      # صفحة المحادثة مع لوحة المحادثات والذاكرة
│       ├── Upload.jsx    # صفحة رفع ملفات PDF (drag & drop)
│       ├── Login.jsx     # صفحة تسجيل الدخول
│       └── Register.jsx  # صفحة إنشاء حساب
```

---

## 🔄 تدفق العمل (Workflow)

### 1. رفع ملف PDF

```
المستخدم يرفع PDF → Multer يحفظه مؤقتاً → pdf-parse يستخرج النص
→ TextSplitter يقسّمه لأجزاء صغيرة → Embeddings (llama-text-embed-v2)
→ يُخزّن في Pinecone namespace خاص بالمستخدم
```

### 2. محادثة مع الـ Agent

```
المستخدم يرسل سؤال → يُحمّل آخر 20 رسالة من SQLite (التاريخ)
→ LangGraph Agent يقرر: هل يحتاج بحث؟
→ إذا نعم: يبحث في Pinecone (namespace المستخدم) → يجمع السياق
→ يولّد الرد باستخدام Gemini → يحفظ الرسالتين في SQLite
→ يُرجع الرد للمستخدم
```

---

## ⚡ المميزات الحالية

- ✅ نظام تسجيل دخول/إنشاء حساب كامل (JWT)
- ✅ رفع ملفات PDF مع drag & drop
- ✅ محادثة AI مع بحث ذكي في الملفات (RAG)
- ✅ عزل كامل بين المستخدمين (ملفات + محادثات)
- ✅ سجل محادثات دائم مع قائمة جانبية
- ✅ ذاكرة محادثة (آخر 20 رسالة)
- ✅ معالجة أخطاء احترافية (حصة يومية، شبكة، خادم)
- ✅ تصميم داكن متجاوب مع Tailwind CSS

---

## 💡 اقتراحات وتحسينات مستقبلية

### 🔴 أولوية عالية — تحسينات أساسية

#### 1. Streaming Responses (بث الردود كلمة بكلمة)

بدلاً من انتظار الرد كاملاً، يظهر النص تدريجياً مثل ChatGPT.  
**التنفيذ:** استخدام `Server-Sent Events (SSE)` أو `WebSocket` مع `streamEvents()` من LangChain.  
**الفائدة:** تجربة مستخدم أفضل بكثير — لا شاشة انتظار طويلة.

#### 2. دعم أنواع ملفات إضافية

حالياً يقبل PDF فقط — يمكن إضافة Word (.docx), PowerPoint (.pptx), TXT, CSV.  
**التنفيذ:** استخدام مكتبات مثل `mammoth` (Word), `pptx-parser`, `csv-parse`.  
**الفائدة:** مرونة أكبر — المستخدم يرفع أي مستند لديه.

#### 3. OAuth Login (Google / GitHub)

تسجيل دخول بنقرة واحدة عبر Google أو GitHub بدلاً من email/password.  
**التنفيذ:** `passport.js` مع strategies مثل `passport-google-oauth20`.  
**الفائدة:** سهولة أكبر — كثير من المستخدمين يفضلون تسجيل الدخول بحساباتهم الموجودة.

### 🟡 أولوية متوسطة — ميزات متقدمة

#### 4. تلخيص تلقائي للمحادثات الطويلة

عندما تتجاوز المحادثة 30 رسالة، يُلخّص الـ Agent الجزء القديم تلقائياً ويحفظ المخلص.  
**التنفيذ:** `summarization chain` في LangChain — يضغط 30 رسالة في فقرة واحدة.  
**الفائدة:** ذاكرة غير محدودة فعلياً بدون استنزاف tokens.

#### 5. نظام Prompt Templates قابل للتخصيص

يسمح للمستخدم باختيار "شخصية" الـ Agent — مثلاً: محامي، طبيب، مطور.  
**التنفيذ:** جدول `prompts` في SQLite + واجهة اختيار في Chat.  
**الفائدة:** نفس التطبيق يخدم عدة استخدامات.

#### 6. إدارة الملفات المرفوعة

صفحة تعرض جميع الملفات التي رفعها المستخدم مع إمكانية الحذف.  
**التنفيذ:** جدول `documents` في SQLite + حذف vectors من Pinecone عند الحذف.  
**الفائدة:** تحكم كامل — المستخدم يعرف ما في قاعدة معرفته.

#### 7. Web Search Tool (بحث في الإنترنت)

إضافة أداة بحث Google/Tavily للـ Agent — يبحث في الإنترنت إذا لم يجد في الملفات.  
**التنفيذ:** `TavilySearchResults` tool من LangChain + تعديل `tools.js`.  
**الفائدة:** الـ Agent يقدر يجيب على أسئلة عامة + أسئلة عن الملفات.

### 🟢 أولوية مستقبلية — ميزات متقدمة جداً

#### 8. Multi-Modal Support (صور + صوت)

قبول صور ومقاطع صوتية بجانب النص — الـ Agent يحللها ويجيب.  
**التنفيذ:** Gemini يدعم multi-modal مباشرة + `Whisper API` للصوت.  
**الفائدة:** تطبيق شامل يفهم كل أنواع المحتوى.

#### 9. Real-time Collaboration

مشاركة محادثة مع مستخدم آخر — يشوفون نفس الردود ويكملون سوا.  
**التنفيذ:** `Socket.IO` للمزامنة الفورية + room-based architecture.  
**الفائدة:** فرق العمل تتعاون على نفس المستندات.

#### 10. Analytics Dashboard

لوحة إحصائيات: عدد الرسائل، أكثر الملفات استخداماً، معدل الاستخدام اليومي.  
**التنفيذ:** استعلامات SQLite مجمّعة + مكتبة رسوم بيانية مثل `recharts`.  
**الفائدة:** يفهم المستخدم كيف يستخدم التطبيق ويحسّن إنتاجيته.

#### 11. Plugin System (نظام إضافات)

يسمح بإضافة أدوات جديدة للـ Agent بدون تعديل الكود — مثل: حاسبة، ترجمة، بريد إلكتروني.  
**التنفيذ:** `dynamic tool loading` — مجلد `/plugins` يُقرأ تلقائياً عند التشغيل.  
**الفائدة:** قابلية توسع مفتوحة — أي مطور يضيف أداة جديدة.

#### 12. Deployment و CI/CD

نشر التطبيق على Docker + Vercel (client) + Railway/Fly.io (server).  
**التنفيذ:** `Dockerfile` + `docker-compose.yml` + GitHub Actions pipeline.  
**الفائدة:** التطبيق يعمل في الإنتاج ويتحدث تلقائياً مع كل push.

---

## ⚙️ متغيرات البيئة المطلوبة (.env)

```env
# Google Gemini
GOOGLE_API_KEY=your_google_api_key

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=your_index_name

# JWT
JWT_SECRET=your_secret_key_here

# Server
PORT=3001
```

---

## 🚀 تشغيل المشروع

```bash
# تثبيت التبعيات
cd server && npm install --legacy-peer-deps
cd ../client && npm install

# تشغيل الكل معاً (من المجلد الرئيسي)
npm run dev
```

- **الخادم:** http://localhost:3001
- **العميل:** http://localhost:5173

---

> **تم إعداد هذا التوثيق تلقائياً — آخر تحديث: مارس 2026**
