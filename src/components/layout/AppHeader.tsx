"use client";

import React, { useState } from "react";
import {
  Search,
  RefreshCw,
  Sun,
  Moon,
  PenTool,
  LogOut,
  Sliders,
  Mail,
  User,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  userEmail: string;
  userName: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSignatures: () => void;
  onLogout: () => void;
  theme: "dark" | "light" | "system";
  onToggleTheme: () => void;
}

export function AppHeader({
  userEmail,
  userName,
  onRefresh,
  isRefreshing,
  searchQuery,
  onSearchChange,
  onOpenSignatures,
  onLogout,
  theme,
  onToggleTheme,
}: AppHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="h-14 border-b bg-card/60 backdrop-blur-md px-4 flex items-center justify-between gap-4 select-none shrink-0 z-20">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 w-56">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-blue-400 text-white flex items-center justify-center font-bold shadow-md shadow-primary/20">
          <Mail className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            AeroMail
          </span>
          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500 inline" /> TLS IMAP/SMTP
          </span>
        </div>
      </div>

      {/* Center: Universal Search Bar */}
      <div className="flex-1 max-w-xl relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por asunto, remitente o contenido... (Presiona /)"
            className="w-full pl-9 pr-12 py-1.5 text-xs rounded-xl bg-muted/50 border border-border/80 hover:bg-muted/80 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground"
          />
          <kbd className="absolute right-2.5 text-[10px] font-mono text-muted-foreground bg-background border px-1.5 py-0.5 rounded shadow-sm">
            /
          </kbd>
        </div>
      </div>

      {/* Right: Quick actions & Profile */}
      <div className="flex items-center gap-2">
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          title="Sincronizar buzón"
        >
          <RefreshCw
            className={cn("w-4 h-4", isRefreshing && "animate-spin text-primary")}
          />
        </button>

        {/* Signature Manager Trigger */}
        <button
          onClick={onOpenSignatures}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors flex items-center gap-1.5 shadow-sm"
          title="Gestionar firmas de correo"
        >
          <PenTool className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Firmas</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Alternar tema claro/oscuro"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 pl-2 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border"
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
              {(userName || userEmail || "U").slice(0, 2).toUpperCase()}
            </div>
            <span className="text-xs font-medium max-w-[120px] truncate hidden md:inline">
              {userName || userEmail}
            </span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-card border shadow-xl p-3 text-xs z-50 animate-in fade-in zoom-in-95">
              <div className="pb-3 border-b mb-2">
                <p className="font-semibold text-foreground truncate">{userName}</p>
                <p className="text-muted-foreground truncate text-[11px]">{userEmail}</p>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenSignatures();
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted flex items-center gap-2 text-foreground transition-colors"
                >
                  <PenTool className="w-4 h-4 text-primary" />
                  Administrador de Firmas
                </button>

                <button
                  onClick={onLogout}
                  className="w-full text-left p-2 rounded-lg hover:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
