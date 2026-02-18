import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { useState, useRef, useEffect, useCallback } from "react";
import { resizeImage } from "../lib/imageResize";

const F = {
  display: "'Playfair Display', Georgia, serif",
  body: "'Source Serif 4', Georgia, serif",
  sans: "'IBM Plex Sans', -apple-system, sans-serif",
};

function ToolbarButton({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        background: "none", border: "none", cursor: "pointer",
        padding: "6px 8px", display: "flex", alignItems: "center",
        color: active ? "#fff" : "rgba(255,255,255,0.6)",
        borderRadius: 2, transition: "color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function FloatingToolbar({ editor, containerRef }) {
  const [pos, setPos] = useState(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { from, to } = editor.state.selection;
      if (from === to || !editor.isFocused) { setPos(null); setLinkMode(false); return; }
      const coords = editor.view.coordsAtPos(from);
      const endCoords = editor.view.coordsAtPos(to);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({
        top: coords.top - rect.top - 48,
        left: (coords.left + endCoords.left) / 2 - rect.left,
      });
    };
    editor.on("selectionUpdate", update);
    editor.on("blur", () => { setTimeout(() => { if (!linkInputRef.current || document.activeElement !== linkInputRef.current) { setPos(null); setLinkMode(false); } }, 150); });
    return () => { editor.off("selectionUpdate", update); };
  }, [editor, containerRef]);

  useEffect(() => { if (linkMode && linkInputRef.current) linkInputRef.current.focus(); }, [linkMode]);

  const handleLinkSubmit = () => {
    if (!editor) return;
    setLinkMode(false);
    if (!linkUrl) { editor.chain().focus().unsetLink().run(); return; }
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkUrl("");
  };

  if (!pos || !editor) return null;

  return (
    <div style={{
      position: "absolute", top: pos.top, left: pos.left, transform: "translateX(-50%)",
      zIndex: 50, animation: "fadeIn 0.12s ease",
    }}>
      {linkMode ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 4, padding: "4px 6px",
          backgroundColor: "#1a1a1a", borderRadius: 6, boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        }}>
          <input
            ref={linkInputRef}
            type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLinkSubmit(); } if (e.key === "Escape") { setLinkMode(false); editor.chain().focus().run(); } }}
            placeholder="https://..."
            style={{
              width: 200, padding: "4px 8px", fontSize: 12, fontFamily: F.sans,
              backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff", outline: "none", borderRadius: 2,
            }}
          />
          <button type="button" onMouseDown={(e) => { e.preventDefault(); handleLinkSubmit(); }} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: "4px 6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); setLinkMode(false); editor.chain().focus().run(); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: "4px 6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      ) : (
        <div style={{
          display: "flex", alignItems: "center", gap: 0,
          backgroundColor: "#1a1a1a", borderRadius: 6, padding: "2px 4px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        }}>
          <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
            <span style={{ fontWeight: 700, fontSize: 14, fontFamily: F.body }}>B</span>
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
            <span style={{ fontStyle: "italic", fontSize: 14, fontFamily: F.body }}>i</span>
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
            <span style={{ textDecoration: "underline", fontSize: 14, fontFamily: F.body }}>U</span>
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("link")} onClick={() => { if (editor.isActive("link")) { editor.chain().focus().unsetLink().run(); } else { setLinkUrl(editor.getAttributes("link").href || ""); setLinkMode(true); } }} title="Link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
          </ToolbarButton>
          <div style={{ width: 1, height: 18, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 2px" }} />
          <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading">
            <span style={{ fontWeight: 700, fontSize: 14, fontFamily: F.sans }}>H</span>
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Subheading">
            <span style={{ fontWeight: 600, fontSize: 12, fontFamily: F.sans }}>h</span>
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/></svg>
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="List">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></svg>
          </ToolbarButton>
        </div>
      )}
    </div>
  );
}

function PlusMenu({ pos, C, onImage, onHR }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      position: "absolute", top: pos.top, left: pos.left, zIndex: 10,
      display: "flex", alignItems: "center", gap: 4, animation: "fadeIn 0.15s ease",
    }}>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen(!open); }}
        style={{
          width: 28, height: 28, borderRadius: "50%",
          border: `1.5px solid ${C.rule}`, background: "none",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: C.inkMuted, transition: "all 0.2s",
          transform: open ? "rotate(45deg)" : "none",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      {open && (
        <div style={{ display: "flex", alignItems: "center", gap: 2, animation: "fadeIn 0.15s ease" }}>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onImage(); setOpen(false); }}
            title="Add image"
            style={{
              width: 28, height: 28, borderRadius: "50%",
              border: `1px solid ${C.rule}`, background: "none",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: C.inkMuted,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
            </svg>
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onHR(); setOpen(false); }}
            title="Horizontal rule"
            style={{
              width: 28, height: 28, borderRadius: "50%",
              border: `1px solid ${C.rule}`, background: "none",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: C.inkMuted,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="12" x2="21" y2="12"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default function RichTextEditor({ value, onChange, placeholder, C, onUploadImage }) {
  const [plusMenuPos, setPlusMenuPos] = useState(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer nofollow" } }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: placeholder || "Start writing..." }),
      Underline,
    ],
    content: value || "",
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        style: [
          `font-family: ${F.body}`,
          "font-size: 18px",
          "line-height: 1.85",
          `color: ${C.ink}`,
          "outline: none",
          "min-height: 300px",
        ].join("; "),
      },
    },
  });

  useEffect(() => {
    if (editor && onChange._setEditor) onChange._setEditor(editor);
  }, [editor, onChange]);

  useEffect(() => {
    if (!editor) return;
    const handleSelectionUpdate = () => {
      const { $from } = editor.state.selection;
      const node = $from.parent;
      if (node.type.name === "paragraph" && node.content.size === 0 && editor.isFocused) {
        const coords = editor.view.coordsAtPos($from.pos);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setPlusMenuPos({ top: coords.top - rect.top - 4, left: -40 });
        }
      } else {
        setPlusMenuPos(null);
      }
    };
    editor.on("selectionUpdate", handleSelectionUpdate);
    editor.on("focus", handleSelectionUpdate);
    editor.on("blur", () => setPlusMenuPos(null));
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
      editor.off("focus", handleSelectionUpdate);
    };
  }, [editor]);

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editor || !onUploadImage) return;
    try {
      const resized = await resizeImage(file);
      const url = await onUploadImage(resized);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      console.error("Image upload failed:", err);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPlusMenuPos(null);
  }, [editor, onUploadImage]);

  if (!editor) return null;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageUpload}
      />

      <FloatingToolbar editor={editor} containerRef={containerRef} />

      {plusMenuPos && (
        <PlusMenu
          pos={plusMenuPos}
          C={C}
          onImage={() => fileInputRef.current?.click()}
          onHR={() => { editor.chain().focus().setHorizontalRule().run(); setPlusMenuPos(null); }}
        />
      )}

      <EditorContent editor={editor} />

      <style>{`
        .tiptap {
          outline: none;
        }
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: ${C.inkFaint || "#999"};
          pointer-events: none;
          height: 0;
          font-family: ${F.body};
          font-size: 18px;
          font-style: italic;
        }
        .tiptap h2 {
          font-family: ${F.display};
          font-size: 26px;
          font-weight: 700;
          line-height: 1.25;
          margin: 28px 0 12px;
          color: ${C.ink};
        }
        .tiptap h3 {
          font-family: ${F.display};
          font-size: 20px;
          font-weight: 600;
          line-height: 1.3;
          margin: 24px 0 10px;
          color: ${C.ink};
        }
        .tiptap p {
          margin-bottom: 16px;
        }
        .tiptap blockquote {
          border-left: 3px solid ${C.accent || "#c41e1e"};
          padding-left: 20px;
          margin: 20px 0;
          font-style: italic;
          color: ${C.inkLight || "#363636"};
        }
        .tiptap ul, .tiptap ol {
          padding-left: 24px;
          margin: 12px 0;
        }
        .tiptap li {
          margin-bottom: 6px;
        }
        .tiptap a {
          color: ${C.accent || "#c41e1e"};
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .tiptap img {
          max-width: 100%;
          height: auto;
          margin: 20px 0;
          display: block;
        }
        .tiptap hr {
          border: none;
          border-top: 1px solid ${C.rule || "#e2e2e2"};
          margin: 32px 0;
        }
        .tiptap code {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 14px;
          background: ${C.sectionBg || "#f7f7f7"};
          padding: 2px 6px;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}
