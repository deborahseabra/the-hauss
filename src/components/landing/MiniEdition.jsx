import { F, C } from "./theme";

const DAYS = [
  { day: "Mon", text: "Resigned. Sky was absurdly blue." },
  { day: "Tue", text: "Called mom. She cried, then laughed." },
  { day: "Wed", text: "First morning with nowhere to be." },
  { day: "Thu", text: "Wrote 2,000 words in a café." },
  { day: "Fri", text: "Lunch with Marina. She understands." },
  { day: "Sat", text: "Golden hour from the apartment." },
  { day: "Sun", text: "Started reading again. Woolf." },
];

const MORE = [
  { section: "PERSONAL ESSAY", headline: "The Morning I Let Go", time: "4 min" },
  { section: "PHOTO ESSAY", headline: "Golden Hour From the Apartment", time: "1 min" },
  { section: "DISPATCH", headline: "Lunch with Marina at the Italian Place", time: "3 min" },
];

export default function MiniEdition({ compact }) {
  return (
    <div style={{ fontFamily: F.sans, color: C.ink }}>
      {/* Masthead */}
      <div style={{ textAlign: "center", padding: compact ? "16px 20px 12px" : "24px 28px 16px", borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ fontFamily: F.display, fontSize: compact ? 20 : 26, fontWeight: 700 }}>The Deborah Times</div>
        <div style={{ fontFamily: F.body, fontSize: compact ? 8 : 9, fontStyle: "italic", color: C.inkMuted, marginTop: 2 }}>All the life that's fit to print</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 6, fontFamily: F.sans, fontSize: compact ? 8 : 9, color: C.inkFaint }}>
          <span>Week of Feb 9–15, 2026</span>
          <span>·</span>
          <span>Vol. I · No. 47</span>
        </div>
      </div>

      {/* Top story */}
      <div style={{ padding: compact ? "14px 20px" : "20px 28px", borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ fontFamily: F.sans, fontSize: 8, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 6 }}>DISPATCH</div>
        <div style={{ fontFamily: F.display, fontSize: compact ? 16 : 20, fontWeight: 700, lineHeight: 1.2, marginBottom: 6 }}>After Three Years of Doubt, She Finally Made the Leap</div>
        <div style={{ fontFamily: F.body, fontSize: compact ? 10 : 12, fontStyle: "italic", color: C.inkLight, lineHeight: 1.5 }}>
          A reflection on leaving the comfort of corporate life to pursue something that felt terrifyingly right
        </div>
        <div style={{ fontFamily: F.sans, fontSize: 8, color: C.inkFaint, marginTop: 8 }}>7 min read · ⚡ Electric · via App</div>
      </div>

      {/* Week at a glance */}
      <div style={{ padding: compact ? "12px 20px" : "16px 28px", borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ fontFamily: F.sans, fontSize: 8, fontWeight: 600, color: C.ink, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>WEEK AT A GLANCE</div>
        {DAYS.map((d, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 3, fontFamily: F.body, fontSize: compact ? 9 : 10, color: C.inkLight, lineHeight: 1.5 }}>
            <span style={{ fontFamily: F.sans, fontSize: 8, fontWeight: 600, color: C.inkMuted, width: 24, flexShrink: 0 }}>{d.day}</span>
            <span>{d.text}</span>
          </div>
        ))}
      </div>

      {/* More stories */}
      <div style={{ padding: compact ? "12px 20px" : "16px 28px" }}>
        <div style={{ fontFamily: F.sans, fontSize: 8, fontWeight: 600, color: C.ink, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>ALSO IN THIS EDITION</div>
        {MORE.map((s, i) => (
          <div key={i} style={{ marginBottom: 10, paddingBottom: i < MORE.length - 1 ? 10 : 0, borderBottom: i < MORE.length - 1 ? `1px solid ${C.rule}` : "none" }}>
            <div style={{ fontFamily: F.sans, fontSize: 7, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1px" }}>{s.section}</div>
            <div style={{ fontFamily: F.display, fontSize: compact ? 12 : 14, fontWeight: 600, lineHeight: 1.3, marginTop: 2 }}>{s.headline}</div>
            <div style={{ fontFamily: F.sans, fontSize: 8, color: C.inkFaint, marginTop: 2 }}>{s.time} read</div>
          </div>
        ))}
      </div>
    </div>
  );
}
