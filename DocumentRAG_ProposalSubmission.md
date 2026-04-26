# 📋 Proposal Submission — Document RAG System

> **System:** Personal Document RAG (Retrieval-Augmented Generation)  
> **Project:** Agentic Personal Assistant  
> **Date:** March 2026

---

## 1. مقدمة النظام (Introduction)

نظام **Document RAG** هو النظام الأول والأساسي في المشروع، يتيح لكل مستخدم رفع مستنداته الشخصية (PDF, DOCX, PPTX, TXT, CSV) ثم محادثة الذكاء الاصطناعي حول محتواها. النظام يحول المستندات إلى **vector embeddings** ويخزنها في قاعدة بيانات متجهية **Pinecone** مع عزل كامل لبيانات كل مستخدم عبر namespaces منفصلة.

---

## 2. تعريف المشكلة (Problem Definition)

### 2.1 المشكلة

نماذج الذكاء الاصطناعي (LLMs) لا تملك إمكانية الوصول للمعلومات الخاصة أو الحديثة للمستخدم. عند سؤال ChatGPT عن محتوى ملف PDF خاص بك، لا يمكنه الإجابة لأنه لم يتدرب على هذا الملف.

### 2.2 الحلول التقليدية ومحدوداتها

| الحل التقليدي            | المحدودية                 |
| ------------------------ | ------------------------- |
| نسخ النص يدوياً          | محدود بحجم context window |
| Fine-tuning              | مكلف ويحتاج بيانات كثيرة  |
| نسخ كل المستند في prompt | يتجاوز حد tokens          |

### 2.3 الحل: RAG

**Retrieval-Augmented Generation** يحل المشكلة عبر:

1. تحويل المستند إلى أجزاء صغيرة (chunks)
2. تخزين كل جزء كـ vector embedding
3. عند السؤال: البحث عن الأجزاء الأكثر صلة
4. إرسال الأجزاء ذات الصلة فقط مع السؤال للـ LLM

---

## 3. المعمارية التقنية (Architecture)

```
                        ┌─────────────────────────────────────┐
                        │         User Upload Flow             │
                        │                                      │
  User uploads PDF ───▶ │ Multer (disk storage)                │
                        │    ↓                                 │
                        │ documentLoader.js (detect format)    │
                        │    ↓                                 │
                        │ PDFLoader / mammoth / officeparser   │
                        │    ↓                                 │
                        │ RecursiveCharacterTextSplitter       │
                        │ (1000 chars / 200 overlap)           │
                        │    ↓                                 │
                        │ PineconeEmbeddings                   │
                        │ (llama-text-embed-v2, 1024-dim)     │
                        │    ↓                                 │
                        │ Pinecone → namespace: user_{userId}  │
                        └─────────────────────────────────────┘

                        ┌─────────────────────────────────────┐
                        │         User Query Flow              │
                        │                                      │
  User asks question ─▶ │ similaritySearch(query, 10)          │
                        │ namespace: user_{userId}             │
                        │ timeout: 4 seconds                   │
                        │    ↓                                 │
                        │ Top 10 chunks returned               │
                        │    ↓                                 │
                        │ Chunks injected into LLM prompt      │
                        │    ↓                                 │
                        │ LLM generates answer with context    │
                        └─────────────────────────────────────┘
```

---

## 4. التقنيات المستخدمة (Technology Stack)

| التقنية                            | الإصدار | الدور                                  |
| ---------------------------------- | ------- | -------------------------------------- |
| **Pinecone**                       | 5.1.2   | قاعدة بيانات متجهية (Vector Store)     |
| **@langchain/pinecone**            | 1.0.1   | LangChain Pinecone integration         |
| **PineconeEmbeddings**             | —       | `llama-text-embed-v2` model (1024-dim) |
| **RecursiveCharacterTextSplitter** | 0.1.0   | تقطيع النصوص بشكل هرمي                 |
| **PDFLoader**                      | —       | استخراج نص PDF (عبر pdf-parse)         |
| **mammoth**                        | 1.11.0  | تحويل DOCX → نص خام                    |
| **officeparser**                   | 6.0.4   | استخراج نص PPTX                        |
| **Multer**                         | 2.0.0   | رفع الملفات مع disk storage            |
| **SQLite** (better-sqlite3)        | 12.6.2  | metadata الملفات وحالتها               |

---

## 5. الملفات المسؤولة (Source Files)

| الملف                      | الدور                              | الوظائف الرئيسية                                                           |
| -------------------------- | ---------------------------------- | -------------------------------------------------------------------------- |
| `server/documentLoader.js` | تحميل الملفات متعددة الأنواع       | `loadDocument()`, `isSupportedFile()`                                      |
| `server/ingest.js`         | خط سير المعالجة الكامل             | `ingestData()`                                                             |
| `server/tools.js`          | البحث الدلالي + إدارة Vector Store | `createSearchTool()`, `getVectorStoreForUser()`, `deleteDocumentVectors()` |
| `server/db.js`             | جدول `documents`                   | Schema + migrations                                                        |
| `server/index.js`          | API endpoints                      | `/api/ingest`, `/api/documents`                                            |

---

## 6. أنواع الملفات المدعومة (Supported Formats)

| التنسيق    | الامتداد | المكتبة                 | MIME Type                                                                   |
| ---------- | -------- | ----------------------- | --------------------------------------------------------------------------- |
| PDF        | `.pdf`   | `PDFLoader` (pdf-parse) | `application/pdf`                                                           |
| Word       | `.docx`  | `mammoth`               | `application/vnd.openxmlformats-officedocument.wordprocessingml.document`   |
| PowerPoint | `.pptx`  | `officeparser`          | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| Plain Text | `.txt`   | Native `fs.readFile`    | `text/plain`                                                                |
| CSV        | `.csv`   | Native `fs.readFile`    | `text/csv`, `application/csv`                                               |

---

## 7. واجهات API (API Endpoints)

| Method | Endpoint             | الوصف                  | الحماية           |
| ------ | -------------------- | ---------------------- | ----------------- |
| POST   | `/api/ingest`        | رفع ومعالجة مستند      | JWT + requireAuth |
| GET    | `/api/documents`     | قائمة مستندات المستخدم | JWT + requireAuth |
| DELETE | `/api/documents/:id` | حذف مستند + vectors    | JWT + requireAuth |

---

## 8. قاعدة البيانات (Database Schema)

```sql
CREATE TABLE IF NOT EXISTS documents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename        TEXT    NOT NULL,
    original_name   TEXT    NOT NULL,
    file_size       INTEGER NOT NULL DEFAULT 0,
    file_type       TEXT    NOT NULL DEFAULT 'pdf',
    chunk_count     INTEGER NOT NULL DEFAULT 0,
    status          TEXT    NOT NULL DEFAULT 'processing'
                    CHECK(status IN ('processing', 'ready', 'error')),
    created_at      TEXT    DEFAULT (datetime('now'))
);
```

---

## 9. نظام العزل (User Isolation)

| الآلية                 | التفاصيل                                      |
| ---------------------- | --------------------------------------------- |
| **Pinecone Namespace** | كل مستخدم في namespace منفصل: `user_{userId}` |
| **SQLite Filter**      | كل استعلام يُفلتر بـ `WHERE user_id = ?`      |
| **Metadata Tagging**   | كل chunk يحمل `docId` + `userId` في metadata  |
| **File Storage**       | ملفات كل مستخدم في مسار منفصل                 |

---

## 10. النتائج المتوقعة (Expected Outcomes)

1. القدرة على رفع مستندات بـ 5 تنسيقات مختلفة
2. بحث دلالي دقيق يسترجع أفضل 10 نتائج في أقل من 4 ثوانٍ
3. عزل كامل بين بيانات المستخدمين
4. القدرة على حذف مستند مع كل الـ vectors المرتبطة به
5. تتبع حالة المعالجة (processing → ready → error)
