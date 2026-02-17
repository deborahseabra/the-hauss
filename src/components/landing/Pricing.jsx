import { useState } from "react";
import { F, C } from "./theme";
import useInView from "./useInView";

const READER_FEATURES = [
  { text: "Unlimited entries", included: true },
  { text: "Dispatches section", included: true },
  { text: "Mood tracking", included: true },
  { text: "Weekly Edition (current week only)", included: true },
  { text: "Weekly Reflections", included: true },
  { text: "Share edition (cover view)", included: true },
  { text: "All sections", included: false },
  { text: "Hauss Editor", included: false },
  { text: "Editor's Note", included: false },
  { text: "Edition archives", included: false },
  { text: "Full Reflections", included: false },
  { text: "Ask Your Editor", included: false },
  { text: "Share with full reading", included: false },
  { text: "Dark mode & themes", included: false },
  { text: "Telegram integration", included: false },
  { text: "Export", included: false },
];

const EDITOR_FEATURES = [
  "Everything in Reader",
  "Unlimited Hauss Editor ✦",
  "3 editorial voices",
  "All 5 sections",
  "Edition archives (full history)",
  "Full Reflections (all periods)",
  "Ask Your Editor",
  "Weekly Editor's Note",
  "Share editions with full reading",
  "Dark mode + 4 color themes",
  "Telegram integration",
  "Export (PDF, Markdown)",
];

const PUBLISHER_FEATURES = [
  "Everything in Editor",
  "Custom edition periods",
  "Custom sections (create your own)",
  "Public author profile (thehauss.me/you)",
  "Priority Hauss Editor",
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const [ref, style] = useInView();
  const editorPrice = yearly ? "$5" : "$7";
  const editorPeriod = yearly ? "$60/year" : "/month";
  const publisherPrice = yearly ? "$10" : "$12";
  const publisherPeriod = yearly ? "$120/year" : "/month";

  return (
    <section id="pricing" style={{ padding: "80px 24px" }}>
      <div ref={ref} style={{ ...style, maxWidth: 1000, margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          fontFamily: F.sans, fontSize: 10, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: 2,
          color: C.accent, marginBottom: 16,
        }}>
          PRICING
        </div>

        <h2 style={{
          fontFamily: F.display, fontSize: 32, fontWeight: 700,
          color: C.ink, margin: "0 0 8px",
        }}>
          Start free. Go deeper when you're ready.
        </h2>

        <p style={{
          fontFamily: F.body, fontSize: 15, fontStyle: "italic",
          color: C.inkMuted, margin: "0 0 32px",
        }}>
          No credit card required. No trial period. Write forever, for free.
        </p>

        {/* Toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", border: `1px solid ${C.rule}` }}>
            <button
              onClick={() => setYearly(false)}
              style={{
                fontFamily: F.sans, fontSize: 12, fontWeight: 500,
                padding: "8px 20px", border: "none", cursor: "pointer",
                backgroundColor: !yearly ? C.ink : "transparent",
                color: !yearly ? C.bg : C.inkMuted,
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              style={{
                fontFamily: F.sans, fontSize: 12, fontWeight: 500,
                padding: "8px 20px", border: "none", cursor: "pointer",
                backgroundColor: yearly ? C.ink : "transparent",
                color: yearly ? C.bg : C.inkMuted,
              }}
            >
              Yearly (save 20%)
            </button>
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }} className="landing-pricing-grid">
          {/* READER */}
          <div style={{ border: `1px solid ${C.rule}`, padding: 32 }}>
            <h3 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.ink, margin: "0 0 4px" }}>Reader</h3>
            <div style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginBottom: 12 }}>Start the habit.</div>
            <div style={{ fontFamily: F.mono, fontSize: 36, fontWeight: 600, color: C.ink }}>$0</div>
            <div style={{ fontFamily: F.sans, fontSize: 12, color: C.inkFaint, marginBottom: 20 }}>forever</div>
            <div style={{ height: 1, backgroundColor: C.rule, marginBottom: 20 }} />
            {READER_FEATURES.map((f, i) => (
              <div key={i} style={{
                fontFamily: F.sans, fontSize: 13, lineHeight: 2,
                color: f.included ? C.inkLight : "#ccc",
              }}>
                {f.included ? "✓" : "✗"} {f.text}
              </div>
            ))}
            <a href="/login" style={{
              display: "block", textAlign: "center", marginTop: 24,
              fontFamily: F.sans, fontSize: 13, fontWeight: 500,
              color: C.ink, border: `1px solid ${C.ink}`,
              padding: "14px 32px", textDecoration: "none",
            }}>
              Start Writing — It's Free
            </a>
          </div>

          {/* EDITOR */}
          <div style={{ border: `2px solid ${C.ink}`, padding: 32, position: "relative" }}>
            <div style={{
              position: "absolute", top: -1, right: 24,
              fontFamily: F.sans, fontSize: 9, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: 1,
              backgroundColor: C.ink, color: C.bg,
              padding: "4px 10px",
            }}>
              MOST POPULAR
            </div>
            <h3 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.ink, margin: "0 0 4px" }}>Editor</h3>
            <div style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginBottom: 12 }}>Know yourself completely.</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: F.mono, fontSize: 36, fontWeight: 600, color: C.ink }}>{editorPrice}</span>
              <span style={{ fontFamily: F.sans, fontSize: 12, color: C.inkFaint }}>/month</span>
            </div>
            {yearly && <div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkFaint }}>{editorPeriod}</div>}
            <div style={{ marginBottom: 20 }} />
            <div style={{ height: 1, backgroundColor: C.rule, marginBottom: 20 }} />
            {EDITOR_FEATURES.map((f, i) => (
              <div key={i} style={{
                fontFamily: F.sans, fontSize: 13, lineHeight: 2,
                color: f.includes("✦") ? C.accent : C.inkLight,
                fontWeight: f.includes("✦") ? 500 : 400,
              }}>
                ✓ {f}
              </div>
            ))}
            <a href="/login" style={{
              display: "block", textAlign: "center", marginTop: 24,
              fontFamily: F.sans, fontSize: 13, fontWeight: 500,
              color: C.bg, backgroundColor: C.ink,
              padding: "14px 32px", textDecoration: "none",
            }}>
              Start Writing — It's Free
            </a>
            <div style={{
              fontFamily: F.sans, fontSize: 11, color: C.inkFaint,
              textAlign: "center", marginTop: 8,
            }}>
              Start free, upgrade anytime
            </div>
          </div>

          {/* PUBLISHER */}
          <div style={{ border: `1px solid #b8860b`, padding: 32, position: "relative" }}>
            <div style={{
              position: "absolute", top: -1, right: 24,
              fontFamily: F.sans, fontSize: 9, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: 1,
              backgroundColor: "#b8860b", color: "#fff",
              padding: "4px 10px",
            }}>
              FOR SERIOUS WRITERS
            </div>
            <h3 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.ink, margin: "0 0 4px" }}>Publisher</h3>
            <div style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginBottom: 12 }}>Your own publication.</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: F.mono, fontSize: 36, fontWeight: 600, color: C.ink }}>{publisherPrice}</span>
              <span style={{ fontFamily: F.sans, fontSize: 12, color: C.inkFaint }}>/month</span>
            </div>
            {yearly && <div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkFaint }}>{publisherPeriod}</div>}
            <div style={{ marginBottom: 20 }} />
            <div style={{ height: 1, backgroundColor: C.rule, marginBottom: 20 }} />
            {PUBLISHER_FEATURES.map((f, i) => (
              <div key={i} style={{
                fontFamily: F.sans, fontSize: 13, lineHeight: 2,
                color: C.inkLight,
              }}>
                ✓ {f}
              </div>
            ))}
            <a href="/login" style={{
              display: "block", textAlign: "center", marginTop: 24,
              fontFamily: F.sans, fontSize: 13, fontWeight: 500,
              color: "#b8860b", border: `1px solid #b8860b`,
              padding: "14px 32px", textDecoration: "none",
            }}>
              Start Writing — It's Free
            </a>
            <div style={{
              fontFamily: F.sans, fontSize: 11, color: C.inkFaint,
              textAlign: "center", marginTop: 8,
            }}>
              Start free, upgrade anytime
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
