import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useGithubRepos } from "../contexts/GitHubReposContext";

function StatusBadge({ status }) {
  if (status === "ready")
    return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">جاهز ✓</span>;
  if (status === "error")
    return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">خطأ</span>;
  if (["pending", "cloning", "parsing", "indexing"].includes(status))
    return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 animate-pulse">جاري المعالجة...</span>;
  return null;
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
  Dart: "bg-cyan-500",
};

export default function GitHubReposPanel({ open, onClose, enabledRepos, onToggleRepo, onSave, positionClass, excludeRef }) {
  const { token, user } = useAuth();
  const { githubReposEnabled, toggleGithubRepos } = useGithubRepos();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const panelRef = useRef(null);

  const fetchRepos = useCallback(async () => {
    try {
      const res = await fetch("/api/github-repos/repos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setRepos(data.repos || []);
    } catch (err) {
      console.error("GitHubReposPanel fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchRepos();
    }
  }, [open, fetchRepos]);

  // Poll while processing
  useEffect(() => {
    if (!open) return;
    const hasProcessing = repos.some((r) =>
      ["pending", "cloning", "parsing", "indexing"].includes(r.status)
    );
    if (!hasProcessing) return;
    const t = setInterval(fetchRepos, 4000);
    return () => clearInterval(t);
  }, [open, repos, fetchRepos]);

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
        setTimeout(fetchRepos, 1000);
      }
    } catch {
      setAddError("خطأ في الاتصال");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (repoId, fullName) => {
    if (!confirm(`هل أنت متأكد من حذف ${fullName}؟`)) return;
    await fetch(`/api/github-repos/remove/${repoId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchRepos();
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const readyCount = repos.filter((r) => r.status === "ready").length;
  const enabledCount = enabledRepos.length;

  if (!open) return null;

  return (
    <div ref={panelRef} className={positionClass ?? "absolute bottom-full left-0 right-0 mb-3 z-50"}>
      <div className="bg-[#0f1117] border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/20 flex items-center justify-center text-sm">
              🐙
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">GitHub Repos</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {readyCount > 0 ? `${readyCount} جاهز · ${enabledCount} مفعّل` : "أضف مستودعات GitHub لقاعدة المعرفة"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleGithubRepos}
              className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                githubReposEnabled
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${githubReposEnabled ? "bg-emerald-400" : "bg-slate-600"}`} />
              {githubReposEnabled ? "بحث مفعّل" : "بحث معطّل"}
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

        {/* Add repo form */}
        <div className="px-4 py-3 border-b border-slate-800/60">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder="owner/repo أو رابط GitHub"
              className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
              dir="ltr"
            />
            <button
              type="submit"
              disabled={adding || !addUrl.trim()}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white text-sm rounded-lg font-medium transition-colors"
            >
              {adding ? "..." : "إضافة"}
            </button>
          </form>
          {addError && <p className="text-red-400 text-[11px] mt-1.5">{addError}</p>}
        </div>

        {/* Repo list */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className={`max-h-72 overflow-y-auto transition-opacity ${githubReposEnabled ? "" : "opacity-50"}`}>
            <div className="p-3 space-y-1.5">
              {repos.length === 0 ? (
                <p className="text-center text-slate-600 text-xs py-6">لا توجد مستودعات بعد — أضف أول مستودع!</p>
              ) : (
                repos.map((repo) => {
                  const isReady = repo.status === "ready";
                  const isEnabled = isReady && enabledRepos.includes(repo.fullName);
                  const langColor = LANG_COLORS[repo.language] || "bg-slate-500";

                  return (
                    <div
                      key={repo.id}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                        isEnabled
                          ? "bg-violet-500/8 border-violet-500/25"
                          : isReady
                            ? "bg-slate-800/40 border-slate-700/30 hover:border-slate-600/50"
                            : "bg-slate-800/20 border-slate-800/40"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate" dir="ltr">{repo.fullName}</p>
                          <StatusBadge status={repo.status} />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {repo.language && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-500">
                              <span className={`w-2 h-2 rounded-full ${langColor}`} />
                              {repo.language}
                            </span>
                          )}
                          {repo.stars > 0 && (
                            <span className="text-[10px] text-slate-500">⭐ {repo.stars.toLocaleString()}</span>
                          )}
                          {isReady && (
                            <span className="text-[10px] text-slate-600">{repo.fileCount} files · {repo.chunkCount} chunks</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isReady && githubReposEnabled && (
                          <Toggle enabled={isEnabled} onChange={() => onToggleRepo(repo.fullName)} />
                        )}
                        <button
                          onClick={() => handleRemove(repo.id, repo.fullName)}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs"
                          title="حذف"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Footer: Save */}
        {readyCount > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-800/60 flex items-center justify-between">
            <span className="text-[10px] text-slate-600">{enabledCount} من {readyCount} مفعّل</span>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                saved
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-violet-600 hover:bg-violet-500 text-white"
              }`}
            >
              {saved ? "✓ تم الحفظ" : saving ? "..." : "حفظ التفضيلات"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
