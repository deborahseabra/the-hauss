import { useState, useEffect } from "react";
import { F, C } from "./theme";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      borderBottom: `1px solid ${C.rule}`,
      backgroundColor: scrolled ? "rgba(255,255,255,0.92)" : C.bg,
      backdropFilter: scrolled ? "blur(8px)" : "none",
      WebkitBackdropFilter: scrolled ? "blur(8px)" : "none",
      transition: "background-color 0.3s ease, backdrop-filter 0.3s ease",
    }}>
      <div style={{
        maxWidth: 1080, margin: "0 auto", padding: "0 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center", height: 56,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.ink }}>The Hauss</span>
          <span style={{ fontFamily: F.sans, fontSize: 9, color: C.inkFaint, fontStyle: "italic" }}>est. 2026</span>
        </div>

        {/* Nav links */}
        <div className="landing-nav-links" style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {[
            { label: "Features", id: "features" },
            { label: "Security", id: "security" },
            { label: "Pricing", id: "pricing" },
          ].map((link) => (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: F.sans, fontSize: 12, fontWeight: 400, color: C.inkMuted,
                padding: 0, transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.ink)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.inkMuted)}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/login" style={{ fontFamily: F.sans, fontSize: 12, color: C.inkMuted, textDecoration: "none" }}>Log In</a>
          <a href="/login" style={{
            fontFamily: F.sans, fontSize: 12, fontWeight: 500,
            color: C.bg, backgroundColor: C.ink,
            padding: "8px 20px", textDecoration: "none",
            display: "inline-block",
          }}>Start Writing</a>
        </div>
      </div>
    </nav>
  );
}
