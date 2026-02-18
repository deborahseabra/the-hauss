import { F, C } from "./theme";
import useInView from "./useInView";

const MOODS = [
  { emoji: "☀️", label: "Bright" },
  { emoji: "🌤", label: "Calm" },
  { emoji: "🌧", label: "Heavy" },
  { emoji: "⚡", label: "Electric" },
  { emoji: "🌙", label: "Reflective" },
];

function ProBadge() {
  return (
    <span style={{
      fontFamily: F.sans, fontSize: 9, fontWeight: 500,
      color: "#fff", backgroundColor: C.accent,
      padding: "2px 8px", marginLeft: 8,
      display: "inline-block", verticalAlign: "middle",
    }}>
      ✦ Editor
    </span>
  );
}

function MainFeature({ title, body, badge, isLast }) {
  const [ref, style] = useInView();
  return (
    <div ref={ref} style={{
      ...style,
      paddingBottom: isLast ? 0 : 28,
      marginBottom: isLast ? 0 : 28,
      borderBottom: isLast ? "none" : `1px solid ${C.rule}`,
    }}>
      <h3 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 600, color: C.ink, margin: "0 0 8px" }}>
        {title}{badge && <ProBadge />}
      </h3>
      <p style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.7, color: C.inkLight, margin: 0 }}>
        {body}
      </p>
    </div>
  );
}

function SideFeature({ title, body, badge, children }) {
  const [ref, style] = useInView();
  return (
    <div ref={ref} style={{ ...style, marginBottom: 28 }}>
      <h4 style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.ink, margin: "0 0 6px" }}>
        {title}{badge && <ProBadge />}
      </h4>
      <p style={{ fontFamily: F.body, fontSize: 13, lineHeight: 1.6, color: C.inkLight, margin: "0 0 10px" }}>
        {body}
      </p>
      {children}
    </div>
  );
}

export default function FeatureShowcase() {
  const [ref, style] = useInView();

  return (
    <section id="features" style={{ padding: "80px 24px", borderTop: `2px solid ${C.ink}` }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div ref={ref} style={{ ...style, marginBottom: 40 }}>
          <div style={{
            fontFamily: F.sans, fontSize: 10, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: 2,
            color: C.accent, marginBottom: 16,
          }}>
            FEATURES
          </div>
          <h2 style={{ fontFamily: F.display, fontSize: 32, fontWeight: 700, color: C.ink, margin: 0 }}>
            Everything a personal newsroom needs.
          </h2>
        </div>

        {/* NYT-style grid: main + divider + sidebar */}
        <div className="landing-grid-features" style={{ display: "grid", gridTemplateColumns: "1fr 1px 340px", gap: 0 }}>
          {/* Main column */}
          <div style={{ paddingRight: 32 }}>
            <MainFeature
              title="Notebook"
              body="Your raw, intimate, day-by-day timeline. Every thought in chronological order, with mood, section, and source. The unedited record of your inner life."
            />
            <MainFeature
              title="The Hauss Editor"
              body="Two modes. Three voices. Zero pressure. Proofread catches grammar and awkward phrasing. Rewrite transforms your notes into polished editorial prose — intimate, literary, or journalistic. You choose if and when to apply."
              badge
            />
            <MainFeature
              title="Weekly Editions"
              body="Every week, your entries are compiled into a beautiful edition. The Hauss Editor selects your top story, organizes by section, and generates the layout. Editor and Publisher users get a full Editor's Note — The Hauss Editor's reflection on your week."
              isLast
            />
          </div>

          {/* Divider */}
          <div style={{ backgroundColor: C.rule }} />

          {/* Sidebar */}
          <div style={{ paddingLeft: 32 }}>
            <SideFeature
              title="Mood Tracking"
              body="Five weather-themed moods. Track your emotional landscape over days, weeks, and months."
            >
              <div style={{ display: "flex", gap: 6 }}>
                {MOODS.map((m, i) => (
                  <div key={i} style={{
                    padding: "6px 8px", border: `1px solid ${C.rule}`,
                    textAlign: "center", flex: 1,
                  }}>
                    <div style={{ fontSize: 14, marginBottom: 2 }}>{m.emoji}</div>
                    <div style={{ fontFamily: F.sans, fontSize: 8, color: C.inkMuted }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </SideFeature>

            <SideFeature
              title="✦ Reflections"
              body="The Hauss Editor reads everything. It finds patterns you missed, connections you didn't see, and asks questions that make you think."
              badge
            />

            <SideFeature
              title="Ask Your Editor"
              body={`Ask anything about your own writing. "When am I happiest?" "What do I write about at 2 AM?" The Hauss Editor searches across every entry and answers.`}
              badge
            />
          </div>
        </div>
      </div>
    </section>
  );
}
