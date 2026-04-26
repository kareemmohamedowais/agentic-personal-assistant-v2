// DESIGN DECISION: Glass card with 3D tilt effect, gold glow on hover, warm gradient inner highlight
export default function GlassCard({ children, className = "", onClick, hover = false }) {
  const Component = onClick ? "button" : "div";
  
  return (
    <Component
      onClick={onClick}
      className={`relative overflow-hidden glass-card p-5 ${hover ? "card-3d" : "transition-luxury hover:-translate-y-1"} ${className}`}
      style={{ textAlign: "inherit" }}
    >
      {/* Inner warm gradient highlight */}
      <div className="absolute inset-0 bg-linear-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
      {/* Bottom gold accent line on hover */}
      <div className="absolute bottom-0 left-4 right-4 h-[1px] opacity-0 transition-opacity duration-400 pointer-events-none"
        style={{ background: "linear-gradient(to right, transparent, rgba(212,168,83,0.2), transparent)" }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </Component>
  );
}
