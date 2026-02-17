import { F, C } from "./theme";

const COLUMNS = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Security", "Changelog"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Contact"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "GDPR"],
  },
];

export default function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${C.rule}`, padding: "48px 24px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Columns */}
        <div className="landing-footer-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 32, marginBottom: 40 }}>
          {/* Brand column */}
          <div>
            <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 6 }}>
              The Hauss
            </div>
            <div style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: C.inkFaint, marginBottom: 4 }}>
              Your life, in editorial.
            </div>
            <div style={{ fontFamily: F.sans, fontSize: 10, color: "#ccc" }}>
              Made in São Paulo
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div style={{
                fontFamily: F.sans, fontSize: 10, fontWeight: 600,
                color: C.ink, textTransform: "uppercase",
                letterSpacing: "1px", marginBottom: 12,
              }}>
                {col.title}
              </div>
              {col.links.map((link) => (
                <a
                  key={link}
                  href="#"
                  style={{
                    display: "block", fontFamily: F.sans, fontSize: 12,
                    color: C.inkMuted, textDecoration: "none",
                    lineHeight: 2.2,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.ink)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.inkMuted)}
                >
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: `1px solid ${C.rule}`, paddingTop: 20,
          fontFamily: F.sans, fontSize: 10, color: C.inkFaint,
        }}>
          © 2026 The Hauss. Your words, encrypted. Your story, yours.
        </div>
      </div>
    </footer>
  );
}
