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

const SALTO = String.fromCharCode(10);
const MARCA_YA_FORMATEADO = "data-aeromail-formato";

/**
 * Aplica una propiedad solo si el elemento no la declara ya.
 *
 * Se usa el modelo de objetos CSS en vez de concatenar cadenas porque en CSS
 * gana la ultima declaracion: al pegar "margin: 0" detras de un "margin: 40px"
 * del autor, lo suyo se perdia. Todo lo que venga pegado desde Word, Docs o un
 * correo citado conserva asi su formato, que es justo lo que se pretendia.
 */
function estilar(el: Element, props: Record<string, string>) {
  const estilo = (el as HTMLElement).style;
  for (const [propiedad, valor] of Object.entries(props)) {
    if (!estilo.getPropertyValue(propiedad)) {
      estilo.setProperty(propiedad, valor);
    }
  }
}

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
 * La funcion es idempotente: aplicarla dos veces no duplica nada.
 */
export function prepararHtmlDeCorreo(
  html: string,
  opciones: OpcionesDeFormato = {}
): string {
  if (!html || !html.trim()) return html;
  if (html.includes(MARCA_YA_FORMATEADO)) return html;

  const { fontFamily, fontSize, lineHeight } = { ...PREDETERMINADO, ...opciones };

  try {
    const dom = new JSDOM("<body>" + html + "</body>");
    const doc = dom.window.document;
    const body = doc.body;

    const enLaFirma = (el: Element) => !!el.closest("[data-signature]");

    // Separacion proporcional al cuerpo: a 14px son 6px. Sumada al interlineado
    // de 1.4 deja unos 26px entre lineas, suficiente para distinguir parrafos
    // sin que parezca que hay una linea en blanco entre cada uno.
    //
    // Para pegar dos lineas sin ninguna separacion esta Mayus+Enter, que
    // inserta un salto dentro del mismo parrafo en vez de crear otro.
    const separacion = Math.round(fontSize * 0.45);

    body.querySelectorAll("p").forEach((p) => {
      if (enLaFirma(p)) return;
      estilar(p, {
        margin: "0 0 " + separacion + "px 0",
        "line-height": String(lineHeight),
      });
    });

    const escalaTitulos: Record<string, number> = { H1: 20, H2: 17, H3: 15 };
    body.querySelectorAll("h1, h2, h3").forEach((h) => {
      if (enLaFirma(h)) return;
      estilar(h, {
        margin: Math.round(separacion * 1.6) + "px 0 " + separacion + "px 0",
        "font-size": (escalaTitulos[h.tagName] || 15) + "px",
        "line-height": "1.25",
        "font-weight": "600",
        color: BRAND.ink,
      });
    });

    body.querySelectorAll("ul, ol").forEach((lista) => {
      if (enLaFirma(lista)) return;
      estilar(lista, {
        margin: "0 0 " + separacion + "px 0",
        "padding-left": "22px",
      });
    });

    body.querySelectorAll("li").forEach((li) => {
      if (enLaFirma(li)) return;
      estilar(li, { margin: "0 0 4px 0", "line-height": String(lineHeight) });
    });

    body.querySelectorAll("a").forEach((a) => {
      if (enLaFirma(a)) return;
      estilar(a, { color: BRAND.primary, "text-decoration": "underline" });
    });

    body.querySelectorAll("blockquote").forEach((cita) => {
      if (enLaFirma(cita)) return;
      estilar(cita, {
        margin: "0 0 " + separacion + "px 0",
        padding: "2px 0 2px 12px",
        "border-left": "3px solid " + BRAND.hairline,
        color: BRAND.muted,
      });
    });

    // Tablas con tono corporativo. Los atributos antiguos siguen haciendo falta
    // porque algunos clientes los respetan antes que el CSS en linea.
    body.querySelectorAll("table").forEach((tabla) => {
      if (enLaFirma(tabla)) return;
      if (!tabla.hasAttribute("cellpadding")) tabla.setAttribute("cellpadding", "0");
      if (!tabla.hasAttribute("cellspacing")) tabla.setAttribute("cellspacing", "0");
      if (!tabla.hasAttribute("border")) tabla.setAttribute("border", "0");
      estilar(tabla, {
        "border-collapse": "collapse",
        width: "100%",
        margin: "0 0 " + separacion + "px 0",
        "font-size": fontSize - 1 + "px",
      });
    });

    body.querySelectorAll("th").forEach((th) => {
      if (enLaFirma(th)) return;
      estilar(th, {
        "background-color": BRAND.tint,
        color: BRAND.primary,
        "font-weight": "600",
        "text-align": "left",
        padding: "8px 10px",
        "border-bottom": "2px solid " + BRAND.primary,
      });
    });

    body.querySelectorAll("td").forEach((td) => {
      if (enLaFirma(td)) return;
      estilar(td, {
        padding: "7px 10px",
        "border-bottom": "1px solid " + BRAND.hairline,
        "vertical-align": "top",
      });
    });

    const contenedor = doc.createElement("div");
    contenedor.setAttribute(MARCA_YA_FORMATEADO, "1");
    estilar(contenedor, {
      "font-family": fontFamily,
      "font-size": fontSize + "px",
      "line-height": String(lineHeight),
      color: BRAND.ink,
    });
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

/**
 * Version en texto plano del mensaje.
 *
 * Un correo solo-HTML es una de las senales que mas pesan en los filtros de
 * spam, incluido el de Stalwart. Enviar las dos partes cuesta poco y evita que
 * los propios correos de la casa acaben en la carpeta de no deseados.
 */
export function textoPlanoDesdeHtml(html: string): string {
  if (!html || !html.trim()) return "";

  try {
    const dom = new JSDOM("<body>" + html + "</body>");
    const doc = dom.window.document;

    doc.querySelectorAll("br").forEach((br) => {
      br.replaceWith(doc.createTextNode(SALTO));
    });

    doc
      .querySelectorAll("p, div, li, tr, h1, h2, h3, h4, h5, h6, blockquote")
      .forEach((bloque) => {
        bloque.appendChild(doc.createTextNode(SALTO));
      });

    const lineas = (doc.body.textContent || "").split(SALTO).map((l) => l.trim());

    // Se colapsan las lineas en blanco seguidas, que salen a monton al convertir
    // una estructura de bloques anidados.
    const limpias: string[] = [];
    for (const linea of lineas) {
      if (linea === "" && limpias[limpias.length - 1] === "") continue;
      limpias.push(linea);
    }

    return limpias.join(SALTO).trim();
  } catch (err) {
    console.error("No se pudo derivar el texto plano:", err);
    return "";
  }
}
