import { F, C } from "./theme";
import useInView from "./useInView";

export default function TheProblem() {
  const [ref, style] = useInView();

  return (
    <section style={{ padding: "80px 24px" }}>
      <div ref={ref} style={{ ...style, maxWidth: 680, margin: "0 auto" }}>
        {/* Section label */}
        <div style={{
          fontFamily: F.sans, fontSize: 10, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: 2,
          color: C.accent, marginBottom: 16,
        }}>
          THE PROBLEM
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: F.display, fontSize: 36, fontWeight: 700,
          lineHeight: 1.2, color: C.ink, margin: "0 0 28px",
        }}>
          You already write. You just don't know it yet.
        </h2>

        {/* Body */}
        <div style={{ fontFamily: F.body, fontSize: 17, lineHeight: 1.8, color: C.inkLight }}>
          <p style={{ margin: "0 0 20px" }}>
            You write every day. In notes apps, in WhatsApp messages to yourself, in the margins of books, in 3 AM thoughts you type half-asleep and forget by morning. You have the instinct. What you don't have is the ritual.
          </p>
          <p style={{ margin: "0 0 20px" }}>
            Journaling apps feel clinical — mood trackers and prompts that ask "what are you grateful for?" as if your inner life can be reduced to a checklist. Notebooks get abandoned. Blogs demand an audience you don't want. So your best thoughts scatter across twelve apps and disappear.
          </p>
          <p style={{ margin: 0 }}>
            What if there were a place that took your scattered thoughts seriously? That gave them structure without stealing their voice? That made your daily notes feel like something worth rereading?
          </p>
        </div>

        {/* Divider */}
        <div style={{ width: 60, height: 2, backgroundColor: C.ink, margin: "40px auto" }} />
      </div>
    </section>
  );
}
