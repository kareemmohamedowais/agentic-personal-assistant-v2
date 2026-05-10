// DESIGN DECISION: Premium input field with glow-focus, Lucide icons, and motion-enhanced previews.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  Mic,
  SendHorizontal,
  Sparkles,
  Globe,
  Trash2,
  X,
  StopCircle,
  Clock
} from "lucide-react";
import ModelSelector from "./ModelSelector";
import PromptPicker from "./PromptPicker";

export default function ChatComposer({
  input,
  setInput,
  loading,
  isRecording,
  recordingTime,
  mediaFile,
  mediaInputRef,
  textareaRef,
  onKeyDown,
  sendMessage,
  onMediaSelect,
  onRemoveMedia,
  startRecording,
  stopRecording,
  models,
  selectedModel,
  setSelectedProvider,
  setSelectedModel,
  webSearchEnabled,
  setWebSearchEnabled,
  isOptimizing,
  handleOptimize,
  prompts,
  selectedPrompt,
  selectPersona,
  promptsLoading,
  placeholder = "اكتب رسالتك هنا...",
  showWebSearch = true,
  mediaSupported = true,
  showPromptPicker = true,
  composerDisabled = false,
}) {

  useEffect(() => {
    if (textareaRef?.current) {
      textareaRef.current.style.height = "30px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 88)}px`;
    }
  }, [input, textareaRef]);

  const formatRecordingTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="shrink-0 pt-1 w-full">
      {/* Media preview */}
      <AnimatePresence>
        {mediaFile && mediaSupported && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: 10 }}
            className="mb-3"
          >
            <MediaPreview file={mediaFile} onRemove={onRemoveMedia} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persona Picker */}
      {showPromptPicker && prompts?.length > 0 && (
        <div className="mb-1.5 px-1">
          <PromptPicker
            prompts={prompts}
            selected={selectedPrompt}
            onSelect={selectPersona}
            loading={promptsLoading}
          />
        </div>
      )}

      <div className="rounded-3xl overflow-hidden backdrop-blur-2xl transition-all duration-500 hover:shadow-indigo-500/10 focus-within:shadow-indigo-500/20 focus-within:ring-1 focus-within:ring-indigo-500/50 group"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >

        {/* Controls toolbar */}
        <div className="flex flex-wrap items-center justify-between px-3 pt-2 pb-1">
          <div className="flex items-center gap-1">
            {models?.length > 0 && (
              <ModelSelector
                models={models}
                selectedModel={selectedModel}
                onChange={({ provider, model }) => { setSelectedProvider?.(provider); setSelectedModel?.(model); }}
                compact
              />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <AnimatePresence mode="popLayout">
              {showWebSearch && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setWebSearchEnabled?.((v) => !v)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all duration-300 font-semibold"
                  style={{
                    background: webSearchEnabled ? "rgba(45,212,191,0.15)" : "transparent",
                    borderColor: webSearchEnabled ? "rgba(45,212,191,0.3)" : "transparent",
                    color: webSearchEnabled ? "var(--teal)" : "var(--text-muted)",
                  }}
                >
                  <Globe className={`w-3.5 h-3.5 ${webSearchEnabled ? "animate-pulse" : ""}`} />
                  <span>بحث</span>
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleOptimize}
                disabled={!input?.trim() || isOptimizing}
                className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all duration-300 font-semibold disabled:opacity-30 relative overflow-hidden group/opt"
                style={{
                  background: isOptimizing ? "rgba(167,139,250,0.15)" : input?.trim() ? "rgba(167,139,250,0.08)" : "transparent",
                  borderColor: isOptimizing ? "rgba(167,139,250,0.3)" : input?.trim() ? "rgba(167,139,250,0.2)" : "transparent",
                  color: "var(--accent-tertiary)",
                }}
              >
                {input?.trim() && !isOptimizing && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/opt:animate-shimmer" />
                )}
                {isOptimizing ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isOptimizing ? "جاري التحسين..." : "تحسين"}</span>
              </motion.button>
            </AnimatePresence>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput?.(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={composerDisabled}
          className="w-full bg-transparent px-4 py-2 text-sm placeholder:opacity-50 resize-none focus:outline-none overflow-y-auto leading-relaxed custom-scroll"
          style={{
            direction: "rtl",
            minHeight: "44px",
            maxHeight: "160px",
            color: "var(--text-primary)",
            fontFamily: "var(--font-body)",
            transition: "height 0.2s ease-out"
          }}
        />

        <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-white/5 mt-1">
          <div className="flex items-center gap-1">

            {mediaSupported && (
              <>
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,audio/mpeg,audio/wav,audio/webm,audio/ogg"
                  className="hidden"
                  onChange={onMediaSelect}
                />

                  <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(212,168,83,0.12)" }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => mediaInputRef?.current?.click()}
                  disabled={loading || isRecording || composerDisabled}
                  className="flex items-center justify-center w-9 h-9 rounded-full disabled:opacity-20 transition-all duration-200 hover:text-amber-400"
                  style={{ color: "var(--text-secondary)" }}
                  title="إرفاق ملف"
                >
                  <Paperclip className="w-4 h-4" />
                </motion.button>

                {!isRecording ? (
                  <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: "rgba(248,113,113,0.12)" }}
                    whileTap={{ scale: 0.9 }}
                    onClick={startRecording}
                    disabled={loading || !!mediaFile || composerDisabled}
                    className="flex items-center justify-center w-9 h-9 rounded-full disabled:opacity-20 transition-all duration-200 hover:text-red-400"
                    style={{ color: "var(--text-secondary)" }}
                    title="تسجيل صوتي"
                  >
                    <Mic className="w-4 h-4" />
                  </motion.button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-semibold transition-all duration-300"
                    style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.25)", color: "var(--accent-danger)" }}
                  >
                    <StopCircle className="w-3.5 h-3.5 animate-pulse" />
                    <span className="tabular-nums">{formatRecordingTime(recordingTime)}</span>
                  </button>
                )}
              </>
            )}

            {!isRecording && (
              <span className="hidden sm:flex text-[10px] items-center gap-1 opacity-50 ml-2 font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Enter للإرسال · Shift+Enter لسطر جديد
              </span>
            )}
          </div>

          {/* Send button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={sendMessage}
            disabled={loading || composerDisabled || (!input?.trim() && !mediaFile)}
            className="flex items-center gap-2 text-sm font-bold rounded-2xl px-4 py-2 disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-indigo-500/25 bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
          >
            <SendHorizontal className="w-4 h-4 rotate-180" />
            <span>إرسال</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function MediaPreview({ file, onRemove }) {
  const isImage = file.type.startsWith("image/");
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file || !isImage) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return (
    <div className="flex items-center gap-4 p-3 rounded-2xl w-max pr-5 glass-subtle"
      style={{ border: "1px solid var(--border-color)" }}>
      {isImage && preview ? (
        <img src={preview} alt="preview" className="w-14 h-14 object-cover rounded-xl shadow-lg" />
      ) : (
        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-400">
          <Mic className="w-7 h-7" />
        </div>
      )}
      <div className="flex flex-col max-w-48 overflow-hidden">
        <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{file.name || "تسجيل صوتي"}</span>
        <span className="text-[10px] opacity-60" style={{ color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(1)} KB</span>
      </div>
      <motion.button
        whileHover={{ scale: 1.1, backgroundColor: "rgba(248,113,113,0.15)" }}
        whileTap={{ scale: 0.9 }}
        onClick={onRemove}
        className="mr-2 p-1.5 rounded-full transition-colors duration-200 text-[var(--accent-danger)]"
      >
        <X className="w-4 h-4" />
      </motion.button>
    </div>
  );
}

