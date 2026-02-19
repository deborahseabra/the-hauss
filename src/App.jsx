import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";
import AuthPage from "./AuthPage";
import LandingPage from "./LandingPage";
import {
  fetchProfile,
  fetchJournal,
  fetchEditionByOffset,
  fetchEditionById,
  fetchAllEditions,
  fetchSections,
  fetchAllReflections,
  fetchReflection,
  getReflection,
  fetchAskEditorUsage,
  submitAskEditorQuestion,
  createEntry,
  updateEntry,
  fetchEntryFull,
  updateProfile,
  fetchEntries,
  fetchEntriesFull,
  fetchEditionEntriesFull,
  ARTICLE_SECTION_LABELS,
  SECTION_LABELS,
  SECTION_UPPER,
  getReadTime,
  isEntrySealed,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchPrompts,
  updatePrompt,
  fetchUsageLimits,
  updateUsageLimit,
  uploadAttachment,
  createAttachments,
  adminApi,
  fetchPublicEntry,
  fetchPublicProfile,
  fetchPublicEdition,
  updateEditionSharing,
  fetchUserEntriesForBuilder,
  fetchPhotoAttachmentsForEntries,
  createCustomEdition,
  fetchEditionLinks,
  fetchCityWeather,
} from "./lib/api";
import { hasAccess, ROLE_LABELS, ROLE_BADGE_STYLES } from "./lib/access";
import CityField from "./components/CityField";
import RichTextEditor from "./components/RichTextEditor";
import RichTextContent, { stripHtml } from "./components/RichTextContent";

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
          <span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: C.ink, textTransform: "uppercase", letterSpacing: "1px" }}>Editor</span>
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
              <RichTextContent text={result.body} C={C} fontSize={14} />

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
  const [suggestions, setSuggestions] = useState([]);
  const [geoStatus, setGeoStatus] = useState(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    setGeoStatus("detecting");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const rlat = pos.coords.latitude;
        const rlng = pos.coords.longitude;
        setLat(String(rlat));
        setLng(String(rlng));
        try {
          const res = await fetch(`https://photon.komoot.io/reverse?lat=${rlat}&lon=${rlng}`);
          const data = await res.json();
          if (data.features?.length > 0) {
            const p = data.features[0].properties;
            const placeName = [p.name, p.city || p.town || p.village, p.country].filter(Boolean).join(", ");
            setName(placeName);
          }
          setGeoStatus("done");
        } catch {
          setGeoStatus("done");
        }
      },
      () => setGeoStatus("denied"),
      { timeout: 8000 }
    );
  }, []);

  const handleSearch = (query) => {
    setName(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        setSuggestions((data.features || []).map((f) => {
          const p = f.properties;
          const label = [p.name, p.city || p.town || p.village, p.state, p.country].filter(Boolean).join(", ");
          return { label, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
        }));
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  const selectSuggestion = (s) => {
    setName(s.label);
    setLat(String(s.lat));
    setLng(String(s.lng));
    setSuggestions([]);
  };

  const inputStyle = { width: "100%", padding: "6px 8px", fontFamily: F.sans, fontSize: 11, color: C.ink, backgroundColor: C.bg, border: `1px solid ${C.rule}`, outline: "none" };

  return (
    <div style={{ marginTop: 8, padding: "10px", backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, animation: "fadeIn 0.2s ease" }}>
      {geoStatus === "detecting" && (
        <div style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted, marginBottom: 6 }}>Detecting your location...</div>
      )}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search for a place..."
          style={{ ...inputStyle, marginBottom: suggestions.length > 0 ? 0 : 6 }}
        />
        {suggestions.length > 0 && (
          <div style={{
            position: "absolute", left: 0, right: 0, top: "100%", zIndex: 10,
            backgroundColor: C.bg, border: `1px solid ${C.rule}`, borderTop: "none",
            maxHeight: 160, overflowY: "auto",
          }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => selectSuggestion(s)} style={{
                display: "block", width: "100%", textAlign: "left", padding: "6px 8px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: F.sans, fontSize: 10, color: C.inkLight,
                borderBottom: i < suggestions.length - 1 ? `1px solid ${C.rule}` : "none",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.sectionBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span style={{ fontWeight: 500, color: C.ink }}>{s.label.split(",")[0]}</span>
                {s.label.includes(",") && <span style={{ color: C.inkMuted }}>, {s.label.split(",").slice(1).join(",")}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {lat && lng && (
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint, marginBottom: 6, marginTop: 4 }}>
          {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
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

function EditorView({ onClose, onPublished, C, userId, session, initialEntry }) {
  const isEdit = Boolean(initialEntry);
  const [text, setText] = useState(isEdit ? (initialEntry.body || "") : "");
  const [title, setTitle] = useState(isEdit ? (initialEntry.title || "") : "");
  const [subhead, setSubhead] = useState(isEdit ? (initialEntry.subhead || "") : "");
  const [section, setSection] = useState(isEdit ? (initialEntry.section || "dispatch") : "dispatch");
  const [letterOpenAt, setLetterOpenAt] = useState(isEdit && initialEntry.letter_open_at ? initialEntry.letter_open_at.slice(0, 10) : "");
  const [mood, setMood] = useState(isEdit ? initialEntry.mood ?? null : null);
  const [isPublic, setIsPublic] = useState(isEdit ? (initialEntry.is_public || false) : false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiKey, setAiKey] = useState(0);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [attachPanel, setAttachPanel] = useState(null); // null | 'location' | 'link'
  const [photoUploading, setPhotoUploading] = useState(false);
  const [headlineLoading, setHeadlineLoading] = useState(false);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const plainText = editorRef.current ? editorRef.current.getText() : text.replace(/<[^>]*>/g, "");
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;

  const handleEditorChange = useCallback((html) => {
    setText(html);
  }, []);
  handleEditorChange._setEditor = (ed) => { editorRef.current = ed; };

  const handleUploadImage = useCallback(async (file) => {
    const url = await uploadAttachment(userId, file);
    return url;
  }, [userId]);

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

  const handleSuggestHeadline = useCallback(async () => {
    const bodyText = editorRef.current ? editorRef.current.getText() : text.replace(/<[^>]*>/g, "");
    if (!bodyText.trim() || bodyText.trim().length < 20) return;
    setHeadlineLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-editor`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ text: bodyText, mode: "headline" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate headline");
      }
      const data = await res.json();
      if (data.headline) setTitle(data.headline);
    } catch (err) {
      console.error("Headline suggestion error:", err);
    } finally {
      setHeadlineLoading(false);
    }
  }, [session?.access_token, text]);

  const handleApplyAi = (result) => {
    const toHtml = (t) => t.split("\n\n").filter(Boolean).map((p) => `<p>${p}</p>`).join("");
    if (result.mode === "rewrite") {
      if (result.headline) setTitle(result.headline);
      if (result.subhead) setSubhead(result.subhead);
      setText(toHtml(result.body));
      if (result.tone === "intimate") setSection("essay");
      if (result.tone === "literary") setSection("essay");
      if (result.tone === "journalistic") setSection("dispatch");
    } else {
      setText(toHtml(result.body));
    }
    setAiKey(k => k + 1);
  };

  const handlePublish = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      if (isEdit) {
        await updateEntry({
          entryId: initialEntry.id,
          userId,
          title: title.trim() || null,
          subhead: subhead.trim() || null,
          body: text,
          section,
          mood,
          isPublic,
          letterOpenAt: section === "letter" && letterOpenAt ? letterOpenAt : null,
        });
        if (pendingAttachments.length > 0) {
          await createAttachments(initialEntry.id, userId, pendingAttachments);
        }
        const updated = await fetchEntryFull(userId, initialEntry.id);
        setShowSuccess(true);
        if (onPublished) onPublished(updated);
      } else {
        const entry = await createEntry({
          userId,
          title: title.trim() || null,
          subhead: subhead.trim() || null,
          body: text,
          section,
          mood,
          isPublic,
          source: "app",
          letterOpenAt: section === "letter" && letterOpenAt ? letterOpenAt : null,
        });
        if (pendingAttachments.length > 0) {
          await createAttachments(entry.id, userId, pendingAttachments);
        }
        setShowSuccess(true);
        if (onPublished) onPublished();
      }
    } catch (err) {
      console.error("Failed to save entry:", err);
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
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, backgroundColor: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s ease" }}>
      <div style={{
        backgroundColor: C.surface, maxWidth: 380, width: "90%", padding: 32, boxShadow: "0 12px 48px rgba(0,0,0,0.15)", border: `1px solid ${C.rule}`, animation: "fadeIn 0.25s ease",
      }}>
        <div style={{ fontSize: 36, marginBottom: 16, color: C.accent }}>✦</div>
        <h2 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.ink, marginBottom: 8 }}>{isEdit ? "Saved" : "Published"}</h2>
        <p style={{ fontFamily: F.body, fontSize: 15, fontStyle: "italic", color: C.inkMuted, marginBottom: 8 }}>{isEdit ? "Your changes have been saved." : "Your entry will appear in this week's edition."}</p>
        {!isEdit && isPublic && <p style={{ fontFamily: F.sans, fontSize: 12, color: C.accent, marginBottom: 24 }}>🌐 Visible at thehauss.me/deborah</p>}
        {!isEdit && !isPublic && <p style={{ fontFamily: F.sans, fontSize: 12, color: C.inkFaint, marginBottom: 24 }}>🔒 Private — only you can see this</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.inkMuted, border: `1px solid ${C.rule}`, backgroundColor: "transparent", padding: "10px 24px", cursor: "pointer" }}>Close</button>
          <button onClick={() => { setShowSuccess(false); setText(""); setTitle(""); setSubhead(""); setMood(null); setAiKey(k => k + 1); }} style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.bg, backgroundColor: C.ink, border: "none", padding: "10px 24px", cursor: "pointer" }}>Write Another</button>
        </div>
      </div>
    </div>
  );

  return (
    <div data-editor-root style={{ position: "fixed", inset: 0, zIndex: 2000, backgroundColor: C.bg, display: "flex", flexDirection: "column", animation: "editorSlideIn 0.35s ease" }}>
      {/* HEADER */}
      <div style={{ borderBottom: `1px solid ${C.rule}`, padding: "0 32px", height: 56, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: F.sans, fontSize: 12, color: C.inkMuted }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back
          </button>
          <div style={{ width: 1, height: 20, backgroundColor: C.rule }} />
          <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>{isEdit ? "EDIT ENTRY" : "NEW ENTRY"}</span>
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
          }}>{isSaving ? (isEdit ? "Saving..." : "Publishing...") : (isEdit ? "Save" : "Publish")}</button>
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
              <div style={{ position: "relative", marginBottom: 8 }}>
                <textarea value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline" rows={1} style={{
                  width: "100%", border: "none", outline: "none", fontFamily: F.display, fontSize: 32, fontWeight: 700,
                  color: C.ink, backgroundColor: "transparent", lineHeight: 1.2, padding: 0, paddingRight: 32,
                  resize: "none", minHeight: 40, overflow: "hidden",
                }} />
                {session && plainText.trim().length >= 20 && (
                  <button
                    onClick={handleSuggestHeadline}
                    disabled={headlineLoading}
                    title="Suggest headline"
                    style={{
                      position: "absolute", top: "50%", right: 0, transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: headlineLoading ? "default" : "pointer",
                      padding: 4, opacity: headlineLoading ? 0.5 : 0.35,
                      fontFamily: F.sans, fontSize: 12, color: C.inkMuted,
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => { if (!headlineLoading) e.currentTarget.style.opacity = "0.8"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = headlineLoading ? "0.5" : "0.35"; }}
                  >
                    {headlineLoading ? "…" : "✦"}
                  </button>
                )}
              </div>
              <input value={subhead} onChange={(e) => setSubhead(e.target.value)} placeholder="Subtitle (optional)" style={{
                width: "100%", border: "none", outline: "none", fontFamily: F.body, fontSize: 15, fontStyle: "italic",
                color: C.inkLight, backgroundColor: "transparent", lineHeight: 1.5, padding: 0, marginBottom: 8,
              }} />
              <div style={{ height: 2, backgroundColor: C.ink, width: 60, marginBottom: 28 }} />
              <RichTextEditor
                value={text}
                onChange={handleEditorChange}
                placeholder="Write freely. What happened? What are you thinking about?"
                C={C}
                onUploadImage={handleUploadImage}
              />
            </div>
          </div>

          {/* FIXED AI EDITOR BAR at bottom — always visible */}
          <div style={{ flexShrink: 0, borderTop: `1px solid ${C.rule}`, backgroundColor: C.bg, maxHeight: "45vh", overflow: "auto" }}>
            <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 32px" }}>
              <AiEditor key={aiKey} text={editorRef.current ? editorRef.current.getText() : text.replace(/<[^>]*>/g, "")} C={C} onApply={handleApplyAi} session={session} />
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

            {/* Letter open date — only when section is Letter to Self */}
            {section === "letter" && (
              <div style={{ padding: "24px 20px", borderBottom: `1px solid ${C.rule}` }}>
                <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>Open on date</div>
                <p style={{ fontFamily: F.body, fontSize: 11, color: C.inkMuted, marginBottom: 10, fontStyle: "italic" }}>Optional. Your letter stays hidden until this date. You'll get an email and in-app notification when it opens.</p>
                <input
                  type="date"
                  value={letterOpenAt}
                  onChange={(e) => setLetterOpenAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  style={{ width: "100%", padding: "8px 10px", fontFamily: F.sans, fontSize: 12, color: C.ink, backgroundColor: C.bg, border: `1px solid ${C.rule}`, outline: "none" }}
                />
                {letterOpenAt && (
                  <button onClick={() => setLetterOpenAt("")} style={{ marginTop: 6, fontFamily: F.sans, fontSize: 10, color: C.inkFaint, background: "none", border: "none", cursor: "pointer" }}>Clear date</button>
                )}
              </div>
            )}

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
              <button onClick={() => setAttachPanel(attachPanel === "location" ? null : "location")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 6, width: "100%", background: "none", border: `1px solid ${attachPanel === "location" ? C.accent : C.rule}`, cursor: "pointer", fontFamily: F.sans, fontSize: 12, color: C.inkLight, textAlign: "left" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Location
              </button>
              <button onClick={() => setAttachPanel(attachPanel === "link" ? null : "link")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 6, width: "100%", background: "none", border: `1px solid ${attachPanel === "link" ? C.accent : C.rule}`, cursor: "pointer", fontFamily: F.sans, fontSize: 12, color: C.inkLight, textAlign: "left" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                Link
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
// SETTINGS — App: theme, accent, integrations, plan, security
// ============================================================
function SettingsPanel({ isOpen, onClose, C, mode, setMode, accent, setAccent, userId, profile, session }) {
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwToast, setPwToast] = useState(null);
  if (!isOpen) return null;

  const saveAppearance = async () => {
    setSaving(true);
    setToast(null);
    try {
      await updateProfile(userId, { theme_mode: mode, theme_accent: accent });
      setToast("success");
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setToast("error");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (pwNew !== pwConfirm) {
      setPwToast("Passwords do not match.");
      return;
    }
    if (!pwCurrent || !pwNew) return;
    setPwSaving(true);
    setPwToast(null);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: session?.user?.email, password: pwCurrent });
      if (signInErr) {
        setPwToast("Current password is incorrect.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: pwNew });
      if (error) throw error;
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      setPwToast("success");
      setTimeout(() => { setPwToast(null); setPwDialogOpen(false); }, 1500);
    } catch (err) {
      console.error("Password update failed:", err);
      setPwToast(err?.message || "Failed to update. Try again.");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, backgroundColor: C.overlay, zIndex: 2000, display: "flex", justifyContent: "flex-end", animation: "fadeIn 0.2s ease" }}>
      <div style={{ backgroundColor: C.surface, width: 400, height: "100%", overflow: "auto", animation: "slideInRight 0.3s ease", borderLeft: `1px solid ${C.rule}` }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 600, color: C.ink }}>Settings</h2>
            <p style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: C.inkMuted, marginTop: 2 }}>Theme, integrations, plan, and account</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkMuted, fontSize: 18 }}>✕</button>
        </div>

        <div style={{ padding: "24px" }}>
          <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 16 }}>Appearance</div>
          <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 10 }}>Theme</div>
          <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
            {[
              { k: "light", l: "Light", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> },
              { k: "dark", l: "Dark", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> },
            ].map((t) => (
              <button key={t.k} onClick={() => setMode(t.k)} style={{ flex: 1, padding: "8px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, backgroundColor: mode === t.k ? C.sectionBg : "transparent", border: mode === t.k ? `1.5px solid ${C.ink}` : `1px solid ${C.rule}`, cursor: "pointer", marginLeft: t.k === "dark" ? -1 : 0, position: "relative", zIndex: mode === t.k ? 1 : 0, color: mode === t.k ? C.ink : C.inkMuted }}>
                {t.icon}
                <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: mode === t.k ? 500 : 400, color: mode === t.k ? C.ink : C.inkMuted }}>{t.l}</span>
              </button>
            ))}
          </div>
          <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 10 }}>Accent</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[{ k: "red", l: "Crimson", c: "#c41e1e" }, { k: "blue", l: "Cobalt", c: "#1e5fc4" }, { k: "green", l: "Forest", c: "#1e7a3d" }, { k: "purple", l: "Amethyst", c: "#6b21a8" }].map((c) => (
              <button key={c.k} onClick={() => setAccent(c.k)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: accent === c.k ? `1.5px solid ${c.c}` : `1px solid ${C.rule}`, backgroundColor: accent === c.k ? C.accentBg : "transparent", cursor: "pointer" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: c.c, border: accent === c.k ? "2px solid #fff" : "none", boxShadow: accent === c.k ? `0 0 0 1px ${c.c}` : "none" }} />
                <span style={{ fontFamily: F.sans, fontSize: 11, fontWeight: accent === c.k ? 500 : 400, color: accent === c.k ? C.ink : C.inkMuted }}>{c.l}</span>
              </button>
            ))}
          </div>
          {toast && (
            <div style={{ marginBottom: 16, padding: "8px 12px", fontFamily: F.sans, fontSize: 11, backgroundColor: toast === "success" ? "#f0faf0" : "#fef5f5", border: `1px solid ${toast === "success" ? "#c3e6c3" : "#f5d5d5"}`, color: toast === "success" ? "#2d6a2d" : "#c41e1e" }}>
              {toast === "success" ? "✓ Saved." : "Failed to save."}
            </div>
          )}
          <button onClick={saveAppearance} disabled={saving} style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 500, color: C.bg, backgroundColor: C.ink, border: "none", padding: "6px 14px", cursor: saving ? "default" : "pointer" }}>{saving ? "Saving…" : "Save"}</button>
        </div>
        <div style={{ height: 1, backgroundColor: C.rule, margin: "0 24px" }} />

        <div style={{ padding: "24px" }}>
          <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 16 }}>Integrations</div>
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
            {(() => {
              const role = profile?.role || "reader";
              const label = role.charAt(0).toUpperCase() + role.slice(1);
              const desc = role === "reader" ? "30 entries/month · Basic editing" : role === "editor" ? "Unlimited entries · Advanced editing · Editions" : role === "publisher" ? "Everything in editor · PDF export · Public page" : "Full platform access";
              const nextLevel = role === "reader" ? "Editor" : role === "editor" ? "Publisher" : null;
              const canUpgrade = nextLevel !== null;
              return (
                <>
                  <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 600, color: C.ink }}>{label}</div>
                  <div style={{ fontFamily: F.body, fontSize: 12, color: C.inkMuted, marginTop: 4 }}>{desc}</div>
                  {canUpgrade && (
                    <button style={{ width: "100%", padding: 10, marginTop: 16, fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.bg, backgroundColor: C.ink, border: "none", cursor: "pointer" }}>Upgrade to {nextLevel}</button>
                  )}
                  <button style={{ width: "100%", padding: 10, marginTop: 8, fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.inkMuted, backgroundColor: "transparent", border: `1px solid ${C.rule}`, cursor: "pointer" }}>Manage plan</button>
                </>
              );
            })()}
          </div>
        </div>
        <div style={{ height: 1, backgroundColor: C.rule, margin: "0 24px" }} />

        <div style={{ padding: "24px" }}>
          <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 16 }}>Security</div>
          <button onClick={() => { setPwDialogOpen(true); setPwCurrent(""); setPwNew(""); setPwConfirm(""); setPwToast(null); }} style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.ink, border: `1px solid ${C.rule}`, backgroundColor: "transparent", padding: "10px 20px", cursor: "pointer" }}>Change password</button>
        </div>

        {pwDialogOpen && (
          <div onClick={(e) => { if (e.target === e.currentTarget) setPwDialogOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 2100, backgroundColor: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s ease" }}>
            <div style={{ backgroundColor: C.surface, maxWidth: 380, width: "90%", padding: 28, boxShadow: "0 12px 48px rgba(0,0,0,0.15)", border: `1px solid ${C.rule}` }}>
              <h3 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 16 }}>Change password</h3>
              <input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} placeholder="Current password" style={{ width: "100%", padding: "8px 12px", marginBottom: 8, fontFamily: F.sans, fontSize: 13, color: C.ink, backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, outline: "none", boxSizing: "border-box" }} />
              <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="New password (min 8 chars)" style={{ width: "100%", padding: "8px 12px", marginBottom: 8, fontFamily: F.sans, fontSize: 13, color: C.ink, backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, outline: "none", boxSizing: "border-box" }} />
              <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="Confirm new password" style={{ width: "100%", padding: "8px 12px", marginBottom: 12, fontFamily: F.sans, fontSize: 13, color: C.ink, backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, outline: "none", boxSizing: "border-box" }} />
              {pwToast && (
                <div style={{ marginBottom: 12, padding: "8px 12px", fontFamily: F.sans, fontSize: 11, backgroundColor: pwToast === "success" ? "#f0faf0" : "#fef5f5", border: `1px solid ${pwToast === "success" ? "#c3e6c3" : "#f5d5d5"}`, color: pwToast === "success" ? "#2d6a2d" : "#c41e1e" }}>
                  {pwToast === "success" ? "✓ Password updated." : pwToast}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setPwDialogOpen(false)} style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.inkMuted, border: `1px solid ${C.rule}`, backgroundColor: "transparent", padding: "8px 18px", cursor: "pointer" }}>Cancel</button>
                <button onClick={savePassword} disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm} style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.bg, backgroundColor: C.ink, border: "none", padding: "8px 18px", cursor: pwSaving || !pwCurrent || !pwNew || !pwConfirm ? "default" : "pointer" }}>{pwSaving ? "Updating…" : "Update Password"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PROFILE PANEL — Profile + Publication (photo, name, about me, city, pub name, motto)
// ============================================================
function ProfilePanel({ isOpen, onClose, C, userId, profile, onSaved, uploadAttachment }) {
  const [name, setName] = useState(profile?.name || "");
  const [aboutMe, setAboutMe] = useState(profile?.about_me || "");
  const [city, setCity] = useState(profile?.city || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [pubName, setPubName] = useState(profile?.publication_name || "");
  const [motto, setMotto] = useState(profile?.motto || "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAboutMe(profile.about_me || "");
      setCity(profile.city || "");
      setAvatarUrl(profile.avatar_url || "");
      setPubName(profile.publication_name || "");
      setMotto(profile.motto || "");
    }
  }, [profile]);

  if (!isOpen) return null;

  const handlePhotoSelect = async (e) => {
    const file = e.target?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setPhotoUploading(true);
    try {
      const url = await uploadAttachment(userId, file);
      setAvatarUrl(url);
    } catch (err) {
      console.error("Photo upload failed:", err);
      setToast("error");
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const save = async () => {
    setSaving(true);
    setToast(null);
    try {
      await updateProfile(userId, {
        name: name.trim() || undefined,
        about_me: aboutMe.trim() || null,
        city: city.trim() || null,
        avatar_url: avatarUrl || null,
        publication_name: pubName.trim() || undefined,
        motto: motto.trim() || undefined,
      });
      setToast("success");
      onSaved?.();
      setTimeout(() => {
        setToast(null);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Failed to save profile:", err);
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
            <h2 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 600, color: C.ink }}>My Profile</h2>
            <p style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: C.inkMuted, marginTop: 2 }}>Profile and publication</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkMuted, fontSize: 18 }}>✕</button>
        </div>

        <div style={{ padding: "24px" }}>
          <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 16 }}>Profile</div>

          {/* Photo */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 8 }}>Photo</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: "none" }} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                style={{
                  width: 72, height: 72, borderRadius: "50%", border: `2px solid ${C.rule}`,
                  backgroundColor: avatarUrl ? "transparent" : C.sectionBg, overflow: "hidden",
                  cursor: photoUploading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontFamily: F.sans, fontSize: 24, fontWeight: 600, color: C.inkMuted }}>{photoUploading ? "…" : "+"}</span>
                )}
              </button>
              <div>
                <p style={{ fontFamily: F.body, fontSize: 12, color: C.inkMuted, marginBottom: 4 }}>{photoUploading ? "Uploading…" : avatarUrl ? "Click to change photo" : "Add a profile photo"}</p>
                {avatarUrl && (
                  <button type="button" onClick={() => setAvatarUrl("")} style={{ fontFamily: F.sans, fontSize: 10, color: C.accent, background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>Display name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={{ width: "100%", padding: "8px 12px", fontFamily: F.body, fontSize: 14, color: C.ink, backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* About me */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>About me</div>
            <textarea value={aboutMe} onChange={(e) => setAboutMe(e.target.value)} placeholder="A short bio for your public page…" rows={4} style={{ width: "100%", padding: "8px 12px", fontFamily: F.body, fontSize: 13, color: C.ink, backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>

          {/* City */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>City</div>
            <CityField value={city} onChange={setCity} placeholder="Where do you write from?" style={{ marginBottom: 0 }} inputStyle={{ padding: "8px 12px", fontFamily: F.body, fontSize: 13, backgroundColor: C.sectionBg }} colors={{ ink: C.ink, inkMuted: C.inkMuted, rule: C.rule, bg: C.sectionBg, sectionBg: C.sectionBg }} />
          </div>

          <div style={{ height: 1, backgroundColor: C.rule, margin: "0 -24px 24px" }} />
          <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 16 }}>Publication</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>Publication name</div>
            <input value={pubName} onChange={(e) => setPubName(e.target.value)} placeholder="e.g. The Deborah Times" style={{ width: "100%", padding: "8px 12px", fontFamily: F.display, fontSize: 14, color: C.ink, backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>Motto</div>
            <input value={motto} onChange={(e) => setMotto(e.target.value)} placeholder="All the life that's fit to print" style={{ width: "100%", padding: "8px 12px", fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.ink, backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, outline: "none", boxSizing: "border-box" }} />
          </div>

          {toast === "success" && (
            <div style={{ padding: "10px 14px", marginBottom: 12, backgroundColor: "#f0faf0", border: "1px solid #c3e6c3", fontFamily: F.sans, fontSize: 12, color: "#2d6a2d", display: "flex", alignItems: "center", gap: 8, animation: "fadeIn 0.2s ease" }}>
              <span>✓</span> Profile saved.
            </div>
          )}
          {toast === "error" && (
            <div style={{ padding: "10px 14px", marginBottom: 12, backgroundColor: "#fef5f5", border: "1px solid #f5d5d5", fontFamily: F.sans, fontSize: 12, color: "#c41e1e", animation: "fadeIn 0.2s ease" }}>
              Failed to save. Please try again.
            </div>
          )}
          <button onClick={save} disabled={saving || toast === "success"} style={{ width: "100%", padding: 10, fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.bg, backgroundColor: C.ink, border: "none", cursor: saving || toast === "success" ? "default" : "pointer", opacity: saving || toast === "success" ? 0.7 : 1 }}>
            {saving ? "Saving…" : toast === "success" ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PLATFORM HEADER
// ============================================================
function PlatformHeader({ user, C, onSettings, onProfile, onEditor, onAdmin, isAdmin, userId, onOpenArticle }) {
  const [menu, setMenu] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications(userId, { limit: 20, unreadOnly: false })
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [userId, notifOpen]);

  useEffect(() => {
    if (!menu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menu]);

  useEffect(() => {
    if (!notifOpen) return;
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  const handleSignOut = async () => {
    setMenu(false);
    await supabase.auth.signOut();
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const handleNotifClick = async (n) => {
    if (n.entry_id && onOpenArticle) {
      try {
        const entry = await fetchEntryFull(userId, n.entry_id);
        if (entry) onOpenArticle(entry, [entry], 0);
      } catch (_) {}
    }
    if (!n.read_at) await markNotificationRead(userId, n.id);
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    setNotifOpen(false);
  };

  return (
    <div style={{ backgroundColor: C.platformBg, borderBottom: `1px solid ${C.platformBorder}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 900 }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.ink }}>The Hauss</span>
          <span style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 500, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", border: `1px solid ${C.accent}`, padding: "2px 6px" }}>{userId ? (ROLE_LABELS[user.role] || user.role) : "Beta"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onEditor} onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"} onMouseLeave={(e) => e.currentTarget.style.opacity = "1"} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F.sans, fontSize: 11, fontWeight: 500, color: C.bg, backgroundColor: C.ink, border: "none", padding: "6px 16px", cursor: "pointer", transition: "opacity 0.2s" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            New Entry
          </button>
          {userId && (
            <div style={{ position: "relative" }} ref={notifRef}>
              <button onClick={() => setNotifOpen(!notifOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: C.inkMuted, display: "flex", position: "relative" }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 7, backgroundColor: C.accent, color: C.bg, fontFamily: F.sans, fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{unreadCount > 99 ? "99+" : unreadCount}</span>
                )}
              </button>
              {notifOpen && (
                <div style={{ position: "absolute", top: 36, right: 0, backgroundColor: C.surface, border: `1px solid ${C.rule}`, boxShadow: "0 8px 30px rgba(0,0,0,0.12)", minWidth: 280, maxWidth: 360, maxHeight: 400, overflow: "auto", zIndex: 999, animation: "fadeIn 0.15s ease" }}>
                  <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.rule}`, fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1px" }}>Notifications</div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 24, fontFamily: F.body, fontSize: 12, color: C.inkMuted, fontStyle: "italic" }}>No notifications yet</div>
                  ) : (
                    notifications.map((n) => (
                      <button key={n.id} onClick={() => handleNotifClick(n)} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", background: n.read_at ? "transparent" : C.sectionBg, border: "none", fontFamily: F.sans, fontSize: 12, color: C.inkLight, cursor: "pointer", borderBottom: `1px solid ${C.rule}` }}>
                        <span style={{ color: C.accent }}>✉️</span> Your letter to yourself is ready to open
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          {user.role === "reader" && !user.isTester && <button style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 500, color: C.accent, backgroundColor: "transparent", border: `1px solid ${C.accent}`, padding: "5px 12px", cursor: "pointer" }}>Upgrade</button>}
          <div style={{ position: "relative" }} ref={menuRef}>
            <button onClick={() => setMenu(!menu)} style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: user.avatarUrl ? "transparent" : C.accent, color: user.avatarUrl ? "transparent" : "#fff", border: "none", cursor: "pointer", fontFamily: F.sans, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : user.avatar}
            </button>
            {menu && <div style={{ position: "absolute", top: 38, right: 0, backgroundColor: C.surface, border: `1px solid ${C.rule}`, boxShadow: "0 8px 30px rgba(0,0,0,0.12)", minWidth: 200, zIndex: 999, animation: "fadeIn 0.15s ease" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.rule}` }}><div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.ink }}>{user.name}</div><div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted }}>{user.email}</div></div>
              {["My Profile", "Settings"].map((item, i) => (
                <button key={i} onClick={() => { setMenu(false); if (item === "My Profile") onProfile?.(); if (item === "Settings") onSettings(); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", fontFamily: F.sans, fontSize: 12, color: C.inkLight, cursor: "pointer" }}>{item}</button>
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
// JOURNAL VIEW — Notebook layout with list + spread views
// ============================================================
const SECTION_KEYS = ["dispatch", "essay", "letter", "review", "photo"];

function formatTime(dateStr) {
  const d = new Date(dateStr);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

function Dropdown({ C, trigger, open, onToggle, children, dropRef, width = 280, active = false }) {
  return (
    <div ref={dropRef} style={{ position: "relative" }}>
      <button onClick={onToggle} style={{
        display: "flex", alignItems: "center", gap: 6,
        fontFamily: F.sans, fontSize: 11,
        color: active ? C.bg : C.inkMuted,
        backgroundColor: active ? C.ink : "transparent",
        border: `1px solid ${open ? C.ink : active ? C.ink : C.rule}`,
        padding: "4px 12px", cursor: "pointer",
        transition: "border-color 0.15s, background-color 0.15s, color 0.15s",
      }}>
        {trigger}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={active ? C.bg : C.inkMuted} strokeWidth="1.5" strokeLinecap="round">
          <path d={open ? "M2 6.5L5 3.5L8 6.5" : "M2 3.5L5 6.5L8 3.5"} />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          width, backgroundColor: C.surface || C.bg,
          border: `1px solid ${C.rule}`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          zIndex: 100, animation: "fadeIn 0.15s ease",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function NotebookPage({ C, entry, readTime, onClick }) {
  const pad = (n) => n.toString().padStart(2, "0");
  const d = new Date(entry.created_at);
  const day = d.getDate();
  const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  const time = formatTime(entry.created_at);
  const sealed = isEntrySealed(entry);
  const bodyText = sealed ? "" : stripHtml(entry.body || "").replace(/\n\n/g, " ");
  const maxChars = 300;
  const text = sealed
    ? (entry.letter_open_at ? `This letter is sealed. It will open on ${new Date(entry.letter_open_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. You'll receive a notification when it opens.` : "Sealed")
    : (bodyText.length > maxChars ? bodyText.slice(0, maxChars) + "…" : bodyText);
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      style={{
        display: "flex", flexDirection: "column", minHeight: "100%",
        cursor: onClick ? "pointer" : "default",
        transition: onClick ? "background-color 0.15s" : undefined,
      }}
      onMouseEnter={onClick ? (e) => (e.currentTarget.style.backgroundColor = C.sectionBg) : undefined}
      onMouseLeave={onClick ? (e) => (e.currentTarget.style.backgroundColor = "transparent") : undefined}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
        <div>
          <span style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{pad(day)}</span>
          <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.ink, marginLeft: 8 }}>{month}</span>
        </div>
        <span style={{ fontFamily: F.mono, fontSize: 10, color: C.inkFaint }}>{time}</span>
      </div>
      <div style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 500, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 }}>
        {SECTION_UPPER[entry.section] || (entry.section && entry.section.toUpperCase())}
      </div>
      {entry.title && (
        <h3 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, lineHeight: 1.25, color: C.ink, marginBottom: 14 }}>
          {entry.title}
        </h3>
      )}
      <p style={{ fontFamily: F.body, fontSize: 16, lineHeight: 1.8, color: C.inkLight, marginBottom: 24 }}>{text}</p>
      <div style={{
        display: "flex", gap: 8, alignItems: "center",
        marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${C.rule}`,
      }}>
        <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkFaint }}>
          {(entry.word_count || 0)} words · {readTime(entry.word_count || 0)} min
        </span>
        {entry.source === "telegram" && (
          <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkFaint }}>· via Telegram</span>
        )}
      </div>
    </div>
  );
}

function JournalView({ C, userId, onSwitchToEdition, onNewEntry, dataVersion, onOpenArticle, editorOpen, editingEntry }) {
  const [periodKey, setPeriodKey] = useState("last30");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [fullEntries, setFullEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [spread, setSpread] = useState(0);
  const pickerRef = useRef(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
      if (sectionRef.current && !sectionRef.current.contains(e.target)) setSectionOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
      .then(([, fullData]) => setFullEntries(fullData))
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

  const filteredEntries = sectionFilter === "all"
    ? fullEntries
    : fullEntries.filter((e) => e.section === sectionFilter);

  const sectionCounts = SECTION_KEYS.reduce((acc, k) => {
    acc[k] = fullEntries.filter((e) => e.section === k).length;
    return acc;
  }, { all: fullEntries.length });
  sectionCounts.all = fullEntries.length;

  const totalEntries = filteredEntries.length;
  const totalWords = filteredEntries.reduce((sum, e) => sum + (e.word_count || 0), 0);

  const sectionsForDropdown = [
    { key: "all", label: "All Sections", count: sectionCounts.all },
    ...SECTION_KEYS.map((k) => ({ key: k, label: SECTION_LABELS[k] || k, count: sectionCounts[k] || 0 })),
  ];

  const titleLabel = periodKey === "custom" && customFrom && customTo
    ? `${customFrom} – ${customTo}`
    : (periodTitles[periodKey] || "This Week");
  const rangeShort = periodKey === "custom" && customFrom && customTo
    ? `${customFrom} – ${customTo}`
    : (presets.find((p) => p.key === periodKey)?.sub || titleLabel);
  const currentSection = sectionsForDropdown.find((s) => s.key === sectionFilter);
  const sectionLabel = currentSection ? currentSection.label : "All Sections";

  const readTime = (wc) => getReadTime(wc || 0);
  const pad = (n) => n.toString().padStart(2, "0");
  const totalSpreads = Math.max(1, Math.ceil(filteredEntries.length / 2));
  const leftEntry = filteredEntries[spread * 2];
  const rightEntry = filteredEntries[spread * 2 + 1] || null;

  useEffect(() => {
    if (viewMode !== "notebook") return;
    if (editorOpen || editingEntry) return;
    const handleKey = (e) => {
      if (!["ArrowLeft","ArrowRight"].includes(e.key)) return;
      const el = document.activeElement ?? e.target;
      if (["INPUT", "TEXTAREA"].includes(el?.tagName)) return;
      if (el?.isContentEditable) return;
      if (el?.closest?.(".ProseMirror, [contenteditable=true], [data-editor-root]")) return;
      if (e.key === "ArrowLeft") {
        setSpread((s) => Math.max(0, s - 1));
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        setSpread((s) => Math.min(totalSpreads - 1, s + 1));
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, [viewMode, totalSpreads, editorOpen, editingEntry]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", animation: "fadeIn 0.4s ease" }}>
      {/* Header */}
      <div style={{ padding: "40px 0 8px", textAlign: "center" }}>
        <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>Notebook</div>
        <h2 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink }}>{titleLabel}</h2>
        <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginTop: 6 }}>
          {loading ? "Loading..." : `${totalEntries} entries · ${totalWords} words`}
        </p>
      </div>

      {/* Controls bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${C.ink}`, borderBottom: `1px solid ${C.rule}`, padding: "12px 0", marginBottom: 32, marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Dropdown C={C} dropRef={sectionRef} trigger={sectionLabel} open={sectionOpen}
            onToggle={() => { setSectionOpen(!sectionOpen); setPickerOpen(false); }} width={220}
            active={sectionFilter !== "all"}>
            <div style={{ padding: "6px 0" }}>
              {sectionsForDropdown.map((s) => (
                <button key={s.key} onClick={() => { setSectionFilter(s.key); setSectionOpen(false); setSpread(0); }} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  width: "100%", padding: "10px 16px",
                  backgroundColor: "transparent", border: "none", cursor: "pointer",
                  borderLeft: sectionFilter === s.key ? `3px solid ${C.accent}` : "3px solid transparent",
                  transition: "background-color 0.1s",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.sectionBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: sectionFilter === s.key ? 600 : 400, color: s.count === 0 ? C.inkFaint : C.ink }}>{s.label}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.inkFaint }}>{s.count}</span>
                </button>
              ))}
            </div>
          </Dropdown>
          <Dropdown C={C} dropRef={pickerRef} trigger={<span style={{ fontFamily: F.mono }}>{rangeShort}</span>}
            open={pickerOpen} onToggle={() => { setPickerOpen(!pickerOpen); setSectionOpen(false); }} width={320}
            active>
            <div style={{ padding: "6px 0" }}>
              {presets.map((p) => (
                <button key={p.key} onClick={() => { setPeriodKey(p.key); setPickerOpen(false); setSpread(0); }} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  width: "100%", padding: "11px 16px",
                  backgroundColor: "transparent", border: "none", cursor: "pointer",
                  borderLeft: periodKey === p.key ? `3px solid ${C.accent}` : "3px solid transparent",
                  transition: "background-color 0.1s",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.sectionBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: periodKey === p.key ? 600 : 400, color: C.ink }}>{p.label}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.inkFaint }}>{p.sub}</span>
                </button>
              ))}
            </div>
            <div style={{ height: 1, backgroundColor: C.rule }} />
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={C.inkMuted} strokeWidth="1.3">
                  <rect x="1" y="2" width="10" height="9" rx="1.5"/><line x1="1" y1="5" x2="11" y2="5"/>
                  <line x1="3.5" y1="0.5" x2="3.5" y2="3"/><line x1="8.5" y1="0.5" x2="8.5" y2="3"/>
                </svg>
                <span style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px" }}>Custom Range</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 500, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 3 }}>From</label>
                  <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} max={customTo || undefined} style={{
                    width: "100%", padding: "7px 8px", fontFamily: F.sans, fontSize: 11, color: C.ink,
                    border: `1px solid ${C.rule}`, backgroundColor: C.sectionBg || C.bg, outline: "none",
                  }} />
                </div>
                <div>
                  <label style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 500, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 3 }}>To</label>
                  <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} min={customFrom || undefined} style={{
                    width: "100%", padding: "7px 8px", fontFamily: F.sans, fontSize: 11, color: C.ink,
                    border: `1px solid ${C.rule}`, backgroundColor: C.sectionBg || C.bg, outline: "none",
                  }} />
                </div>
              </div>
              <button onClick={() => { applyCustom(); setSpread(0); }} disabled={!customFrom || !customTo} style={{
                width: "100%", marginTop: 10, padding: "8px 0",
                fontFamily: F.sans, fontSize: 11, fontWeight: 500,
                color: customFrom && customTo ? C.bg : C.inkFaint,
                backgroundColor: customFrom && customTo ? C.ink : C.rule,
                border: "none", cursor: customFrom && customTo ? "pointer" : "default",
              }}>Apply</button>
            </div>
          </Dropdown>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setViewMode("list")} style={{
            padding: "6px 8px", cursor: "pointer", backgroundColor: "transparent",
            border: `1px solid ${viewMode === "list" ? C.ink : C.rule}`,
            opacity: viewMode === "list" ? 1 : 0.5, display: "flex", alignItems: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={C.inkMuted} strokeWidth="1.5">
              <line x1="1" y1="3" x2="15" y2="3"/><line x1="1" y1="8" x2="15" y2="8"/><line x1="1" y1="13" x2="15" y2="13"/>
            </svg>
          </button>
          <button onClick={() => { setViewMode("notebook"); setSpread(0); }} style={{
            padding: "6px 8px", cursor: "pointer", backgroundColor: "transparent",
            border: `1px solid ${viewMode === "notebook" ? C.ink : C.rule}`,
            opacity: viewMode === "notebook" ? 1 : 0.5, display: "flex", alignItems: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={C.inkMuted} strokeWidth="1.5">
              <rect x="1" y="2" width="6" height="12"/><rect x="9" y="2" width="6" height="12"/><line x1="8" y1="2" x2="8" y2="14"/>
            </svg>
          </button>
        </div>
      </div>

      {loading && <LoadingBlock C={C} text="Loading journal entries..." />}

      {/* List view */}
      {!loading && viewMode === "list" && (
        <div>
          {filteredEntries.map((entry, i) => {
            const d = new Date(entry.created_at);
            const day = d.getDate();
            const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
            const time = formatTime(entry.created_at);
            const excerpt = isEntrySealed(entry)
              ? (entry.letter_open_at ? `Sealed until ${new Date(entry.letter_open_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "Sealed")
              : stripHtml(entry.body || "");
            return (
              <div key={entry.id} onClick={() => handleOpenArticle(entry.id)} style={{
                display: "grid", gridTemplateColumns: "72px 1fr", gap: 0,
                padding: "28px 0", borderBottom: `1px solid ${C.rule}`,
                cursor: "pointer", animation: `fadeInUp 0.4s ease ${i * 0.04}s both`,
                transition: "background-color 0.15s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.sectionBg)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                <div style={{ textAlign: "right", paddingRight: 16, borderRight: `2px solid ${C.rule}` }}>
                  <div style={{ fontFamily: F.display, fontSize: 36, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{pad(day)}</div>
                  <div style={{ fontFamily: F.display, fontSize: 13, fontWeight: 600, color: C.inkMuted, marginTop: 2 }}>{month}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 10, color: C.inkFaint, marginTop: 6 }}>{time}</div>
                </div>
                <div style={{ paddingLeft: 20 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 500, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 6 }}>
                    {SECTION_UPPER[entry.section] || (entry.section && entry.section.toUpperCase())}
                  </div>
                  {(entry.title || isEntrySealed(entry)) && (
                    <h3 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, lineHeight: 1.25, color: C.ink, marginBottom: 8 }}>
                      {isEntrySealed(entry) ? (entry.letter_open_at ? `Sealed until ${new Date(entry.letter_open_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "Sealed letter") : entry.title}
                    </h3>
                  )}
                  <p style={{
                    fontFamily: F.body, fontSize: 15, lineHeight: 1.7, color: C.inkLight,
                    marginBottom: 12,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {excerpt}
                  </p>
                  <div style={{ display: "flex", gap: 12, fontFamily: F.sans, fontSize: 10, color: C.inkFaint }}>
                    <span>{(entry.word_count || 0)} words</span>
                    {entry.source === "telegram" && <span>via Telegram</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notebook spread view */}
      {!loading && viewMode === "notebook" && (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: rightEntry ? "1fr 1px 1fr" : "1fr",
            gap: 0, alignItems: "stretch",
          }}>
            <div style={{ display: "flex", flexDirection: "column", minHeight: 280, padding: "8px 32px 32px 0" }}>
              {leftEntry ? <NotebookPage C={C} entry={leftEntry} readTime={readTime} onClick={() => handleOpenArticle(leftEntry.id)} /> : (
                <div style={{ fontFamily: F.body, fontSize: 14, color: C.inkMuted, fontStyle: "italic" }}>No entries in this period</div>
              )}
            </div>
            {rightEntry && <div style={{ backgroundColor: C.rule }} />}
            {rightEntry && (
              <div style={{ display: "flex", flexDirection: "column", minHeight: 280, padding: "8px 0 32px 32px" }}>
                <NotebookPage C={C} entry={rightEntry} readTime={readTime} onClick={() => handleOpenArticle(rightEntry.id)} />
              </div>
            )}
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            borderTop: `1px solid ${C.rule}`, padding: "16px 0", marginTop: 8,
          }}>
            <button onClick={() => setSpread((s) => Math.max(0, s - 1))} style={{
              fontFamily: F.sans, fontSize: 11, color: spread === 0 ? C.inkFaint : C.inkMuted,
              backgroundColor: "transparent", border: "none",
              cursor: spread === 0 ? "default" : "pointer", padding: "4px 0",
            }}>{spread > 0 ? "← Previous" : ""}</button>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.inkFaint }}>
              {filteredEntries.length === 0 ? "0" : `${spread * 2 + 1}–${Math.min(spread * 2 + 2, filteredEntries.length)} of ${filteredEntries.length}`}
            </span>
            <button onClick={() => setSpread((s) => Math.min(totalSpreads - 1, s + 1))} style={{
              fontFamily: F.sans, fontSize: 11, color: spread >= totalSpreads - 1 ? C.inkFaint : C.inkMuted,
              backgroundColor: "transparent", border: "none",
              cursor: spread >= totalSpreads - 1 ? "default" : "pointer", padding: "4px 0",
            }}>{spread < totalSpreads - 1 ? "Next →" : ""}</button>
          </div>
        </div>
      )}

      {/* End section */}
      {!loading && (
        <div style={{ textAlign: "center", padding: "40px 0 60px" }}>
          <div style={{ width: 40, height: 2, backgroundColor: C.accent, margin: "0 auto 20px" }} />
          <button onClick={onSwitchToEdition} style={{
            fontFamily: F.sans, fontSize: 11, fontWeight: 500,
            color: C.inkMuted, backgroundColor: "transparent",
            border: `1px solid ${C.rule}`, padding: "8px 20px", cursor: "pointer",
          }}>
            View Weekly Edition →
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COVER IMAGE STEP — Sub-component for EditionBuilder
// ============================================================
function CoverImageStep({ C, selectedIds, coverImageUrl, setCoverImageUrl, coverUploading, setCoverUploading, userId, onBack, onContinue, fetchPhotoAttachmentsForEntries, uploadAttachment }) {
  const [entryPhotos, setEntryPhotos] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (selectedIds.length === 0) return;
    fetchPhotoAttachmentsForEntries(selectedIds).then(setEntryPhotos);
  }, [selectedIds, fetchPhotoAttachmentsForEntries]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setCoverUploading(true);
    try {
      const url = await uploadAttachment(userId, file);
      setCoverImageUrl(url);
    } catch (err) {
      console.error("Cover upload failed:", err);
    } finally {
      setCoverUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", animation: "fadeIn 0.3s ease" }}>
      <h2 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Cover Image</h2>
      <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginBottom: 24 }}>
        Choose an image for your edition cover. Upload from your computer or pick from images in your selected entries.
      </p>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={coverUploading}
          style={{
            width: 140, height: 140, border: `2px dashed ${C.rule}`,
            backgroundColor: C.sectionBg, cursor: coverUploading ? "default" : "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: F.sans, fontSize: 11, color: C.inkMuted,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.inkMuted} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          {coverUploading ? "Uploading..." : "Upload"}
        </button>

        {entryPhotos.map((p, idx) => (
          <button
            key={`cover-${p.entry_id}-${idx}`}
            onClick={() => setCoverImageUrl(coverImageUrl === p.url ? null : p.url)}
            style={{
              width: 140, height: 140, padding: 0, border: `2px solid ${coverImageUrl === p.url ? C.ink : C.rule}`,
              overflow: "hidden", cursor: "pointer", flexShrink: 0,
            }}
          >
            <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </button>
        ))}
      </div>

      {coverImageUrl && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Selected cover</div>
          <div style={{ position: "relative", width: "100%", maxWidth: 360, height: 180, backgroundColor: C.sectionBg, overflow: "hidden" }}>
            <img src={coverImageUrl} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <button
            onClick={() => setCoverImageUrl(null)}
            style={{ marginTop: 8, fontFamily: F.sans, fontSize: 11, color: C.inkMuted, background: "none", border: "none", cursor: "pointer" }}
          >Clear selection</button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button onClick={onBack} style={{
          fontFamily: F.sans, fontSize: 12, color: C.inkMuted, background: "none",
          border: `1px solid ${C.rule}`, padding: "10px 24px", cursor: "pointer",
        }}>← Back</button>
        <button onClick={onContinue} style={{
          fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.bg,
          backgroundColor: C.ink, border: "none", padding: "10px 32px", cursor: "pointer",
        }}>Continue — Add Links</button>
      </div>
    </div>
  );
}

// ============================================================
// EDITION BUILDER — Publisher creates custom editions
// ============================================================
function EditionBuilder({ C, userId, session, onClose, onCreated }) {
  const [step, setStep] = useState(1); // 1=setup, 2=select, 3=cover, 4=arrange, 5=links, 6=preview
  const [title, setTitle] = useState("");
  const [weekStart, setWeekStart] = useState(new Date().toISOString().slice(0, 10));
  const [weekEnd, setWeekEnd] = useState(new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10));
  const [allEntries, setAllEntries] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [featuredIds, setFeaturedIds] = useState([]);
  const [weekAtGlance, setWeekAtGlance] = useState([{ label: "Mon", text: "", url: "" }]);
  const [editorial, setEditorial] = useState("");
  const [links, setLinks] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [sectionFilter, setSectionFilter] = useState("all");
  const [dragIdx, setDragIdx] = useState(null);
  const [coverImageUrl, setCoverImageUrl] = useState(null);
  const [coverUploading, setCoverUploading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoadingEntries(true);
    fetchUserEntriesForBuilder(userId)
      .then(setAllEntries)
      .catch(console.error)
      .finally(() => setLoadingEntries(false));
  }, [userId]);

  const selectedEntries = selectedIds.map((id) => allEntries.find((e) => e.id === id)).filter(Boolean);

  const filteredEntries = sectionFilter === "all"
    ? allEntries
    : allEntries.filter((e) => e.section === sectionFilter);

  const toggleEntry = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleFeatured = (id) => {
    setFeaturedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (targetIdx) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    setSelectedIds((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIdx, 1);
      arr.splice(targetIdx, 0, moved);
      return arr;
    });
    setDragIdx(null);
  };

  const addGlanceItem = () => setWeekAtGlance((prev) => [...prev, { label: "", text: "", url: "" }]);
  const removeGlanceItem = (idx) => setWeekAtGlance((prev) => prev.filter((_, i) => i !== idx));
  const updateGlanceItem = (idx, field, value) => {
    setWeekAtGlance((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addLink = () => setLinks((prev) => [...prev, { title: "", url: "", description: "", type: "read" }]);
  const removeLink = (idx) => setLinks((prev) => prev.filter((_, i) => i !== idx));
  const updateLink = (idx, field, value) => {
    setLinks((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleGenerateAI = async () => {
    if (!session || selectedEntries.length === 0) return;
    setGeneratingAI(true);
    try {
      const entrySummaries = selectedEntries.map((e) =>
        `[${e.section.toUpperCase()}] ${e.title}\n${e.body.slice(0, 300)}`
      ).join("\n\n---\n\n");

      const prompt = `You are an editorial writer for a personal newspaper. Summarize the following ${selectedEntries.length} entries into a cohesive Editor's Note (2-3 paragraphs). Write in a warm, literary style — like the editor of a small independent newspaper reflecting on the week. Do not use bullet points. Return JSON: {"editorial": "your text here"}`;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-editor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          text: entrySummaries,
          mode: "rewrite",
          tone: "literary",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.body || data.editorial || data.result || "";
        if (text) setEditorial(text);
      }
    } catch (err) {
      console.error("AI editorial generation failed:", err);
    }
    setGeneratingAI(false);
  };

  const handlePublish = async () => {
    if (selectedIds.length === 0 || publishing) return;
    setPublishing(true);
    try {
      const glanceData = weekAtGlance.filter((g) => g.text.trim());
      const linkData = links.filter((l) => l.title.trim() && l.url.trim());

      await createCustomEdition(userId, {
        title: title || null,
        weekStart,
        weekEnd,
        entryIds: selectedIds,
        featuredIds,
        weekAtGlance: glanceData.length > 0 ? glanceData : null,
        editorialText: editorial || null,
        links: linkData,
        isPublic: false,
        shareMode: "full",
        coverImageUrl: coverImageUrl || null,
      });
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      console.error("Failed to create custom edition:", err);
      alert("Failed to create edition: " + (err.message || "Unknown error"));
    }
    setPublishing(false);
  };

  const LINK_TYPES = [
    { value: "read", label: "Read", icon: "📖" },
    { value: "watch", label: "Watch", icon: "🎬" },
    { value: "listen", label: "Listen", icon: "🎧" },
    { value: "visit", label: "Visit", icon: "📍" },
  ];

  const sectionOptions = ["all", "dispatch", "essay", "letter", "review", "photo"];
  const sectionLabels = { all: "All", dispatch: "Dispatch", essay: "Essay", letter: "Letter", review: "Review", photo: "Photo" };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000,
      backgroundColor: C.bg, overflow: "auto", animation: "editorSlideIn 0.3s ease",
    }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10, backgroundColor: C.bg,
        borderBottom: `1px solid ${C.rule}`, padding: "0 24px", height: 56,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <button onClick={onClose} style={{
          fontFamily: F.sans, fontSize: 13, color: C.inkMuted, background: "none",
          border: "none", cursor: "pointer",
        }}>← Cancel</button>
        <span style={{ fontFamily: F.display, fontSize: 18, fontWeight: 600, color: C.ink }}>
          New Edition {step > 1 && `· Step ${step}/6`}
        </span>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>

        {/* STEP 1: Setup */}
        {step === 1 && (
          <div style={{ maxWidth: 500, margin: "0 auto", animation: "fadeIn 0.3s ease" }}>
            <h2 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Create Your Edition</h2>
            <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkMuted, marginBottom: 32 }}>
              Curate your own newspaper edition — select entries, add recommendations, and publish.
            </p>

            <label style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 6 }}>
              Edition Title (optional)
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My Month in Lisbon, Q1 2026..."
              style={{
                width: "100%", padding: "10px 12px", fontFamily: F.body, fontSize: 15,
                border: `1px solid ${C.rule}`, backgroundColor: C.bg, color: C.ink,
                outline: "none", marginBottom: 24, boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 6 }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", fontFamily: F.sans, fontSize: 13,
                    border: `1px solid ${C.rule}`, backgroundColor: C.bg, color: C.ink,
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 6 }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={weekEnd}
                  onChange={(e) => setWeekEnd(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", fontFamily: F.sans, fontSize: 13,
                    border: `1px solid ${C.rule}`, backgroundColor: C.bg, color: C.ink,
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <button onClick={() => setStep(2)} style={{
              fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.bg,
              backgroundColor: C.ink, border: "none", padding: "12px 32px",
              cursor: "pointer", width: "100%",
            }}>Continue — Select Entries</button>
          </div>
        )}

        {/* STEP 2: Select Entries */}
        {step === 2 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <h2 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Select Entries</h2>
            <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginBottom: 20 }}>
              Choose at least one entry for your edition. {selectedIds.length} selected.
            </p>

            {/* Section filter */}
            <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
              {sectionOptions.map((s) => (
                <button key={s} onClick={() => setSectionFilter(s)} style={{
                  fontFamily: F.sans, fontSize: 10, fontWeight: sectionFilter === s ? 500 : 400,
                  color: sectionFilter === s ? C.bg : C.inkMuted,
                  backgroundColor: sectionFilter === s ? C.ink : "transparent",
                  border: `1px solid ${sectionFilter === s ? C.ink : C.rule}`,
                  padding: "5px 14px", cursor: "pointer", marginLeft: s !== "all" ? -1 : 0,
                }}>{sectionLabels[s]}</button>
              ))}
            </div>

            {loadingEntries && <LoadingBlock C={C} text="Loading entries..." />}

            <div style={{ maxHeight: 450, overflowY: "auto", border: `1px solid ${C.rule}`, marginBottom: 20 }}>
              {filteredEntries.map((e) => {
                const selected = selectedIds.includes(e.id);
                return (
                  <div
                    key={e.id}
                    onClick={() => toggleEntry(e.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                      borderBottom: `1px solid ${C.rule}`, cursor: "pointer",
                      backgroundColor: selected ? (C.sectionBg || "#f7f7f7") : "transparent",
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 3,
                      border: `2px solid ${selected ? C.accent : C.rule}`,
                      backgroundColor: selected ? C.accent : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {selected && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 2 }}>
                        {SECTION_UPPER_MAP[e.section] || e.section.toUpperCase()}
                      </div>
                      <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {e.title}
                      </div>
                    </div>
                    <div style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted, flexShrink: 0 }}>
                      {e.date} · {e.readTime}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(1)} style={{
                fontFamily: F.sans, fontSize: 12, color: C.inkMuted, background: "none",
                border: `1px solid ${C.rule}`, padding: "10px 24px", cursor: "pointer",
              }}>← Back</button>
              <button
                onClick={() => selectedIds.length > 0 && setStep(3)}
                disabled={selectedIds.length === 0}
                style={{
                  fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.bg,
                  backgroundColor: selectedIds.length > 0 ? C.ink : C.rule,
                  border: "none", padding: "10px 32px",
                  cursor: selectedIds.length > 0 ? "pointer" : "default",
                }}
              >Continue — Arrange Layout ({selectedIds.length})</button>
            </div>
          </div>
        )}

        {/* STEP 3: Arrange Layout (drag-and-drop) */}
        {step === 3 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <h2 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Arrange Your Edition</h2>
            <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginBottom: 8 }}>
              Drag to reorder. First 2 entries appear as top stories. Star up to 2 as featured.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 340px", gap: 0, marginBottom: 24 }}>
              {/* Left: entry ordering */}
              <div style={{ paddingRight: 24 }}>
                <h3 style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: C.inkMuted, marginBottom: 12 }}>
                  Story Order
                </h3>
                {selectedEntries.map((e, idx) => (
                  <div
                    key={e.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      border: `1px solid ${dragIdx === idx ? C.accent : C.rule}`,
                      marginBottom: 6, backgroundColor: C.bg, cursor: "grab",
                      opacity: dragIdx === idx ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted, width: 18, textAlign: "center" }}>⠿</span>
                    <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: idx < 2 ? C.accent : C.inkMuted, width: 20, flexShrink: 0 }}>
                      {idx < 2 ? "TOP" : `#${idx + 1}`}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                      <div style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{SECTION_UPPER_MAP[e.section] || e.section} · {e.readTime}</div>
                    </div>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); toggleFeatured(e.id); }}
                      style={{
                        background: "none", border: "none", cursor: "pointer", fontSize: 16,
                        color: featuredIds.includes(e.id) ? "#b8860b" : C.rule,
                      }}
                      title={featuredIds.includes(e.id) ? "Unstar" : "Star as featured"}
                    >★</button>
                  </div>
                ))}
              </div>
              <div style={{ backgroundColor: C.rule }} />
              {/* Right: sidebar editing */}
              <div style={{ paddingLeft: 24 }}>
                {/* Week at a Glance */}
                <h3 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 4 }}>The Week at a Glance</h3>
                <p style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkMuted, marginBottom: 12 }}>
                  Recommend things to read, watch, listen, visit.
                </p>
                {weekAtGlance.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: 10, padding: "8px 10px", border: `1px solid ${C.rule}`, backgroundColor: C.sectionBg || "#f7f7f7" }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <input
                        value={item.label}
                        onChange={(e) => updateGlanceItem(idx, "label", e.target.value)}
                        placeholder="Label (e.g. Mon, Read, Watch)"
                        style={{
                          width: 80, padding: "4px 6px", fontFamily: F.sans, fontSize: 11,
                          fontWeight: 600, border: `1px solid ${C.rule}`, backgroundColor: C.bg,
                          color: C.ink, outline: "none",
                        }}
                      />
                      <button onClick={() => removeGlanceItem(idx)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontFamily: F.sans, fontSize: 11, color: C.inkMuted,
                      }}>✕</button>
                    </div>
                    <input
                      value={item.text}
                      onChange={(e) => updateGlanceItem(idx, "text", e.target.value)}
                      placeholder="Description or recommendation"
                      style={{
                        width: "100%", padding: "4px 6px", fontFamily: F.body, fontSize: 12,
                        border: `1px solid ${C.rule}`, backgroundColor: C.bg, color: C.ink,
                        outline: "none", marginBottom: 4, boxSizing: "border-box",
                      }}
                    />
                    <input
                      value={item.url || ""}
                      onChange={(e) => updateGlanceItem(idx, "url", e.target.value)}
                      placeholder="Link (optional)"
                      style={{
                        width: "100%", padding: "4px 6px", fontFamily: F.sans, fontSize: 10,
                        border: `1px solid ${C.rule}`, backgroundColor: C.bg, color: C.inkMuted,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
                <button onClick={addGlanceItem} style={{
                  fontFamily: F.sans, fontSize: 11, color: C.accent, background: "none",
                  border: "none", cursor: "pointer", marginBottom: 20,
                }}>+ Add item</button>

                {/* Editor's Note */}
                <h3 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 4, marginTop: 8 }}>Editor's Note</h3>
                <p style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkMuted, marginBottom: 8 }}>
                  Write your own or let your editor summarize.
                </p>
                <textarea
                  value={editorial}
                  onChange={(e) => setEditorial(e.target.value)}
                  placeholder="Your editorial note for this edition..."
                  rows={5}
                  style={{
                    width: "100%", padding: "8px 10px", fontFamily: F.body, fontSize: 13,
                    lineHeight: 1.6, border: `1px solid ${C.rule}`, backgroundColor: C.bg,
                    color: C.ink, outline: "none", resize: "vertical", boxSizing: "border-box",
                    marginBottom: 8,
                  }}
                />
                <button
                  onClick={handleGenerateAI}
                  disabled={generatingAI || selectedEntries.length === 0}
                  style={{
                    fontFamily: F.sans, fontSize: 11, fontWeight: 500,
                    color: generatingAI ? C.inkMuted : C.accent,
                    background: "none", border: `1px solid ${generatingAI ? C.rule : C.accent}`,
                    padding: "6px 14px", cursor: generatingAI ? "default" : "pointer",
                  }}
                >{generatingAI ? "Generating..." : "✦ Generate"}</button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(2)} style={{
                fontFamily: F.sans, fontSize: 12, color: C.inkMuted, background: "none",
                border: `1px solid ${C.rule}`, padding: "10px 24px", cursor: "pointer",
              }}>← Back</button>
              <button onClick={() => setStep(4)} style={{
                fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.bg,
                backgroundColor: C.ink, border: "none", padding: "10px 32px", cursor: "pointer",
              }}>Continue — Cover Image</button>
            </div>
          </div>
        )}

        {/* STEP 4: Cover Image */}
        {step === 4 && (
          <CoverImageStep
            C={C}
            selectedIds={selectedIds}
            coverImageUrl={coverImageUrl}
            setCoverImageUrl={setCoverImageUrl}
            coverUploading={coverUploading}
            setCoverUploading={setCoverUploading}
            userId={userId}
            onBack={() => setStep(3)}
            onContinue={() => setStep(5)}
            fetchPhotoAttachmentsForEntries={fetchPhotoAttachmentsForEntries}
            uploadAttachment={uploadAttachment}
          />
        )}

        {/* STEP 5: External Links */}
        {step === 5 && (
          <div style={{ maxWidth: 600, margin: "0 auto", animation: "fadeIn 0.3s ease" }}>
            <h2 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.ink, marginBottom: 4 }}>External Recommendations</h2>
            <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginBottom: 20 }}>
              Add links to articles, films, music, or places. These appear in "Also in This Edition."
            </p>

            {links.map((link, idx) => (
              <div key={idx} style={{ border: `1px solid ${C.rule}`, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {LINK_TYPES.map((lt) => (
                      <button key={lt.value} onClick={() => updateLink(idx, "type", lt.value)} style={{
                        fontFamily: F.sans, fontSize: 10,
                        color: link.type === lt.value ? C.bg : C.inkMuted,
                        backgroundColor: link.type === lt.value ? C.ink : "transparent",
                        border: `1px solid ${link.type === lt.value ? C.ink : C.rule}`,
                        padding: "3px 10px", cursor: "pointer",
                      }}>{lt.icon} {lt.label}</button>
                    ))}
                  </div>
                  <button onClick={() => removeLink(idx)} style={{
                    background: "none", border: "none", fontFamily: F.sans,
                    fontSize: 11, color: C.inkMuted, cursor: "pointer",
                  }}>✕ Remove</button>
                </div>
                <input
                  value={link.title}
                  onChange={(e) => updateLink(idx, "title", e.target.value)}
                  placeholder="Title"
                  style={{
                    width: "100%", padding: "8px 10px", fontFamily: F.display, fontSize: 15,
                    fontWeight: 600, border: `1px solid ${C.rule}`, backgroundColor: C.bg,
                    color: C.ink, outline: "none", marginBottom: 8, boxSizing: "border-box",
                  }}
                />
                <input
                  value={link.url}
                  onChange={(e) => updateLink(idx, "url", e.target.value)}
                  placeholder="URL (https://...)"
                  style={{
                    width: "100%", padding: "6px 10px", fontFamily: F.sans, fontSize: 12,
                    border: `1px solid ${C.rule}`, backgroundColor: C.bg, color: C.ink,
                    outline: "none", marginBottom: 8, boxSizing: "border-box",
                  }}
                />
                <input
                  value={link.description}
                  onChange={(e) => updateLink(idx, "description", e.target.value)}
                  placeholder="Short description (optional)"
                  style={{
                    width: "100%", padding: "6px 10px", fontFamily: F.body, fontSize: 12,
                    fontStyle: "italic", border: `1px solid ${C.rule}`, backgroundColor: C.bg,
                    color: C.inkMuted, outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            <button onClick={addLink} style={{
              fontFamily: F.sans, fontSize: 12, color: C.accent, background: "none",
              border: `1px dashed ${C.accent}`, padding: "10px 20px", cursor: "pointer",
              width: "100%", marginBottom: 24,
            }}>+ Add Recommendation</button>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(4)} style={{
                fontFamily: F.sans, fontSize: 12, color: C.inkMuted, background: "none",
                border: `1px solid ${C.rule}`, padding: "10px 24px", cursor: "pointer",
              }}>← Back</button>
              <button onClick={() => setStep(6)} style={{
                fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.bg,
                backgroundColor: C.ink, border: "none", padding: "10px 32px", cursor: "pointer",
              }}>Continue — Preview</button>
            </div>
          </div>
        )}

        {/* STEP 6: Preview & Publish */}
        {step === 6 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <h2 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Preview & Publish</h2>
            <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginBottom: 24 }}>
              Review your edition before publishing.
            </p>

            {/* Mini preview */}
            <div style={{ border: `2px solid ${C.ink}`, padding: 24, marginBottom: 24 }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ width: "100%", height: 2, backgroundColor: C.ink }} />
                <h1 style={{ fontFamily: F.display, fontSize: 32, fontWeight: 700, margin: "8px 0", color: C.ink }}>
                  {title || "Your Custom Edition"}
                </h1>
                <div style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkMuted, marginBottom: 8 }}>
                  {weekStart} — {weekEnd}
                </div>
                <div style={{ width: "100%", height: 2, backgroundColor: C.ink }} />
              </div>

              <div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, textAlign: "center", marginBottom: 16 }}>
                {selectedIds.length} entries · {selectedEntries.reduce((s, e) => s + (e.word_count || 0), 0).toLocaleString()} words
                {links.filter((l) => l.title && l.url).length > 0 && ` · ${links.filter((l) => l.title && l.url).length} recommendations`}
              </div>

              {/* Top stories preview */}
              {selectedEntries.slice(0, 2).map((e, idx) => (
                <div key={e.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: idx < 1 && selectedEntries.length > 1 ? `1px solid ${C.rule}` : "none" }}>
                  <div style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 4 }}>
                    {SECTION_UPPER_MAP[e.section] || e.section.toUpperCase()}
                    {featuredIds.includes(e.id) && <span style={{ color: "#b8860b", marginLeft: 8 }}>★ Featured</span>}
                  </div>
                  <div style={{ fontFamily: F.display, fontSize: idx === 0 ? 22 : 18, fontWeight: 700, color: C.ink, lineHeight: 1.2, marginBottom: 4 }}>{e.title}</div>
                  <div style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{e.readTime} · {e.date}</div>
                </div>
              ))}

              {/* More stories preview */}
              {selectedEntries.length > 2 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.ink}` }}>
                  <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: C.inkMuted, marginBottom: 10 }}>Also in This Edition</div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(selectedEntries.length - 2, 3)}, 1fr)`, gap: 12 }}>
                    {selectedEntries.slice(2).map((e) => (
                      <div key={e.id}>
                        <div style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 600, color: C.accent, textTransform: "uppercase" }}>{SECTION_UPPER_MAP[e.section] || e.section}</div>
                        <div style={{ fontFamily: F.display, fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.25 }}>{e.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link preview */}
              {links.filter((l) => l.title && l.url).length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.rule}` }}>
                  <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: C.inkMuted, marginBottom: 10 }}>Recommendations</div>
                  {links.filter((l) => l.title && l.url).map((l, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 14 }}>{LINK_TYPES.find((lt) => lt.value === l.type)?.icon || "📖"}</span>
                      <div>
                        <div style={{ fontFamily: F.display, fontSize: 13, fontWeight: 600, color: C.ink }}>{l.title}</div>
                        {l.description && <div style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkMuted }}>{l.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {editorial && (
                <div style={{ marginTop: 16, padding: 16, backgroundColor: C.sectionBg || "#f7f7f7" }}>
                  <div style={{ fontFamily: F.display, fontSize: 14, color: C.accent, marginBottom: 6 }}>✦ Editor's Note</div>
                  <p style={{ fontFamily: F.body, fontSize: 12, lineHeight: 1.6, color: C.inkLight }}>{editorial}</p>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(5)} style={{
                fontFamily: F.sans, fontSize: 12, color: C.inkMuted, background: "none",
                border: `1px solid ${C.rule}`, padding: "10px 24px", cursor: "pointer",
              }}>← Back</button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                style={{
                  fontFamily: F.sans, fontSize: 14, fontWeight: 600, color: "#fff",
                  backgroundColor: C.accent, border: "none", padding: "12px 40px",
                  cursor: publishing ? "default" : "pointer",
                  opacity: publishing ? 0.7 : 1,
                }}
              >{publishing ? "Publishing..." : "Publish Edition"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const SECTION_UPPER_MAP = {
  dispatch: "DISPATCH",
  essay: "PERSONAL ESSAY",
  letter: "LETTER TO SELF",
  review: "REVIEW",
  photo: "PHOTO ESSAY",
};

// ============================================================
// ARCHIVES VIEW — Past editions as a grid of "covers"
// ============================================================
function ArchivesView({ C, userId, user, session, onSelectEdition, onSwitchToEdition, onRefresh }) {
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [yearFilter, setYearFilter] = useState(null);

  const isPublisher = hasAccess(user?.role || "reader", user?.isTester || false, "publisher");

  useEffect(() => {
    if (!userId) return;
    fetchAllEditions(userId)
      .then((eds) => {
        setEditions(eds);
        if (eds.length > 0 && !yearFilter) setYearFilter(eds[0].year);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const handleEditionCreated = () => {
    fetchAllEditions(userId).then(setEditions).catch(console.error);
    if (onRefresh) onRefresh();
  };

  const openEdition = (ed) => {
    if (!ed?.id) return;
    if (onSelectEdition) onSelectEdition(ed.id);
    if (onSwitchToEdition) onSwitchToEdition();
  };

  const years = [...new Set(editions.map((e) => e.year))].sort((a, b) => b.localeCompare(a));
  const filtered = yearFilter ? editions.filter((e) => e.year === yearFilter) : editions;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", animation: "fadeIn 0.4s ease" }}>
      {/* Header */}
      <div style={{ padding: "40px 0 24px", textAlign: "center" }}>
        <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>Archives</div>
        <h2 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Past Editions</h2>
        <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkMuted }}>{editions.length} weeks of your life, published</p>
      </div>

      {/* Controls bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderTop: `2px solid ${C.ink}`, borderBottom: `1px solid ${C.rule}`,
        padding: "12px 0", marginBottom: 32,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 0 }}>
            {years.map((y, i) => (
              <button key={y} onClick={() => setYearFilter(y)} style={{
                fontFamily: F.sans, fontSize: 11, fontWeight: yearFilter === y ? 500 : 400,
                color: yearFilter === y ? C.bg : C.inkMuted,
                backgroundColor: yearFilter === y ? C.ink : "transparent",
                border: `1px solid ${yearFilter === y ? C.ink : C.rule}`,
                padding: "5px 16px", cursor: "pointer", marginLeft: i > 0 ? -1 : 0,
              }}>{y}</button>
            ))}
          </div>
          {isPublisher && (
            <button onClick={() => setBuilderOpen(true)} style={{
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: F.sans, fontSize: 11, fontWeight: 500,
              color: C.bg, backgroundColor: C.ink,
              border: "none", padding: "6px 14px", cursor: "pointer",
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
              </svg>
              Create Edition
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setViewMode("list")} style={{
            padding: "6px 8px", cursor: "pointer", backgroundColor: "transparent",
            border: `1px solid ${viewMode === "list" ? C.ink : C.rule}`,
            opacity: viewMode === "list" ? 1 : 0.5, display: "flex", alignItems: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={C.inkMuted} strokeWidth="1.5">
              <line x1="1" y1="3" x2="15" y2="3"/><line x1="1" y1="8" x2="15" y2="8"/><line x1="1" y1="13" x2="15" y2="13"/>
            </svg>
          </button>
          <button onClick={() => setViewMode("grid")} style={{
            padding: "6px 8px", cursor: "pointer", backgroundColor: "transparent",
            border: `1px solid ${viewMode === "grid" ? C.ink : C.rule}`,
            opacity: viewMode === "grid" ? 1 : 0.5, display: "flex", alignItems: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={C.inkMuted} strokeWidth="1.5">
              <rect x="1" y="1" width="6" height="6"/><rect x="9" y="1" width="6" height="6"/>
              <rect x="1" y="9" width="6" height="6"/><rect x="9" y="9" width="6" height="6"/>
            </svg>
          </button>
        </div>
      </div>

      {loading && <LoadingBlock C={C} text="Loading archives..." />}

      {/* LIST VIEW */}
      {!loading && viewMode === "list" && (
        <div>
          {filtered.map((ed, i) => (
            <div key={ed.id} onClick={() => openEdition(ed)} style={{
              display: "grid", gridTemplateColumns: "80px 1fr", gap: 24,
              padding: "24px 0", borderBottom: `1px solid ${C.rule}`,
              cursor: "pointer", animation: `fadeInUp 0.4s ease ${i * 0.04}s both`,
              transition: "background-color 0.15s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.sectionBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <div style={{ textAlign: "right", paddingRight: 8, borderRight: `2px solid ${C.rule}` }}>
                <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{ed.num}</div>
                <div style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted, marginTop: 4 }}>{ed.week}</div>
              </div>
              <div>
                <div style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 500, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 6 }}>{ed.topSection}</div>
                <h3 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, lineHeight: 1.25, color: C.ink, marginBottom: 8 }}>{ed.headline}</h3>
                {ed.edNote && <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", lineHeight: 1.6, color: C.inkMuted, marginBottom: 10 }}>{ed.edNote}</p>}
                <div style={{ display: "flex", gap: 12, fontFamily: F.sans, fontSize: 10, color: C.inkFaint }}>
                  <span>{ed.entries} entries</span>
                  <span>{(ed.words || 0).toLocaleString()} words</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkMuted }}>No editions for {yearFilter}.</p>
            </div>
          )}
        </div>
      )}

      {/* GRID VIEW */}
      {!loading && viewMode === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
          {filtered.map((ed, i) => (
            <div key={ed.id} onClick={() => openEdition(ed)} style={{
              cursor: "pointer", transition: "transform 0.2s",
              animation: `fadeInUp 0.4s ease ${i * 0.05}s both`,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {/* Cover image area */}
              <div style={{
                height: 200, overflow: "hidden",
                border: `1px solid ${C.rule}`, borderBottom: "none", position: "relative",
                backgroundColor: C.sectionBg,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {ed.coverImageUrl ? (
                  <img src={ed.coverImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.rule} strokeWidth="1">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                  </svg>
                )}
                <div style={{
                  position: "absolute", top: 12, left: 14,
                  fontFamily: F.sans, fontSize: 9, fontWeight: 600,
                  color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1.5px",
                }}>Vol. I · No. {ed.num}</div>
              </div>
              {/* Card body — uniform height */}
              <div style={{
                border: `1px solid ${C.rule}`, borderTop: `2px solid ${C.ink}`,
                padding: "14px 14px 16px", minHeight: 140,
              }}>
                <div style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 500, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 6 }}>{ed.publicationDate}</div>
                <h3 style={{
                  fontFamily: F.display, fontSize: 16, fontWeight: 700,
                  lineHeight: 1.3, color: C.ink, marginBottom: 8,
                  overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                }}>{ed.headline}</h3>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.sans, fontSize: 10, color: C.inkFaint }}>
                  <span>{ed.entries} entries</span>
                  <span>{(ed.words || 0).toLocaleString()} words</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 0" }}>
              <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkMuted }}>No editions for {yearFilter}.</p>
            </div>
          )}
        </div>
      )}

      <div style={{ height: 60 }} />

      {/* Edition Builder overlay */}
      {builderOpen && (
        <EditionBuilder
          C={C}
          userId={userId}
          session={session}
          onClose={() => setBuilderOpen(false)}
          onCreated={handleEditionCreated}
        />
      )}
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
                  <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "2px" }}>{sec.name}</span>
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
const REFLECTION_PERIODS = [{ key: "week", label: "Week" }, { key: "month", label: "Month" }, { key: "quarter", label: "Quarter" }, { key: "year", label: "Year" }];

const SAMPLE_REFLECTION = {
  label: "This Week", date: "Feb 10 – 16, 2026",
  moods: [{ day: "Mon", val: 2, emoji: "🌧" }, { day: "Tue", val: 3, emoji: "🌤" }, { day: "Wed", val: 3, emoji: "🌤" }, { day: "Thu", val: 4, emoji: "☀️" }, { day: "Fri", val: 4, emoji: "☀️" }, { day: "Sat", val: 5, emoji: "⚡" }, { day: "Sun", val: 4, emoji: "☀️" }],
  trend: [{ w: "Mon", v: 2 }, { w: "", v: 2.5 }, { w: "", v: 3 }, { w: "", v: 3.5 }, { w: "Sun", v: 4 }], trendLabel: "6-Week Trend", moodHint: "A clear arc of growth across your selected period",
  reflectionTitle: "This was a week of inflection.",
  reflection: ["Your language shifted from observing to deciding. The recurring word was permission — it appeared in three entries, always in the context of allowing yourself something you'd been denying.", "You wrote more at night this week, and the night entries carried a different weight: slower, more honest, less performed."],
  connections: ["You mention Marina in 3 entries, always when something in your own life is shifting. She might be your mirror for change.", "Night entries (after 10 PM) are 40% longer than morning ones. Your most honest writing happens when the city is quiet.", "Food appears in 4 entries this week — cooking is how you process decisions before you're ready to name them."],
  themes: [{ theme: "Transformation", count: 28, trend: "↑" }, { theme: "Self-trust", count: 22, trend: "↑" }, { theme: "Permission", count: 18, trend: "↑" }],
  questions: [], stats: [{ label: "Entries", value: "12" }, { label: "Words", value: "2,840" }, { label: "Days", value: "7" }, { label: "Avg. per entry", value: "237" }, { label: "Personal Essays", value: "3" }, { label: "Public", value: "1" }],
};

function ReflectionsView({ C, userId, userRole, isAdmin, session }) {
  const [period, setPeriod] = useState("week");
  const [askQuery, setAskQuery] = useState("");
  const [askAnswer, setAskAnswer] = useState(null);
  const [askLoading, setAskLoading] = useState(false);
  const [reflectionData, setReflectionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodStats, setPeriodStats] = useState(null);
  const [askUsage, setAskUsage] = useState({ used: 0, limit: 0, allowed: true });

  const isReader = userRole === "reader";

  useEffect(() => {
    if (!userId || isReader) {
      setLoading(false);
      setReflectionData(isReader ? SAMPLE_REFLECTION : null);
      return;
    }
    setLoading(true);
    getReflection(userId, period)
      .then(setReflectionData)
      .catch(() => setReflectionData(null))
      .finally(() => setLoading(false));
  }, [userId, period, isReader]);

  useEffect(() => {
    if (!userId || isReader) return;
    fetchAskEditorUsage().then(setAskUsage).catch(() => setAskUsage({ used: 0, limit: 0, allowed: false }));
  }, [userId, isReader, askAnswer]);

  const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const getDateRangeForPeriod = () => {
    const today = new Date();
    if (period === "week") {
      const dow = today.getDay();
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      const mon = new Date(today);
      mon.setDate(today.getDate() + mondayOffset);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { from: toDateStr(mon), to: toDateStr(sun) };
    }
    if (period === "month") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: toDateStr(first), to: toDateStr(last) };
    }
    if (period === "quarter") {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 3);
      return { from: toDateStr(from), to: toDateStr(today) };
    }
    if (period === "year") return { from: "2000-01-01", to: toDateStr(today) };
    return null;
  };
  const periodRange = getDateRangeForPeriod();
  const periodFrom = periodRange?.from ?? null;
  const periodTo = periodRange?.to ?? null;

  useEffect(() => {
    if (!userId || !periodFrom || !periodTo) {
      setPeriodStats(null);
      return;
    }
    const fromIso = periodFrom + "T00:00:00.000Z";
    const toIso = periodTo + "T23:59:59.999Z";
    setPeriodStats(null);
    fetchEntries({ userId, from: fromIso, to: toIso })
      .then((entries) => {
        const words = entries.reduce((s, e) => s + (e.word_count || 0), 0);
        const personalEssays = entries.filter((e) => e.section === "essay").length;
        const publicCount = entries.filter((e) => e.is_public).length;
        const days = Math.max(1, Math.round((new Date(periodTo + "T12:00:00") - new Date(periodFrom + "T12:00:00")) / 86400000));
        setPeriodStats({
          from: periodFrom,
          to: periodTo,
          entries: entries.length,
          words,
          days,
          avg: entries.length ? Math.round(words / entries.length) : 0,
          personalEssays,
          public: publicCount,
        });
      })
      .catch(() => setPeriodStats(null));
  }, [userId, period, periodFrom, periodTo]);

  const P = reflectionData;

  if (loading) return <LoadingBlock C={C} text="Loading reflections..." />;

  // Empty state for editor/publisher: no reflection yet for this period
  const nextRunLabel = { week: "Sunday", month: "the 1st of next month", quarter: "the start of next quarter", year: "January 1st" };
  if (!P) {
    return (
      <div style={{ animation: "fadeIn 0.4s ease" }}>
        <div style={{ padding: "32px 0 0", textAlign: "center" }}>
          <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>✦ Reflections</div>
          <h2 style={{ fontFamily: F.display, fontSize: 26, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Notes from your Editor</h2>
          <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginBottom: 16 }}>Patterns, connections, and notes drawn from your writing.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 0, flexWrap: "wrap", marginBottom: 24 }}>
            {REFLECTION_PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)} style={{ fontFamily: F.sans, fontSize: 11, fontWeight: period === p.key ? 500 : 400, color: period === p.key ? C.bg : C.inkMuted, backgroundColor: period === p.key ? C.ink : "transparent", border: `1px solid ${period === p.key ? C.ink : C.rule}`, padding: "6px 16px", cursor: "pointer", marginLeft: -1 }}>{p.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: F.body, fontSize: 14, color: C.inkMuted }}>Your first {period === "week" ? "weekly" : period === "month" ? "monthly" : period === "quarter" ? "quarterly" : "yearly"} reflection will be generated on {nextRunLabel[period]}.</p>
        </div>
      </div>
    );
  }

  const handleAsk = async () => {
    if (!askQuery.trim() || !session?.access_token) return;
    setAskLoading(true);
    setAskAnswer(null);
    try {
      const data = await submitAskEditorQuestion(session, askQuery.trim());
      setAskAnswer(data.answer ?? "");
      fetchAskEditorUsage().then(setAskUsage).catch(() => {});
    } catch (err) {
      if (err.status === 403 && (err.used !== undefined || err.limit !== undefined)) {
        setAskUsage((prev) => ({ ...prev, used: err.used ?? prev.used, limit: err.limit ?? prev.limit, allowed: false }));
      }
      setAskAnswer(err.message || "Something went wrong. Try again.");
    } finally {
      setAskLoading(false);
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.4s ease", position: "relative" }}>
      {/* Header + 4 period buttons */}
      <div style={{ padding: "32px 0 0", textAlign: "center" }}>
        <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>✦ Reflections</div>
        <h2 style={{ fontFamily: F.display, fontSize: 26, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Notes from your Editor</h2>
        <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginBottom: 16 }}>Patterns, connections, and notes drawn from your writing. Choose a period to see what your editor noticed.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 0, flexWrap: "wrap", marginBottom: 0 }}>
          {REFLECTION_PERIODS.map((p) => (
            <button key={p.key} onClick={() => { if (!isReader) { setPeriod(p.key); setAskAnswer(null); setAskQuery(""); } }} disabled={isReader} style={{ fontFamily: F.sans, fontSize: 11, fontWeight: period === p.key ? 500 : 400, color: period === p.key ? C.bg : C.inkMuted, backgroundColor: period === p.key ? C.ink : "transparent", border: `1px solid ${period === p.key ? C.ink : C.rule}`, padding: "6px 16px", cursor: isReader ? "default" : "pointer", marginLeft: -1, opacity: isReader ? 0.4 : 1 }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Reader overlay: blur + CTA */}
      {isReader && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.6)", zIndex: 10, pointerEvents: "none" }}>
          <div style={{ textAlign: "center", padding: 24 }}>
            <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Unlock Reflections with Editor</div>
            <button style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: C.bg, backgroundColor: C.ink, border: "none", padding: "10px 20px", cursor: "pointer", pointerEvents: "auto" }}>Unlock Reflections with Editor →</button>
          </div>
        </div>
      )}

      {/* ===== MAIN GRID: primary (wide) + sidebar (narrow) ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 300px", gap: 0, borderTop: `2px solid ${C.ink}`, paddingTop: 20, marginTop: 16, animation: "fadeInUp 0.5s ease 0.1s both", filter: isReader ? "blur(3px)" : "none", pointerEvents: isReader ? "none" : "auto" }}>

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
            <div style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkMuted, marginTop: 10 }}>— Your Editor</div>
          </div>

          <div style={{ height: 1, backgroundColor: C.rule, marginBottom: 24 }} />

          {/* Connections */}
          <div style={{ backgroundColor: C.sectionBg, padding: "20px 20px", marginBottom: 24 }}>
            <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 14 }}>Connections You Might Not See</div>
            {P.connections.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < P.connections.length - 1 ? `1px solid ${C.rule}` : "none" }}>
                <span style={{ color: C.accent, fontSize: 10, flexShrink: 0, marginTop: 3 }}>✦</span>
                <p style={{ fontFamily: F.body, fontSize: 13, lineHeight: 1.6, color: C.inkLight }}>{c}</p>
              </div>
            ))}
          </div>

          <div style={{ height: 1, backgroundColor: C.rule, marginBottom: 24 }} />

          {/* Ask Your Editor — limits by tier; Reader sees disabled CTA */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <span style={{ color: C.accent, fontSize: 14 }}>✦</span>
              <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>Ask Your Editor</span>
              {!isReader && askUsage.limit >= 0 && (
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.inkMuted, marginLeft: "auto" }}>{askUsage.used} of {askUsage.limit} this month</span>
              )}
            </div>
            <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginBottom: 14, lineHeight: 1.5 }}>
              {isReader ? "Ask anything about your writing — Editor feature." : "Ask anything about your writing, patterns, moods, or recurring themes. Your editor will search across all your entries."}
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                value={askQuery}
                onChange={(e) => !isReader && askUsage.allowed && setAskQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isReader && askUsage.allowed && handleAsk()}
                placeholder={isReader ? "Ask anything about your writing — Editor feature" : (!askUsage.allowed ? (userRole === "editor" ? "Upgrade to Publisher for more questions →" : "Limit reached for this month") : "e.g. When am I happiest? What do I write about Marina?")}
                disabled={isReader || !askUsage.allowed}
                style={{
                  flex: 1, fontFamily: F.body, fontSize: 14, color: C.ink,
                  backgroundColor: (isReader || !askUsage.allowed) ? C.sectionBg : "transparent", border: `1px solid ${C.rule}`,
                  padding: "10px 14px", outline: "none", opacity: (isReader || !askUsage.allowed) ? 0.8 : 1,
                }}
              />
              <button
                onClick={handleAsk}
                disabled={isReader || askLoading || !askQuery.trim() || !askUsage.allowed}
                style={{
                  fontFamily: F.sans, fontSize: 11, fontWeight: 500,
                  color: (askQuery.trim() && askUsage.allowed && !isReader) ? C.bg : C.inkFaint,
                  backgroundColor: (askQuery.trim() && askUsage.allowed && !isReader) ? C.ink : C.rule,
                  border: "none", padding: "10px 20px", cursor: (askQuery.trim() && askUsage.allowed && !isReader) ? "pointer" : "default",
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

            {!isReader && askUsage.allowed && (
              <>
            {!askAnswer && !askLoading && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["When am I happiest?", "Tell me about Marina", "How has my writing changed?", "What role does São Paulo play?"].map((sq, i) => (
                  <button key={i} onClick={() => setAskQuery(sq)} style={{
                    fontFamily: F.sans, fontSize: 10, color: C.inkMuted,
                    backgroundColor: "transparent", border: `1px solid ${C.rule}`,
                    padding: "5px 10px", cursor: "pointer",
                  }}>{sq}</button>
                ))}
              </div>
            )}

            {askLoading && (
              <div style={{ padding: "20px 0", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", animation: "spin 1.5s linear infinite", color: C.accent, fontSize: 14 }}>✦</span>
                <span style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted }}>Searching across your entries...</span>
              </div>
            )}

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
              </>
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

          {/* Stats — always for the period selected in the dropdown */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>By the numbers</div>
            {periodStats && periodStats.from === periodFrom && periodStats.to === periodTo ? (
              [
                { label: "Entries", value: String(periodStats.entries) },
                { label: "Words", value: periodStats.words.toLocaleString() },
                { label: "Days", value: String(periodStats.days) },
                { label: "Avg. per entry", value: String(periodStats.avg) },
                { label: "Personal Essays", value: String(periodStats.personalEssays) },
                { label: "Public", value: String(periodStats.public) },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < 5 ? `1px solid ${C.rule}` : "none" }}>
                  <span style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted }}>{s.label}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.ink }}>{s.value}</span>
                </div>
              ))
            ) : (
              P.stats.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < P.stats.length - 1 ? `1px solid ${C.rule}` : "none" }}>
                  <span style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted }}>{s.label}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.ink }}>{s.value}</span>
                </div>
              ))
            )}
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

function EditionSwitcher({ C, period, onPeriodChange, canAccessArchives, editionsList, onSelectEdition }) {
  const [showArchivePicker, setShowArchivePicker] = useState(false);
  const archivePickerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (archivePickerRef.current && !archivePickerRef.current.contains(e.target)) {
        setShowArchivePicker(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const tabs = [
    { k: "week", l: "This Week", locked: false },
    { k: "last", l: "Last Week", locked: !canAccessArchives },
    { k: "month", l: "This Month", locked: !canAccessArchives },
    { k: "archive", l: "All Editions", locked: !canAccessArchives },
  ];

  const handleClick = (o) => {
    if (o.locked) return;
    if (o.k === "archive") {
      setShowArchivePicker(true);
      if (period !== "archive") onPeriodChange("archive");
    } else {
      setShowArchivePicker(false);
      onPeriodChange(o.k);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "12px 0", borderBottom: `1px solid ${C.rule}`, position: "relative" }} ref={archivePickerRef}>
      {tabs.map((o) => (
        <button
          key={o.k}
          onClick={() => handleClick(o)}
          style={{
            fontFamily: F.sans, fontSize: 11, fontWeight: period === o.k ? 500 : 400,
            color: o.locked ? C.inkFaint : (period === o.k ? C.bg : C.inkMuted),
            backgroundColor: period === o.k && !o.locked ? C.ink : "transparent",
            border: `1px solid ${period === o.k && !o.locked ? C.ink : C.rule}`,
            padding: "6px 16px", cursor: o.locked ? "default" : "pointer",
            marginLeft: -1, opacity: o.locked ? 0.7 : 1,
          }}
          title={o.locked ? "Upgrade to access archives" : undefined}
        >
          {o.l}
        </button>
      ))}
      {showArchivePicker && canAccessArchives && editionsList.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
          marginTop: 4, padding: 8, backgroundColor: C.bg, border: `1px solid ${C.rule}`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)", maxHeight: 240, overflowY: "auto",
          minWidth: 280, zIndex: 100,
        }}>
          <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Select Edition</div>
          {editionsList.map((ed) => (
            <button
              key={ed.id}
              onClick={() => {
                onSelectEdition(ed.id);
                setShowArchivePicker(false);
              }}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "8px 10px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: F.sans, fontSize: 12, color: C.inkLight,
                borderBottom: `1px solid ${C.rule}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.sectionBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <span style={{ fontWeight: 500, color: C.ink }}>{ed.week}</span>
              <span style={{ color: C.inkMuted, marginLeft: 8 }}>{ed.num}</span>
              <span style={{ display: "block", fontFamily: F.body, fontSize: 10, fontStyle: "italic", color: C.inkFaint, marginTop: 2 }}>{ed.headline}</span>
            </button>
          ))}
        </div>
      )}
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
    { id: "limits", label: "Limits" },
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
          {tab === "limits" && <AdminLimitsTab C={C} setSaveMsg={setSaveMsg} />}
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
      <h1 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Editor Prompts</h1>
      <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkMuted, marginBottom: 32 }}>
        Manage the system prompts used by the Editor. Changes take effect immediately.
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
                  {(prompt.id === "reflections_from_entries" || prompt.id === "reflections_from_summaries") && (
                    <p style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, marginTop: 8 }}>
                      Variables: <code style={{ background: C.sectionBg, padding: "1px 4px" }}>{`{{period_label}}`}</code> is injected at runtime by the backend (e.g. “this week (Feb 9–15)”).
                    </p>
                  )}
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

// ── Admin: Limits Tab (usage_limits — Ask Your Editor, AI edits, Reflections) ──
function AdminLimitsTab({ C, setSaveMsg }) {
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editLimit, setEditLimit] = useState("");
  const [editPeriod, setEditPeriod] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsageLimits()
      .then(setLimits)
      .catch((err) => console.error("Failed to load usage limits:", err))
      .finally(() => setLoading(false));
  }, []);

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditLimit(row.limit_value === -1 ? "" : String(row.limit_value));
    setEditPeriod(row.period);
    setSaveMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLimit("");
    setEditPeriod("");
    setSaveMsg(null);
  };

  const handleSave = async () => {
    if (editingId == null) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const limitValue = editLimit === "" || editLimit === "-1" ? -1 : parseInt(editLimit, 10);
      if (isNaN(limitValue) || limitValue < -1) {
        setSaveMsg("Limit must be -1 (unlimited) or a non-negative number.");
        return;
      }
      await updateUsageLimit(editingId, { limit_value: limitValue, period: editPeriod });
      setLimits((prev) => prev.map((r) => (r.id === editingId ? { ...r, limit_value: limitValue, period: editPeriod } : r)));
      setSaveMsg("Saved.");
      setTimeout(() => setSaveMsg(null), 2000);
      cancelEdit();
    } catch (err) {
      setSaveMsg("Error: " + (err.message || "Failed to save"));
      setTimeout(() => setSaveMsg(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ fontFamily: F.sans, fontSize: 13, color: C.inkMuted }}>Loading limits…</div>
    );
  }

  const inputStyle = {
    padding: "6px 10px", fontFamily: F.sans, fontSize: 12, color: C.ink,
    backgroundColor: C.bg, border: `1px solid ${C.rule}`, outline: "none", width: 72,
  };
  const periodOptions = ["day", "week", "month"];

  return (
    <>
      <h1 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Usage limits</h1>
      <p style={{ fontFamily: F.sans, fontSize: 12, color: C.inkMuted, marginBottom: 24 }}>
        Limits per role and feature. Use <strong>-1</strong> for unlimited. Changes apply immediately.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.sans, fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.rule}` }}>
              <th style={{ textAlign: "left", padding: "10px 12px", color: C.inkMuted, fontWeight: 600 }}>Role</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: C.inkMuted, fontWeight: 600 }}>Feature</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: C.inkMuted, fontWeight: 600 }}>Limit</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: C.inkMuted, fontWeight: 600 }}>Period</th>
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {limits.map((row) => (
              <tr key={row.id} style={{ borderBottom: `1px solid ${C.rule}` }}>
                <td style={{ padding: "10px 12px", color: C.ink }}>{row.role}</td>
                <td style={{ padding: "10px 12px", color: C.ink }}>{row.feature}</td>
                <td style={{ padding: "8px 12px" }}>
                  {editingId === row.id ? (
                    <input
                      type="text"
                      value={editLimit}
                      onChange={(e) => setEditLimit(e.target.value)}
                      placeholder="-1"
                      style={inputStyle}
                    />
                  ) : (
                    <span style={{ color: C.ink }}>{row.limit_value === -1 ? "Unlimited" : row.limit_value}</span>
                  )}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  {editingId === row.id ? (
                    <select value={editPeriod} onChange={(e) => setEditPeriod(e.target.value)} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
                      {periodOptions.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ color: C.ink }}>{row.period}</span>
                  )}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  {editingId === row.id ? (
                    <span style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleSave} disabled={saving} style={{ fontFamily: F.sans, fontSize: 11, padding: "4px 10px", background: C.ink, color: C.bg, border: "none", cursor: saving ? "default" : "pointer" }}>Save</button>
                      <button onClick={cancelEdit} style={{ fontFamily: F.sans, fontSize: 11, padding: "4px 10px", background: "none", border: `1px solid ${C.rule}`, color: C.inkMuted, cursor: "pointer" }}>Cancel</button>
                    </span>
                  ) : (
                    <button onClick={() => startEdit(row)} style={{ fontFamily: F.sans, fontSize: 11, padding: "4px 10px", background: "none", border: `1px solid ${C.rule}`, color: C.inkMuted, cursor: "pointer" }}>Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Admin: Dashboard Tab ────────────────────────────────────
function AdminDashboardTab({ C, session }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generateUserId, setGenerateUserId] = useState(session?.user?.id || "");
  const [generateWeekStart, setGenerateWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  });
  const [generatingEdition, setGeneratingEdition] = useState(false);
  const [generateMsg, setGenerateMsg] = useState(null);

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

      {/* Manual edition generation */}
      <div style={{ border: `1px solid ${C.rule}`, backgroundColor: C.sectionBg, padding: "14px 16px", marginBottom: 20 }}>
        <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: C.inkMuted, marginBottom: 10 }}>
          Edition Generator
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px auto", gap: 8, alignItems: "center" }}>
          <input
            value={generateUserId}
            onChange={(e) => setGenerateUserId(e.target.value)}
            placeholder="User ID (blank = all users if enabled server-side)"
            style={{
              padding: "8px 10px", fontFamily: F.mono, fontSize: 11, color: C.ink,
              backgroundColor: C.bg, border: `1px solid ${C.rule}`, outline: "none",
            }}
          />
          <input
            type="date"
            value={generateWeekStart}
            onChange={(e) => setGenerateWeekStart(e.target.value)}
            style={{
              padding: "8px 10px", fontFamily: F.sans, fontSize: 11, color: C.ink,
              backgroundColor: C.bg, border: `1px solid ${C.rule}`, outline: "none",
            }}
          />
          <button
            onClick={async () => {
              setGeneratingEdition(true);
              setGenerateMsg(null);
              try {
                const payload = {
                  user_id: generateUserId.trim() || undefined,
                  week_start: generateWeekStart || undefined,
                };
                await adminApi(session, "generate_edition", payload);
                setGenerateMsg("Edition generation started/completed successfully.");
              } catch (err) {
                setGenerateMsg(`Error: ${err.message}`);
              } finally {
                setGeneratingEdition(false);
              }
            }}
            disabled={generatingEdition}
            style={{
              padding: "8px 14px", fontFamily: F.sans, fontSize: 11, fontWeight: 600,
              color: C.bg, backgroundColor: C.ink, border: "none",
              cursor: generatingEdition ? "default" : "pointer",
              opacity: generatingEdition ? 0.7 : 1,
            }}
          >
            {generatingEdition ? "Generating..." : "Generate Edition"}
          </button>
        </div>
        {generateMsg && (
          <div style={{ marginTop: 8, fontFamily: F.sans, fontSize: 11, color: generateMsg.startsWith("Error:") ? "#c41e1e" : C.accent }}>
            {generateMsg}
          </div>
        )}
      </div>

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
function ArticleView({ entry, edition, onClose, onPrev, onNext, C, isProUser, siblingEntries, onNavigateToEntry, userId, onStartEdit }) {
  const [shareCopied, setShareCopied] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
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
  const showAiVersion = hasAiEdit && isProUser;
  const sealed = isEntrySealed(entry);

  const headline = sealed ? null : (showAiVersion && entry.ai_edit?.headline
    ? entry.ai_edit.headline
    : entry.title);
  const subhead = sealed ? null : (entry.subhead || (showAiVersion && entry.ai_edit?.subhead) || null);
  const bodyText = sealed ? "" : (showAiVersion
    ? entry.ai_edit?.edited_body ?? ""
    : entry.body ?? "");

  const useDropCapFlag = showAiVersion && entry.ai_edit?.mode === "rewrite";
  const openDateStr = entry.letter_open_at ? (() => {
    const d = new Date(entry.letter_open_at);
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  })() : "";

  const photo = (entry.attachments || []).find((a) => a.type === "photo");

  const createdDate = new Date(entry.created_at);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dateStr = `${months[createdDate.getMonth()]} ${createdDate.getDate()}, ${createdDate.getFullYear()}`;

  const metaParts = [
    dateStr,
    `${readTime} min read`,
    `via ${SOURCE_MAP[entry.source] || entry.source}`,
  ];
  const updatedDate = entry.updated_at ? new Date(entry.updated_at) : null;
  const createdDateTs = new Date(entry.created_at).getTime();
  const isEdited = updatedDate && updatedDate.getTime() - createdDateTs > 2000;
  if (isEdited) {
    const edStr = `${months[updatedDate.getMonth()]} ${updatedDate.getDate()}, ${updatedDate.getFullYear()}`;
    metaParts.push(`last edited ${edStr}`);
  }
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
        <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>
          {edCtx ? `Vol. ${edCtx.volume} · No. ${edCtx.number || edCtx.num}` : "Notebook"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {entry.is_public && (
            <button onClick={() => {
              const url = `${window.location.origin}/entry/${entry.id}`;
              navigator.clipboard.writeText(url).then(() => {
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              });
            }} style={{
              display: "flex", alignItems: "center", gap: 4, background: "none",
              border: `1px solid ${C.rule}`, padding: "4px 10px", cursor: "pointer",
              fontFamily: F.sans, fontSize: 10, color: shareCopied ? C.accent : C.inkMuted,
              transition: "color 0.2s",
            }}>
              {shareCopied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Link copied!
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  Share
                </>
              )}
            </button>
          )}
          {entry.is_public ? (
            <span style={{
              fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: C.accent,
              display: "flex", alignItems: "center", gap: 5,
              backgroundColor: C.accentBg, border: `1px solid ${C.accent}`,
              padding: "5px 12px",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2c-4 4.5-4 13.5 0 20"/><path d="M12 2c4 4.5 4 13.5 0 20"/><path d="M2 12h20"/><path d="M4 7h16"/><path d="M4 17h16"/></svg>
              Public
            </span>
          ) : (
            <span style={{
              fontFamily: F.sans, fontSize: 11, fontWeight: 500, color: C.inkMuted,
              display: "flex", alignItems: "center", gap: 5,
              backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`,
              padding: "5px 12px",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Private
            </span>
          )}
          {userId && entry.user_id === userId && onStartEdit && (
            <button
              onClick={() => onStartEdit(entry)}
              style={{
                display: "flex", alignItems: "center", gap: 5, background: C.accentBg,
                border: `1px solid ${C.accent}`, padding: "5px 12px", cursor: "pointer",
                fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: C.accent,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
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

          {/* Sealed letter placeholder */}
          {sealed && (
            <div style={{
              padding: "48px 0", textAlign: "center",
              backgroundColor: C.sectionBg, border: `2px dashed ${C.rule}`,
              marginBottom: 32,
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
              <p style={{ fontFamily: F.display, fontSize: 20, fontWeight: 600, color: C.ink, marginBottom: 8 }}>This letter is sealed</p>
              <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkMuted }}>
                It will open on {openDateStr}. You&apos;ll receive an email and in-app notification when it&apos;s ready.
              </p>
            </div>
          )}

          {/* Photo */}
          {!sealed && photo && (
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

          {/* Body text */}
          {!sealed && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <RichTextContent text={bodyText} C={C} useDropCap={useDropCapFlag} />
            </div>
          )}

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
                      {(() => {
                        if (isEntrySealed(sib)) return sib.letter_open_at ? `Sealed until ${new Date(sib.letter_open_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "Sealed letter";
                        const plain = stripHtml(sib.body || "");
                        return sib.title || (plain ? plain.slice(0, 60) + (plain.length > 60 ? "..." : "") : "Untitled");
                      })()}
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
// PUBLIC ENTRY VIEW — Shareable reading experience (no auth)
// ============================================================
function PublicEntryView() {
  const [entry, setEntry] = useState(null);
  const [authorName, setAuthorName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fullScreen, setFullScreen] = useState(false);

  const C = getTheme("light", "red");

  const entryId = window.location.pathname.split("/entry/")[1];

  useEffect(() => {
    if (!entryId) { setError("Entry not found."); setLoading(false); return; }
    fetchPublicEntry(entryId)
      .then(async (e) => {
        setEntry(e);
        try {
          const p = await fetchPublicProfile(e.user_id);
          if (p) setAuthorName(p.name);
        } catch { /* author name is optional */ }
      })
      .catch(() => setError("This entry doesn't exist or isn't public."))
      .finally(() => setLoading(false));
  }, [entryId]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape" && fullScreen) setFullScreen(false); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [fullScreen]);

  if (loading) {
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

  if (error || !entry) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#fff" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,300;1,8..60,400;1,8..60,500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        `}</style>
        <div style={{ borderBottom: "1px solid #e2e2e2", padding: "0 32px", height: 56, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a href="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: "#121212", textDecoration: "none" }}>The Hauss</a>
          <a href="/login" style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: "#fff", backgroundColor: "#121212", padding: "8px 20px", textDecoration: "none" }}>Start Writing</a>
        </div>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "120px 24px", textAlign: "center" }}>
          <div style={{ fontFamily: F.display, fontSize: 32, fontWeight: 700, color: "#121212", marginBottom: 12 }}>Not Found</div>
          <p style={{ fontFamily: F.body, fontSize: 16, color: "#727272", fontStyle: "italic" }}>{error || "This entry doesn't exist or isn't public."}</p>
          <a href="/" style={{ display: "inline-block", marginTop: 32, fontFamily: F.sans, fontSize: 13, color: "#c41e1e", textDecoration: "none" }}>← Back to The Hauss</a>
        </div>
      </div>
    );
  }

  const SECTION_MAP = {
    dispatch: "Dispatch", essay: "Personal Essay", letter: "Letter to Self",
    review: "Review", photo: "Photo Essay",
  };
  const SOURCE_MAP = { app: "App", telegram: "Telegram", whatsapp: "WhatsApp", api: "API" };
  const MOOD_MAP = [
    { emoji: "☀️", label: "Bright" }, { emoji: "🌤", label: "Calm" },
    { emoji: "🌧", label: "Heavy" }, { emoji: "⚡", label: "Electric" },
    { emoji: "🌙", label: "Reflective" },
  ];

  const readTime = Math.max(1, Math.ceil((entry.word_count || 0) / 230));
  const hasAiEdit = entry.ai_edit?.applied;
  const headline = hasAiEdit && entry.ai_edit.headline ? entry.ai_edit.headline : entry.title;
  const subhead = entry.subhead || (hasAiEdit && entry.ai_edit.subhead) || null;
  const bodyText = hasAiEdit ? entry.ai_edit.edited_body : entry.body;
  const useDropCapPublic = hasAiEdit && entry.ai_edit?.mode === "rewrite";
  const photo = (entry.attachments || []).find((a) => a.type === "photo");

  const createdDate = new Date(entry.created_at);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dateStr = `${months[createdDate.getMonth()]} ${createdDate.getDate()}, ${createdDate.getFullYear()}`;

  const metaParts = [dateStr, `${readTime} min read`];
  if (authorName) metaParts.push(`by ${authorName}`);
  if (entry.mood != null && MOOD_MAP[entry.mood]) metaParts.push(MOOD_MAP[entry.mood].emoji);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", color: "#121212" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,300;1,8..60,400;1,8..60,500&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@300;400&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::selection { background: #121212; color: #fff; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Navbar */}
      {!fullScreen && (
        <div style={{
          borderBottom: "1px solid #e2e2e2", padding: "0 32px", height: 56,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          animation: "fadeIn 0.3s ease",
        }}>
          <a href="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: "#121212", textDecoration: "none" }}>The Hauss</a>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setFullScreen(true)} style={{
              display: "flex", alignItems: "center", gap: 4, background: "none",
              border: "1px solid #e2e2e2", padding: "5px 12px", cursor: "pointer",
              fontFamily: F.sans, fontSize: 10, color: "#727272",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              Full Screen
            </button>
            <a href="/login" style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: "#fff", backgroundColor: "#121212", padding: "8px 20px", textDecoration: "none" }}>Start Writing</a>
          </div>
        </div>
      )}

      {/* Full-screen exit bar */}
      {fullScreen && (
        <button onClick={() => setFullScreen(false)} style={{
          position: "fixed", top: 16, right: 16, zIndex: 100,
          display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.9)",
          border: "1px solid #e2e2e2", padding: "5px 12px", cursor: "pointer",
          fontFamily: F.sans, fontSize: 10, color: "#727272",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          Exit Full Screen
        </button>
      )}

      {/* Article Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: fullScreen ? "60px 24px 120px" : "48px 24px 120px", animation: "fadeIn 0.5s ease" }}>
        {/* Section label */}
        <div style={{
          fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: "#c41e1e",
          textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 16,
        }}>
          {SECTION_MAP[entry.section] || entry.section}
        </div>

        {/* Headline */}
        {headline && (
          <h1 style={{
            fontFamily: F.display, fontSize: 36, fontWeight: 700,
            lineHeight: 1.15, color: "#121212", marginBottom: subhead ? 12 : 20,
          }}>{headline}</h1>
        )}

        {/* Subhead */}
        {subhead && (
          <p style={{
            fontFamily: F.body, fontSize: 17, fontStyle: "italic",
            color: "#727272", lineHeight: 1.5, marginBottom: 20,
          }}>{subhead}</p>
        )}

        {/* Divider */}
        <div style={{ width: 60, height: 2, backgroundColor: "#121212", marginBottom: 20 }} />

        {/* Meta */}
        <div style={{ fontFamily: F.sans, fontSize: 11, color: "#999", marginBottom: 32 }}>
          {metaParts.join(" · ")}
        </div>

        {/* Photo */}
        {photo && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ width: "100%", height: 400, backgroundColor: "#f7f7f7", overflow: "hidden" }}>
              {photo.url ? (
                <img src={photo.url} alt={photo.metadata?.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
              )}
            </div>
            {photo.metadata?.caption && (
              <div style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: "#999", marginTop: 8 }}>{photo.metadata.caption}</div>
            )}
          </div>
        )}

        {/* Body */}
        <RichTextContent text={bodyText} C={{ ink: "#121212", inkLight: "#3a3a3a", accent: "#c41e1e", rule: "#e2e2e2", sectionBg: "#f7f7f7" }} useDropCap={useDropCapPublic} />

        {/* Footer divider */}
        <div style={{ height: 1, backgroundColor: "#e2e2e2", margin: "40px 0 24px" }} />

        {/* Tags */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
          {entry.mood != null && MOOD_MAP[entry.mood] && (
            <span style={{ fontFamily: F.sans, fontSize: 10, padding: "4px 10px", border: "1px solid #e2e2e2", color: "#727272" }}>
              {MOOD_MAP[entry.mood].emoji} {MOOD_MAP[entry.mood].label}
            </span>
          )}
          <span style={{ fontFamily: F.sans, fontSize: 10, padding: "4px 10px", border: "1px solid #e2e2e2", color: "#727272" }}>
            {SECTION_MAP[entry.section]}
          </span>
          <span style={{ fontFamily: F.sans, fontSize: 10, padding: "4px 10px", border: "1px solid #e2e2e2", color: "#727272" }}>
            {entry.word_count} words
          </span>
        </div>

        {/* CTA */}
        <div style={{
          textAlign: "center", padding: "40px 0", borderTop: "1px solid #e2e2e2",
        }}>
          <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8 }}>
            MADE WITH
          </div>
          <a href="/" style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: "#121212", textDecoration: "none" }}>The Hauss</a>
          <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: "#999", margin: "8px 0 20px" }}>
            Your life, published weekly.
          </p>
          <a href="/login" style={{
            display: "inline-block", fontFamily: F.sans, fontSize: 13, fontWeight: 500,
            color: "#fff", backgroundColor: "#121212", padding: "12px 32px", textDecoration: "none",
          }}>
            Start Writing — It's Free
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PUBLIC EDITION VIEW — shareable edition route
// ============================================================
function PublicEditionView() {
  const [editionData, setEditionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const editionId = window.location.pathname.split("/edition/")[1];

  useEffect(() => {
    if (!editionId) { setError("Edition not found."); setLoading(false); return; }
    fetchPublicEdition(editionId)
      .then(setEditionData)
      .catch(() => setError("This edition is private or unavailable."))
      .finally(() => setLoading(false));
  }, [editionId]);

  const C = getTheme("light", "red");

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink }}>The Hauss</div>
      </div>
    );
  }

  if (error || !editionData) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: C.bg, color: C.ink }}>
        <div style={{ borderBottom: `1px solid ${C.rule}`, padding: "0 24px", height: 56, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a href="/" style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.ink, textDecoration: "none" }}>The Hauss</a>
          <a href="/login" style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.bg, backgroundColor: C.ink, padding: "8px 18px", textDecoration: "none" }}>Start Writing</a>
        </div>
        <div style={{ maxWidth: 740, margin: "0 auto", padding: "100px 24px", textAlign: "center" }}>
          <h1 style={{ fontFamily: F.display, fontSize: 34, marginBottom: 12 }}>Edition Unavailable</h1>
          <p style={{ fontFamily: F.body, fontSize: 16, fontStyle: "italic", color: C.inkMuted }}>{error}</p>
        </div>
      </div>
    );
  }

  const isCover = editionData.mode === "cover";
  const author = editionData.author || {};
  const pubTitle = author.publication_name || "The Hauss";
  const pubMotto = author.motto || "All the life that's fit to print";
  const authorName = author.name || "";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, color: C.ink }}>
      {/* Navbar */}
      <div style={{ borderBottom: `1px solid ${C.rule}`, padding: "0 24px", height: 56, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href="/" style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.ink, textDecoration: "none" }}>The Hauss</a>
        <a href="/login" style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.bg, backgroundColor: C.ink, padding: "8px 18px", textDecoration: "none" }}>Start Writing</a>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 60px" }}>
        {/* MASTHEAD — mirrors internal edition view */}
        <header style={{ textAlign: "center", padding: "20px 0 12px" }}>
          {authorName && (
            <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 500, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 }}>
              {authorName}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, flex: 1 }}>
              <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>
                {editionData.edition.publication_date || editionData.edition.week}
              </span>
              {(editionData.edition.publication_city || author.city) && (
                <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>
                  {editionData.edition.publication_city || author.city}
                  {editionData.edition.publication_temperature != null ? ` · ${Math.round(editionData.edition.publication_temperature)}°C` : ""}
                </span>
              )}
            </div>
            <div style={{ flex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: "100%", height: 2, backgroundColor: C.ruleDark || C.ink }} />
              <h1 style={{ fontFamily: F.display, fontSize: 40, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1, margin: "8px 0", color: C.ink }}>{pubTitle}</h1>
              <div style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkMuted, marginBottom: 8, letterSpacing: "0.5px" }}>{pubMotto}</div>
              <div style={{ width: "100%", height: 2, backgroundColor: C.ruleDark || C.ink }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flex: 1 }}>
              <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{editionData.edition.number}</span>
              <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{editionData.edition.entryCount} entries</span>
            </div>
          </div>
        </header>

        {/* Two-column layout — top stories + sidebar */}
        {(editionData.topStories?.length > 0 || editionData.editorial?.content) ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 340px", padding: "24px 0" }}>
            {/* Left column: top stories */}
            <div style={{ paddingRight: 28 }}>
              {editionData.topStories[0] && (
                <article
                  onClick={isCover ? undefined : () => { window.location.href = `/entry/${editionData.topStories[0].id}`; }}
                  style={{ cursor: isCover ? "default" : "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>{editionData.topStories[0].section}</span>
                  </div>
                  <h2 style={{ fontFamily: F.display, fontSize: 30, fontWeight: 700, lineHeight: 1.15, color: C.ink, marginBottom: 10 }}>{editionData.topStories[0].headline}</h2>
                  {editionData.topStories[0].subhead && (
                    <p style={{ fontFamily: F.body, fontSize: 15, fontStyle: "italic", color: C.inkLight, lineHeight: 1.5, marginBottom: 16 }}>{editionData.topStories[0].subhead}</p>
                  )}
                  <div style={{ backgroundColor: C.sectionBg, height: 200, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.rule} strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  </div>
                  <p style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.7, color: C.inkLight, marginBottom: 12 }}>{editionData.topStories[0].excerpt?.slice(0, 200)}{editionData.topStories[0].excerpt?.length > 200 ? "..." : ""}</p>
                  <div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, display: "flex", gap: 6 }}>
                    <span>{editionData.topStories[0].readTime}</span><span style={{ color: C.rule }}>·</span><span>{editionData.topStories[0].date}</span>
                  </div>
                </article>
              )}
              {editionData.topStories[1] && (<>
                <div style={{ height: 1, backgroundColor: C.rule, margin: "24px 0" }} />
                <article
                  onClick={isCover ? undefined : () => { window.location.href = `/entry/${editionData.topStories[1].id}`; }}
                  style={{ cursor: isCover ? "default" : "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>{editionData.topStories[1].section}</span>
                  </div>
                  <h3 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: C.ink, marginBottom: 8 }}>{editionData.topStories[1].headline}</h3>
                  {editionData.topStories[1].subhead && (
                    <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkLight, marginBottom: 8 }}>{editionData.topStories[1].subhead}</p>
                  )}
                  <p style={{ fontFamily: F.body, fontSize: 14, lineHeight: 1.65, color: C.inkLight, marginBottom: 10 }}>{editionData.topStories[1].excerpt?.slice(0, 150)}{editionData.topStories[1].excerpt?.length > 150 ? "..." : ""}</p>
                  <div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, display: "flex", gap: 6 }}>
                    <span>{editionData.topStories[1].readTime}</span><span style={{ color: C.rule }}>·</span><span>{editionData.topStories[1].date}</span>
                  </div>
                </article>
              </>)}
            </div>
            {/* Divider */}
            <div style={{ backgroundColor: C.rule }} />
            {/* Right column: sidebar */}
            <div style={{ paddingLeft: 28 }}>
              {editionData.briefing?.length > 0 && (
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
              )}
              {editionData.editorial?.content && (
                <div style={{ backgroundColor: C.sectionBg, padding: 20, marginBottom: 24 }}>
                  <div style={{ fontFamily: F.display, fontSize: 18, color: C.accent, marginBottom: 8 }}>✦</div>
                  <h3 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, fontStyle: "italic", color: C.ink, marginBottom: 10 }}>{editionData.editorial.headline}</h3>
                  <p style={{ fontFamily: F.body, fontSize: 13, lineHeight: 1.65, color: C.inkLight, marginBottom: 12 }}>{editionData.editorial.content}</p>
                  <div style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: C.inkMuted }}>
                    — {editionData.edition?.is_custom && editionData.author?.name ? editionData.author.name : "The Hauss Editor"}
                  </div>
                </div>
              )}
              {editionData.sections?.length > 0 && (
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
              )}
            </div>
          </div>
        ) : (
          /* Cover mode with no stories — show editorial-only view */
          <div style={{ padding: "40px 0" }}>
            {editionData.editorial?.content && (
              <div style={{ backgroundColor: C.sectionBg, padding: 24, maxWidth: 600, margin: "0 auto", marginBottom: 24 }}>
                <div style={{ fontFamily: F.display, fontSize: 18, color: C.accent, marginBottom: 8 }}>✦</div>
                <h3 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, fontStyle: "italic", color: C.ink, marginBottom: 10 }}>The Editor's Note</h3>
                <p style={{ fontFamily: F.body, fontSize: 14, lineHeight: 1.65, color: C.inkLight, marginBottom: 12 }}>{editionData.editorial.content}</p>
                <div style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: C.inkMuted }}>
                  — {editionData.edition?.is_custom && editionData.author?.name ? editionData.author.name : "The Hauss Editor"}
                </div>
              </div>
            )}
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkMuted, marginBottom: 12 }}>
                {editionData.edition.entryCount} entries · {editionData.stats?.wordsThisWeek?.toLocaleString() || 0} words this week
              </p>
            </div>
          </div>
        )}

        {/* More Stories */}
        {editionData.moreStories?.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ height: 2, backgroundColor: C.ink, marginBottom: 16 }} />
            <h3 style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: C.inkMuted, marginBottom: 16 }}>Also in This Edition</h3>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(editionData.moreStories.length, 3)}, 1fr)`, gap: 24 }}>
              {editionData.moreStories.map((s, i) => (
                <div
                  key={i}
                  onClick={isCover ? undefined : () => { window.location.href = `/entry/${s.id}`; }}
                  style={{ borderRight: i < editionData.moreStories.length - 1 ? `1px solid ${C.rule}` : "none", paddingRight: 24, cursor: isCover ? "default" : "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>{s.section}</span>
                  </div>
                  <h4 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, lineHeight: 1.25, color: C.ink, marginBottom: 8 }}>{s.headline}</h4>
                  <span style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted }}>{s.readTime}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "20px 0", borderTop: `2px solid ${C.ink}`, marginBottom: 24 }}>
          {[
            { n: editionData.stats?.totalEntries?.toLocaleString() || "0", l: "Total Entries" },
            { n: editionData.stats?.thisEdition || "0", l: "This Edition" },
            { n: editionData.stats?.wordsThisWeek?.toLocaleString() || "0", l: "Words" },
          ].map((s, i, a) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 32px" }}>
                <span style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.ink }}>{s.n}</span>
                <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", marginTop: 4 }}>{s.l}</span>
              </div>
              {i < a.length - 1 && <div style={{ width: 1, height: 36, backgroundColor: C.rule }} />}
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: C.inkMuted }}>
            Published with <a href="/" style={{ color: C.ink, textDecoration: "none", fontWeight: 600 }}>The Hauss</a>
          </div>
          {isCover && (
            <a href="/login" style={{ fontFamily: F.sans, fontSize: 12, color: C.accent, textDecoration: "none", marginTop: 8, display: "inline-block" }}>
              Start your own edition →
            </a>
          )}
        </footer>
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [articleEntry, setArticleEntry] = useState(null);
  const [articleList, setArticleList] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);
  const [articleIndex, setArticleIndex] = useState(0);
  const [pubName, setPubName] = useState("The Deborah Times");
  const [motto, setMotto] = useState("All the life that's fit to print");
  const [city, setCity] = useState("");
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
  const [selectedEditionId, setSelectedEditionId] = useState(null);
  const [fallbackTemp, setFallbackTemp] = useState(null);
  const [shareSaving, setShareSaving] = useState(false);
  const [shareToast, setShareToast] = useState(null);
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
    avatarUrl: profile?.avatar_url || null,
  };

  const canShareFullEdition = hasAccess(user.role, user.isTester, "editor");

  const handleToggleEditionShare = useCallback(async () => {
    if (!userId || !editionData?.edition?.id || shareSaving) return;
    setShareSaving(true);
    setShareToast(null);
    try {
      const isPublic = !editionData.edition.is_public;
      const shareMode = canShareFullEdition ? "full" : "cover";
      const updated = await updateEditionSharing(userId, editionData.edition.id, {
        isPublic,
        shareMode,
      });
      setEditionData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          edition: {
            ...prev.edition,
            is_public: updated.is_public,
            share_mode: updated.share_mode,
          },
        };
      });
      setShareToast(isPublic ? "Edition is now public." : "Edition is now private.");
      setTimeout(() => setShareToast(null), 2200);
    } catch (err) {
      setShareToast("Failed to update sharing.");
      setTimeout(() => setShareToast(null), 2200);
    } finally {
      setShareSaving(false);
    }
  }, [userId, editionData, canShareFullEdition, shareSaving]);

  const handleCopyEditionShareLink = useCallback(async () => {
    if (!editionData?.edition?.id) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/edition/${editionData.edition.id}`);
      setShareToast("Share link copied.");
      setTimeout(() => setShareToast(null), 2200);
    } catch {
      setShareToast("Unable to copy link.");
      setTimeout(() => setShareToast(null), 2200);
    }
  }, [editionData]);

  const canAccessArchives = hasAccess(profile?.role || "reader", profile?.is_tester || false, "editor");

  // Fetch profile after auth
  useEffect(() => {
    if (!userId) return;
    fetchProfile(userId)
      .then((p) => {
        setProfile(p);
        if (p?.publication_name) setPubName(p.publication_name);
        if (p?.motto) setMotto(p.motto);
        if (p?.city !== undefined) setCity(p.city || "");
        if (p?.theme_mode) setMode(p.theme_mode);
        if (p?.theme_accent) setAccent(p.theme_accent);
      })
      .catch(console.error);
  }, [userId]);

  // Fetch edition data — always latest, or a specific one selected from Archives
  useEffect(() => {
    if (!userId) return;
    setEditionLoading(true);
    if (selectedEditionId) {
      fetchEditionById(userId, selectedEditionId)
        .then(setEditionData)
        .catch(console.error)
        .finally(() => setEditionLoading(false));
    } else {
      fetchEditionByOffset(userId, 0)
        .then(setEditionData)
        .catch(console.error)
        .finally(() => setEditionLoading(false));
    }
  }, [userId, dataVersion, selectedEditionId]);

  // Fallback: fetch temperature client-side when edition has no stored temp (e.g. old editions)
  useEffect(() => {
    const ed = editionData?.edition;
    const cityForTemp = ed?.publication_city || city;
    if (!ed || !cityForTemp || ed.publication_temperature != null) {
      setFallbackTemp(null);
      return;
    }
    let cancelled = false;
    fetchCityWeather(cityForTemp).then(({ temperature }) => {
      if (!cancelled && temperature != null) setFallbackTemp(temperature);
    });
    return () => { cancelled = true; };
  }, [editionData?.edition?.id, editionData?.edition?.publication_city, editionData?.edition?.publication_temperature, city]);

  // Public entry route — accessible without auth
  if (window.location.pathname.startsWith("/entry/")) {
    return <PublicEntryView />;
  }
  if (window.location.pathname.startsWith("/edition/")) {
    return <PublicEditionView />;
  }

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

      <PlatformHeader user={user} C={C} userId={userId} onSettings={() => setSettingsOpen(true)} onProfile={() => setProfileOpen(true)} onEditor={() => setEditorOpen(true)} onAdmin={() => setAdminOpen(true)} isAdmin={user.role === "admin"} onOpenArticle={openArticle} />

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px" }}>

        {/* NAV — always in same position, sticky subheader */}
        <nav style={{
          display: "flex", justifyContent: "center", gap: 24, padding: "12px 0",
          borderBottom: `1px solid ${C.rule}`,
          position: "sticky", top: 48, zIndex: 800,
          backgroundColor: C.bg, transition: "background-color 0.4s ease",
        }}>
          {[
            { key: "journal", label: "Notebook" },
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
          <JournalView C={C} userId={userId} onSwitchToEdition={() => setView("edition")} onNewEntry={() => setEditorOpen(true)} dataVersion={dataVersion} onOpenArticle={openArticle} editorOpen={editorOpen} editingEntry={editingEntry} />
        ) : view === "archives" ? (
          <ArchivesView
            C={C}
            userId={userId}
            user={user}
            session={session}
            onSelectEdition={(id) => {
              setSelectedEditionId(id);
            }}
            onSwitchToEdition={() => setView("edition")}
            onRefresh={handleRefresh}
          />
        ) : view === "sections" ? (
          <SectionsView C={C} userId={userId} onOpenArticle={openArticle} />
        ) : view === "reflections" ? (
          <ReflectionsView C={C} userId={userId} userRole={user?.role} isAdmin={user?.role === "admin"} session={session} />
        ) : (
        <div>
        {editionLoading ? <LoadingBlock C={C} text="Loading edition..." /> : !editionData ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontFamily: F.body, fontSize: 14, color: C.inkMuted }}>No editions yet. Start writing!</p>
            {selectedEditionId && (
              <button onClick={() => setSelectedEditionId(null)} style={{
                marginTop: 16, fontFamily: F.sans, fontSize: 12, fontWeight: 500,
                color: C.ink, background: "none", border: `1px solid ${C.rule}`,
                padding: "8px 20px", cursor: "pointer",
              }}>← Back to Latest Edition</button>
            )}
          </div>
        ) : (<>
        {/* MASTHEAD — inside edition view */}
        <header style={{ textAlign: "center", padding: "20px 0 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, flex: 1 }}>
              <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{editionData.edition.publication_date || editionData.edition.week}</span>
              {(editionData.edition.publication_city || city) && (
                <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>
                  {editionData.edition.publication_city || city}
                  {(editionData.edition.publication_temperature ?? fallbackTemp) != null ? ` · ${Math.round(editionData.edition.publication_temperature ?? fallbackTemp)}°C` : ""}
                </span>
              )}
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
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                <button
                  onClick={handleToggleEditionShare}
                  disabled={shareSaving}
                  style={{
                    fontFamily: F.sans, fontSize: 10, fontWeight: 500,
                    color: editionData.edition.is_public ? C.bg : C.inkMuted,
                    backgroundColor: editionData.edition.is_public ? C.accent : "transparent",
                    border: `1px solid ${editionData.edition.is_public ? C.accent : C.rule}`,
                    padding: "4px 10px", cursor: shareSaving ? "default" : "pointer",
                    opacity: shareSaving ? 0.7 : 1,
                  }}
                >
                  {editionData.edition.is_public ? "Public" : "Make Public"}
                </button>
                {editionData.edition.is_public && (
                  <button
                    onClick={handleCopyEditionShareLink}
                    style={{
                      fontFamily: F.sans, fontSize: 10, fontWeight: 500,
                      color: C.inkMuted, backgroundColor: "transparent",
                      border: `1px solid ${C.rule}`,
                      padding: "4px 10px", cursor: "pointer",
                    }}
                  >
                    Copy Link
                  </button>
                )}
              </div>
              {shareToast && (
                <span style={{ fontFamily: F.sans, fontSize: 10, color: C.accent, marginTop: 2 }}>
                  {shareToast}
                </span>
              )}
            </div>
          </div>
        </header>
        <Ticker C={C} />
        {selectedEditionId && (
          <div style={{ textAlign: "center", padding: "10px 0", borderBottom: `1px solid ${C.rule}` }}>
            <button onClick={() => setSelectedEditionId(null)} style={{
              fontFamily: F.sans, fontSize: 11, fontWeight: 500,
              color: C.inkMuted, background: "none", border: "none",
              cursor: "pointer",
            }}>← Back to Latest Edition</button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 340px", padding: "24px 0", animation: "fadeInUp 0.6s ease 0.2s both" }}>
          <div style={{ paddingRight: 28 }}>
            {editionData.topStories[0] && <article onClick={() => openEditionArticle(editionData.topStories[0].id)} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>{editionData.topStories[0].section}</span>
                {editionData.topStories[0].isPublic && <span style={{ fontFamily: F.sans, fontSize: 9, color: C.inkFaint, display: "flex", alignItems: "center", gap: 3 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2c-4 4.5-4 13.5 0 20"/><path d="M12 2c4 4.5 4 13.5 0 20"/><path d="M2 12h20"/><path d="M4 7h16"/><path d="M4 17h16"/></svg> Public</span>}
                {null}
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
              <div style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: C.inkMuted }}>
                — {editionData.edition?.is_custom ? (user?.name || profile?.name || "Editor") : "The Hauss Editor"}
              </div>
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

        <div style={{ display: "flex", justifyContent: "center", padding: "20px 0", borderTop: `2px solid ${C.ink}`, marginBottom: 24 }}>
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
            <div style={{ display: "flex", gap: 20 }}>{["Privacy", "Help"].map((l, i) => <span key={i} style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, cursor: "pointer" }}>{l}</span>)}</div>
          </div>
        </footer>
      </div>

      {editorOpen && <EditorView onClose={() => { setEditorOpen(false); setView("journal"); }} onPublished={handleRefresh} C={C} userId={userId} session={session} />}
      {editingEntry && (
        <EditorView
          initialEntry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onPublished={(updated) => {
            setArticleEntry(updated);
            setArticleList((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            setEditingEntry(null);
            handleRefresh();
          }}
          C={C}
          userId={userId}
          session={session}
        />
      )}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} C={C} mode={mode} setMode={setMode} accent={accent} setAccent={setAccent} userId={userId} profile={profile} session={session} />
      <ProfilePanel isOpen={profileOpen} onClose={() => setProfileOpen(false)} C={C} userId={userId} profile={profile} onSaved={() => fetchProfile(userId).then((p) => { setProfile(p); if (p?.city !== undefined) setCity(p.city || ""); if (p?.publication_name) setPubName(p.publication_name); if (p?.motto) setMotto(p.motto); })} uploadAttachment={uploadAttachment} />
      {adminOpen && <AdminPage C={C} onClose={() => setAdminOpen(false)} session={session} />}
      {articleEntry && !editingEntry && (
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
          userId={userId}
          onStartEdit={(e) => setEditingEntry(e)}
        />
      )}
    </div>
  );
}
