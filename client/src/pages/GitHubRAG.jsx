import { useState, useEffect, useCallback, useRef } from "react";
import ChatPanel from "../components/ChatPanel";
import Sidebar from "../components/Sidebar";
import GlassCard from "../components/GlassCard";
import SearchBar from "../components/SearchBar";
import ConversationsList from "../components/ConversationsList";
import SidebarTabs from "../components/SidebarTabs";
import { useAuth } from "../contexts/AuthContext";
import { usePerformance } from "../contexts/PerformanceContext";
import { useSidebar } from "../contexts/SidebarContext";
import useConversations from "../hooks/useConversations";

export default function GitHubRAG() {
  const { user, token } = useAuth();
  const { isPerformanceMode } = usePerformance();
  const { openSidebar } = useSidebar();

  const {
    conversations,
    activeConv,
    setActiveConv,
    startNewConversation,
    deleteConversation,
    togglePin,
    renameConversation,
    fetchConversations,
  } = useConversations("github");

  const [repos, setRepos] = useState([]);
  const [localPrefs, setLocalPrefs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [langFilter, setLangFilter] = useState("all");
  const [repoSearch, setRepoSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const messagesRef = useRef(null);
  const endRef = useRef(null);

  const fetchMessages = useCallback(async (convId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(
        (Array.isArray(data) ? data : []).map((m) => ({
          role: m.role,
          text: m.content,
          ts: m.created_at,
          mediaType: m.media_type,
          mediaUrl: m.media_url,
        }))
      );
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id);
    } else {
      setMessages([]);
    }
  }, [activeConv, fetchMessages]);

  const fetchData = useCallback(async () => {
    setLoadingRepos(true);
    try {
      const reposRes = await fetch("/api/github-repos/repos", { headers: { Authorization: `Bearer ${token}` } });
      const prefsRes = await fetch("/api/github-repos/my-prefs", { headers: { Authorization: `Bearer ${token}` } });
      const reposData = await reposRes.json();
      const prefsData = await prefsRes.json();
      setRepos(reposData.repos || []);
      setLocalPrefs(prefsData.enabledRepos || []);
    } catch (err) { console.error(err); }
    finally { setLoadingRepos(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleRepo = async (fullName) => {
    const next = localPrefs.includes(fullName) ? localPrefs.filter(r => r !== fullName) : [...localPrefs, fullName];
    setLocalPrefs(next);
    try { await fetch("/api/github-repos/my-prefs", { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ enabledRepos: next }) }); } catch (e) { console.error(e); }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input, ts: new Date().getTime() };
    setMessages(prev => [...prev, userMsg]); setInput(""); setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg.text, githubReposMode: true, githubRepos: localPrefs, enableWebSearch: false, conversationId: activeConv?.id, tag: "github" })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", text: data.answer || data.text || "", ts: new Date().getTime() }]);
      if (!activeConv) fetchConversations();
    } catch { setMessages(prev => [...prev, { role: "error", text: "فشل البحث في الأكواد" }]); }
    finally { setLoading(false); setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }
  };

  const addRepo = async () => {
    if (!repoUrl.trim()) return;
    try { await fetch("/api/github-repos/add", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ url: repoUrl.trim() }) }); setRepoUrl(""); fetchData(); } catch (err) { console.error(err); }
  };

  const languages = ["all", ...new Set(repos.map((r) => (r.language || "unknown")).filter(Boolean))];
  const filteredRepos = repos.filter((repo) => {
    const langOk = langFilter === "all" || (repo.language || "unknown") === langFilter;
    const searchOk = (repo.fullName || "").toLowerCase().includes(repoSearch.toLowerCase());
    return langOk && searchOk;
  });

  const SettingsTab = (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex gap-2">
          <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/owner/repo"
            className="flex-1 rounded-xl px-3 py-2 text-xs input-luxury" dir="ltr" />
          <button onClick={addRepo} className="btn-luxury px-3 py-2 rounded-xl text-xs font-semibold">إضافة</button>
        </div>
        <SearchBar value={repoSearch} onChange={setRepoSearch} placeholder="بحث في المستودعات..." />
        <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)} className="w-full rounded-xl px-3 py-2 text-xs input-luxury">
          {languages.map((lang) => (<option key={lang} value={lang}>{lang === "all" ? "كل اللغات" : lang}</option>))}
        </select>
      </div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>المستودعات المتاحة ({filteredRepos.length})</h3>
        <button onClick={fetchData} className="text-[10px]" style={{ color: "var(--accent-tertiary)" }}>تحديث</button>
      </div>
      {loadingRepos ? (
        <div className="py-10 flex justify-center">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(167,139,250,0.3)", borderTopColor: "var(--accent-tertiary)" }} />
        </div>
      ) : filteredRepos.length === 0 ? (
        <p className="text-[10px] text-center py-4" style={{ color: "var(--text-muted)" }}>لا توجد مستودعات مضافة.</p>
      ) : (
        filteredRepos.map(repo => {
          const isEnabled = localPrefs.includes(repo.fullName);
          const isReady = repo.status === 'ready';
          return (
            <GlassCard key={repo.id} onClick={isReady ? () => toggleRepo(repo.fullName) : undefined}
              className={`p-3! transition-all cursor-pointer mb-2 ${isEnabled ? 'ring-1' : 'opacity-80'}`}
              style={{ ringColor: isEnabled ? "var(--accent-tertiary)" : undefined }}>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(167,139,250,0.06)" }}>
                    <span className="text-sm" style={{ color: "var(--accent-tertiary)" }}>⬡</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{repo.fullName.split('/')[1]}</p>
                    <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{repo.fullName.split('/')[0]} • {repo.language || "n/a"}</p>
                  </div>
                </div>
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors duration-200`}
                  style={{ background: isEnabled ? "var(--accent-tertiary)" : "transparent", borderColor: isEnabled ? "var(--accent-tertiary)" : "var(--border-color)" }}>
                  {isEnabled && <span className="text-[8px] text-white font-bold">✓</span>}
                </div>
              </div>
            </GlassCard>
          );
        })
      )}
    </div>
  );

  const ChatsTab = (
    <ConversationsList
      conversations={conversations}
      activeConv={activeConv}
      setActiveConv={setActiveConv}
      startNewConversation={startNewConversation}
      deleteConversation={deleteConversation}
      togglePin={togglePin}
      renameConversation={renameConversation}
    />
  );

  return (
    <div className={`${isPerformanceMode ? "chat-perf-mode" : ""} flex h-full w-full min-h-0 overflow-hidden relative`}>
      <Sidebar>
        <SidebarTabs
          tabs={[
            { label: "المحادثات", icon: "💬", content: ChatsTab },
            { label: "المستودعات", icon: "🐙", content: SettingsTab }
          ]}
          defaultTab={0}
        />
      </Sidebar>

      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        <button
          onClick={openSidebar}
          className="md:hidden absolute top-2 right-2 z-20 w-9 h-9 rounded-lg border backdrop-blur-sm"
          style={{ color: "var(--text-primary)", borderColor: "var(--border-color)", background: "var(--bg-surface)" }}
          aria-label="فتح قائمة المستودعات"
        >
          📜
        </button>
        <ChatPanel mode="github-rag" messages={messages} loading={loading} input={input} setInput={setInput}
          sendMessage={sendMessage} messagesRef={messagesRef} endRef={endRef} user={user}
          welcomeTitle="اسأل في الكود" welcomeDesc="اختر المستودعات التي تريد البحث فيها من القائمة الجانبية."
          welcomeIcon={<span className="text-3xl">🧩🐙</span>} showWebSearchToggle={false}
          mediaSupported={false} placeholder="ابحث في الكود..." />
      </main>
    </div>
  );
}
