import { JSDOM } from "jsdom";
import { BRAND, FONT_STACK } from "./signature-generator";

export interface OpcionesDeFormato {
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
}

const PREDETERMINADO: Required<OpcionesDeFormato> = {
  fontFamily: FONT_STACK,
  fontSize: 14,
  lineHeight: 1.4,
};

/**
 * Prepara el HTML del redactor para enviarlo por correo.
 *
 * Los clientes de correo ignoran las hojas de estilo y aplican sus propios
 * valores por defecto, que son los de un documento de 1995: parrafos con un
 * margen de 1em arriba y abajo, enlaces azul chillon y tablas sin bordes. Por
 * eso un mensaje que se ve bien en el redactor llega plano y desparramado.
 *
 * La unica forma fiable de evitarlo es escribir los estilos en linea, elemento
 * por elemento. Se hace con un analizador real y no con expresiones regulares
 * porque el contenido puede venir pegado desde cualquier sitio.
 *
 * La firma se deja intacta: trae sus propios estilos y es un bloque cerrado.
 */
export function prepararHtmlDeCorreo(
  html: string,
  opciones: OpcionesDeFormato = {}
): string {
  if (!html || !html.trim()) return html;

  const { fontFamily, fontSize, lineHeight } = { ...PREDETERMINADO, ...opciones };

  try {
    const dom = new JSDOM("<body>" + html + "</body>");
    const doc = dom.window.document;
    const body = doc.body;

    const enLaFirma = (el: Element) => !!el.closest("[data-signature]");

    const estilar = (el: Element, estilo: string) => {
      const previo = el.getAttribute("style");
      el.setAttribute("style", previo ? previo + "; " + estilo : estilo);
    };

    // Separacion proporcional al cuerpo: a 14px son 10px, suficiente para
    // distinguir parrafos sin que el texto quede desperdigado.
    const separacion = Math.round(fontSize * 0.7);

    body.querySelectorAll("p").forEach((p) => {
      if (enLaFirma(p)) return;
      estilar(p, "margin: 0 0 " + separacion + "px 0; line-height: " + lineHeight + ";");
    });

    const escalaTitulos: Record<string, number> = { H1: 20, H2: 17, H3: 15 };
    body.querySelectorAll("h1, h2, h3").forEach((h) => {
      if (enLaFirma(h)) return;
      const tam = escalaTitulos[h.tagName] || 15;
      estilar(
        h,
        "margin: " + Math.round(separacion * 1.6) + "px 0 " + separacion +
          "px 0; font-size: " + tam + "px; line-height: 1.25; font-weight: 600; color: " +
          BRAND.ink + ";"
      );
    });

    body.querySelectorAll("ul, ol").forEach((lista) => {
      if (enLaFirma(lista)) return;
      estilar(lista, "margin: 0 0 " + separacion + "px 0; padding-left: 22px;");
    });

    body.querySelectorAll("li").forEach((li) => {
      if (enLaFirma(li)) return;
      estilar(li, "margin: 0 0 4px 0; line-height: " + lineHeight + ";");
    });

    body.querySelectorAll("a").forEach((a) => {
      if (enLaFirma(a)) return;
      estilar(a, "color: " + BRAND.primary + "; text-decoration: underline;");
    });

    body.querySelectorAll("blockquote").forEach((cita) => {
      if (enLaFirma(cita)) return;
      estilar(
        cita,
        "margin: 0 0 " + separacion + "px 0; padding: 2px 0 2px 12px; border-left: 3px solid " +
          BRAND.hairline + "; color: " + BRAND.muted + ";"
      );
    });

    // Tablas con tono corporativo. Los atributos antiguos siguen haciendo falta
    // porque algunos clientes los respetan antes que el CSS en linea.
    body.querySelectorAll("table").forEach((tabla) => {
      if (enLaFirma(tabla)) return;
      tabla.setAttribute("cellpadding", "0");
      tabla.setAttribute("cellspacing", "0");
      tabla.setAttribute("border", "0");
      estilar(
        tabla,
        "border-collapse: collapse; width: 100%; margin: 0 0 " + separacion +
          "px 0; font-size: " + (fontSize - 1) + "px;"
      );
    });

    body.querySelectorAll("th").forEach((th) => {
      if (enLaFirma(th)) return;
      estilar(
        th,
        "background-color: " + BRAND.tint + "; color: " + BRAND.primary +
          "; font-weight: 600; text-align: left; padding: 8px 10px; border-bottom: 2px solid " +
          BRAND.primary + ";"
      );
    });

    body.querySelectorAll("td").forEach((td) => {
      if (enLaFirma(td)) return;
      estilar(
        td,
        "padding: 7px 10px; border-bottom: 1px solid " + BRAND.hairline +
          "; vertical-align: top;"
      );
    });

    const contenedor = doc.createElement("div");
    contenedor.setAttribute(
      "style",
      "font-family: " + fontFamily + "; font-size: " + fontSize +
        "px; line-height: " + lineHeight + "; color: " + BRAND.ink + ";"
    );
    while (body.firstChild) contenedor.appendChild(body.firstChild);
    body.appendChild(contenedor);

    return body.innerHTML;
  } catch (err) {
    // Ante cualquier fallo se envia el original: un correo con formato pobre es
    // mucho mejor que un correo que no sale.
    console.error("No se pudo dar formato al correo, se envia sin procesar:", err);
    return html;
  }
}
