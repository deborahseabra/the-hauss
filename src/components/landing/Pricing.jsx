import { useState } from "react";
import { F, C } from "./theme";
import useInView from "./useInView";

const FREE_FEATURES = [
  { text: "Unlimited entries", included: true },
  { text: "Dispatches section", included: true },
  { text: "Mood tracking", included: true },
  { text: "Weekly Edition (basic)", included: true },
  { text: "Weekly Reflections", included: true },
  { text: "Hauss Editor", included: false },
  { text: "All sections", included: false },
  { text: "Ask Your Editor", included: false },
  { text: "Dark mode & themes", included: false },
  { text: "Public entries", included: false },
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited Hauss Editor",
  "3 editorial voices",
  "All 5 sections",
  "Full Reflections (all periods)",
  "Ask Your Editor",
  "Weekly Editor's Note",
  "Dark mode + 4 color themes",
  "Public entries + profile page",
  "Telegram bot integration",
  "Export (PDF, Markdown)",
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const [ref, style] = useInView();
  const price = yearly ? "$7" : "$9";
  const period = yearly ? "$84/year" : "/month";

  return (
    <section id="pricing" style={{ padding: "80px 24px" }}>
      <div ref={ref} style={{ ...style, maxWidth: 780, margin: "0 auto" }}>
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
              Yearly (save 22%)
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="landing-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* FREE */}
          <div style={{ border: `1px solid ${C.rule}`, padding: 32 }}>
            <h3 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.ink, margin: "0 0 8px" }}>Free</h3>
            <div style={{ fontFamily: F.mono, fontSize: 36, fontWeight: 600, color: C.ink }}>$0</div>
            <div style={{ fontFamily: F.sans, fontSize: 12, color: C.inkFaint, marginBottom: 20 }}>forever</div>
            <div style={{ height: 1, backgroundColor: C.rule, marginBottom: 20 }} />
            {FREE_FEATURES.map((f, i) => (
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

          {/* PRO */}
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
            <h3 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.ink, margin: "0 0 8px" }}>Pro</h3>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: F.mono, fontSize: 36, fontWeight: 600, color: C.ink }}>{price}</span>
              <span style={{ fontFamily: F.sans, fontSize: 12, color: C.inkFaint }}>/month</span>
            </div>
            {yearly && <div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkFaint }}>$84/year</div>}
            <div style={{ marginBottom: 20 }} />
            <div style={{ height: 1, backgroundColor: C.rule, marginBottom: 20 }} />
            {PRO_FEATURES.map((f, i) => (
              <div key={i} style={{
                fontFamily: F.sans, fontSize: 13, lineHeight: 2,
                color: i === 1 ? C.accent : C.inkLight,
                fontWeight: i === 1 ? 500 : 400,
              }}>
                ✓ {f}{i === 1 && " ✦"}
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
        </div>

        {/* Note */}
        <div style={{
          fontFamily: F.sans, fontSize: 12, fontStyle: "italic",
          color: C.inkFaint, textAlign: "center", marginTop: 32,
        }}>
          Premium plan with higher editor limits — coming soon.
        </div>
      </div>
    </section>
  );
}
