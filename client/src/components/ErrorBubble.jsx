export default function ErrorBubble({ error }) {
  const message =
    typeof error === "string"
      ? error
      : error?.message || "حدث خطأ غير متوقع";

  return (
    <div
      className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed max-w-[85%] md:max-w-[75%] shadow-sm"
      style={{
        background: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(239, 68, 68, 0.25)",
        color: "var(--text-primary)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <svg
          className="w-4 h-4 shrink-0"
          style={{ color: "#ef4444" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span
          className="font-semibold text-xs"
          style={{ color: "#ef4444" }}
        >
          خطأ
        </span>
      </div>
      <p className="whitespace-pre-wrap" style={{ direction: "rtl" }}>
        {message}
      </p>
    </div>
  );
}
