import { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  Sparkles, 
  ArrowDownCircle, 
  GitBranch,
  FileText,
  Search
} from "lucide-react";
import ChatMessage from "./ChatMessage";
import ChatComposer from "./ChatComposer";

export default function ChatPanel({
  user,
  messages = [],
  loading,
  input,
  setInput,
  isRecording,
  recordingTime,
  mediaFile,
  mediaInputRef,
  textareaRef,
  messagesRef,
  endRef,
  showScrollBtn,
  handleScroll,
  scrollToBottom,
  onKeyDown,
  sendMessage,
  onMediaSelect,
  onRemoveMedia,
  startRecording,
  stopRecording,
  models = [],
  selectedModel,
  setSelectedProvider,
  setSelectedModel,
  webSearchEnabled,
  setWebSearchEnabled,
  isOptimizing,
  handleOptimize,
  prompts = [],
  selectedPrompt,
  selectPersona,
  promptsLoading,
  showWebSearchToggle = true,
  mediaSupported = true,
  showPromptPicker = true,
  composerDisabled = false,
  placeholder = "اكتب رسالتك هنا...",
  welcomeTitle = "ابدأ المحادثة الاستثنائية",
  welcomeDesc = "استكشف إمكانيات الذكاء الاصطناعي في المحادثة والبحث الذكي",
  welcomeIcon = <MessageSquare className="w-8 h-8 text-indigo-400" />
}) {

  const { token } = useAuth();
  const [internalIsOptimizing, setInternalIsOptimizing] = useState(false);
  const finalIsOptimizing = isOptimizing !== undefined ? isOptimizing : internalIsOptimizing;

  const finalHandleOptimize = handleOptimize || (async () => {
    if (!input?.trim() || finalIsOptimizing) return;
    setInternalIsOptimizing(true);
    try {
      const res = await fetch("/api/optimize-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: input })
      });
      const data = await res.json();
      if (data.ok && data.optimized) {
        setInput(data.optimized);
      }
    } catch (err) {
      console.error("Optimize error:", err);
    } finally {
      setInternalIsOptimizing(false);
    }
  });

  const starterPrompts = [
    { title: "تحليل كود", desc: "افهم البنية البرمجية لأي مشروع", icon: <GitBranch className="w-4 h-4" /> },
    { title: "تلخيص ملفات", desc: "احصل على النقاط الرئيسية بسرعة", icon: <FileText className="w-4 h-4" /> },
    { title: "بحث متقدم", desc: "ابحث في الويب والمستندات بدقة", icon: <Search className="w-4 h-4" /> },
  ];

  const handleStarterClick = (title) => {
    setInput(title);
    // focus textarea if Ref exists
    textareaRef.current?.focus();
  };

  const MAX_RENDERED_MESSAGES = 120;
  const visibleMessages = useMemo(
    () => (messages.length > MAX_RENDERED_MESSAGES ? messages.slice(-MAX_RENDERED_MESSAGES) : messages),
    [messages]
  );
  const hiddenMessagesCount = Math.max(0, messages.length - visibleMessages.length);

  const personaById = useMemo(() => {
    const map = new Map();
    for (const prompt of prompts) {
      map.set(prompt.id, prompt);
    }
    return map;
  }, [prompts]);

  const selectedPersona = selectedPrompt != null ? personaById.get(selectedPrompt) ?? null : null;

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full relative">
      
      {/* Messages Area */}
      <div 
        ref={messagesRef} 
        onScroll={handleScroll} 
        className="flex-1 overflow-y-auto custom-scroll px-3 md:px-6 pb-2 pt-3 space-y-3 w-full"
      >
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div 
              key="welcome"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              className="flex flex-col items-center justify-center h-full text-center select-none py-4"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl border"
                   style={{ background: "var(--bg-elevated)", borderColor: "var(--border-color)" }}>
                <div className="animate-pulse-glow rounded-2xl w-full h-full flex items-center justify-center">
                  {welcomeIcon}
                </div>
              </div>
              
              <h3 className="text-2xl font-extrabold mb-2 gradient-text" style={{ fontFamily: "var(--font-display)" }}>
                {welcomeTitle}
              </h3>
              <p className="text-xs max-w-sm mb-6 leading-relaxed opacity-60" style={{ fontFamily: "var(--font-body)" }}>
                {welcomeDesc}
              </p>

              {/* Starter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl px-4">
                {starterPrompts.map((p, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ y: -5, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleStarterClick(p.title)}
                    className="glass-card p-5 text-right flex flex-col gap-3 group transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                      {p.icon || <Sparkles className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">{p.title}</h4>
                      <p className="text-[11px] text-[var(--text-muted)] leading-normal">{p.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Messages List Area */}
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
          {hiddenMessagesCount > 0 && (
            <div className="text-[10px] sm:text-xs mb-2 px-3 py-1 rounded-full border"
                 style={{ color: "var(--text-muted)", borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}>
              يتم عرض آخر {visibleMessages.length} رسالة لتحسين الأداء ({hiddenMessagesCount} أقدم مخفية)
            </div>
          )}

          {visibleMessages.map((m, i) => (
            <ChatMessage 
              key={m.id || m.ts || `msg-${i}`} 
              m={m} 
              persona={selectedPersona}
              user={user}
              animateEntry={i >= visibleMessages.length - 2}
            />
          ))}

          {loading && messages[messages.length - 1]?.role !== "ai" && (
            <div className="w-full animate-stagger-entry">
               <ChatMessage 
                m={{ role: "ai", text: "", streaming: true }}
                persona={selectedPersona}
                user={user}
                animateEntry
              />
            </div>
          )}

          <div ref={endRef} className="h-6" />
        </div>
      </div>

      {/* Composer Area */}
      <div className="shrink-0 px-3 md:px-6 pb-3 w-full max-w-4xl mx-auto">
        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex justify-center -mt-8 mb-6 z-10"
            >
              <button
                onClick={scrollToBottom}
                className="flex items-center gap-2 text-xs px-5 py-2.5 rounded-full shadow-2xl transition-all border glass hover:scale-105 active:scale-95 group"
                style={{ 
                  color: "var(--text-primary)",
                  borderColor: "var(--border-color)",
                }}
              >
                <ArrowDownCircle className="w-4 h-4 text-indigo-400 group-hover:animate-bounce" />
                <span className="font-bold">رسائل جديدة</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <ChatComposer
          input={input}
          setInput={setInput}
          loading={loading}
          isRecording={isRecording}
          recordingTime={recordingTime}
          mediaFile={mediaFile}
          mediaInputRef={mediaInputRef}
          textareaRef={textareaRef}
          onKeyDown={onKeyDown}
          sendMessage={sendMessage}
          onMediaSelect={onMediaSelect}
          onRemoveMedia={onRemoveMedia}
          startRecording={startRecording}
          stopRecording={stopRecording}
          models={models}
          selectedModel={selectedModel}
          setSelectedProvider={setSelectedProvider}
          setSelectedModel={setSelectedModel}
          webSearchEnabled={webSearchEnabled}
          setWebSearchEnabled={setWebSearchEnabled}
          isOptimizing={finalIsOptimizing}
          handleOptimize={finalHandleOptimize}
          prompts={prompts}
          selectedPrompt={selectedPrompt}
          selectPersona={selectPersona}
          promptsLoading={promptsLoading}
          placeholder={placeholder}
          showWebSearch={showWebSearchToggle}
          mediaSupported={mediaSupported}
          showPromptPicker={showPromptPicker}
          composerDisabled={composerDisabled}
        />
      </div>
    </div>
  );
}
