"use client";

import React, { useState, useEffect } from "react";
import { Signature, Identity } from "@/lib/types";
import {
  SignatureBrandingConfig,
  DEFAULT_BRANDING_CONFIG,
  PRESET_COLOR_PALETTES,
  generateProfessionalSignatureHtml,
} from "@/lib/signature-generator";
import {
  Sparkles,
  User,
  Palette,
  Share2,
  Scale,
  Layout,
  Code,
  Check,
  Copy,
  Plus,
  Trash2,
  Upload,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Image as ImageIcon,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SignatureManagerProps {
  signatures: Signature[];
  identities: Identity[];
  onIdentityUpdated?: (identity: Identity) => void;
  onSignaturesUpdated: (signatures: Signature[]) => void;
  onClose: () => void;
}

export function SignatureManager({
  signatures,
  identities,
  onIdentityUpdated,
  onSignaturesUpdated,
  onClose,
}: SignatureManagerProps) {
  const primaryIdentity = identities[0] || {
    name: "Alex Rivera",
    email: "alex@tudominio.com",
    organization: "Mi Empresa",
  };

  const [items, setItems] = useState<Signature[]>(signatures);
  const [selectedId, setSelectedId] = useState<string>(
    signatures.find((s) => s.isDefault)?.id || signatures[0]?.id || ""
  );

  // Active studio tab
  const [activeTab, setActiveTab] = useState<
    "profile" | "branding" | "social" | "layouts" | "legal" | "code"
  >("layouts");

  // Current Branding state
  // Se cargan TODOS los campos guardados, no solo nombre, correo y empresa.
  // Al leer solo tres, el resto arrancaba con los valores de ejemplo y se
  // reescribian encima de los reales cada vez que se guardaba.
  const [branding, setBranding] = useState<SignatureBrandingConfig>({
    ...DEFAULT_BRANDING_CONFIG,
    name: primaryIdentity.name || "",
    email: primaryIdentity.email || "",
    company: primaryIdentity.organization || "",
    title: primaryIdentity.title || "",
    phone: primaryIdentity.phone || "",
    mobile: primaryIdentity.mobile || "",
    website: primaryIdentity.website || "",
    websiteUrl: primaryIdentity.websiteUrl || primaryIdentity.website || "",
    address: primaryIdentity.address || "",
    logoUrl: primaryIdentity.logoUrl || "",
    primaryColor: primaryIdentity.brandColor || DEFAULT_BRANDING_CONFIG.primaryColor,
  });

  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  const [generatedHtml, setGeneratedHtml] = useState<string>("");
  const [customHtml, setCustomHtml] = useState<string>("");
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Re-generate HTML whenever branding changes (unless in manual edit mode)
  useEffect(() => {
    if (!isManualEdit) {
      const html = generateProfessionalSignatureHtml(branding);
      setGeneratedHtml(html);
      setCustomHtml(html);
    }
  }, [branding, isManualEdit]);

  const handleUpdateBranding = (updates: Partial<SignatureBrandingConfig>) => {
    setIsManualEdit(false);
    setBranding((prev) => ({ ...prev, ...updates }));
  };

  /**
   * Sube el logo al servidor y usa su dirección pública.
   *
   * Antes se incrustaba como data URL, en base64 dentro del propio HTML. Eso
   * hacía dos cosas malas: engordaba cada correo enviado con la imagen entera,
   * y sobre todo Outlook y Gmail bloquean o eliminan las imágenes en ese
   * formato. La imagen viajaba pero no se veía, que es justo lo que pasaba.
   */
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoLogo(true);
    try {
      const cuerpo = new FormData();
      cuerpo.append("archivo", file);

      const res = await fetch("/api/media", { method: "POST", body: cuerpo });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "No se pudo subir la imagen");
      }

      handleUpdateBranding({ logoUrl: data.url });
    } catch (err: any) {
      alert(err.message || "No se pudo subir la imagen");
    } finally {
      setSubiendoLogo(false);
      // Se limpia para poder volver a elegir el mismo archivo si hace falta.
      e.target.value = "";
    }
  };

  const handleApplyPalette = (palette: typeof PRESET_COLOR_PALETTES[0]) => {
    handleUpdateBranding({
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      textColor: palette.text,
    });
  };

  const handleCopyHtml = () => {
    const htmlToCopy = isManualEdit ? customHtml : generatedHtml;
    navigator.clipboard.writeText(htmlToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSignature = async () => {
    setSaving(true);
    const finalHtml = isManualEdit ? customHtml : generatedHtml;
    const currentItem = items.find((s) => s.id === selectedId);

    const payload: Partial<Signature> = {
      id: selectedId || undefined,
      name: currentItem?.name || `Firma Corporativa ${branding.layout}`,
      htmlContent: finalHtml,
      isDefault: currentItem?.isDefault ?? true,
      // Al guardarla a mano deja de ser una plantilla automatica, para que un
      // cambio posterior en la identidad no sobrescriba lo que acabas de editar.
      generated: false,
    };

    try {
      // El nombre que ve el destinatario sale de la identidad, no de la firma.
      // Sin este guardado el correo seguia saliendo como "contacto" por mucho
      // que la firma dijera otra cosa. Va primero para que la firma mande.
      const identidad: Partial<Identity> = {
        id: primaryIdentity.id,
        name: branding.name,
        email: branding.email || primaryIdentity.email,
        organization: branding.company,
        title: branding.title,
        phone: branding.phone,
        mobile: branding.mobile,
        website: branding.website,
        websiteUrl: branding.websiteUrl,
        address: branding.address,
        logoUrl: branding.logoUrl,
        brandColor: branding.primaryColor,
        isDefault: true,
      };

      if (identidad.name && identidad.email) {
        const resIdent = await fetch("/api/identities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(identidad),
        });
        const dataIdent = await resIdent.json();
        if (dataIdent.identity) onIdentityUpdated?.(dataIdent.identity);
      }

      const res = await fetch("/api/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.signature) {
        let updatedList: Signature[];
        if (selectedId && items.some((s) => s.id === selectedId)) {
          updatedList = items.map((s) => (s.id === selectedId ? data.signature : s));
        } else {
          updatedList = [...items, data.signature];
          setSelectedId(data.signature.id);
        }
        setItems(updatedList);
        onSignaturesUpdated(updatedList);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error(err);
      alert("Error al guardar la firma.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNew = () => {
    const newId = `sig_${Date.now()}`;
    const initialHtml = generateProfessionalSignatureHtml(branding);
    const newSig: Signature = {
      id: newId,
      userId: primaryIdentity.userId || "user",
      name: `Nueva Firma ${items.length + 1}`,
      htmlContent: initialHtml,
      isDefault: items.length === 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...items, newSig];
    setItems(updated);
    setSelectedId(newId);
  };

  const handleDelete = async (id: string) => {
    if (items.length <= 1) {
      alert("Debes mantener al menos una firma.");
      return;
    }
    if (!confirm("¿Eliminar esta firma?")) return;

    try {
      await fetch(`/api/signatures?id=${id}`, { method: "DELETE" });
      const filtered = items.filter((s) => s.id !== id);
      if (!filtered.some((s) => s.isDefault)) {
        filtered[0].isDefault = true;
      }
      setItems(filtered);
      setSelectedId(filtered[0].id);
      onSignaturesUpdated(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const currentSig = items.find((s) => s.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border shadow-2xl rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-blue-400 text-white flex items-center justify-center font-bold shadow-md shadow-primary/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Estudio Generador de Firmas Corporativas
              </h2>
              <p className="text-xs text-muted-foreground">
                Personaliza logotipo, colores corporativos, redes sociales y layouts profesionales
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Guardado
              </span>
            )}
            <button
              onClick={handleCopyHtml}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border bg-background hover:bg-muted transition-all flex items-center gap-1.5 shadow-sm"
              title="Copiar código HTML generado"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "¡Copiado!" : "Copiar HTML"}</span>
            </button>
            <button
              onClick={handleSaveSignature}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-md shadow-primary/20 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? "Guardando..." : "Guardar Firma"}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Studio Body (Left: Customizer Tools | Right: Live Preview) */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Customization Suite */}
          <div className="w-[460px] border-r flex flex-col bg-background shrink-0 overflow-hidden">
            {/* Signature Selector Pills & Add New */}
            <div className="p-3 border-b bg-muted/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {items.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-lg font-medium transition-all shrink-0 border",
                      s.id === selectedId
                        ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                        : "bg-background text-muted-foreground hover:text-foreground border-border"
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddNew}
                className="p-1.5 rounded-lg border hover:bg-muted text-primary transition-colors shrink-0"
                title="Crear nueva variante de firma"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Studio Navigation Tabs */}
            <div className="grid grid-cols-6 border-b bg-muted/20 text-xs text-muted-foreground font-medium shrink-0">
              <button
                onClick={() => setActiveTab("layouts")}
                className={cn(
                  "py-2.5 flex flex-col items-center gap-1 hover:text-foreground transition-colors border-b-2",
                  activeTab === "layouts"
                    ? "border-primary text-primary font-bold bg-background"
                    : "border-transparent"
                )}
                title="Estilos y Layouts"
              >
                <Layout className="w-4 h-4" />
                <span className="text-[10px]">Layouts</span>
              </button>
              <button
                onClick={() => setActiveTab("branding")}
                className={cn(
                  "py-2.5 flex flex-col items-center gap-1 hover:text-foreground transition-colors border-b-2",
                  activeTab === "branding"
                    ? "border-primary text-primary font-bold bg-background"
                    : "border-transparent"
                )}
                title="Logotipo y Colores"
              >
                <Palette className="w-4 h-4" />
                <span className="text-[10px]">Branding</span>
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={cn(
                  "py-2.5 flex flex-col items-center gap-1 hover:text-foreground transition-colors border-b-2",
                  activeTab === "profile"
                    ? "border-primary text-primary font-bold bg-background"
                    : "border-transparent"
                )}
                title="Datos y Cargo"
              >
                <User className="w-4 h-4" />
                <span className="text-[10px]">Datos</span>
              </button>
              <button
                onClick={() => setActiveTab("social")}
                className={cn(
                  "py-2.5 flex flex-col items-center gap-1 hover:text-foreground transition-colors border-b-2",
                  activeTab === "social"
                    ? "border-primary text-primary font-bold bg-background"
                    : "border-transparent"
                )}
                title="Redes Sociales"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-[10px]">Redes</span>
              </button>
              <button
                onClick={() => setActiveTab("legal")}
                className={cn(
                  "py-2.5 flex flex-col items-center gap-1 hover:text-foreground transition-colors border-b-2",
                  activeTab === "legal"
                    ? "border-primary text-primary font-bold bg-background"
                    : "border-transparent"
                )}
                title="Disclaimers Legales"
              >
                <Scale className="w-4 h-4" />
                <span className="text-[10px]">Legal</span>
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={cn(
                  "py-2.5 flex flex-col items-center gap-1 hover:text-foreground transition-colors border-b-2",
                  activeTab === "code"
                    ? "border-primary text-primary font-bold bg-background"
                    : "border-transparent"
                )}
                title="Código HTML"
              >
                <Code className="w-4 h-4" />
                <span className="text-[10px]">HTML</span>
              </button>
            </div>

            {/* Tool Configuration Panel */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* TAB 1: LAYOUTS */}
              {activeTab === "layouts" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Elige el Estilo de Diseño
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Selecciona una estructura base compatible con todos los clientes de correo.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        id: "executive",
                        title: "Corporativa Ejecutiva (Recomendada)",
                        desc: "División vertical con logo/avatar, badges y detalles pulcros.",
                        badge: "Más Popular",
                      },
                      {
                        id: "modern-card",
                        title: "Tarjeta Moderna con Botón CTA",
                        desc: "Contenedor estilizado con botón de agendar reunión en color de marca.",
                        badge: "Conversión",
                      },
                      {
                        id: "minimal-accent",
                        title: "Minimalista con Acento de Marca",
                        desc: "Línea superior distintiva en color corporativo y formato compacto.",
                        badge: "Minimal",
                      },
                      {
                        id: "horizontal-badge",
                        title: "Horizontal Compacto & Logos",
                        desc: "Logo superior con divisor horizontal y datos alineados.",
                        badge: "Compacto",
                      },
                      {
                        id: "creative-gradient",
                        title: "Insignia Creativa con Fondo",
                        desc: "Fondo suave con borde lateral de marca y tipografía destacada.",
                        badge: "Creativa",
                      },
                    ].map((tmpl) => (
                      <div
                        key={tmpl.id}
                        onClick={() =>
                          handleUpdateBranding({
                            layout: tmpl.id as SignatureBrandingConfig["layout"],
                          })
                        }
                        className={cn(
                          "p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 text-left group",
                          branding.layout === tmpl.id
                            ? "bg-primary/10 border-primary shadow-sm"
                            : "bg-background hover:bg-muted/40"
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                              {tmpl.title}
                            </span>
                            <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.2 rounded-full font-semibold">
                              {tmpl.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {tmpl.desc}
                          </p>
                        </div>
                        {branding.layout === tmpl.id && (
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: BRANDING & COLORS */}
              {activeTab === "branding" && (
                <div className="space-y-5">
                  {/* Logo / Avatar Upload */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground block">
                      Logotipo de Empresa o Avatar
                    </label>
                    <div className="flex items-center gap-3">
                      {branding.logoUrl ? (
                        <img
                          src={branding.logoUrl}
                          alt="Logo Preview"
                          className="w-14 h-14 rounded-xl object-cover border p-0.5 bg-background shadow-sm"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl border border-dashed flex items-center justify-center text-muted-foreground bg-muted/20">
                          <ImageIcon className="w-6 h-6 opacity-40" />
                        </div>
                      )}
                      <div className="flex-1 space-y-1.5">
                        <label className="px-3 py-1.5 rounded-xl border bg-background hover:bg-muted text-xs font-medium cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-sm">
                          <Upload className="w-3.5 h-3.5 text-primary" />
                          <span>
                            {subiendoLogo ? "Subiendo..." : "Subir Imagen / Logo"}
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/gif,image/webp"
                            onChange={handleLogoUpload}
                            disabled={subiendoLogo}
                            className="hidden"
                          />
                        </label>
                        {branding.logoUrl && (
                          <button
                            type="button"
                            onClick={() => handleUpdateBranding({ logoUrl: "" })}
                            className="block text-[11px] text-destructive hover:underline"
                          >
                            Eliminar logo
                          </button>
                        )}
                        <input
                          type="text"
                          value={branding.logoUrl || ""}
                          onChange={(e) => handleUpdateBranding({ logoUrl: e.target.value })}
                          placeholder="O pega una URL pública de imagen..."
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>

                    {/* Logo Shape & Size controls */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                          Forma del Logo
                        </span>
                        <div className="grid grid-cols-3 gap-1 bg-muted/30 p-1 rounded-xl border text-[11px]">
                          {(["circle", "rounded", "square"] as const).map((shape) => (
                            <button
                              key={shape}
                              onClick={() => handleUpdateBranding({ logoShape: shape })}
                              className={cn(
                                "py-1 rounded-lg capitalize transition-colors",
                                branding.logoShape === shape
                                  ? "bg-background text-foreground shadow-sm font-bold"
                                  : "text-muted-foreground"
                              )}
                            >
                              {shape === "circle" ? "Círculo" : shape === "rounded" ? "Borde" : "Cuadro"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                          Tamaño de Logo ({branding.logoSize}px)
                        </span>
                        <input
                          type="range"
                          min="24"
                          max="56"
                          value={branding.logoSize}
                          onChange={(e) =>
                            handleUpdateBranding({ logoSize: Number(e.target.value) })
                          }
                          className="w-full accent-primary mt-2"
                        />
                      </div>
                    </div>

                    {/* Typography Scale Control (Discreción vs Estándar) */}
                    <div className="pt-2">
                      <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                        Escala Tipográfica (Prioridad en el Mensaje)
                      </span>
                      <div className="grid grid-cols-3 gap-1.5 bg-muted/30 p-1 rounded-xl border text-[11px]">
                        {[
                          { id: "compact", label: "Compacta", desc: "Ultra sutil" },
                          { id: "subtle", label: "Sutil (Recomendada)", desc: "Equilibrada" },
                          { id: "standard", label: "Estándar", desc: "Clásica" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              handleUpdateBranding({
                                fontScale: opt.id as SignatureBrandingConfig["fontScale"],
                              })
                            }
                            className={cn(
                              "py-1.5 px-2 rounded-lg text-center transition-all",
                              (branding.fontScale || "subtle") === opt.id
                                ? "bg-background text-foreground shadow-sm font-bold border"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <span className="block font-semibold">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preset Color Palettes */}
                  <div className="space-y-2 pt-2 border-t">
                    <label className="text-xs font-bold text-foreground block">
                      Paletas Corporativas Predefinidas
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESET_COLOR_PALETTES.map((pal) => (
                        <button
                          key={pal.name}
                          onClick={() => handleApplyPalette(pal)}
                          className={cn(
                            "p-2 rounded-xl border text-left text-xs flex items-center justify-between transition-all group",
                            branding.primaryColor === pal.primary
                              ? "border-primary bg-primary/5 font-semibold"
                              : "hover:border-primary/40 bg-background"
                          )}
                        >
                          <span className="truncate text-[11px]">{pal.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className="w-3.5 h-3.5 rounded-full shadow-sm"
                              style={{ backgroundColor: pal.primary }}
                            />
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: pal.secondary }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Hex Color Pickers */}
                  <div className="space-y-2 pt-2 border-t">
                    <label className="text-xs font-bold text-foreground block">
                      Personalizar Colores Exactos (HEX)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] text-muted-foreground block mb-1">
                          Color Primario / Marca
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={branding.primaryColor}
                            onChange={(e) =>
                              handleUpdateBranding({ primaryColor: e.target.value })
                            }
                            className="w-8 h-8 rounded-lg border cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={branding.primaryColor}
                            onChange={(e) =>
                              handleUpdateBranding({ primaryColor: e.target.value })
                            }
                            className="w-full text-xs font-mono px-2 py-1.5 rounded-lg border bg-background"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-muted-foreground block mb-1">
                          Color Secundario / Acento
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={branding.secondaryColor}
                            onChange={(e) =>
                              handleUpdateBranding({ secondaryColor: e.target.value })
                            }
                            className="w-8 h-8 rounded-lg border cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={branding.secondaryColor}
                            onChange={(e) =>
                              handleUpdateBranding({ secondaryColor: e.target.value })
                            }
                            className="w-full text-xs font-mono px-2 py-1.5 rounded-lg border bg-background"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PROFILE & DETAILS */}
              {activeTab === "profile" && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        value={branding.name}
                        onChange={(e) => handleUpdateBranding({ name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">
                        Cargo / Puesto *
                      </label>
                      <input
                        type="text"
                        value={branding.title}
                        onChange={(e) => handleUpdateBranding({ title: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">
                        Empresa *
                      </label>
                      <input
                        type="text"
                        value={branding.company}
                        onChange={(e) => handleUpdateBranding({ company: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">
                        Departamento (Opcional)
                      </label>
                      <input
                        type="text"
                        value={branding.department || ""}
                        onChange={(e) =>
                          handleUpdateBranding({ department: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">
                        Correo Electrónico *
                      </label>
                      <input
                        type="email"
                        value={branding.email}
                        onChange={(e) => handleUpdateBranding({ email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">
                        Sitio Web
                      </label>
                      <input
                        type="text"
                        value={branding.website || ""}
                        onChange={(e) => handleUpdateBranding({ website: e.target.value })}
                        placeholder="tudominio.com"
                        className="w-full px-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">
                        Teléfono Directo
                      </label>
                      <input
                        type="text"
                        value={branding.phone || ""}
                        onChange={(e) => handleUpdateBranding({ phone: e.target.value })}
                        placeholder="+56 9 1234 5678"
                        className="w-full px-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">
                        Móvil / Celular
                      </label>
                      <input
                        type="text"
                        value={branding.mobile || ""}
                        onChange={(e) => handleUpdateBranding({ mobile: e.target.value })}
                        placeholder="+56 2 2987 6543"
                        className="w-full px-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-muted-foreground block mb-1">
                      Dirección Física (Oficina)
                    </label>
                    <input
                      type="text"
                      value={branding.address || ""}
                      onChange={(e) => handleUpdateBranding({ address: e.target.value })}
                      placeholder="Av. Providencia 1200, Santiago"
                      className="w-full px-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: SOCIAL NETWORKS */}
              {activeTab === "social" && (
                <div className="space-y-3 text-xs">
                  <div>
                    <h3 className="font-bold text-foreground mb-1">
                      Enlaces a Redes Sociales
                    </h3>
                    <p className="text-muted-foreground text-[11px]">
                      Se generarán insignias optimizadas y compatibles con Outlook, Gmail y Apple Mail.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <span className="text-muted-foreground block mb-1 font-medium">LinkedIn</span>
                      <input
                        type="text"
                        value={branding.linkedin || ""}
                        onChange={(e) => handleUpdateBranding({ linkedin: e.target.value })}
                        placeholder="https://linkedin.com/in/tu-perfil"
                        className="w-full px-3 py-1.5 rounded-xl border bg-background"
                      />
                    </div>

                    <div>
                      <span className="text-muted-foreground block mb-1 font-medium">X / Twitter</span>
                      <input
                        type="text"
                        value={branding.twitter || ""}
                        onChange={(e) => handleUpdateBranding({ twitter: e.target.value })}
                        placeholder="https://x.com/tu-usuario"
                        className="w-full px-3 py-1.5 rounded-xl border bg-background"
                      />
                    </div>

                    <div>
                      <span className="text-muted-foreground block mb-1 font-medium">WhatsApp Directo</span>
                      <input
                        type="text"
                        value={branding.whatsapp || ""}
                        onChange={(e) => handleUpdateBranding({ whatsapp: e.target.value })}
                        placeholder="https://wa.me/56912345678"
                        className="w-full px-3 py-1.5 rounded-xl border bg-background"
                      />
                    </div>

                    <div>
                      <span className="text-muted-foreground block mb-1 font-medium">GitHub</span>
                      <input
                        type="text"
                        value={branding.github || ""}
                        onChange={(e) => handleUpdateBranding({ github: e.target.value })}
                        placeholder="https://github.com/tu-usuario"
                        className="w-full px-3 py-1.5 rounded-xl border bg-background"
                      />
                    </div>

                    <div>
                      <span className="text-muted-foreground block mb-1 font-medium">Instagram</span>
                      <input
                        type="text"
                        value={branding.instagram || ""}
                        onChange={(e) => handleUpdateBranding({ instagram: e.target.value })}
                        placeholder="https://instagram.com/tu-empresa"
                        className="w-full px-3 py-1.5 rounded-xl border bg-background"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: LEGAL & EXTRAS */}
              {activeTab === "legal" && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-muted/20 border space-y-2">
                    <label className="flex items-center gap-2 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={branding.showDisclaimer}
                        onChange={(e) =>
                          handleUpdateBranding({ showDisclaimer: e.target.checked })
                        }
                        className="rounded text-primary focus:ring-primary h-4 w-4"
                      />
                      Incluir Aviso de Confidencialidad
                    </label>
                    {branding.showDisclaimer && (
                      <textarea
                        value={branding.disclaimerText}
                        onChange={(e) =>
                          handleUpdateBranding({ disclaimerText: e.target.value })
                        }
                        rows={3}
                        className="w-full p-2.5 rounded-xl border bg-background text-[11px] leading-relaxed resize-none focus:outline-none"
                      />
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-muted/20 border space-y-2">
                    <label className="flex items-center gap-2 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={branding.showEcoNote}
                        onChange={(e) =>
                          handleUpdateBranding({ showEcoNote: e.target.checked })
                        }
                        className="rounded text-primary focus:ring-primary h-4 w-4"
                      />
                      Incluir Mensaje Ecológico (Green Footer)
                    </label>
                    {branding.showEcoNote && (
                      <input
                        type="text"
                        value={branding.ecoNoteText}
                        onChange={(e) =>
                          handleUpdateBranding({ ecoNoteText: e.target.value })
                        }
                        className="w-full p-2.5 rounded-xl border bg-background text-[11px]"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: HTML CODE */}
              {activeTab === "code" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Código HTML de la Firma
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {isManualEdit ? "Modo edición manual activo" : "Generado automáticamente"}
                    </span>
                  </div>
                  <textarea
                    value={customHtml}
                    onChange={(e) => {
                      setIsManualEdit(true);
                      setCustomHtml(e.target.value);
                    }}
                    rows={12}
                    className="w-full p-3 rounded-xl border bg-muted/20 font-mono text-[11px] leading-relaxed text-foreground focus:outline-none resize-none"
                  />
                  {isManualEdit && (
                    <button
                      onClick={() => {
                        setIsManualEdit(false);
                        const fresh = generateProfessionalSignatureHtml(branding);
                        setGeneratedHtml(fresh);
                        setCustomHtml(fresh);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Restaurar al generador automático
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Live Interactive Preview Studio */}
          <div className="flex-1 flex flex-col bg-muted/10 overflow-hidden">
            {/* Preview Toolbar */}
            <div className="p-4 border-b flex items-center justify-between bg-card/60 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  Previsualización en Tiempo Real
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                  HTML Compatible
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Switch Background theme */}
                <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setPreviewTheme("light")}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      previewTheme === "light"
                        ? "bg-background text-foreground shadow-sm font-bold"
                        : "text-muted-foreground"
                    )}
                    title="Fondo Claro"
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  </button>
                  <button
                    onClick={() => setPreviewTheme("dark")}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      previewTheme === "dark"
                        ? "bg-background text-foreground shadow-sm font-bold"
                        : "text-muted-foreground"
                    )}
                    title="Fondo Oscuro"
                  >
                    <Moon className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                </div>

                {currentSig && (
                  <button
                    onClick={() => handleDelete(currentSig.id)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Eliminar esta firma"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Canvas Preview Area */}
            <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
              <div
                className={cn(
                  "w-full max-w-2xl rounded-3xl border p-8 shadow-xl transition-all",
                  previewTheme === "dark"
                    ? "bg-zinc-950 text-white border-zinc-800"
                    : "bg-white text-slate-900 border-slate-200"
                )}
              >
                {/* Simulated Email Message Top Header */}
                <div className="border-b pb-4 mb-6 text-xs text-muted-foreground space-y-1 opacity-70 select-none">
                  <div className="flex items-center justify-between">
                    <span><strong>Para:</strong> cliente.corporativo@empresa.com</span>
                    <span>Hoy, 14:32</span>
                  </div>
                  <div><strong>Asunto:</strong> Re: Propuesta comercial y detalles del proyecto</div>
                </div>

                {/* Simulated Email Body */}
                <div className="text-xs leading-relaxed space-y-2 mb-6 opacity-80 select-none">
                  <p>Estimado cliente,</p>
                  <p>
                    Adjunto los detalles acordados en la última reunión junto con el desglose técnico y las fechas de entrega.
                  </p>
                  <p>Quedo a tu total disposición para coordinar los siguientes pasos.</p>
                </div>

                {/* The Generated Signature Rendered Live */}
                <div
                  className="signature-live-canvas"
                  dangerouslySetInnerHTML={{
                    __html: isManualEdit ? customHtml : generatedHtml,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
