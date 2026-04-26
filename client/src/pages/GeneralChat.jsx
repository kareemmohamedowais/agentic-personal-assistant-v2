import { useState, useEffect, useRef, useCallback } from "react";
import ChatPanel from "../components/ChatPanel";
import Sidebar from "../components/Sidebar";
import ConversationsList from "../components/ConversationsList";
import { useAuth } from "../contexts/AuthContext";
import { usePerformance } from "../contexts/PerformanceContext";
import { useSidebar } from "../contexts/SidebarContext";
import useConversations from "../hooks/useConversations";

function makeMessageId(prefix = "msg") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function GeneralChat() {
  const { user, token } = useAuth();
  const { isPerformanceMode } = usePerformance();
  const { openSidebar } = useSidebar();
  
  // State from old Chat.jsx but refactored
  const {
    conversations,
    activeConv,
    setActiveConv,
    startNewConversation,
    deleteConversation,
    togglePin,
    renameConversation,
    fetchConversations,
  } = useConversations("general");
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash-lite");
  const [selectedProvider, setSelectedProvider] = useState("gemini");
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  
  const textareaRef = useRef(null);
  const messagesRef = useRef(null);
  const endRef = useRef(null);
  const mediaInputRef = useRef(null);
  const scrollRafRef = useRef(null);
  const showScrollRef = useRef(false);

  const fetchMessages = useCallback(async (convId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(
        (Array.isArray(data) ? data : []).map((m, index) => ({
          id: m.id ? `srv-${m.id}` : `hist-${m.created_at || Date.now()}-${index}`,
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

  // Load models & prompts
  useEffect(() => {
    fetch("/api/models", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setModels(Array.isArray(data) ? data : []));
    fetch("/api/prompts", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setPrompts(Array.isArray(data) ? data : []));
  }, [token]);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id);
    } else {
      setMessages([]);
    }
  }, [activeConv, fetchMessages]);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!messagesRef.current) return;
    if (scrollRafRef.current) return;

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (!messagesRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = messagesRef.current;
      const shouldShow = scrollHeight - scrollTop > clientHeight + 200;
      if (showScrollRef.current !== shouldShow) {
        showScrollRef.current = shouldShow;
        setShowScrollBtn(shouldShow);
      }
    });
  };

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setMediaFile(file);
  };

  const handleRemoveMedia = () => setMediaFile(null);

  const sendMessage = async () => {
    if (!input.trim() && !mediaFile) return;
    
    const userMsg = { id: makeMessageId("user"), role: "user", text: input, ts: new Date().getTime() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    const aiTs = new Date().getTime();
    const aiMessageId = makeMessageId("ai");
    setMessages((prev) => [...prev, { id: aiMessageId, role: "ai", text: "", ts: aiTs, streaming: true }]);
    
    try {
      const formData = new FormData();
      formData.append("message", userMsg.text || "");
      if (activeConv?.id) formData.append("conversationId", String(activeConv.id));
      if (selectedPrompt) formData.append("promptId", String(selectedPrompt));
      formData.append("model", selectedModel || "");
      formData.append("provider", selectedProvider || "");
      formData.append("enableWebSearch", String(webSearchEnabled));
      formData.append("tag", "general");
      if (mediaFile) formData.append("media", mediaFile);

      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      if (!res.ok || !res.body) {
        throw new Error("فشل بدء البث");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamDone = false;
      let pendingText = "";
      let flushTimer = null;

      const flushPendingText = () => {
        if (!pendingText) return;
        const chunk = pendingText;
        pendingText = "";
        setMessages((prev) => {
          const updated = [...prev];
          const idx = updated.findLastIndex((msg) => msg.id === aiMessageId && msg.role === "ai" && msg.streaming);
          if (idx >= 0) {
            updated[idx] = {
              ...updated[idx],
              text: (updated[idx].text || "") + chunk,
            };
          }
          return updated;
        });
      };

      const scheduleFlush = () => {
        if (flushTimer) return;
        flushTimer = setTimeout(() => {
          flushTimer = null;
          flushPendingText();
        }, 40);
      };

      while (!streamDone) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const line = chunk
            .split("\n")
            .find((l) => l.startsWith("data:"));
          if (!line) continue;

          let event;
          try {
            event = JSON.parse(line.replace(/^data:\s*/, ""));
          } catch {
            continue;
          }

          if (event.type === "meta" && !activeConv && event.conversationId) {
            setActiveConv({ id: event.conversationId, title: userMsg.text.substring(0, 30) || "محادثة جديدة" });
            fetchConversations();
          }

          if (event.type === "fallback") {
            flushPendingText();
            setMessages((prev) => {
              const updated = [...prev];
              const idx = updated.findLastIndex((m) => m.id === aiMessageId && m.role === "ai" && m.streaming);
              if (idx >= 0) {
                updated[idx] = {
                  ...updated[idx],
                  fallback: true,
                  usedModel: event.usedModel,
                };
              }
              return updated;
            });
          }

          if (event.type === "token") {
            pendingText += event.content || "";
            scheduleFlush();
          }

          if (event.type === "error") {
            if (flushTimer) {
              clearTimeout(flushTimer);
              flushTimer = null;
            }
            flushPendingText();
            setMessages((prev) => [
              ...prev.filter((m) => !(m.id === aiMessageId && m.role === "ai" && m.streaming)),
              { id: makeMessageId("error"), role: "error", text: event.message || "حدث خطأ", error: event },
            ]);
            streamDone = true;
            break;
          }

          if (event.type === "done") {
            if (flushTimer) {
              clearTimeout(flushTimer);
              flushTimer = null;
            }
            flushPendingText();
            setMessages((prev) => {
              const updated = [...prev];
              const idx = updated.findLastIndex((m) => m.id === aiMessageId && m.role === "ai" && m.streaming);
              if (idx >= 0) {
                updated[idx] = { ...updated[idx], streaming: false };
              }
              return updated;
            });
            fetchConversations();
            streamDone = true;
            break;
          }
        }
      }

      setMediaFile(null);
    } catch (err) {
      setMessages(prev => [...prev, { id: makeMessageId("error"), role: "error", text: "حدث خطأ في الإرسال" }]);
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  // Mutation functions handled by useConversations

  return (
    <div className={`${isPerformanceMode ? "chat-perf-mode" : ""} flex h-full w-full min-h-0 overflow-hidden relative`}>
      <Sidebar>
        <ConversationsList
          conversations={conversations}
          activeConv={activeConv}
          setActiveConv={setActiveConv}
          startNewConversation={startNewConversation}
          deleteConversation={deleteConversation}
          togglePin={togglePin}
          renameConversation={renameConversation}
        />
      </Sidebar>

      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        <button
          onClick={openSidebar}
          className="md:hidden absolute top-2 right-2 z-20 w-9 h-9 rounded-lg border backdrop-blur-sm"
          style={{ color: "var(--text-primary)", borderColor: "var(--border-color)", background: "var(--bg-surface)" }}
          aria-label="فتح قائمة المحادثات"
        >
          📜
        </button>
        
        <ChatPanel
          messages={messages}
          loading={loading}
          input={input}
          setInput={setInput}
          textareaRef={textareaRef}
          mediaInputRef={mediaInputRef}
          mediaFile={mediaFile}
          onKeyDown={onKeyDown}
          sendMessage={sendMessage}
          onMediaSelect={handleMediaSelect}
          onRemoveMedia={handleRemoveMedia}
          startRecording={() => {}}
          stopRecording={() => {}}
          messagesRef={messagesRef}
          endRef={endRef}
          showScrollBtn={showScrollBtn}
          handleScroll={handleScroll}
          scrollToBottom={scrollToBottom}
          models={models}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          setSelectedProvider={setSelectedProvider}
          webSearchEnabled={webSearchEnabled}
          setWebSearchEnabled={setWebSearchEnabled}
          prompts={prompts}
          selectedPrompt={selectedPrompt}
          selectPersona={setSelectedPrompt}
          mediaSupported={true}
          user={user}
          placeholder="تحدث معي في أي شيء..."
        />
      </main>
    </div>
  );
}
