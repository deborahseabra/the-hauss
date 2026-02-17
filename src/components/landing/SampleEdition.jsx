import { useState, useEffect } from "react";
import { F, C } from "./theme";
import useInView from "./useInView";

/* ── Fake data mirroring the real app's edition structure ── */

const EDITION = {
  week: "Feb 9–15, 2026",
  number: "Vol. I · No. 47",
  entryCount: 7,
};

const BRIEFING = [
  { day: "Mon", note: "Resigned. Sky was absurdly blue. Felt lighter than expected." },
  { day: "Tue", note: "Called mom. She cried, then laughed, then cried again." },
  { day: "Wed", note: "First morning with nowhere to be. Made mushroom stroganoff." },
  { day: "Thu", note: "Wrote 2,000 words in a café on Augusta. Best session in months." },
  { day: "Fri", note: "Lunch with Marina at the Italian place. She understands." },
  { day: "Sat", note: "Golden hour from the apartment. São Paulo looked like a painting." },
  { day: "Sun", note: "Started reading again. Woolf. A room of one's own, finally." },
];

const TOP_STORIES = [
  {
    section: "DISPATCH",
    headline: "After Three Years of Doubt, She Finally Made the Leap",
    subhead: "A reflection on leaving the comfort of corporate life to pursue something that felt terrifyingly right",
    excerpt: "It wasn't courage that made me do it. It was the slow, creeping realization that staying put required more bravery than leaving ever would. The morning I resigned, the sky over Paulista was absurdly blue — the kind of blue that feels like the universe is showing off...",
    readTime: "7 min read",
    date: "Mon Feb 10",
    source: "app",
    isPublic: true,
    aiEdited: true,
  },
  {
    section: "PERSONAL ESSAY",
    headline: "The Morning I Let Go",
    subhead: "A quiet reckoning with three years of 'not yet'",
    excerpt: "I didn't plan it. There was no dramatic moment of clarity, no sign from the universe — unless you count the sky, which was so absurdly blue that Tuesday morning it felt almost personal. Like the world was daring me.",
    readTime: "4 min read",
    date: "Tue Feb 11",
    source: "telegram",
    isPublic: false,
    aiEdited: false,
  },
];

const MORE_STORIES = [
  { section: "PHOTO ESSAY", headline: "Golden Hour From the Apartment", readTime: "1 min read", isPublic: false },
  { section: "DISPATCH", headline: "Lunch with Marina at the Italian Place on Augusta", readTime: "3 min read", isPublic: true },
  { section: "REVIEW", headline: "Mushroom Stroganoff for One", readTime: "2 min read", isPublic: false },
];

const EDITORIAL = {
  headline: "The Week You Stopped Rehearsing",
  content: "This was the week you stopped rehearsing and started performing. The resignation wasn't sudden — it was geological, as you yourself noted. What strikes me is the pattern: your most honest writing appears in moments of transition, and this week was nothing if not a threshold crossed.",
};

const SECTIONS = [
  { name: "Dispatch", count: 3 },
  { name: "Personal Essay", count: 1 },
  { name: "Photo Essay", count: 1 },
  { name: "Review", count: 1 },
  { name: "Letter to Self", count: 1 },
];

const STATS = [
  { n: "147", l: "Total Entries" },
  { n: "7", l: "This Edition" },
  { n: "47", l: "Editions" },
  { n: "4,280", l: "Words This Week" },
];

/* ── Ticker (scrolling news bar) ── */

function SampleTicker() {
  const items = ["12-day writing streak", "MOOD: Optimism at 3-month high", "TRENDING: Permission, change, mushroom stroganoff", "THIS WEEK: 4,280 words"];
  const [o, setO] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setO((p) => p - 0.5), 30);
    return () => clearInterval(i);
  }, []);
  const t = items.join("     ·     ");
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.rule}`, overflow: "hidden", gap: 12 }}>
      <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: "#fff", backgroundColor: C.accent, padding: "3px 8px", letterSpacing: "1px", flexShrink: 0 }}>LIVE</span>
      <div style={{ overflow: "hidden", flex: 1 }}>
        <div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, whiteSpace: "nowrap", transform: `translateX(${o}px)` }}>
          {t}{"     ·     "}{t}
        </div>
      </div>
    </div>
  );
}

/* ── Edition Switcher ── */

function SampleEditionSwitcher() {
  const [a, setA] = useState("week");
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "12px 0", borderBottom: `1px solid ${C.rule}` }}>
      {[{ k: "week", l: "This Week" }, { k: "last", l: "Last Week" }, { k: "month", l: "This Month" }, { k: "archive", l: "All Editions" }].map((o) => (
        <button key={o.k} onClick={() => setA(o.k)} style={{
          fontFamily: F.sans, fontSize: 11, fontWeight: a === o.k ? 500 : 400,
          color: a === o.k ? "#fff" : C.inkMuted,
          backgroundColor: a === o.k ? C.ink : "transparent",
          border: `1px solid ${a === o.k ? C.ink : C.rule}`,
          padding: "6px 16px", cursor: "pointer", marginLeft: -1,
        }}>{o.l}</button>
      ))}
    </div>
  );
}

/* ── Globe + Lock SVG icons ── */

const GlobeIcon = ({ color }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2c-4 4.5-4 13.5 0 20"/><path d="M12 2c4 4.5 4 13.5 0 20"/><path d="M2 12h20"/><path d="M4 7h16"/><path d="M4 17h16"/>
  </svg>
);

const LockIcon = ({ color }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);

/* ── Main component ── */

export default function SampleEdition() {
  const [ref, style] = useInView();

  return (
    <section id="sample-edition" style={{ backgroundColor: C.sectionBg, padding: "80px 24px" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div ref={ref} style={style}>
          <div style={{
            fontFamily: F.sans, fontSize: 10, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: 2,
            color: C.accent, marginBottom: 16,
          }}>
            SAMPLE EDITION
          </div>

          <h2 style={{
            fontFamily: F.display, fontSize: 32, fontWeight: 700,
            color: C.ink, margin: "0 0 8px",
          }}>
            See what your journal could look like.
          </h2>

          <p style={{
            fontFamily: F.body, fontSize: 15, fontStyle: "italic",
            color: C.inkMuted, margin: "0 0 40px",
          }}>
            This is a real edition from a fictional user. Every element — headlines, sections, mood, editorial — was generated by The Hauss.
          </p>
        </div>

        {/* Edition container — replicates the app's Last Edition tab exactly */}
        <div style={{ backgroundColor: C.bg, border: `1px solid ${C.rule}`, padding: "0 32px 32px", overflowY: "auto", maxHeight: 700 }}>

          {/* MASTHEAD */}
          <header style={{ textAlign: "center", padding: "20px 0 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, flex: 1 }}>
                <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>Week of {EDITION.week}</span>
                <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>São Paulo · 28°C</span>
              </div>
              <div style={{ flex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "100%", height: 2, backgroundColor: C.ink }} />
                <h1 style={{ fontFamily: F.display, fontSize: 40, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1, margin: "8px 0", color: C.ink }}>The Deborah Times</h1>
                <div style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkMuted, marginBottom: 8, letterSpacing: "0.5px" }}>All the life that's fit to print</div>
                <div style={{ width: "100%", height: 2, backgroundColor: C.ink }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flex: 1 }}>
                <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{EDITION.number}</span>
                <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted }}>{EDITION.entryCount} entries</span>
              </div>
            </div>
          </header>

          {/* TICKER */}
          <SampleTicker />

          {/* EDITION SWITCHER */}
          <SampleEditionSwitcher />

          {/* MAIN GRID: stories + sidebar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 340px", padding: "24px 0" }}>
            {/* LEFT — Top Stories */}
            <div style={{ paddingRight: 28 }}>
              {/* Story 1 */}
              <article style={{ cursor: "default" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>{TOP_STORIES[0].section}</span>
                  {TOP_STORIES[0].isPublic && (
                    <span style={{ fontFamily: F.sans, fontSize: 9, color: C.inkFaint, display: "flex", alignItems: "center", gap: 3 }}>
                      <GlobeIcon color="currentColor" /> Public
                    </span>
                  )}
                  {TOP_STORIES[0].aiEdited && (
                    <span style={{ fontFamily: F.sans, fontSize: 9, color: C.accent, display: "flex", alignItems: "center", gap: 3 }}>✦ AI</span>
                  )}
                </div>
                <h2 style={{ fontFamily: F.display, fontSize: 30, fontWeight: 700, lineHeight: 1.15, color: C.ink, marginBottom: 10 }}>{TOP_STORIES[0].headline}</h2>
                <p style={{ fontFamily: F.body, fontSize: 15, fontStyle: "italic", color: C.inkLight, lineHeight: 1.5, marginBottom: 16 }}>{TOP_STORIES[0].subhead}</p>
                <div style={{ backgroundColor: C.sectionBg, height: 200, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.rule} strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
                <p style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.7, color: C.inkLight, marginBottom: 12 }}>{TOP_STORIES[0].excerpt}</p>
                <div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, display: "flex", gap: 6 }}>
                  <span>{TOP_STORIES[0].readTime}</span><span style={{ color: C.rule }}>·</span><span>{TOP_STORIES[0].date}</span><span style={{ color: C.rule }}>·</span><span style={{ fontStyle: "italic", color: C.inkFaint }}>via App</span>
                </div>
              </article>

              {/* Divider */}
              <div style={{ height: 1, backgroundColor: C.rule, margin: "24px 0" }} />

              {/* Story 2 */}
              <article style={{ cursor: "default" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>{TOP_STORIES[1].section}</span>
                  <span style={{ fontFamily: F.sans, fontSize: 9, color: C.inkFaint, display: "flex", alignItems: "center", gap: 3 }}>
                    <LockIcon color="currentColor" /> Private
                  </span>
                </div>
                <h3 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: C.ink, marginBottom: 8 }}>{TOP_STORIES[1].headline}</h3>
                <p style={{ fontFamily: F.body, fontSize: 14, fontStyle: "italic", color: C.inkLight, marginBottom: 8 }}>{TOP_STORIES[1].subhead}</p>
                <p style={{ fontFamily: F.body, fontSize: 14, lineHeight: 1.65, color: C.inkLight, marginBottom: 10 }}>{TOP_STORIES[1].excerpt}</p>
                <div style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, display: "flex", gap: 6 }}>
                  <span>{TOP_STORIES[1].readTime}</span><span style={{ color: C.rule }}>·</span><span>{TOP_STORIES[1].date}</span><span style={{ color: C.rule }}>·</span><span style={{ fontStyle: "italic", color: C.inkFaint }}>via Telegram</span>
                </div>
              </article>
            </div>

            {/* DIVIDER */}
            <div style={{ backgroundColor: C.rule }} />

            {/* RIGHT — Sidebar */}
            <div style={{ paddingLeft: 28 }}>
              {/* Week at a Glance */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 4 }}>The Week at a Glance</h3>
                <div style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: C.inkMuted, marginBottom: 10 }}>{EDITION.week}</div>
                <div style={{ height: 2, backgroundColor: C.accent, marginBottom: 14, width: 40 }} />
                {BRIEFING.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.rule}` }}>
                    <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.inkMuted, whiteSpace: "nowrap", minWidth: 30 }}>{item.day}</span>
                    <span style={{ fontFamily: F.body, fontSize: 13, lineHeight: 1.5, color: C.inkLight }}>{item.note}</span>
                  </div>
                ))}
              </div>

              {/* Editor's Note (with Pro overlay) */}
              <div style={{ position: "relative", marginBottom: 24 }}>
                <div style={{ backgroundColor: C.sectionBg, padding: 20 }}>
                  <div style={{ fontFamily: F.display, fontSize: 18, color: C.accent, marginBottom: 8 }}>✦</div>
                  <h3 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, fontStyle: "italic", color: C.ink, marginBottom: 10 }}>{EDITORIAL.headline}</h3>
                  <p style={{ fontFamily: F.body, fontSize: 13, lineHeight: 1.65, color: C.inkLight, marginBottom: 12, filter: "blur(2px)", userSelect: "none" }}>{EDITORIAL.content}</p>
                  <div style={{ fontFamily: F.body, fontSize: 12, fontStyle: "italic", color: C.inkMuted, filter: "blur(2px)" }}>— AI Editor</div>
                </div>
                {/* Pro overlay */}
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  backgroundColor: "rgba(247,247,247,0.6)",
                }}>
                  <div style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 500, color: C.ink, marginBottom: 6 }}>
                    Editor's Note is a Pro feature
                  </div>
                  <a href="/login" style={{ fontFamily: F.sans, fontSize: 12, color: C.accent, textDecoration: "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    Unlock with Pro →
                  </a>
                </div>
              </div>

              {/* All Sections */}
              <div>
                <h3 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 10 }}>All Sections</h3>
                <div style={{ height: 2, backgroundColor: C.accent, marginBottom: 14, width: 40 }} />
                {SECTIONS.map((s, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.rule}` }}>
                    <span style={{ fontFamily: F.sans, fontSize: 12, color: C.inkLight }}>{s.name}</span>
                    <span style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted, backgroundColor: C.sectionBg, padding: "2px 8px" }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ALSO IN THIS EDITION */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ height: 2, backgroundColor: C.ink, marginBottom: 16 }} />
            <h3 style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: C.inkMuted, marginBottom: 16 }}>Also in This Edition</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
              {MORE_STORIES.map((s, i) => (
                <div key={i} style={{ borderRight: i < MORE_STORIES.length - 1 ? `1px solid ${C.rule}` : "none", paddingRight: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>{s.section}</span>
                    {s.isPublic ? <GlobeIcon color={C.inkFaint} /> : <LockIcon color={C.inkFaint} />}
                  </div>
                  <h4 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, lineHeight: 1.25, color: C.ink, marginBottom: 8 }}>{s.headline}</h4>
                  <span style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted }}>{s.readTime}</span>
                </div>
              ))}
            </div>
          </div>

          {/* STATS BAR */}
          <div style={{ display: "flex", justifyContent: "center", padding: "20px 0", borderTop: `2px solid ${C.ink}`, borderBottom: `1px solid ${C.rule}`, marginBottom: 24 }}>
            {STATS.map((s, i, a) => (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 32px" }}>
                  <span style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.ink }}>{s.n}</span>
                  <span style={{ fontFamily: F.sans, fontSize: 10, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "1px", marginTop: 4 }}>{s.l}</span>
                </div>
                {i < a.length - 1 && <div style={{ width: 1, height: 36, backgroundColor: C.rule }} />}
              </div>
            ))}
          </div>

          {/* FOOTER */}
          <div>
            <div style={{ height: 1, backgroundColor: C.rule, marginBottom: 16 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 600, color: C.ink, display: "block" }}>The Deborah Times</span>
                <span style={{ fontFamily: F.body, fontSize: 11, fontStyle: "italic", color: C.inkMuted }}>Powered by The Hauss</span>
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                {["Export", "Privacy", "Help"].map((l, i) => (
                  <span key={i} style={{ fontFamily: F.sans, fontSize: 11, color: C.inkMuted }}>{l}</span>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* CTA below */}
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <a href="/login" style={{ fontFamily: F.sans, fontSize: 13, color: C.accent, textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Create your own edition →
          </a>
        </div>
      </div>
    </section>
  );
}
