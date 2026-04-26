import { ChatOpenAI } from "@langchain/openai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export function createOpenRouterModel(
  modelId = "meta-llama/llama-3.2-3b-instruct:free",
  temperature = 0.3,
  userApiKey = null
) {
  const apiKey = userApiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const err = new Error("لا يوجد OpenRouter API Key. أضفه في الإعدادات.");
    err.code = "NO_API_KEY";
    throw err;
  }

  return {
    model: new ChatOpenAI({
      model: modelId,
      temperature,
      apiKey,
      configuration: {
        baseURL: OPENROUTER_BASE_URL,
        defaultHeaders: {
          "HTTP-Referer": "https://agentic-assistant.local",
          "X-Title": "Agentic Personal Assistant",
        },
      },
    }),
    apiKey,
    provider: "openrouter",
  };
}
