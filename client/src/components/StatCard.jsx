// DESIGN DECISION: Gold/teal gradient icon, Sora display font for value, bottom accent bar
export default function StatCard({ icon, label, value, hint, className = "" }) {
  return (
    <div
      className={`glass-card p-4 flex items-center gap-3.5 hover-lift ${className}`}
      style={{ textAlign: "inherit" }}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ 
          background: "rgba(212,168,83,0.08)", 
          border: "1px solid rgba(212,168,83,0.1)",
          boxShadow: "0 2px 8px rgba(212,168,83,0.05)",
        }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{label}</p>
        <p className="text-2xl font-bold truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{value}</p>
        {hint ? (
          <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>{hint}</p>
        ) : null}
      </div>
      {/* Bottom gold accent */}
      <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full" style={{ background: "linear-gradient(to right, var(--gold), transparent)", opacity: 0.15 }} />
    </div>
  );
}
