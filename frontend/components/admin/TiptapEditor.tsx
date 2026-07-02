"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function TiptapEditor({ content, onChange, placeholder }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Yazmaya başlayın..." }),
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none min-h-[400px] px-4 py-3 focus:outline-none text-gray-200 text-sm leading-relaxed",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  if (!editor) return null;

  const btn = (onClick: () => void, label: string, active?: boolean) => (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${active ? "bg-amber text-gray-900" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-700 bg-gray-800">
        {btn(() => editor.chain().focus().toggleBold().run(), "B", editor.isActive("bold"))}
        {btn(() => editor.chain().focus().toggleItalic().run(), "I", editor.isActive("italic"))}
        {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2", editor.isActive("heading", { level: 2 }))}
        {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3", editor.isActive("heading", { level: 3 }))}
        <span className="text-gray-700 mx-1">|</span>
        {btn(() => editor.chain().focus().toggleBulletList().run(), "• Liste", editor.isActive("bulletList"))}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), "1. Liste", editor.isActive("orderedList"))}
        {btn(() => editor.chain().focus().toggleBlockquote().run(), "Alıntı", editor.isActive("blockquote"))}
        <span className="text-gray-700 mx-1">|</span>
        <button
          type="button"
          onMouseDown={e => {
            e.preventDefault();
            const url = window.prompt("Görsel URL:");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
          className="px-2 py-1 rounded text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700"
        >
          Görsel Ekle
        </button>
        <button
          type="button"
          onMouseDown={e => {
            e.preventDefault();
            const url = window.prompt("Link URL:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className="px-2 py-1 rounded text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700"
        >
          Link
        </button>
        <span className="text-gray-700 mx-1">|</span>
        {btn(() => editor.chain().focus().undo().run(), "↩ Geri")}
        {btn(() => editor.chain().focus().redo().run(), "↪ İleri")}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
