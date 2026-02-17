import { F, C } from "./theme";
import useInView from "./useInView";
import MiniReflections from "./MiniReflections";

export default function ReflectionsShowcase() {
  const [ref, style] = useInView();
  const [gridRef, gridStyle] = useInView();

  return (
    <section style={{ backgroundColor: C.sectionBg, padding: "80px 24px" }}>
      <div ref={ref} style={{ ...style, maxWidth: 780, margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          fontFamily: F.sans, fontSize: 10, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: 2,
          color: C.accent, marginBottom: 16,
        }}>
          ✦ REFLECTIONS
        </div>

        <h2 style={{
          fontFamily: F.display, fontSize: 32, fontWeight: 700,
          color: C.ink, margin: "0 0 8px",
        }}>
          The Hauss Editor reads everything. And remembers.
        </h2>

        <p style={{
          fontFamily: F.body, fontSize: 17, fontStyle: "italic",
          color: C.inkMuted, margin: "0 0 48px",
        }}>
          Most journals store your words. The Hauss reads them.
        </p>

        {/* Quote */}
        <div style={{
          borderLeft: `3px solid ${C.accent}`, paddingLeft: 24,
          margin: "48px 0",
        }}>
          <p style={{
            fontFamily: F.body, fontSize: 22, fontStyle: "italic",
            lineHeight: 1.6, color: C.ink, margin: "0 0 12px",
          }}>
            "You mention Marina in 8 entries, always when something in your own life is shifting. She might be your mirror for change."
          </p>
          <span style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted }}>
            — The Hauss Editor
          </span>
        </div>

        {/* Mini reflections grid */}
        <div ref={gridRef} style={{ ...gridStyle, margin: "48px 0" }}>
          <MiniReflections />
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <a
            href="/login"
            style={{
              fontFamily: F.sans, fontSize: 13, color: C.accent,
              textDecoration: "none", cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Unlock Reflections with Pro →
          </a>
          <div style={{
            fontFamily: F.sans, fontSize: 11, color: C.inkFaint, marginTop: 6,
          }}>
            Free plan includes weekly reflections. Pro unlocks your full story.
          </div>
        </div>
      </div>
    </section>
  );
}
