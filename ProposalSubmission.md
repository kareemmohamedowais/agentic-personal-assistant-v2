# 📋 Proposal Submission — Agentic Personal Assistant

> **Project Title:** Agentic Personal Assistant — A Multi-Model RAG-Based Intelligent System  
> **Date:** March 2026  
> **Team/Author:** _(يُملأ لاحقاً)_

---

## 1. مقدمة المشروع (Introduction)

يقدم هذا المشروع نظام مساعد شخصي ذكي متكامل يعتمد على تقنية **Agentic RAG** (Retrieval-Augmented Generation) مع دعم لعدة نماذج ذكاء اصطناعي. النظام يجمع بين قدرات متعددة تشمل المحادثة الذكية، تحليل المستندات، تحليل البيانات، البحث في الويب، واستكشاف أكواد GitHub — كل ذلك في منصة واحدة متعددة المستخدمين.

---

## 2. تعريف المشكلة (Problem Definition)

### 2.1 المشكلة الأساسية

يواجه المستخدمون اليوم تحديات متعددة عند التعامل مع المعلومات:

1. **تشتت الأدوات**: الحاجة لاستخدام أدوات متفرقة للمحادثة مع AI، تحليل البيانات، قراءة المستندات، والبحث في الأكواد.
2. **فقدان السياق**: نماذج الذكاء الاصطناعي التقليدية تفتقر للمعلومات الشخصية أو المتخصصة للمستخدم.
3. **صعوبة تحليل البيانات**: يحتاج تحليل البيانات لخبرة برمجية ليست متاحة لجميع المستخدمين.
4. **الاعتماد على مزود واحد**: الارتباط بمزود AI واحد يعرض المستخدم لمشاكل التوقف والحصص المحدودة.
5. **عدم العزل**: معظم الأنظمة لا توفر عزلاً كاملاً لبيانات كل مستخدم.

### 2.2 لمن هذا النظام؟

- **الباحثون**: رفع أوراق بحثية ومحادثة AI حول محتواها.
- **المطورون**: استكشاف أكواد GitHub والبحث في توثيقات الأطر البرمجية.
- **محللو البيانات**: رفع datasets وتحليلها بأسئلة طبيعية دون كتابة كود.
- **الطلاب**: أداة دراسية تجمع بين المعرفة والتحليل.

---

## 3. الحل المقترح (Proposed Solution)

### 3.1 نظرة عامة على الحل

بناء **منصة ويب متكاملة** تعتمد على معمارية Agent-based مع الخصائص التالية:

| الخاصية | الوصف |
|---------|-------|
| **Multi-Model AI** | 7 نماذج AI من 3 مزودين (Groq, Google Gemini, OpenRouter) مع تبديل فوري |
| **Triple RAG System** | 3 أنظمة RAG: مستندات شخصية + توثيقات تقنية + أكواد GitHub |
| **Data Analysis Engine** | محرك تحليل بيانات بـ Python sandbox آمن |
| **Real-time Streaming** | بث مباشر للردود عبر SSE |
| **Multi-tenant Security** | عزل كامل لبيانات كل مستخدم |

### 3.2 المعمارية العامة

```
┌─────────────────────────────────────────────────────────┐
│                 Client (React 19 + Vite 7)               │
│       Tailwind CSS · React Router · Recharts             │
│  ┌──────┬─────────┬──────────┬──────────┬────────────┐  │
│  │ Chat │ Upload  │ DevDocs  │ GitHub   │ DataAnalyst│  │
│  │ Page │ Page    │ Page     │ Repos    │ Page       │  │
│  └──────┴─────────┴──────────┴──────────┴────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API + SSE (port 3001)
┌──────────────────────▼──────────────────────────────────┐
│                  Server (Express.js)                      │
│  ┌─────────────────────────────────────────────────────┐│
│  │           Authentication Layer (JWT + bcrypt)        ││
│  └─────────────────────────────────────────────────────┘│
│  ┌──────┬──────────┬──────────┬──────────┬─────────────┐│
│  │Agent │Doc RAG   │DevDocs   │GitHub    │Data Analyst ││
│  │System│Pipeline  │Crawler   │Fetcher   │Engine       ││
│  └──────┴──────────┴──────────┴──────────┴─────────────┘│
│  ┌──────────────────────────────────────────────────────┐│
│  │    AI Providers: Groq | Gemini (6 keys) | OpenRouter ││
│  └──────────────────────────────────────────────────────┘│
├──────────────┬──────────────┬───────────────────────────┤
│   SQLite     │  Pinecone    │   Python Sandbox           │
│  (13 tables) │  Vector DB   │  (venv + security)         │
└──────────────┴──────────────┴───────────────────────────┘
```

---

## 4. التقنيات المستخدمة (Technology Stack)

### 4.1 الواجهة الأمامية (Frontend)

| التقنية | الإصدار | الدور |
|---------|---------|-------|
| React | 19.2.0 | مكتبة UI — component-based architecture |
| Vite | 7.2.4 | أداة بناء سريعة بـ ESModules و HMR فوري |
| Tailwind CSS | 4.2.1 | إطار CSS utility-first للتصميم السريع |
| React Router | 7.13.1 | التوجيه بين الصفحات مع protected routes |
| Recharts | 3.7.0 | رسوم بيانية تفاعلية لنتائج التحليل |
| React Markdown | 10.1.0 | عرض ردود AI بتنسيق Markdown |
| KaTeX | 0.16.35 | عرض المعادلات الرياضية |
| react-syntax-highlighter | 16.1.1 | تلوين الأكواد البرمجية |

### 4.2 الواجهة الخلفية (Backend)

| التقنية | الإصدار | الدور |
|---------|---------|-------|
| Node.js + Express | 4.18.2 | خادم REST API |
| LangChain | 1.2.16 | إطار عمل AI — بناء Agents و RAG pipelines |
| LangGraph | 1.1.4 | بناء Agent كـ state machine |
| Pinecone | 5.1.2 | قاعدة بيانات متجهية للبحث الدلالي |
| SQLite (better-sqlite3) | 12.6.2 | قاعدة بيانات محلية (13 جدول) |
| JWT (jsonwebtoken) | 9.0.3 | نظام مصادقة stateless |
| bcryptjs | 3.0.3 | تشفير كلمات المرور |
| Multer | 2.0.0 | معالجة رفع الملفات |
| Cheerio | 1.2.0 | تحليل HTML لزحف التوثيقات |
| Tavily API | — | بحث ويب مباشر |

### 4.3 نماذج الذكاء الاصطناعي

| # | الموديل | المزود | الوصف |
|---|---------|--------|-------|
| 1 | Llama 3.3 70B | Groq | الافتراضي — الأقوى |
| 2 | Kimi K2 | Groq | Moonshot AI — ذكاء عالي |
| 3 | Qwen3 32B | Groq | Alibaba — تفكير عميق |
| 4 | Llama 4 Maverick | Groq | الأحدث |
| 5 | Llama 3.1 8B | Groq | الأسرع والأخف |
| 6 | Gemma 3 12B | OpenRouter | Google — مجاني |
| 7 | Gemini 2.5 Flash Lite | Google | سريع (حصة محدودة) |

---

## 5. الميزات الرئيسية (Key Features)

### 5.1 نظام المحادثة الذكية
- بث مباشر للردود عبر **Server-Sent Events (SSE)**
- ذاكرة محادثة مع تلخيص تلقائي عند تجاوز 30 رسالة
- 5 شخصيات AI جاهزة + إمكانية إنشاء شخصيات مخصصة
- محسّن Prompts تلقائي يحسن أسئلة المستخدم قبل إرسالها
- دعم الوسائط المتعددة (صور + صوت)

### 5.2 نظام RAG الثلاثي
1. **مستندات شخصية**: رفع PDF, DOCX, PPTX, TXT, CSV → تقطيع → embeddings → Pinecone (namespace لكل مستخدم)
2. **توثيقات تقنية**: زحف 10+ أطر عمل (React, Laravel, Django, FastAPI, Docker, Kubernetes...) مع BFS crawler
3. **أكواد GitHub**: استنساخ repos عامة → فهرسة الأكواد → بحث دلالي

### 5.3 محرك تحليل البيانات
- رفع ملفات CSV, XLSX, JSON, Parquet (حتى 100MB)
- توليد ملخص إحصائي تلقائي
- طرح أسئلة بلغة طبيعية → AI يولد كود Python → تنفيذ في sandbox آمن
- أمان متقدم: حظر `os.system`, `subprocess`, `socket`, `eval`, `exec`
- حد زمني 30 ثانية وذاكرة 512MB
- إنتاج رسوم بيانية (matplotlib, seaborn, plotly)
- تصدير تقارير بصيغة PDF, HTML, Markdown

### 5.4 بحث الويب المباشر
- بحث عبر Tavily API عندما يحتاج الموديل لمعلومات حديثة
- أفضل 5 نتائج مع عناوين وروابط
- Fallback ذكي عند فشل البحث

### 5.5 الأمان والعزل
- مصادقة JWT مع صلاحية 7 أيام
- كلمات مرور مشفرة بـ bcrypt
- Pinecone namespaces منفصلة لكل مستخدم
- Foreign keys + CASCADE delete
- Rate limiting للحماية من DDoS
- نظام أدوار (user/admin)

### 5.6 ميزات إضافية
- لوحة إحصائيات (عدد الرسائل، المحادثات، المستندات، الاستخدام اليومي)
- لوحة إدارة (Admin Panel) لإدارة المستخدمين والنظام
- وضع داكن/فاتح
- دعم مفاتيح API شخصية (Groq + OpenRouter)
- نظام تدوير 6 مفاتيح Gemini مع حظر ذكي
- تثبيت محادثات ووسوم (Tags)
- بحث في المحادثات

---

## 6. قاعدة البيانات (Database Schema)

### 6.1 الجداول الأساسية (13 جدول)

| الجدول | الوصف | العلاقات |
|--------|-------|----------|
| `users` | بيانات المستخدمين (email, password_hash, role) | أب لكل الجداول |
| `conversations` | جلسات المحادثة مع عناوين ووسوم | → users |
| `messages` | الرسائل مع نوع الوسائط | → conversations |
| `documents` | الملفات المرفوعة مع حالتها | → users |
| `prompts` | شخصيات AI (5 افتراضية + مخصصة) | → users |
| `user_settings` | إعدادات المستخدم ومفاتيح API | → users |
| `datasets` | ملفات البيانات المرفوعة | → users |
| `analysis_sessions` | جلسات التحليل | → datasets |
| `analysis_executions` | نتائج التحليل والأكواد | → sessions |
| `dev_docs_packs` | حزم التوثيقات المفهرسة | — |
| `dev_docs_user_prefs` | تفضيلات المستخدم للتوثيقات | → users, packs |
| `github_repos` | مستودعات GitHub المفهرسة | — |
| `github_repos_user_prefs` | تفضيلات المستخدم للمستودعات | → users, repos |

### 6.2 مخطط العلاقات

```
users ──┬── conversations ── messages
        ├── documents
        ├── prompts
        ├── user_settings
        ├── datasets ── analysis_sessions ── analysis_executions
        ├── dev_docs_user_prefs ── dev_docs_packs
        └── github_repos_user_prefs ── github_repos
```

---

## 7. واجهات API الرئيسية (API Endpoints)

### 7.1 المصادقة
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/auth/register` | تسجيل حساب جديد |
| POST | `/api/auth/login` | تسجيل الدخول |

### 7.2 المحادثة
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/chat/stream` | إرسال رسالة مع بث مباشر (SSE) |
| GET | `/api/conversations` | قائمة المحادثات |
| DELETE | `/api/conversations/:id` | حذف محادثة |

### 7.3 المستندات
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/ingest` | رفع ومعالجة مستند |
| GET | `/api/documents` | قائمة المستندات |
| DELETE | `/api/documents/:id` | حذف مستند |

### 7.4 تحليل البيانات
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/data-analyst/datasets/upload` | رفع dataset |
| POST | `/api/data-analyst/analyze/stream` | تحليل ببث مباشر |
| GET | `/api/data-analyst/reports/:sessionId` | استخراج تقرير |

### 7.5 التوثيقات و GitHub
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/dev-docs/install/:framework` | تثبيت توثيق إطار عمل |
| POST | `/api/github-repos/add` | إضافة مستودع GitHub |

---

## 8. هيكل المشروع (Project Structure)

```
agentic-personal-assistant/
├── server/                        # الواجهة الخلفية
│   ├── index.js                   # نقطة الدخول — Express routes
│   ├── agent.js                   # نظام Agent + Streaming + Memory
│   ├── tools.js                   # أدوات البحث (Vector + Web)
│   ├── ingest.js                  # معالجة المستندات وتوليد الـ embeddings
│   ├── db.js                      # قاعدة البيانات SQLite (13 جدول)
│   ├── auth.js                    # نظام المصادقة
│   ├── middleware.js              # JWT verification + admin check
│   ├── documentLoader.js          # تحميل ملفات متعددة الأنواع
│   ├── promptOptimizer.js         # تحسين الأسئلة تلقائياً
│   ├── providers/                 # مزودو AI
│   │   ├── index.js               # Factory + retry + fallback logic
│   │   ├── models.js              # كتالوج الموديلات (7 نماذج)
│   │   ├── gemini.js              # Google Gemini (6 مفاتيح)
│   │   ├── groq.js                # Groq LLM
│   │   └── openrouter.js          # OpenRouter API
│   ├── dataAnalyst/               # محرك تحليل البيانات
│   │   ├── engine.js              # حلقة التحليل والاستجابة
│   │   ├── executor.js            # تنفيذ Python آمن
│   │   ├── datasetManager.js      # إدارة الملفات
│   │   ├── setupSandbox.js        # إعداد بيئة Python
│   │   ├── cleaner.js             # تنظيف البيانات
│   │   ├── insights.js            # استخلاص الأنماط
│   │   ├── reporter.js            # إنتاج التقارير
│   │   ├── charts.js              # تحويل البيانات للرسوم
│   │   └── routes.js              # API endpoints
│   ├── devDocs/                   # نظام التوثيقات التقنية
│   │   ├── crawler.js             # زاحف BFS
│   │   ├── parser.js              # HTML → Markdown
│   │   ├── indexer.js             # فهرسة في Pinecone
│   │   ├── search.js              # بحث دلالي
│   │   ├── frameworks.js          # تهيئة الأطر (10+)
│   │   └── routes.js              # API endpoints
│   ├── githubRepos/               # نظام معرفة GitHub
│   │   ├── fetcher.js             # git clone + GitHub API
│   │   ├── parser.js              # قراءة الأكواد
│   │   ├── indexer.js             # فهرسة الأكواد
│   │   ├── search.js              # بحث في الأكواد
│   │   ├── config.js              # حدود وإعدادات
│   │   └── routes.js              # API endpoints
│   └── sandbox/                   # بيئة تنفيذ Python
│       ├── requirements.txt       # مكتبات Python
│       ├── scripts/               # سكربتات التنفيذ المؤقتة
│       └── outputs/               # نتائج ورسوم بيانية
│
├── client/                        # الواجهة الأمامية
│   ├── src/
│   │   ├── App.jsx                # React Router setup
│   │   ├── main.jsx               # نقطة الدخول
│   │   ├── pages/                 # 10 صفحات
│   │   │   ├── Chat.jsx           # المحادثة الرئيسية
│   │   │   ├── Upload.jsx         # رفع المستندات
│   │   │   ├── Documents.jsx      # إدارة المستندات
│   │   │   ├── Analytics.jsx      # لوحة الإحصائيات
│   │   │   ├── Settings.jsx       # إعدادات المستخدم
│   │   │   ├── Admin.jsx          # لوحة الإدارة
│   │   │   ├── DevDocs.jsx        # التوثيقات التقنية
│   │   │   ├── GitHubRepos.jsx    # مستودعات GitHub
│   │   │   ├── Login.jsx          # تسجيل الدخول
│   │   │   └── Register.jsx       # التسجيل
│   │   ├── components/            # 13 مكون
│   │   ├── contexts/              # 4 سياقات (Auth, Theme, DevDocs, GitHub)
│   │   └── layouts/               # AppLayout مع Sidebar
│   └── package.json
│
├── package.json                   # Root — concurrently scripts
├── FEATURES.md                    # توثيق شامل للميزات
├── DOCS.md                        # التوثيق التقني
└── README.md                      # دليل الإعداد والتشغيل
```

---

## 9. خطة التنفيذ (Implementation Timeline)

| المرحلة | الميزات | الحالة |
|---------|---------|--------|
| **المرحلة 1** | البنية التحتية: Auth, DB, Express, React setup | ✅ مكتمل |
| **المرحلة 2** | نظام RAG: رفع PDF → Pinecone → بحث دلالي | ✅ مكتمل |
| **المرحلة 3** | Agent System: LangChain + LangGraph + memory | ✅ مكتمل |
| **المرحلة 4** | Multi-Model: 7 نماذج + تبديل فوري + fallback | ✅ مكتمل |
| **المرحلة 5** | Streaming + أنواع ملفات متعددة + تلخيص | ✅ مكتمل |
| **المرحلة 6** | Media + Web Search + Prompt Templates | ✅ مكتمل |
| **المرحلة 7** | Data Analyst Engine + Python Sandbox | ✅ مكتمل |
| **المرحلة 8** | DevDocs Crawler + GitHub Repos Knowledge | ✅ مكتمل |
| **المرحلة 9** | Analytics + Admin Panel + Polish | ✅ مكتمل |

---

## 10. النتائج المتوقعة (Expected Outcomes)

1. **منصة موحدة** تجمع المحادثة الذكية وتحليل المستندات والبيانات في مكان واحد.
2. **تجربة مستخدم سلسة** مع بث مباشر وواجهة حديثة.
3. **أمان عالي** مع عزل كامل لبيانات كل مستخدم.
4. **مرونة في نماذج AI** — 7 نماذج من 3 مزودين مع تبديل فوري.
5. **تحليل بيانات آمن** عبر Python sandbox معزول.
6. **قابلية التوسع** — معمارية modular تسمح بإضافة ميزات بسهولة.

---

## 11. الخلاصة (Conclusion)

يقدم مشروع **Agentic Personal Assistant** حلاً شاملاً ومتكاملاً يستفيد من أحدث تقنيات الذكاء الاصطناعي (LangChain, RAG, Multi-Model) لبناء مساعد شخصي ذكي يمكنه التعامل مع المستندات والبيانات والأكواد والتوثيقات التقنية. المشروع مبني بمعمارية حديثة وآمنة تضمن عزل البيانات وسرعة الأداء وسهولة الصيانة.

---

## المراجع (References)

- LangChain Documentation — https://js.langchain.com/
- Pinecone Documentation — https://docs.pinecone.io/
- React Documentation — https://react.dev/
- Express.js Documentation — https://expressjs.com/
- Tailwind CSS Documentation — https://tailwindcss.com/
- Groq API Documentation — https://console.groq.com/docs
- Google Gemini API — https://ai.google.dev/
- Tavily Search API — https://tavily.com/
