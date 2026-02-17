import { F, C } from "./theme";

const STATS = [
  "12,000+ entries written this week",
  "Writers in 40+ countries",
  "End-to-end encrypted",
];

export default function SocialProof() {
  return (
    <section style={{ borderTop: `1px solid ${C.rule}`, borderBottom: `1px solid ${C.rule}` }}>
      <div style={{
        maxWidth: 1080, margin: "0 auto", padding: "24px",
        display: "flex", justifyContent: "center", alignItems: "center",
      }}>
        {STATS.map((stat, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && (
              <div className="landing-social-divider" style={{ width: 1, height: 20, backgroundColor: C.rule, margin: "0 32px" }} />
            )}
            <span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 400, color: C.inkMuted }}>
              {stat}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
