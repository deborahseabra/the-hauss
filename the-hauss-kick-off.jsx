import { useState, useEffect, useRef } from "react";

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

const MOCK = {
  user: { name: "Deborah", email: "deborah@email.com", plan: "free", avatar: "D" },
  edition: { week: "Feb 9 – 15, 2026", number: "Vol. I · No. 47", entryCount: 7 },
  weather: "São Paulo · 28°C",
  topStories: [
    { section: "PERSONAL ESSAY", headline: "After Three Years of Doubt, She Finally Made the Leap", subhead: "A reflection on leaving the comfort of corporate life to pursue something that felt terrifyingly right", excerpt: "It wasn't courage that made me do it. It was the slow, creeping realization that staying put required more bravery than leaving ever would. The morning I resigned, the sky over Paulista was absurdly blue — the kind of blue that feels like the universe is showing off.", readTime: "8 min read", date: "Feb 14", source: "telegram", isPublic: true, aiEdited: true },
    { section: "DISPATCH", headline: "A Week of Small Victories and One Spectacular Failure", subhead: "Monday's breakthrough was almost enough to make up for Thursday's kitchen disaster", excerpt: "The mushroom stroganoff was, by any objective measure, a catastrophe.", readTime: "5 min read", date: "Feb 12", source: "app", isPublic: false, aiEdited: true },
  ],
  briefing: [
    { day: "Mon", note: "Started the week with intention. Wrote 3 pages in the morning." },
    { day: "Tue", note: "Lunch with Marina. She's moving to Lisbon." },
    { day: "Wed", note: "Nothing extraordinary. Sometimes that's the point." },
    { day: "Thu", note: "The stroganoff incident. Shame is just surprise in disguise." },
    { day: "Fri", note: "Golden hour from the apartment. Took 12 photos. Kept 1." },
    { day: "Sat", note: "Read Clarice Lispector until 2am. Underlined everything." },
    { day: "Sun", note: "Resigned. The sky was absurdly blue." },
  ],
  sections: [
    { name: "Personal Essays", count: 12 }, { name: "Dispatches", count: 23 },
    { name: "Letters to Self", count: 7 }, { name: "The Mood Index", count: 28 },
  ],
  moreStories: [
    { section: "OPINION", headline: "Why I Stopped Apologizing for Taking Up Space", readTime: "4 min", isPublic: true },
    { section: "CULTURE", headline: "The Playlist That Got Me Through January", readTime: "3 min", isPublic: false },
    { section: "LETTER TO SELF", headline: "Dear Future Me: Don't Forget How This Felt", readTime: "2 min", isPublic: false },
  ],
  editorial: { headline: "The Editor's Note", content: "This was a week of inflection. Seven entries across seven days — unusual consistency. The AI editor noticed a shift from observation to declaration, from 'I noticed' to 'I decided.' The recurring theme: permission. Something is changing." },
  stats: { totalEntries: 847, thisEdition: 7, editions: 47, wordsThisWeek: 4280 },
  journal: [
    { date: "Sunday, February 15", entries: [
      { time: "11:45 PM", text: "Can't sleep. Started reading Clarice Lispector again — 'A Hora da Estrela.' Every sentence feels like she's writing directly to me, across decades. Underlined almost everything. There's a line about how we only become who we are at the moment we lose ourselves. I keep turning it over.", mood: "🌙", section: "Personal Essay", isPublic: false, source: "app" },
    ]},
    { date: "Saturday, February 14", entries: [
      { time: "6:42 PM", text: "Golden hour from the apartment balcony today. The light in São Paulo at this hour — it turns everything amber. Took 12 photos. Only kept one. It's the one where you can't tell what you're looking at. Just light and shadow and the edge of a building. That's the one that felt true.", mood: "☀️", section: "Dispatch", isPublic: true, source: "telegram", hasPhoto: true },
      { time: "12:15 PM", text: "Lunch with Marina at the Italian place on Augusta. She told me she's moving to Lisbon in March. I felt three things at once: happy for her, jealous of her certainty, and relieved that someone close to me is also making a leap. We split the bill and she cried a little in the parking lot. I pretended I didn't notice, which is maybe what friends do.", mood: "🌤", section: "Dispatch", isPublic: false, source: "telegram" },
    ]},
    { date: "Friday, February 13", entries: [
      { time: "9:30 PM", text: "The mushroom stroganoff was, by any objective measure, a catastrophe. The mushrooms were somehow both overcooked and underflavored. The cream sauce separated. I ate it anyway, standing in the kitchen, because admitting defeat felt worse than the taste. Note to self: when the recipe says 'medium heat,' it means medium heat.", mood: "⚡", section: "Dispatch", isPublic: false, source: "app" },
    ]},
    { date: "Thursday, February 12", entries: [
      { time: "7:30 AM", text: "Woke up before the alarm. First time this month. Lay there for ten minutes just listening to the city wake up. There's a specific sound São Paulo makes at 7am — traffic starting to hum, a dog barking somewhere in Pinheiros, the coffee shop downstairs pulling its metal gate up. It's not quiet, but it's a kind of peace.", mood: "🌤", section: "Letter to Self", isPublic: false, source: "app" },
      { time: "11:00 PM", text: "Breakthrough at work today. Finally cracked the retention model I've been wrestling with for weeks. The answer was embarrassingly simple — we were measuring the wrong moment. It's not about when people leave, it's about the last time they felt seen. Wrote up the whole thing in one sitting. 2,400 words. Felt electric.", mood: "⚡", section: "Personal Essay", isPublic: true, source: "app" },
    ]},
    { date: "Wednesday, February 11", entries: [
      { time: "8:15 PM", text: "Nothing extraordinary happened today. Worked. Ate. Walked to the pharmacy and back. Watched the light change from the window. Sometimes I think the unremarkable days are the ones that hold everything together — the ordinary glue between the chapters. Today was glue. And that's okay.", mood: "🌤", section: "Dispatch", isPublic: false, source: "telegram" },
    ]},
  ],
};

// ============================================================
// AI EDITOR COMPONENT
// ============================================================
function AiEditor({ text, C, onApply }) {
  const [step, setStep] = useState("choose"); // choose | tone | processing | result
  const [aiMode, setAiMode] = useState(null); // proofread | rewrite
  const [tone, setTone] = useState(null);
  const [result, setResult] = useState(null);
  const [showPreview, setShowPreview] = useState(true);
  const hasText = text.trim().length > 20;

  const handleStart = (mode) => {
    setAiMode(mode);
    if (mode === "proofread") {
      setStep("processing");
      setTimeout(() => {
        setResult({
          mode: "proofread",
          body: "It wasn't courage that made me do it. It was the slow, creeping realization that staying put required more bravery than leaving ever would.\n\nThe morning I resigned, the sky over Paulista was absurdly blue — the kind of blue that feels like the universe is showing off. I remember thinking: if the world can be this gratuitously beautiful on a Tuesday, maybe I can afford to be a little reckless.\n\nThree years I'd spent in that office. Three years of telling myself \"next quarter.\" Three years of watching the window and wondering what the light looked like from the other side.",
          changes: 3,
          changesList: ["\"next quarter\" → corrected punctuation", "Removed dangling modifier in paragraph 2", "Fixed comma splice in final sentence"],
        });
        setStep("result");
      }, 1800);
    } else {
      setStep("tone");
    }
  };

  const handleRewrite = (selectedTone) => {
    setTone(selectedTone);
    setStep("processing");
    const results = {
      intimate: {
        headline: "The Morning I Let Go",
        subhead: "A quiet reckoning with three years of 'not yet'",
        body: "I didn't plan it. There was no dramatic moment of clarity, no sign from the universe — unless you count the sky, which was so absurdly blue that Tuesday morning it felt almost personal. Like the world was daring me.\n\nI'd been carrying the resignation letter in my head for three years. Not the words — I never got that far — just the weight of it. The knowing. Every Monday felt like swallowing something I couldn't name.\n\nWhen I finally said the words out loud, my voice didn't shake. That surprised me most of all.",
      },
      literary: {
        headline: "After Three Years of Doubt, She Finally Made the Leap",
        subhead: "A reflection on leaving the comfort of corporate life to pursue something that felt terrifyingly right",
        body: "It wasn't courage that propelled her out the door — courage implies a reckoning with fear, and what she felt that morning was something quieter, more geological. A tectonic shift completed in silence.\n\nThe sky over Paulista Avenue was performing that particular shade of blue that exists only in São Paulo in February, when the rain has scrubbed the atmosphere clean and the city stands blinking in its own clarity. She took this as neither omen nor metaphor. The sky was simply blue. She was simply leaving.\n\nThree years she had rehearsed this departure in the conditional tense. 'I would leave if.' 'I could leave when.' The subjunctive mood of a life deferred.",
      },
      journalistic: {
        headline: "Breaking a Three-Year Pattern: One Woman's Decision to Leave Corporate Life",
        subhead: "After years of deliberation, a São Paulo professional makes the leap — and reflects on what it took",
        body: "On a Tuesday morning in February, after three years of internal deliberation, Deborah submitted her resignation. The decision, she says, was less a dramatic turning point than the conclusion of a long, quiet process.\n\n\"It wasn't courage,\" she wrote in her journal that evening. \"It was arithmetic. The cost of staying had finally exceeded the cost of leaving.\"\n\nThe move comes amid a broader trend of professionals in Brazil's tech sector reevaluating their career trajectories. But for Deborah, the calculus was personal: three years of postponement, measured in Monday mornings and unreturned calls to a life she hadn't yet started living.",
      },
    };
    setTimeout(() => {
      setResult({ mode: "rewrite", tone: selectedTone, ...results[selectedTone] });
      setStep("result");
    }, 2500);
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
function EditorView({ onClose, C }) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [section, setSection] = useState("dispatch");
  const [mood, setMood] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiKey, setAiKey] = useState(0); // reset AI editor
  const ref = useRef(null);

  useEffect(() => { if (ref.current) setTimeout(() => ref.current.focus(), 200); }, []);
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

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

  const handlePublish = () => {
    if (!text.trim()) return;
    setIsSaving(true);
    setTimeout(() => { setIsSaving(false); setShowSuccess(true); }, 1200);
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
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline (optional — AI can generate one)" style={{
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
              <AiEditor key={aiKey} text={text} C={C} onApply={handleApplyAi} />
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
              {[{ icon: "📷", label: "Photo" }, { icon: "📍", label: "Location" }, { icon: "🔗", label: "Link" }].map((a, i) => (
                <button key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 6, width: "100%", background: "none", border: `1px solid ${C.rule}`, cursor: "pointer", fontFamily: F.sans, fontSize: 12, color: C.inkLight, textAlign: "left" }}>
                  <span>{a.icon}</span>{a.label}
                </button>
              ))}
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
function SettingsPanel({ isOpen, onClose, C, mode, setMode, accent, setAccent, pubName, setPubName, motto, setMotto }) {
  const [ln, setLn] = useState(pubName);
  const [lm, setLm] = useState(motto);
  useEffect(() => { setLn(pubName); setLm(motto); }, [pubName, motto]);
  if (!isOpen) return null;
  const save = () => { setPubName(ln); setMotto(lm); onClose(); };

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
          <button onClick={save} style={{ width: "100%", padding: 10, fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: C.bg, backgroundColor: C.ink, border: "none", cursor: "pointer" }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PLATFORM HEADER
// ============================================================
function PlatformHeader({ user, C, onSettings, onEditor }) {
  const [menu, setMenu] = useState(false);
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
          {user.plan === "free" && <button style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 500, color: C.accent, backgroundColor: "transparent", border: `1px solid ${C.accent}`, padding: "5px 12px", cursor: "pointer" }}>Upgrade</button>}
          <button onClick={onSettings} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: C.inkMuted, display: "flex" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </button>
          <div style={{ position: "relative" }}>
            <button onClick={() => setMenu(!menu)} style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: C.accent, color: "#fff", border: "none", cursor: "pointer", fontFamily: F.sans, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{user.avatar}</button>
            {menu && <div style={{ position: "absolute", top: 38, right: 0, backgroundColor: C.surface, border: `1px solid ${C.rule}`, boxShadow: "0 8px 30px rgba(0,0,0,0.12)", minWidth: 200, zIndex: 999, animation: "fadeIn 0.15s ease" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.rule}` }}><div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.ink }}>{MOCK.user.name}</div><div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted }}>{MOCK.user.email}</div></div>
              {["My Publication", "Settings", "Export", "Sign Out"].map((item, i) => (
                <button key={i} onClick={() => { setMenu(false); if (item === "Settings") onSettings(); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", fontFamily: F.sans, fontSize: 12, color: i === 3 ? C.inkMuted : C.inkLight, cursor: "pointer" }}>{item}</button>
              ))}
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
function JournalView({ C, data, onSwitchToEdition, onNewEntry }) {
  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "0 24px", animation: "fadeIn 0.4s ease" }}>
      {/* Journal header */}
      <div style={{ padding: "40px 0 24px", textAlign: "center" }}>
        <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>Notebook</div>
        <h2 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 6 }}>This Week</h2>
        <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkMuted, marginBottom: 20 }}>
          {data.journal.length} days · {data.journal.reduce((a, d) => a + d.entries.length, 0)} entries
        </p>
        <button onClick={onNewEntry} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: F.sans, fontSize: 12, fontWeight: 500,
          color: C.bg, backgroundColor: C.ink, border: "none",
          padding: "10px 28px", cursor: "pointer", transition: "opacity 0.2s",
        }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          New Entry
        </button>
        <div style={{ width: 40, height: 2, backgroundColor: C.accent, margin: "20px auto 0" }} />
      </div>

      {/* Day by day timeline */}
      {data.journal.map((day, di) => (
        <div key={di} style={{ marginBottom: 8 }}>
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
            <div key={ei} style={{
              padding: "24px 0",
              borderBottom: `1px solid ${C.rule}`,
              animation: `fadeInUp 0.4s ease ${(di * 0.1) + (ei * 0.05)}s both`,
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
      <div style={{ textAlign: "center", padding: "40px 0 60px" }}>
        <div style={{ width: 40, height: 2, backgroundColor: C.accent, margin: "0 auto 20px" }} />
        <p style={{ fontFamily: F.body, fontSize: 13, fontStyle: "italic", color: C.inkMuted, marginBottom: 16 }}>
          End of this week's entries
        </p>
        <button onClick={onSwitchToEdition} style={{
          fontFamily: F.sans, fontSize: 11, fontWeight: 500,
          color: C.inkMuted, backgroundColor: "transparent",
          border: `1px solid ${C.rule}`, padding: "8px 20px", cursor: "pointer",
        }}>
          View Weekly Edition →
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ARCHIVES VIEW — Past editions as a grid of "covers"
// ============================================================
function ArchivesView({ C }) {
  const editions = [
    { num: "No. 47", week: "Feb 9–15", headline: "After Three Years of Doubt, She Finally Made the Leap", entries: 7, words: 4280, mood: "⚡" },
    { num: "No. 46", week: "Feb 2–8", headline: "The Art of Staying When Everything Says Go", entries: 5, words: 3100, mood: "🌧" },
    { num: "No. 45", week: "Jan 26–Feb 1", headline: "January Came and Went Like a Long Exhale", entries: 8, words: 5200, mood: "🌤" },
    { num: "No. 44", week: "Jan 19–25", headline: "On Ambition, Mushroom Risotto, and Letting Things Be", entries: 6, words: 3900, mood: "☀️" },
    { num: "No. 43", week: "Jan 12–18", headline: "A Quiet Week in a Loud City", entries: 4, words: 2100, mood: "🌙" },
    { num: "No. 42", week: "Jan 5–11", headline: "New Year, Same Questions, Better Answers", entries: 9, words: 6100, mood: "☀️" },
    { num: "No. 41", week: "Dec 29–Jan 4", headline: "The Year That Changed Everything (And the One That Might)", entries: 11, words: 7800, mood: "⚡" },
    { num: "No. 40", week: "Dec 22–28", headline: "Christmas Without the Script", entries: 5, words: 3400, mood: "🌤" },
    { num: "No. 39", week: "Dec 15–21", headline: "She Stopped Running and Looked Around", entries: 6, words: 4000, mood: "🌙" },
  ];

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px", animation: "fadeIn 0.4s ease" }}>
      <div style={{ padding: "40px 0 32px", textAlign: "center" }}>
        <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>Archives</div>
        <h2 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Past Editions</h2>
        <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkMuted }}>47 weeks of your life, published</p>
        <div style={{ width: 40, height: 2, backgroundColor: C.accent, margin: "16px auto 0" }} />
      </div>

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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 60 }}>
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
      </div>
    </div>
  );
}

// ============================================================
// SECTIONS VIEW — NYT alternating layout
// ============================================================
function SectionsView({ C }) {
  const sections = [
    {
      name: "Personal Essays", count: 12, words: "18.4k",
      entries: [
        { headline: "After Three Years of Doubt, She Finally Made the Leap", sub: "A reflection on leaving the comfort of corporate life to pursue something that felt terrifyingly right.", time: "8 min read" },
        { headline: "The Art of Staying When Everything Says Go", sub: "On the quiet courage of choosing not to leave.", time: "6 min read" },
        { headline: "On Ambition, Mushroom Risotto, and Letting Things Be", sub: "What cooking taught me about surrender.", time: "5 min read" },
      ],
      themes: ["Career transitions", "Self-permission", "Identity"],
    },
    {
      name: "Dispatches", count: 23, words: "8.9k",
      entries: [
        { headline: "A Week of Small Victories and One Spectacular Failure", sub: "Monday's breakthrough was almost enough to make up for Thursday's kitchen disaster.", time: "5 min read" },
        { headline: "Nothing Extraordinary. Sometimes That's the Point.", sub: "An ode to the unremarkable Wednesday.", time: "3 min read" },
        { headline: "Golden Hour From the Apartment", sub: "Twelve photos. One keeper.", time: "2 min read" },
      ],
      themes: ["Daily observations", "Food", "São Paulo"],
    },
    {
      name: "Letters to Self", count: 7, words: "5.6k",
      entries: [
        { headline: "Dear Future Me: Don't Forget How This Felt", sub: "A letter written on the day everything changed.", time: "4 min read" },
        { headline: "A Note on What You Deserve", sub: "You keep forgetting. So here it is, in writing.", time: "3 min read" },
        { headline: "To the Version of Me Who's Still Afraid", sub: "She's doing fine. You should know that.", time: "3 min read" },
      ],
      themes: ["Future self", "Compassion", "Fear"],
    },
    {
      name: "Reviews", count: 5, words: "4.2k",
      entries: [
        { headline: "Clarice Lispector's 'A Hora da Estrela'", sub: "Every sentence feels like she's writing directly to me, across decades.", time: "6 min read" },
        { headline: "The Playlist That Got Me Through January", sub: "Thirty-one days, forty-four songs, one recurring theme.", time: "3 min read" },
        { headline: "That Restaurant on Augusta", sub: "The pasta was fine. The conversation was not.", time: "4 min read" },
      ],
      themes: ["Literature", "Music", "Food"],
    },
    {
      name: "Photo Essays", count: 3, words: "1.2k",
      entries: [
        { headline: "Golden Hour Series", sub: "São Paulo at 5pm, when the city forgives itself.", time: "2 min read" },
        { headline: "The Walk to the Pharmacy", sub: "A three-block journey in twelve frames.", time: "2 min read" },
      ],
      themes: ["Light", "Urban", "Quiet moments"],
    },
  ];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px", animation: "fadeIn 0.4s ease" }}>
      <div style={{ padding: "40px 0 20px", textAlign: "center" }}>
        <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>Sections</div>
        <h2 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Your Newsroom</h2>
        <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkMuted }}>50 entries across 5 desks</p>
      </div>

      {sections.map((sec, si) => {
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
                  <div key={ei} style={{
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
function ReflectionsView({ C }) {
  const [period, setPeriod] = useState("week");
  const [askQuery, setAskQuery] = useState("");
  const [askAnswer, setAskAnswer] = useState(null);
  const [askLoading, setAskLoading] = useState(false);

  const periods = {
    week: {
      label: "This Week", date: "Feb 9–15, 2026",
      moods: [{ day:"Mon",val:4,emoji:"☀️"},{day:"Tue",val:3,emoji:"🌤"},{day:"Wed",val:3,emoji:"🌤"},{day:"Thu",val:5,emoji:"⚡"},{day:"Fri",val:4,emoji:"☀️"},{day:"Sat",val:2,emoji:"🌙"},{day:"Sun",val:5,emoji:"⚡"}],
      trend: [{w:"W42",v:2.8},{w:"W43",v:3.1},{w:"W44",v:3.5},{w:"W45",v:3.2},{w:"W46",v:2.9},{w:"W47",v:4.1}],
      trendLabel: "6-Week Trend", moodHint: "Optimism at a 3-month high",
      reflectionTitle: "This Week's Reflection",
      reflection: [
        "This was a week of inflection. You wrote seven entries across seven days — your most consistent week since October. But the shift wasn't just in quantity. Your language changed. Early in the week, you observed. By Sunday, you declared.",
        "The recurring word was <em>permission</em> — sometimes spoken, sometimes implied. You gave yourself permission to leave, to feel jealous, to eat bad stroganoff standing up, to keep only one photo out of twelve.",
        "Something is changing. The question is whether you know what it is yet.",
      ],
      connections: [
        "You mention Marina in 8 entries, always when something in your own life is shifting. She might be your mirror for change.",
        "Your best writing happens between 10PM and midnight. 73% of your personal essays were written after dark.",
        "Entries via Telegram are 40% shorter but higher in emotional intensity. Quick thoughts carry more weight than you think.",
        "Every time you mention cooking, the next day's entry is more reflective. Food unlocks introspection.",
      ],
      themes: [{theme:"Permission",count:14,trend:"↑"},{theme:"Marina",count:8,trend:"—"},{theme:"Food as metaphor",count:11,trend:"↑"},{theme:"Light & photography",count:9,trend:"—"},{theme:"Clarice Lispector",count:5,trend:"↑"}],
      questions: [
        "When did the math change — the cost of staying vs. leaving?",
        "Marina is moving to Lisbon. You felt jealousy and relief. Which surprised you more?",
        "You kept one photo out of twelve. What made that one feel true?",
        "You've mentioned permission 14 times. Who were you asking?",
      ],
      stats: [{label:"Entries",value:"7"},{label:"Words",value:"4,280"},{label:"Streak",value:"12 days"},{label:"Avg. per entry",value:"611"},{label:"Via Telegram",value:"3"},{label:"Public",value:"2"}],
    },
    month: {
      label: "This Month", date: "February 2026",
      moods: [{day:"W1",val:3,emoji:"🌤"},{day:"W2",val:4,emoji:"⚡"},{day:"W3",val:4,emoji:"☀️"},{day:"W4",val:5,emoji:"⚡"}],
      trend: [{w:"Sep",v:2.5},{w:"Oct",v:3.0},{w:"Nov",v:2.3},{w:"Dec",v:2.8},{w:"Jan",v:3.4},{w:"Feb",v:4.1}],
      trendLabel: "6-Month Trend", moodHint: "February is your brightest month yet",
      reflectionTitle: "February So Far",
      reflection: [
        "February opened with momentum and hasn't let up. You've written 14 entries in 15 days — a pace you haven't hit since the first month on the platform. The quality has shifted too: your sentences are getting shorter, more decisive.",
        "The theme of the month is action. January was full of 'what if' and 'maybe.' February replaced those with 'I did' and 'I will.' The resignation on Feb 15 wasn't impulsive — it was the culmination of 47 days of quiet preparation.",
        "You're also writing more publicly. Four entries went public this month, compared to one in all of January. You're ready to be seen.",
      ],
      connections: [
        "Your February entries reference January entries 6 times — you're in active dialogue with your past self.",
        "Public entries are 30% longer than private ones. Visibility makes you more deliberate.",
        "Every Letter to Self this month was written before 8 AM. Your mornings belong to introspection.",
        "The word 'finally' appears 9 times this month. Zero times in January.",
      ],
      themes: [{theme:"Action",count:18,trend:"↑"},{theme:"Permission",count:14,trend:"↑"},{theme:"Visibility",count:9,trend:"↑"},{theme:"Marina",count:5,trend:"—"},{theme:"Clarice",count:5,trend:"↑"}],
      questions: [
        "Your writing pace doubled. What changed — discipline or urgency?",
        "You went public 4 times. What made those entries feel ready?",
        "January's 'what if' became February's 'I did.' Was there a single moment?",
        "You write Letters to Self only in the morning now. Why?",
      ],
      stats: [{label:"Entries",value:"14"},{label:"Words",value:"9,640"},{label:"Streak",value:"12 days"},{label:"Avg. per entry",value:"689"},{label:"Via Telegram",value:"5"},{label:"Public",value:"4"}],
    },
    quarter: {
      label: "3 Months", date: "Dec 2025 – Feb 2026",
      moods: [{day:"Dec",val:2,emoji:"🌧"},{day:"Jan W1",val:2,emoji:"🌙"},{day:"Jan W3",val:3,emoji:"🌤"},{day:"Feb W1",val:4,emoji:"☀️"},{day:"Feb W2",val:5,emoji:"⚡"}],
      trend: [{w:"Q1'25",v:3.0},{w:"Q2'25",v:2.6},{w:"Q3'25",v:2.9},{w:"Q4'25",v:2.5},{w:"Q1'26",v:3.8}],
      trendLabel: "Quarterly Trend", moodHint: "Clear upward arc from December's low",
      reflectionTitle: "The Last Three Months",
      reflection: [
        "The arc of the last three months is unmistakable: December was grief, January was restlessness, February is action. You processed a loss, sat with uncertainty, and then — without fanfare — started moving.",
        "You wrote 142 entries across 13 weeks. The density of personal essays doubled from December to February. Your dispatches got shorter but your essays got deeper. The ratio shifted from observation to reflection.",
        "The most striking change: your relationship with your own voice. In December you wrote 'I think' 34 times. In February, just 6. You stopped hedging.",
      ],
      connections: [
        "December's grief entries and February's action entries share the same vocabulary — transformation repurposed the language of loss.",
        "Your longest writing streaks correlate with periods of professional uncertainty. Writing is your stabilizer.",
        "Marina appears more in transition months. She was absent in your most stable weeks.",
        "Your reading habits (Clarice, Lispector) preceded your bravest writing by exactly one week.",
      ],
      themes: [{theme:"Identity",count:34,trend:"↑"},{theme:"Career",count:28,trend:"↑"},{theme:"Permission",count:22,trend:"↑"},{theme:"Grief → Action",count:18,trend:"↑"},{theme:"Marina",count:15,trend:"—"}],
      questions: [
        "December's grief — have you finished processing it, or just redirected it?",
        "Your hedging dropped 80%. Is that confidence or urgency?",
        "You read Clarice before your bravest writing. Coincidence or ritual?",
        "Three months ago you were still. Now you're running. Toward what?",
      ],
      stats: [{label:"Entries",value:"142"},{label:"Words",value:"38,400"},{label:"Best streak",value:"12 days"},{label:"Avg. per entry",value:"270"},{label:"Personal Essays",value:"24"},{label:"Public",value:"11"}],
    },
    all: {
      label: "All Time", date: "47 editions · 1 year",
      moods: [{day:"Q1",val:3,emoji:"🌤"},{day:"Q2",val:2,emoji:"🌧"},{day:"Q3",val:3,emoji:"🌤"},{day:"Q4",val:4,emoji:"⚡"}],
      trend: [{w:"Mar",v:3.2},{w:"May",v:2.8},{w:"Jul",v:2.4},{w:"Sep",v:2.9},{w:"Nov",v:2.3},{w:"Jan",v:3.4},{w:"Feb",v:4.1}],
      trendLabel: "12-Month Trend", moodHint: "Your brightest period since you started",
      reflectionTitle: "One Year of Writing",
      reflection: [
        "Forty-seven editions. Eight hundred and forty-seven entries. One year of your inner life, captured in words.",
        "The through-line is unmistakable: a woman learning, slowly and sometimes painfully, to trust her own judgment. The early editions are full of questions. The recent ones are full of answers disguised as questions.",
        "You started The Deborah Times as an experiment. It became a practice. And somewhere around edition 30, it became a mirror you couldn't look away from. The writing changed you — not the other way around.",
      ],
      connections: [
        "Your vocabulary has expanded 40% since edition 1. You found new words for old feelings.",
        "The topics you avoid are as revealing as the ones you pursue. You've never written about your parents.",
        "Your most-referenced entry is from edition 12: 'The Morning I Decided to Stay.' You've linked back to it 7 times.",
        "Seasons affect your writing more than events. Fall is grief, winter is stillness, spring is action.",
      ],
      themes: [{theme:"Self-trust",count:67,trend:"↑"},{theme:"Career transitions",count:45,trend:"↑"},{theme:"Food & cooking",count:42,trend:"—"},{theme:"Photography & light",count:38,trend:"—"},{theme:"Marina",count:23,trend:"—"}],
      questions: [
        "You've been writing for a year. Who were you in edition 1?",
        "The topics you avoid — are you ready to go there?",
        "Your writing changed you. When did you first notice?",
        "Forty-seven editions from now, what do you hope to read?",
      ],
      stats: [{label:"Entries",value:"847"},{label:"Words",value:"198,000"},{label:"Editions",value:"47"},{label:"Avg. per week",value:"18"},{label:"Personal Essays",value:"89"},{label:"Public",value:"34"}],
    },
  };

  const P = periods[period];

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
            <button key={p.key} onClick={() => { setPeriod(p.key); setAskAnswer(null); setAskQuery(""); }} style={{
              fontFamily: F.sans, fontSize: 11, fontWeight: period === p.key ? 500 : 400,
              color: period === p.key ? C.bg : C.inkMuted,
              backgroundColor: period === p.key ? C.ink : "transparent",
              border: `1px solid ${period === p.key ? C.ink : C.rule}`,
              padding: "6px 16px", cursor: "pointer", marginLeft: -1,
            }}>{p.label}</button>
          ))}
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
// MAIN
// ============================================================
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState("light");
  const [accent, setAccent] = useState("red");
  const [editorOpen, setEditorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pubName, setPubName] = useState("The Deborah Times");
  const [motto, setMotto] = useState("All the life that's fit to print");
  const [view, setView] = useState("journal"); // journal | edition | archives | sections | reflections

  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);
  const C = getTheme(mode, accent);
  const d = MOCK;

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

      <PlatformHeader user={d.user} C={C} onSettings={() => setSettingsOpen(true)} onEditor={() => setEditorOpen(true)} />

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
          <JournalView C={C} data={d} onSwitchToEdition={() => setView("edition")} onNewEntry={() => setEditorOpen(true)} />
        ) : view === "archives" ? (
          <ArchivesView C={C} />
        ) : view === "sections" ? (
          <SectionsView C={C} />
        ) : view === "reflections" ? (
          <ReflectionsView C={C} />
        ) : (
        <div>
        {/* MASTHEAD — inside edition view */}
        <header style={{ textAlign: "center", padding: "20px 0 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, flex: 1 }}>
              <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>Week of {d.edition.week}</span>
              <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{d.weather}</span>
            </div>
            <div style={{ flex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: "100%", height: 2, backgroundColor: C.ruleDark }} />
              <h1 style={{ fontFamily: F.display, fontSize: 40, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1, margin: "8px 0", color: C.ink }}>{pubName}</h1>
              <div style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkMuted, marginBottom: 8, letterSpacing: "0.5px" }}>{motto}</div>
              <div style={{ width: "100%", height: 2, backgroundColor: C.ruleDark }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flex: 1 }}>
              <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{d.edition.number}</span>
              <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{d.edition.entryCount} entries</span>
            </div>
          </div>
        </header>
        <Ticker C={C} />
        <EditionSwitcher C={C} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 340px", padding: "24px 0", animation: "fadeInUp 0.6s ease 0.2s both" }}>
          <div style={{ paddingRight: 28 }}>
            <article>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>{d.topStories[0].section}</span>
                {d.topStories[0].isPublic && <span style={{ fontFamily: F.sans, fontSize: 9, color: C.inkFaint, display: "flex", alignItems: "center", gap: 3 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2c-4 4.5-4 13.5 0 20"/><path d="M12 2c4 4.5 4 13.5 0 20"/><path d="M2 12h20"/><path d="M4 7h16"/><path d="M4 17h16"/></svg> Public</span>}
                {d.topStories[0].aiEdited && <span style={{ fontFamily: F.sans, fontSize: 9, color: C.accent, display: "flex", alignItems: "center", gap: 3 }}>✦ AI</span>}
              </div>
              <h2 style={{ fontFamily: F.display, fontSize: 30, fontWeight: 700, lineHeight: 1.15, color: C.ink, marginBottom: 10 }}>{d.topStories[0].headline}</h2>
              <p style={{ fontFamily: F.body, fontSize: 15, fontStyle: "italic", color: C.inkLight, lineHeight: 1.5, marginBottom: 16 }}>{d.topStories[0].subhead}</p>
              <div style={{ backgroundColor: C.sectionBg, height: 200, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.rule} strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              </div>
              <p style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.7, color: C.inkLight, marginBottom: 12 }}>{d.topStories[0].excerpt}</p>
              <div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, display: "flex", gap: 6 }}>
                <span>{d.topStories[0].readTime}</span><span style={{ color: C.rule }}>·</span><span>{d.topStories[0].date}</span><span style={{ color: C.rule }}>·</span><span style={{ fontStyle: "italic", color: C.inkFaint }}>via Telegram</span>
              </div>
            </article>
            <div style={{ height: 1, backgroundColor: C.rule, margin: "24px 0" }} />
            <article>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>{d.topStories[1].section}</span>
                <span style={{ fontFamily: F.sans, fontSize: 9, color: C.inkFaint, display: "flex", alignItems: "center", gap: 3 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Private</span>
              </div>
              <h3 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: C.ink, marginBottom: 8 }}>{d.topStories[1].headline}</h3>
              <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkLight, marginBottom: 8 }}>{d.topStories[1].subhead}</p>
              <p style={{ fontFamily: F.body, fontSize: 14, lineHeight: 1.65, color: C.inkLight, marginBottom: 10 }}>{d.topStories[1].excerpt}</p>
              <div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, display: "flex", gap: 6 }}>
                <span>{d.topStories[1].readTime}</span><span style={{ color: C.rule }}>·</span><span>{d.topStories[1].date}</span><span style={{ color: C.rule }}>·</span><span style={{ fontStyle: "italic", color: C.inkFaint }}>via App</span>
              </div>
            </article>
          </div>
          <div style={{ backgroundColor: C.rule }} />
          <div style={{ paddingLeft: 28 }}>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 4 }}>The Week at a Glance</h3>
              <div style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: C.inkMuted, marginBottom: 10 }}>{d.edition.week}</div>
              <div style={{ height: 2, backgroundColor: C.accent, marginBottom: 14, width: 40 }} />
              {d.briefing.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.rule}` }}>
                  <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.inkMuted, whiteSpace: "nowrap", minWidth: 30 }}>{item.day}</span>
                  <span style={{ fontFamily: F.body, fontSize: 13, lineHeight: 1.5, color: C.inkLight }}>{item.note}</span>
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: C.sectionBg, padding: 20, marginBottom: 24 }}>
              <div style={{ fontFamily: F.display, fontSize: 18, color: C.accent, marginBottom: 8 }}>✦</div>
              <h3 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, fontStyle: "italic", color: C.ink, marginBottom: 10 }}>{d.editorial.headline}</h3>
              <p style={{ fontFamily: F.body, fontSize: 13, lineHeight: 1.65, color: C.inkLight, marginBottom: 12 }}>{d.editorial.content}</p>
              <div style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: C.inkMuted }}>— AI Editor</div>
            </div>
            <div>
              <h3 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 10 }}>All Sections</h3>
              <div style={{ height: 2, backgroundColor: C.accent, marginBottom: 14, width: 40 }} />
              {d.sections.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.rule}` }}>
                  <span style={{ fontFamily: F.sans, fontSize: 12, color: C.inkLight }}>{s.name}</span>
                  <span style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, backgroundColor: C.sectionBg, padding: "2px 8px" }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ height: 2, backgroundColor: C.ink, marginBottom: 16 }} />
          <h3 style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: C.inkMuted, marginBottom: 16 }}>Also in This Edition</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {d.moreStories.map((s, i) => (
              <div key={i} style={{ borderRight: i < 2 ? `1px solid ${C.rule}` : "none", paddingRight: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>{s.section}</span>
                  {s.isPublic ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.inkFaint} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2c-4 4.5-4 13.5 0 20"/><path d="M12 2c4 4.5 4 13.5 0 20"/><path d="M2 12h20"/><path d="M4 7h16"/><path d="M4 17h16"/></svg> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.inkFaint} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
                </div>
                <h4 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, lineHeight: 1.25, color: C.ink, marginBottom: 8 }}>{s.headline}</h4>
                <span style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted }}>{s.readTime}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", padding: "20px 0", borderTop: `2px solid ${C.ink}`, borderBottom: `1px solid ${C.rule}`, marginBottom: 24 }}>
          {[{ n: d.stats.totalEntries.toLocaleString(), l: "Total Entries" }, { n: d.stats.thisEdition, l: "This Edition" }, { n: d.stats.editions, l: "Editions" }, { n: d.stats.wordsThisWeek.toLocaleString(), l: "Words This Week" }].map((s, i, a) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 32px" }}>
                <span style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.ink }}>{s.n}</span>
                <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", marginTop: 4 }}>{s.l}</span>
              </div>
              {i < a.length - 1 && <div style={{ width: 1, height: 36, backgroundColor: C.rule }} />}
            </div>
          ))}
        </div>

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

      {editorOpen && <EditorView onClose={() => setEditorOpen(false)} C={C} />}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} C={C} mode={mode} setMode={setMode} accent={accent} setAccent={setAccent} pubName={pubName} setPubName={setPubName} motto={motto} setMotto={setMotto} />
    </div>
  );
}
