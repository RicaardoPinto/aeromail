"use client";

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { FONT_STACK } from "@/lib/signature-generator";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Table as TableIcon,
  Heading1,
  Heading2,
  Undo,
  Redo,
  RemoveFormatting,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export function TiptapEditor({
  value,
  onChange,
  placeholder = "Escribe tu mensaje aquí...",
  minHeight = "200px",
  className,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      TextStyle,
      Color,
      // Las tablas se estilizan al enviar (email-format.ts): aqui solo se
      // necesita poder crearlas y editarlas.
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none p-3 tiptap-content",
        // Mismas tipografia, interlineado, color y fondo con que saldra el
        // correo. Antes el area de escritura seguia el tema oscuro de la
        // aplicacion y lo que se veia al redactar no se parecia a lo que
        // llegaba al destinatario, que siempre lo recibe sobre blanco.
        style: `min-height: ${minHeight}; font-family: ${FONT_STACK}; font-size: 14px; line-height: 1.4; color: #1F2328; background-color: #ffffff;`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Sync external changes if value changes externally (e.g. template selection)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL del enlace:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className={cn("border rounded-md overflow-hidden bg-background", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b bg-muted/40 text-muted-foreground text-xs">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "p-1.5 rounded hover:bg-muted hover:text-foreground transition-colors",
            editor.isActive("bold") && "bg-muted text-primary font-bold"
          )}
          title="Negrita (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "p-1.5 rounded hover:bg-muted hover:text-foreground transition-colors",
            editor.isActive("italic") && "bg-muted text-primary font-bold"
          )}
          title="Cursiva (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(
            "p-1.5 rounded hover:bg-muted hover:text-foreground transition-colors",
            editor.isActive("strike") && "bg-muted text-primary font-bold"
          )}
          title="Tachado"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          className="p-1.5 rounded hover:bg-muted hover:text-foreground transition-colors"
          title="Insertar tabla"
        >
          <TableIcon className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-border mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn(
            "p-1.5 rounded hover:bg-muted hover:text-foreground transition-colors",
            editor.isActive("heading", { level: 1 }) && "bg-muted text-primary font-bold"
          )}
          title="Título principal"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(
            "p-1.5 rounded hover:bg-muted hover:text-foreground transition-colors",
            editor.isActive("heading", { level: 2 }) && "bg-muted text-primary font-bold"
          )}
          title="Subtítulo"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-border mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "p-1.5 rounded hover:bg-muted hover:text-foreground transition-colors",
            editor.isActive("bulletList") && "bg-muted text-primary font-bold"
          )}
          title="Lista con viñetas"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "p-1.5 rounded hover:bg-muted hover:text-foreground transition-colors",
            editor.isActive("orderedList") && "bg-muted text-primary font-bold"
          )}
          title="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-border mx-1" />

        <button
          type="button"
          onClick={setLink}
          className={cn(
            "p-1.5 rounded hover:bg-muted hover:text-foreground transition-colors",
            editor.isActive("link") && "bg-muted text-primary font-bold"
          )}
          title="Insertar enlace"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="p-1.5 rounded hover:bg-muted hover:text-foreground transition-colors"
          title="Limpiar formato"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-border mx-1 ml-auto" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors"
          title="Deshacer"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors"
          title="Rehacer"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content Area */}
      <EditorContent editor={editor} />
    </div>
  );
}
