# 📊 Data Preprocessing — Document RAG System

> **System:** Personal Document RAG (Retrieval-Augmented Generation)  
> **Project:** Agentic Personal Assistant  
> **Date:** March 2026

---

## 1. نظرة عامة (Overview)

يمر كل مستند مرفوع عبر خط معالجة مسبقة (preprocessing pipeline) يتكون من 5 مراحل متتالية:

```
رفع الملف → التحقق والتصنيف → تحميل المحتوى → تقطيع النص → توليد Embeddings وتخزينها
```

---

## 2. المرحلة الأولى: رفع الملف والتحقق (Upload & Validation)

### 2.1 إعدادات Multer

```javascript
// Multer disk storage configuration
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});
```

### 2.2 التحقق من نوع الملف

```javascript
// documentLoader.js
export const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".txt", ".csv"];

export const SUPPORTED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/csv",
];

export function isSupportedFile(mimetype, filename) {
  const ext = path.extname(filename || "").toLowerCase();
  return (
    SUPPORTED_MIMES.includes(mimetype) || SUPPORTED_EXTENSIONS.includes(ext)
  );
}
```

### 2.3 تسجيل الملف في قاعدة البيانات

عند بدء المعالجة، يُسجل الملف بحالة `'processing'`:

```javascript
const docResult = db
  .prepare(
    `INSERT INTO documents (user_id, filename, original_name, file_size, file_type, status)
   VALUES (?, ?, ?, ?, ?, 'processing')`,
  )
  .run(userId, path.basename(filePath), originalName, fileSize, fileType);
const docId = docResult.lastInsertRowid;
```

---

## 3. المرحلة الثانية: تحميل المحتوى (Document Loading)

### 3.1 نظام التوجيه (`documentLoader.js`)

يحدد النظام نوع الملف من الامتداد ويستخدم الـ loader المناسب:

```javascript
export async function loadDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".pdf":
      return loadPDF(filePath);
    case ".docx":
      return loadDocx(filePath);
    case ".pptx":
      return loadPptx(filePath);
    case ".txt":
      return loadTxt(filePath);
    case ".csv":
      return loadCsv(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}
```

### 3.2 تفاصيل كل Loader

#### PDF Loader

```javascript
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

async function loadPDF(filePath) {
  const loader = new PDFLoader(filePath);
  return loader.load();
  // يُرجع: [{ pageContent: "...", metadata: { source, loc: { pageNumber } } }, ...]
  // كل صفحة → Document منفصل مع رقم الصفحة
}
```

- **المكتبة**: `pdf-parse` عبر LangChain `PDFLoader`
- **الآلية**: يقرأ كل صفحة في PDF ويستخرج النص
- **الخرج**: مصفوفة Documents — كل document = صفحة واحدة
- **Metadata**: `source` (مسار الملف) + `loc.pageNumber` (رقم الصفحة)

#### DOCX Loader

```javascript
async function loadDocx(filePath) {
  const mammoth = await import("mammoth");
  const buffer = await readFile(filePath);
  const result = await mammoth.default.extractRawText({ buffer });
  const text = result.value;

  if (!text || text.trim().length === 0) {
    throw new Error("No text content found in DOCX file");
  }

  return [
    {
      pageContent: text,
      metadata: { source: filePath, type: "docx" },
    },
  ];
}
```

- **المكتبة**: `mammoth` (dynamic import)
- **الآلية**: `extractRawText()` — يستخرج النص الخام من ملف Word
- **الخرج**: Document واحد يحتوي كل النص
- **ملاحظة**: يتجاهل التنسيقات والصور، يستخرج النص فقط

#### PPTX Loader

```javascript
async function loadPptx(filePath) {
  const officeparser = await import("officeparser");
  const text = await officeparser.default.parseOfficeAsync(filePath);

  if (!text || text.trim().length === 0) {
    throw new Error("No text content found in PPTX file");
  }

  return [
    {
      pageContent: text,
      metadata: { source: filePath, type: "pptx" },
    },
  ];
}
```

- **المكتبة**: `officeparser` (dynamic import)
- **الآلية**: `parseOfficeAsync()` — يستخرج النص من كل شرائح العرض
- **الخرج**: Document واحد يحتوي كل النص

#### TXT Loader

```javascript
async function loadTxt(filePath) {
  const text = await readFile(filePath, "utf-8");

  if (!text || text.trim().length === 0) {
    throw new Error("No text content found in TXT file");
  }

  return [
    {
      pageContent: text,
      metadata: { source: filePath, type: "txt" },
    },
  ];
}
```

- **المكتبة**: Native Node.js `fs/promises`
- **الآلية**: قراءة مباشرة بترميز UTF-8

#### CSV Loader

```javascript
async function loadCsv(filePath) {
  const text = await readFile(filePath, "utf-8");

  if (!text || text.trim().length === 0) {
    throw new Error("No text content found in CSV file");
  }

  return [
    {
      pageContent: text,
      metadata: { source: filePath, type: "csv" },
    },
  ];
}
```

- **المكتبة**: Native Node.js `fs/promises`
- **الآلية**: قراءة CSV كنص خام مع الحفاظ على البنية

### 3.3 تنسيق المخرجات الموحد (LangChain Document Format)

```javascript
// كل loader يُرجع مصفوفة بهذا الشكل:
[
  {
    pageContent: string, // النص المستخرج
    metadata: {
      source: string, // مسار الملف
      type: string, // نوع الملف ("pdf", "docx", ...)
      // PDF يضيف أيضاً:
      loc: { pageNumber: number },
    },
  },
];
```

### 3.4 التحقق من المحتوى

كل loader يتحقق من أن النص المستخرج غير فارغ:

```javascript
if (!text || text.trim().length === 0) {
  throw new Error("No text content found in [TYPE] file");
}
```

---

## 4. المرحلة الثالثة: تقطيع النصوص (Text Splitting)

### 4.1 خوارزمية التقطيع

يستخدم النظام **RecursiveCharacterTextSplitter** من LangChain:

```javascript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const chunks = await splitter.splitDocuments(docs);
```

### 4.2 معاملات التقطيع

| المعامل          | القيمة                    | السبب                                                 |
| ---------------- | ------------------------- | ----------------------------------------------------- |
| **chunkSize**    | 1000 حرف                  | حجم مثالي يحافظ على السياق ومناسب لحد embedding model |
| **chunkOverlap** | 200 حرف                   | تداخل 20% يمنع فقدان المعلومات عند حدود القطع         |
| **separators**   | `["\n\n", "\n", " ", ""]` | تقسيم هرمي: فقرات أولاً، ثم سطور، ثم كلمات            |

### 4.3 آلية عمل RecursiveCharacterTextSplitter

```
المبدأ: يحاول التقسيم بأكبر فاصل ممكن أولاً (فترات مزدوجة)
       إذا لم يكفِ، ينتقل لفاصل أصغر (سطر جديد)
       وهكذا حتى يصل لحد الحرف الواحد

مثال على مستند 3200 حرف:
┌──────────────────────────────────────────┐
│ Original Document (3200 chars)           │
├──────────────────────────────────────────┤
│ Chunk 1: chars [0—1000]                  │
│ Chunk 2: chars [800—1800]    ← 200 overlap
│ Chunk 3: chars [1600—2600]   ← 200 overlap
│ Chunk 4: chars [2400—3200]   ← 200 overlap
└──────────────────────────────────────────┘
```

### 4.4 لماذا هذه المعاملات؟

- **1000 حرف**: كافي لتضمين فقرة أو فقرتين كاملتين — يحافظ على المعنى
- **200 حرف تداخل**: يضمن أن الجمل على حدود القطع لا تُفقد — أي سؤال عن معلومة على الحدود سيجدها
- **هرمي**: يقسم بذكاء — يفضل القطع على فقرات كاملة بدلاً من قطع جملة في المنتصف

---

## 5. المرحلة الرابعة: إضافة Metadata

بعد التقطيع، يُضاف metadata لكل chunk لتمكين الربط والحذف:

```javascript
for (const chunk of chunks) {
  chunk.metadata = {
    ...chunk.metadata, // metadata أصلي (source, type, pageNumber)
    docId: String(docId), // معرف المستند في SQLite
    userId: String(userId), // معرف المستخدم
  };
}
```

### 5.1 بنية Metadata النهائية لكل Chunk

| Field            | Type   | القيمة                 | الغرض        |
| ---------------- | ------ | ---------------------- | ------------ |
| `source`         | string | مسار الملف             | معرفة المصدر |
| `type`           | string | `"pdf"`, `"docx"`, ... | نوع الملف    |
| `loc.pageNumber` | number | رقم الصفحة (PDF فقط)   | تحديد الموقع |
| `docId`          | string | معرف المستند           | ربط وحذف     |
| `userId`         | string | معرف المستخدم          | عزل وأمان    |

---

## 6. المرحلة الخامسة: توليد Embeddings والتخزين

### 6.1 نموذج الـ Embedding

| المعامل               | القيمة                        |
| --------------------- | ----------------------------- |
| **Model**             | `llama-text-embed-v2`         |
| **Provider**          | Pinecone (embedded inference) |
| **Vector Dimensions** | 1024                          |
| **Similarity Metric** | Cosine similarity             |

```javascript
const embeddings = new PineconeEmbeddings({ model: "llama-text-embed-v2" });
```

### 6.2 التخزين في Pinecone

```javascript
const store = await getVectorStoreForUser(userId);
// namespace: user_{userId}

const BATCH_SIZE = 96;
for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
  const batch = chunks.slice(i, i + BATCH_SIZE);
  await store.addDocuments(batch);
}
```

| المعامل        | القيمة                                |
| -------------- | ------------------------------------- |
| **Namespace**  | `user_{userId}` — عزل كامل لكل مستخدم |
| **Batch Size** | 96 chunks لكل دفعة                    |
| **Index**      | يُحدد من `.env` (`PINECONE_INDEX`)    |

### 6.3 التخزين المؤقت (Caching)

```javascript
// tools.js — Vector Store cache
const storeCache = new Map();

const getVectorStore = async (namespace) => {
  if (storeCache.has(namespace)) return storeCache.get(namespace);
  // ... create new store
  storeCache.set(namespace, store);
  return store;
};
```

- يتم cache الـ PineconeStore لكل namespace لتجنب إعادة الإنشاء
- يُبطل الـ cache عند حذف مستند (`storeCache.delete(namespace)`)

---

## 7. المرحلة السادسة: تحديث الحالة

### 7.1 في حالة النجاح:

```javascript
db.prepare(
  `UPDATE documents SET status = 'ready', chunk_count = ? WHERE id = ?`,
).run(chunks.length, docId);
```

### 7.2 في حالة الخطأ:

```javascript
db.prepare(`UPDATE documents SET status = 'error' WHERE id = ?`).run(docId);
```

---

## 8. معالجة البحث (Query-Time Processing)

### 8.1 أداة البحث في قاعدة المعرفة

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

### 8.2 معاملات البحث

| المعامل        | القيمة                |
| -------------- | --------------------- |
| **Top K**      | 10 نتائج              |
| **Timeout**    | 4 ثوانٍ (في agent.js) |
| **Namespace**  | `user_{userId}`       |
| **Similarity** | Cosine similarity     |

---

## 9. معالجة الحذف (Delete Processing)

```javascript
export async function deleteDocumentVectors(userId, docId) {
  const namespace = `user_${userId}`;
  const pc = new PineconeClient({ apiKey });
  const index = pc.Index(indexName).namespace(namespace);

  // حذف بفلتر metadata
  await index.deleteMany({ docId: { $eq: String(docId) } });

  // إبطال cache
  storeCache.delete(namespace);
}
```

---

## 10. ملخص خط المعالجة الكامل

```
┌─────────────────────────────────────────────────────────────┐
│           Document RAG Preprocessing Pipeline                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Upload: Multer → disk storage (25MB max)                │
│  2. Validate: isSupportedFile() → extension + MIME check    │
│  3. Register: INSERT documents → status = 'processing'       │
│  4. Load: loadDocument() → format-specific loader            │
│     • PDF → PDFLoader (per-page extraction)                 │
│     • DOCX → mammoth.extractRawText()                       │
│     • PPTX → officeparser.parseOfficeAsync()                │
│     • TXT → fs.readFile(utf-8)                              │
│     • CSV → fs.readFile(utf-8)                              │
│  5. Split: RecursiveCharacterTextSplitter                    │
│     • chunkSize: 1000 | chunkOverlap: 200                   │
│     • separators: ["\n\n", "\n", " ", ""]                   │
│  6. Enrich: Add metadata (docId, userId)                     │
│  7. Embed: PineconeEmbeddings (llama-text-embed-v2, 1024d)  │
│  8. Store: Pinecone → namespace user_{userId}                │
│     • batch size: 96 chunks per batch                        │
│  9. Update: documents.status = 'ready', chunk_count = N     │
│                                                              │
│  On Error: documents.status = 'error'                        │
│  On Delete: Pinecone deleteMany({docId}) + cache invalidate │
└─────────────────────────────────────────────────────────────┘
```
