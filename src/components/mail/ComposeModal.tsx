"use client";

import React, { useState, useEffect } from "react";
import { Contact, Identity, Signature, SendMailPayload } from "@/lib/types";
import { TiptapEditor } from "../editor/TiptapEditor";
import { compileSignature } from "@/lib/sanitizer";
import {
  X,
  Minus,
  Maximize2,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  ChevronDown,
  FileIcon,
} from "lucide-react";
import { formatBytes, cn } from "@/lib/utils";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  identities: Identity[];
  signatures: Signature[];
  initialData?: {
    to?: string;
    subject?: string;
    body?: string;
    inReplyTo?: string;
    references?: string[];
  };
  onSentSuccess?: () => void;
}

const MARCA_FIRMA = "aeromail-sig";

/**
 * Variables de la firma a partir de la identidad. Lo que no este definido se
 * deja vacio a proposito: antes se rellenaba con un cargo y un telefono de
 * ejemplo que acababan saliendo en correos reales.
 */
function variablesDeIdentidad(ident?: Identity): Record<string, string> {
  if (!ident) return {};
  const nombre = ident.name || "";
  return {
    name: nombre,
    email: ident.email || "",
    company: ident.organization || "",
    title: ident.title || "",
    phone: ident.phone || "",
    mobile: ident.mobile || "",
    address: ident.address || "",
    website: ident.website || "",
    website_url: ident.websiteUrl || ident.website || "",
    logo_url: ident.logoUrl || "",
    initials: nombre.slice(0, 2).toUpperCase() || "?",
  };
}

/**
 * Quita las firmas ya insertadas y anade la nueva.
 *
 * Se usa el analizador del navegador y no una expresion regular porque la
 * firma lleva div anidados: la regex anterior cortaba en el primer cierre y
 * dejaba el resto huerfano, de modo que al probar varias se iban apilando.
 */
function reemplazarFirma(html: string, bloqueNuevo: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html + bloqueNuevo;
  }
  const doc = new DOMParser().parseFromString("<body>" + html + "</body>", "text/html");
  doc.body
    .querySelectorAll('[data-signature="aeromail-sig"]')
    .forEach((nodo) => nodo.remove());
  return doc.body.innerHTML + bloqueNuevo;
}

/**
 * Campo de direcciones con sugerencias de contactos ya conocidos.
 *
 * Filtra por el ultimo tramo separado por coma, no por todo el contenido,
 * para que siga funcionando cuando ya hay varios destinatarios escritos.
 */
function CampoDireccion({
  valor,
  onChange,
  placeholder,
  contactos,
  className,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
  contactos: Contact[];
  className: string;
}) {
  const [abierto, setAbierto] = useState(false);

  const tramos = valor.split(",");
  const actual = (tramos[tramos.length - 1] || "").trim().toLowerCase();
  const yaPuestos = tramos.slice(0, -1).map((t) => t.trim().toLowerCase());

  const sugerencias =
    actual.length < 2
      ? []
      : contactos
          .filter(
            (c) =>
              !yaPuestos.includes(c.address) &&
              (c.address.includes(actual) ||
                (c.name || "").toLowerCase().includes(actual))
          )
          .slice(0, 6);

  const elegir = (c: Contact) => {
    const partes = valor.split(",");
    partes[partes.length - 1] = c.address;
    onChange(partes.map((p) => p.trim()).join(", ") + ", ");
    setAbierto(false);
  };

  return (
    <div className="flex-1 relative">
      <input
        type="text"
        value={valor}
        onChange={(e) => {
          onChange(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder={placeholder}
        className={className}
      />
      {abierto && sugerencias.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-20 bg-popover border rounded-lg shadow-lg overflow-hidden">
          {sugerencias.map((c) => (
            <li key={c.address}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(c)}
                className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
              >
                <span className="block text-foreground truncate">
                  {c.name || c.address}
                </span>
                {c.name && (
                  <span className="block text-[11px] text-muted-foreground truncate">
                    {c.address}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ComposeModal({
  isOpen,
  onClose,
  identities,
  signatures,
  initialData,
  onSentSuccess,
}: ComposeModalProps) {
  const defaultIdentity = identities.find((i) => i.isDefault) || identities[0];
  const defaultSig =
    signatures.find((s) => s.isDefault) || signatures[0];

  const [selectedIdentity, setSelectedIdentity] = useState<string>(
    defaultIdentity?.id || ""
  );
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>(
    defaultSig?.id || ""
  );

  const [to, setTo] = useState<string>(initialData?.to || "");
  const [cc, setCc] = useState<string>("");
  const [bcc, setBcc] = useState<string>("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState<string>(initialData?.subject || "");
  const [bodyHtml, setBodyHtml] = useState<string>("");
  const [attachments, setAttachments] = useState<
    { filename: string; content: string; contentType: string; size: number }[]
  >([]);
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [contactos, setContactos] = useState<Contact[]>([]);

  // Los contactos se aprenden solos de lo que llega y de lo que se envia.
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((d) => setContactos(d.contacts || []))
      .catch(() => setContactos([]));
  }, [isOpen]);

  // El modal no se desmonta al cerrarse, asi que al abrirlo hay que reiniciar
  // TODOS los campos. Antes solo se reasignaban si venian datos, y por eso un
  // correo nuevo heredaba el destinatario y el asunto de la respuesta anterior.
  useEffect(() => {
    if (!isOpen) return;

    const currentIdent =
      identities.find((i) => i.id === selectedIdentity) || defaultIdentity;
    const currentSig =
      signatures.find((s) => s.id === selectedSignatureId) || defaultSig;

    const compiledSig =
      currentSig && currentIdent
        ? compileSignature(currentSig.htmlContent, variablesDeIdentidad(currentIdent))
        : "";

    const initBody = initialData?.body || "<p></p>";
    const sigBlock = compiledSig
      ? `<div data-signature="${MARCA_FIRMA}"><br/><br/>${compiledSig}</div>`
      : "";

    setBodyHtml(`${initBody}${sigBlock}`);
    setTo(initialData?.to || "");
    setSubject(initialData?.subject || "");
    setCc("");
    setBcc("");
    setShowCcBcc(false);
    setAttachments([]);
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSignatureChange = (newSigId: string) => {
    setSelectedSignatureId(newSigId);
    const newSig = signatures.find((s) => s.id === newSigId);
    const currentIdent =
      identities.find((i) => i.id === selectedIdentity) || defaultIdentity;

    const compiled =
      newSig && currentIdent
        ? compileSignature(newSig.htmlContent, variablesDeIdentidad(currentIdent))
        : "";

    const newSigBlock = compiled
      ? `<div data-signature="${MARCA_FIRMA}"><br/><br/>${compiled}</div>`
      : "";

    setBodyHtml((prev) => reemplazarFirma(prev, newSigBlock));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setAttachments((prev) => [
          ...prev,
          {
            filename: file.name,
            content: base64,
            contentType: file.type || "application/octet-stream",
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    if (!to.trim()) {
      alert("Por favor ingresa al menos un destinatario (Para:)");
      return;
    }

    const currentIdent =
      identities.find((i) => i.id === selectedIdentity) || defaultIdentity;
    const fromStr = currentIdent
      ? `"${currentIdent.name}" <${currentIdent.email}>`
      : "";

    const payload: SendMailPayload = {
      from: fromStr,
      to: to.split(",").map((s) => s.trim()).filter(Boolean),
      cc: cc ? cc.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      bcc: bcc ? bcc.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      subject: subject || "(Sin asunto)",
      html: bodyHtml,
      inReplyTo: initialData?.inReplyTo,
      references: initialData?.references,
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    };

    setSending(true);
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al enviar correo");
      }

      onClose();
      if (onSentSuccess) onSentSuccess();
    } catch (err: any) {
      alert(err.message || "Error al enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 right-6 z-50 bg-card text-card-foreground border shadow-2xl rounded-t-2xl transition-all flex flex-col overflow-hidden",
        minimized
          ? "w-80 h-12"
          : "w-full max-w-2xl h-[80vh] animate-in slide-in-from-bottom-6"
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold">
            {subject ? subject : "Nuevo Mensaje"}
          </span>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground">
          <button
            onClick={() => setMinimized(!minimized)}
            className="p-1 rounded hover:bg-muted transition-colors"
            title={minimized ? "Restaurar" : "Minimizar"}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Cerrar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Header Inputs */}
          <div className="divide-y divide-border/60 text-xs shrink-0">
            {/* Identity Selector */}
            <div className="px-4 py-2 flex items-center gap-2 bg-muted/10">
              <span className="text-muted-foreground w-12 font-medium">De:</span>
              <select
                value={selectedIdentity}
                onChange={(e) => setSelectedIdentity(e.target.value)}
                className="flex-1 bg-transparent font-semibold text-foreground focus:outline-none cursor-pointer"
              >
                {identities.map((ident) => (
                  <option key={ident.id} value={ident.id}>
                    {ident.name} &lt;{ident.email}&gt;
                  </option>
                ))}
              </select>
            </div>

            {/* To Input */}
            <div className="px-4 py-2 flex items-center gap-2">
              <span className="text-muted-foreground w-12 font-medium">Para:</span>
                  <CampoDireccion
                    valor={to}
                    onChange={setTo}
                    placeholder="destinatario@correo.com (separa varios con coma)"
                    contactos={contactos}
                    className="w-full bg-transparent focus:outline-none text-foreground font-medium"
                  />
              <button
                type="button"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-[11px] text-muted-foreground hover:text-foreground font-mono"
              >
                {showCcBcc ? "Ocultar CC/CCO" : "CC/CCO"}
              </button>
            </div>

            {/* Optional CC / BCC */}
            {showCcBcc && (
              <>
                <div className="px-4 py-2 flex items-center gap-2">
                  <span className="text-muted-foreground w-12 font-medium">CC:</span>
                  <CampoDireccion
                    valor={cc}
                    onChange={setCc}
                    placeholder="copia@correo.com"
                    contactos={contactos}
                    className="w-full bg-transparent focus:outline-none text-foreground"
                  />
                </div>
                <div className="px-4 py-2 flex items-center gap-2">
                  <span className="text-muted-foreground w-12 font-medium">CCO:</span>
                  <CampoDireccion
                    valor={bcc}
                    onChange={setBcc}
                    placeholder="copia.oculta@correo.com"
                    contactos={contactos}
                    className="w-full bg-transparent focus:outline-none text-foreground"
                  />
                </div>
              </>
            )}

            {/* Subject Input */}
            <div className="px-4 py-2 flex items-center gap-2">
              <span className="text-muted-foreground w-12 font-medium">Asunto:</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Escribe el asunto..."
                className="flex-1 bg-transparent focus:outline-none text-foreground font-semibold"
              />
            </div>
          </div>

          {/* Body Editor with Signature */}
          <div className="flex-1 overflow-y-auto p-4">
            <TiptapEditor
              value={bodyHtml}
              onChange={setBodyHtml}
              minHeight="240px"
              className="border-none shadow-none"
            />
          </div>

          {/* Attached Files List */}
          {attachments.length > 0 && (
            <div className="p-3 border-t bg-muted/20 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1 rounded-lg border bg-background text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <FileIcon className="w-3.5 h-3.5 text-primary" />
                  <span className="max-w-[140px] truncate font-medium">
                    {att.filename}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ({formatBytes(att.size)})
                  </span>
                  <button
                    onClick={() => handleRemoveAttachment(idx)}
                    className="p-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer Controls & Signature selector */}
          <div className="p-3 border-t bg-muted/30 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {sending ? "Enviando..." : "Enviar Correo"}
              </button>

              {/* Attach File Button */}
              <label
                className="p-2 rounded-xl border hover:bg-muted cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
                title="Adjuntar archivos"
              >
                <Paperclip className="w-4 h-4" />
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Quick Signature Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground hidden sm:inline flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" /> Firma:
              </span>
              <select
                value={selectedSignatureId}
                onChange={(e) => handleSignatureChange(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border bg-background text-foreground focus:outline-none cursor-pointer max-w-[160px] truncate font-medium"
              >
                <option value="">Sin firma</option>
                {signatures.map((sig) => (
                  <option key={sig.id} value={sig.id}>
                    {sig.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
