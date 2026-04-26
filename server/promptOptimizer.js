import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// نستخدم Llama 3.3 70B عبر Groq للتحسين
const OPTIMIZER_MODEL = "llama-3.3-70b-versatile";

const OPTIMIZER_SYSTEM_PROMPT = `You are an expert prompt engineer. Your task is to improve user prompts to get better, more accurate, and more useful AI responses.

Rules:
1. Keep the same language as the user (Arabic → Arabic, English → English)
2. Keep the original intent 100%
3. Add clarity, context, and specific constraints when missing
4. Break complex requests into structured steps
5. Add relevant output format hints if appropriate
6. Make it more specific and actionable
7. Output ONLY the optimized prompt — no explanations, no preamble, no "Here is the optimized prompt:"
8. If the prompt is already good and specific, return it as-is or with minor improvements

Examples:
- "علمني بايثون" → "أنت مدرس برمجة خبير. علّمني Python من الصفر مع أمثلة عملية. ابدأ بالأساسيات (variables, loops, functions) ثم انتقل للمواضيع المتوسطة. استخدم كود قابل للتشغيل مع شرح كل سطر."
- "write a story" → "Write a short engaging story (400-600 words) with a clear beginning, conflict, and resolution. Include vivid descriptions and realistic dialogue. Genre: your choice."`;

let optimizerModel = null;

function getOptimizerModel() {
  if (!optimizerModel) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ No Groq API key available for prompt optimizer");
      return null;
    }
    optimizerModel = new ChatGroq({
      model: OPTIMIZER_MODEL,
      temperature: 0.2,
      apiKey,
    });
  }
  return optimizerModel;
}

/**
 * تحسين الـ prompt تلقائياً
 * @param {string} originalPrompt
 * @returns {Promise<string>} optimized prompt
 */
export async function optimizePrompt(originalPrompt) {
  if (!originalPrompt?.trim()) return originalPrompt;

  // لا تحسين للرسائل القصيرة جداً (أقل من 5 أحرف)
  if (originalPrompt.trim().length < 5) return originalPrompt;

  const model = getOptimizerModel();
  if (!model) return originalPrompt; // fallback: return as-is

  try {
    const response = await model.invoke([
      new SystemMessage(OPTIMIZER_SYSTEM_PROMPT),
      new HumanMessage(originalPrompt),
    ]);
    const optimized = response?.content?.trim();
    if (!optimized) return originalPrompt;
    console.log(`✨ [Optimizer] "${originalPrompt.slice(0, 50)}" → "${optimized.slice(0, 80)}..."`);
    return optimized;
  } catch (err) {
    console.warn(`⚠️ Prompt optimizer failed: ${err.message} — using original`);
    return originalPrompt; // fallback gracefully
  }
}
