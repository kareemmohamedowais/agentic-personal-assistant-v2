# Agentic Personal Assistant V2 🤖🚀

مساعد شخصي ذكي متطور يعتمد على تقنيات الـ **Agentic RAG** للبحث في الملفات، المستودعات البرمجية، والإنترنت، مع دعم كامل للوسائط المتعددة والبحث المتقدم.

---

## 🌟 نظرة عامة (Overview)

هذا المشروع هو منصة محادثة ذكية متكاملة تجمع بين قوة نماذج اللغة الكبيرة (LLMs) وبين قاعدة معرفة متغيرة (RAG). يتيح النظام للمستخدمين التفاعل مع ملفاتهم (PDF/Docs)، مستودعات GitHub الخاصة بهم، وحتى توثيق المكتبات البرمجية مباشرة، كل ذلك من خلال واجهة مستخدم فاخرة (Premium UI) تدعم الوضعين الداكن والفاتح.

---

## 🚀 الميزات الرئيسية (Key Features)

- **🧠 Agentic RAG**: نظام استرجاع ذكي يبحث في (المستندات المرفوعة، مستودعات GitHub، توثيق المطورين).
- **🌐 Web Search**: قدرة العميل على البحث في الإنترنت بشكل مباشر للحصول على معلومات محدثة.
- **📱 Multi-Model Support**: التبديل الفوري بين نماذج (Gemini, Groq, OpenRouter) مثل Llama 3.3, Qwen, Gemma.
- **🎤 Media Support**: إمكانية إرسال الصور والتسجيلات الصوتية (Voice-to-Text) والتفاعل معها.
- **✨ Prompt Optimizer**: محسن تلقائي للطلبات لضمان الحصول على أفضل إجابة من الذكاء الاصطناعي.
- **🔐 Admin Panel**: لوحة تحكم كاملة لإدارة المستخدمين، الأدوار، ومراقبة الإحصائيات.
- **📈 Advanced Analytics**: تتبع استهلاك الرسائل، أنواع الملفات المرفوعة، ونشاط المستخدمين.
- **🌓 Premium UI**: تصميم عصري يعتمد على Glassmorphism مع تجربة مستخدم سلسة واستجابة كاملة.

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

### **Frontend**
- **React 18** (Vite)
- **Tailwind CSS** (Styling)
- **Framer Motion** (Animations)
- **Context API** (State Management)

### **Backend**
- **Node.js** (Express)
- **SQLite** (Database via better-sqlite3)
- **Pinecone** (Vector Database for RAG)
- **LangChain** (AI Orchestration)

---

## 📦 البدء في التشغيل (Getting Started)

### 1. المتطلبات (Prerequisites)
- Node.js (v20+)
- مفاتيح API لكل من (Google Gemini, Groq, Pinecone, Tavily).

### 2. التثبيت (Installation)
قم بتثبيت جميع التبعيات للمشروع (العميل والسيرفر):
```bash
npm run install:all
```

### 3. الإعدادات (Configuration)
قم بإنشاء ملف `.env` في مجلد `server` بناءً على `.env.example` وأضف مفاتيحك:
```env
PORT=3001
JWT_SECRET=your_secret
GEMINI_API_KEY_1=...
PINECONE_API_KEY=...
TAVILY_API_KEY=...
```

### 4. التشغيل (Development)
قم بتشغيل السيرفر والعميل معاً بأمر واحد:
```bash
npm run dev
```

الآن يمكنك الوصول للتطبيق عبر: `http://localhost:5173`

---

## 📁 هيكلية المشروع (Project Structure)

- `client/`: تطبيق React (Frontend).
  - `src/pages/`: صفحات النظام (Chat, GitHub, Docs, Analytics).
  - `src/components/`: المكونات القابلة لإعادة الاستخدام.
- `server/`: خادم Express (Backend).
  - `githubRepos/`: منطق التعامل مع مستودعات GitHub.
  - `devDocs/`: منطق البحث في توثيق المطورين.
  - `providers/`: مزودي نماذج الذكاء الاصطناعي.
  - `db.js`: إعدادات قاعدة البيانات SQLite.

---

## 📝 ملاحظات
هذا المشروع مصمم ليكون مساعداً شخصياً قوياً وقابلاً للتوسع. لمزيد من التفاصيل حول الميزات التقنية، يرجى مراجعة ملف [FEATURES.md](./FEATURES.md).
