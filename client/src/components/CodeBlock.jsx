import { lazy, Suspense, useEffect, useState } from "react";

const CodeSyntaxHighlighter = lazy(() => import("./CodeSyntaxHighlighter"));

function PreviewModal({ code, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-slate-400 text-sm font-mono mr-3">معاينة HTML</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800 text-sm flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          إغلاق
        </button>
      </div>
      {/* iframe */}
      <div className="flex-1 overflow-hidden bg-white">
        <iframe
          srcDoc={code}
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-full border-0"
          title="HTML Preview"
        />
      </div>
    </div>
  );
}

export default function CodeBlock({ node, className, children, ...props }) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";
  const code = String(children).replace(/\n$/, "");

  // Inline code: no language class and no line breaks
  const isInline = !lang && !code.includes("\n");
  if (isInline) {
    return (
      <code className="bg-slate-700/60 text-amber-300 px-1.5 py-0.5 rounded text-[0.85em] font-mono" {...props}>
        {children}
      </code>
    );
  }

  const isHtml = lang === "html";
  const lineCount = code.split(/\r?\n/).length;
  const isLongCode = lineCount > 28;
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {showPreview && isHtml && (
        <PreviewModal code={code} onClose={() => setShowPreview(false)} />
      )}
      <div className="relative group my-2 rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900">
        {/* Header bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700/50">
          <span className="text-xs text-slate-400 font-mono">{lang || "code"}</span>
          <div className="flex items-center gap-2">
            {isLongCode && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-0.5 rounded border border-slate-700 hover:border-slate-500/60"
              >
                {expanded ? "تصغير" : "توسيع"}
              </button>
            )}
            {isHtml && (
              <button
                onClick={() => setShowPreview(true)}
                className="text-xs text-slate-400 hover:text-blue-400 transition-colors px-2 py-0.5 rounded border border-slate-700 hover:border-blue-500/40 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                معاينة
              </button>
            )}
            <button
              onClick={handleCopy}
              className="text-xs text-slate-400 hover:text-green-400 transition-colors flex items-center gap-1"
            >
              {copied ? (
                <>✅ تم النسخ</>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  نسخ
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code */}
        <div
          className="overflow-auto"
          style={{ maxHeight: isLongCode && !expanded ? "17.5rem" : "none" }}
        >
          <Suspense
            fallback={
              <pre className="m-0 p-3 text-[11px] leading-relaxed overflow-x-auto text-slate-200 font-mono">
                {code}
              </pre>
            }
          >
            <CodeSyntaxHighlighter code={code} language={lang || "text"} {...props} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
