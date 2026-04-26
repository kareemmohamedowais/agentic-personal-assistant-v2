// DESIGN DECISION: Warm glass dropdown, gold active/favorite states, refined provider badges
import { useState, useEffect, useRef, useCallback } from "react";

const BADGE_COLORS = {
  Google: "text-blue-400 bg-blue-500/10",
  Groq: "text-orange-400 bg-orange-500/10",
  OpenRouter: "text-purple-400 bg-purple-500/10",
};

const LS_KEY = "favoriteModels";

function loadFavorites() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}

function saveFavorites(favs) { localStorage.setItem(LS_KEY, JSON.stringify(favs)); }

export default function ModelSelector({ models, selectedModel, onChange, compact = false }) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ bottom: 0, left: 0 });
  const [favorites, setFavorites] = useState(loadFavorites);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleButtonClick = useCallback(() => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ bottom: window.innerHeight - rect.top + 8, left: rect.left });
    }
    setOpen((v) => !v);
  }, [open]);

  const toggleFavorite = useCallback((modelId, e) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId];
      saveFavorites(next);
      return next;
    });
  }, []);

  if (!models || models.length === 0) return null;

  const current = models.find((m) => m.id === selectedModel) || models[0];
  const isFavCurrent = favorites.includes(current.id);
  const handleSelect = (model) => { onChange({ provider: model.provider, model: model.id }); setOpen(false); };

  if (compact) {
    return (
      <div className="relative">
        <button ref={buttonRef} type="button" onClick={handleButtonClick}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-medium transition-all duration-300"
          style={{
            background: "var(--bg-surface)",
            borderColor: open ? "rgba(212,168,83,0.2)" : "var(--border-color)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-body)",
          }}
          title={current.name}
        >
          {isFavCurrent && <span className="text-[9px] leading-none" style={{ color: "var(--gold)" }}>★</span>}
          <span>{current.icon || "◈"}</span>
          <span className="max-w-[72px] truncate">{current.name}</span>
          <svg className={`w-2.5 h-2.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div ref={dropdownRef}
            style={{ position: "fixed", bottom: dropdownPos.bottom, left: dropdownPos.left, zIndex: 9999, width: 300 }}
            className="glass-luxury rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
          >
            <ModelList models={models} selectedModel={selectedModel} favorites={favorites} onSelect={handleSelect} onToggleFav={toggleFavorite} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button ref={buttonRef} type="button" onClick={handleButtonClick}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-300"
        style={{
          background: "var(--bg-surface)",
          borderColor: open ? "rgba(212,168,83,0.2)" : "var(--border-color)",
          color: "var(--text-primary)",
        }}
      >
        {isFavCurrent && <span className="text-xs leading-none" style={{ color: "var(--gold)" }}>★</span>}
        <span className="text-base">{current.icon || "◈"}</span>
        <div className="text-left">
          <div className="text-xs leading-none mb-0.5" style={{ color: "var(--text-muted)" }}>{current.badge}</div>
          <div className="leading-none truncate max-w-[160px]">{current.name}</div>
        </div>
        <svg className={`w-4 h-4 ml-1 transition-transform duration-300 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div ref={dropdownRef}
          style={{ position: "fixed", bottom: dropdownPos.bottom, left: dropdownPos.left, zIndex: 9999, width: 320 }}
          className="glass-luxury rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        >
          <ModelList models={models} selectedModel={selectedModel} favorites={favorites} onSelect={handleSelect} onToggleFav={toggleFavorite} />
        </div>
      )}
    </div>
  );
}

function ModelList({ models, selectedModel, favorites, onSelect, onToggleFav }) {
  const favModels = models.filter((m) => favorites.includes(m.id));
  const restModels = models.filter((m) => !favorites.includes(m.id));

  return (
    <div className="max-h-96 overflow-y-auto sidebar-scroll py-1">
      {favModels.length > 0 && (
        <>
          <div className="px-3 py-1.5 border-b flex items-center gap-1.5" style={{ borderColor: "var(--border-subtle)" }}>
            <span className="text-xs" style={{ color: "var(--gold)" }}>★</span>
            <span className="text-xs font-medium" style={{ color: "var(--gold)" }}>المفضلة</span>
          </div>
          {favModels.map((m) => (
            <ModelRow key={m.id} model={m} isActive={m.id === selectedModel} isFav onSelect={onSelect} onToggleFav={onToggleFav} />
          ))}
          <div className="my-1" style={{ borderBottom: "1px solid var(--border-subtle)" }} />
        </>
      )}
      <div className="px-3 py-1.5">
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          {favModels.length > 0 ? "الكل" : `اختر الموديل (${models.length})`}
        </span>
      </div>
      {restModels.map((m) => (
        <ModelRow key={m.id} model={m} isActive={m.id === selectedModel} isFav={false} onSelect={onSelect} onToggleFav={onToggleFav} />
      ))}
    </div>
  );
}

function ModelRow({ model: m, isActive, isFav, onSelect, onToggleFav }) {
  const badgeColor = BADGE_COLORS[m.badge] || "text-slate-400 bg-slate-500/10";
  return (
    <button type="button" onClick={() => onSelect(m)}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200"
      style={{
        background: isActive ? "rgba(212,168,83,0.08)" : "transparent",
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(212,168,83,0.04)"; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      <span className="text-base shrink-0">{m.icon || "◈"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-body)" }}>{m.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${badgeColor}`}>{m.badge}</span>
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{m.description}</div>
      </div>
      <button type="button" onClick={(e) => onToggleFav(m.id, e)} title={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors duration-200"
        style={{ color: isFav ? "var(--gold)" : "var(--text-muted)" }}
        onMouseEnter={(e) => e.currentTarget.style.color = "var(--gold)"}
        onMouseLeave={(e) => e.currentTarget.style.color = isFav ? "var(--gold)" : "var(--text-muted)"}
      >{isFav ? "★" : "☆"}</button>
      {isActive && (
        <svg className="w-4 h-4 shrink-0" style={{ color: "var(--gold)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}
