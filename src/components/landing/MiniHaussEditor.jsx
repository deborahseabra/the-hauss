import { F, C } from "./theme";

export default function MiniHaussEditor() {
  return (
    <div style={{ backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, height: 280, padding: "16px 20px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <span style={{ color: C.accent, fontSize: 12 }}>✦</span>
        <span style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 600, color: C.ink, textTransform: "uppercase", letterSpacing: "1px" }}>Editor</span>
      </div>

      {/* Mode buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, padding: "10px", backgroundColor: C.bg, border: `1px solid ${C.rule}` }}>
          <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.ink }}>Proofread</div>
          <div style={{ fontFamily: F.body, fontSize: 8, color: C.inkMuted, marginTop: 2, lineHeight: 1.4 }}>Fix grammar, spelling, and punctuation.</div>
        </div>
        <div style={{ flex: 1, padding: "10px", backgroundColor: C.bg, border: `1px solid ${C.accent}` }}>
          <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.ink }}>✦ Rewrite</div>
          <div style={{ fontFamily: F.body, fontSize: 8, color: C.inkMuted, marginTop: 2, lineHeight: 1.4 }}>Transform into polished editorial prose.</div>
        </div>
      </div>

      {/* Tone cards */}
      <div style={{ fontFamily: F.sans, fontSize: 8, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>CHOOSE A VOICE</div>
      <div style={{ display: "flex", gap: 6 }}>
        {[
          { name: "Intimate", desc: "First-person, diary-like" },
          { name: "Literary", desc: "Third-person, New Yorker", active: true },
          { name: "Journalistic", desc: "Factual, NYT style" },
        ].map((t, i) => (
          <div key={i} style={{
            flex: 1, padding: "8px", textAlign: "center",
            border: `1px solid ${t.active ? C.ink : C.rule}`,
            backgroundColor: t.active ? C.ink : C.bg,
          }}>
            <div style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 600, color: t.active ? C.bg : C.ink }}>{t.name}</div>
            <div style={{ fontFamily: F.body, fontSize: 7, color: t.active ? "rgba(255,255,255,0.6)" : C.inkFaint, marginTop: 2 }}>{t.desc}</div>
          </div>
        ))}
      </div>

      {/* Result preview */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.rule}` }}>
        <div style={{ fontFamily: F.display, fontSize: 12, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>After Three Years of Doubt, She Finally Made the Leap</div>
        <div style={{ fontFamily: F.body, fontSize: 9, fontStyle: "italic", color: C.inkMuted, marginTop: 3 }}>A reflection on leaving the comfort of corporate life...</div>
      </div>
    </div>
  );
}
