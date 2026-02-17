import { F, C } from "./theme";
import useInView from "./useInView";
import MiniEdition from "./MiniEdition";

export default function Hero() {
  const [previewRef, previewStyle] = useInView();

  return (
    <section style={{ padding: "140px 24px 80px", textAlign: "center" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Label */}
        <div style={{
          fontFamily: F.sans, fontSize: 11, fontWeight: 500,
          textTransform: "uppercase", letterSpacing: 2,
          color: C.accent, marginBottom: 20,
        }}>
          ✦ Your Personal Editorial Journal
        </div>

        {/* Headline */}
        <h1 className="landing-hero-headline" style={{
          fontFamily: F.display, fontSize: 52, fontWeight: 700,
          lineHeight: 1.1, color: C.ink, margin: 0,
        }}>
          Your life deserves a front page.
        </h1>

        {/* Subhead */}
        <p style={{
          fontFamily: F.body, fontSize: 19, fontStyle: "italic",
          lineHeight: 1.6, color: C.inkLight,
          maxWidth: 560, margin: "20px auto 0",
        }}>
          The Hauss transforms your daily thoughts into a beautiful weekly edition — written by you, elevated by your personal editor, encrypted for your eyes only.
        </p>

        {/* CTAs */}
        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <a href="/login" style={{
            fontFamily: F.sans, fontSize: 14, fontWeight: 500,
            color: C.bg, backgroundColor: C.ink,
            padding: "16px 36px", textDecoration: "none",
            display: "inline-block",
          }}>
            Start Writing — It's Free
          </a>
          <button
            onClick={() => {
              const el = document.getElementById("sample-edition");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: F.sans, fontSize: 13, color: C.inkMuted,
              padding: 0, textDecoration: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            See a sample edition →
          </button>
        </div>
      </div>

      {/* Product preview */}
      <div ref={previewRef} style={{
        ...previewStyle,
        maxWidth: 780, margin: "56px auto 0",
        border: `1px solid ${C.rule}`, backgroundColor: C.bg,
      }}>
        <MiniEdition />
      </div>
    </section>
  );
}
