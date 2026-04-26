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

export default function DocumentRAG() {
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
  } = useConversations("document");

  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [docFilter, setDocFilter] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
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

  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch("/api/documents", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch { setDocuments([]); }
    finally { setLoadingDocs(false); }
  }, [token]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input, ts: new Date().getTime() };
    setMessages(prev => [...prev, userMsg]); setInput(""); setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg.text, enableWebSearch: false, conversationId: activeConv?.id, tag: "document" })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", text: data.answer || data.text || "", ts: new Date().getTime() }]);
      if (!activeConv) fetchConversations();
    } catch { setMessages(prev => [...prev, { role: "error", text: "فشل البحث في المستندات" }]); }
    finally { setLoading(false); setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }
  };

  const uploadDocument = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    await fetch("/api/ingest", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
    fetchDocuments();
  };

  const filteredDocuments = documents.filter((d) => (d.original_name || "").toLowerCase().includes(docFilter.toLowerCase()));

  const SettingsTab = (
    <div className="space-y-3">
      <div className="rounded-xl border border-dashed p-3" style={{ borderColor: "rgba(45,212,191,0.15)", background: "rgba(45,212,191,0.02)" }}>
        <label className="text-xs block mb-2" style={{ color: "var(--text-muted)" }}>رفع ملف جديد</label>
        <input type="file" className="w-full text-xs" style={{ color: "var(--text-secondary)" }}
          onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadDocument(file).catch(console.error); e.target.value = ""; }} />
      </div>
      <SearchBar value={docFilter} onChange={setDocFilter} placeholder="فلترة المستندات..." />
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>المستندات ({filteredDocuments.length})</h3>
        <button onClick={fetchDocuments} className="text-[10px] transition-colors duration-200" style={{ color: "var(--teal)" }}>تحديث</button>
      </div>
      {loadingDocs ? (
        <div className="py-10 flex justify-center">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(45,212,191,0.3)", borderTopColor: "var(--teal)" }} />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <p className="text-[10px] text-center py-4" style={{ color: "var(--text-muted)" }}>لا توجد مستندات مرفوعة.</p>
      ) : (
        filteredDocuments.map(doc => (
          <GlassCard key={doc.id} className={`p-3! bg-white/5! mb-2 ${selectedDoc?.id === doc.id ? "ring-1" : ""}`}
            onClick={() => setSelectedDoc(doc)}
            style={{ ringColor: selectedDoc?.id === doc.id ? "var(--teal)" : undefined }}>
            <div className="flex items-start gap-2">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(45,212,191,0.06)" }}>
                <span className="text-sm" style={{ color: "var(--teal)" }}>▤</span>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{doc.original_name}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{doc.chunk_count || 0} chunks</p>
              </div>
            </div>
          </GlassCard>
        ))
      )}
      {selectedDoc && (
        <GlassCard className="p-3!">
          <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{selectedDoc.original_name}</p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            النوع: {selectedDoc.file_type} • الحجم: {Math.round((selectedDoc.file_size || 0) / 1024)}KB • chunks: {selectedDoc.chunk_count || 0}
          </p>
        </GlassCard>
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
            { label: "المستندات", icon: "📄", content: SettingsTab }
          ]} 
          defaultTab={0}
        />
      </Sidebar>

      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        <button
          onClick={openSidebar}
          className="md:hidden absolute top-2 right-2 z-20 w-9 h-9 rounded-lg border backdrop-blur-sm"
          style={{ color: "var(--text-primary)", borderColor: "var(--border-color)", background: "var(--bg-surface)" }}
          aria-label="فتح قائمة المستندات"
        >
          📂
        </button>
        <ChatPanel mode="document-rag" messages={messages} loading={loading} input={input} setInput={setInput}
          sendMessage={sendMessage} messagesRef={messagesRef} endRef={endRef} user={user}
          welcomeTitle="اسأل مستنداتك" welcomeDesc="يمكنك طرح أسئلة حول محتوى الملفات المرفوعة."
            welcomeIcon={<span className="text-3xl">🔍📄</span>} showWebSearchToggle={false}
          mediaSupported={false} placeholder="ابحث في المستندات..." />
      </main>
    </div>
  );
}
