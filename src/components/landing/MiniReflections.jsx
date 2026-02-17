import { F, C } from "./theme";

const THEMES = [
  { theme: "Career transitions", count: 12, trend: "↑" },
  { theme: "Self-doubt", count: 8, trend: "↓" },
  { theme: "Friendship & support", count: 7, trend: "→" },
  { theme: "Creative ambition", count: 5, trend: "↑" },
];

const CONNECTIONS = [
  "You mention Marina in 8 entries, always when something in your own life is shifting.",
  "Your most productive writing happens between 10 PM and 1 AM.",
];

const MOOD_BARS = [32, 48, 20, 65, 45, 55, 38];
const MOOD_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function MiniMoodChart() {
  return (
    <div>
      <div style={{ fontFamily: F.sans, fontSize: 8, fontWeight: 600, color: C.ink, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Mood Index</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
        {MOOD_BARS.map((h, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ width: "100%", height: h, backgroundColor: C.accent, opacity: 0.3 + (h / 100) * 0.7, transition: "height 0.4s ease" }} />
            <span style={{ fontFamily: F.sans, fontSize: 7, color: C.inkFaint }}>{MOOD_LABELS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MiniThemes() {
  return (
    <div>
      <div style={{ fontFamily: F.sans, fontSize: 8, fontWeight: 600, color: C.ink, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Recurring Themes</div>
      {THEMES.map((t, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: i < THEMES.length - 1 ? `1px solid ${C.rule}` : "none" }}>
          <span style={{ fontFamily: F.body, fontSize: 10, color: C.inkLight }}>{t.theme}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint }}>{t.count}</span>
            <span style={{ fontFamily: F.mono, fontSize: 9, color: t.trend === "↑" ? C.accent : C.inkFaint }}>{t.trend}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MiniConnections() {
  return (
    <div>
      <div style={{ fontFamily: F.sans, fontSize: 8, fontWeight: 600, color: C.ink, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Connections</div>
      {CONNECTIONS.map((c, i) => (
        <div key={i} style={{ marginBottom: 8, fontFamily: F.body, fontSize: 10, lineHeight: 1.5, color: C.inkLight }}>
          <span style={{ color: C.accent, marginRight: 4 }}>✦</span>{c}
        </div>
      ))}
    </div>
  );
}

export default function MiniReflections() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
      <MiniMoodChart />
      <MiniThemes />
      <MiniConnections />
    </div>
  );
}
