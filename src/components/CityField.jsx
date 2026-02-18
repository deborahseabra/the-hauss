import { useState, useRef, useEffect } from "react";

/**
 * City input with Photon API autocomplete (same style as location picker in EditorView).
 */
export default function CityField({ value, onChange, placeholder, label, required, style, labelStyle, inputStyle, colors }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleSearch = (query) => {
    onChange(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        const items = (data.features || []).map((f) => {
          const p = f.properties;
          return [p.name, p.city || p.town || p.village, p.state, p.country].filter(Boolean).join(", ");
        });
        setSuggestions([...new Set(items)]);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  const selectSuggestion = (s) => {
    onChange(s);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const F = { sans: "'IBM Plex Sans', -apple-system, sans-serif", body: "'Source Serif 4', Georgia, serif" };
  const defaultC = { ink: "#121212", inkMuted: "#727272", rule: "#e2e2e2", bg: "#fff", sectionBg: "#f7f7f7" };
  const C = { ...defaultC, ...colors };

  return (
    <div style={{ marginBottom: 18, ...style }} ref={containerRef}>
      {label && (
        <label style={{
          fontFamily: F.sans, fontSize: 10, fontWeight: 600,
          color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px",
          display: "block", marginBottom: 6,
          ...labelStyle,
        }}>{label}{required ? " *" : ""}</label>
      )}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={value}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder || "Search for your city..."}
          required={required}
          style={{
            width: "100%", padding: "11px 14px",
            fontFamily: F.body, fontSize: 14, color: C.ink,
            backgroundColor: C.bg, border: `1px solid ${C.rule}`,
            outline: "none", transition: "border-color 0.2s",
            ...inputStyle,
          }}
          onFocus={(e) => { e.target.style.borderColor = C.ink; setShowSuggestions(suggestions.length > 0); }}
          onBlur={(e) => { e.target.style.borderColor = C.rule; }}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: "absolute", left: 0, right: 0, top: "100%", zIndex: 20,
            backgroundColor: C.bg, border: `1px solid ${C.rule}`, borderTop: "none",
            maxHeight: 160, overflowY: "auto",
          }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectSuggestion(s)}
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: F.sans, fontSize: 13, color: C.ink,
                  borderBottom: i < suggestions.length - 1 ? `1px solid ${C.rule}` : "none",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.sectionBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
