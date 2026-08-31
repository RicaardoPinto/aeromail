import DOMPurify from "isomorphic-dompurify";

export interface SanitizationResult {
  sanitizedHtml: string;
  hasRemoteImages: boolean;
  blockedImagesCount: number;
}

/**
 * Sanitizes email HTML content according to Roundcube-level security standards.
 * Strips executable scripts, dangerous tags, unsecure protocols, and manages remote images.
 */
export function sanitizeEmailHtml(
  rawHtml: string,
  allowRemoteImages: boolean = false
): SanitizationResult {
  if (!rawHtml) {
    return { sanitizedHtml: "", hasRemoteImages: false, blockedImagesCount: 0 };
  }

  let hasRemoteImages = false;
  let blockedImagesCount = 0;

  // First pass: DOMPurify strict configuration
  const clean = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      "a", "abbr", "address", "article", "aside", "b", "bdi", "bdo", "blockquote",
      "br", "caption", "cite", "code", "col", "colgroup", "dd", "del", "details",
      "dfn", "div", "dl", "dt", "em", "figcaption", "figure", "footer", "h1", "h2",
      "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "i", "img", "ins", "kbd",
      "li", "main", "mark", "nav", "ol", "p", "pre", "q", "rp", "rt", "ruby", "s",
      "samp", "section", "small", "span", "strong", "sub", "summary", "sup",
      "table", "tbody", "td", "tfoot", "th", "thead", "time", "tr", "u", "ul",
      "var", "wbr"
    ],
    ALLOWED_ATTR: [
      "align", "alt", "bgcolor", "border", "cellpadding", "cellspacing", "cite",
      "class", "color", "colspan", "dir", "face", "height", "href", "hspace",
      "id", "lang", "nowrap", "rel", "rowspan", "size", "src", "style", "target",
      "title", "type", "valign", "vspace", "width", "data-cid"
    ],
    ALLOW_DATA_ATTR: true,
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["script", "iframe", "frame", "object", "embed", "applet", "form", "base", "svg", "math"],
    FORBID_ATTR: ["onload", "onerror", "onclick", "onmouseover", "onfocus", "formaction"],
    USE_PROFILES: { html: true },
  });

  // Strip dangerous CSS properties that can break the UI layout or exfiltrate data
  let processedHtml = clean.replace(/style=["']([^"']*?)["']/gi, (match, styleContent) => {
    let safeStyle = styleContent
      // Remove expressions and bindings
      .replace(/expression\s*\(.*?\)/gi, "")
      .replace(/behavior\s*:[^;]+/gi, "")
      .replace(/-moz-binding\s*:[^;]+/gi, "")
      .replace(/@import[^;]+/gi, "")
      // Prevent overlay hijacking (position fixed/absolute with high z-index)
      .replace(/position\s*:\s*(fixed|absolute)/gi, "position: relative")
      .replace(/z-index\s*:\s*[0-9]+/gi, "z-index: 1");

    return `style="${safeStyle}"`;
  });

  // Ensure all links open in new tab with noopener noreferrer
  processedHtml = processedHtml.replace(/<a(\s*[^>]*?)>/gi, (match, attrs = "") => {
    let cleanAttrs = attrs.trim();
    if (!/target=/i.test(cleanAttrs)) {
      cleanAttrs += ' target="_blank"';
    } else {
      cleanAttrs = cleanAttrs.replace(/target=["'][^"']*["']/i, 'target="_blank"');
    }
    if (!/rel=/i.test(cleanAttrs)) {
      cleanAttrs += ' rel="noopener noreferrer"';
    } else {
      cleanAttrs = cleanAttrs.replace(/rel=["'][^"']*["']/i, 'rel="noopener noreferrer"');
    }
    return `<a ${cleanAttrs.trim()}>`;
  });

  // Remote images and tracking pixel handling
  const remoteImgRegex = /<img\s+([^>]*?)src=["'](https?:\/\/[^"']+)["']([^>]*?)>/gi;

  if (remoteImgRegex.test(processedHtml)) {
    hasRemoteImages = true;
  }

  if (!allowRemoteImages) {
    processedHtml = processedHtml.replace(
      /<img\s+([^>]*?)src=["'](https?:\/\/[^"']+)["']([^>]*?)>/gi,
      (match, before, src, after) => {
        blockedImagesCount++;
        return `<img ${before}data-blocked-src="${src}" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'><rect width='18' height='18' x='3' y='3' rx='2'/><circle cx='8.5' cy='8.5' r='1.5'/><path d='m21 15-5-5L5 21'/></svg>" style="border: 1px dashed #ccc; padding: 4px; max-width: 100px; display: inline-block;" title="Imagen remota bloqueada por seguridad" ${after}>`;
      }
    );

    // Also block CSS background-image urls
    processedHtml = processedHtml.replace(
      /style=["']([^"']*?)background(-image)?:\s*url\(['"]?(https?:\/\/[^'"]+)['"]?\)([^"']*?)["']/gi,
      (match, pre, bg, url, post) => {
        hasRemoteImages = true;
        blockedImagesCount++;
        return `style="${pre}/* remote background blocked */${post}"`;
      }
    );
  }

  return {
    sanitizedHtml: processedHtml,
    hasRemoteImages,
    blockedImagesCount,
  };
}

/**
 * Replace placeholders in signature templates like {{name}}, {{role}}, {{phone}}, etc.
 */
export function compileSignature(
  templateHtml: string,
  variables: Record<string, string>
): string {
  let result = templateHtml;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
    result = result.replace(regex, value || "");
  }
  return result;
}
