"use client";

import React from "react";
import { MailboxFolder } from "@/lib/types";
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  AlertOctagon,
  Archive,
  Folder,
  PlusCircle,
  Edit,
  PenSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderListProps {
  folders: MailboxFolder[];
  selectedFolder: string;
  onSelectFolder: (folderPath: string) => void;
  onCompose: () => void;
}

export function FolderList({
  folders,
  selectedFolder,
  onSelectFolder,
  onCompose,
}: FolderListProps) {
  const getFolderIcon = (path: string, specialUse?: string) => {
    const key = (specialUse || path).toLowerCase();
    if (key.includes("inbox")) return <Inbox className="w-4 h-4" />;
    if (key.includes("sent") || key.includes("enviad")) return <Send className="w-4 h-4" />;
    if (key.includes("draft") || key.includes("borrador")) return <FileText className="w-4 h-4" />;
    if (key.includes("trash") || key.includes("papeler")) return <Trash2 className="w-4 h-4" />;
    if (key.includes("junk") || key.includes("spam")) return <AlertOctagon className="w-4 h-4" />;
    if (key.includes("archive") || key.includes("archiv")) return <Archive className="w-4 h-4" />;
    return <Folder className="w-4 h-4" />;
  };

  const formatFolderName = (path: string, specialUse?: string) => {
    const key = (specialUse || path).toLowerCase();
    if (key.includes("inbox")) return "Bandeja de entrada";
    if (key.includes("sent") || key.includes("enviad")) return "Enviados";
    if (key.includes("draft") || key.includes("borrador")) return "Borradores";
    if (key.includes("trash") || key.includes("papeler")) return "Papelera";
    if (key.includes("junk") || key.includes("spam")) return "Spam";
    if (key.includes("archive") || key.includes("archiv")) return "Archivo";
    return path.replace(/^INBOX\./i, "");
  };

  return (
    <aside className="w-60 border-r bg-card/30 flex flex-col justify-between shrink-0 select-none">
      {/* Top Section */}
      <div className="p-3 space-y-4">
        {/* Compose Button */}
        <button
          onClick={onCompose}
          className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-between hover:bg-primary/90 transition-all shadow-md shadow-primary/20 group active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <PenSquare className="w-4 h-4" />
            <span>Redactar</span>
          </div>
          <kbd className="text-[10px] font-mono bg-primary-foreground/20 px-1.5 py-0.5 rounded text-primary-foreground group-hover:bg-primary-foreground/30">
            C
          </kbd>
        </button>

        {/* Folders Navigation */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
            Buzones
          </div>

          {folders.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground animate-pulse">
              Cargando buzones...
            </div>
          ) : (
            folders.map((folder) => {
              const isSelected = selectedFolder === folder.path;
              return (
                <button
                  key={folder.path}
                  onClick={() => onSelectFolder(folder.path)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group",
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={cn(
                        "transition-colors",
                        isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {getFolderIcon(folder.path, folder.specialUse)}
                    </span>
                    <span className="truncate">
                      {formatFolderName(folder.path, folder.specialUse)}
                    </span>
                  </div>

                  {folder.unseen > 0 && (
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/15 text-primary"
                      )}
                    >
                      {folder.unseen}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="p-3 border-t bg-muted/10 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>AeroMail Webmail</span>
        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
          v1.0.0
        </span>
      </div>
    </aside>
  );
}
