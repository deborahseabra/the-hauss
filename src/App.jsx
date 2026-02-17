import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";
import AuthPage from "./AuthPage";
import LandingPage from "./LandingPage";
import {
  fetchProfile,
  fetchJournal,
  fetchLatestEdition,
  fetchAllEditions,
  fetchSections,
  fetchAllReflections,
  fetchReflection,
  createEntry,
  updateProfile,
  fetchEntriesFull,
  fetchEditionEntriesFull,
  fetchPrompts,
  updatePrompt,
  uploadAttachment,
  createAttachments,
  adminApi,
} from "./lib/api";
import { hasAccess, ROLE_LABELS, ROLE_BADGE_STYLES } from "./lib/access";

const PALETTES = {
  red: { primary: "#c41e1e", light: "#e85d5d", bg: "#fef5f5", bgDark: "#2a1818" },
  blue: { primary: "#1e5fc4", light: "#5d8be8", bg: "#f5f8fe", bgDark: "#181e2a" },
  green: { primary: "#1e7a3d", light: "#4da66a", bg: "#f5fef7", bgDark: "#182a1c" },
  purple: { primary: "#6b21a8", light: "#9b59d0", bg: "#faf5fe", bgDark: "#221828" },
};
const F = {
  display: "'Playfair Display', Georgia, serif",
  body: "'Source Serif 4', Georgia, serif",
  sans: "'IBM Plex Sans', -apple-system, sans-serif",
  mono: "'IBM Plex Mono', monospace",
};
function getTheme(mode, accent) {
  const p = PALETTES[accent];
  if (mode === "dark") return { bg: "#111", surface: "#1a1a1a", ink: "#ffffff", inkLight: "#f0f0f0", inkMuted: "#d0d0d0", inkFaint: "#a0a0a0", rule: "#2e2e2e", ruleDark: "#ffffff", accent: p.light, accentBg: p.bgDark, overlay: "rgba(0,0,0,0.75)", sectionBg: "#1c1c1c", platformBg: "#0a0a0a", platformBorder: "#252525" };
  return { bg: "#fff", surface: "#fff", ink: "#121212", inkLight: "#363636", inkMuted: "#727272", inkFaint: "#999", rule: "#e2e2e2", ruleDark: "#121212", accent: p.primary, accentBg: p.bg, overlay: "rgba(0,0,0,0.6)", sectionBg: "#f7f7f7", platformBg: "#fafafa", platformBorder: "#e8e8e8" };
}

function LoadingBlock({ C, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", animation: "fadeIn 0.3s ease" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 20, height: 20, border: `2px solid ${C.rule}`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontFamily: F.sans, fontSize: 12, color: C.inkMuted }}>{text || "Loading..."}</p>
      </div>
    </div>
  );
}

// ============================================================
// AI EDITOR COMPONENT
// ============================================================
function AiEditor({ text, C, onApply, session }) {
  const [step, setStep] = useState("choose"); // choose | tone | processing | result
  const [aiMode, setAiMode] = useState(null); // proofread | rewrite
  const [tone, setTone] = useState(null);
  const [result, setResult] = useState(null);
  const [showPreview, setShowPreview] = useState(true);
  const [aiError, setAiError] = useState(null);
  const hasText = text.trim().length > 20;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const callAiEditor = async (mode, selectedTone) => {
    setAiError(null);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-editor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text, mode, tone: selectedTone || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || err.details || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error("AI Editor error:", err);
      setAiError(err.message || "Something went wrong. Please try again.");
      setStep("choose");
      setAiMode(null);
      setTone(null);
      return null;
    }
  };

  const handleStart = async (mode) => {
    setAiMode(mode);
    if (mode === "proofread") {
      setStep("processing");
      const data = await callAiEditor("proofread");
      if (data) {
        setResult({
          mode: "proofread",
          body: data.body,
          changes: data.changes_count || 0,
          changesList: data.changes_list || [],
        });
        setStep("result");
      }
    } else {
      setStep("tone");
    }
  };

  const handleRewrite = async (selectedTone) => {
    setTone(selectedTone);
    setStep("processing");
    const data = await callAiEditor("rewrite", selectedTone);
    if (data) {
      setResult({
        mode: "rewrite",
        tone: selectedTone,
        headline: data.headline,
        subhead: data.subhead,
        body: data.body,
      });
      setStep("result");
    }
  };

  const reset = () => { setStep("choose"); setAiMode(null); setTone(null); setResult(null); setShowPreview(true); };

  // CHOOSE MODE
  if (step === "choose") {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ color: C.accent, fontSize: 16 }}>✦</span>
          <span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: C.ink, textTransform: "uppercase", letterSpacing: "1px" }}>AI Editor</span>
        </div>
        {aiError && (
          <div style={{ fontFamily: F.sans, fontSize: 11, color: "#c41e1e", marginBottom: 12, padding: "8px 12px", backgroundColor: "#fef5f5", border: "1px solid #f5d5d5" }}>
            {aiError}
          </div>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          {/* PROOFREAD */}
          <button onClick={() => hasText && handleStart("proofread")} style={{
            flex: 1, padding: "16px 14px", textAlign: "left",
            backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`,
            cursor: hasText ? "pointer" : "default", transition: "border-color 0.2s",
            opacity: hasText ? 1 : 0.45,
          }}
            onMouseEnter={(e) => hasText && (e.currentTarget.style.borderColor = C.ink)}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = C.rule}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.ink }}>Proofread</span>
            </div>
            <p style={{ fontFamily: F.body, fontSize: 12, color: C.inkMuted, lineHeight: 1.5, fontStyle: "italic" }}>
              Fix grammar, spelling, and punctuation. Your voice stays untouched.
            </p>
          </button>

          {/* REWRITE */}
          <button onClick={() => hasText && handleStart("rewrite")} style={{
            flex: 1, padding: "16px 14px", textAlign: "left",
            backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`,
            cursor: hasText ? "pointer" : "default", transition: "border-color 0.2s",
            opacity: hasText ? 1 : 0.45,
          }}
            onMouseEnter={(e) => hasText && (e.currentTarget.style.borderColor = C.accent)}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = C.rule}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16, color: C.accent }}>✦</span>
              <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.ink }}>Rewrite</span>
            </div>
            <p style={{ fontFamily: F.body, fontSize: 12, color: C.inkMuted, lineHeight: 1.5, fontStyle: "italic" }}>
              Transform into a polished editorial piece with headline, structure, and chosen tone.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // CHOOSE TONE (rewrite only)
  if (step === "tone") {
    const tones = [
      { key: "intimate", label: "Intimate", desc: "Personal, introspective, diary-like. First person, raw and honest.", icon: "🌙" },
      { key: "literary", label: "Literary", desc: "Elegant prose, vivid imagery, New Yorker style. Third person, observational.", icon: "📖" },
      { key: "journalistic", label: "Journalistic", desc: "Structured, factual, NYT style. Clear narrative with quotes and context.", icon: "📰" },
    ];
    return (
      <div style={{ animation: "fadeIn 0.25s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: C.accent, fontSize: 16 }}>✦</span>
            <span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: C.ink, textTransform: "uppercase", letterSpacing: "1px" }}>Choose Tone</span>
          </div>
          <button onClick={reset} style={{ fontFamily: F.sans, fontSize: 11, color: C.inkFaint, background: "none", border: "none", cursor: "pointer" }}>← Back</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tones.map((t) => (
            <button key={t.key} onClick={() => handleRewrite(t.key)} style={{
              display: "flex", alignItems: "flex-start", gap: 14,
              padding: "16px", textAlign: "left",
              backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`,
              cursor: "pointer", transition: "border-color 0.2s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = C.accent}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = C.rule}
            >
              <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{t.icon}</span>
              <div>
                <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.inkMuted, lineHeight: 1.5, fontStyle: "italic" }}>{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // PROCESSING
  if (step === "processing") {
    const labels = aiMode === "proofread"
      ? { title: "Proofreading...", sub: "Checking grammar, spelling, punctuation" }
      : { title: "Rewriting...", sub: `Crafting ${tone} version with headline and structure` };
    return (
      <div>
        <div style={{ padding: "32px 20px", backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, textAlign: "center" }}>
          <div style={{ display: "inline-block", animation: "spin 1.5s linear infinite", fontSize: 24, color: C.accent, marginBottom: 12 }}>✦</div>
          <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.ink, marginBottom: 4 }}>{labels.title}</div>
          <div style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: C.inkMuted }}>{labels.sub}</div>
        </div>
      </div>
    );
  }

  // RESULT
  if (step === "result" && result) {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        <div style={{ border: `1px solid ${C.rule}` }}>
          {/* Header */}
          <div style={{ padding: "12px 20px", backgroundColor: C.sectionBg, borderBottom: `1px solid ${C.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: C.accent, fontSize: 14 }}>✦</span>
              <span style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: C.ink, textTransform: "uppercase", letterSpacing: "1px" }}>
                {result.mode === "proofread" ? "Proofread Result" : `Rewrite · ${result.tone}`}
              </span>
              {result.mode === "proofread" && (
                <span style={{ fontFamily: F.sans, fontSize: 10, color: C.accent, marginLeft: 4 }}>
                  {result.changes} corrections
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowPreview(!showPreview)} style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, background: "none", border: `1px solid ${C.rule}`, padding: "4px 12px", cursor: "pointer" }}>
                {showPreview ? "Collapse" : "Expand"}
              </button>
              <button onClick={() => { onApply(result); reset(); }} style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 500, color: C.bg, backgroundColor: C.ink, border: "none", padding: "4px 14px", cursor: "pointer" }}>
                Apply
              </button>
              <button onClick={reset} style={{ fontFamily: F.sans, fontSize: 11, color: C.inkFaint, background: "none", border: "none", cursor: "pointer" }}>
                Discard
              </button>
            </div>
          </div>

          {/* Content */}
          {showPreview && (
            <div style={{ padding: "20px 20px", animation: "fadeIn 0.2s ease" }}>
              {/* Proofread: show changes list */}
              {result.mode === "proofread" && result.changesList && (
                <div style={{ marginBottom: 16, padding: "12px 14px", backgroundColor: C.accentBg, border: `1px solid ${C.rule}` }}>
                  <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Changes Made</div>
                  {result.changesList.map((ch, i) => (
                    <div key={i} style={{ fontFamily: F.sans, fontSize: 12, color: C.inkLight, padding: "4px 0", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: C.accent, fontSize: 10 }}>→</span> {ch}
                    </div>
                  ))}
                </div>
              )}

              {/* Rewrite: show headline + subhead */}
              {result.mode === "rewrite" && (
                <>
                  <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8 }}>
                    {result.tone === "intimate" ? "Personal Essay" : result.tone === "literary" ? "Feature" : "Report"}
                  </div>
                  <h3 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: C.ink, marginBottom: 6 }}>{result.headline}</h3>
                  <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkLight, lineHeight: 1.5, marginBottom: 16 }}>{result.subhead}</p>
                  <div style={{ height: 1, backgroundColor: C.rule, marginBottom: 16 }} />
                </>
              )}

              {/* Body text */}
              {result.body.split("\n\n").map((p, i) => (
                <p key={i} style={{ fontFamily: F.body, fontSize: 14, lineHeight: 1.7, color: C.inkLight, marginBottom: 10 }}>{p}</p>
              ))}

              {result.mode === "rewrite" && (
                <div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkFaint, fontStyle: "italic", marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.rule}` }}>
                  Preview of how this entry will appear in your weekly edition
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ============================================================
// EDITOR VIEW
// ============================================================
function LocationForm({ C, onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  return (
    <div style={{ marginTop: 8, padding: "10px", backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, animation: "fadeIn 0.2s ease" }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Place name" style={{ width: "100%", padding: "6px 8px", marginBottom: 6, fontFamily: F.sans, fontSize: 11, color: C.ink, backgroundColor: C.bg, border: `1px solid ${C.rule}`, outline: "none" }} />
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" type="number" step="any" style={{ flex: 1, padding: "6px 8px", fontFamily: F.mono, fontSize: 10, color: C.ink, backgroundColor: C.bg, border: `1px solid ${C.rule}`, outline: "none" }} />
        <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" type="number" step="any" style={{ flex: 1, padding: "6px 8px", fontFamily: F.mono, fontSize: 10, color: C.ink, backgroundColor: C.bg, border: `1px solid ${C.rule}`, outline: "none" }} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => name.trim() && onAdd(name, lat, lng)} disabled={!name.trim()} style={{ flex: 1, padding: "5px", fontFamily: F.sans, fontSize: 10, fontWeight: 500, color: name.trim() ? C.bg : C.inkFaint, backgroundColor: name.trim() ? C.ink : C.rule, border: "none", cursor: name.trim() ? "pointer" : "default" }}>Add</button>
        <button onClick={onCancel} style={{ padding: "5px 10px", fontFamily: F.sans, fontSize: 10, color: C.inkMuted, background: "none", border: `1px solid ${C.rule}`, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function LinkForm({ C, onAdd, onCancel }) {
  const [url, setUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  return (
    <div style={{ marginTop: 8, padding: "10px", backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, animation: "fadeIn 0.2s ease" }}>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: "6px 8px", marginBottom: 6, fontFamily: F.sans, fontSize: 11, color: C.ink, backgroundColor: C.bg, border: `1px solid ${C.rule}`, outline: "none" }} />
      <input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Title (optional)" style={{ width: "100%", padding: "6px 8px", marginBottom: 8, fontFamily: F.sans, fontSize: 11, color: C.ink, backgroundColor: C.bg, border: `1px solid ${C.rule}`, outline: "none" }} />
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => url.trim() && onAdd(url, linkTitle)} disabled={!url.trim()} style={{ flex: 1, padding: "5px", fontFamily: F.sans, fontSize: 10, fontWeight: 500, color: url.trim() ? C.bg : C.inkFaint, backgroundColor: url.trim() ? C.ink : C.rule, border: "none", cursor: url.trim() ? "pointer" : "default" }}>Add</button>
        <button onClick={onCancel} style={{ padding: "5px 10px", fontFamily: F.sans, fontSize: 10, color: C.inkMuted, background: "none", border: `1px solid ${C.rule}`, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function EditorView({ onClose, onPublished, C, userId, session }) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [section, setSection] = useState("dispatch");
  const [mood, setMood] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiKey, setAiKey] = useState(0);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [attachPanel, setAttachPanel] = useState(null); // null | 'photo' | 'location' | 'link'
  const [photoUploading, setPhotoUploading] = useState(false);
  const ref = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { if (ref.current) setTimeout(() => ref.current.focus(), 200); }, []);
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const url = await uploadAttachment(userId, file);
      setPendingAttachments((prev) => [
        ...prev,
        { type: "photo", url, metadata: { caption: "" }, _preview: URL.createObjectURL(file) },
      ]);
      setAttachPanel(null);
    } catch (err) {
      console.error("Photo upload failed:", err);
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddLocation = (name, lat, lng) => {
    setPendingAttachments((prev) => [
      ...prev,
      { type: "location", url: null, metadata: { name: name || "Unnamed", lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 } },
    ]);
    setAttachPanel(null);
  };

  const handleAddLink = (url, linkTitle) => {
    setPendingAttachments((prev) => [
      ...prev,
      { type: "link", url, metadata: { title: linkTitle || "" } },
    ]);
    setAttachPanel(null);
  };

  const removeAttachment = (index) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAttachmentCaption = (index, caption) => {
    setPendingAttachments((prev) => prev.map((a, i) => i === index ? { ...a, metadata: { ...a.metadata, caption } } : a));
  };

  const handleApplyAi = (result) => {
    if (result.mode === "rewrite") {
      if (result.headline) setTitle(result.headline);
      setText(result.body);
      if (result.tone === "intimate") setSection("essay");
      if (result.tone === "literary") setSection("essay");
      if (result.tone === "journalistic") setSection("dispatch");
    } else {
      setText(result.body);
    }
    setAiKey(k => k + 1);
  };

  const handlePublish = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const entry = await createEntry({
        userId,
        title: title.trim() || null,
        body: text,
        section,
        mood,
        isPublic,
        source: "app",
      });
      if (pendingAttachments.length > 0) {
        await createAttachments(entry.id, userId, pendingAttachments);
      }
      setShowSuccess(true);
      if (onPublished) onPublished();
    } catch (err) {
      console.error("Failed to publish entry:", err);
      setSaveError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const secs = [
    { key: "dispatch", label: "Dispatch", desc: "Quick notes and observations" },
    { key: "essay", label: "Personal Essay", desc: "Longer reflections" },
    { key: "letter", label: "Letter to Self", desc: "Messages across time" },
    { key: "review", label: "Review", desc: "Books, films, experiences" },
  ];
  const moods = [{ e: "☀️", l: "Bright" }, { e: "🌤", l: "Calm" }, { e: "🌧", l: "Heavy" }, { e: "⚡", l: "Electric" }, { e: "🌙", l: "Reflective" }];

  if (showSuccess) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, backgroundColor: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.4s ease" }}>
      <div style={{ fontSize: 40, marginBottom: 20, color: C.accent }}>✦</div>
      <h2 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Published</h2>
      <p style={{ fontFamily: F.body, fontSize: 16, fontStyle: "italic", color: C.inkMuted, marginBottom: 8 }}>Your entry will appear in this week's edition.</p>
      {isPublic && <p style={{ fontFamily: F.sans, fontSize: 12, color: C.accent, marginBottom: 24 }}>🌐 Visible at thehauss.me/deborah</p>}
      {!isPublic && <p style={{ fontFamily: F.sans, fontSize: 12, color: C.inkFaint, marginBottom: 24 }}>🔒 Private — only you can see this</p>}
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={() => { setShowSuccess(false); setText(""); setTitle(""); setMood(null); setAiKey(k => k + 1); }} style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.inkMuted, border: `1px solid ${C.rule}`, backgroundColor: "transparent", padding: "10px 24px", cursor: "pointer" }}>Write Another</button>
        <button onClick={onClose} style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.bg, backgroundColor: C.ink, border: "none", padding: "10px 24px", cursor: "pointer" }}>Back to Edition</button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, backgroundColor: C.bg, display: "flex", flexDirection: "column", animation: "editorSlideIn 0.35s ease" }}>
      {/* HEADER */}
      <div style={{ borderBottom: `1px solid ${C.rule}`, padding: "0 32px", height: 56, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: F.sans, fontSize: 12, color: C.inkMuted }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back
          </button>
          <div style={{ width: 1, height: 20, backgroundColor: C.rule }} />
          <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>NEW ENTRY</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {saveError && <span style={{ fontFamily: F.sans, fontSize: 11, color: "#c41e1e" }}>{saveError}</span>}
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.inkFaint }}>{wordCount > 0 ? `${wordCount} words` : ""}</span>
          <button onClick={() => setIsPublic(!isPublic)} style={{
            display: "flex", alignItems: "center", gap: 5,
            fontFamily: F.sans, fontSize: 11, color: isPublic ? C.accent : C.inkMuted,
            background: "none", border: `1px solid ${isPublic ? C.accent : C.rule}`,
            padding: "5px 12px", cursor: "pointer", transition: "all 0.15s",
          }}>
            {isPublic ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2c-4 4.5-4 13.5 0 20"/><path d="M12 2c4 4.5 4 13.5 0 20"/><path d="M2 12h20"/><path d="M4 7h16"/><path d="M4 17h16"/></svg> Public</> : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Private</>}
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: `1px solid ${C.rule}`, cursor: "pointer", padding: "5px 10px", fontFamily: F.sans, fontSize: 11, color: C.inkMuted, display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/></svg>
            {sidebarOpen ? "Hide" : "Details"}
          </button>
          <button onClick={handlePublish} disabled={!text.trim() || isSaving} style={{
            fontFamily: F.sans, fontSize: 12, fontWeight: 500,
            color: text.trim() ? C.bg : C.inkFaint,
            backgroundColor: text.trim() ? C.ink : C.rule,
            border: "none", padding: "8px 24px", cursor: text.trim() ? "pointer" : "default",
          }}>{isSaving ? "Publishing..." : "Publish"}</button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LEFT: writing + AI stacked */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Scrollable writing area */}
          <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", padding: "48px 32px 24px" }}>
            <div style={{ width: "100%", maxWidth: 640 }}>
              <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 20 }}>
                {secs.find(s => s.key === section)?.label}
                {isPublic && <span style={{ marginLeft: 8, color: C.inkFaint, fontWeight: 400 }}>· Public</span>}
              </div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline" style={{
                width: "100%", border: "none", outline: "none", fontFamily: F.display, fontSize: 32, fontWeight: 700,
                color: C.ink, backgroundColor: "transparent", lineHeight: 1.2, marginBottom: 8, padding: 0,
              }} />
              <div style={{ height: 2, backgroundColor: C.ink, width: 60, marginBottom: 28 }} />
              <textarea ref={ref} value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Write freely. What happened? What are you thinking about?

Your AI editor can proofread this or transform it into a polished editorial piece."
                style={{ width: "100%", minHeight: 300, border: "none", outline: "none", resize: "none", fontFamily: F.body, fontSize: 18, lineHeight: 1.85, color: C.ink, backgroundColor: "transparent", padding: 0 }} />
            </div>
          </div>

          {/* FIXED AI EDITOR BAR at bottom — always visible */}
          <div style={{ flexShrink: 0, borderTop: `1px solid ${C.rule}`, backgroundColor: C.bg, maxHeight: "45vh", overflow: "auto" }}>
            <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 32px" }}>
              <AiEditor key={aiKey} text={text} C={C} onApply={handleApplyAi} session={session} />
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        {sidebarOpen && (
          <div style={{ width: 280, borderLeft: `1px solid ${C.rule}`, overflow: "auto", flexShrink: 0, animation: "sidebarIn 0.25s ease", backgroundColor: C.sectionBg }}>
            {/* Section */}
            <div style={{ padding: "24px 20px", borderBottom: `1px solid ${C.rule}` }}>
              <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>Section</div>
              {secs.map((s) => (
                <button key={s.key} onClick={() => setSection(s.key)} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: 4, backgroundColor: section === s.key ? C.bg : "transparent", border: section === s.key ? `1px solid ${C.rule}` : "1px solid transparent", cursor: "pointer" }}>
                  <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: section === s.key ? 500 : 400, color: section === s.key ? C.ink : C.inkMuted }}>{s.label}</div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: C.inkFaint, marginTop: 2, fontStyle: "italic" }}>{s.desc}</div>
                </button>
              ))}
            </div>

            {/* Visibility */}
            <div style={{ padding: "24px 20px", borderBottom: `1px solid ${C.rule}` }}>
              <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>Visibility</div>
              {[
                { pub: false, label: "Private", desc: "Only in your personal edition", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> },
                { pub: true, label: "Public", desc: "Published to your public page", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2c-4 4.5-4 13.5 0 20"/><path d="M12 2c4 4.5 4 13.5 0 20"/><path d="M2 12h20"/><path d="M4 7h16"/><path d="M4 17h16"/></svg> },
              ].map((v, i) => (
                <button key={i} onClick={() => setIsPublic(v.pub)} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: 4, backgroundColor: isPublic === v.pub ? C.bg : "transparent", border: isPublic === v.pub ? `1px solid ${C.rule}` : "1px solid transparent", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: isPublic === v.pub ? (v.pub ? C.accent : C.ink) : C.inkMuted }}>
                    {v.icon}<span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: isPublic === v.pub ? 500 : 400 }}>{v.label}</span>
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: C.inkFaint, marginTop: 2, fontStyle: "italic" }}>{v.desc}</div>
                </button>
              ))}
            </div>

            {/* Mood */}
            <div style={{ padding: "24px 20px", borderBottom: `1px solid ${C.rule}` }}>
              <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>Mood</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 4 }}>
                {moods.map((m, i) => (
                  <button key={i} onClick={() => setMood(i)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 2px", backgroundColor: mood === i ? C.bg : "transparent", border: mood === i ? `1.5px solid ${C.ink}` : `1px solid ${C.rule}`, cursor: "pointer" }}>
                    <span style={{ fontSize: 14 }}>{m.e}</span>
                    <span style={{ fontFamily: F.sans, fontSize: 8, color: mood === i ? C.ink : C.inkMuted, fontWeight: mood === i ? 500 : 400 }}>{m.l}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Attach */}
            <div style={{ padding: "24px 20px" }}>
              <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>Attach</div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoSelect} />
              <button onClick={() => { setAttachPanel(attachPanel === "photo" ? null : "photo"); fileInputRef.current?.click(); }} disabled={photoUploading} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 6, width: "100%", background: "none", border: `1px solid ${C.rule}`, cursor: photoUploading ? "default" : "pointer", fontFamily: F.sans, fontSize: 12, color: C.inkLight, textAlign: "left", opacity: photoUploading ? 0.6 : 1 }}>
                <span>📷</span>{photoUploading ? "Uploading..." : "Photo"}
              </button>
              <button onClick={() => setAttachPanel(attachPanel === "location" ? null : "location")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 6, width: "100%", background: "none", border: `1px solid ${attachPanel === "location" ? C.accent : C.rule}`, cursor: "pointer", fontFamily: F.sans, fontSize: 12, color: C.inkLight, textAlign: "left" }}>
                <span>📍</span>Location
              </button>
              <button onClick={() => setAttachPanel(attachPanel === "link" ? null : "link")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 6, width: "100%", background: "none", border: `1px solid ${attachPanel === "link" ? C.accent : C.rule}`, cursor: "pointer", fontFamily: F.sans, fontSize: 12, color: C.inkLight, textAlign: "left" }}>
                <span>🔗</span>Link
              </button>

              {/* Location inline form */}
              {attachPanel === "location" && (
                <LocationForm C={C} onAdd={handleAddLocation} onCancel={() => setAttachPanel(null)} />
              )}

              {/* Link inline form */}
              {attachPanel === "link" && (
                <LinkForm C={C} onAdd={handleAddLink} onCancel={() => setAttachPanel(null)} />
              )}

              {/* Pending attachments preview */}
              {pendingAttachments.length > 0 && (
                <div style={{ marginTop: 14, borderTop: `1px solid ${C.rule}`, paddingTop: 12 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 600, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
                    {pendingAttachments.length} attached
                  </div>
                  {pendingAttachments.map((att, i) => (
                    <div key={i} style={{ marginBottom: 8, padding: "6px 8px", backgroundColor: C.sectionBg, border: `1px solid ${C.rule}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {att.type === "photo" && att._preview && (
                          <img src={att._preview} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 2 }} />
                        )}
                        {att.type === "photo" && !att._preview && <span style={{ fontSize: 14 }}>📷</span>}
                        {att.type === "location" && <span style={{ fontSize: 14 }}>📍</span>}
                        {att.type === "link" && <span style={{ fontSize: 14 }}>🔗</span>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: F.sans, fontSize: 10, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {att.type === "photo" ? (att.metadata?.caption || "Photo") : att.type === "location" ? att.metadata?.name : (att.metadata?.title || att.url)}
                          </div>
                        </div>
                        <button onClick={() => removeAttachment(i)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint, fontSize: 14, padding: 2, lineHeight: 1 }}>x</button>
                      </div>
                      {att.type === "photo" && (
                        <input
                          value={att.metadata?.caption || ""}
                          onChange={(e) => updateAttachmentCaption(i, e.target.value)}
                          placeholder="Add caption..."
                          style={{ width: "100%", marginTop: 4, padding: "3px 6px", fontFamily: F.body, fontSize: 10, fontStyle: "italic", color: C.inkMuted, backgroundColor: "transparent", border: `1px solid ${C.rule}`, outline: "none" }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS
// ============================================================
function SettingsPanel({ isOpen, onClose, C, mode, setMode, accent, setAccent, pubName, setPubName, motto, setMotto, userId }) {
  const [ln, setLn] = useState(pubName);
  const [lm, setLm] = useState(motto);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  useEffect(() => { setLn(pubName); setLm(motto); }, [pubName, motto]);
  if (!isOpen) return null;

  const save = async () => {
    setSaving(true);
    setToast(null);
    try {
      await updateProfile(userId, {
        publication_name: ln,
        motto: lm,
        theme_mode: mode,
        theme_accent: accent,
      });
      setPubName(ln);
      setMotto(lm);
      setToast("success");
      setTimeout(() => {
        setToast(null);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setToast("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, backgroundColor: C.overlay, zIndex: 2000, display: "flex", justifyContent: "flex-end", animation: "fadeIn 0.2s ease" }}>
      <div style={{ backgroundColor: C.surface, width: 400, height: "100%", overflow: "auto", animation: "slideInRight 0.3s ease", borderLeft: `1px solid ${C.rule}` }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 600, color: C.ink }}>Settings</h2>
            <p style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: C.inkMuted, marginTop: 2 }}>Customize your publication</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkMuted, fontSize: 18 }}>✕</button>
        </div>

        <div style={{ padding: "24px" }}>
          <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 16 }}>Appearance</div>
          <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 10 }}>Theme</div>
          <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
            {[{ k: "light", l: "Light", i: "☀️" }, { k: "dark", l: "Dark", i: "🌙" }].map((t) => (
              <button key={t.k} onClick={() => setMode(t.k)} style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, backgroundColor: mode === t.k ? C.sectionBg : "transparent", border: mode === t.k ? `1.5px solid ${C.ink}` : `1px solid ${C.rule}`, cursor: "pointer", marginLeft: t.k === "dark" ? -1 : 0 }}>
                <span style={{ fontSize: 20 }}>{t.i}</span>
                <span style={{ fontFamily: F.sans, fontSize: 11, fontWeight: mode === t.k ? 500 : 400, color: mode === t.k ? C.ink : C.inkMuted }}>{t.l}</span>
              </button>
            ))}
          </div>
          <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 10 }}>Accent</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[{ k: "red", l: "Crimson", c: "#c41e1e" }, { k: "blue", l: "Cobalt", c: "#1e5fc4" }, { k: "green", l: "Forest", c: "#1e7a3d" }, { k: "purple", l: "Amethyst", c: "#6b21a8" }].map((c) => (
              <button key={c.k} onClick={() => setAccent(c.k)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: accent === c.k ? `1.5px solid ${c.c}` : `1px solid ${C.rule}`, backgroundColor: accent === c.k ? C.accentBg : "transparent", cursor: "pointer" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: c.c, border: accent === c.k ? "2px solid #fff" : "none", boxShadow: accent === c.k ? `0 0 0 1px ${c.c}` : "none" }} />
                <span style={{ fontFamily: F.sans, fontSize: 11, fontWeight: accent === c.k ? 500 : 400, color: accent === c.k ? C.ink : C.inkMuted }}>{c.l}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 1, backgroundColor: C.rule, margin: "0 24px" }} />

        <div style={{ padding: "24px" }}>
          <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 16 }}>Filing Sources</div>
          {[{ name: "Telegram", on: true, det: "Connected · @deborah_bot" }, { name: "WhatsApp", on: false, det: "Send messages to file stories" }].map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", border: `1px solid ${C.rule}`, marginBottom: 8, backgroundColor: s.on ? C.accentBg : "transparent" }}>
              <div><div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.ink }}>{s.name}</div><div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted }}>{s.det}</div></div>
              <button style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 500, color: s.on ? C.inkMuted : C.bg, backgroundColor: s.on ? "transparent" : C.ink, border: s.on ? `1px solid ${C.rule}` : "none", padding: "6px 14px", cursor: "pointer" }}>{s.on ? "Disconnect" : "Connect"}</button>
            </div>
          ))}
        </div>
        <div style={{ height: 1, backgroundColor: C.rule, margin: "0 24px" }} />

        <div style={{ padding: "24px" }}>
          <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 16 }}>Plan</div>
          <div style={{ border: `1px solid ${C.rule}`, padding: 20 }}>
            <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 600, color: C.ink }}>Free <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 500, color: C.accent, border: `1px solid ${C.accent}`, padding: "2px 8px", marginLeft: 8, textTransform: "uppercase" }}>Current</span></div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.inkMuted, marginTop: 4 }}>30 entries/month · Basic AI</div>
            <div style={{ height: 1, backgroundColor: C.rule, margin: "12px 0" }} />
            <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Premium</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.inkMuted, lineHeight: 1.6, marginBottom: 16 }}>Unlimited entries · Advanced AI · Compiled editions · PDF export · Public page</div>
            <button style={{ width: "100%", padding: 10, fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.bg, backgroundColor: C.ink, border: "none", cursor: "pointer" }}>Upgrade — $9/mo</button>
          </div>
        </div>
        <div style={{ height: 1, backgroundColor: C.rule, margin: "0 24px" }} />

        <div style={{ padding: "24px" }}>
          <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 16 }}>Publication</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>Name</div>
            <input value={ln} onChange={(e) => setLn(e.target.value)} style={{ width: "100%", padding: "8px 12px", fontFamily: F.display, fontSize: 14, color: C.ink, backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, outline: "none" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>Motto</div>
            <input value={lm} onChange={(e) => setLm(e.target.value)} style={{ width: "100%", padding: "8px 12px", fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.ink, backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, outline: "none" }} />
          </div>
          {toast === "success" && (
            <div style={{
              padding: "10px 14px", marginBottom: 12,
              backgroundColor: "#f0faf0", border: "1px solid #c3e6c3",
              fontFamily: F.sans, fontSize: 12, color: "#2d6a2d",
              display: "flex", alignItems: "center", gap: 8,
              animation: "fadeIn 0.2s ease",
            }}>
              <span>✓</span> Changes saved successfully.
            </div>
          )}
          {toast === "error" && (
            <div style={{
              padding: "10px 14px", marginBottom: 12,
              backgroundColor: "#fef5f5", border: "1px solid #f5d5d5",
              fontFamily: F.sans, fontSize: 12, color: "#c41e1e",
              animation: "fadeIn 0.2s ease",
            }}>
              Failed to save. Please try again.
            </div>
          )}
          <button onClick={save} disabled={saving || toast === "success"} style={{ width: "100%", padding: 10, fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.bg, backgroundColor: C.ink, border: "none", cursor: saving || toast === "success" ? "default" : "pointer", opacity: saving || toast === "success" ? 0.7 : 1 }}>{saving ? "Saving..." : toast === "success" ? "Saved!" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PLATFORM HEADER
// ============================================================
function PlatformHeader({ user, C, onSettings, onEditor, onAdmin, isAdmin }) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menu]);

  const handleSignOut = async () => {
    setMenu(false);
    await supabase.auth.signOut();
  };

  return (
    <div style={{ backgroundColor: C.platformBg, borderBottom: `1px solid ${C.platformBorder}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 900 }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.ink }}>The Hauss</span>
          <span style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 500, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", border: `1px solid ${C.accent}`, padding: "2px 6px" }}>Beta</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onEditor} onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"} onMouseLeave={(e) => e.currentTarget.style.opacity = "1"} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F.sans, fontSize: 11, fontWeight: 500, color: C.bg, backgroundColor: C.ink, border: "none", padding: "6px 16px", cursor: "pointer", transition: "opacity 0.2s" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            New Entry
          </button>
          {user.role === "reader" && !user.isTester && <button style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 500, color: C.accent, backgroundColor: "transparent", border: `1px solid ${C.accent}`, padding: "5px 12px", cursor: "pointer" }}>Upgrade</button>}
          <button onClick={onSettings} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: C.inkMuted, display: "flex" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </button>
          <div style={{ position: "relative" }} ref={menuRef}>
            <button onClick={() => setMenu(!menu)} style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: C.accent, color: "#fff", border: "none", cursor: "pointer", fontFamily: F.sans, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{user.avatar}</button>
            {menu && <div style={{ position: "absolute", top: 38, right: 0, backgroundColor: C.surface, border: `1px solid ${C.rule}`, boxShadow: "0 8px 30px rgba(0,0,0,0.12)", minWidth: 200, zIndex: 999, animation: "fadeIn 0.15s ease" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.rule}` }}><div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.ink }}>{user.name}</div><div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted }}>{user.email}</div></div>
              {["My Publication", "Settings", "Export"].map((item, i) => (
                <button key={i} onClick={() => { setMenu(false); if (item === "Settings") onSettings(); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", fontFamily: F.sans, fontSize: 12, color: C.inkLight, cursor: "pointer" }}>{item}</button>
              ))}
              {isAdmin && (
                <button onClick={() => { setMenu(false); if (onAdmin) onAdmin(); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", fontFamily: F.sans, fontSize: 12, color: C.accent, cursor: "pointer", fontWeight: 500 }}>
                  ✦ Admin
                </button>
              )}
              <div style={{ height: 1, backgroundColor: C.rule }} />
              <button onClick={handleSignOut} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", fontFamily: F.sans, fontSize: 12, color: C.inkMuted, cursor: "pointer" }}>Sign Out</button>
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// JOURNAL VIEW — Personal, intimate, day-by-day
// ============================================================
function JournalView({ C, userId, onSwitchToEdition, onNewEntry, dataVersion, onOpenArticle }) {
  const [periodKey, setPeriodKey] = useState("thisWeek");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [journal, setJournal] = useState([]);
  const [fullEntries, setFullEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const pickerRef = useRef(null);

  useEffect(() => {
    const outside = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
    if (pickerOpen) document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [pickerOpen]);

  const getDateRange = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() + mondayOffset);
    const thisSunday = new Date(thisMonday);
    thisSunday.setDate(thisMonday.getDate() + 6);

    switch (periodKey) {
      case "thisWeek": return { from: thisMonday.toISOString(), to: new Date(thisSunday.getTime() + 86400000 - 1).toISOString() };
      case "lastWeek": {
        const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7);
        const lastSunday = new Date(lastMonday); lastSunday.setDate(lastMonday.getDate() + 6);
        return { from: lastMonday.toISOString(), to: new Date(lastSunday.getTime() + 86400000 - 1).toISOString() };
      }
      case "thisMonth": {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: firstOfMonth.toISOString(), to: now.toISOString() };
      }
      case "last30": {
        const d30 = new Date(today); d30.setDate(today.getDate() - 30);
        return { from: d30.toISOString(), to: now.toISOString() };
      }
      case "custom": {
        if (!customFrom || !customTo) return null;
        return { from: new Date(customFrom + "T00:00:00").toISOString(), to: new Date(customTo + "T23:59:59").toISOString() };
      }
      default: return { from: thisMonday.toISOString(), to: new Date(thisSunday.getTime() + 86400000 - 1).toISOString() };
    }
  }, [periodKey, customFrom, customTo]);

  useEffect(() => {
    if (!userId) return;
    const range = getDateRange();
    if (!range) return;
    setLoading(true);
    Promise.all([
      fetchJournal({ userId, ...range }),
      fetchEntriesFull({ userId, ...range }),
    ])
      .then(([journalData, fullData]) => {
        setJournal(journalData);
        setFullEntries(fullData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, periodKey, customFrom, customTo, getDateRange, dataVersion]);

  const handleOpenArticle = useCallback((entryId) => {
    const idx = fullEntries.findIndex((e) => e.id === entryId);
    if (idx >= 0 && onOpenArticle) {
      onOpenArticle(fullEntries[idx], fullEntries, idx);
    }
  }, [fullEntries, onOpenArticle]);

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    setPeriodKey("custom");
    setPickerOpen(false);
  };

  const periodTitles = { thisWeek: "This Week", lastWeek: "Last Week", thisMonth: "This Month", last30: "Last 30 Days", custom: "Custom Period" };
  const periodSubs = () => {
    const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(today); thisMonday.setDate(today.getDate() + mondayOffset);
    const thisSunday = new Date(thisMonday); thisSunday.setDate(thisMonday.getDate() + 6);
    switch (periodKey) {
      case "thisWeek": return `${mo[thisMonday.getMonth()]} ${thisMonday.getDate()} – ${thisSunday.getDate()}, ${thisMonday.getFullYear()}`;
      case "lastWeek": { const lm = new Date(thisMonday); lm.setDate(thisMonday.getDate()-7); const ls = new Date(lm); ls.setDate(lm.getDate()+6); return `${mo[lm.getMonth()]} ${lm.getDate()} – ${ls.getDate()}, ${lm.getFullYear()}`; }
      case "thisMonth": return `${mo[now.getMonth()]} ${now.getFullYear()}`;
      case "last30": { const d = new Date(today); d.setDate(today.getDate()-30); return `${mo[d.getMonth()]} ${d.getDate()} – ${mo[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`; }
      case "custom": return customFrom && customTo ? `${mo[new Date(customFrom+"T12:00:00").getMonth()]} ${new Date(customFrom+"T12:00:00").getDate()} – ${mo[new Date(customTo+"T12:00:00").getMonth()]} ${new Date(customTo+"T12:00:00").getDate()}, ${new Date(customTo+"T12:00:00").getFullYear()}` : "";
      default: return "";
    }
  };

  const currentJournal = journal;
  const totalEntries = currentJournal.reduce((a, d) => a + d.entries.length, 0);

  const presets = (() => {
    const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dow = today.getDay(); const mOff = dow === 0 ? -6 : 1 - dow;
    const tm = new Date(today); tm.setDate(today.getDate() + mOff);
    const ts = new Date(tm); ts.setDate(tm.getDate() + 6);
    const lm = new Date(tm); lm.setDate(tm.getDate() - 7);
    const ls = new Date(lm); ls.setDate(lm.getDate() + 6);
    return [
      { key: "thisWeek", label: "This Week", sub: `${mo[tm.getMonth()]} ${tm.getDate()}–${ts.getDate()}` },
      { key: "lastWeek", label: "Last Week", sub: `${mo[lm.getMonth()]} ${lm.getDate()}–${ls.getDate()}` },
      { key: "thisMonth", label: "This Month", sub: mo[now.getMonth()] },
      { key: "last30", label: "Last 30 Days", sub: (() => { const d = new Date(today); d.setDate(today.getDate()-30); return `${mo[d.getMonth()]} ${d.getDate()} – ${mo[now.getMonth()]} ${now.getDate()}`; })() },
    ];
  })();

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "0 24px", animation: "fadeIn 0.4s ease" }}>
      {/* Journal header */}
      <div style={{ padding: "40px 0 24px", textAlign: "center" }}>
        <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>My Journal</div>

        {/* Period selector — title + calendar icon to the right */}
        <div style={{ position: "relative" }} ref={pickerRef}>
          <h2 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, margin: 0 }}>
            {periodTitles[periodKey] || "This Week"}
          </h2>

          {/* Calendar icon — absolute right */}
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            style={{
              position: "absolute", top: "50%", right: 0, transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              padding: 6, display: "flex", alignItems: "center", justifyContent: "center",
              opacity: pickerOpen ? 1 : 0.35, transition: "opacity 0.25s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
            onMouseLeave={(e) => { if (!pickerOpen) e.currentTarget.style.opacity = "0.35"; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.inkMuted} strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>
              <circle cx="8" cy="15" r="1" fill={C.inkMuted} stroke="none"/>
              <circle cx="12" cy="15" r="1" fill={C.inkMuted} stroke="none"/>
              <circle cx="16" cy="15" r="1" fill={C.inkMuted} stroke="none"/>
            </svg>
          </button>

          {/* Period picker dropdown */}
          {pickerOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0,
              zIndex: 100, backgroundColor: C.surface, border: `1px solid ${C.rule}`,
              boxShadow: "0 8px 30px rgba(0,0,0,0.1)", minWidth: 280,
              animation: "fadeIn 0.2s ease", textAlign: "left",
            }}>
              {/* Presets */}
              <div style={{ padding: "6px 0" }}>
                {presets.map((p) => (
                  <button key={p.key} onClick={() => { setPeriodKey(p.key); setPickerOpen(false); }}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      width: "100%", padding: "10px 18px", background: "none", border: "none",
                      cursor: "pointer", transition: "background-color 0.1s",
                      backgroundColor: periodKey === p.key ? C.sectionBg : "transparent",
                    }}
                    onMouseEnter={(e) => { if (periodKey !== p.key) e.currentTarget.style.backgroundColor = C.sectionBg; }}
                    onMouseLeave={(e) => { if (periodKey !== p.key) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {periodKey === p.key && <div style={{ width: 3, height: 14, backgroundColor: C.accent, flexShrink: 0 }} />}
                      <span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: periodKey === p.key ? 500 : 400, color: periodKey === p.key ? C.ink : C.inkLight }}>{p.label}</span>
                    </div>
                    <span style={{ fontFamily: F.mono, fontSize: 10, color: C.inkFaint }}>{p.sub}</span>
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div style={{ height: 1, backgroundColor: C.rule }} />

              {/* Custom range */}
              <div style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.inkMuted} strokeWidth="1.5" strokeLinecap="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>
                  </svg>
                  <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px" }}>Custom Range</span>
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontFamily: F.sans, fontSize: 9, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>From</label>
                    <input type="date" value={customFrom} max={customTo || undefined}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      style={{ width: "100%", padding: "7px 8px", fontFamily: F.sans, fontSize: 12, color: C.ink, backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, outline: "none" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontFamily: F.sans, fontSize: 9, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>To</label>
                    <input type="date" value={customTo} min={customFrom || undefined}
                      onChange={(e) => setCustomTo(e.target.value)}
                      style={{ width: "100%", padding: "7px 8px", fontFamily: F.sans, fontSize: 12, color: C.ink, backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, outline: "none" }}
                    />
                  </div>
                </div>
                <button onClick={applyCustom} disabled={!customFrom || !customTo}
                  style={{
                    width: "100%", padding: "8px 0",
                    fontFamily: F.sans, fontSize: 11, fontWeight: 500,
                    color: customFrom && customTo ? C.bg : C.inkFaint,
                    backgroundColor: customFrom && customTo ? C.ink : C.rule,
                    border: "none", cursor: customFrom && customTo ? "pointer" : "default",
                    transition: "background-color 0.15s",
                  }}>Apply</button>
              </div>
            </div>
          )}
        </div>

        <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginTop: 4, marginBottom: 4 }}>
          {periodSubs()}
        </p>
        <p style={{ fontFamily: F.sans, fontSize: 11, color: C.inkFaint, marginBottom: 20 }}>
          {loading ? "Loading..." : `${currentJournal.length} days · ${totalEntries} ${totalEntries === 1 ? "entry" : "entries"}`}
        </p>
        <div style={{ width: 40, height: 2, backgroundColor: C.accent, margin: "0 auto 0" }} />
      </div>

      {loading && <LoadingBlock C={C} text="Loading journal entries..." />}

      {/* Day by day timeline */}
      {!loading && currentJournal.map((day, di) => (
        <div key={`${periodKey}-${di}`} style={{ marginBottom: 8 }}>
          {/* Day header */}
          <div style={{
            position: "sticky", top: 48, zIndex: 10,
            backgroundColor: C.bg, padding: "12px 0",
            borderBottom: `1px solid ${C.rule}`,
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
          }}>
            <span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: C.ink, letterSpacing: "0.3px" }}>{day.date}</span>
            <span style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted }}>{day.entries.length} {day.entries.length === 1 ? "entry" : "entries"}</span>
          </div>

          {/* Entries */}
          {day.entries.map((entry, ei) => (
            <div key={ei} onClick={() => handleOpenArticle(entry.id)} style={{
              padding: "24px 0",
              borderBottom: `1px solid ${C.rule}`,
              animation: `fadeInUp 0.4s ease ${(di * 0.1) + (ei * 0.05)}s both`,
              cursor: "pointer",
            }}>
              {/* Entry meta row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: C.inkMuted }}>{entry.time}</span>
                <span style={{ color: C.rule }}>·</span>
                <span style={{ fontSize: 12 }}>{entry.mood}</span>
                <span style={{ color: C.rule }}>·</span>
                <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 500, color: C.accent, textTransform: "uppercase", letterSpacing: "0.5px" }}>{entry.section}</span>
                {entry.isPublic && (
                  <span style={{ fontFamily: F.sans, fontSize: 9, color: C.inkFaint, display: "flex", alignItems: "center", gap: 3 }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2c-4 4.5-4 13.5 0 20"/><path d="M12 2c4 4.5 4 13.5 0 20"/><path d="M2 12h20"/><path d="M4 7h16"/><path d="M4 17h16"/></svg>
                  </span>
                )}
                <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkFaint, fontStyle: "italic", marginLeft: "auto" }}>via {entry.source === "telegram" ? "Telegram" : "App"}</span>
              </div>

              {/* Entry body */}
              <div style={{ fontFamily: F.body, fontSize: 16, lineHeight: 1.8, color: C.inkLight, letterSpacing: "0.01em" }}>
                {entry.text}
              </div>

              {/* Photo placeholder */}
              {entry.hasPhoto && (
                <div style={{
                  marginTop: 16, backgroundColor: C.sectionBg,
                  height: 240, display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1px solid ${C.rule}`,
                }}>
                  <div style={{ textAlign: "center" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.inkFaint} strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    <div style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkFaint, marginTop: 6 }}>Golden hour, São Paulo</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* End of journal */}
      {!loading && <div style={{ textAlign: "center", padding: "40px 0 60px" }}>
        <div style={{ width: 40, height: 2, backgroundColor: C.accent, margin: "0 auto 20px" }} />
        <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginBottom: 16 }}>
          End of {(periodTitles[periodKey] || "this week").toLowerCase()} entries
        </p>
        <button onClick={onSwitchToEdition} style={{
          fontFamily: F.sans, fontSize: 11, fontWeight: 500,
          color: C.inkMuted, backgroundColor: "transparent",
          border: `1px solid ${C.rule}`, padding: "8px 20px", cursor: "pointer",
        }}>
          View Weekly Edition →
        </button>
      </div>}
    </div>
  );
}

// ============================================================
// ARCHIVES VIEW — Past editions as a grid of "covers"
// ============================================================
function ArchivesView({ C, userId }) {
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchAllEditions(userId)
      .then(setEditions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px", animation: "fadeIn 0.4s ease" }}>
      <div style={{ padding: "40px 0 32px", textAlign: "center" }}>
        <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>Archives</div>
        <h2 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Past Editions</h2>
        <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkMuted }}>{editions.length} weeks of your life, published</p>
        <div style={{ width: 40, height: 2, backgroundColor: C.accent, margin: "16px auto 0" }} />
      </div>

      {loading && <LoadingBlock C={C} text="Loading archives..." />}

      {/* Year filter */}
      <div style={{ display: "flex", justifyContent: "center", gap: 0, marginBottom: 32 }}>
        {["2026", "2025"].map((y, i) => (
          <button key={y} style={{
            fontFamily: F.sans, fontSize: 11, fontWeight: i === 0 ? 500 : 400,
            color: i === 0 ? C.bg : C.inkMuted,
            backgroundColor: i === 0 ? C.ink : "transparent",
            border: `1px solid ${i === 0 ? C.ink : C.rule}`,
            padding: "6px 20px", cursor: "pointer", marginLeft: i > 0 ? -1 : 0,
          }}>{y}</button>
        ))}
      </div>

      {/* Edition grid */}
      {!loading && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 60 }}>
        {editions.map((ed, i) => (
          <div key={i} style={{
            border: `1px solid ${C.rule}`, cursor: "pointer",
            transition: "border-color 0.2s, transform 0.2s",
            animation: `fadeInUp 0.4s ease ${i * 0.05}s both`,
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.ink; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.rule; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {/* Edition cover */}
            <div style={{ padding: "20px 16px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>Vol. I · {ed.num}</div>
                  <div style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted, marginTop: 2 }}>{ed.week}</div>
                </div>
                <span style={{ fontSize: 16 }}>{ed.mood}</span>
              </div>
              <div style={{ height: 1, backgroundColor: C.ruleDark, marginBottom: 12 }} />
              <h3 style={{ fontFamily: F.display, fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: C.ink, marginBottom: 12, minHeight: 40 }}>{ed.headline}</h3>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{ed.entries} entries</span>
                <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{ed.words.toLocaleString()} words</span>
              </div>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}

// ============================================================
// SECTIONS VIEW — NYT alternating layout
// ============================================================
function SectionsView({ C, userId, onOpenArticle }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchSections(userId)
      .then(setSections)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const handleOpenEntry = useCallback(async (entryId) => {
    if (!onOpenArticle || !userId) return;
    try {
      const entries = await fetchEntriesFull({ userId });
      const idx = entries.findIndex((e) => e.id === entryId);
      if (idx >= 0) onOpenArticle(entries[idx], entries, idx);
    } catch (err) {
      console.error("Failed to load article:", err);
    }
  }, [onOpenArticle, userId]);

  const totalEntries = sections.reduce((s, sec) => s + sec.count, 0);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px", animation: "fadeIn 0.4s ease" }}>
      <div style={{ padding: "40px 0 20px", textAlign: "center" }}>
        <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>Sections</div>
        <h2 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Your Newsroom</h2>
        <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkMuted }}>{totalEntries} entries across {sections.length} desks</p>
      </div>

      {loading && <LoadingBlock C={C} text="Loading sections..." />}

      {!loading && sections.map((sec, si) => {
        const flip = si % 2 === 1;
        return (
          <div key={si} style={{ animation: `fadeInUp 0.4s ease ${si * 0.08}s both` }}>
            {/* Section header */}
            <div style={{ borderTop: si === 0 ? `2px solid ${C.ink}` : `1px solid ${C.rule}`, paddingTop: 20, marginTop: si === 0 ? 12 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.ink }}>{sec.name}</span>
                  <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{sec.count} entries · {sec.words} words</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: C.accent, fontSize: 9 }}>✦</span>
                  {sec.themes.map((t, j) => (
                    <span key={j} style={{ fontFamily: F.sans, fontSize: 9, color: C.inkMuted }}>{t}{j < sec.themes.length - 1 ? "," : ""}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Content: entries + visual, alternating sides */}
            <div style={{
              display: "grid",
              gridTemplateColumns: flip ? "1fr 1fr" : "1fr 1fr",
              gap: 24, marginBottom: 32,
            }}>
              {/* Entries stack */}
              <div style={{ order: flip ? 2 : 1 }}>
                {sec.entries.map((entry, ei) => (
                  <div key={ei} onClick={() => handleOpenEntry(entry.id)} style={{
                    paddingBottom: 14, marginBottom: 14,
                    borderBottom: ei < sec.entries.length - 1 ? `1px solid ${C.rule}` : "none",
                    cursor: "pointer",
                  }}>
                    <h3 style={{
                      fontFamily: F.display, fontSize: 16, fontWeight: 600,
                      lineHeight: 1.3, color: C.ink, marginBottom: 4,
                    }}>{entry.headline}</h3>
                    <p style={{
                      fontFamily: F.body, fontSize: 13, color: C.inkMuted,
                      lineHeight: 1.5, marginBottom: 4,
                    }}>{entry.sub}</p>
                    <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkFaint, textTransform: "uppercase" }}>{entry.time}</span>
                  </div>
                ))}
              </div>

              {/* Visual area */}
              <div style={{ order: flip ? 1 : 2 }}>
                <div style={{
                  backgroundColor: C.sectionBg, height: "100%", minHeight: 200,
                  border: `1px solid ${C.rule}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.rule} strokeWidth="1">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ height: 40 }} />
    </div>
  );
}

// ============================================================
// REFLECTIONS VIEW — NYT distributed grid layout
// ============================================================
function ReflectionsView({ C, userId }) {
  const [period, setPeriod] = useState("week");
  const [askQuery, setAskQuery] = useState("");
  const [askAnswer, setAskAnswer] = useState(null);
  const [askLoading, setAskLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customFrom, setCustomFrom] = useState("2025-12-01");
  const [customTo, setCustomTo] = useState("2026-02-15");
  const [customApplied, setCustomApplied] = useState(false);
  const datePickerRef = useRef(null);
  const [periodsData, setPeriodsData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchAllReflections(userId)
      .then(setPeriodsData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    if (showDatePicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDatePicker]);

  const formatDateLabel = (from, to) => {
    const f = new Date(from + "T12:00:00");
    const t = new Date(to + "T12:00:00");
    const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const fd = `${mo[f.getMonth()]} ${f.getDate()}, ${f.getFullYear()}`;
    const td = `${mo[t.getMonth()]} ${t.getDate()}, ${t.getFullYear()}`;
    return `${fd} – ${td}`;
  };

  const daysBetween = (from, to) => {
    const f = new Date(from + "T12:00:00");
    const t = new Date(to + "T12:00:00");
    return Math.max(1, Math.round((t - f) / (1000 * 60 * 60 * 24)));
  };

  // Custom period placeholder (when no DB reflection exists)
  const customPeriod = {
    label: "Custom", date: formatDateLabel(customFrom, customTo),
    moods: [{day:"W1",val:2,emoji:"🌧"},{day:"W2",val:2,emoji:"🌙"},{day:"W3",val:3,emoji:"🌤"},{day:"W4",val:3,emoji:"🌤"},{day:"W5",val:4,emoji:"☀️"},{day:"W6",val:4,emoji:"☀️"},{day:"W7",val:5,emoji:"⚡"}],
    trend: [{w:"Start",v:2.2},{w:"",v:2.5},{w:"",v:2.8},{w:"",v:3.1},{w:"",v:3.5},{w:"End",v:4.1}],
    trendLabel: `${daysBetween(customFrom, customTo)}-Day Trend`, moodHint: "A clear arc of growth across your selected period",
    reflectionTitle: "Your Custom Period",
    reflection: [
      `Across this ${daysBetween(customFrom, customTo)}-day window, your writing tells a story of transformation. The early entries are cautious and observational — you were still finding your footing. By the midpoint, something shifted. The sentences got shorter. The certainty grew.`,
      "The most striking pattern in this range: your relationship with doubt changed. Early on, doubt was a barrier. Later, it became a companion — something you acknowledged and walked alongside rather than fought against.",
      "Your AI editor noticed a vocabulary shift of 23% between the first and last weeks of this range. New words for old feelings. That's growth you can measure.",
    ],
    connections: [
      "The first third of this range contains 60% of your 'I think' statements. The last third has almost none.",
      "Your longest entries cluster in the middle of this period — the transition zone between hesitation and decision.",
      "Telegram entries increased by 45% in the second half. You started trusting quick thoughts more.",
      "The themes that opened this period are different from the ones that closed it. You arrived somewhere new.",
    ],
    themes: [{theme:"Transformation",count:28,trend:"↑"},{theme:"Self-trust",count:22,trend:"↑"},{theme:"Permission",count:18,trend:"↑"},{theme:"Career",count:15,trend:"↑"},{theme:"Relationships",count:12,trend:"—"}],
    questions: [
      "What made you choose this specific time range? What were you looking for?",
      "The person who wrote the first entry in this range — would she recognize the person who wrote the last?",
      "Your vocabulary changed 23%. What new words did you find, and what did they replace?",
      "If this period were a chapter, what would you title it?",
    ],
    stats: [{label:"Entries",value:String(Math.round(daysBetween(customFrom, customTo) * 0.65))},{label:"Words",value:String((Math.round(daysBetween(customFrom, customTo) * 180)).toLocaleString())},{label:"Days",value:String(daysBetween(customFrom, customTo))},{label:"Avg. per entry",value:"277"},{label:"Personal Essays",value:String(Math.round(daysBetween(customFrom, customTo) * 0.12))},{label:"Public",value:String(Math.round(daysBetween(customFrom, customTo) * 0.06))}],
  };

  const P = period === "custom" ? customPeriod : periodsData[period];

  if (loading) return <LoadingBlock C={C} text="Loading reflections..." />;
  if (!P) return <LoadingBlock C={C} text="No reflection data for this period" />;

  const handleAsk = () => {
    if (!askQuery.trim()) return;
    setAskLoading(true); setAskAnswer(null);
    setTimeout(() => {
      const q = askQuery.toLowerCase();
      let a = "Based on your 847 entries, this is a recurring pattern. You tend to circle back to this theme in moments of transition — especially in your dispatches and letters to self. The answers are emerging in your writing, even when they don't feel like answers yet.";
      if (q.includes("happy") || q.includes("feliz") || q.includes("mood") || q.includes("humor"))
        a = "Your happiest entries cluster around Thursdays and Sundays — days of breakthroughs or quiet mornings. Your joy comes less from events and more from moments of clarity. Feb 12 (the retention model breakthrough) and Feb 15 (reading Clarice) scored highest in emotional intensity this week. Interestingly, your happiest entries are never about happiness — they're about understanding.";
      else if (q.includes("marina"))
        a = "Marina appears in 8 entries across 3 months. She's never the subject — she's always the mirror. You mention her when your own life is shifting. The Lisbon announcement triggered your most emotionally complex entry this month (Feb 14, 12:15 PM). You never write about Marina on days you write Letters to Self. Her friendship seems to represent the version of certainty you're still reaching for.";
      else if (q.includes("cook") || q.includes("food") || q.includes("comida") || q.includes("cozin"))
        a = "Food appears in 42 entries, but it's almost never just about food. The stroganoff disaster (Feb 13) was about perfectionism. The lunch on Augusta (Feb 14) was about a friendship in transition. Your cooking entries are 60% more likely to precede a deeply reflective entry the next day. Food is your gateway to introspection — the act of making something with your hands seems to unlock something in your thinking.";
      else if (q.includes("escrev") || q.includes("writ") || q.includes("produt"))
        a = "Your most productive window is 10PM–midnight (73% of personal essays). Telegram entries average 89 words but score higher in emotional density. App entries average 340 words and are more structured. Your 12-day streak is your longest since launch. You write more on rainy days. Your word count doubles in weeks where you also cook.";
      else if (q.includes("medo") || q.includes("fear") || q.includes("afraid"))
        a = "Fear shows up in 19 entries, but its shape has changed over time. In the early editions, fear was paralyzing — 'I don't know if I can.' By January, it became a companion — 'I'm afraid and I'm doing it anyway.' Your Letters to Self contain the most fear, but also the most resolution. The entry 'To the Version of Me Who's Still Afraid' marked a turning point.";
      else if (q.includes("são paulo") || q.includes("sao paulo") || q.includes("cidade") || q.includes("city"))
        a = "São Paulo appears in 34 entries — not as a setting, but as a character. The city's sounds (7am gate opening, Pinheiros dogs), its light (golden hour obsession, 12 entries about light), and its rhythms shape your writing. Your most place-specific entries are your most grounded emotionally. When you write about the city, you write about belonging.";
      setAskAnswer(a); setAskLoading(false);
    }, 2200);
  };

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      {/* Header */}
      <div style={{ padding: "32px 0 0", textAlign: "center" }}>
        <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>✦ Reflections</div>
        <h2 style={{ fontFamily: F.display, fontSize: 26, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Your AI Editor Speaks</h2>
        <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginBottom: 16 }}>{P.date}</p>
        {/* Period selector */}
        <div style={{ display: "flex", justifyContent: "center", gap: 0, marginBottom: 0 }}>
          {[
            { key: "week", label: "This Week" },
            { key: "month", label: "This Month" },
            { key: "quarter", label: "3 Months" },
            { key: "all", label: "All Time" },
          ].map((p) => (
            <button key={p.key} onClick={() => { setPeriod(p.key); setAskAnswer(null); setAskQuery(""); setShowDatePicker(false); }} style={{
              fontFamily: F.sans, fontSize: 11, fontWeight: period === p.key ? 500 : 400,
              color: period === p.key ? C.bg : C.inkMuted,
              backgroundColor: period === p.key ? C.ink : "transparent",
              border: `1px solid ${period === p.key ? C.ink : C.rule}`,
              padding: "6px 16px", cursor: "pointer", marginLeft: -1,
            }}>{p.label}</button>
          ))}
          {/* Custom date button */}
          <div style={{ position: "relative" }} ref={datePickerRef}>
            <button onClick={() => {
              if (period === "custom" && customApplied) {
                setShowDatePicker(!showDatePicker);
              } else {
                setShowDatePicker(!showDatePicker);
              }
            }} style={{
              fontFamily: F.sans, fontSize: 11, fontWeight: period === "custom" ? 500 : 400,
              color: period === "custom" ? C.bg : C.inkMuted,
              backgroundColor: period === "custom" ? C.ink : "transparent",
              border: `1px solid ${period === "custom" ? C.ink : C.rule}`,
              padding: "6px 16px", cursor: "pointer", marginLeft: -1,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>
              </svg>
              {period === "custom" && customApplied ? "Custom" : "Custom"}
            </button>

            {/* Date picker dropdown */}
            {showDatePicker && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 100,
                backgroundColor: C.surface, border: `1px solid ${C.rule}`,
                boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                padding: 0, minWidth: 300,
                animation: "fadeIn 0.2s ease",
              }}>
                {/* Header */}
                <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${C.rule}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ color: C.accent, fontSize: 12 }}>✦</span>
                    <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>Custom Range</span>
                  </div>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkMuted, lineHeight: 1.4 }}>
                    Select a date range to analyze your writing
                  </p>
                </div>

                {/* Date inputs */}
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 6 }}>From</label>
                    <input
                      type="date"
                      value={customFrom}
                      max={customTo}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      style={{
                        width: "100%", padding: "9px 12px",
                        fontFamily: F.sans, fontSize: 13, color: C.ink,
                        backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`,
                        outline: "none", cursor: "pointer",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 6 }}>To</label>
                    <input
                      type="date"
                      value={customTo}
                      min={customFrom}
                      onChange={(e) => setCustomTo(e.target.value)}
                      style={{
                        width: "100%", padding: "9px 12px",
                        fontFamily: F.sans, fontSize: 13, color: C.ink,
                        backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`,
                        outline: "none", cursor: "pointer",
                      }}
                    />
                  </div>

                  {/* Quick presets */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 600, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Quick Ranges</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {[
                        { label: "Last 7 days", from: "2026-02-09", to: "2026-02-15" },
                        { label: "Last 30 days", from: "2026-01-17", to: "2026-02-15" },
                        { label: "Last 90 days", from: "2025-11-18", to: "2026-02-15" },
                        { label: "This year", from: "2026-01-01", to: "2026-02-15" },
                        { label: "Last year", from: "2025-01-01", to: "2025-12-31" },
                        { label: "Dec–Feb", from: "2025-12-01", to: "2026-02-15" },
                      ].map((preset, i) => (
                        <button key={i} onClick={() => { setCustomFrom(preset.from); setCustomTo(preset.to); }} style={{
                          fontFamily: F.sans, fontSize: 10, color: customFrom === preset.from && customTo === preset.to ? C.accent : C.inkMuted,
                          backgroundColor: "transparent",
                          border: `1px solid ${customFrom === preset.from && customTo === preset.to ? C.accent : C.rule}`,
                          padding: "4px 10px", cursor: "pointer",
                          transition: "border-color 0.15s",
                        }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = C.ink}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = (customFrom === preset.from && customTo === preset.to ? C.accent : C.rule)}
                        >{preset.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Summary + Apply */}
                  <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: F.mono, fontSize: 11, color: C.inkMuted }}>{daysBetween(customFrom, customTo)} days selected</div>
                    </div>
                    <button onClick={() => {
                      setPeriod("custom");
                      setCustomApplied(true);
                      setShowDatePicker(false);
                      setAskAnswer(null);
                      setAskQuery("");
                    }} style={{
                      fontFamily: F.sans, fontSize: 11, fontWeight: 500,
                      color: C.bg, backgroundColor: C.ink,
                      border: "none", padding: "8px 20px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                      <span style={{ color: C.accent, fontSize: 10 }}>✦</span>
                      Analyze
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== MAIN GRID: primary (wide) + sidebar (narrow) ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 300px", gap: 0, borderTop: `2px solid ${C.ink}`, paddingTop: 20, marginTop: 16, animation: "fadeInUp 0.5s ease 0.1s both" }}>

        {/* ===== PRIMARY COLUMN ===== */}
        <div style={{ paddingRight: 28 }}>

          {/* Reflection */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <span style={{ color: C.accent, fontSize: 14 }}>✦</span>
              <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>{P.reflectionTitle}</span>
            </div>
            {P.reflection.map((p, i) => (
              <p key={i} style={{ fontFamily: F.body, fontSize: 16, lineHeight: 1.8, color: C.inkLight, marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: p }} />
            ))}
            <div style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkMuted, marginTop: 10 }}>— Your AI Editor</div>
          </div>

          <div style={{ height: 1, backgroundColor: C.rule, marginBottom: 24 }} />

          {/* Connections */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 14 }}>Connections You Might Not See</div>
            {P.connections.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < P.connections.length - 1 ? `1px solid ${C.rule}` : "none" }}>
                <span style={{ color: C.accent, fontSize: 10, flexShrink: 0, marginTop: 3 }}>✦</span>
                <p style={{ fontFamily: F.body, fontSize: 13, lineHeight: 1.6, color: C.inkLight }}>{c}</p>
              </div>
            ))}
          </div>

          <div style={{ height: 1, backgroundColor: C.rule, marginBottom: 24 }} />

          {/* Questions — grey bg */}
          <div style={{ backgroundColor: C.sectionBg, padding: "20px 20px", marginBottom: 24 }}>
            <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 14 }}>Questions From Your Editor</div>
            {P.questions.map((q, i) => (
              <div key={i} style={{
                fontFamily: F.body, fontSize: 13, lineHeight: 1.6, color: C.inkLight,
                padding: "10px 0", borderBottom: i < P.questions.length - 1 ? `1px solid ${C.rule}` : "none",
              }}>{q}</div>
            ))}
          </div>

          <div style={{ height: 1, backgroundColor: C.rule, marginBottom: 24 }} />

          {/* Ask Your Editor — interactive */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <span style={{ color: C.accent, fontSize: 14 }}>✦</span>
              <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>Ask Your Editor</span>
            </div>
            <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginBottom: 14, lineHeight: 1.5 }}>
              Ask anything about your writing, patterns, moods, or recurring themes. Your AI editor will search across all your entries.
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                value={askQuery}
                onChange={(e) => setAskQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                placeholder="e.g. When am I happiest? What do I write about Marina?"
                style={{
                  flex: 1, fontFamily: F.body, fontSize: 14, color: C.ink,
                  backgroundColor: "transparent", border: `1px solid ${C.rule}`,
                  padding: "10px 14px", outline: "none",
                }}
              />
              <button
                onClick={handleAsk}
                disabled={askLoading || !askQuery.trim()}
                style={{
                  fontFamily: F.sans, fontSize: 11, fontWeight: 500,
                  color: askQuery.trim() ? C.bg : C.inkFaint,
                  backgroundColor: askQuery.trim() ? C.ink : C.rule,
                  border: "none", padding: "10px 20px", cursor: askQuery.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {askLoading ? (
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: 12 }}>✦</span>
                ) : (
                  <>✦ Ask</>
                )}
              </button>
            </div>

            {/* Suggested questions */}
            {!askAnswer && !askLoading && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["When am I happiest?", "Tell me about Marina", "How has my writing changed?", "What role does São Paulo play?"].map((sq, i) => (
                  <button key={i} onClick={() => { setAskQuery(sq); }} style={{
                    fontFamily: F.sans, fontSize: 10, color: C.inkMuted,
                    backgroundColor: "transparent", border: `1px solid ${C.rule}`,
                    padding: "5px 10px", cursor: "pointer",
                  }}>{sq}</button>
                ))}
              </div>
            )}

            {/* Loading state */}
            {askLoading && (
              <div style={{ padding: "20px 0", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", animation: "spin 1.5s linear infinite", color: C.accent, fontSize: 14 }}>✦</span>
                <span style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted }}>
                  Searching across 847 entries...
                </span>
              </div>
            )}

            {/* Answer */}
            {askAnswer && (
              <div style={{ backgroundColor: C.sectionBg, padding: "20px 20px", animation: "fadeIn 0.4s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{ color: C.accent, fontSize: 12 }}>✦</span>
                  <span style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1px" }}>Your Editor's Answer</span>
                </div>
                <p style={{ fontFamily: F.body, fontSize: 14, lineHeight: 1.75, color: C.inkLight }}>{askAnswer}</p>
                <button onClick={() => { setAskAnswer(null); setAskQuery(""); }} style={{
                  fontFamily: F.sans, fontSize: 10, color: C.inkMuted, backgroundColor: "transparent",
                  border: `1px solid ${C.rule}`, padding: "4px 12px", cursor: "pointer", marginTop: 12,
                }}>Ask another question</button>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ backgroundColor: C.rule }} />

        {/* ===== SIDEBAR COLUMN ===== */}
        <div style={{ paddingLeft: 24 }}>

          {/* Mood Index */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 14 }}>Mood Index</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, marginBottom: 6 }}>
              {P.moods.map((d, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11 }}>{d.emoji}</span>
                  <div style={{ width: "100%", backgroundColor: C.accent, opacity: 0.2 + (d.val / 5) * 0.8, height: `${(d.val / 5) * 50}px` }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {P.moods.map((d, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center", fontFamily: F.sans, fontSize: 9, color: C.inkMuted }}>{d.day}</div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.rule}` }}>
              <div style={{ fontFamily: F.sans, fontSize: 9, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{P.trendLabel}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 36 }}>
                {P.trend.map((w, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div style={{ width: "100%", height: `${(w.v / 5) * 28}px`, backgroundColor: i === P.trend.length - 1 ? C.accent : C.ink, opacity: i === P.trend.length - 1 ? 1 : 0.15 }} />
                    <span style={{ fontFamily: F.sans, fontSize: 8, color: C.inkMuted }}>{w.w}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkMuted, marginTop: 8 }}>✦ {P.moodHint}</div>
            </div>
          </div>

          <div style={{ height: 1, backgroundColor: C.rule, marginBottom: 20 }} />

          {/* Recurring Themes */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>Recurring Themes</div>
            {P.themes.map((t, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "7px 0", borderBottom: i < P.themes.length - 1 ? `1px solid ${C.rule}` : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: F.sans, fontSize: 10, color: t.trend === "↑" ? C.accent : C.inkFaint }}>{t.trend}</span>
                  <span style={{ fontFamily: F.display, fontSize: 13, fontWeight: 600, color: C.ink }}>{t.theme}</span>
                </div>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.inkMuted }}>{t.count}</span>
              </div>
            ))}
          </div>

          <div style={{ height: 1, backgroundColor: C.rule, marginBottom: 20 }} />

          {/* Stats */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>{P.label} in Numbers</div>
            {P.stats.map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < P.stats.length - 1 ? `1px solid ${C.rule}` : "none" }}>
                <span style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted }}>{s.label}</span>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: C.ink }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}

// ============================================================
// SMALL COMPONENTS
// ============================================================
function Ticker({ C }) {
  const items = ["12-day writing streak", "MOOD: Optimism at 3-month high", "TRENDING: Permission, change, mushroom stroganoff", "THIS WEEK: 4,280 words"];
  const [o, setO] = useState(0);
  useEffect(() => { const i = setInterval(() => setO(p => p - 0.5), 30); return () => clearInterval(i); }, []);
  const t = items.join("     ·     ");
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.rule}`, overflow: "hidden", gap: 12 }}>
      <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: "#fff", backgroundColor: C.accent, padding: "3px 8px", letterSpacing: "1px", flexShrink: 0 }}>LIVE</span>
      <div style={{ overflow: "hidden", flex: 1 }}><div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, whiteSpace: "nowrap", transform: `translateX(${o}px)` }}>{t}{"     ·     "}{t}</div></div>
    </div>
  );
}

function EditionSwitcher({ C }) {
  const [a, setA] = useState("week");
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "12px 0", borderBottom: `1px solid ${C.rule}` }}>
      {[{ k: "week", l: "This Week" }, { k: "last", l: "Last Week" }, { k: "month", l: "This Month" }, { k: "archive", l: "All Editions" }].map((o) => (
        <button key={o.k} onClick={() => setA(o.k)} style={{ fontFamily: F.sans, fontSize: 11, fontWeight: a === o.k ? 500 : 400, color: a === o.k ? C.bg : C.inkMuted, backgroundColor: a === o.k ? C.ink : "transparent", border: `1px solid ${a === o.k ? C.ink : C.rule}`, padding: "6px 16px", cursor: "pointer", marginLeft: -1 }}>{o.l}</button>
      ))}
    </div>
  );
}

// ============================================================
// ADMIN PAGE — Tabbed admin panel (Prompts, Users, Dashboard)
// ============================================================
function AdminPage({ C, onClose, session }) {
  const [tab, setTab] = useState("prompts");
  const [saveMsg, setSaveMsg] = useState(null);

  const TABS = [
    { id: "prompts", label: "Prompts" },
    { id: "users", label: "Users" },
    { id: "dashboard", label: "Dashboard" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      backgroundColor: C.bg, display: "flex", flexDirection: "column",
      animation: "editorSlideIn 0.35s ease",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.rule}`, padding: "0 32px", height: 56,
        display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            fontFamily: F.sans, fontSize: 12, color: C.inkMuted,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back
          </button>
          <div style={{ width: 1, height: 20, backgroundColor: C.rule }} />
          <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>ADMIN</span>
          <div style={{ width: 1, height: 20, backgroundColor: C.rule }} />
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              fontFamily: F.sans, fontSize: 11, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? C.ink : C.inkMuted,
              background: "none", border: "none", cursor: "pointer",
              padding: "4px 8px",
              borderBottom: tab === t.id ? `2px solid ${C.ink}` : "2px solid transparent",
            }}>{t.label}</button>
          ))}
        </div>
        {saveMsg && <span style={{ fontFamily: F.sans, fontSize: 11, color: saveMsg.includes("Error") ? "#c41e1e" : C.accent }}>{saveMsg}</span>}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "32px" }}>
        <div style={{ maxWidth: tab === "dashboard" ? 1000 : 800, margin: "0 auto" }}>
          {tab === "prompts" && <AdminPromptsTab C={C} setSaveMsg={setSaveMsg} />}
          {tab === "users" && <AdminUsersTab C={C} session={session} setSaveMsg={setSaveMsg} />}
          {tab === "dashboard" && <AdminDashboardTab C={C} session={session} />}
        </div>
      </div>
    </div>
  );
}

// ── Admin: Prompts Tab ──────────────────────────────────────
function AdminPromptsTab({ C, setSaveMsg }) {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPrompts()
      .then(setPrompts)
      .catch((err) => console.error("Failed to load prompts:", err))
      .finally(() => setLoading(false));
  }, []);

  const startEdit = (prompt) => {
    setEditingId(prompt.id);
    setEditForm({
      system_prompt: prompt.system_prompt,
      model: prompt.model,
      temperature: prompt.temperature,
      max_tokens: prompt.max_tokens,
    });
    setSaveMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setSaveMsg(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const updated = await updatePrompt(editingId, {
        system_prompt: editForm.system_prompt,
        model: editForm.model,
        temperature: parseFloat(editForm.temperature),
        max_tokens: parseInt(editForm.max_tokens, 10),
      });
      setPrompts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      setEditingId(null);
      setSaveMsg("Saved successfully.");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      console.error("Failed to save prompt:", err);
      setSaveMsg("Error saving. Check console.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h1 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 4 }}>AI Prompts</h1>
      <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkMuted, marginBottom: 32 }}>
        Manage the system prompts used by the AI Editor. Changes take effect immediately.
      </p>

      {loading && <LoadingBlock C={C} text="Loading prompts..." />}

      {!loading && prompts.map((prompt) => (
        <div key={prompt.id} style={{
          border: `1px solid ${editingId === prompt.id ? C.accent : C.rule}`,
          marginBottom: 16, transition: "border-color 0.2s",
        }}>
          <div style={{
            padding: "16px 20px",
            backgroundColor: editingId === prompt.id ? C.accentBg : C.sectionBg,
            borderBottom: `1px solid ${C.rule}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.ink }}>{prompt.label}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkMuted, marginTop: 2 }}>{prompt.description}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: F.mono, fontSize: 10, color: C.inkFaint }}>{prompt.id}</span>
              {editingId !== prompt.id ? (
                <button onClick={() => startEdit(prompt)} style={{
                  fontFamily: F.sans, fontSize: 11, fontWeight: 500,
                  color: C.bg, backgroundColor: C.ink, border: "none",
                  padding: "5px 14px", cursor: "pointer",
                }}>Edit</button>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={handleSave} disabled={saving} style={{
                    fontFamily: F.sans, fontSize: 11, fontWeight: 500,
                    color: C.bg, backgroundColor: C.accent, border: "none",
                    padding: "5px 14px", cursor: saving ? "default" : "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}>{saving ? "Saving..." : "Save"}</button>
                  <button onClick={cancelEdit} style={{
                    fontFamily: F.sans, fontSize: 11, color: C.inkMuted,
                    background: "none", border: `1px solid ${C.rule}`,
                    padding: "5px 14px", cursor: "pointer",
                  }}>Cancel</button>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: "16px 20px" }}>
            {editingId === prompt.id ? (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 6 }}>System Prompt</label>
                  <textarea
                    value={editForm.system_prompt}
                    onChange={(e) => setEditForm({ ...editForm, system_prompt: e.target.value })}
                    style={{
                      width: "100%", minHeight: 200, padding: "12px",
                      fontFamily: F.mono, fontSize: 12, lineHeight: 1.6,
                      color: C.ink, backgroundColor: C.sectionBg,
                      border: `1px solid ${C.rule}`, outline: "none", resize: "vertical",
                    }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 6 }}>Model</label>
                    <input value={editForm.model} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} style={{ width: "100%", padding: "8px 10px", fontFamily: F.mono, fontSize: 12, color: C.ink, backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 6 }}>Temperature</label>
                    <input type="number" step="0.1" min="0" max="2" value={editForm.temperature} onChange={(e) => setEditForm({ ...editForm, temperature: e.target.value })} style={{ width: "100%", padding: "8px 10px", fontFamily: F.mono, fontSize: 12, color: C.ink, backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 6 }}>Max Tokens</label>
                    <input type="number" step="100" min="100" max="8000" value={editForm.max_tokens} onChange={(e) => setEditForm({ ...editForm, max_tokens: e.target.value })} style={{ width: "100%", padding: "8px 10px", fontFamily: F.mono, fontSize: 12, color: C.ink, backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, outline: "none" }} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <pre style={{
                  fontFamily: F.mono, fontSize: 11, lineHeight: 1.6,
                  color: C.inkLight, whiteSpace: "pre-wrap", wordBreak: "break-word",
                  maxHeight: 120, overflow: "hidden", marginBottom: 10,
                }}>{prompt.system_prompt}</pre>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.inkFaint }}>model: {prompt.model}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.inkFaint }}>temp: {prompt.temperature}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.inkFaint }}>max_tokens: {prompt.max_tokens}</span>
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

// ── Admin: Users Tab ────────────────────────────────────────
function AdminUsersTab({ C, session, setSaveMsg }) {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [testerFilter, setTesterFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [showAddUser, setShowAddUser] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", role: "reader", is_tester: false });
  const [adding, setAdding] = useState(false);
  const perPage = 20;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi(session, "list_users", {
        page, per_page: perPage, search: search || undefined,
        role_filter: roleFilter, tester_filter: testerFilter,
        sort_by: sortBy, sort_dir: sortDir,
      });
      setUsers(result.users || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }, [session, page, search, roleFilter, testerFilter, sortBy, sortDir]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminApi(session, "update_role", { user_id: userId, role: newRole });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      setSaveMsg("Role updated.");
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (err) {
      console.error("Failed to update role:", err);
      setSaveMsg("Error updating role.");
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const handleTesterToggle = async (userId, currentVal) => {
    const newVal = !currentVal;
    try {
      await adminApi(session, "toggle_tester", { user_id: userId, is_tester: newVal });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_tester: newVal } : u));
      setSaveMsg(newVal ? "Tester enabled." : "Tester disabled.");
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (err) {
      console.error("Failed to toggle tester:", err);
      setSaveMsg("Error toggling tester.");
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const handleAddUser = async () => {
    setAdding(true);
    try {
      await adminApi(session, "create_user", addForm);
      setSaveMsg("User created.");
      setTimeout(() => setSaveMsg(null), 3000);
      setShowAddUser(false);
      setAddForm({ name: "", email: "", role: "reader", is_tester: false });
      loadUsers();
    } catch (err) {
      console.error("Failed to create user:", err);
      setSaveMsg("Error: " + err.message);
      setTimeout(() => setSaveMsg(null), 4000);
    } finally {
      setAdding(false);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  const inputStyle = {
    padding: "7px 10px", fontFamily: F.sans, fontSize: 12, color: C.ink,
    backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, outline: "none",
  };
  const selectStyle = { ...inputStyle, cursor: "pointer" };

  const RoleBadge = ({ role, isTester }) => {
    const s = ROLE_BADGE_STYLES[role] || ROLE_BADGE_STYLES.reader;
    return (
      <span style={{
        display: "inline-block", padding: "2px 8px", fontFamily: F.sans, fontSize: 10,
        fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
        ...s,
        borderStyle: isTester ? "dashed" : (s.border ? undefined : "solid"),
        borderWidth: isTester && !s.border ? 1 : undefined,
        borderColor: isTester && !s.border ? s.backgroundColor : undefined,
      }}>
        {ROLE_LABELS[role] || role}
      </span>
    );
  };

  return (
    <>
      <h1 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Users</h1>
      <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkMuted, marginBottom: 24 }}>
        Manage user accounts, roles, and tester flags.
      </p>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="reader">Reader</option>
          <option value="editor">Editor</option>
          <option value="publisher">Publisher</option>
        </select>
        <select value={testerFilter} onChange={(e) => { setTesterFilter(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="all">All Users</option>
          <option value="testers">Testers Only</option>
        </select>
        <button onClick={() => setShowAddUser(true)} style={{
          fontFamily: F.sans, fontSize: 11, fontWeight: 600,
          color: C.bg, backgroundColor: C.ink, border: "none",
          padding: "8px 16px", cursor: "pointer",
        }}>+ Add User</button>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div style={{
          border: `1px solid ${C.accent}`, padding: 20, marginBottom: 20,
          backgroundColor: C.sectionBg,
        }}>
          <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 12 }}>Create New User</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <input placeholder="Name" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} style={inputStyle} />
            <input placeholder="Email" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} style={inputStyle} />
            <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })} style={selectStyle}>
              <option value="reader">Reader</option>
              <option value="editor">Editor</option>
              <option value="publisher">Publisher</option>
              <option value="admin">Admin</option>
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: F.sans, fontSize: 12, color: C.ink, cursor: "pointer" }}>
              <input type="checkbox" checked={addForm.is_tester} onChange={(e) => setAddForm({ ...addForm, is_tester: e.target.checked })} />
              Tester
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAddUser} disabled={adding || !addForm.name || !addForm.email} style={{
              fontFamily: F.sans, fontSize: 11, fontWeight: 500,
              color: C.bg, backgroundColor: C.accent, border: "none",
              padding: "6px 16px", cursor: adding ? "default" : "pointer",
              opacity: adding ? 0.7 : 1,
            }}>{adding ? "Creating..." : "Create User"}</button>
            <button onClick={() => setShowAddUser(false)} style={{
              fontFamily: F.sans, fontSize: 11, color: C.inkMuted,
              background: "none", border: `1px solid ${C.rule}`,
              padding: "6px 16px", cursor: "pointer",
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Users Table */}
      {loading ? <LoadingBlock C={C} text="Loading users..." /> : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.sans, fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.ink}` }}>
                  {[
                    { key: "name", label: "Name" },
                    { key: "email", label: "Email" },
                    { key: "role", label: "Role" },
                    { key: null, label: "Tester" },
                    { key: null, label: "Entries" },
                    { key: "created_at", label: "Joined" },
                  ].map((col) => (
                    <th key={col.label} onClick={col.key ? () => {
                      if (sortBy === col.key) setSortDir(sortDir === "asc" ? "desc" : "asc");
                      else { setSortBy(col.key); setSortDir("asc"); }
                    } : undefined} style={{
                      textAlign: "left", padding: "8px 10px", fontWeight: 600,
                      fontSize: 10, textTransform: "uppercase", letterSpacing: "1px",
                      color: C.inkMuted, cursor: col.key ? "pointer" : "default",
                      whiteSpace: "nowrap",
                    }}>
                      {col.label}
                      {col.key && sortBy === col.key && (sortDir === "asc" ? " ↑" : " ↓")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${C.rule}` }}>
                    <td style={{ padding: "10px 10px", color: C.ink, fontWeight: 500 }}>{u.name}</td>
                    <td style={{ padding: "10px 10px", color: C.inkLight, fontSize: 11 }}>{u.email}</td>
                    <td style={{ padding: "10px 10px" }}>
                      <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} style={{
                        fontFamily: F.sans, fontSize: 11, padding: "3px 6px",
                        color: C.ink, backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`,
                        cursor: "pointer", outline: "none",
                      }}>
                        <option value="reader">Reader</option>
                        <option value="editor">Editor</option>
                        <option value="publisher">Publisher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "center" }}>
                      <button onClick={() => handleTesterToggle(u.id, u.is_tester)} style={{
                        width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
                        backgroundColor: u.is_tester ? C.accent : C.rule,
                        position: "relative", transition: "background-color 0.2s",
                      }}>
                        <span style={{
                          position: "absolute", top: 2, left: u.is_tester ? 18 : 2,
                          width: 16, height: 16, borderRadius: 8,
                          backgroundColor: "#fff", transition: "left 0.2s",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        }} />
                      </button>
                    </td>
                    <td style={{ padding: "10px 10px", color: C.inkLight, textAlign: "center", fontFamily: F.mono, fontSize: 11 }}>{u.entry_count}</td>
                    <td style={{ padding: "10px 10px", color: C.inkMuted, fontSize: 11, whiteSpace: "nowrap" }}>
                      {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 30, textAlign: "center", color: C.inkMuted, fontStyle: "italic" }}>No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} style={{
                fontFamily: F.sans, fontSize: 11, padding: "6px 14px",
                background: "none", border: `1px solid ${C.rule}`,
                color: page <= 1 ? C.inkFaint : C.ink, cursor: page <= 1 ? "default" : "pointer",
              }}>← Prev</button>
              <span style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, padding: "6px 10px" }}>
                Page {page} of {totalPages} ({total} users)
              </span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} style={{
                fontFamily: F.sans, fontSize: 11, padding: "6px 14px",
                background: "none", border: `1px solid ${C.rule}`,
                color: page >= totalPages ? C.inkFaint : C.ink, cursor: page >= totalPages ? "default" : "pointer",
              }}>Next →</button>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── Admin: Dashboard Tab ────────────────────────────────────
function AdminDashboardTab({ C, session }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi(session, "dashboard_stats")
      .then(setStats)
      .catch((err) => console.error("Failed to load dashboard:", err))
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) return <LoadingBlock C={C} text="Loading dashboard..." />;
  if (!stats) return <p style={{ fontFamily: F.body, color: C.inkMuted }}>Failed to load dashboard data.</p>;

  const statCardStyle = {
    padding: "24px 20px", backgroundColor: C.sectionBg,
    border: `1px solid ${C.rule}`, textAlign: "center",
  };
  const bigNum = { fontFamily: F.display, fontSize: 36, fontWeight: 700, color: C.ink, lineHeight: 1.2 };
  const statLabel = { fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", marginTop: 6 };

  // Build 30-day chart data
  const today = new Date();
  const days30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    days30.push(d.toISOString().substring(0, 10));
  }

  const MiniBarChart = ({ data, label, color }) => {
    const values = days30.map((d) => data[d] || 0);
    const max = Math.max(...values, 1);
    return (
      <div style={{ border: `1px solid ${C.rule}`, padding: "16px 20px", backgroundColor: C.sectionBg }}>
        <div style={{ ...statLabel, marginTop: 0, marginBottom: 12 }}>{label}</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80 }}>
          {values.map((v, i) => (
            <div key={i} title={`${days30[i]}: ${v}`} style={{
              flex: 1, height: `${(v / max) * 100}%`, minHeight: v > 0 ? 3 : 1,
              backgroundColor: v > 0 ? (color || C.accent) : C.rule, transition: "height 0.3s",
            }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint }}>30d ago</span>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint }}>Today</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <h1 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Dashboard</h1>
      <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkMuted, marginBottom: 24 }}>
        Platform metrics at a glance.
      </p>

      {/* Row 1: Big numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={statCardStyle}>
          <div style={bigNum}>{stats.total_users}</div>
          <div style={statLabel}>Total Users</div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.inkFaint, marginTop: 4 }}>
            {Object.entries(stats.by_role || {}).map(([r, c]) => `${c} ${r}`).join(" · ")}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={bigNum}>{stats.active_this_week}</div>
          <div style={statLabel}>Active This Week</div>
        </div>
        <div style={statCardStyle}>
          <div style={bigNum}>{stats.entries_this_week}</div>
          <div style={statLabel}>Entries This Week</div>
        </div>
        <div style={statCardStyle}>
          <div style={bigNum}>{stats.total_entries}</div>
          <div style={statLabel}>Total Entries</div>
        </div>
      </div>

      {/* Row 2: Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <MiniBarChart data={stats.signups_by_day || {}} label="Signups (Last 30 Days)" color={C.ink} />
        <MiniBarChart data={stats.entries_by_day || {}} label="Entries (Last 30 Days)" color={C.accent} />
      </div>

      {/* Row 3: Lists */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Top Writers */}
        <div style={{ border: `1px solid ${C.rule}`, padding: "16px 20px", backgroundColor: C.sectionBg }}>
          <div style={{ ...statLabel, marginTop: 0, marginBottom: 12 }}>Top 10 Writers</div>
          {(stats.top_writers || []).map((w, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "6px 0", borderBottom: i < (stats.top_writers || []).length - 1 ? `1px solid ${C.rule}` : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.inkFaint, width: 16 }}>{i + 1}.</span>
                <span style={{ fontFamily: F.sans, fontSize: 12, color: C.ink, fontWeight: 500 }}>{w.name}</span>
                <span style={{
                  display: "inline-block", padding: "1px 6px", fontFamily: F.sans, fontSize: 9,
                  fontWeight: 600, textTransform: "uppercase",
                  ...(ROLE_BADGE_STYLES[w.role] || ROLE_BADGE_STYLES.reader),
                }}>{w.role}</span>
              </div>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.inkMuted }}>{w.entries} entries</span>
            </div>
          ))}
          {(!stats.top_writers || stats.top_writers.length === 0) && (
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.inkMuted, fontStyle: "italic" }}>No data yet.</div>
          )}
        </div>

        {/* Recent Signups */}
        <div style={{ border: `1px solid ${C.rule}`, padding: "16px 20px", backgroundColor: C.sectionBg }}>
          <div style={{ ...statLabel, marginTop: 0, marginBottom: 12 }}>Recent Signups</div>
          {(stats.recent_signups || []).map((s, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "6px 0", borderBottom: i < (stats.recent_signups || []).length - 1 ? `1px solid ${C.rule}` : "none",
            }}>
              <div>
                <div style={{ fontFamily: F.sans, fontSize: 12, color: C.ink, fontWeight: 500 }}>{s.name}</div>
                <div style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{s.email}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{
                  display: "inline-block", padding: "1px 6px", fontFamily: F.sans, fontSize: 9,
                  fontWeight: 600, textTransform: "uppercase",
                  ...(ROLE_BADGE_STYLES[s.role] || ROLE_BADGE_STYLES.reader),
                }}>{s.role}</span>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: C.inkFaint, marginTop: 2 }}>
                  {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
              </div>
            </div>
          ))}
          {(!stats.recent_signups || stats.recent_signups.length === 0) && (
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.inkMuted, fontStyle: "italic" }}>No signups yet.</div>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================
// ARTICLE VIEW — Full-screen reading experience
// ============================================================
function ArticleView({ entry, edition, onClose, onPrev, onNext, C, isProUser, siblingEntries, onNavigateToEntry }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setShowOriginal(false);
  }, [entry?.id]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!entry) return null;

  const SECTION_MAP = {
    dispatch: "Dispatch", essay: "Personal Essay", letter: "Letter to Self",
    review: "Review", photo: "Photo Essay",
  };
  const MOOD_MAP = [
    { emoji: "☀️", label: "Bright" }, { emoji: "🌤", label: "Calm" },
    { emoji: "🌧", label: "Heavy" }, { emoji: "⚡", label: "Electric" },
    { emoji: "🌙", label: "Reflective" },
  ];
  const SOURCE_MAP = { app: "App", telegram: "Telegram", whatsapp: "WhatsApp", api: "API" };

  const readTime = Math.max(1, Math.ceil((entry.word_count || 0) / 230));
  const hasAiEdit = entry.ai_edit?.applied;
  const showAiVersion = hasAiEdit && isProUser && !showOriginal;

  const headline = showAiVersion && entry.ai_edit.headline
    ? entry.ai_edit.headline
    : entry.title;
  const subhead = showAiVersion && entry.ai_edit.subhead
    ? entry.ai_edit.subhead
    : null;
  const bodyText = showAiVersion
    ? entry.ai_edit.edited_body
    : entry.body;
  const paragraphs = (bodyText || "").split("\n\n").filter(Boolean);

  const useDropCap = showAiVersion && entry.ai_edit?.mode === "rewrite";

  const photo = (entry.attachments || []).find((a) => a.type === "photo");

  const createdDate = new Date(entry.created_at);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dateStr = `${months[createdDate.getMonth()]} ${createdDate.getDate()}, ${createdDate.getFullYear()}`;

  const metaParts = [
    dateStr,
    `${readTime} min read`,
    `via ${SOURCE_MAP[entry.source] || entry.source}`,
  ];
  if (entry.mood != null && MOOD_MAP[entry.mood]) {
    metaParts.push(MOOD_MAP[entry.mood].emoji);
  }

  const edCtx = entry.edition || edition;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      backgroundColor: C.bg, display: "flex", flexDirection: "column",
      animation: "editorSlideIn 0.35s ease",
    }}>
      {/* HEADER BAR */}
      <div style={{
        borderBottom: `1px solid ${C.rule}`, padding: "0 32px", height: 56,
        display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          fontFamily: F.sans, fontSize: 12, color: C.inkMuted,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Back
        </button>
        <span style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, letterSpacing: "0.5px" }}>
          {edCtx ? `Vol. ${edCtx.volume} · No. ${edCtx.number || edCtx.num}` : "My Journal"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {entry.is_public ? (
            <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkFaint, display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2c-4 4.5-4 13.5 0 20"/><path d="M12 2c4 4.5 4 13.5 0 20"/><path d="M2 12h20"/><path d="M4 7h16"/><path d="M4 17h16"/></svg>
              Public
            </span>
          ) : (
            <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkFaint, display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Private
            </span>
          )}
        </div>
      </div>

      {/* SCROLLABLE BODY */}
      <div ref={scrollRef} style={{ flex: 1, overflow: "auto" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 80px" }}>
          {/* Section label */}
          <div style={{
            fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent,
            textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 16,
          }}>
            {SECTION_MAP[entry.section] || entry.section}
          </div>

          {/* Headline */}
          {headline && (
            <h1 style={{
              fontFamily: F.display, fontSize: 36, fontWeight: 700,
              lineHeight: 1.15, color: C.ink, marginBottom: subhead ? 12 : 16,
            }}>
              {headline}
            </h1>
          )}

          {/* Subhead */}
          {subhead && (
            <p style={{
              fontFamily: F.body, fontSize: 17, fontStyle: "italic",
              color: C.inkLight, lineHeight: 1.5, marginBottom: 16,
            }}>
              {subhead}
            </p>
          )}

          {/* Divider */}
          <div style={{ height: 2, backgroundColor: C.ink, width: 60, marginBottom: 16 }} />

          {/* Meta row */}
          <div style={{
            fontFamily: F.sans, fontSize: 11, color: C.inkMuted,
            marginBottom: hasAiEdit ? 8 : 32,
            display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
          }}>
            {metaParts.map((part, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <span style={{ color: C.rule }}>·</span>}
                {part}
              </span>
            ))}
          </div>

          {/* AI badge */}
          {hasAiEdit && (
            <div style={{
              fontFamily: F.sans, fontSize: 10, fontWeight: 500, color: C.accent,
              marginBottom: 32,
            }}>
              ✦ AI · {entry.ai_edit.tone || entry.ai_edit.mode}
            </div>
          )}

          {/* Photo */}
          {photo && (
            <div style={{ marginBottom: 32 }}>
              <div style={{
                width: "100%", height: 400, backgroundColor: C.sectionBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
              }}>
                {photo.url ? (
                  <img src={photo.url} alt={photo.metadata?.caption || ""}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.rule} strokeWidth="1">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                  </svg>
                )}
              </div>
              {photo.metadata?.caption && (
                <p style={{
                  fontFamily: F.body, fontSize: 11, fontStyle: "italic",
                  color: C.inkMuted, marginTop: 8,
                }}>
                  {photo.metadata.caption}
                </p>
              )}
            </div>
          )}

          {/* Toggle Original/Edited */}
          {hasAiEdit && isProUser && (
            <div style={{
              display: "flex", justifyContent: "flex-end", marginBottom: 20, gap: 0,
            }}>
              <button onClick={() => setShowOriginal(false)} style={{
                fontFamily: F.sans, fontSize: 10, fontWeight: showOriginal ? 400 : 600,
                color: showOriginal ? C.inkMuted : C.ink,
                backgroundColor: showOriginal ? "transparent" : C.sectionBg,
                border: `1px solid ${C.rule}`, padding: "5px 14px",
                cursor: "pointer", borderRight: "none",
              }}>Edited</button>
              <button onClick={() => setShowOriginal(true)} style={{
                fontFamily: F.sans, fontSize: 10, fontWeight: showOriginal ? 600 : 400,
                color: showOriginal ? C.ink : C.inkMuted,
                backgroundColor: showOriginal ? C.sectionBg : "transparent",
                border: `1px solid ${C.rule}`, padding: "5px 14px",
                cursor: "pointer",
              }}>Original</button>
            </div>
          )}

          {/* Original text notice */}
          {showOriginal && (
            <p style={{
              fontFamily: F.body, fontSize: 12, fontStyle: "italic",
              color: C.inkFaint, marginBottom: 20,
              animation: "fadeIn 0.3s ease",
            }}>
              This is your original text, before AI editing.
            </p>
          )}

          {/* Body text */}
          <div style={{ animation: "fadeIn 0.3s ease" }} key={showOriginal ? "original" : "edited"}>
            {paragraphs.map((p, i) => (
              <p key={i} style={{
                fontFamily: F.body, fontSize: 18, lineHeight: 1.85,
                color: C.inkLight, marginBottom: 20,
              }}>
                {i === 0 && useDropCap && !showOriginal && p.length > 0 ? (
                  <>
                    <span style={{
                      fontFamily: F.display, fontSize: 58, fontWeight: 700,
                      float: "left", lineHeight: 1, marginRight: 8,
                      color: C.ink,
                    }}>{p[0]}</span>
                    {p.slice(1)}
                  </>
                ) : p}
              </p>
            ))}
          </div>

          {/* ARTICLE FOOTER */}
          <div style={{ height: 1, backgroundColor: C.rule, margin: "40px 0 32px" }} />

          {/* Tags */}
          <div style={{
            display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32, alignItems: "center",
          }}>
            {entry.mood != null && MOOD_MAP[entry.mood] && (
              <span style={{
                fontFamily: F.sans, fontSize: 11, color: C.inkMuted,
                border: `1px solid ${C.rule}`, padding: "4px 10px",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                {MOOD_MAP[entry.mood].emoji} {MOOD_MAP[entry.mood].label}
              </span>
            )}
            <span style={{
              fontFamily: F.sans, fontSize: 10, fontWeight: 500, color: C.accent,
              textTransform: "uppercase", letterSpacing: "1px",
              border: `1px solid ${C.rule}`, padding: "4px 10px",
            }}>
              {SECTION_MAP[entry.section] || entry.section}
            </span>
            <span style={{
              fontFamily: F.mono, fontSize: 11, color: C.inkFaint,
            }}>
              {entry.word_count || 0} words
            </span>
          </div>

          {/* From this edition */}
          {siblingEntries && siblingEntries.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ height: 2, backgroundColor: C.ink, marginBottom: 16 }} />
              <h3 style={{
                fontFamily: F.sans, fontSize: 11, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "1.5px",
                color: C.inkMuted, marginBottom: 16,
              }}>From This Edition</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {siblingEntries.map((sib, i) => (
                  <div key={sib.id || i} style={{
                    padding: "14px 0",
                    borderBottom: i < siblingEntries.length - 1 ? `1px solid ${C.rule}` : "none",
                    cursor: "pointer",
                  }}
                    onClick={() => {
                      if (onNavigateToEntry) onNavigateToEntry(sib);
                    }}
                  >
                    <div style={{
                      fontFamily: F.sans, fontSize: 10, fontWeight: 600,
                      color: C.accent, textTransform: "uppercase",
                      letterSpacing: "1.5px", marginBottom: 4,
                    }}>
                      {SECTION_MAP[sib.section] || sib.section}
                    </div>
                    <h4 style={{
                      fontFamily: F.display, fontSize: 16, fontWeight: 600,
                      lineHeight: 1.3, color: C.ink, marginBottom: 4,
                    }}>
                      {sib.title || (sib.body ? sib.body.slice(0, 60) + "..." : "Untitled")}
                    </h4>
                    <span style={{
                      fontFamily: F.sans, fontSize: 10, color: C.inkFaint,
                    }}>
                      {Math.max(1, Math.ceil((sib.word_count || 0) / 230))} min read
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation: prev/next */}
          <div style={{
            display: "flex", justifyContent: "space-between", paddingTop: 20,
            borderTop: `1px solid ${C.rule}`,
          }}>
            {onPrev ? (
              <button onClick={onPrev} style={{
                display: "flex", alignItems: "center", gap: 6,
                fontFamily: F.sans, fontSize: 12, color: C.inkMuted,
                background: "none", border: "none", cursor: "pointer",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                Previous
              </button>
            ) : <div />}
            {onNext ? (
              <button onClick={onNext} style={{
                display: "flex", alignItems: "center", gap: 6,
                fontFamily: F.sans, fontSize: 12, color: C.inkMuted,
                background: "none", border: "none", cursor: "pointer",
              }}>
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
              </button>
            ) : <div />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN
// ============================================================
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState(undefined); // undefined=loading, null=logged out, object=logged in
  const [mode, setMode] = useState("light");
  const [accent, setAccent] = useState("red");
  const [editorOpen, setEditorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [articleEntry, setArticleEntry] = useState(null);
  const [articleList, setArticleList] = useState([]);
  const [articleIndex, setArticleIndex] = useState(0);
  const [pubName, setPubName] = useState("The Deborah Times");
  const [motto, setMotto] = useState("All the life that's fit to print");
  const [view, setView] = useState("journal"); // journal | edition | archives | sections | reflections

  // Auth: check session on mount + listen for changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [editionData, setEditionData] = useState(null);
  const [editionLoading, setEditionLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);

  const handleRefresh = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  const openArticle = useCallback((entry, list, index) => {
    setArticleEntry(entry);
    setArticleList(list || []);
    setArticleIndex(typeof index === "number" ? index : 0);
  }, []);

  const closeArticle = useCallback(() => {
    setArticleEntry(null);
    setArticleList([]);
    setArticleIndex(0);
  }, []);

  const goArticlePrev = useCallback(() => {
    if (articleIndex > 0 && articleList[articleIndex - 1]) {
      setArticleIndex(articleIndex - 1);
      setArticleEntry(articleList[articleIndex - 1]);
    }
  }, [articleIndex, articleList]);

  const goArticleNext = useCallback(() => {
    if (articleIndex < articleList.length - 1 && articleList[articleIndex + 1]) {
      setArticleIndex(articleIndex + 1);
      setArticleEntry(articleList[articleIndex + 1]);
    }
  }, [articleIndex, articleList]);

  const openEditionArticle = useCallback(async (entryId) => {
    if (!editionData?.edition?.id) return;
    try {
      const entries = await fetchEditionEntriesFull(editionData.edition.id);
      const idx = entries.findIndex((e) => e.id === entryId);
      openArticle(entries[idx >= 0 ? idx : 0], entries, idx >= 0 ? idx : 0);
    } catch (err) {
      console.error("Failed to load article:", err);
    }
  }, [editionData, openArticle]);

  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);
  const C = getTheme(mode, accent);

  // Build user object from session + profile
  const authUser = session?.user;
  const userId = authUser?.id;
  const user = {
    name: profile?.name || authUser?.user_metadata?.name || authUser?.email?.split("@")[0] || "User",
    email: profile?.email || authUser?.email || "",
    role: profile?.role || "reader",
    isTester: profile?.is_tester || false,
    avatar: (profile?.name || authUser?.user_metadata?.name || authUser?.email?.split("@")[0] || "U")[0].toUpperCase(),
  };

  // Fetch profile + edition data after auth
  useEffect(() => {
    if (!userId) return;
    fetchProfile(userId)
      .then((p) => {
        setProfile(p);
        if (p.publication_name) setPubName(p.publication_name);
        if (p.motto) setMotto(p.motto);
        if (p.theme_mode) setMode(p.theme_mode);
        if (p.theme_accent) setAccent(p.theme_accent);
      })
      .catch(console.error);

    setEditionLoading(true);
    fetchLatestEdition(userId)
      .then(setEditionData)
      .catch(console.error)
      .finally(() => setEditionLoading(false));
  }, [userId, dataVersion]);

  // Loading state
  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
        <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease" }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: "#121212" }}>The Hauss</div>
        </div>
      </div>
    );
  }

  // Not logged in — show landing page or auth page
  if (!session) {
    const isLoginPath = window.location.pathname === "/login" || window.location.pathname === "/signup";
    if (isLoginPath) return <AuthPage />;
    return <LandingPage />;
  }

  return (
    <div style={{ backgroundColor: C.bg, color: C.ink, minHeight: "100vh", opacity: loaded ? 1 : 0, transition: "opacity 0.6s ease, background-color 0.4s ease, color 0.4s ease" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,300;1,8..60,400;1,8..60,500&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@300;400&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::selection { background: ${C.ink}; color: ${C.bg}; }
        a { color: inherit; text-decoration: none; } a:hover { text-decoration: underline; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes editorSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sidebarIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        textarea::placeholder, input::placeholder { color: ${C.inkFaint}; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${C.rule}; border-radius: 3px; }
      `}</style>

      <PlatformHeader user={user} C={C} onSettings={() => setSettingsOpen(true)} onEditor={() => setEditorOpen(true)} onAdmin={() => setAdminOpen(true)} isAdmin={user.role === "admin"} />

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px" }}>

        {/* NAV — always in same position, sticky subheader */}
        <nav style={{
          display: "flex", justifyContent: "center", gap: 24, padding: "12px 0",
          borderBottom: `1px solid ${C.rule}`,
          position: "sticky", top: 48, zIndex: 800,
          backgroundColor: C.bg, transition: "background-color 0.4s ease",
        }}>
          {[
            { key: "journal", label: "My Journal" },
            { key: "edition", label: "Last Edition" },
            { key: "archives", label: "Archives" },
            { key: "sections", label: "Sections" },
            { key: "reflections", label: "Reflections" },
          ].map((item) => (
            <button key={item.key} onClick={() => setView(item.key)} style={{
              fontFamily: F.sans, fontSize: 11, fontWeight: 500,
              color: view === item.key ? C.ink : C.inkMuted,
              textTransform: "uppercase", letterSpacing: "1px",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: view === item.key ? `2px solid ${C.accent}` : "2px solid transparent",
              padding: "0 0 8px",
            }}>{item.key === "reflections" ? `✦ ${item.label}` : item.label}</button>
          ))}
        </nav>

        {/* CONDITIONAL VIEW */}
        {view === "journal" ? (
          <JournalView C={C} userId={userId} onSwitchToEdition={() => setView("edition")} onNewEntry={() => setEditorOpen(true)} dataVersion={dataVersion} onOpenArticle={openArticle} />
        ) : view === "archives" ? (
          <ArchivesView C={C} userId={userId} />
        ) : view === "sections" ? (
          <SectionsView C={C} userId={userId} onOpenArticle={openArticle} />
        ) : view === "reflections" ? (
          <ReflectionsView C={C} userId={userId} />
        ) : (
        <div>
        {editionLoading ? <LoadingBlock C={C} text="Loading latest edition..." /> : !editionData ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontFamily: F.body, fontSize: 14, color: C.inkMuted }}>No editions yet. Start writing!</p>
          </div>
        ) : (<>
        {/* MASTHEAD — inside edition view */}
        <header style={{ textAlign: "center", padding: "20px 0 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, flex: 1 }}>
              <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>Week of {editionData.edition.week}</span>
              <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>São Paulo · 28°C</span>
            </div>
            <div style={{ flex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: "100%", height: 2, backgroundColor: C.ruleDark }} />
              <h1 style={{ fontFamily: F.display, fontSize: 40, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1, margin: "8px 0", color: C.ink }}>{pubName}</h1>
              <div style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkMuted, marginBottom: 8, letterSpacing: "0.5px" }}>{motto}</div>
              <div style={{ width: "100%", height: 2, backgroundColor: C.ruleDark }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flex: 1 }}>
              <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{editionData.edition.number}</span>
              <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{editionData.edition.entryCount} entries</span>
            </div>
          </div>
        </header>
        <Ticker C={C} />
        <EditionSwitcher C={C} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 340px", padding: "24px 0", animation: "fadeInUp 0.6s ease 0.2s both" }}>
          <div style={{ paddingRight: 28 }}>
            {editionData.topStories[0] && <article onClick={() => openEditionArticle(editionData.topStories[0].id)} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>{editionData.topStories[0].section}</span>
                {editionData.topStories[0].isPublic && <span style={{ fontFamily: F.sans, fontSize: 9, color: C.inkFaint, display: "flex", alignItems: "center", gap: 3 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2c-4 4.5-4 13.5 0 20"/><path d="M12 2c4 4.5 4 13.5 0 20"/><path d="M2 12h20"/><path d="M4 7h16"/><path d="M4 17h16"/></svg> Public</span>}
                {editionData.topStories[0].aiEdited && <span style={{ fontFamily: F.sans, fontSize: 9, color: C.accent, display: "flex", alignItems: "center", gap: 3 }}>✦ AI</span>}
              </div>
              <h2 style={{ fontFamily: F.display, fontSize: 30, fontWeight: 700, lineHeight: 1.15, color: C.ink, marginBottom: 10 }}>{editionData.topStories[0].headline}</h2>
              <p style={{ fontFamily: F.body, fontSize: 15, fontStyle: "italic", color: C.inkLight, lineHeight: 1.5, marginBottom: 16 }}>{editionData.topStories[0].subhead}</p>
              <div style={{ backgroundColor: C.sectionBg, height: 200, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.rule} strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              </div>
              <p style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.7, color: C.inkLight, marginBottom: 12 }}>{editionData.topStories[0].excerpt}</p>
              <div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, display: "flex", gap: 6 }}>
                <span>{editionData.topStories[0].readTime}</span><span style={{ color: C.rule }}>·</span><span>{editionData.topStories[0].date}</span><span style={{ color: C.rule }}>·</span><span style={{ fontStyle: "italic", color: C.inkFaint }}>via {editionData.topStories[0].source === "telegram" ? "Telegram" : "App"}</span>
              </div>
            </article>}
            {editionData.topStories[1] && <><div style={{ height: 1, backgroundColor: C.rule, margin: "24px 0" }} />
            <article onClick={() => openEditionArticle(editionData.topStories[1].id)} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>{editionData.topStories[1].section}</span>
                {editionData.topStories[1].isPublic ? <span style={{ fontFamily: F.sans, fontSize: 9, color: C.inkFaint, display: "flex", alignItems: "center", gap: 3 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2c-4 4.5-4 13.5 0 20"/><path d="M12 2c4 4.5 4 13.5 0 20"/><path d="M2 12h20"/><path d="M4 7h16"/><path d="M4 17h16"/></svg> Public</span> : <span style={{ fontFamily: F.sans, fontSize: 9, color: C.inkFaint, display: "flex", alignItems: "center", gap: 3 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Private</span>}
              </div>
              <h3 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: C.ink, marginBottom: 8 }}>{editionData.topStories[1].headline}</h3>
              <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkLight, marginBottom: 8 }}>{editionData.topStories[1].subhead}</p>
              <p style={{ fontFamily: F.body, fontSize: 14, lineHeight: 1.65, color: C.inkLight, marginBottom: 10 }}>{editionData.topStories[1].excerpt}</p>
              <div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, display: "flex", gap: 6 }}>
                <span>{editionData.topStories[1].readTime}</span><span style={{ color: C.rule }}>·</span><span>{editionData.topStories[1].date}</span><span style={{ color: C.rule }}>·</span><span style={{ fontStyle: "italic", color: C.inkFaint }}>via {editionData.topStories[1].source === "telegram" ? "Telegram" : "App"}</span>
              </div>
            </article></>}
          </div>
          <div style={{ backgroundColor: C.rule }} />
          <div style={{ paddingLeft: 28 }}>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 4 }}>The Week at a Glance</h3>
              <div style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: C.inkMuted, marginBottom: 10 }}>{editionData.edition.week}</div>
              <div style={{ height: 2, backgroundColor: C.accent, marginBottom: 14, width: 40 }} />
              {editionData.briefing.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.rule}` }}>
                  <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.inkMuted, whiteSpace: "nowrap", minWidth: 30 }}>{item.day}</span>
                  <span style={{ fontFamily: F.body, fontSize: 13, lineHeight: 1.5, color: C.inkLight }}>{item.note}</span>
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: C.sectionBg, padding: 20, marginBottom: 24 }}>
              <div style={{ fontFamily: F.display, fontSize: 18, color: C.accent, marginBottom: 8 }}>✦</div>
              <h3 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, fontStyle: "italic", color: C.ink, marginBottom: 10 }}>{editionData.editorial.headline}</h3>
              <p style={{ fontFamily: F.body, fontSize: 13, lineHeight: 1.65, color: C.inkLight, marginBottom: 12 }}>{editionData.editorial.content}</p>
              <div style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: C.inkMuted }}>— AI Editor</div>
            </div>
            <div>
              <h3 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 10 }}>All Sections</h3>
              <div style={{ height: 2, backgroundColor: C.accent, marginBottom: 14, width: 40 }} />
              {editionData.sections.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.rule}` }}>
                  <span style={{ fontFamily: F.sans, fontSize: 12, color: C.inkLight }}>{s.name}</span>
                  <span style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, backgroundColor: C.sectionBg, padding: "2px 8px" }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {editionData.moreStories.length > 0 && <div style={{ marginBottom: 24 }}>
          <div style={{ height: 2, backgroundColor: C.ink, marginBottom: 16 }} />
          <h3 style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: C.inkMuted, marginBottom: 16 }}>Also in This Edition</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {editionData.moreStories.map((s, i) => (
              <div key={i} onClick={() => openEditionArticle(s.id)} style={{ borderRight: i < editionData.moreStories.length - 1 ? `1px solid ${C.rule}` : "none", paddingRight: 24, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>{s.section}</span>
                  {s.isPublic ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.inkFaint} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2c-4 4.5-4 13.5 0 20"/><path d="M12 2c4 4.5 4 13.5 0 20"/><path d="M2 12h20"/><path d="M4 7h16"/><path d="M4 17h16"/></svg> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.inkFaint} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
                </div>
                <h4 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, lineHeight: 1.25, color: C.ink, marginBottom: 8 }}>{s.headline}</h4>
                <span style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted }}>{s.readTime}</span>
              </div>
            ))}
          </div>
        </div>}

        <div style={{ display: "flex", justifyContent: "center", padding: "20px 0", borderTop: `2px solid ${C.ink}`, borderBottom: `1px solid ${C.rule}`, marginBottom: 24 }}>
          {[{ n: editionData.stats.totalEntries.toLocaleString(), l: "Total Entries" }, { n: editionData.stats.thisEdition, l: "This Edition" }, { n: editionData.stats.editions, l: "Editions" }, { n: editionData.stats.wordsThisWeek.toLocaleString(), l: "Words This Week" }].map((s, i, a) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 32px" }}>
                <span style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.ink }}>{s.n}</span>
                <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", marginTop: 4 }}>{s.l}</span>
              </div>
              {i < a.length - 1 && <div style={{ width: 1, height: 36, backgroundColor: C.rule }} />}
            </div>
          ))}
        </div>

        </>)}
        </div>
        )}

        <footer style={{ paddingBottom: 40 }}>
          <div style={{ height: 1, backgroundColor: C.rule, marginBottom: 16 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 600, color: C.ink, display: "block" }}>{pubName}</span>
              <span style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkMuted }}>Powered by The Hauss</span>
            </div>
            <div style={{ display: "flex", gap: 20 }}>{["Export", "Privacy", "Help"].map((l, i) => <span key={i} style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, cursor: "pointer" }}>{l}</span>)}</div>
          </div>
        </footer>
      </div>

      {editorOpen && <EditorView onClose={() => setEditorOpen(false)} onPublished={handleRefresh} C={C} userId={userId} session={session} />}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} C={C} mode={mode} setMode={setMode} accent={accent} setAccent={setAccent} pubName={pubName} setPubName={setPubName} motto={motto} setMotto={setMotto} userId={userId} />
      {adminOpen && <AdminPage C={C} onClose={() => setAdminOpen(false)} session={session} />}
      {articleEntry && (
        <ArticleView
          entry={articleEntry}
          edition={articleEntry.edition || null}
          onClose={closeArticle}
          onPrev={articleIndex > 0 ? goArticlePrev : null}
          onNext={articleIndex < articleList.length - 1 ? goArticleNext : null}
          C={C}
          isProUser={hasAccess(user.role, user.isTester, "editor")}
          siblingEntries={articleList.filter((_, i) => i !== articleIndex).slice(0, 3)}
          onNavigateToEntry={(sib) => {
            const idx = articleList.findIndex((e) => e.id === sib.id);
            if (idx >= 0) {
              setArticleIndex(idx);
              setArticleEntry(articleList[idx]);
            }
          }}
        />
      )}
    </div>
  );
}
