import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const CATEGORY_LABELS = {
  frontend: { label: "🎨 فرونت إند", color: "text-blue-400" },
  backend: { label: "⚙️ باك إند", color: "text-emerald-400" },
  devops: { label: "🐳 DevOps & أدوات", color: "text-orange-400" },
};

const STATUS_INFO = {
  available: { text: "غير مثبت", badge: "bg-slate-700 text-slate-400" },
  installing: { text: "جاري التثبيت...", badge: "bg-amber-500/20 text-amber-400 animate-pulse" },
  ready: { text: "جاهز ✓", badge: "bg-emerald-500/20 text-emerald-400" },
  error: { text: "خطأ", badge: "bg-red-500/20 text-red-400" },
};

export default function DevDocs() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [frameworks, setFrameworks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localPrefs, setLocalPrefs] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const fwRes = await fetch("/api/dev-docs/frameworks", { headers: { Authorization: `Bearer ${token}` } });
      const fwData = await fwRes.json();
      setFrameworks(fwData.frameworks || []);
      setCategories(fwData.categories || ["frontend", "backend", "devops"]);

      const r2 = await fetch("/api/docs/preferences", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r2.ok) {
        const prefData = await r2.json();
        setLocalPrefs(prefData.map((p) => p.frameworkId));
      }
    } catch (err) {
      console.error("Failed to load dev docs data:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling for frameworks being installed
  useEffect(() => {
    const hasInstalling = frameworks.some((f) => f.status === "installing");
    if (!hasInstalling) return;
    const t = setInterval(fetchData, 5000);
    return () => clearInterval(t);
  }, [frameworks, fetchData]);

  const handleInstall = async (frameworkId) => {
    try {
      await fetch(`/api/dev-docs/install/${frameworkId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setFrameworks((prev) =>
        prev.map((f) => (f.framework === frameworkId ? { ...f, status: "installing" } : f))
      );
      setTimeout(fetchData, 2000);
    } catch (err) {
      console.error("Install failed:", err);
    }
  };

  const handleUninstall = async (frameworkId) => {
    if (!confirm("هل أنت متأكد من حذف هذا الـ Documentation؟ سيؤثر على جميع المستخدمين.")) return;
    try {
      await fetch(`/api/dev-docs/uninstall/${frameworkId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      console.error("Uninstall failed:", err);
    }
  };

  const handleUpdate = async (frameworkId) => {
    try {
      await fetch(`/api/dev-docs/update/${frameworkId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setFrameworks((prev) =>
        prev.map((f) => (f.framework === frameworkId ? { ...f, status: "installing" } : f))
      );
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const togglePref = (fwId) => {
    setLocalPrefs((prev) =>
      prev.includes(fwId) ? prev.filter((f) => f !== fwId) : [...prev, fwId]
    );
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/dev-docs/my-prefs", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ enabledFrameworks: localPrefs }),
      });
      if (res.ok) {
        setSuccessMsg("تم حفظ التفضيلات ✓");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        console.error("Save prefs failed with status:", res.status);
        setSuccessMsg("فشل الحفظ");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error("Save prefs failed:", err);
      setSuccessMsg("فشل الحفظ");
      setTimeout(() => setSuccessMsg(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const readyFrameworks = frameworks.filter((f) => f.status === "ready");
  const totalChunks = readyFrameworks.reduce((sum, f) => sum + (f.chunkCount || 0), 0);
  const enabledCount = localPrefs.length;

  const grouped = categories.map((cat) => ({
    category: cat,
    info: CATEGORY_LABELS[cat] || { label: cat, color: "text-slate-400" },
    items: frameworks.filter((f) => f.category === cat),
  }));

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-950">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">📚</span>
          <h1 className="text-2xl font-bold text-white">Developer Docs Helper</h1>
        </div>
        <p className="text-slate-400 text-sm mt-1">
          بحث ذكي في التوثيق الرسمي للـ frameworks أثناء المحادثة
        </p>
        {/* Stats */}
        <div className="flex items-center gap-6 mt-4">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{readyFrameworks.length}</div>
            <div className="text-xs text-slate-500">مثبّت</div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="text-center">
            <div className="text-xl font-bold text-violet-400">{enabledCount}</div>
            <div className="text-xs text-slate-500">مفعّل لديك</div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="text-center">
            <div className="text-xl font-bold text-emerald-400">
              {totalChunks.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">chunk مفهرس</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-4xl space-y-8">
            {grouped.map(
              (group) =>
                group.items.length > 0 && (
                  <div key={group.category}>
                    <h2 className={`text-sm font-semibold mb-3 ${group.info.color}`}>
                      {group.info.label}
                    </h2>
                    <div className="grid gap-3">
                      {group.items.map((fw) => {
                        const isReady = fw.status === "ready";
                        const isInstalling = fw.status === "installing";
                        const isEnabled = localPrefs.includes(fw.framework);
                        const statusInfo = STATUS_INFO[fw.status] || STATUS_INFO.available;

                        return (
                          <div
                            key={fw.framework}
                            className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                              isReady && isEnabled
                                ? "bg-violet-500/5 border-violet-500/20"
                                : isReady
                                  ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                                  : "bg-slate-900/50 border-slate-800/50"
                            }`}
                          >
                            {/* Icon */}
                            <span className="text-3xl">{fw.icon}</span>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-white font-medium">{fw.displayName}</span>
                                <span className="text-slate-500 text-xs">v{fw.version}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.badge}`}>
                                  {statusInfo.text}
                                </span>
                              </div>
                              {isReady ? (
                                <p className="text-xs text-slate-500">
                                  {fw.chunkCount?.toLocaleString()} chunks · {fw.pageCount} صفحة
                                </p>
                              ) : fw.status === "error" ? (
                                <p className="text-xs text-red-400 truncate">{fw.errorMessage}</p>
                              ) : (
                                <p className="text-xs text-slate-600">{fw.docsUrl}</p>
                              )}
                            </div>

                            {/* Toggle (للمستخدم) */}
                            {isReady && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">
                                  {isEnabled ? "مفعّل" : "معطّل"}
                                </span>
                                <button
                                  onClick={() => togglePref(fw.framework)}
                                  className={`relative w-11 h-6 rounded-full transition-colors ${
                                    isEnabled ? "bg-violet-500" : "bg-slate-700"
                                  }`}
                                >
                                  <span
                                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                      isEnabled ? "left-[22px]" : "left-0.5"
                                    }`}
                                  />
                                </button>
                              </div>
                            )}

                            {/* Admin actions */}
                            {isAdmin && (
                              <div className="flex items-center gap-2 shrink-0">
                                {fw.status === "available" && (
                                  <button
                                    onClick={() => handleInstall(fw.framework)}
                                    className="flex items-center gap-1.5 text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors"
                                  >
                                    ⬇️ تثبيت
                                  </button>
                                )}
                                {fw.status === "error" && (
                                  <button
                                    onClick={() => handleInstall(fw.framework)}
                                    className="flex items-center gap-1.5 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg transition-colors"
                                  >
                                    🔄 إعادة محاولة
                                  </button>
                                )}
                                {isInstalling && (
                                  <div className="flex items-center gap-2 text-amber-400 text-xs">
                                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                    جاري التثبيت...
                                  </div>
                                )}
                                {isReady && (
                                  <>
                                    <button
                                      onClick={() => handleUpdate(fw.framework)}
                                      className="text-xs text-slate-500 hover:text-blue-400 px-2 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors"
                                      title="تحديث"
                                    >
                                      🔄
                                    </button>
                                    <button
                                      onClick={() => handleUninstall(fw.framework)}
                                      className="text-xs text-slate-500 hover:text-red-400 px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                                      title="حذف"
                                    >
                                      🗑️
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
            )}

            {/* Save prefs */}
            {readyFrameworks.length > 0 && (
              <div className="pt-4 border-t border-slate-800 flex items-center gap-4">
                <button
                  onClick={savePrefs}
                  disabled={saving}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    "💾 حفظ تفضيلاتي"
                  )}
                </button>
                {successMsg && (
                  <span className="text-emerald-400 text-sm">{successMsg}</span>
                )}
                <span className="text-slate-500 text-xs mr-auto">
                  {enabledCount} docs مفعّلة — كلما قلّ العدد, زادت دقة الإجابات
                </span>
              </div>
            )}

            {/* Info box */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
              <p className="font-medium text-slate-300 mb-2">💡 كيف تستخدم Dev Docs في الشات؟</p>
              <ol className="space-y-1 list-decimal list-inside">
                <li>ثبّت الـ frameworks التي تريدها (Admin فقط)</li>
                <li>فعّل الـ Toggle للـ frameworks التي تحتاجها</li>
                <li>اضغط "حفظ تفضيلاتي"</li>
                <li>اذهب للشات واضغط زر <strong className="text-violet-400">📚 Docs</strong> في شريط الكتابة</li>
                <li>اسأل أي سؤال برمجي — الإجابة ستكون مبنية على التوثيق الرسمي</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
