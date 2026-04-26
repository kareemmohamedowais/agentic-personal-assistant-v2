import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { usePerformance } from "../contexts/PerformanceContext";
import ModelSelector from "../components/ModelSelector";
import PageHeader from "../components/PageHeader";

const FALLBACK_MODELS = [
  { id: "llama-3.3-70b-versatile", provider: "groq", name: "Llama 3.3 70B", badge: "Groq", icon: "⚡", description: "Fallback" },
  { id: "moonshotai/kimi-k2-instruct", provider: "groq", name: "Kimi K2", badge: "Groq", icon: "⚡", description: "Fallback" },
  { id: "qwen/qwen3-32b", provider: "groq", name: "Qwen3 32B", badge: "Groq", icon: "⚡", description: "Fallback" },
  { id: "meta-llama/llama-4-maverick-17b-128e-instruct", provider: "groq", name: "Llama 4 Maverick", badge: "Groq", icon: "⚡", description: "Fallback" },
  { id: "llama-3.1-8b-instant", provider: "groq", name: "Llama 3.1 8B", badge: "Groq", icon: "⚡", description: "Fallback" },
  { id: "google/gemma-3-12b-it:free", provider: "openrouter", name: "Gemma 3 12B", badge: "OpenRouter", icon: "🌐", description: "Fallback" },
  { id: "gemini-2.5-flash-lite", provider: "gemini", name: "Gemini 2.5 Flash Lite", badge: "Google", icon: "✨", description: "Fallback" },
];

export default function Settings() {
  const { token } = useAuth();
  const { mode, setMode, isPerformanceMode } = usePerformance();
  const [models, setModels] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [groqKey, setGroqKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [showGroq, setShowGroq] = useState(false);
  const [showOpenRouter, setShowOpenRouter] = useState(false);
  const [testing, setTesting] = useState({ groq: false, openrouter: false });
  const [testResult, setTestResult] = useState({ groq: null, openrouter: null });

  const fetchData = useCallback(async () => {
    setLoading(true);
    let loadedModels = FALLBACK_MODELS;
    try {
      const [modelsRes, settingsRes] = await Promise.allSettled([
        fetch("/api/models", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/user-settings", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (modelsRes.status === "fulfilled" && modelsRes.value.ok) {
        const modelsData = await modelsRes.value.json().catch(() => []);
        if (Array.isArray(modelsData) && modelsData.length > 0) loadedModels = modelsData;
      }
      setModels(loadedModels);
      if (settingsRes.status === "fulfilled" && settingsRes.value.ok) {
        const settingsData = await settingsRes.value.json().catch(() => null);
        if (settingsData) {
          const selected = loadedModels.some((m) => m.id === settingsData.defaultModel) ? settingsData.defaultModel : loadedModels[0]?.id;
          const selectedProvider = loadedModels.find((m) => m.id === selected)?.provider || settingsData.defaultProvider;
          setSettings({ ...settingsData, defaultModel: selected, defaultProvider: selectedProvider });
          return;
        }
      }
      setSettings((prev) => ({
        ...(prev || {}), defaultProvider: prev?.defaultProvider || loadedModels[0]?.provider || "groq",
        defaultModel: prev?.defaultModel || loadedModels[0]?.id || "llama-3.3-70b-versatile",
        autoOptimize: prev?.autoOptimize ?? false, hasGroqKey: prev?.hasGroqKey ?? false, hasOpenRouterKey: prev?.hasOpenRouterKey ?? false,
      }));
    } catch {
      setModels(loadedModels);
      setSettings((prev) => ({
        ...(prev || {}), defaultProvider: prev?.defaultProvider || loadedModels[0]?.provider || "groq",
        defaultModel: prev?.defaultModel || loadedModels[0]?.id || "llama-3.3-70b-versatile",
        autoOptimize: prev?.autoOptimize ?? false, hasGroqKey: prev?.hasGroqKey ?? false, hasOpenRouterKey: prev?.hasOpenRouterKey ?? false,
      }));
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { defaultProvider: settings.defaultProvider, defaultModel: settings.defaultModel, autoOptimize: settings.autoOptimize };
      if (groqKey) body.groqApiKey = groqKey;
      if (openrouterKey) body.openrouterApiKey = openrouterKey;
      await fetch("/api/user-settings", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      fetchData();
    } catch {} finally { setSaving(false); }
  };

  const testProvider = async (provider) => {
    const key = provider === "groq" ? groqKey : openrouterKey;
    if (!key) return;
    setTesting((prev) => ({ ...prev, [provider]: true }));
    setTestResult((prev) => ({ ...prev, [provider]: null }));
    try {
      const res = await fetch("/api/test-provider", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ provider, apiKey: key }) });
      const data = await res.json();
      setTestResult((prev) => ({ ...prev, [provider]: data }));
    } catch { setTestResult((prev) => ({ ...prev, [provider]: { ok: false, error: "خطأ في الاتصال" } })); }
    finally { setTesting((prev) => ({ ...prev, [provider]: false })); }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(212,168,83,0.3)", borderTopColor: "var(--gold)" }} />
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 min-h-0 overflow-y-auto custom-scroll">
      <PageHeader title="الإعدادات" description="تخصيص نموذج الذكاء الاصطناعي وإدارة مفاتيح API" icon="⚙️" />

      <div className="w-full px-4 md:px-6 py-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Section title="نموذج الذكاء الاصطناعي الافتراضي" icon="◈">
              <p className="text-base mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                اختر الـ Provider والموديل الذي سيُستخدم في كل المحادثات الجديدة.
              </p>
              <ModelSelector models={models} selectedModel={settings.defaultModel}
                onChange={({ provider, model }) => setSettings((s) => ({ ...s, defaultProvider: provider, defaultModel: model }))} />
              <div className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
                المختار: <span style={{ color: "var(--gold)" }}>{settings.defaultProvider} / {settings.defaultModel}</span>
              </div>
            </Section>

            <Section title="مفاتيح API" icon="◇">
              <p className="text-base mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                مفاتيح Groq و OpenRouter الشخصية (اختيارية).
              </p>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span>⚡</span>
                  <label className="text-base font-medium" style={{ color: "var(--text-primary)" }}>Groq API Key</label>
                  {settings.hasGroqKey && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(52,211,153,0.1)", color: "var(--accent-success)" }}>محفوظ</span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input type={showGroq ? "text" : "password"} value={groqKey} onChange={(e) => setGroqKey(e.target.value)}
                      placeholder={settings.hasGroqKey ? "أدخل مفتاحاً جديداً للتغيير..." : "gsk_..."}
                      className="w-full rounded-xl px-3 py-2.5 text-base input-luxury" dir="ltr" />
                    <button type="button" onClick={() => setShowGroq(!showGroq)}
                      className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                      {showGroq ? "🙈" : "👁"}
                    </button>
                  </div>
                  {groqKey && (
                    <button type="button" onClick={() => testProvider("groq")} disabled={testing.groq}
                      className="px-3 py-2 rounded-xl text-base font-medium disabled:opacity-50 transition-colors duration-300"
                      style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)", color: "#fb923c" }}>
                      {testing.groq ? "..." : "اختبار"}
                    </button>
                  )}
                </div>
                {testResult.groq && (
                  <p className={`mt-1 text-sm ${testResult.groq.ok ? "" : ""}`} style={{ color: testResult.groq.ok ? "var(--accent-success)" : "var(--accent-danger)" }}>
                    {testResult.groq.ok ? `✅ يعمل: "${testResult.groq.response}"` : `❌ ${testResult.groq.error}`}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span>🌐</span>
                  <label className="text-base font-medium" style={{ color: "var(--text-primary)" }}>OpenRouter API Key</label>
                  {settings.hasOpenRouterKey && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(52,211,153,0.1)", color: "var(--accent-success)" }}>محفوظ</span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input type={showOpenRouter ? "text" : "password"} value={openrouterKey} onChange={(e) => setOpenrouterKey(e.target.value)}
                      placeholder={settings.hasOpenRouterKey ? "أدخل مفتاحاً جديداً للتغيير..." : "sk-or-v1-..."}
                      className="w-full rounded-xl px-3 py-2.5 text-base input-luxury" dir="ltr" />
                    <button type="button" onClick={() => setShowOpenRouter(!showOpenRouter)}
                      className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                      {showOpenRouter ? "🙈" : "👁"}
                    </button>
                  </div>
                  {openrouterKey && (
                    <button type="button" onClick={() => testProvider("openrouter")} disabled={testing.openrouter}
                      className="px-3 py-2 rounded-xl text-base font-medium disabled:opacity-50 transition-colors duration-300"
                      style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa" }}>
                      {testing.openrouter ? "..." : "اختبار"}
                    </button>
                  )}
                </div>
                {testResult.openrouter && (
                  <p className="mt-1 text-sm" style={{ color: testResult.openrouter.ok ? "var(--accent-success)" : "var(--accent-danger)" }}>
                    {testResult.openrouter.ok ? `✅ يعمل: "${testResult.openrouter.response}"` : `❌ ${testResult.openrouter.error}`}
                  </p>
                )}
              </div>
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="أداء الواجهة" icon="⚡">
              <p className="text-base mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                بدّل بين جودة بصرية أعلى أو أداء أفضل أثناء التصفح والتمرير في الواجهات الثقيلة.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setMode("quality")}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-300"
                  style={{
                    background: mode === "quality" ? "rgba(59,130,246,0.15)" : "var(--bg-surface)",
                    border: mode === "quality" ? "1px solid rgba(59,130,246,0.35)" : "1px solid var(--border-color)",
                    color: mode === "quality" ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  جودة بصرية عالية
                </button>
                <button
                  type="button"
                  onClick={() => setMode("performance")}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-300"
                  style={{
                    background: mode === "performance" ? "rgba(16,185,129,0.15)" : "var(--bg-surface)",
                    border: mode === "performance" ? "1px solid rgba(16,185,129,0.35)" : "1px solid var(--border-color)",
                    color: mode === "performance" ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  أداء أعلى
                </button>
              </div>

              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                الوضع الحالي: {isPerformanceMode ? "أداء أعلى" : "جودة بصرية عالية"}
              </p>
            </Section>

            <Section title="محسّن الـ Prompts التلقائي ✦" icon="✦">
              <p className="text-base mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                عند تفعيله، يقوم الذكاء الاصطناعي بتحسين رسالتك تلقائياً قبل الإجابة.
              </p>
              <button type="button" onClick={() => setSettings((s) => ({ ...s, autoOptimize: !s.autoOptimize }))}
                className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-300"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)" }}>
                <span className="text-base" style={{ color: "var(--text-secondary)" }}>
                  {settings.autoOptimize ? "مفعّل" : "معطّل"}
                </span>
                <span className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 ${settings.autoOptimize ? "" : ""}`}
                  style={{ background: settings.autoOptimize ? "var(--gold)" : "var(--bg-surface-solid)", border: settings.autoOptimize ? "none" : "1px solid var(--border-color)" }}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300 ${settings.autoOptimize ? "translate-x-7" : "translate-x-1"}`} />
                </span>
              </button>
              <p className="text-sm mt-3" style={{ color: "var(--text-muted)" }}>
                {settings.autoOptimize ? "سيتم تحسين كل رسالة تلقائياً قبل الإرسال." : "لن يتم التحسين تلقائياً، ويمكنك استخدام زر ✦ يدوياً عند الحاجة."}
              </p>
            </Section>

            <div className="glass-card p-5!">
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>حفظ التغييرات</p>
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>ستُطبّق الإعدادات الجديدة على المحادثات الجديدة.</p>
              <button type="button" onClick={handleSave} disabled={saving}
                className="btn-luxury w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-all duration-300">
                {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
              </button>
              {saved && (
                <span className="mt-3 text-sm flex items-center gap-1" style={{ color: "var(--accent-success)" }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  تم الحفظ بنجاح
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="glass-card p-5!">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
        <span style={{ color: "var(--gold)" }}>{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}
