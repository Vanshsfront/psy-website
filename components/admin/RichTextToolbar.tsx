"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";

/**
 * Formatting controls for the admin rich-text editors.
 *
 * The blog and community editors previously shipped with no toolbar at all, so
 * a post could only ever be plain paragraphs — part of why posts read as "one
 * write up". The link control is an inline field rather than window.prompt()
 * because a modal dialog blocks the whole page and loses the selection.
 */
export default function RichTextToolbar({ editor }: { editor: Editor | null }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  if (!editor) return null;

  const btn = (active: boolean) =>
    `px-2 py-1 text-xs rounded transition-colors ${
      active ? "bg-borderDark text-white" : "text-mutedText hover:bg-borderDark"
    }`;

  const openLink = () => {
    setLinkValue(editor.getAttributes("link").href ?? "https://");
    setLinkOpen(true);
  };

  const applyLink = () => {
    const href = linkValue.trim();
    if (!href || href === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
  };

  return (
    <div className="bg-surfaceLighter border-b border-borderDark">
      <div className="p-2 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${btn(editor.isActive("bold"))} font-bold`}>B</button>

        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${btn(editor.isActive("italic"))} italic`}>I</button>

        <span className="w-px bg-borderDark mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btn(editor.isActive("heading", { level: 2 }))}>H2</button>

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={btn(editor.isActive("heading", { level: 3 }))}>H3</button>

        <span className="w-px bg-borderDark mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btn(editor.isActive("bulletList"))}>• List</button>

        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btn(editor.isActive("orderedList"))}>1. List</button>

        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={btn(editor.isActive("blockquote"))}>❝</button>

        <span className="w-px bg-borderDark mx-1" />

        <button type="button" onClick={openLink} className={btn(editor.isActive("link"))}>
          🔗 Link
        </button>

        {editor.isActive("link") && (
          <button
            type="button"
            onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
            className={btn(false)}
          >
            Unlink
          </button>
        )}
      </div>

      {linkOpen && (
        <div className="px-2 pb-2 flex gap-1.5 items-center">
          <input
            autoFocus
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); applyLink(); }
              if (e.key === "Escape") setLinkOpen(false);
            }}
            placeholder="https://example.com"
            className="flex-1 px-2 py-1 text-xs bg-surface border border-borderDark rounded text-white"
          />
          <button type="button" onClick={applyLink}
            className="px-2 py-1 text-xs rounded bg-borderDark text-white">Apply</button>
          <button type="button" onClick={() => setLinkOpen(false)}
            className="px-2 py-1 text-xs rounded text-mutedText hover:bg-borderDark">Cancel</button>
        </div>
      )}
    </div>
  );
}
