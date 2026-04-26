// DESIGN DECISION: Premium message bubbles with staggered motion entry, Lucide icons, and refined micro-interactions.
import { lazy, memo, Suspense, useState } from "react";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  User, 
  AlertCircle, 
  Copy, 
  Check, 
  Zap,
  Clock,
} from "lucide-react";
import ErrorBubble from "./ErrorBubble";

const MarkdownMessageContent = lazy(() => import("./MarkdownMessageContent"));

function formatTime(timestamp) {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function ChatMedia({ mediaType, mediaUrl }) {
  if (!mediaUrl) return null;
  if (mediaType === "image") {
    return (
      <motion.a 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        href={mediaUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="block mb-3"
      >
        <img
          src={mediaUrl}
          alt="مرفق"
          className="max-w-[100%] sm:max-w-72 max-h-72 rounded-2xl object-cover cursor-pointer hover:opacity-95 transition-all shadow-xl hover:shadow-indigo-500/10 border border-white/5"
        />
      </motion.a>
    );
  }
  return (
    <div className="mb-3">
      <audio controls src={mediaUrl} className="max-w-60 h-10 custom-audio" />
    </div>
  );
}

const messageVariants = {
  initial: { opacity: 0, y: 15, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

function ChatMessage({ m, persona, user, animateEntry = false }) {
  const [copied, setCopied] = useState(false);
  const animationProps = animateEntry
    ? { variants: messageVariants, initial: "initial", animate: "animate" }
    : {};

  const handleCopy = () => {
    navigator.clipboard.writeText(m.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // System messages
  if (m.role === "system") {
    return (
      <motion.div 
        {...animationProps}
        className="flex justify-center my-6"
      >
        <span className="text-[10px] sm:text-xs px-5 py-2 rounded-full border glass font-bold shadow-xl shadow-black/20"
          style={{ background: "rgba(212,168,83,0.06)", color: "var(--gold)", borderColor: "rgba(212,168,83,0.12)" }}>
          {m.text}
        </span>
      </motion.div>
    );
  }

  // Error messages
  if (m.role === "error") {
    return (
      <motion.div 
        {...animationProps}
        className="flex items-start gap-2.5 my-3 w-full" 
        style={{ direction: "rtl" }}
      >
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border"
          style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--accent-danger)" }}>
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 max-w-[90%]">
           <ErrorBubble error={m.error} />
        </div>
      </motion.div>
    );
  }

  // AI messages
  if (m.role === "ai") {
    return (
      <motion.div 
        {...animationProps}
        className="flex items-start gap-2.5 my-3 w-full group" 
        style={{ direction: "rtl" }}
      >
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-xl border relative z-10"
          style={{ 
            background: m.fallback ? "var(--bg-surface-solid)" : "var(--gradient-primary)",
            borderColor: m.fallback ? "var(--border-color)" : "transparent",
            color: m.fallback ? "var(--text-primary)" : "#0a0a0a",
          }}>
          {m.fallback ? <AlertCircle className="w-5 h-5" /> : persona?.icon ? <span className="text-sm">{persona.icon}</span> : <Sparkles className="w-5 h-5" />}
        </div>
        
        <div className="max-w-[76%] md:max-w-[66%] min-w-0 flex flex-col items-start gap-1">
          {m.streaming && !m.text ? (
            <div className="glass-luxury rounded-3xl rounded-tr-sm px-4 py-2.5 flex items-center w-full gap-2.5 shadow-xl border border-white/5">
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.span 
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    className="w-2 h-2 rounded-full" 
                    style={{ background: "var(--gold)" }} 
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className={`rounded-3xl max-w-full rounded-tr-sm px-3.5 py-2.5 text-[13px] leading-relaxed shadow-xl border transition-all duration-500 overflow-hidden relative ${m.fallback ? "border-r-4" : "border-white/5"}`}
                 style={{ 
                   background: "var(--bg-surface-solid)", 
                   borderColor: m.fallback ? "transparent" : "var(--border-color)",
                   borderRightColor: m.fallback ? "var(--accent-warning)" : undefined,
                   color: "var(--text-primary)",
                 }}>
              
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -z-10 pointer-events-none" />

              {m.fallback && (
                <div className="text-[10px] mb-2 px-2.5 py-1 rounded-full flex w-max items-center gap-1.5 font-bold shadow-sm"
                     style={{ background: "rgba(251,191,36,0.1)", color: "var(--accent-warning)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <Zap className="w-3 h-3" />
                  <span>استجابة احتياطية ({m.usedModel || "نموذج بديل"})</span>
                </div>
              )}

              {m.mediaType && m.mediaUrl && <ChatMedia mediaType={m.mediaType} mediaUrl={m.mediaUrl} />}

              {/* Markdown Content */}
              <Suspense
                fallback={
                  <div className="whitespace-pre-wrap leading-relaxed" style={{ direction: "rtl", textAlign: "right" }}>
                    {m.text}
                  </div>
                }
              >
                <MarkdownMessageContent text={m.text} />
              </Suspense>
            </div>
          )}
          
          <div className="flex items-center gap-4 mt-2 pr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            {m.ts && (
              <span className="text-[10px] flex items-center gap-1 opacity-50" style={{ color: "var(--text-muted)" }}>
                <Clock className="w-3 h-3" />
                {formatTime(m.ts)}
              </span>
            )}
            
            {m.text && !m.streaming && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleCopy}
                className="text-[10px] flex items-center gap-1.5 transition-all font-bold px-2 py-1 rounded-lg hover:bg-white/5"
                style={{ color: copied ? "var(--teal)" : "var(--text-secondary)" }}
                title="نسخ الرسالة"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "تم النسخ" : "نسخ"}</span>
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // User messages
  return (
    <motion.div 
      {...animationProps}
        className="flex items-end justify-end gap-2.5 my-3 w-full group" 
      style={{ direction: "rtl" }}
    >
      <div className="max-w-[76%] md:max-w-[66%] min-w-0 flex flex-col items-end gap-1">
        <div className="rounded-[2rem] max-w-full rounded-bl-sm px-4 py-2.5 text-[13px] leading-relaxed shadow-2xl relative overflow-hidden text-right border border-white/10"
             style={{ 
               background: "var(--gradient-primary)", 
               color: "#0a0a0a", 
               boxShadow: "0 10px 40px -10px rgba(212,168,83,0.3)"
             }}>
          
          <div className="absolute top-0 left-0 w-24 h-24 bg-white/10 blur-2xl -z-10" />
          
          {m.mediaType && m.mediaUrl && <ChatMedia mediaType={m.mediaType} mediaUrl={m.mediaUrl} />}
          
          {m.text && <div className="whitespace-pre-wrap font-medium">{m.text}</div>}
        </div>
        
        {m.ts && (
          <div className="text-[10px] flex items-center gap-1 mt-1 pl-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ color: "var(--text-muted)" }}>
            <Clock className="w-3 h-3" />
            {formatTime(m.ts)}
          </div>
        )}
      </div>
      
      <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 mb-8 shadow-xl border relative"
           style={{ background: "rgba(212,168,83,0.05)", color: "var(--gold)", borderColor: "rgba(212,168,83,0.2)", fontFamily: "var(--font-display)" }}>
        <User className="w-5 h-5" />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[var(--accent-success)] border-2 border-[#0a0a0a]" />
      </div>
    </motion.div>
  );
}

function areEqual(prevProps, nextProps) {
  return (
    prevProps.m === nextProps.m &&
    prevProps.persona === nextProps.persona &&
    prevProps.user === nextProps.user &&
    prevProps.animateEntry === nextProps.animateEntry
  );
}

export default memo(ChatMessage, areEqual);
