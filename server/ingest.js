import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getVectorStoreForUser } from "./tools.js";
import { loadDocument } from "./documentLoader.js";
import path from "node:path";
import db from "./db.js";

export const ingestData = async (filePath, userId, originalName, fileSize) => {
  const fileType = path.extname(originalName || filePath).replace(".", "").toLowerCase() || "pdf";

  // حفظ سجل الملف في SQLite بحالة processing
  const docResult = db
    .prepare(
      `INSERT INTO documents (user_id, filename, original_name, file_size, file_type, status)
       VALUES (?, ?, ?, ?, ?, 'processing')`
    )
    .run(
      userId,
      path.basename(filePath),
      originalName || path.basename(filePath),
      fileSize || 0,
      fileType
    );
  const docId = docResult.lastInsertRowid;

  try {
    // تحميل المستند باستخدام الـ loader المناسب
    const docs = await loadDocument(filePath);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitDocuments(docs);

    // إضافة docId في metadata كل chunk للربط عند الحذف
    for (const chunk of chunks) {
      chunk.metadata = {
        ...chunk.metadata,
        docId: String(docId),
        userId: String(userId),
      };
    }

    // استخدام namespace خاص بهذا المستخدم
    const store = await getVectorStoreForUser(userId);

    const BATCH_SIZE = 96;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      await store.addDocuments(batch);
    }

    // تحديث حالة الملف وعدد الأجزاء
    db.prepare(`UPDATE documents SET status = 'ready', chunk_count = ? WHERE id = ?`).run(
      chunks.length,
      docId
    );

    console.log(
      `✅ [user:${userId}] Ingestion Complete! (${originalName}, ${chunks.length} chunks, docId: ${docId})`
    );
    return docId;
  } catch (error) {
    // تحديث حالة الملف إلى خطأ
    db.prepare(`UPDATE documents SET status = 'error' WHERE id = ?`).run(docId);
    console.error(`❌ [user:${userId}] Ingestion failed for ${originalName}:`, error.message);
    throw error;
  }
};
