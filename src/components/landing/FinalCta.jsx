import { F, C } from "./theme";
import useInView from "./useInView";

export default function FinalCta() {
  const [ref, style] = useInView();

  return (
    <section style={{ padding: "100px 24px", textAlign: "center" }}>
      <div ref={ref} style={{ ...style, maxWidth: 580, margin: "0 auto" }}>
        {/* Decorative star */}
        <div style={{ fontSize: 28, color: C.accent, marginBottom: 20 }}>✦</div>

        {/* Headline */}
        <h2 style={{
          fontFamily: F.display, fontSize: 40, fontWeight: 700,
          color: C.ink, margin: "0 0 12px", lineHeight: 1.15,
        }}>
          Your first edition is waiting.
        </h2>

        {/* Subhead */}
        <p style={{
          fontFamily: F.body, fontSize: 17, fontStyle: "italic",
          color: C.inkMuted, margin: "0 0 32px",
        }}>
          Start writing today. The Hauss Editor is ready.
        </p>

        {/* CTA */}
        <a href="/login" style={{
          fontFamily: F.sans, fontSize: 14, fontWeight: 500,
          color: C.bg, backgroundColor: C.ink,
          padding: "16px 40px", textDecoration: "none",
          display: "inline-block",
        }}>
          Start Writing — It's Free
        </a>

        {/* Note */}
        <div style={{
          fontFamily: F.sans, fontSize: 12, color: C.inkFaint,
          marginTop: 12,
        }}>
          Takes 30 seconds. No credit card.
        </div>
      </div>
    </section>
  );
}
