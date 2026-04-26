// DESIGN DECISION: Gold focus ring, warm placeholder, refined search icon
export default function SearchBar({ value, onChange, placeholder = "بحث...", autoFocus = false }) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full text-xs py-2.5 pr-9 pl-3 rounded-xl input-luxury"
        style={{ fontFamily: "var(--font-body)" }}
      />
      <svg className="w-4 h-4 absolute right-3 top-2.5 transition-colors duration-200"
        style={{ color: "var(--text-muted)" }}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  );
}
