"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Node, mergeAttributes } from "@tiptap/core";

// Generic embed node — wraps an <iframe> for video (YouTube) and audio
// (Buzzsprout, Spotify, Apple Podcasts, etc.). Renders to a real iframe so
// dangerouslySetInnerHTML on the public blog post just works.
const EmbedNode = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null },
      "data-embed-type": { default: "video" }, // "video" → 16:9, "audio" → fixed height
    };
  },
  parseHTML() {
    return [{ tag: "iframe[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const isAudio = HTMLAttributes["data-embed-type"] === "audio";
    return [
      "div",
      { class: isAudio ? "embed-audio my-6" : "embed-video my-6" },
      [
        "iframe",
        mergeAttributes(HTMLAttributes, {
          frameborder: "0",
          loading: "lazy",
          allowfullscreen: "true",
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          style: isAudio
            ? "width: 100%; height: 200px; border-radius: 12px;"
            : "width: 100%; aspect-ratio: 16/9; border-radius: 12px;",
        }),
      ],
    ];
  },
});

// Extract YouTube video ID from any common URL shape and return embed URL.
function youtubeUrlToEmbed(input: string): string | null {
  const trimmed = input.trim();
  // youtu.be/VIDEO_ID
  let m = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  // youtube.com/watch?v=VIDEO_ID
  m = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  // youtube.com/embed/VIDEO_ID (already embed)
  m = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  return null;
}

// Extract iframe src from a full embed code OR accept a bare URL.
function extractIframeSrc(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Full <iframe src="..."> embed code
  const m = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (m) return m[1];
  // Bare URL — assume it's the iframe URL itself
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  return null;
}

interface Props {
  content: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      ImageExtension.configure({ inline: false }),
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Start writing your post..." }),
      EmbedNode,
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  if (!editor) return null;

  const addImage = () => {
    const url = prompt("Image URL:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const addLink = () => {
    const url = prompt("Link URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url, target: "_blank" }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
  };

  const addYoutube = () => {
    const url = prompt(
      "YouTube URL (e.g. https://youtu.be/abc123 or https://youtube.com/watch?v=abc123):"
    );
    if (!url) return;
    const embedSrc = youtubeUrlToEmbed(url);
    if (!embedSrc) {
      alert("Couldn't recognize that as a YouTube URL. Try a youtu.be or youtube.com/watch?v= link.");
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({ type: "embed", attrs: { src: embedSrc, "data-embed-type": "video" } })
      .run();
  };

  const addPodcast = () => {
    const input = prompt(
      "Podcast embed code or URL (paste the full <iframe>...</iframe> from Buzzsprout/Spotify/Apple, or just the iframe URL):"
    );
    if (!input) return;
    const src = extractIframeSrc(input);
    if (!src) {
      alert("Couldn't find a usable URL in that input. Paste the full iframe embed code or just the player URL.");
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({ type: "embed", attrs: { src, "data-embed-type": "audio" } })
      .run();
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-zinc-200 bg-zinc-50">
        <ToolButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <strong>B</strong>
        </ToolButton>
        <ToolButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <em>I</em>
        </ToolButton>
        <ToolButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <s>S</s>
        </ToolButton>
        <div className="w-px h-5 bg-zinc-200 mx-1" />
        <ToolButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          H2
        </ToolButton>
        <ToolButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          H3
        </ToolButton>
        <div className="w-px h-5 bg-zinc-200 mx-1" />
        <ToolButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
        </ToolButton>
        <ToolButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.242 5.992h12m-12 6.003h12m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H4.987m-1.995 2.377a1.125 1.125 0 0 1 2.058.63l-1.96 2.613h2.086m-2.1-2.976a1.125 1.125 0 0 0-.404.168" />
          </svg>
        </ToolButton>
        <ToolButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
        </ToolButton>
        <div className="w-px h-5 bg-zinc-200 mx-1" />
        <ToolButton onClick={addLink} active={editor.isActive("link")} title="Link">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
          </svg>
        </ToolButton>
        <ToolButton onClick={addImage} title="Image">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
          </svg>
        </ToolButton>
        <ToolButton onClick={addYoutube} title="Embed YouTube video">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </ToolButton>
        <ToolButton onClick={addPodcast} title="Embed podcast / audio player">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
          </svg>
        </ToolButton>
        <div className="w-px h-5 bg-zinc-200 mx-1" />
        <ToolButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
          </svg>
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
          </svg>
        </ToolButton>
      </div>

      {/* Editor */}
      <div className="min-h-[400px] px-6 py-4">
        <EditorContent editor={editor} className="prose prose-zinc max-w-none min-h-[350px] focus:outline-none" />
      </div>
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1.5 rounded text-sm transition-colors ${
        active
          ? "bg-brand-blue text-white"
          : "text-zinc-600 hover:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
