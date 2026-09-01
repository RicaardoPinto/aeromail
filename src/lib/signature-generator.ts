export interface SignatureBrandingConfig {
  // Identity details
  name: string;
  title: string;
  department?: string;
  company: string;
  email: string;
  phone?: string;
  mobile?: string;
  website?: string;
  websiteUrl?: string;
  address?: string;

  // Branding & Visuals
  logoUrl?: string;
  logoShape: "circle" | "rounded" | "square";
  logoSize: number; // in pixels, e.g. 38
  primaryColor: string; // HEX e.g. #2563eb
  secondaryColor: string; // HEX e.g. #64748b
  textColor: string; // HEX e.g. #1e293b
  fontScale: "compact" | "subtle" | "standard";

  // Social Links
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  github?: string;
  youtube?: string;
  facebook?: string;
  whatsapp?: string;

  // Legal & Extras
  showDisclaimer: boolean;
  disclaimerText: string;
  showEcoNote: boolean;
  ecoNoteText: string;
  bannerImageUrl?: string;
  bannerLinkUrl?: string;

  // Layout Style
  layout: "executive" | "modern-card" | "minimal-accent" | "horizontal-badge" | "creative-gradient";
}

/**
 * Tipografia unificada: Calibri con Carlito como equivalente metrico en Linux
 * y Segoe UI / Candara como respaldo en clientes que no traen ninguna de las dos.
 */
export const FONT_STACK =
  "Calibri, Carlito, 'Segoe UI', Candara, 'Trebuchet MS', sans-serif";

/**
 * Paleta corporativa. Los tres tonos de texto superan 4.5:1 sobre blanco, que
 * es el minimo para lectura comoda; los dos ultimos son solo superficie.
 */
export const BRAND = {
  /**
   * El morado es color de ACENTO: enlaces, cabeceras de tabla, detalles de la
   * firma. El texto va en gris neutro.
   *
   * Antes los tres tonos de texto se derivaban del morado y el correo entero
   * salia teñido. Un color de marca aplicado al cuerpo del texto no se lee como
   * identidad, se lee como error de impresion.
   */
  primary: "#5C5498",
  ink: "#1F2328",
  muted: "#57606A",
  soft: "#656D76",
  hairline: "#E5E7EB",
  /** Fondo tenue, unico sitio donde la marca toca una superficie amplia. */
  tint: "#F5F4FA",
};

export const PRESET_COLOR_PALETTES = [
  { name: "Corporativo LyF", primary: BRAND.primary, secondary: BRAND.muted, text: BRAND.ink },
  { name: "Azul Corporativo", primary: "#2563eb", secondary: "#64748b", text: "#0f172a" },
  { name: "Grafito & Pizarra", primary: "#334155", secondary: "#64748b", text: "#0f172a" },
  { name: "Esmeralda Sutil", primary: "#059669", secondary: "#64748b", text: "#064e3b" },
  { name: "Índigo Ejecutivo", primary: "#4f46e5", secondary: "#64748b", text: "#1e293b" },
  { name: "Púrpura Elegante", primary: "#7c3aed", secondary: "#64748b", text: "#1e1b4b" },
  { name: "Naranja Cálido", primary: "#ea580c", secondary: "#78716c", text: "#1c1917" },
  { name: "Carmesí Clásico", primary: "#b91c1c", secondary: "#71717a", text: "#18181b" },
];

/**
 * Los campos personales van VACIOS a proposito.
 *
 * Antes traian un ejemplo ("Director de Operaciones", "tudominio.com", un
 * telefono inventado) y el estudio arrancaba desde ahi, asi que esos valores
 * acababan guardados en la identidad y saliendo en correos reales. Un campo en
 * blanco simplemente no se dibuja; uno con un ejemplo miente.
 */
export const DEFAULT_BRANDING_CONFIG: SignatureBrandingConfig = {
  name: "",
  title: "",
  department: "",
  company: "",
  email: "",
  phone: "",
  mobile: "",
  website: "",
  websiteUrl: "",
  address: "",

  logoUrl: "",
  logoShape: "circle",
  logoSize: 38,
  primaryColor: BRAND.primary,
  secondaryColor: BRAND.muted,
  textColor: BRAND.ink,
  fontScale: "subtle",

  // Vacias: si no las rellenas, no aparecen insignias sueltas apuntando a
  // paginas que no son tuyas.
  linkedin: "",
  twitter: "",
  github: "",
  whatsapp: "",

  showDisclaimer: true,
  disclaimerText:
    "Este mensaje es confidencial y para uso exclusivo del destinatario.",
  showEcoNote: false,
  ecoNoteText: "Por favor considera el medio ambiente antes de imprimir este correo.",
  layout: "executive",
};

/**
 * Scale resolver for discreet, elegant typography
 */
function getTypographyScale(scale: "compact" | "subtle" | "standard") {
  if (scale === "compact") {
    return {
      name: "12px",
      title: "10.5px",
      company: "10px",
      contact: "9.5px",
      disclaimer: "8px",
      socialSize: "15px",
      socialFont: "8px",
    };
  }
  if (scale === "standard") {
    return {
      name: "14px",
      title: "12px",
      company: "11.5px",
      contact: "11px",
      disclaimer: "9px",
      socialSize: "18px",
      socialFont: "9.5px",
    };
  }
  // Default: subtle
  return {
    name: "13px",
    title: "11px",
    company: "10.5px",
    contact: "10px",
    disclaimer: "8.5px",
    socialSize: "16px",
    socialFont: "8.5px",
  };
}

/**
 * Builds email-client compatible SVG social media badges
 */
function renderSocialIcons(config: SignatureBrandingConfig): string {
  const typo = getTypographyScale(config.fontScale || "subtle");
  const links: { url?: string; name: string; iconBg: string; text: string }[] = [
    { url: config.linkedin, name: "LinkedIn", iconBg: "#0a66c2", text: "in" },
    { url: config.twitter, name: "X (Twitter)", iconBg: "#000000", text: "𝕏" },
    { url: config.whatsapp, name: "WhatsApp", iconBg: "#25d366", text: "wa" },
    { url: config.github, name: "GitHub", iconBg: "#24292e", text: "gh" },
    { url: config.instagram, name: "Instagram", iconBg: "#e4405f", text: "ig" },
    { url: config.youtube, name: "YouTube", iconBg: "#ff0000", text: "yt" },
    { url: config.facebook, name: "Facebook", iconBg: "#1877f2", text: "fb" },
  ].filter((item) => Boolean(item.url));

  if (links.length === 0) return "";

  const iconTags = links
    .map(
      (item) => `
    <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; text-decoration: none; margin-right: 4px;">
      <span style="display: inline-block; width: ${typo.socialSize}; height: ${typo.socialSize}; line-height: ${typo.socialSize}; border-radius: 3px; background-color: ${config.primaryColor}; color: #ffffff; text-align: center; font-size: ${typo.socialFont}; font-weight: bold; font-family: monospace;">
        ${item.text}
      </span>
    </a>
  `
    )
    .join("");

  return `<div style="margin-top: 5px;">${iconTags}</div>`;
}

/**
 * Renders avatar or company logo with safe shape clipping
 */
function renderLogoOrAvatar(config: SignatureBrandingConfig): string {
  const borderRadius =
    config.logoShape === "circle"
      ? "50%"
      : config.logoShape === "rounded"
      ? "6px"
      : "0px";

  const size = config.logoSize || 38;

  if (config.logoUrl) {
    return `
      <img
        src="${config.logoUrl}"
        alt="${config.company || config.name}"
        width="${size}"
        height="${size}"
        style="width: ${size}px; height: ${size}px; border-radius: ${borderRadius}; display: block; object-fit: cover;"
      />
    `;
  }

  // Fallback Initials badge
  const initials = (config.name || "A")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return `
    <div style="width: ${size}px; height: ${size}px; border-radius: ${borderRadius}; background-color: ${config.primaryColor}; color: #ffffff; text-align: center; line-height: ${size}px; font-weight: 700; font-size: ${Math.round(
    size * 0.38
  )}px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      ${initials}
    </div>
  `;
}

/**
 * Generates email-ready cross-client HTML for any chosen layout
 */
export function generateProfessionalSignatureHtml(config: SignatureBrandingConfig): string {
  const fontStack = FONT_STACK;
  const typo = getTypographyScale(config.fontScale || "subtle");
  const logoHtml = renderLogoOrAvatar(config);
  const socialHtml = renderSocialIcons(config);

  const disclaimerHtml = config.showDisclaimer && config.disclaimerText
    ? `
    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid ${BRAND.hairline}; font-size: ${typo.disclaimer}; line-height: 1.3; color: ${BRAND.soft}; font-style: italic; font-family: ${fontStack};">
      ${config.disclaimerText}
    </div>
  `
    : "";

  const ecoHtml = config.showEcoNote && config.ecoNoteText
    ? `
    <div style="margin-top: 4px; font-size: ${typo.disclaimer}; color: #15803d; font-family: ${fontStack};">
      ${config.ecoNoteText}
    </div>
  `
    : "";

  const bannerHtml = config.bannerImageUrl
    ? `
    <div style="margin-top: 8px;">
      <a href="${config.bannerLinkUrl || '#'}" target="_blank" style="text-decoration: none;">
        <img src="${config.bannerImageUrl}" alt="Banner" style="max-width: 100%; border-radius: 4px; display: block;" />
      </a>
    </div>
  `
    : "";

  // -------------------------------------------------------------
  // LAYOUT 1: EXECUTIVE CORPORATE (2-Column Vertical Accent Split)
  // -------------------------------------------------------------
  if (config.layout === "executive") {
    return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${fontStack}; font-size: ${typo.contact}; line-height: 1.35; color: ${config.textColor}; margin-top: 10px;">
  <tbody>
    <tr>
      <!-- Column Left: Avatar / Logo -->
      <td style="padding-right: 12px; vertical-align: middle; border-right: 1.5px solid ${config.primaryColor};">
        ${logoHtml}
      </td>
      <!-- Column Right: Details -->
      <td style="padding-left: 12px; vertical-align: top;">
        <div style="font-size: ${typo.name}; font-weight: 700; color: ${config.textColor}; line-height: 1.2;">${config.name}</div>
        <div style="font-size: ${typo.title}; font-weight: 600; color: ${config.primaryColor}; margin-top: 1px;">
          ${config.title} ${config.department ? `&bull; ${config.department}` : ""}
        </div>
        <div style="font-size: ${typo.company}; font-weight: 500; color: ${config.secondaryColor}; margin-bottom: 4px;">
          ${config.company}
        </div>

        <div style="font-size: ${typo.contact}; color: ${config.secondaryColor}; line-height: 1.4;">
          ${config.email ? `<span>✉️ <a href="mailto:${config.email}" style="color: ${config.secondaryColor}; text-decoration: none;">${config.email}</a></span>` : ""}
          ${config.phone ? `<span style="margin: 0 4px;">|</span><span>📞 ${config.phone}</span>` : ""}
          ${config.mobile ? `<span style="margin: 0 4px;">|</span><span>📱 ${config.mobile}</span>` : ""}
        </div>

        ${config.website ? `
        <div style="font-size: ${typo.contact}; color: ${config.secondaryColor}; margin-top: 1px;">
          <span>🌐 <a href="${config.websiteUrl || `https://${config.website}`}" target="_blank" style="color: ${config.primaryColor}; text-decoration: none; font-weight: 500;">${config.website}</a></span>
          ${config.address ? `<span style="margin: 0 4px;">&bull;</span><span>📍 ${config.address}</span>` : ""}
        </div>` : ""}

        ${socialHtml}
      </td>
    </tr>
    ${disclaimerHtml || ecoHtml || bannerHtml ? `
    <tr>
      <td colspan="2">
        ${bannerHtml}
        ${disclaimerHtml}
        ${ecoHtml}
      </td>
    </tr>` : ""}
  </tbody>
</table>
`.trim();
  }

  // -------------------------------------------------------------
  // LAYOUT 2: MODERN CARD (Contenedor Estilizado Compacto)
  // -------------------------------------------------------------
  if (config.layout === "modern-card") {
    return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${fontStack}; font-size: ${typo.contact}; line-height: 1.35; color: ${config.textColor}; margin-top: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid ${config.primaryColor}; border-radius: 6px; padding: 10px 12px; max-width: 460px;">
  <tbody>
    <tr>
      <td style="padding-right: 10px; vertical-align: top;">
        ${logoHtml}
      </td>
      <td style="vertical-align: top;">
        <div style="font-size: ${typo.name}; font-weight: 700; color: ${config.textColor}; line-height: 1.2;">${config.name}</div>
        <div style="font-size: ${typo.title}; font-weight: 600; color: ${config.primaryColor};">${config.title}</div>
        <div style="font-size: ${typo.company}; color: ${config.secondaryColor}; margin-bottom: 4px;">${config.company}</div>

        <div style="font-size: ${typo.contact}; color: ${config.secondaryColor};">
          <span>📧 <a href="mailto:${config.email}" style="color: ${config.primaryColor}; text-decoration: none;">${config.email}</a></span>
          ${config.phone ? `<span style="margin: 0 4px;">•</span><span>📞 ${config.phone}</span>` : ""}
          ${config.website ? `<span style="margin: 0 4px;">•</span><span>🌐 <a href="${config.websiteUrl || `https://${config.website}`}" target="_blank" style="color: ${config.primaryColor}; text-decoration: none;">${config.website}</a></span>` : ""}
        </div>

        ${socialHtml}
      </td>
    </tr>
    ${disclaimerHtml || ecoHtml ? `
    <tr>
      <td colspan="2">
        ${disclaimerHtml}
        ${ecoHtml}
      </td>
    </tr>` : ""}
  </tbody>
</table>
`.trim();
  }

  // -------------------------------------------------------------
  // LAYOUT 3: MINIMAL ACCENT (Minimalista con Línea Superior y Acentos)
  // -------------------------------------------------------------
  if (config.layout === "minimal-accent") {
    return `
<div style="font-family: ${fontStack}; font-size: ${typo.contact}; line-height: 1.35; color: ${config.textColor}; margin-top: 10px; padding-top: 8px; border-top: 1.5px solid ${config.primaryColor}; max-width: 440px;">
  <div style="font-size: ${typo.name}; font-weight: 700; color: ${config.textColor};">${config.name}</div>
  <div style="font-size: ${typo.title}; color: ${config.primaryColor}; font-weight: 600;">
    ${config.title} &mdash; <span style="color: ${config.secondaryColor}; font-weight: 500;">${config.company}</span>
  </div>
  <div style="font-size: ${typo.contact}; color: ${config.secondaryColor}; margin-top: 3px;">
    <a href="mailto:${config.email}" style="color: ${config.primaryColor}; text-decoration: none;">${config.email}</a>
    ${config.phone ? ` &bull; <span>${config.phone}</span>` : ""}
    ${config.website ? ` &bull; <a href="${config.websiteUrl || `https://${config.website}`}" target="_blank" style="color: ${config.primaryColor}; text-decoration: none;">${config.website}</a>` : ""}
  </div>
  ${socialHtml}
  ${disclaimerHtml}
</div>
`.trim();
  }

  // -------------------------------------------------------------
  // LAYOUT 4: HORIZONTAL BADGE (Banner Superior & Badges)
  // -------------------------------------------------------------
  if (config.layout === "horizontal-badge") {
    return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${fontStack}; font-size: ${typo.contact}; line-height: 1.35; color: ${config.textColor}; margin-top: 10px;">
  <tbody>
    <tr>
      <td style="padding-bottom: 6px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-right: 10px;">${logoHtml}</td>
            <td>
              <div style="font-size: ${typo.name}; font-weight: 700; color: ${config.textColor}; line-height: 1.2;">${config.name}</div>
              <div style="font-size: ${typo.title}; font-weight: 600; color: ${config.primaryColor};">${config.title} | ${config.company}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: ${typo.contact}; color: ${config.secondaryColor};">
        <span>✉️ <a href="mailto:${config.email}" style="color: ${config.primaryColor}; text-decoration: none;">${config.email}</a></span>
        ${config.phone ? `<span style="margin: 0 4px;">|</span><span>📞 ${config.phone}</span>` : ""}
        ${config.website ? `<span style="margin: 0 4px;">|</span><span>🌐 <a href="${config.websiteUrl || `https://${config.website}`}" target="_blank" style="color: ${config.primaryColor}; text-decoration: none;">${config.website}</a></span>` : ""}
      </td>
    </tr>
    <tr>
      <td>
        ${socialHtml}
        ${disclaimerHtml}
      </td>
    </tr>
  </tbody>
</table>
`.trim();
  }

  // -------------------------------------------------------------
  // LAYOUT 5: CREATIVE GRADIENT (Insignia Creativa Sutil)
  // -------------------------------------------------------------
  return `
<div style="font-family: ${fontStack}; font-size: ${typo.contact}; color: ${config.textColor}; margin-top: 10px; padding: 10px 12px; background: #f8fafc; border-left: 3px solid ${config.primaryColor}; border-radius: 4px; max-width: 450px;">
  <table cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding-right: 10px; vertical-align: top;">${logoHtml}</td>
      <td style="vertical-align: top;">
        <div style="font-weight: 700; font-size: ${typo.name}; color: ${config.textColor}; line-height: 1.2;">${config.name}</div>
        <div style="font-size: ${typo.title}; color: ${config.primaryColor}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">
          ${config.title} &mdash; ${config.company}
        </div>
        <div style="font-size: ${typo.contact}; color: ${config.secondaryColor};">
          <span>✉️ <a href="mailto:${config.email}" style="color: ${config.primaryColor}; text-decoration: none;">${config.email}</a></span>
          ${config.phone ? ` &bull; <span>📱 ${config.phone}</span>` : ""}
          ${config.website ? ` &bull; <span>🔗 <a href="${config.websiteUrl || `https://${config.website}`}" target="_blank" style="color: ${config.primaryColor}; text-decoration: none;">${config.website}</a></span>` : ""}
        </div>
        ${socialHtml}
      </td>
    </tr>
  </table>
  ${disclaimerHtml}
</div>
`.trim();
}
