import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";

/**
 * The extension set every rich-text editor in the admin uses.
 *
 * Shared because the four editors (blog, community post, and both product
 * forms) had drifted into four slightly different configurations, none of which
 * supported links — `StarterKit` deliberately leaves Link out.
 */
export function richTextExtensions(placeholder: string) {
  return [
    StarterKit,
    Placeholder.configure({ placeholder }),
    Link.configure({
      // Clicking a link while editing should place the cursor, not navigate away
      // and lose unsaved work.
      openOnClick: false,
      autolink: true,
      // Anything else is a vector for javascript: URLs, since this HTML is
      // rendered with dangerouslySetInnerHTML on the public site.
      protocols: ["http", "https", "mailto", "tel"],
      HTMLAttributes: {
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      },
    }),
  ];
}

/** Class list applied inside the editor so it previews as the site renders it. */
export const RICH_TEXT_EDITOR_CLASS =
  "prose prose-invert prose-sm max-w-none focus:outline-none min-h-[280px] p-3";
