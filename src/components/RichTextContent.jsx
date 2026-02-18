const F = {
  display: "'Playfair Display', Georgia, serif",
  body: "'Source Serif 4', Georgia, serif",
  sans: "'IBM Plex Sans', -apple-system, sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

function isHtml(text) {
  return /<(?:p|h[1-6]|img|blockquote|ul|ol|li|hr|br|div|a|strong|em)\b/i.test(text);
}

export function stripHtml(html) {
  if (!html) return "";
  if (!isHtml(html)) return html;
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

/**
 * Renders body text — detects HTML (rich text) vs plain text and renders accordingly.
 * For HTML: uses dangerouslySetInnerHTML with scoped styles.
 * For plain text: splits on double newlines into paragraphs (legacy behavior).
 */
export default function RichTextContent({ text, C, fontSize = 18, useDropCap = false }) {
  if (!text) return null;

  if (isHtml(text)) {
    return (
      <>
        <div
          className="rich-text-content"
          dangerouslySetInnerHTML={{ __html: text }}
        />
        <style>{`
          .rich-text-content {
            font-family: ${F.body};
            font-size: ${fontSize}px;
            line-height: 1.85;
            color: ${C.inkLight || C.ink};
          }
          .rich-text-content p {
            margin-bottom: 20px;
          }
          .rich-text-content h2 {
            font-family: ${F.display};
            font-size: 26px;
            font-weight: 700;
            line-height: 1.25;
            margin: 28px 0 12px;
            color: ${C.ink};
          }
          .rich-text-content h3 {
            font-family: ${F.display};
            font-size: 20px;
            font-weight: 600;
            line-height: 1.3;
            margin: 24px 0 10px;
            color: ${C.ink};
          }
          .rich-text-content blockquote {
            border-left: 3px solid ${C.accent || "#c41e1e"};
            padding-left: 20px;
            margin: 20px 0;
            font-style: italic;
            color: ${C.inkLight || "#363636"};
          }
          .rich-text-content ul, .rich-text-content ol {
            padding-left: 24px;
            margin: 12px 0;
          }
          .rich-text-content li {
            margin-bottom: 6px;
          }
          .rich-text-content a {
            color: ${C.accent || "#c41e1e"};
            text-decoration: underline;
            text-underline-offset: 2px;
          }
          .rich-text-content img {
            max-width: 100%;
            height: auto;
            margin: 20px 0;
            display: block;
          }
          .rich-text-content hr {
            border: none;
            border-top: 1px solid ${C.rule || "#e2e2e2"};
            margin: 32px 0;
          }
          .rich-text-content code {
            font-family: ${F.mono};
            font-size: ${Math.round(fontSize * 0.78)}px;
            background: ${C.sectionBg || "#f7f7f7"};
            padding: 2px 6px;
            border-radius: 3px;
          }
          .rich-text-content strong {
            font-weight: 700;
          }
          .rich-text-content em {
            font-style: italic;
          }
        `}</style>
      </>
    );
  }

  // Plain text fallback
  const paragraphs = text.split("\n\n").filter(Boolean);
  return (
    <div>
      {paragraphs.map((p, i) => (
        <p key={i} style={{
          fontFamily: F.body, fontSize, lineHeight: 1.85,
          color: C.inkLight || C.ink, marginBottom: 20,
        }}>
          {i === 0 && useDropCap && p.length > 0 ? (
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
  );
}
