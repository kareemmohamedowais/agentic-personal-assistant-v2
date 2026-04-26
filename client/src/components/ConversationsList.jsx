// DESIGN DECISION: Gold gradient "new conversation" button, warm active state with gold left border
export default function ConversationsList({
  conversations,
  activeConv,
  setActiveConv,
  startNewConversation,
  deleteConversation,
  togglePin,
  renameConversation,
  onSearch,
  searchQuery
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
        <button
          onClick={startNewConversation}
          className="btn-luxury w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          محادثة جديدة
        </button>
      </div>
      
      {onSearch && (
        <div className="px-3 pb-2 shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="بحث في المحادثات..."
              value={searchQuery || ""}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full text-xs py-2 pr-8 pl-3 rounded-lg input-luxury"
            />
            <svg className="w-4 h-4 absolute right-2.5 top-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto sidebar-scroll px-2 pb-2">
        {conversations.length === 0 ? (
          <div className="text-center mt-10 opacity-40 space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center" style={{ background: "rgba(212,168,83,0.06)" }}>
              <span className="text-lg" style={{ color: "var(--gold)" }}>◈</span>
            </div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>لا توجد محادثات</p>
          </div>
        ) : (
          <div className="space-y-1 mt-1">
            {conversations.map((c) => (
              <div
                key={c.id}
                className="group relative flex flex-col gap-1 p-2.5 rounded-xl cursor-pointer transition-all duration-300 border"
                style={{
                  borderColor: activeConv?.id === c.id ? "rgba(212,168,83,0.15)" : "transparent",
                  background: activeConv?.id === c.id ? "rgba(212,168,83,0.06)" : "transparent",
                  borderLeft: activeConv?.id === c.id ? "3px solid var(--gold)" : "3px solid transparent",
                }}
                onClick={() => setActiveConv(c)}
                onMouseEnter={(e) => { if (activeConv?.id !== c.id) { e.currentTarget.style.background = "rgba(212,168,83,0.03)"; e.currentTarget.style.borderColor = "rgba(212,168,83,0.06)"; }}}
                onMouseLeave={(e) => { if (activeConv?.id !== c.id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 text-[10px]" style={{ color: c.is_pinned ? "var(--gold)" : "var(--text-muted)" }}>
                      {c.is_pinned ? "◆" : "◇"}
                    </span>
                    <span
                      className="text-xs font-medium truncate"
                      style={{ color: activeConv?.id === c.id ? "var(--text-primary)" : "var(--text-secondary)" }}
                      title={c.title}
                    >
                      {c.title || "محادثة"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePin(c.id); }}
                      className="p-1 rounded transition-colors duration-200"
                      style={{ color: c.is_pinned ? "var(--gold)" : "var(--text-muted)" }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--gold)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = c.is_pinned ? "var(--gold)" : "var(--text-muted)"}
                      title={c.is_pinned ? "إلغاء التثبيت" : "تثبيت"}
                    >
                      <svg className="w-3 h-3" fill={c.is_pinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newTitle = prompt("ادخل العنوان الجديد:", c.title || "");
                        if (newTitle !== null) renameConversation(c.id, newTitle);
                      }}
                      className="p-1 rounded transition-colors duration-200"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--teal)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                      title="إعادة تسمية"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm("هل أنت متأكد من الحذف؟")) deleteConversation(c.id); }}
                      className="p-1 rounded transition-colors duration-200"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-danger)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                      title="حذف"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
