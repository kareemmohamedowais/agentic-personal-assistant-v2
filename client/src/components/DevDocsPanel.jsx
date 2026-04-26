import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useDevDocs } from "../contexts/DevDocsContext";

const CATEGORIES = {
  frontend: { label: "فرونت إند", icon: "🎨", color: "text-blue-400" },
  backend:  { label: "باك إند",   icon: "⚙️",  color: "text-emerald-400" },
  devops:   { label: "DevOps",    icon: "🐳",  color: "text-orange-400" },
};

function StatusBadge({ status }) {
  if (status === "ready")
    return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">جاهز ✓</span>;
  if (status === "installing")
    return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 animate-pulse">جاري التثبيت...</span>;
  if (status === "error")
    return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">خطأ</span>;
  return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700">غير مثبت</span>;
}

function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
        enabled ? "bg-violet-500" : "bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-0.75 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? "translate-x-5.5" : "translate-x-0.75"
        }`}
      />
    </button>
  );
}

export default function DevDocsPanel({ open, onClose, enabledFrameworks, onToggleFramework, onSave, positionClass, excludeRef }) {
  const { token, user } = useAuth();
  const { devDocsEnabled, toggleDevDocs } = useDevDocs();
  const [frameworks, setFrameworks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isAdmin = user?.role === "admin";
  const panelRef = useRef(null);

  const fetchFrameworks = useCallback(async () => {
    try {
      const res = await fetch("/api/dev-docs/frameworks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setFrameworks(data.frameworks || []);
      setCategories(data.categories || ["frontend", "backend", "devops"]);
    } catch (err) {
      console.error("DevDocsPanel fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchFrameworks();
    }
  }, [open, fetchFrameworks]);

  // Poll while installing
  useEffect(() => {
    if (!open) return;
    const hasInstalling = frameworks.some((f) => f.status === "installing");
    if (!hasInstalling) return;
    const t = setInterval(fetchFrameworks, 4000);
    return () => clearInterval(t);
  }, [open, frameworks, fetchFrameworks]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (excludeRef?.current?.contains(e.target)) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose, excludeRef]);

  const handleInstall = async (frameworkId) => {
    setFrameworks((p) =>
      p.map((f) => (f.framework === frameworkId ? { ...f, status: "installing" } : f))
    );
    await fetch(`/api/dev-docs/install/${frameworkId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setTimeout(fetchFrameworks, 2000);
  };

  const handleUninstall = async (frameworkId) => {
    if (!confirm("هل أنت متأكد من حذف هذا الـ Documentation؟ سيؤثر على جميع المستخدمين.")) return;
    await fetch(`/api/dev-docs/uninstall/${frameworkId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchFrameworks();
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const readyCount = frameworks.filter((f) => f.status === "ready").length;
  const enabledCount = enabledFrameworks.length;

  const grouped = categories
    .map((cat) => ({
      cat,
      info: CATEGORIES[cat] || { label: cat, icon: "📄", color: "text-slate-400" },
      items: frameworks.filter((f) => f.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  if (!open) return null;

  return (
    <div ref={panelRef} className={positionClass ?? "absolute bottom-full left-0 right-0 mb-3 z-50"}>
      <div className="bg-[#0f1117] border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/20 flex items-center justify-center text-sm">
              📚
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">Developer Docs</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {readyCount > 0 ? `${readyCount} مثبّت · ${enabledCount} مفعّل` : "ابدأ بتثبيت توثيق الـ frameworks"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* زر تفعيل / تعطيل البحث */}
            <button
              type="button"
              onClick={toggleDevDocs}
              className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                devDocsEnabled
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${devDocsEnabled ? "bg-emerald-400" : "bg-slate-600"}`} />
              {devDocsEnabled ? "بحث مفعّل" : "بحث معطّل"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ─── Framework List ─── */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className={`max-h-80 overflow-y-auto transition-opacity ${devDocsEnabled ? "" : "opacity-50"}`}>
            <div className="p-3 space-y-4">
              {grouped.map(({ cat, info, items }) => (
                <div key={cat}>
                  <p className={`text-[11px] font-semibold mb-2 px-1 ${info.color}`}>
                    {info.icon} {info.label}
                  </p>
                  <div className="space-y-1.5">
                    {items.map((fw) => {
                      const isReady = fw.status === "ready";
                      const isEnabled = isReady && enabledFrameworks.includes(fw.framework);

                      return (
                        <div
                          key={fw.framework}
                          className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                            isEnabled
                              ? "bg-violet-500/8 border-violet-500/25"
                              : isReady
                                ? "bg-slate-800/40 border-slate-700/30 hover:border-slate-600/50"
                                : "bg-slate-800/20 border-slate-800/40"
                          }`}
                        >
                          <span className="text-xl shrink-0 leading-none">{fw.icon}</span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[13px] font-medium text-white">{fw.displayName}</span>
                              <span className="text-[10px] text-slate-600">v{fw.version}</span>
                              <StatusBadge status={fw.status} />
                            </div>
                            {isReady && (
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                {fw.chunkCount?.toLocaleString()} chunks · {fw.pageCount} صفحة
                              </p>
                            )}
                            {fw.status === "error" && (
                              <p className="text-[10px] text-red-400/80 mt-0.5 truncate max-w-50">
                                {fw.errorMessage}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isReady && (
                              <Toggle
                                enabled={isEnabled}
                                onChange={() => onToggleFramework(fw.framework)}
                              />
                            )}
                            {isAdmin && fw.status === "available" && (
                              <button
                                type="button"
                                onClick={() => handleInstall(fw.framework)}
                                className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/20 transition-colors"
                              >
                                ⬇ تثبيت
                              </button>
                            )}
                            {isAdmin && fw.status === "error" && (
                              <button
                                type="button"
                                onClick={() => handleInstall(fw.framework)}
                                className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20 transition-colors"
                              >
                                ↺ إعادة
                              </button>
                            )}
                            {fw.status === "installing" && (
                              <div className="w-4 h-4 border-[1.5px] border-amber-400 border-t-transparent rounded-full animate-spin" />
                            )}
                            {isAdmin && isReady && (
                              <button
                                type="button"
                                onClick={() => handleUninstall(fw.framework)}
                                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                                title="حذف"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Footer ─── */}
        <div className="px-3 py-2.5 border-t border-slate-800/80 bg-slate-900/40 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-medium transition-all ${
              saved
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                : "bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 border border-violet-500/20"
            }`}
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-[1.5px] border-violet-400 border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <>✓ تم الحفظ</>
            ) : (
              <>💾 حفظ التفضيلات</>
            )}
          </button>
          {enabledCount > 0 && (
            <span className="text-[11px] text-slate-500 shrink-0">{enabledCount} مفعّل</span>
          )}
        </div>
      </div>
    </div>
  );
}
