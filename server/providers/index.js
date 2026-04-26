import { createGeminiModel, markGeminiKeyExhausted } from "./gemini.js";
import { createGroqModel } from "./groq.js";
import { createOpenRouterModel } from "./openrouter.js";
import { findModel, getDefaultModel, getFallbackChain } from "./models.js";

export { MODELS, PROVIDERS, getDefaultModel, findModel, isValidModel } from "./models.js";
export { getGeminiKeysStatus } from "./gemini.js";

/**
 * إنشاء model بناءً على الـ provider المختار
 * @param {string} providerId - gemini | groq | openrouter
 * @param {string} modelId    - معرّف الموديل
 * @param {object} opts       - { temperature, userApiKeys: { groq, openrouter } }
 */
export function createProvider(providerId = "gemini", modelId = null, opts = {}) {
  // إذا لم يُحدد provider، نحاول إيجاده من الموديل
  if (!providerId && modelId) {
    const found = findModel(modelId);
    if (found) providerId = found.provider;
  }
  const resolvedModel = modelId || getDefaultModel().id;
  const temperature = opts.temperature ?? 0.3;
  const userApiKeys = opts.userApiKeys || {};

  switch (providerId) {
    case "gemini":
      return createGeminiModel(resolvedModel, temperature);
    case "groq":
      return createGroqModel(resolvedModel, temperature, userApiKeys.groq || null);
    case "openrouter":
      return createOpenRouterModel(resolvedModel, temperature, userApiKeys.openrouter || null);
    default: {
      const err = new Error(`Provider غير معروف: ${providerId}`);
      err.code = "UNKNOWN_PROVIDER";
      throw err;
    }
  }
}

/**
 * التعامل مع خطأ 429 للـ provider المناسب
 */
export function handleProviderQuotaError(providerId, apiKey, error) {
  if (providerId === "gemini") {
    markGeminiKeyExhausted(apiKey, error);
  }
  // Groq و OpenRouter: مجرد log (ليس لديهم key rotation)
  if (providerId === "groq") {
    console.warn(`⏳ [Groq] Rate limit hit — wait and retry`);
  }
  if (providerId === "openrouter") {
    console.warn(`⏳ [OpenRouter] Rate limit hit — wait and retry`);
  }
}

/**
 * إعادة المحاولة مع مفتاح آخر (لـ Gemini) أو throw مباشرة (للباقين)
 * MAX_RETRIES = 3 لـ Gemini فقط، 1 للباقين
 */
export async function invokeWithRetry(providerId, modelId, opts, messages) {
  const maxRetries = providerId === "gemini" ? 3 : 1;
  let lastError;
  // try original model
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { model, apiKey } = createProvider(providerId, modelId, opts);
    try {
      const result = await model.invoke(messages);
      return { result, usedProvider: providerId, usedModel: modelId };
    } catch (e) {
      lastError = e;
      if (e?.status === 429 || e?.statusCode === 429) {
        handleProviderQuotaError(providerId, apiKey, e);
        console.warn(
          `🔄 [${providerId}] Attempt ${attempt}/${maxRetries} failed. ${attempt < maxRetries ? "Trying next..." : "Trying fallback models..."}`
        );
        if (attempt < maxRetries) continue;
      } else {
        break; // non-quota error, go to fallback
      }
    }
  }
  // fallback chain
  const fallbacks = getFallbackChain(modelId);
  for (const fb of fallbacks) {
    try {
      console.log(`♻️ [Fallback] Trying ${fb.name} (${fb.providerId}/${fb.modelId})`);
      const { model } = createProvider(fb.providerId, fb.modelId, opts);
      const result = await model.invoke(messages);
      console.log(`✅ [Fallback] Success with ${fb.name}`);
      return { result, usedProvider: fb.providerId, usedModel: fb.modelId };
    } catch (e) {
      console.warn(`❌ [Fallback] ${fb.name} failed: ${e.message?.slice(0, 80)}`);
      lastError = e;
      continue;
    }
  }
  throw lastError;
}

export async function streamWithRetry(providerId, modelId, opts, messages) {
  const maxRetries = providerId === "gemini" ? 3 : 1;
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { model, apiKey } = createProvider(providerId, modelId, opts);
    try {
      const stream = await model.stream(messages);
      return { stream, usedProvider: providerId, usedModel: modelId };
    } catch (e) {
      lastError = e;
      if (e?.status === 429 || e?.statusCode === 429) {
        handleProviderQuotaError(providerId, apiKey, e);
        console.warn(
          `🔄 [${providerId}] Stream attempt ${attempt}/${maxRetries} failed. ${attempt < maxRetries ? "Trying next..." : "Trying fallback models..."}`
        );
        if (attempt < maxRetries) continue;
      } else {
        break;
      }
    }
  }
  const fallbacks = getFallbackChain(modelId);
  for (const fb of fallbacks) {
    try {
      console.log(`♻️ [Fallback] Trying stream with ${fb.name}`);
      const { model } = createProvider(fb.providerId, fb.modelId, opts);
      const stream = await model.stream(messages);
      console.log(`✅ [Fallback] Stream success with ${fb.name}`);
      return { stream, usedProvider: fb.providerId, usedModel: fb.modelId };
    } catch (e) {
      console.warn(`❌ [Fallback] Stream ${fb.name} failed: ${e.message?.slice(0, 80)}`);
      lastError = e;
      continue;
    }
  }
  throw lastError;
}
