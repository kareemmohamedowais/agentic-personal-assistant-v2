// DESIGN DECISION: Sora display font for titles, gold icon container, gradient separator
export default function PageHeader({ title, description, icon, actions, stats, compact = false }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b animate-fade-in px-4 py-2.5 md:px-5 md:py-3 shrink-0 relative z-10"
      style={{
        background: "var(--gradient-surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="flex items-center gap-3 w-full md:w-auto overflow-hidden">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl text-base md:text-lg flex items-center justify-center shrink-0 shadow-sm"
          style={{ 
            background: "var(--gradient-primary)", 
            color: "#ffffff",
          }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold truncate" title={title} style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              {title}
            </h1>
            {stats && (
              <div className="hidden md:flex items-center gap-1.5 ms-2 border-r border-white/5 pr-2">
                {stats.map((stat, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md"
                    style={{ background: "rgba(59,130,246,0.09)", border: "1px solid rgba(59,130,246,0.2)" }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>{stat.label}</span>
                    <span style={{ color: "var(--gold)", fontFamily: "var(--font-display)", fontWeight: "700" }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {description && !compact && (
            <p className="text-sm truncate mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              {description}
            </p>
          )}
        </div>
      </div>
      
      {actions && (
        <div className="flex items-center gap-2 self-stretch md:self-auto min-w-max mt-2 md:mt-0">
          {actions}
        </div>
      )}
      
      {/* Bottom subtle glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(59,130,246,0.2), transparent)" }} />
    </div>
  );
}
