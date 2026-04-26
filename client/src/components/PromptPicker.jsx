import { useState } from "react";

export default function PromptPicker({ prompts = [], selected, onSelect, loading }) {
  const [hoveredId, setHoveredId] = useState(null);

  if (loading || prompts.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[9px] uppercase tracking-wider font-semibold shrink-0 ml-1 hidden sm:inline" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
        شخصية:
      </span>
      {prompts.map((p) => {
        const isActive = p.id === selected;
        const isHovered = hoveredId === p.id;
        
        return (
          <div key={p.id} className="relative">
            <button
              onClick={() => onSelect?.(p.id)}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition-all duration-300 border"
              style={{
                background: isActive ? "var(--bg-elevated)" : "var(--bg-surface)",
                borderColor: isActive ? "var(--gold)" : "var(--border-color)",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                boxShadow: isActive ? "0 4px 12px rgba(212,168,83,0.15)" : "none",
                transform: isActive ? "scale(1.02)" : "scale(1)",
                fontFamily: "var(--font-body)",
                fontWeight: isActive ? 600 : 500,
              }}
            >
              <span className="text-[10px] leading-none drop-shadow-sm">{p.icon}</span>
              <span>{p.name}</span>
              {isActive && (
                <svg className="w-2.5 h-2.5 ml-0.5" style={{ color: "var(--gold)" }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
              )}
            </button>

            {/* PremiumTooltip */}
            {isHovered && p.description && (
              <div 
                className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 z-50 rounded-xl px-3 py-2 text-xs whitespace-nowrap shadow-2xl pointer-events-none animate-reveal-up glass-luxury"
                style={{
                  color: "var(--text-primary)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {p.description}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 -mt-[1px] rotate-45 border-r border-b" 
                     style={{ background: "var(--bg-surface-solid)", borderColor: "var(--border-subtle)" }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
