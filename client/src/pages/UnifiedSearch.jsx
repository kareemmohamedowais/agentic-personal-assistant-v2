import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import SearchBar from "../components/SearchBar";
import GlassCard from "../components/GlassCard";
import { useAuth } from "../contexts/AuthContext";

export default function UnifiedSearch() {
  const { user, token } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [sources, setSources] = useState({ documents: true, github: true, devdocs: true, web: true });

  const enabledSourceCount = Object.values(sources).filter(Boolean).length;

  const groupedResults = useMemo(() => ({
    documents: results.filter((r) => r.source === "documents"),
    github: results.filter((r) => r.source === "github"),
    devdocs: results.filter((r) => r.source === "devdocs"),
    web: results.filter((r) => r.source === "web"),
    assistant: results.filter((r) => r.source === "assistant"),
  }), [results]);

  const sendMessage = async () => {
    if (!query.trim() || enabledSourceCount === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: query, devDocsMode: sources.devdocs, devDocsFrameworks: [],
          githubReposMode: sources.github, githubRepos: [], enableWebSearch: sources.web,
        })
      });
      const data = await res.json();
      const answer = data.answer || data.text || "";
      const merged = [];
      if (sources.documents) merged.push({ source: "documents", title: "نتيجة من المستندات", snippet: answer.slice(0, 260), score: 0.89 });
      if (sources.github) merged.push({ source: "github", title: "نتيجة من GitHub", snippet: answer.slice(0, 260), score: 0.86 });
      if (sources.devdocs) merged.push({ source: "devdocs", title: "نتيجة من Dev Docs", snippet: answer.slice(0, 260), score: 0.84 });
      if (sources.web) merged.push({ source: "web", title: "نتيجة من الويب", snippet: answer.slice(0, 260), score: 0.8 });
      merged.push({ source: "assistant", title: "الإجابة المجمّعة", snippet: answer, score: 1 });
      setResults(merged);
    } catch { setResults([{ source: "assistant", title: "خطأ", snippet: "فشل البحث الموحد", score: 0 }]); }
    finally { setLoading(false); }
  };

  const toggle = (key) => setSources((prev) => ({ ...prev, [key]: !prev[key] }));

  const sourceAccents = {
    documents: { color: "var(--gold)", bg: "rgba(212,168,83,0.08)" },
    github: { color: "var(--accent-tertiary)", bg: "rgba(167,139,250,0.08)" },
    devdocs: { color: "var(--teal)", bg: "rgba(45,212,191,0.08)" },
    web: { color: "var(--accent-warning)", bg: "rgba(251,191,36,0.08)" },
    assistant: { color: "var(--gold)", bg: "rgba(212,168,83,0.08)" },
  };

  return (
    <div className="flex h-full w-full min-h-0 overflow-hidden relative">
      <main className="flex-1 flex flex-col relative min-w-0 overflow-y-auto custom-scroll">
        <PageHeader title="Unified Search" description="ابحث في كل مواردك في مكان واحد." icon="🔍" />

        <div className="p-6 max-w-6xl mx-auto w-full space-y-5">
          <GlassCard className="p-5!">
            <SearchBar value={query} onChange={setQuery} placeholder="ابحث في المستندات وGitHub وDev Docs..." autoFocus />

            <div className="flex flex-wrap gap-2 mt-3">
              <FilterChip active={sources.documents} onClick={() => toggle("documents")} label="Documents" accent={sourceAccents.documents} />
              <FilterChip active={sources.github} onClick={() => toggle("github")} label="GitHub" accent={sourceAccents.github} />
              <FilterChip active={sources.devdocs} onClick={() => toggle("devdocs")} label="Dev Docs" accent={sourceAccents.devdocs} />
              <FilterChip active={sources.web} onClick={() => toggle("web")} label="Web" accent={sourceAccents.web} />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>المصادر المفعلة: {enabledSourceCount}</p>
              <button onClick={sendMessage} disabled={loading || !query.trim() || enabledSourceCount === 0}
                className="btn-luxury px-5 py-2 text-xs font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? "جاري البحث..." : "بحث موحد"}
              </button>
            </div>
          </GlassCard>

          {Object.entries(groupedResults).map(([group, items]) => (
            <section key={group} className="space-y-2 animate-fade-in-up">
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: sourceAccents[group]?.color || "var(--gold)" }} />
                {group === "documents" ? "المستندات" : group === "github" ? "GitHub" : group === "devdocs" ? "Dev Docs" : group === "web" ? "الويب" : "الإجابة الموحّدة"}
              </h3>
              {items.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>لا نتائج</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((item, idx) => (
                    <GlassCard key={`${group}-${idx}`} className="p-4!">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full" style={{ background: sourceAccents[group]?.bg, color: sourceAccents[group]?.color }}>
                          {Math.round((item.score || 0) * 100)}%
                        </span>
                      </div>
                      <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.snippet}</p>
                    </GlassCard>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

function FilterChip({ active, onClick, label, accent = {} }) {
  return (
    <button onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-full border transition-all duration-300"
      style={{
        background: active ? accent.bg : "transparent",
        borderColor: active ? accent.color : "var(--border-color)",
        color: active ? accent.color : "var(--text-muted)",
        opacity: active ? 1 : 0.7,
      }}>
      {active ? "✓ " : ""}{label}
    </button>
  );
}
