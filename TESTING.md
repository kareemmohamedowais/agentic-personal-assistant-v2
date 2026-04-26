# دليل اختبار المشروع - Agentic Personal Assistant

## 📋 المتطلبات الأساسية قبل الاختبار

### 1. المتطلبات البيئية

- Node.js v18 أو أحدث
- حساب على [OpenAI](https://platform.openai.com/) مع مفتاح API
- حساب على [Pinecone](https://www.pinecone.io/) مع index مُنشأ مسبقاً
- حساب على [LangSmith](https://smith.langchain.com/) (اختياري للمراقبة)

### 2. إعداد متغيرات البيئة

تأكد من وجود ملف `.env` داخل مجلد `server/` يحتوي على:

```env
# LLM
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Vector DB (Pinecone)
PINECONE_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PINECONE_INDEX=your-index-name

# LangSmith (اختياري)
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
LANGSMITH_API_KEY=lsv2_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
LANGSMITH_PROJECT="Agentic Personal Assistant"
```

---

## 🚀 تشغيل المشروع للاختبار

### تثبيت المكتبات

```bash
npm run install:all
```

### تشغيل الخادم والعميل معاً (Development)

```bash
npm run dev
```

الخادم سيعمل على: `http://localhost:3001`  
الواجهة ستعمل على: `http://localhost:5173`

---

## 🔍 اختبار نقاط النهاية (API Endpoints)

### 1. اختبار حالة الخادم

تحقق أن الخادم يعمل:

```bash
curl -X GET http://localhost:3001
```

**النتيجة المتوقعة:** رد من الخادم (أو خطأ 404 يدل على أن الخادم يعمل)

---

### 2. اختبار نقطة نهاية الدردشة `/api/chat`

**اختبار أساسي - سؤال عام:**

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"مرحباً، من أنت؟\", \"sessionId\": \"test-session-1\"}"
```

**اختبار الذاكرة - سؤال متابعة:**

```bash
# الرسالة الأولى
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"اسمي أحمد\", \"sessionId\": \"test-session-2\"}"

# الرسالة الثانية (نفس الجلسة) - يجب أن يتذكر الاسم
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"ما اسمي؟\", \"sessionId\": \"test-session-2\"}"
```

**النتيجة المتوقعة:** يتذكر الوكيل الاسم "أحمد"

**اختبار رسالة فارغة (خطأ متوقع):**

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"\", \"sessionId\": \"test-session-3\"}"
```

**النتيجة المتوقعة:** `{"error": "Message required"}` مع كود 400

---

### 3. اختبار نقطة نهاية استيعاب PDF `/api/ingest`

**رفع ملف PDF للاختبار (PowerShell):**

```powershell
curl.exe -X POST http://localhost:3001/api/ingest `
  -F "file=@C:\path\to\your\document.pdf"
```

**رفع ملف PDF للاختبار (bash/cmd):**

```bash
curl -X POST http://localhost:3001/api/ingest \
  -F "file=@/path/to/your/document.pdf"
```

**النتيجة المتوقعة:** `{"message": "Ingestion complete", "chunks": <number>}`

**اختبار رفع ملف غير PDF (خطأ متوقع):**

```bash
curl -X POST http://localhost:3001/api/ingest \
  -F "file=@/path/to/file.txt"
```

**النتيجة المتوقعة:** خطأ "Only PDF files are allowed"

---

## 🧪 سيناريوهات الاختبار الكاملة

### السيناريو الأول: اختبار الاستعلام عن وثيقة مُحمَّلة

1. ارفع ملف PDF يحتوي على محتوى معروف (مثلاً وثيقة عن تقنية معينة)
2. اسأل سؤالاً عن محتوى الوثيقة:

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"ما هي الموضوعات الرئيسية في الوثيقة المرفوعة؟\", \"sessionId\": \"doc-test-1\"}"
```

**النتيجة المتوقعة:** يبحث الوكيل في قاعدة المعرفة ويُعيد إجابة من محتوى الوثيقة

### السيناريو الثاني: اختبار الجلسات المتعددة

```bash
# جلسة المستخدم الأول
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"أنا مستخدم رقم 1\", \"sessionId\": \"user-session-A\"}"

# جلسة المستخدم الثاني
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"أنا مستخدم رقم 2\", \"sessionId\": \"user-session-B\"}"

# التحقق أن الجلستين مستقلتان
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"من أنا؟\", \"sessionId\": \"user-session-A\"}"
```

**النتيجة المتوقعة:** الجلسة A تتذكر "مستخدم رقم 1" فقط

### السيناريو الثالث: اختبار بدون sessionId

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"مرحباً\"}"
```

**النتيجة المتوقعة:** يعمل بشكل طبيعي مع الجلسة الافتراضية `"default"`

---

## 🖥️ اختبار الواجهة الأمامية

1. افتح المتصفح على `http://localhost:5173`
2. تحقق من النقاط التالية:

| الاختبار        | الخطوات                                       | النتيجة المتوقعة                 |
| --------------- | --------------------------------------------- | -------------------------------- |
| إرسال رسالة     | اكتب رسالة في الحقل واضغط Enter أو زر الإرسال | تظهر الرسالة مع رد الوكيل        |
| رفع PDF         | انقر على زر رفع الملف واختر ملف PDF           | رسالة نجاح "تم رفع الملف"        |
| رفع ملف غير PDF | حاول رفع ملف .txt أو .docx                    | رسالة خطأ "يُسمح بملفات PDF فقط" |
| رفع ملف كبير    | ارفع PDF أكبر من 25MB                         | رسالة خطأ حد الحجم               |
| الاستمرارية     | أرسل عدة رسائل في نفس الجلسة                  | يتذكر الوكيل سياق المحادثة       |

---

## 🔑 اختبار متغيرات البيئة

للتحقق من صحة الاتصال بالخدمات الخارجية:

**اختبار مفتاح OpenAI:**

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**النتيجة المتوقعة:** قائمة بالنماذج المتاحة

**اختبار Pinecone:**

```bash
curl "https://api.pinecone.io/indexes" \
  -H "Api-Key: $PINECONE_API_KEY"
```

**النتيجة المتوقعة:** قائمة بالـ indexes الموجودة

---

## ❌ الأخطاء الشائعة وحلولها

| الخطأ                        | السبب المحتمل            | الحل                               |
| ---------------------------- | ------------------------ | ---------------------------------- |
| `ECONNREFUSED 3001`          | الخادم لا يعمل           | شغّل `npm run dev:server`          |
| `Missing PINECONE_API_KEY`   | متغير البيئة غير موجود   | تحقق من ملف `.env` داخل `server/`  |
| `Only PDF files are allowed` | رفع ملف من نوع آخر       | استخدم ملفات PDF فقط               |
| `File too large`             | حجم الملف أكبر من 25MB   | استخدم ملف PDF أصغر                |
| `OpenAI API error`           | مفتاح خاطئ أو رصيد منتهي | تحقق من مفتاح OpenAI ورصيد الحساب  |
| `Pinecone index not found`   | اسم الـ index خاطئ       | تحقق من `PINECONE_INDEX` في `.env` |

---

## 📂 ملف PDF مقترح للاختبار

يمكنك إنشاء ملف PDF بسيط للاختبار يحتوي على معلومات واضحة، مثلاً:

- وثيقة تقنية عن Node.js
- ملف README محوَّل إلى PDF
- أي وثيقة نصية بلغة معروفة

---

## ✅ قائمة تحقق سريعة قبل الاختبار

- [ ] ملف `.env` موجود في `server/`
- [ ] جميع المفاتيح في `.env` صحيحة
- [ ] Pinecone index مُنشأ ويعمل
- [ ] تم تثبيت المكتبات: `npm run install:all`
- [ ] الخادم يعمل على المنفذ 3001
- [ ] الواجهة تعمل على المنفذ 5173
- [ ] تم رفع ملف PDF واحد على الأقل قبل اختبار البحث
