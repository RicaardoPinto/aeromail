"use client";

import React, { useState } from "react";
import { EmailSummary } from "@/lib/types";
import { formatEmailDate, getInitials, cn } from "@/lib/utils";
import {
  Paperclip,
  Star,
  Mail,
  MailOpen,
  Trash2,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";

interface MessageListProps {
  messages: EmailSummary[];
  selectedUid: number | null;
  onSelectMessage: (uid: number) => void;
  onToggleFlag: (uid: number, flag: "\\Flagged" | "\\Seen", current: boolean) => void;
  onDeleteMessage: (uid: number) => void;
  isLoading: boolean;
}

export function MessageList({
  messages,
  selectedUid,
  onSelectMessage,
  onToggleFlag,
  onDeleteMessage,
  isLoading,
}: MessageListProps) {
  const [filter, setFilter] = useState<"all" | "unread" | "starred">("all");

  const filteredMessages = messages.filter((msg) => {
    if (filter === "unread") return msg.unread;
    if (filter === "starred") return msg.flagged;
    return true;
  });

  return (
    <div className="w-80 md:w-96 border-r flex flex-col bg-background/50 shrink-0 select-none overflow-hidden">
      {/* Filter Tabs */}
      <div className="p-2.5 border-b flex items-center justify-between gap-1 bg-muted/20">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-lg transition-colors",
              filter === "all"
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Todos ({messages.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-lg transition-colors",
              filter === "unread"
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            No leídos
          </button>
          <button
            onClick={() => setFilter("starred")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-lg transition-colors",
              filter === "starred"
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Destacados
          </button>
        </div>
      </div>

      {/* Messages Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/40">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground space-y-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Cargando mensajes del buzón...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <Mail className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs font-medium">No hay mensajes en esta vista</p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isSelected = selectedUid === msg.uid;
            return (
              <div
                key={msg.uid}
                onClick={() => onSelectMessage(msg.uid)}
                className={cn(
                  "p-3 cursor-pointer transition-all relative flex flex-col gap-1 hover:bg-muted/40",
                  isSelected && "bg-primary/10 hover:bg-primary/15 border-l-2 border-primary",
                  msg.unread && "font-semibold bg-background"
                )}
              >
                {/* Top Row: Sender & Date */}
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 truncate">
                    {/* Unread indicator dot */}
                    {msg.unread && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                    <span
                      className={cn(
                        "truncate",
                        msg.unread ? "text-foreground font-bold" : "text-foreground/80 font-medium"
                      )}
                    >
                      {msg.from.name || msg.from.address}
                    </span>
                  </div>

                  <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                    {formatEmailDate(msg.date)}
                  </span>
                </div>

                {/* Subject Line */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-xs truncate",
                      msg.unread ? "text-foreground font-semibold" : "text-muted-foreground"
                    )}
                  >
                    {msg.subject || "(Sin asunto)"}
                  </span>

                  {/* Star flag toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFlag(msg.uid, "\\Flagged", msg.flagged);
                    }}
                    className="p-1 rounded text-muted-foreground hover:text-amber-500 transition-colors shrink-0"
                  >
                    <Star
                      className={cn(
                        "w-3.5 h-3.5",
                        msg.flagged && "fill-amber-400 text-amber-400"
                      )}
                    />
                  </button>
                </div>

                {/* Footer Snippet / Attachment icon */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate max-w-[220px]">
                    {msg.from.address}
                  </span>

                  {msg.hasAttachments && (
                    <span title="Contiene archivos adjuntos">
                      <Paperclip className="w-3 h-3 text-muted-foreground" />
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
