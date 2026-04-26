import { ChatGroq } from "@langchain/groq";

export function createGroqModel(
  modelId = "llama-3.3-70b-versatile",
  temperature = 0.3,
  userApiKey = null
) {
  const apiKey = userApiKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error("لا يوجد Groq API Key. أضفه في الإعدادات.");
    err.code = "NO_API_KEY";
    throw err;
  }
  return {
    model: new ChatGroq({ model: modelId, temperature, apiKey }),
    apiKey,
    provider: "groq",
  };
}
