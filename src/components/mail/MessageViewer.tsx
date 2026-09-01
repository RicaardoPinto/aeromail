"use client";

import React, { useState } from "react";
import { FullEmailMessage } from "@/lib/types";
import { formatBytes, formatEmailDate, getInitials, cn } from "@/lib/utils";
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Star,
  Download,
  ShieldAlert,
  MailWarning,
  ShieldCheck,
  Paperclip,
  MoreVertical,
  Maximize2,
  FileIcon,
  ExternalLink,
} from "lucide-react";

interface MessageViewerProps {
  message: FullEmailMessage | null;
  isLoading: boolean;
  onReply: (mode: "reply" | "replyAll" | "forward") => void;
  onDelete: () => void;
  onToggleStar: () => void;
  onLoadRemoteImages: () => void;
  hasLoadedRemoteImages: boolean;
  onMarkSpam: () => void;
  isSpamFolder: boolean;
}

export function MessageViewer({
  message,
  isLoading,
  onReply,
  onDelete,
  onToggleStar,
  onLoadRemoteImages,
  hasLoadedRemoteImages,
  onMarkSpam,
  isSpamFolder,
}: MessageViewerProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs">Cargando contenido seguro del correo...</p>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 select-none">
        <div className="w-16 h-16 rounded-2xl bg-muted/30 border flex items-center justify-center mb-4">
          <Paperclip className="w-8 h-8 opacity-20" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Ningún correo seleccionado</h3>
        <p className="text-xs text-muted-foreground mt-1 text-center max-w-sm">
          Selecciona un mensaje de la lista o pulsa <kbd className="px-1.5 py-0.5 border rounded bg-muted">C</kbd> para redactar uno nuevo
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-card overflow-hidden">
      {/* Top Action Toolbar */}
      <div className="h-12 border-b px-6 flex items-center justify-between bg-muted/10 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onReply("reply")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
            title="Responder"
          >
            <Reply className="w-4 h-4 text-primary" />
            <span>Responder</span>
          </button>
          <button
            onClick={() => onReply("replyAll")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
            title="Responder a todos"
          >
            <ReplyAll className="w-4 h-4 text-muted-foreground" />
            <span className="hidden sm:inline">A todos</span>
          </button>
          <button
            onClick={() => onReply("forward")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
            title="Reenviar"
          >
            <Forward className="w-4 h-4 text-muted-foreground" />
            <span className="hidden sm:inline">Reenviar</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleStar}
            className="p-2 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-muted transition-colors"
            title="Destacar"
          >
            <Star
              className={cn(
                "w-4 h-4",
                message.flagged && "fill-amber-400 text-amber-400"
              )}
            />
          </button>

          <button
            onClick={onMarkSpam}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isSpamFolder
                ? "text-emerald-600 hover:bg-emerald-500/10"
                : "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
            )}
            title={
              isSpamFolder
                ? "No es correo no deseado: devolver a la bandeja de entrada"
                : "Marcar como correo no deseado"
            }
          >
            {isSpamFolder ? (
              <ShieldCheck className="w-4 h-4" />
            ) : (
              <MailWarning className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Eliminar mensaje"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Header */}
      <div className="p-6 border-b space-y-4 shrink-0 bg-background/50">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {message.subject || "(Sin asunto)"}
          </h1>
          <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
            {formatEmailDate(message.date)}
          </span>
        </div>

        {/* Sender & Recipients Details */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 text-primary font-bold text-sm flex items-center justify-center shrink-0">
            {getInitials(message.from.name || message.from.address)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground truncate">
                {message.from.name || message.from.address}
              </span>
              <span className="text-xs text-muted-foreground truncate font-mono">
                &lt;{message.from.address}&gt;
              </span>
            </div>
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              <span>Para: </span>
              {message.to.map((t) => t.name || t.address).join(", ")}
              {message.cc && message.cc.length > 0 && (
                <span className="ml-2">
                  (CC: {message.cc.map((c) => c.name || c.address).join(", ")})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Privacy Banner if Remote Content is blocked */}
        {message.hasRemoteImages && !hasLoadedRemoteImages && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                Se han bloqueado las imágenes remotas para proteger tu privacidad e IP.
              </span>
            </div>
            <button
              onClick={onLoadRemoteImages}
              className="px-3 py-1 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors shrink-0 shadow-sm"
            >
              Cargar imágenes externas
            </button>
          </div>
        )}

        {/* Attachments chips */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="pt-2">
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Archivos Adjuntos ({message.attachments.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.attachments.map((att, idx) => (
                <a
                  key={att.id || idx}
                  href={`/api/mail/attachment?folder=${encodeURIComponent(
                    message.folder
                  )}&uid=${message.uid}&partId=${att.id}`}
                  download={att.filename}
                  className="px-3 py-1.5 rounded-xl border bg-muted/30 hover:bg-muted hover:border-primary/40 transition-all flex items-center gap-2 text-xs group"
                >
                  <FileIcon className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground max-w-[160px] truncate">
                    {att.filename}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ({formatBytes(att.size)})
                  </span>
                  <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Secure Sandboxed Iframe Email Body */}
      <div className="flex-1 overflow-hidden p-4 bg-white">
        <iframe
          title="Contenido seguro del correo"
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          srcDoc={`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  /* Fondo claro SIEMPRE, aunque la aplicacion este en tema
                     oscuro. Un correo se escribe para fondo blanco y trae sus
                     propios colores: forzar el tema oscuro aqui volvia ilegible
                     el texto y dejaba recuadros blancos sueltos donde el autor
                     si habia puesto fondo. Es lo que hacen Gmail y Outlook. */
                  :root {
                    color-scheme: light;
                  }
                  body {
                    font-family: Calibri, Carlito, "Segoe UI", Candara, "Trebuchet MS", sans-serif;
                    font-size: 14px;
                    line-height: 1.5;
                    margin: 0;
                    padding: 16px;
                    color: #23213A;
                    background-color: #ffffff;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                  }
                  a {
                    color: #5C5498;
                  }
                  img {
                    max-width: 100%;
                    height: auto;
                  }
                  blockquote {
                    margin: 1em 0;
                    padding-left: 1em;
                    border-left: 3px solid #cbd5e1;
                    color: #64748b;
                  }
                  pre, code {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    background: rgba(125, 125, 125, 0.1);
                    border-radius: 4px;
                  }
                </style>
              </head>
              <body>
                ${message.sanitizedHtml || message.htmlBody || ""}
              </body>
            </html>
          `}
          className="w-full h-full border-none rounded-lg"
        />
      </div>
    </div>
  );
}
