// ─── Documentation Indexer ───────────────────────────────────────────────────
// تقسيم النصوص وإنشاء embeddings وتخزينها في Pinecone
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { PineconeStore } from "@langchain/pinecone";
import { PineconeEmbeddings } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import db from "../db.js";

const DEV_DOCS_NAMESPACE = "dev_docs";
const BATCH_SIZE = 96;
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 300;

let cachedStore = null;

async function getDevDocsStore() {
  if (cachedStore) return cachedStore;

  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;
  if (!apiKey) throw new Error("Missing PINECONE_API_KEY");
  if (!indexName) throw new Error("Missing PINECONE_INDEX");

  const pc = new PineconeClient({ apiKey });
  const index = pc.Index(indexName);
  const embeddings = new PineconeEmbeddings({ model: "llama-text-embed-v2" });

  cachedStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    namespace: DEV_DOCS_NAMESPACE,
  });

  return cachedStore;
}

export function clearStoreCache() {
  cachedStore = null;
}

/**
 * فهرسة docs محللة لـ framework محدد
 * @param {Array<{title, content, url, framework, section}>} parsedDocs
 * @param {string} frameworkId
 * @param {string} version
 * @param {function} onProgress - callback(indexed, total, phase)
 * @returns {Promise<number>} - عدد الـ chunks المخزنة
 */
export async function indexDocs(parsedDocs, frameworkId, version, onProgress) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  // تحويل إلى LangChain Documents
  const allDocs = [];
  for (const doc of parsedDocs) {
    const chunks = await splitter.splitText(doc.content);
    for (const chunkText of chunks) {
      allDocs.push(
        new Document({
          pageContent: chunkText,
          metadata: {
            framework: frameworkId,
            page: doc.section,
            title: doc.title,
            url: doc.url,
            version: version || "latest",
            source: "official_docs",
          },
        })
      );
    }
  }

  console.log(
    `📦 [${frameworkId}] Created ${allDocs.length} chunks from ${parsedDocs.length} pages`
  );

  // تخزين في Pinecone بدفعات
  const store = await getDevDocsStore();
  let indexed = 0;

  for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
    const batch = allDocs.slice(i, i + BATCH_SIZE);
    await store.addDocuments(batch);
    indexed += batch.length;

    if (onProgress) {
      onProgress(indexed, allDocs.length, "indexing");
    }
  }

  console.log(
    `✅ [${frameworkId}] Indexed ${indexed} chunks into Pinecone (ns: ${DEV_DOCS_NAMESPACE})`
  );
  return indexed;
}

/**
 * حذف كل vectors خاصة بـ framework محدد
 * @param {string} frameworkId
 */
export async function deleteFrameworkVectors(frameworkId) {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;

  const pc = new PineconeClient({ apiKey });
  const index = pc.Index(indexName).namespace(DEV_DOCS_NAMESPACE);

  try {
    await index.deleteMany({ framework: { $eq: frameworkId } });
    clearStoreCache();
    console.log(`🗑️ Deleted Pinecone vectors for framework: ${frameworkId}`);
  } catch (err) {
    console.error(`❌ Failed to delete vectors for ${frameworkId}:`, err.message);
    throw err;
  }
}

/**
 * إعادة فهرسة (حذف القديم + فهرسة جديد)
 */
export async function reindexFramework(parsedDocs, frameworkId, version, onProgress) {
  await deleteFrameworkVectors(frameworkId);
  return await indexDocs(parsedDocs, frameworkId, version, onProgress);
}
