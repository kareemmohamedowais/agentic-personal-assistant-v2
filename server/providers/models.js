// ─── قائمة الموديلات المتاحة (7 models) ───────────────
// مرتّبة حسب القوة — الافتراضي: Llama 3.3 70B (Gemini keys كلها 429)
export const MODELS = [
  {
    id: "llama-3.3-70b-versatile",
    provider: "groq",
    name: "Llama 3.3 70B",
    badge: "Groq",
    icon: "⚡",
    description: "الأقوى • موصى به • مجاني",
    default: true,
  },
  {
    id: "moonshotai/kimi-k2-instruct",
    provider: "groq",
    name: "Kimi K2",
    badge: "Groq",
    icon: "⚡",
    description: "Moonshot AI • ذكاء عالٍ • مجاني",
  },
  {
    id: "qwen/qwen3-32b",
    provider: "groq",
    name: "Qwen3 32B",
    badge: "Groq",
    icon: "⚡",
    description: "Alibaba • تفكير عميق • مجاني",
  },
  {
    id: "meta-llama/llama-4-maverick-17b-128e-instruct",
    provider: "groq",
    name: "Llama 4 Maverick",
    badge: "Groq",
    icon: "⚡",
    description: "الأحدث • Llama 4 • مجاني",
  },
  {
    id: "llama-3.1-8b-instant",
    provider: "groq",
    name: "Llama 3.1 8B",
    badge: "Groq",
    icon: "⚡",
    description: "الأسرع • خفيف • مجاني",
  },
  {
    id: "google/gemma-3-12b-it:free",
    provider: "openrouter",
    name: "Gemma 3 12B",
    badge: "OpenRouter",
    icon: "🌐",
    description: "Google • مجاني تماماً",
  },
  {
    id: "gemini-2.0-flash-lite-preview-02-05",
    provider: "gemini",
    name: "Gemini 2.0 Flash Lite",
    badge: "Google",
    icon: "✨",
    description: "Google • سريع • خفيف",
  },
];

// ─── PROVIDERS map (يُستخدم من backend فقط لتوجيه الطلبات) ─────
export const PROVIDERS = {
  gemini: { id: "gemini", name: "Gemini" },
  groq: { id: "groq", name: "Groq" },
  openrouter: { id: "openrouter", name: "OpenRouter" },
};

// الحصول على الموديل الافتراضي
export function getDefaultModel() {
  const def = MODELS.find((m) => m.default);
  return def || MODELS[0];
}

// البحث عن موديل بالـ id
export function findModel(modelId) {
  return MODELS.find((m) => m.id === modelId) || null;
}

// التحقق من وجود موديل
export function isValidModel(providerId, modelId) {
  return MODELS.some((m) => m.id === modelId && m.provider === providerId);
}

// ترتيب الفول باك — إذا فشل الموديل المختار نجرّب التالي
export function getFallbackChain(currentModelId) {
  const order = MODELS.filter((m) => m.id !== currentModelId);
  return order.map((m) => ({ providerId: m.provider, modelId: m.id, name: m.name }));
}
