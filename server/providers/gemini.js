import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// ─── مفاتيح Gemini مع التحقق من الصلاحية ─────────────────────
const RAW_KEYS = [
  process.env.GOOGLE_API_KEY,
  process.env.GOOGLE_API_KEY_2,
  process.env.GOOGLE_API_KEY_3,
  process.env.GOOGLE_API_KEY_4,
  process.env.GOOGLE_API_KEY_5,
  process.env.GOOGLE_API_KEY_6,
].filter(Boolean);

export const GEMINI_KEYS = RAW_KEYS.filter((k) => {
  if (k.startsWith("AIzaSy")) return true;
  console.warn(`⚠️ [Gemini] Skipped invalid key: ...${k.slice(-6)}`);
  return false;
});

if (GEMINI_KEYS.length === 0) {
  console.warn("⚠️ No valid Gemini API keys found in .env");
}

// تتبع المفاتيح المحظورة
const exhaustedKeys = new Map(); // key -> { unblockAt, reason }
const keyUsage = new Map();
let lastKeyIndex = 0;

function getRetryDelay(error) {
  try {
    const details = error?.errorDetails || [];
    const retryInfo = details.find((d) => d["@type"]?.includes("RetryInfo"));
    const delay = retryInfo?.retryDelay?.replace("s", "");
    return delay ? parseInt(delay) + 2 : 65;
  } catch {
    return 65;
  }
}

function classifyQuotaError(error) {
  const msg = (error?.message || "").toLowerCase();
  const details = error?.errorDetails || [];
  const isDailyQuota =
    msg.includes("per day") ||
    msg.includes("daily") ||
    msg.includes("resource_exhausted") ||
    details.some((d) => JSON.stringify(d).toLowerCase().includes("per day"));
  return isDailyQuota ? "DAILY" : "RPM";
}

export function markGeminiKeyExhausted(apiKey, error) {
  const quotaType = classifyQuotaError(error);
  let blockSeconds;
  let reason;
  if (quotaType === "DAILY") {
    blockSeconds = 6 * 60 * 60;
    reason = "DAILY_QUOTA";
    console.error(`🚫 [Gemini] Key ...${apiKey.slice(-6)} hit DAILY QUOTA — blocked 6h`);
  } else {
    blockSeconds = getRetryDelay(error);
    reason = "RPM_LIMIT";
    console.warn(`⏳ [Gemini] Key ...${apiKey.slice(-6)} hit RPM — blocked ${blockSeconds}s`);
  }
  exhaustedKeys.set(apiKey, { unblockAt: Date.now() + blockSeconds * 1000, reason });
}

function getAvailableGeminiKey() {
  const now = Date.now();
  for (const [k, info] of exhaustedKeys) {
    if (now >= info.unblockAt) {
      console.log(`🔓 [Gemini] Key ...${k.slice(-6)} unblocked`);
      exhaustedKeys.delete(k);
    }
  }
  const available = GEMINI_KEYS.filter((k) => !exhaustedKeys.has(k));
  if (available.length === 0) return null;
  lastKeyIndex = (lastKeyIndex + 1) % available.length;
  const key = available[lastKeyIndex];
  const usage = keyUsage.get(key) || { count: 0 };
  usage.count++;
  keyUsage.set(key, usage);
  return key;
}

export function createGeminiModel(modelId = "gemini-2.5-flash-lite", temperature = 0.3) {
  const key = getAvailableGeminiKey();
  if (!key) {
    let minWait = Infinity;
    for (const [, info] of exhaustedKeys) {
      const rem = Math.ceil((info.unblockAt - Date.now()) / 1000);
      if (rem < minWait) minWait = rem;
    }
    const waitMsg =
      minWait < 120
        ? `حاول بعد ${minWait} ثانية.`
        : minWait < 7200
          ? `حاول بعد ${Math.ceil(minWait / 60)} دقيقة.`
          : `كل مفاتيح Gemini وصلت للحد اليومي. حاول غداً.`;
    const err = new Error(waitMsg);
    err.code = "ALL_KEYS_EXHAUSTED";
    err.retryAfter = minWait;
    throw err;
  }
  return {
    model: new ChatGoogleGenerativeAI({ model: modelId, temperature, apiKey: key }),
    apiKey: key,
    provider: "gemini",
  };
}

export function getGeminiKeysStatus() {
  const now = Date.now();
  return GEMINI_KEYS.map((k) => {
    const short = `...${k.slice(-6)}`;
    const usage = keyUsage.get(k) || { count: 0 };
    const ex = exhaustedKeys.get(k);
    if (ex) {
      const remaining = Math.ceil((ex.unblockAt - now) / 1000);
      return { key: short, status: ex.reason, blockedFor: `${remaining}s`, calls: usage.count };
    }
    return { key: short, status: "AVAILABLE", calls: usage.count };
  });
}
