import { tool } from "langchain";
import { z } from "zod";
import { PineconeStore } from "@langchain/pinecone";
import { PineconeEmbeddings } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";

// Cache per namespace (userId)
const storeCache = new Map();

const getVectorStore = async (namespace) => {
  if (storeCache.has(namespace)) return storeCache.get(namespace);

  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;

  if (!apiKey) throw new Error("Missing PINECONE_API_KEY");
  if (!indexName) throw new Error("Missing PINECONE_INDEX");

  const pc = new PineconeClient({ apiKey });
  const index = pc.Index(indexName);

  const embeddings = new PineconeEmbeddings({ model: "llama-text-embed-v2" });

  const store = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    namespace, // ← كل مستخدم له namespace منفصل
  });

  storeCache.set(namespace, store);
  return store;
};

// أداة البحث — تُنشأ لكل مستخدم بـ namespace خاص به
export function createSearchTool(userId) {
  const namespace = `user_${userId}`;

  return tool(
    async ({ query }) => {
      console.log(`🔍 [user:${userId}] Searching namespace "${namespace}" for: "${query}"`);

      const store = await getVectorStore(namespace);
      const results = await store.similaritySearch(query, 10);

      results.forEach((r, i) => {
        console.log(`Result ${i + 1}:`, r.pageContent.slice(0, 200));
      });

      if (results.length === 0) {
        return "No relevant information found in the knowledge base.";
      }

      return results.map((doc) => doc.pageContent).join("\n\n---\n\n");
    },
    {
      name: "search_knowledge_base",
      description:
        "Searches the internal knowledge base for technical info and documentation. Use this when you need to find information from uploaded PDF documents.",
      schema: z.object({
        query: z.string().describe("The search query to look up in the knowledge base"),
      }),
    }
  );
}

// حذف جميع vectors مرتبطة بمستند محدد من Pinecone
export async function deleteDocumentVectors(userId, docId) {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;
  const namespace = `user_${userId}`;

  const pc = new PineconeClient({ apiKey });
  const index = pc.Index(indexName).namespace(namespace);

  try {
    // حذف بفلتر الـ metadata (docId)
    await index.deleteMany({ docId: { $eq: String(docId) } });
    // إبطال cache هذا المستخدم حتى تُعاد تهيئة الـ store
    storeCache.delete(namespace);
    console.log(`🗑️ [user:${userId}] Deleted Pinecone vectors for docId:${docId}`);
  } catch (err) {
    console.error(`❌ Failed to delete Pinecone vectors for docId:${docId}:`, err.message);
    throw err;
  }
}

// تُستخدم في ingest.js
export const getVectorStoreForUser = (userId) => getVectorStore(`user_${userId}`);

// ─── Web Search via Tavily REST API ────────────────────────
export async function webSearch(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ TAVILY_API_KEY not set — skipping web search");
    return null;
  }
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 5,
        include_answer: false,
      }),
    });
    if (!response.ok) {
      console.warn(`⚠️ Tavily API error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    const results = data.results || [];
    if (results.length === 0) return null;
    const formatted = results
      .map(
        (r, i) =>
          `[${i + 1}] ${r.title || ""}\n${r.content || r.snippet || ""}\nSource: ${r.url || ""}`
      )
      .join("\n\n");
    console.log(`🌐 [WebSearch] Found ${results.length} results for: "${query.slice(0, 50)}"`);
    return formatted;
  } catch (err) {
    console.warn(`⚠️ Web search failed: ${err.message}`);
    return null;
  }
}
