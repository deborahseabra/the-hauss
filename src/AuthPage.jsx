import { useState } from "react";
import { supabase } from "./supabaseClient";
import CityField from "./components/CityField";

const F = {
  display: "'Playfair Display', Georgia, serif",
  body: "'Source Serif 4', Georgia, serif",
  sans: "'IBM Plex Sans', -apple-system, sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup | forgot | check-email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || email.split("@")[0], city: city || null } },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setMode("check-email");
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setMode("check-email");
  };

  const switchMode = (newMode) => { setMode(newMode); setError(null); setConfirmPassword(""); setCity(""); };

  // Check email confirmation screen
  if (mode === "check-email") {
    return (
      <Shell>
        <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease" }}>
          <div style={{ fontSize: 32, color: "#c41e1e", marginBottom: 20 }}>✦</div>
          <h2 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: "#121212", marginBottom: 8 }}>
            Check Your Email
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.7, color: "#363636", marginBottom: 6 }}>
            We sent a confirmation link to
          </p>
          <p style={{ fontFamily: F.mono, fontSize: 13, color: "#121212", marginBottom: 24 }}>
            {email}
          </p>
          <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: "#727272", lineHeight: 1.6, marginBottom: 32 }}>
            Click the link in the email to activate your account. It may take a minute to arrive.
          </p>
          <button onClick={() => switchMode("login")} style={btnSecondary}>
            Back to Login
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ animation: "fadeIn 0.4s ease" }}>
        {/* Tabs */}
        <div style={{ display: "flex", marginBottom: 28 }}>
          {[
            { key: "login", label: "Sign In" },
            { key: "signup", label: "Create Account" },
          ].map((tab) => (
            <button key={tab.key} onClick={() => switchMode(tab.key)} style={{
              flex: 1, padding: "10px 0",
              fontFamily: F.sans, fontSize: 11, fontWeight: mode === tab.key ? 500 : 400,
              textTransform: "uppercase", letterSpacing: "1px",
              color: mode === tab.key ? "#121212" : "#999",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: mode === tab.key ? "2px solid #c41e1e" : "2px solid #e2e2e2",
              transition: "all 0.2s ease",
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "10px 14px", marginBottom: 20,
            backgroundColor: "#fef5f5", border: "1px solid #e2e2e2",
            fontFamily: F.sans, fontSize: 12, color: "#c41e1e", lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        {/* Login form */}
        {mode === "login" && (
          <form onSubmit={handleLogin}>
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="your@email.com" autoFocus />
            <PasswordField label="Password" value={password} onChange={setPassword} placeholder="Your password" />
            <button type="submit" disabled={loading || !email || !password} style={btnPrimary(loading || !email || !password)}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button type="button" onClick={() => switchMode("forgot")} style={linkBtn}>
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {/* Signup form */}
        {mode === "signup" && (
          <form onSubmit={handleSignup}>
            <Field label="Name" type="text" value={name} onChange={setName} placeholder="How should we call you?" autoFocus />
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="your@email.com" />
            <CityField label="City" value={city} onChange={setCity} placeholder="Where do you write from?" />
            <PasswordField label="Password" value={password} onChange={setPassword} placeholder="Min 8 chars (letters + numbers)" />
            <PasswordField label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat your password" match={password} />
            <button type="submit" disabled={loading || !email || !password || !confirmPassword} style={btnPrimary(loading || !email || !password || !confirmPassword)}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
            <p style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: "#999", textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
              Your entries are encrypted. Only you can read them.
            </p>
          </form>
        )}

        {/* Forgot password */}
        {mode === "forgot" && (
          <form onSubmit={handleForgot}>
            <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: "#727272", lineHeight: 1.6, marginBottom: 20 }}>
              Enter your email and we'll send a link to reset your password.
            </p>
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="your@email.com" autoFocus />
            <button type="submit" disabled={loading || !email} style={btnPrimary(loading || !email)}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button type="button" onClick={() => switchMode("login")} style={linkBtn}>
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </Shell>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function Shell({ children }) {
  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 24px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,300;1,8..60,400;1,8..60,500&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@300;400&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::selection { background: #121212; color: #fff; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        input::placeholder { color: #999; }
      `}</style>

      {/* Masthead */}
      <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeInUp 0.5s ease" }}>
        <div style={{ width: 200, height: 2, backgroundColor: "#121212", margin: "0 auto 16px" }} />
        <h1 style={{ fontFamily: F.display, fontSize: 36, fontWeight: 700, color: "#121212", letterSpacing: "-0.5px" }}>
          The Hauss
        </h1>
        <p style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: "#727272", marginTop: 6 }}>
          Your life, edited into a personal newspaper
        </p>
        <div style={{ width: 200, height: 2, backgroundColor: "#121212", margin: "16px auto 0" }} />
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 380, animation: "fadeInUp 0.5s ease 0.1s both",
      }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 48, textAlign: "center", animation: "fadeIn 0.5s ease 0.3s both" }}>
        <div style={{ width: 30, height: 1, backgroundColor: "#e2e2e2", margin: "0 auto 12px" }} />
        <p style={{ fontFamily: F.sans, fontSize: 10, color: "#999", letterSpacing: "0.5px" }}>
          Encrypted · Private · Yours
        </p>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder, autoFocus }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        fontFamily: F.sans, fontSize: 10, fontWeight: 600,
        color: "#727272", textTransform: "uppercase", letterSpacing: "1px",
        display: "block", marginBottom: 6,
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required
        style={{
          width: "100%", padding: "11px 14px",
          fontFamily: F.body, fontSize: 14, color: "#121212",
          backgroundColor: "#fff", border: "1px solid #e2e2e2",
          outline: "none", transition: "border-color 0.2s",
        }}
        onFocus={(e) => e.target.style.borderColor = "#121212"}
        onBlur={(e) => e.target.style.borderColor = "#e2e2e2"}
      />
    </div>
  );
}

function PasswordField({ label, value, onChange, placeholder, match }) {
  const [visible, setVisible] = useState(false);
  const showMismatch = match !== undefined && value.length > 0 && match.length > 0 && value !== match;

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        fontFamily: F.sans, fontSize: 10, fontWeight: 600,
        color: "#727272", textTransform: "uppercase", letterSpacing: "1px",
        display: "block", marginBottom: 6,
      }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          style={{
            width: "100%", padding: "11px 38px 11px 14px",
            fontFamily: F.body, fontSize: 14, color: "#121212",
            backgroundColor: "#fff",
            border: `1px solid ${showMismatch ? "#c41e1e" : "#e2e2e2"}`,
            outline: "none", transition: "border-color 0.2s",
          }}
          onFocus={(e) => e.target.style.borderColor = showMismatch ? "#c41e1e" : "#121212"}
          onBlur={(e) => e.target.style.borderColor = showMismatch ? "#c41e1e" : "#e2e2e2"}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          tabIndex={-1}
          style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer",
            padding: 4, display: "flex", alignItems: "center",
            color: "#999", transition: "color 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "#121212"}
          onMouseLeave={(e) => e.currentTarget.style.color = "#999"}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      </div>
      {showMismatch && (
        <p style={{ fontFamily: F.sans, fontSize: 10, color: "#c41e1e", marginTop: 5 }}>
          Passwords do not match
        </p>
      )}
    </div>
  );
}

// ============================================================
// SHARED STYLES
// ============================================================

const btnPrimary = (disabled) => ({
  width: "100%", padding: "12px 0", marginTop: 6,
  fontFamily: F.sans, fontSize: 12, fontWeight: 500,
  color: disabled ? "#999" : "#fff",
  backgroundColor: disabled ? "#e2e2e2" : "#121212",
  border: "none", cursor: disabled ? "default" : "pointer",
  transition: "background-color 0.2s, color 0.2s",
  letterSpacing: "0.5px",
});

const btnSecondary = {
  padding: "10px 24px",
  fontFamily: F.sans, fontSize: 12, fontWeight: 500,
  color: "#727272", backgroundColor: "transparent",
  border: "1px solid #e2e2e2", cursor: "pointer",
};

const linkBtn = {
  fontFamily: F.sans, fontSize: 11, color: "#999",
  background: "none", border: "none", cursor: "pointer",
  textDecoration: "underline", textUnderlineOffset: "2px",
};
