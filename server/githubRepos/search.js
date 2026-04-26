// ─── GitHub Repos — Search System ────────────────────────────────────────────
import { PineconeStore } from "@langchain/pinecone";
import { PineconeEmbeddings } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { GITHUB_REPOS_NAMESPACE, SEARCH_SCORE_THRESHOLD, SEARCH_TOP_K } from "./config.js";

let cachedStore = null;

async function getGithubReposStore() {
  if (cachedStore) return cachedStore;

  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;
  if (!apiKey || !indexName) return null;

  const pc = new PineconeClient({ apiKey });
  const index = pc.Index(indexName);
  const embeddings = new PineconeEmbeddings({ model: "llama-text-embed-v2" });

  cachedStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    namespace: GITHUB_REPOS_NAMESPACE,
  });

  return cachedStore;
}

/**
 * Search GitHub repos knowledge base
 * @param {string} query - User question
 * @param {string[]} enabledRepos - List of repo full_names the user enabled (e.g. ["facebook/react"])
 * @param {number|string} userId - The user who owns the repos
 * @param {number} topK - Number of results
 * @returns {Promise<string|null>}
 */
export async function searchGithubRepos(query, enabledRepos, userId, topK = SEARCH_TOP_K) {
  if (!enabledRepos || enabledRepos.length === 0) return null;

  const TIMEOUT_MS = 8000;
  try {
    const searchPromise = (async () => {
      const store = await getGithubReposStore();
      if (!store) return null;

      const userIdStr = String(userId);

      // 1. Main semantic search with scores
      const filter = {
        repo: { $in: enabledRepos },
        userId: { $eq: userIdStr },
      };
      // يجيب بس repos المختارة
      // لنفس المستخدم

      //يحول query → vector
      // يقارن مع كل vectors
      // يرجع أقرب نتائج
      const rawResults = await store.similaritySearchWithScore(query, topK, filter);
      if (!rawResults || rawResults.length === 0) return null;
      // [
      //   [Document, score],
      //   [Document, score]
      // ]
      // 2. Filter by score threshold (lower distance = better match)
      const scored = rawResults
        .map(([doc, score]) => ({ doc, score }))
        .filter((r) => r.score >= SEARCH_SCORE_THRESHOLD);

      if (scored.length === 0) return null;

      // 3. Separate project tree results and file results
      const treeResults = scored.filter((r) => r.doc.metadata.filePath === "__PROJECT_TREE__");
      const fileResults = scored.filter((r) => r.doc.metadata.filePath !== "__PROJECT_TREE__");

      // 4. If no tree in results but we have file results, also fetch tree for context
      let treeContext = "";
      if (treeResults.length > 0) {
        treeContext = treeResults[0].doc.pageContent;
      } else if (fileResults.length > 0) {
        // Try to fetch project tree separately
        try {
          const treeSearch = await store.similaritySearchWithScore(
            "project structure file tree directory",
            1,
            { ...filter, fileType: { $eq: "tree" } }
          );
          if (treeSearch && treeSearch.length > 0 && treeSearch[0][1] >= 0.1) {
            treeContext = treeSearch[0][0].pageContent;
          }
        } catch {
          // Ignore — tree is optional context enhancement
        }
      }

      console.log(
        ` [GitHubRepos] Found ${scored.length} results (${fileResults.length} files, ${treeResults.length} trees) for: "${query.slice(0, 50)}"`
      );



      // 5. Build context string — tree first, then ranked file results
      const parts = [];

      if (treeContext) {
        // Tree gives the AI an overview of the repo structure, which improves understanding 
        parts.push(`### Project Overview\n${treeContext}`);
      }

      // Group file results by file path for better readability
      const fileGroups = new Map();
      for (const r of fileResults) {
        const m = r.doc.metadata;
        const key = `${m.repo}:${m.filePath}`;
        if (!fileGroups.has(key)) fileGroups.set(key, []);
        fileGroups.get(key).push(r);
      }

      // 
      for (const [, group] of fileGroups) {
        // Sort chunks within same file by chunkIndex
        group.sort((a, b) => (a.doc.metadata.chunkIndex || 0) - (b.doc.metadata.chunkIndex || 0));
        for (const r of group) {
          const m = r.doc.metadata;
          const lang = m.language || m.fileType;
          const scoreLabel = `relevance: ${(r.score * 100).toFixed(0)}%`;
          const header = `### [${m.repo} — ${m.filePath}] (${lang}, ${scoreLabel})`;
          parts.push(`${header}\n${r.doc.pageContent}`);
        }
      }

      return parts.join("\n\n---\n\n");
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("GITHUB_REPOS_TIMEOUT")), TIMEOUT_MS)
    );

    return await Promise.race([searchPromise, timeoutPromise]);
  } catch (err) {
    if (err.message === "GITHUB_REPOS_TIMEOUT") {
      console.warn(" GitHubRepos search timed out");
    } else {
      console.error(" GitHubRepos search failed:", err.message);
    }
    return null;
  }
}

export function clearGithubReposCache() {
  cachedStore = null;
}


// User Question
//    ↓
// Embedding
//    ↓
// Pinecone Search
//    ↓
// Filter (repo + user + score)
//    ↓
// Group by file
//    ↓
// Sort chunks
//    ↓
// Add project tree
//    ↓
// Build context
//    ↓
// Send to LLM