// ─── Developer Docs Search System ───────────────────────────────────────────
// بحث ذكي في توثيق الـ frameworks مع دعم فلترة حسب تفضيلات المستخدم
import { PineconeStore } from "@langchain/pinecone";
import { PineconeEmbeddings } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { FRAMEWORKS } from "./frameworks.js";

const DEV_DOCS_NAMESPACE = "dev_docs";
let cachedStore = null;

async function getDevDocsStore() {
  if (cachedStore) return cachedStore;

  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;
  if (!apiKey || !indexName) return null;

  const pc = new PineconeClient({ apiKey });
  const index = pc.Index(indexName);
  const embeddings = new PineconeEmbeddings({ model: "llama-text-embed-v2" });

  cachedStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    namespace: DEV_DOCS_NAMESPACE,
  });

  return cachedStore;
}

/**
 * بحث في توثيق الـ frameworks المفعّلة
 * @param {string} query - سؤال المستخدم
 * @param {string[]} enabledFrameworks - قائمة frameworks المفعّلة (مثلاً ["laravel", "react"])
 * @param {number} topK - عدد النتائج المطلوبة
 * @returns {Promise<string|null>} - النص context أو null
 */
export async function searchDevDocs(query, enabledFrameworks, topK = 5) {
  if (!enabledFrameworks || enabledFrameworks.length === 0) return null;

  const TIMEOUT_MS = 5000;
  try {
    const searchPromise = (async () => {
      const store = await getDevDocsStore();
      if (!store) return null;

      const filter = {
        framework: { $in: enabledFrameworks },
      };

      const results = await store.similaritySearch(query, topK, filter);
      if (!results || results.length === 0) return null;

      console.log(`📚 [DevDocs] Found ${results.length} results for: "${query.slice(0, 50)}"`);

      // تنسيق النتائج مع metadata
      return results
        .map((doc) => {
          const m = doc.metadata;
          const header = `[${m.framework?.toUpperCase()} — ${m.title || m.page}](${m.url || ""})`;
          return `${header}\n${doc.pageContent}`;
        })
        .join("\n\n---\n\n");
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DEV_DOCS_TIMEOUT")), TIMEOUT_MS)
    );

    return await Promise.race([searchPromise, timeoutPromise]);
  } catch (err) {
    if (err.message === "DEV_DOCS_TIMEOUT") {
      console.warn("⏱️ DevDocs search timed out");
    } else {
      console.error("⚠️ DevDocs search failed:", err.message);
    }
    return null;
  }
}

/**
 * اكتشاف framework تلقائي من السؤال
 * يعطي boost للنتائج من framework المذكور في السؤال
 * @param {string} query
 * @returns {string[]} - frameworks مكتشفة
 */
export function detectFrameworks(query) {
  const lower = query.toLowerCase();
  const detected = [];

  for (const fw of FRAMEWORKS) {
    for (const keyword of fw.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        detected.push(fw.id);
        break;
      }
    }
  }

  return [...new Set(detected)];
}

export function clearDevDocsCache() {
  cachedStore = null;
}
