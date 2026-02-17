import { F, C } from "./theme";
import useInView from "./useInView";

export default function Security() {
  const [ref, style] = useInView();

  return (
    <section id="security" style={{ backgroundColor: C.ink, padding: "80px 24px" }}>
      <div ref={ref} style={{ ...style, maxWidth: 680, margin: "0 auto" }}>
        {/* Lock icon */}
        <div style={{ marginBottom: 24 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <circle cx="12" cy="16" r="1" />
          </svg>
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: F.display, fontSize: 32, fontWeight: 700,
          color: "#fff", margin: "0 0 24px",
        }}>
          More private than your diary. Mathematically.
        </h2>

        {/* Body */}
        <div style={{ fontFamily: F.body, fontSize: 16, lineHeight: 1.8, color: "#d0d0d0" }}>
          <p style={{ margin: "0 0 20px" }}>
            Every entry you write is encrypted with AES-256-GCM before it leaves your device. Your words arrive at our servers as unreadable ciphertext. We don't have the key. We can't read your journal. No engineer, no executive, no government request can access your thoughts.
          </p>
          <p style={{ margin: 0 }}>
            Your encryption key lives on your device, not on ours. This means your privacy isn't a policy — it's a mathematical guarantee.
          </p>
        </div>

        {/* Stats */}
        <div style={{
          marginTop: 32, display: "flex", justifyContent: "center",
          gap: 8, flexWrap: "wrap",
        }}>
          {["AES-256-GCM", "End-to-end encrypted", "Zero-knowledge architecture"].map((stat, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {i > 0 && <span style={{ color: "#555" }}>·</span>}
              <span style={{
                fontFamily: F.mono, fontSize: 11, color: "#a0a0a0",
                textTransform: "uppercase", letterSpacing: 1,
              }}>
                {stat}
              </span>
            </span>
          ))}
        </div>

        {/* Link */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <a
            href="#"
            style={{
              fontFamily: F.sans, fontSize: 12, color: "#a0a0a0",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Read our security whitepaper →
          </a>
        </div>
      </div>
    </section>
  );
}
