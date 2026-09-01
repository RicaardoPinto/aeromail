import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

/**
 * Almacenamiento de imágenes en el propio servidor.
 *
 * El logo de la firma tiene que estar en una dirección pública: quien lo
 * descarga es el cliente que recibe el correo, desde su propio programa, no
 * alguien con sesión iniciada. Guardarlo aquí evita depender de un servicio
 * externo que pueda cerrar, cambiar de precio o borrar el archivo.
 *
 * Vive en el mismo volumen que el resto de los datos, así que sobrevive a los
 * despliegues.
 */
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const MEDIA_DIR = path.join(DATA_DIR, "media");

/** 2 MB. Un logo pesa unos pocos KB; lo que exceda esto es un error de origen. */
export const TAMANO_MAXIMO = 2 * 1024 * 1024;

/**
 * Tipos permitidos, comprobados por los primeros bytes del archivo y no por lo
 * que diga el navegador, que es dato del cliente y se puede falsificar.
 *
 * SVG queda fuera a propósito: es XML, admite scripts, y los programas de
 * correo no lo muestran de forma fiable. Un logo en SVG no serviría igualmente.
 */
const FIRMAS: { tipo: string; extension: string; bytes: number[] }[] = [
  { tipo: "image/png", extension: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { tipo: "image/jpeg", extension: "jpg", bytes: [0xff, 0xd8, 0xff] },
  { tipo: "image/gif", extension: "gif", bytes: [0x47, 0x49, 0x46, 0x38] },
];

export interface ImagenGuardada {
  nombre: string;
  tipo: string;
  bytes: number;
}

function asegurarDirectorio() {
  if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
  }
}

/** Reconoce el tipo real por los bytes iniciales. WebP se comprueba aparte. */
export function reconocerImagen(datos: Buffer): { tipo: string; extension: string } | null {
  for (const firma of FIRMAS) {
    if (firma.bytes.every((b, i) => datos[i] === b)) {
      return { tipo: firma.tipo, extension: firma.extension };
    }
  }
  // WebP: "RIFF" en los bytes 0-3 y "WEBP" en los 8-11.
  if (
    datos.length > 12 &&
    datos.toString("ascii", 0, 4) === "RIFF" &&
    datos.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { tipo: "image/webp", extension: "webp" };
  }
  return null;
}

/**
 * Guarda la imagen con un nombre derivado de su contenido. Subir dos veces la
 * misma reutiliza el archivo en vez de duplicarlo, y el nombre no es adivinable.
 */
export function guardarImagen(datos: Buffer): ImagenGuardada {
  const reconocida = reconocerImagen(datos);
  if (!reconocida) {
    throw new Error("El archivo no es una imagen PNG, JPG, GIF o WebP");
  }
  if (datos.length > TAMANO_MAXIMO) {
    throw new Error("La imagen supera los 2 MB");
  }

  asegurarDirectorio();

  const huella = createHash("sha256").update(datos).digest("hex").slice(0, 32);
  const nombre = huella + "." + reconocida.extension;
  const destino = path.join(MEDIA_DIR, nombre);

  if (!fs.existsSync(destino)) {
    fs.writeFileSync(destino, datos);
  }

  return { nombre, tipo: reconocida.tipo, bytes: datos.length };
}

/**
 * Lee una imagen guardada. Devuelve null si no existe o si el nombre intenta
 * salirse del directorio: el nombre llega por la URL y es dato del cliente.
 */
export function leerImagen(nombre: string): { datos: Buffer; tipo: string } | null {
  if (!nombre || nombre.includes("/") || nombre.includes("\\") || nombre.includes("..")) {
    return null;
  }

  const destino = path.join(MEDIA_DIR, nombre);
  if (!destino.startsWith(MEDIA_DIR + path.sep)) return null;
  if (!fs.existsSync(destino)) return null;

  const datos = fs.readFileSync(destino);
  const reconocida = reconocerImagen(datos);
  return { datos, tipo: reconocida?.tipo || "application/octet-stream" };
}
