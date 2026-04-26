import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { getVectorStoreForUser, webSearch } from "./tools.js";
import { invokeWithRetry, streamWithRetry, getGeminiKeysStatus } from "./providers/index.js";
import { optimizePrompt } from "./promptOptimizer.js";
import { searchDevDocs, detectFrameworks } from "./devDocs/search.js";
import { searchGithubRepos } from "./githubRepos/search.js";
import db from "./db.js";

const HISTORY_LIMIT = 20;
const SUMMARIZE_THRESHOLD = 30;

export function getKeysStatus() {
  return {
    gemini: getGeminiKeysStatus(),
    groq: process.env.GROQ_API_KEY ? "configured" : "missing",
    openrouter: process.env.OPENROUTER_API_KEY ? "configured" : "missing",
  };
}

function loadUserSettings(userId) {
  const row = db.prepare(`SELECT * FROM user_settings WHERE user_id = ?`).get(userId);
  return {
    defaultProvider: row?.default_provider || "groq",
    defaultModel: row?.default_model || "llama-3.3-70b-versatile",
    autoOptimize: row?.auto_optimize === 1,
    userApiKeys: {
      groq: row?.groq_api_key || null,
      openrouter: row?.openrouter_api_key || null,
    },
  };
}

function loadHistory(conversationId) {
  const conv = db.prepare(`SELECT summary FROM conversations WHERE id = ?`).get(conversationId);
  const rows = db
    .prepare(
      `SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ${HISTORY_LIMIT}`
    )
    .all(conversationId);
  rows.reverse();
  const history = rows.map((r) =>
    r.role === "user" ? new HumanMessage(r.content) : new AIMessage(r.content)
  );
  return { history, summary: conv?.summary || null };
}

async function searchKnowledgeBase(userId, query) {
  const TIMEOUT_MS = 4000;
  try {
    const searchPromise = (async () => {
      const store = await getVectorStoreForUser(userId);
      return store.similaritySearch(query, 3);
    })();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("KB_TIMEOUT")), TIMEOUT_MS)
    );
    const results = await Promise.race([searchPromise, timeoutPromise]);
    if (!results || results.length === 0) return null;
    console.log(`\u{1F50D} [user:${userId}] Found ${results.length} KB results`);
    return results.map((d) => d.pageContent).join("\n\n---\n\n");
  } catch (err) {
    if (err.message === "KB_TIMEOUT") {
      console.warn(`\u23F1\uFE0F [user:${userId}] KB search timed out`);
    } else {
      console.error("\u26A0\uFE0F KB search failed:", err.message);
    }
    return null;
  }
}

function buildSystemPrompt(
  promptId,
  context,
  summary,
  webContext,
  devDocsContext,
  githubReposContext
) {
  let basePrompt = "";
  if (promptId) {
    const row = db.prepare(`SELECT system_prompt FROM prompts WHERE id = ?`).get(promptId);
    if (row?.system_prompt) basePrompt = row.system_prompt;
  }
  if (!basePrompt) {
    basePrompt = `You are a knowledgeable and helpful AI assistant. Answer any question the user asks using your general knowledge. Be concise, accurate, and friendly. Always answer in the same language the user uses.`;
  }
  let full = basePrompt;
  if (summary) full += `\n\n## Previous Conversation Summary\n${summary}`;
  if (context) {
    full += `\n\n## Additional Context from Uploaded Documents\nThe following excerpts may be relevant. Use them to enhance your answer when applicable, but do not limit yourself to them:\n\n${context}`;
  }
  if (webContext) {
    full += `\n\n## Web Search Results\nThe following are recent web search results. Use them to provide up-to-date information:\n\n${webContext}`;
  }
  if (devDocsContext) {
    full += `\n\n## Developer Documentation Context\nThe following excerpts come from official developer documentation. Use them to provide accurate, up-to-date technical answers with code examples when relevant:\n\n${devDocsContext}`;
  }
  if (githubReposContext) {
    full += `\n\n## GitHub Repository Code Context\nBelow are code excerpts retrieved from the user's indexed GitHub repositories. Follow these rules strictly:

1. **Always cite file paths** — When referencing code, mention the exact file path (e.g. \"in \`src/utils/helpers.js\`\").
2. **Show actual code** — When answering about implementation details, include the relevant code snippet from the context in a fenced code block with the correct language tag.
3. **Use the project tree** — If a project tree is provided, use it to understand the overall architecture before answering.
4. **Cross-reference files** — When a question involves how components interact, look at multiple file excerpts to give a complete answer.
5. **Acknowledge gaps** — If the retrieved context doesn't contain enough information to fully answer, say so clearly rather than guessing.
6. **Prefer context over assumptions** — Always base your answer on the actual code provided, not on how you think the code \"might\" work.
7. **Chunk awareness** — Results include chunk position (e.g. chunk 2/5). If you see partial code, mention that more exists in the file.

${githubReposContext}`;
  }
  return full;
}

function saveMessage(userId, conversationId, role, content, mediaType = null, mediaUrl = null) {
  db.prepare(
    `INSERT INTO messages (user_id, conversation_id, role, content, media_type, media_url) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId, conversationId, role, content, mediaType, mediaUrl);
  db.prepare(`UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`).run(
    conversationId
  );
}

function buildHumanMessage(message, mediaData) {
  if (!mediaData) return new HumanMessage(message);
  const parts = [];
  if (message) parts.push({ type: "text", text: message });
  if (mediaData.type === "image") {
    parts.push({
      type: "image_url",
      image_url: { url: `data:${mediaData.mimeType};base64,${mediaData.base64}` },
    });
  }
  if (mediaData.type === "audio") {
    parts.push({ type: "media", mimeType: mediaData.mimeType, data: mediaData.base64 });
  }
  return new HumanMessage({ content: parts });
}

async function summarizeOldMessages(conversationId, provider, model, userApiKeys) {
  const countResult = db
    .prepare(`SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ?`)
    .get(conversationId);
  if (!countResult || countResult.cnt < SUMMARIZE_THRESHOLD) return;
  try {
    const oldMessages = db
      .prepare(
        `SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20`
      )
      .all(conversationId);
    if (oldMessages.length < 10) return;
    const summaryMessages = [
      new SystemMessage(
        "Summarize the following conversation in a concise paragraph (max 300 words). Preserve key facts and context. Write in the same language used."
      ),
      ...oldMessages.map((m) =>
        m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
      ),
    ];
    const response = await invokeWithRetry(
      provider,
      model,
      { temperature: 0, userApiKeys },
      summaryMessages
    );
    const summaryText = response?.result?.content || response?.content || "";
    if (summaryText.trim()) {
      const existing = db
        .prepare(`SELECT summary FROM conversations WHERE id = ?`)
        .get(conversationId);
      const newSummary = existing?.summary
        ? `${existing.summary}\n\n---\n\n${summaryText}`
        : summaryText;
      db.prepare(`UPDATE conversations SET summary = ? WHERE id = ?`).run(
        newSummary,
        conversationId
      );
      db.prepare(
        `DELETE FROM messages WHERE id IN (SELECT id FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20)`
      ).run(conversationId);
      console.log(`\u{1F4DD} [conv:${conversationId}] Summarized 20 old messages`);
    }
  } catch (error) {
    console.error("\u274C Summarization error:", error.message);
  }
}

export async function runAgent({
  userId,
  conversationId,
  message,
  promptId,
  mediaData,
  provider: reqProvider,
  model: reqModel,
  optimize = false,
  enableWebSearch = false,
  devDocsMode = false,
  devDocsFrameworks = [],
  githubReposMode = false,
  githubRepos = [],
}) {
  try {
    const settings = loadUserSettings(userId);
    const provider = reqProvider || settings.defaultProvider;
    const model = reqModel || settings.defaultModel;
    const userApiKeys = settings.userApiKeys;

    const finalMessage = optimize ? await optimizePrompt(message) : message;

    const [{ history, summary }, context, webContext, devDocsContext, githubReposContext] =
      await Promise.all([
        Promise.resolve(loadHistory(conversationId)),
        searchKnowledgeBase(userId, finalMessage),
        enableWebSearch ? webSearch(finalMessage) : Promise.resolve(null),
        devDocsMode && devDocsFrameworks.length > 0
          ? searchDevDocs(finalMessage, devDocsFrameworks).catch((e) => {
              console.warn("Dev docs search failed:", e.message);
              return null;
            })
          : Promise.resolve(null),
        githubReposMode && githubRepos.length > 0
          ? searchGithubRepos(finalMessage, githubRepos, userId).catch((e) => {
              console.warn("GitHub repos search failed:", e.message);
              return null;
            })
          : Promise.resolve(null),
      ]);
    const systemPrompt = buildSystemPrompt(
      promptId,
      context,
      summary,
      webContext,
      devDocsContext,
      githubReposContext
    );
    const messages = [
      new SystemMessage(systemPrompt),
      ...history,
      buildHumanMessage(finalMessage, mediaData),
    ];

    console.log(
      `\u{1F916} [user:${userId}] [${provider}/${model}] Running (history:${history.length}${devDocsMode ? " +devDocs" : ""}${githubReposMode ? " +githubRepos" : ""})`
    );
    const {
      result: response,
      usedProvider,
      usedModel,
    } = await invokeWithRetry(provider, model, { userApiKeys }, messages);
    const output = response?.content || "";

    saveMessage(
      userId,
      conversationId,
      "user",
      message,
      mediaData?.type ?? null,
      mediaData?.url ?? null
    );
    saveMessage(userId, conversationId, "ai", output);
    summarizeOldMessages(conversationId, provider, model, userApiKeys).catch(() => {});

    console.log(` [user:${userId}] Response: ${output.slice(0, 100)}...`);
    return {
      output,
      optimizedPrompt: optimize && finalMessage !== message ? finalMessage : null,
      usedProvider,
      usedModel,
    };
  } catch (error) {
    console.error("\u274C Error in runAgent:", error);
    throw error;
  }
}

export async function streamAgent({
  userId,
  conversationId,
  message,
  promptId,
  mediaData,
  provider: reqProvider,
  model: reqModel,
  optimize = false,
  enableWebSearch = false,
  devDocsMode = false,
  devDocsFrameworks = [],
  githubReposMode = false,
  githubRepos = [],
}) {
  const settings = loadUserSettings(userId);
  const provider = reqProvider || settings.defaultProvider;
  const model = reqModel || settings.defaultModel;
  const userApiKeys = settings.userApiKeys;

  const finalMessage = optimize ? await optimizePrompt(message) : message;

  const [{ history, summary }, context, webContext, devDocsContext, githubReposContext] =
    await Promise.all([
      Promise.resolve(loadHistory(conversationId)),
      searchKnowledgeBase(userId, finalMessage),
      enableWebSearch ? webSearch(finalMessage) : Promise.resolve(null),
      devDocsMode && devDocsFrameworks.length > 0
        ? searchDevDocs(finalMessage, devDocsFrameworks).catch((e) => {
            console.warn("Dev docs search failed:", e.message);
            return null;
          })
        : Promise.resolve(null),
      githubReposMode && githubRepos.length > 0
        ? searchGithubRepos(finalMessage, githubRepos, userId).catch((e) => {
            console.warn("GitHub repos search failed:", e.message);
            return null;
          })
        : Promise.resolve(null),
    ]);
  const systemPrompt = buildSystemPrompt(
    promptId,
    context,
    summary,
    webContext,
    devDocsContext,
    githubReposContext
  );
  const messages = [
    new SystemMessage(systemPrompt),
    ...history,
    buildHumanMessage(finalMessage, mediaData),
  ];

  console.log(
    `\u{1F916} [user:${userId}] [${provider}/${model}] Streaming (history:${history.length}${devDocsMode ? " +devDocs" : ""}${githubReposMode ? " +githubRepos" : ""})`
  );
  const { stream, usedProvider, usedModel } = await streamWithRetry(
    provider,
    model,
    { userApiKeys },
    messages
  );

  return {
    stream,
    usedProvider,
    usedModel,
    optimizedPrompt: optimize && finalMessage !== message ? finalMessage : null,
    async saveAndSummarize(fullResponse, media) {
      saveMessage(userId, conversationId, "user", message, media?.type ?? null, media?.url ?? null);
      saveMessage(userId, conversationId, "ai", fullResponse);
      summarizeOldMessages(conversationId, provider, model, userApiKeys).catch(() => {});
      console.log(`\u2705 [user:${userId}] Stream saved: ${fullResponse.slice(0, 100)}...`);
    },
  };
}
