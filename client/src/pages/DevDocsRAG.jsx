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
import useModels from "../hooks/useModels";

export default function DevDocsRAG() {
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
  } = useConversations("devdocs");

  const { models, selectedModel, setSelectedModel, selectedProvider, setSelectedProvider } = useModels();

  const [frameworks, setFrameworks] = useState([]);
  const [localPrefs, setLocalPrefs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [frameworkSearch, setFrameworkSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const messagesRef = useRef(null);
  const endRef = useRef(null);
  const isCreatingConvRef = useRef(false);

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
      if (isCreatingConvRef.current) {
        isCreatingConvRef.current = false;
        return;
      }
      fetchMessages(activeConv.id);
    } else {
      setMessages([]);
    }
  }, [activeConv, fetchMessages]);

  const fetchData = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const fwRes = await fetch("/api/dev-docs/frameworks", { headers: { Authorization: `Bearer ${token}` } });
      const prefsRes = await fetch("/api/dev-docs/my-prefs", { headers: { Authorization: `Bearer ${token}` } });
      const fwData = await fwRes.json();
      const prefsData = await prefsRes.json();
      setFrameworks(fwData.frameworks || []);
      setLocalPrefs(prefsData.enabledFrameworks || []);
    } catch (err) { console.error(err); }
    finally { setLoadingDocs(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleFramework = async (fwId) => {
    const next = localPrefs.includes(fwId) ? localPrefs.filter(f => f !== fwId) : [...localPrefs, fwId];
    setLocalPrefs(next);
    try { await fetch("/api/dev-docs/my-prefs", { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ enabledFrameworks: next }) }); } catch(e) { console.error(e); }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input, ts: new Date().getTime() };
    setMessages(prev => [...prev, userMsg]); setInput(""); setLoading(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg.text, devDocsMode: true, devDocsFrameworks: localPrefs, enableWebSearch: false, conversationId: activeConv?.id, tag: "devdocs", model: selectedModel, provider: selectedProvider }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", text: data.answer || data.text || "", ts: new Date().getTime() }]);
      if (!activeConv && data.conversationId) {
        isCreatingConvRef.current = true;
        setActiveConv({ id: data.conversationId, title: userMsg.text.substring(0, 30) || "محادثة جديدة" });
        fetchConversations();
      } else if (!activeConv) {
        fetchConversations();
      }
    } catch { setMessages(prev => [...prev, { role: "error", text: "فشل البحث في التوثيق" }]); }
    finally { setLoading(false); setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }
  };

  const categories = ["all", ...new Set(frameworks.map((f) => f.category).filter(Boolean))];
  const filteredFrameworks = frameworks.filter((f) => f.status === "ready").filter((f) => (categoryFilter === "all" ? true : f.category === categoryFilter)).filter((f) => (f.displayName || "").toLowerCase().includes(frameworkSearch.toLowerCase()));

  const SettingsTab = (
    <div className="space-y-4">
      <SearchBar value={frameworkSearch} onChange={setFrameworkSearch} placeholder="بحث في الأطر..." />
      <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full rounded-xl px-3 py-2 text-xs input-luxury">
        {categories.map((cat) => (<option key={cat} value={cat}>{cat === "all" ? "كل الفئات" : cat}</option>))}
      </select>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>التوثيق المثبت ({filteredFrameworks.length})</h3>
        <button onClick={fetchData} className="text-[10px]" style={{ color: "var(--accent-success)" }}>تحديث</button>
      </div>
      {loadingDocs ? (
        <div className="py-10 flex justify-center">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(52,211,153,0.3)", borderTopColor: "var(--accent-success)" }} />
        </div>
      ) : filteredFrameworks.length === 0 ? (
        <p className="text-[10px] text-center py-4" style={{ color: "var(--text-muted)" }}>لا يوجد توثيق مثبت بعد.</p>
      ) : (
        filteredFrameworks.map(fw => {
          const isEnabled = localPrefs.includes(fw.framework);
          return (
            <GlassCard key={fw.framework} onClick={() => toggleFramework(fw.framework)}
              className={`p-3! transition-all cursor-pointer mb-2 ${isEnabled ? 'ring-2' : 'opacity-80 hover:opacity-100'}`}
              style={{ ringColor: isEnabled ? "var(--accent-success)" : undefined }}>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl shrink-0">{fw.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{fw.displayName}</p>
                    <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>v{fw.version} • {fw.category}</p>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm"
                  style={{ 
                    background: isEnabled ? "var(--accent-success)" : "rgba(255,255,255,0.05)", 
                    borderColor: isEnabled ? "var(--accent-success)" : "var(--border-subtle)",
                    boxShadow: isEnabled ? "0 0 10px rgba(16,185,129,0.5)" : "none"
                  }}>
                  {isEnabled && <span className="text-xs text-white font-bold leading-none">✓</span>}
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
            { label: "المراجع", icon: "📚", content: SettingsTab }
          ]} 
          defaultTab={0}
        />
      </Sidebar>

      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        <button
          onClick={openSidebar}
          className="md:hidden absolute top-2 right-2 z-20 w-9 h-9 rounded-lg border backdrop-blur-sm"
          style={{ color: "var(--text-primary)", borderColor: "var(--border-color)", background: "var(--bg-surface)" }}
          aria-label="فتح قائمة المراجع"
        >
          📖
        </button>
        <ChatPanel mode="dev-docs-rag" messages={messages} loading={loading} input={input} setInput={setInput}
          sendMessage={sendMessage} messagesRef={messagesRef} endRef={endRef} user={user}
          models={models} selectedModel={selectedModel} setSelectedModel={setSelectedModel} setSelectedProvider={setSelectedProvider}
          welcomeTitle="خبير البرمجة" welcomeDesc="اختر لغات البرمجة والـ Frameworks التي تريد البحث في توثيقها."
          welcomeIcon={<span className="text-3xl">🧩📚</span>} showWebSearchToggle={false}
          mediaSupported={false} placeholder="ابحث في التوثيق..." />
      </main>
    </div>
  );
}
