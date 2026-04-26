import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const STATUS_INFO = {
  pending: { text: "في الانتظار", badge: "bg-slate-700 text-slate-400" },
  cloning: { text: "جاري الاستنساخ...", badge: "bg-amber-500/20 text-amber-400 animate-pulse" },
  parsing: { text: "جاري التحليل...", badge: "bg-amber-500/20 text-amber-400 animate-pulse" },
  indexing: { text: "جاري الفهرسة...", badge: "bg-amber-500/20 text-amber-400 animate-pulse" },
  ready: { text: "جاهز ✓", badge: "bg-emerald-500/20 text-emerald-400" },
  error: { text: "خطأ", badge: "bg-red-500/20 text-red-400" },
};

const LANG_COLORS = {
  JavaScript: "bg-yellow-400",
  TypeScript: "bg-blue-400",
  Python: "bg-blue-500",
  Java: "bg-orange-500",
  Go: "bg-cyan-400",
  Rust: "bg-orange-600",
  Ruby: "bg-red-500",
  PHP: "bg-indigo-400",
  "C#": "bg-green-500",
  "C++": "bg-pink-500",
  Swift: "bg-orange-400",
  Kotlin: "bg-purple-400",
};

function formatSize(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function GitHubRepos() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localPrefs, setLocalPrefs] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const reposRes = await fetch("/api/github-repos/repos", { headers: { Authorization: `Bearer ${token}` } });
      const r2 = await fetch("/api/github/preferences", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const reposData = await reposRes.json();
      setRepos(reposData.repos || []);
      if (r2.ok) {
        const prefData = await r2.json();
        setLocalPrefs(prefData.map((p) => p.repoId));
      }
    } catch (err) {
      console.error("Failed to load github repos data:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll while processing
  useEffect(() => {
    const hasProcessing = repos.some((r) =>
      ["pending", "cloning", "parsing", "indexing"].includes(r.status)
    );
    if (!hasProcessing) return;
    const t = setInterval(fetchData, 5000);
    return () => clearInterval(t);
  }, [repos, fetchData]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addUrl.trim()) return;
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/github-repos/add", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: addUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "فشل إضافة المستودع");
      } else {
        setAddUrl("");
        setAddError("");
        setTimeout(fetchData, 1500);
      }
    } catch {
      setAddError("خطأ في الاتصال");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (repoId, fullName) => {
    if (!confirm(`هل أنت متأكد من حذف ${fullName}؟ سيتم حذف كل الـ vectors المرتبطة.`)) return;
    try {
      await fetch(`/api/github-repos/remove/${repoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      console.error("Remove failed:", err);
    }
  };

  const handleReindex = async (repoId) => {
    try {
      await fetch(`/api/github-repos/reindex/${repoId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setTimeout(fetchData, 1500);
    } catch (err) {
      console.error("Reindex failed:", err);
    }
  };

  const togglePref = (fullName) => {
    setLocalPrefs((prev) =>
      prev.includes(fullName) ? prev.filter((r) => r !== fullName) : [...prev, fullName]
    );
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/github-repos/my-prefs", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ enabledRepos: localPrefs }),
      });
      if (res.ok) {
        setSuccessMsg("تم حفظ التفضيلات ✓");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        // Handle error if needed
        console.error("Failed to save preferences");
      }
    } catch (err) {
      console.error("Save prefs failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const readyRepos = repos.filter((r) => r.status === "ready");
  const totalChunks = readyRepos.reduce((sum, r) => sum + (r.chunkCount || 0), 0);
  const totalFiles = readyRepos.reduce((sum, r) => sum + (r.fileCount || 0), 0);
  const enabledCount = localPrefs.length;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-950">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">🐙</span>
          <h1 className="text-2xl font-bold text-white">GitHub Repos Knowledge</h1>
        </div>
        <p className="text-slate-400 text-sm mt-1">
          حوّل أي مستودع GitHub إلى قاعدة معرفة قابلة للبحث أثناء المحادثة
        </p>
        {/* Stats */}
        <div className="flex items-center gap-6 mt-4">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{readyRepos.length}</div>
            <div className="text-xs text-slate-500">مستودع جاهز</div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="text-center">
            <div className="text-xl font-bold text-violet-400">{enabledCount}</div>
            <div className="text-xs text-slate-500">مفعّل لديك</div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="text-center">
            <div className="text-xl font-bold text-emerald-400">{totalFiles.toLocaleString()}</div>
            <div className="text-xs text-slate-500">ملف مفهرس</div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="text-center">
            <div className="text-xl font-bold text-cyan-400">{totalChunks.toLocaleString()}</div>
            <div className="text-xs text-slate-500">chunk</div>
          </div>
        </div>
      </div>

      {/* Add repo form */}
      <div className="px-8 py-4 border-b border-slate-800/50">
        <form onSubmit={handleAdd} className="flex gap-3 max-w-2xl">
          <input
            type="text"
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder="الصق رابط GitHub أو اكتب owner/repo"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
            dir="ltr"
          />
          <button
            type="submit"
            disabled={adding || !addUrl.trim()}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white text-sm rounded-xl font-medium transition-colors"
          >
            {adding ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري الإضافة
              </span>
            ) : (
              "➕ إضافة مستودع"
            )}
          </button>
        </form>
        {addError && <p className="text-red-400 text-sm mt-2">{addError}</p>}
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : repos.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4">🐙</span>
            <p className="text-slate-400 text-lg">لا توجد مستودعات بعد</p>
            <p className="text-slate-600 text-sm mt-1">أضف أول مستودع باستخدام الحقل أعلاه</p>
          </div>
        ) : (
          <div className="max-w-4xl space-y-3">
            {repos.map((repo) => {
              const isReady = repo.status === "ready";
              const isProcessing = ["pending", "cloning", "parsing", "indexing"].includes(repo.status);
              const isEnabled = localPrefs.includes(repo.fullName);
              const statusInfo = STATUS_INFO[repo.status] || STATUS_INFO.pending;
              const langColor = LANG_COLORS[repo.language] || "bg-slate-500";

              return (
                <div
                  key={repo.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    isReady && isEnabled
                      ? "bg-violet-500/5 border-violet-500/20"
                      : isReady
                        ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                        : "bg-slate-900/50 border-slate-800/50"
                  }`}
                >
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <a
                        href={`https://github.com/${repo.fullName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white font-medium hover:text-violet-300 transition-colors"
                        dir="ltr"
                      >
                        {repo.fullName}
                      </a>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.badge}`}>
                        {statusInfo.text}
                      </span>
                      {repo.language && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <span className={`w-2.5 h-2.5 rounded-full ${langColor}`} />
                          {repo.language}
                        </span>
                      )}
                      {repo.stars > 0 && (
                        <span className="text-xs text-slate-500">⭐ {repo.stars.toLocaleString()}</span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-slate-500 truncate mb-1">{repo.description}</p>
                    )}
                    {isReady && (
                      <p className="text-xs text-slate-600">
                        {repo.fileCount} ملف · {repo.chunkCount?.toLocaleString()} chunk · {formatSize(repo.totalSize)}
                      </p>
                    )}
                    {repo.status === "error" && (
                      <p className="text-xs text-red-400 truncate">{repo.errorMessage}</p>
                    )}
                  </div>

                  {/* Toggle */}
                  {isReady && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-500">
                        {isEnabled ? "مفعّل" : "معطّل"}
                      </span>
                      <button
                        onClick={() => togglePref(repo.fullName)}
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

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isAdmin && isReady && (
                      <button
                        onClick={() => handleReindex(repo.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                        title="إعادة فهرسة"
                      >
                        🔄
                      </button>
                    )}
                    {!isProcessing && (
                      <button
                        onClick={() => handleRemove(repo.id, repo.fullName)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                        title="حذف"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Save prefs button */}
            {readyRepos.length > 0 && (
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={savePrefs}
                  disabled={saving}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors"
                >
                  {saving ? "جاري الحفظ..." : "💾 حفظ التفضيلات"}
                </button>
                {successMsg && (
                  <span className="text-emerald-400 text-sm">{successMsg}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
