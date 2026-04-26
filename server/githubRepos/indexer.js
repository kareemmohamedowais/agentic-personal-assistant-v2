// ─── GitHub Repos — Indexer (chunking + Pinecone storage) ────────────────────
// text to chunks 
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
// Document →  chunk => document (text + metadata)
// {
//   pageContent: "النص",
//   metadata: { ... }
// }
import { Document } from "@langchain/core/documents";
// ربط LangChain مع Pinecone + embeddings
import { PineconeStore } from "@langchain/pinecone";
import { PineconeEmbeddings } from "@langchain/pinecone";

// Pinecone client for direct index management 
// delete
// create index
// queries
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import path from "node:path";
import {
  GITHUB_REPOS_NAMESPACE,
  CODE_CHUNK_SIZE,
  CODE_CHUNK_OVERLAP,
  DOCS_CHUNK_SIZE,
  DOCS_CHUNK_OVERLAP,
  CONFIG_CHUNK_SIZE,
  CONFIG_CHUNK_OVERLAP,
  BATCH_SIZE,
  CODE_SEPARATORS,
  EXT_LANGUAGE_MAP,
} from "./config.js";

// Cached Pinecone store to reuse across requests (since creating it is expensive)
let cachedStore = null;

async function getGithubReposStore() {
  if (cachedStore) return cachedStore;

  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;
  if (!apiKey) throw new Error("Missing PINECONE_API_KEY");
  if (!indexName) throw new Error("Missing PINECONE_INDEX");
  // create Pinecone client → connect to index → create LangChain store wrapper around it
  const pc = new PineconeClient({ apiKey });
  const index = pc.Index(indexName);
  //بيحول النص لـ vector
  const embeddings = new PineconeEmbeddings({ model: "llama-text-embed-v2" });

  cachedStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    namespace: GITHUB_REPOS_NAMESPACE,
  });

  return cachedStore;
}

export function clearStoreCache() {
  cachedStore = null;
}

/**
 * Index parsed repo files into Pinecone
 * @param {{ files: Array, tree: string }} parsed - from parseRepoFiles
 * @param {string} repoFullName - e.g. "facebook/react"
 * @param {number|string} userId - owner of this repo (for isolation)
 * @param {function} onProgress - callback(indexed, total, phase)
 * @returns {Promise<number>} - number of chunks stored
 */
export async function indexRepoFiles(parsed, repoFullName, userId, onProgress) {
  const userIdStr = String(userId);

  // Language-aware splitter factory
  function getSplitter(file) {
    if (file.type === "docs") {
      return new RecursiveCharacterTextSplitter({
        chunkSize: DOCS_CHUNK_SIZE,
        chunkOverlap: DOCS_CHUNK_OVERLAP,
      });
    }
    if (file.type === "config") {
      return new RecursiveCharacterTextSplitter({
        chunkSize: CONFIG_CHUNK_SIZE,
        chunkOverlap: CONFIG_CHUNK_OVERLAP,
      });
    }
    // code — pick language-specific separators
    const ext = path.extname(file.path).toLowerCase();
    const separators = CODE_SEPARATORS[ext] || CODE_SEPARATORS.default;
    return new RecursiveCharacterTextSplitter({
      chunkSize: CODE_CHUNK_SIZE,
      chunkOverlap: CODE_CHUNK_OVERLAP,
      separators,
    });
  }

  const allDocs = [];

  // Index project tree as a special document
  // This gives the AI an overview of the repo structure, which improves understanding 
  if (parsed.tree) {
    allDocs.push(
      new Document({
        pageContent: `# Project Structure: ${repoFullName}\n\n\`\`\`\n${parsed.tree}\`\`\``,
        metadata: {
          repo: repoFullName,
          userId: userIdStr,
          filePath: "__PROJECT_TREE__",
          fileType: "tree",
          source: "github_repo",
        },
      })
    );
  }

  // Chunk all files with language-aware splitting
  for (const file of parsed.files) {
    const ext = path.extname(file.path).toLowerCase();
    const language = EXT_LANGUAGE_MAP[ext] || "Unknown";
    const splitter = getSplitter(file);
    const chunks = await splitter.splitText(file.content);
    const totalChunks = chunks.length;

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunkText = chunks[idx];
      // Rich header: repo, file, language, chunk position
      const header = `## ${repoFullName} — ${file.path} [${language}] (chunk ${idx + 1}/${totalChunks})\n\n`;
      allDocs.push(
        new Document({
          pageContent: header + chunkText,
          metadata: {
            repo: repoFullName,
            userId: userIdStr,
            filePath: file.path,
            fileType: file.type,
            language,
            chunkIndex: idx,
            totalChunks,
            source: "github_repo",
          },
        })
      );
    }
  }

  console.log(
    ` [${repoFullName}] Created ${allDocs.length} chunks from ${parsed.files.length} files`
  );

  // Store in Pinecone batches
  const store = await getGithubReposStore();
  let indexed = 0;

  for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
    const batch = allDocs.slice(i, i + BATCH_SIZE);
    // يحول النص → Embedding (Vector)
    // يربطه بالـ metadata
    // يخزنه في Pinecone
    await store.addDocuments(batch);
    indexed += batch.length;
    if (onProgress) onProgress(indexed, allDocs.length, "indexing");
  }

  console.log(
    ` [${repoFullName}] Indexed ${indexed} chunks into Pinecone (ns: ${GITHUB_REPOS_NAMESPACE})`
  );
  return indexed;
}

/**
 * Delete all vectors for a specific repo owned by a specific user
 */
export async function deleteRepoVectors(repoFullName, userId) {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;

  const pc = new PineconeClient({ apiKey });
  const index = pc.Index(indexName).namespace(GITHUB_REPOS_NAMESPACE);

  try {
    await index.deleteMany({ repo: { $eq: repoFullName }, userId: { $eq: String(userId) } });
    clearStoreCache();
    console.log(` Deleted Pinecone vectors for repo: ${repoFullName}`);
  } catch (err) {
    console.error(` Failed to delete vectors for ${repoFullName}:`, err.message);
    throw err;
  }
}

/**
 * Re-index (delete old + index new)
 */
export async function reindexRepo(parsed, repoFullName, userId, onProgress) {
  await deleteRepoVectors(repoFullName, userId);
  return await indexRepoFiles(parsed, repoFullName, userId, onProgress);
}
