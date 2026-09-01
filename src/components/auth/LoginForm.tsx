"use client";

import React, { useState } from "react";
import {
  Mail,
  Lock,
  Server,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  LogIn,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced server settings
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState(993);
  const [imapSecure, setImapSecure] = useState(true);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpSecure, setSmtpSecure] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor ingresa tu correo y contraseña");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          imapHost: imapHost || undefined,
          imapPort,
          imapSecure,
          smtpHost: smtpHost || undefined,
          smtpPort,
          smtpSecure,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fallo en la autenticación IMAP/SMTP");
      }

      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor de correo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="w-full max-w-md bg-card border shadow-2xl rounded-3xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-blue-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-primary/30">
            <Mail className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            AeroMail
          </h1>
          <p className="text-xs text-muted-foreground">
            Webmail open-source moderno, seguro y soberano para tu VPS
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Dirección de Correo
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@dominio.com"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Contraseña de Correo
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Toggle Advanced Server Settings */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-between py-1 transition-colors"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Server className="w-3.5 h-3.5 text-primary" />
              Configuración de Servidor IMAP / SMTP
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showAdvanced && (
            <div className="p-4 rounded-2xl bg-muted/30 border space-y-3 text-xs animate-in fade-in duration-200">
              <div className="space-y-2">
                <span className="font-bold text-foreground">Servidor IMAP (Entrante)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                      placeholder="mail.tudominio.com"
                      className="w-full px-2.5 py-1.5 rounded-lg border bg-background text-xs"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={imapPort}
                      onChange={(e) => setImapPort(Number(e.target.value))}
                      placeholder="993"
                      className="w-full px-2.5 py-1.5 rounded-lg border bg-background text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t">
                <span className="font-bold text-foreground">Servidor SMTP (Saliente)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="mail.tudominio.com"
                      className="w-full px-2.5 py-1.5 rounded-lg border bg-background text-xs"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      placeholder="465"
                      className="w-full px-2.5 py-1.5 rounded-lg border bg-background text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/25 disabled:opacity-50 active:scale-[0.99]"
          >
            <LogIn className="w-4 h-4" />
            {loading ? "Conectando con tu buzón..." : "Iniciar Sesión"}
          </button>
        </form>

        {/* Security badge footer */}
        <div className="pt-2 border-t text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Cifrado AES-256-GCM y conexión TLS directa</span>
        </div>
      </div>
    </div>
  );
}
