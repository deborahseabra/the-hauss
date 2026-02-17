import { F, C } from "./theme";

const MOODS = [
  { emoji: "☀️", label: "Bright" },
  { emoji: "🌤", label: "Calm" },
  { emoji: "🌧", label: "Heavy" },
  { emoji: "⚡", label: "Electric", active: true },
  { emoji: "🌙", label: "Reflective" },
];

export default function MiniEditor() {
  return (
    <div style={{ backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, height: 280, display: "flex", overflow: "hidden" }}>
      {/* Main editor area */}
      <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 8, opacity: 0.5 }}>
          Headline
        </div>
        <div style={{ flex: 1, fontFamily: F.body, fontSize: 12, lineHeight: 1.7, color: C.inkLight }}>
          <span style={{ color: C.ink }}>so i finally quit my job today.</span> not in a dramatic way — no speech, no scene. just walked into marcos's office and said the words i'd been rehearsing for three years.
          <br /><br />
          the sky over paulista was absurdly blue when i walked out. the kind of blue that feels like the universe is showing off...
        </div>
        <div style={{ fontFamily: F.sans, fontSize: 9, color: C.inkFaint, borderTop: `1px solid ${C.rule}`, paddingTop: 8, marginTop: 8 }}>
          147 words
        </div>
      </div>

      {/* Mini sidebar */}
      <div style={{ width: 120, borderLeft: `1px solid ${C.rule}`, padding: "12px 10px", backgroundColor: C.bg }}>
        <div style={{ fontFamily: F.sans, fontSize: 8, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>MOOD</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
          {MOODS.map((m, i) => (
            <div key={i} style={{
              padding: "3px 6px", fontSize: 9, fontFamily: F.sans,
              border: `1px solid ${m.active ? C.ink : C.rule}`,
              backgroundColor: m.active ? C.ink : "transparent",
              color: m.active ? C.bg : C.inkMuted,
              textAlign: "center",
            }}>
              {m.emoji}
            </div>
          ))}
        </div>
        <div style={{ fontFamily: F.sans, fontSize: 8, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>SECTION</div>
        <div style={{ fontFamily: F.sans, fontSize: 9, color: C.ink, padding: "4px 6px", border: `1px solid ${C.rule}`, marginBottom: 14 }}>Dispatch</div>
        <div style={{ fontFamily: F.sans, fontSize: 8, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>ATTACH</div>
        {["📷 Photo", "📍 Location", "🔗 Link"].map((a, i) => (
          <div key={i} style={{ fontFamily: F.sans, fontSize: 9, color: C.inkMuted, padding: "3px 6px", border: `1px solid ${C.rule}`, marginBottom: 3, cursor: "default" }}>{a}</div>
        ))}
      </div>
    </div>
  );
}
