import { F, C } from "./theme";
import useInView from "./useInView";
import MiniEditor from "./MiniEditor";
import MiniHaussEditor from "./MiniHaussEditor";
import MiniEdition from "./MiniEdition";

const STEPS = [
  {
    num: "01",
    title: "Write freely.",
    body: "Open your journal and write. No prompts, no word counts, no pressure. A dispatch from your commute. A letter to your future self. A review of the meal you just cooked. Just you and the page.",
    Visual: MiniEditor,
  },
  {
    num: "02",
    title: "The Hauss Editor elevates.",
    body: "Proofread for grammar and clarity. Or let The Hauss Editor rewrite your notes as an intimate essay, a literary feature, or a journalistic report. Your voice, refined — never replaced.",
    Visual: MiniHaussEditor,
  },
  {
    num: "03",
    title: "Your edition publishes.",
    body: "Every Sunday, your entries become a beautiful weekly edition. Headlines, sections, mood index, editor's note — your life presented as front-page news. A ritual of self-reflection you'll actually keep.",
    Visual: ({ style: s }) => (
      <div style={{ backgroundColor: C.sectionBg, border: `1px solid ${C.rule}`, height: 280, overflow: "hidden", ...s }}>
        <MiniEdition compact />
      </div>
    ),
  },
];

function StepBlock({ step, index }) {
  const [ref, style] = useInView();
  const reverse = index % 2 === 1;

  const textBlock = (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: F.mono, fontSize: 12, color: C.accent, marginBottom: 8 }}>{step.num}</div>
      <h3 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 600, color: C.ink, margin: "0 0 12px", lineHeight: 1.3 }}>
        {step.title}
      </h3>
      <p style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.7, color: C.inkLight, margin: 0 }}>
        {step.body}
      </p>
    </div>
  );

  const visualBlock = (
    <div style={{ flex: 1 }}>
      <step.Visual />
    </div>
  );

  return (
    <div ref={ref} className="landing-grid-2col" style={{
      ...style,
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40,
      alignItems: "center",
      marginBottom: index < STEPS.length - 1 ? 64 : 0,
    }}>
      {reverse ? (
        <>{visualBlock}{textBlock}</>
      ) : (
        <>{textBlock}{visualBlock}</>
      )}
    </div>
  );
}

export default function HowItWorks() {
  const [ref, style] = useInView();

  return (
    <section style={{ padding: "80px 24px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div ref={ref} style={{ ...style, marginBottom: 48 }}>
          <div style={{
            fontFamily: F.sans, fontSize: 10, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: 2,
            color: C.accent, marginBottom: 16,
          }}>
            HOW IT WORKS
          </div>
          <h2 style={{
            fontFamily: F.display, fontSize: 32, fontWeight: 700,
            color: C.ink, margin: 0,
          }}>
            Three steps to your first edition.
          </h2>
        </div>

        {STEPS.map((step, i) => (
          <StepBlock key={i} step={step} index={i} />
        ))}
      </div>
    </section>
  );
}
