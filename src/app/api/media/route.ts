import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import { guardarImagen, TAMANO_MAXIMO } from "@/lib/media";

/**
 * Sube una imagen al servidor y devuelve su dirección pública.
 *
 * Requiere sesión: subir es cosa del dueño del buzón. Servirla no, porque el
 * que la descarga es el destinatario del correo desde su propio programa.
 */
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  try {
    const formulario = await req.formData();
    const archivo = formulario.get("archivo");

    if (!archivo || typeof archivo === "string") {
      return NextResponse.json(
        { error: "No se recibió ningún archivo" },
        { status: 400 }
      );
    }

    if (archivo.size > TAMANO_MAXIMO) {
      return NextResponse.json(
        { error: "La imagen supera los 2 MB" },
        { status: 413 }
      );
    }

    const datos = Buffer.from(await archivo.arrayBuffer());
    const guardada = guardarImagen(datos);

    // La dirección se arma con las cabeceras de la petición para que funcione
    // igual tras el proxy, sin tener que configurar el dominio en dos sitios.
    const host = req.headers.get("host");
    const protocolo = req.headers.get("x-forwarded-proto") || "https";
    const url = host
      ? protocolo + "://" + host + "/media/" + guardada.nombre
      : "/media/" + guardada.nombre;

    return NextResponse.json({ url, ...guardada });
  } catch (err: any) {
    console.error("Error guardando la imagen:", err);
    return NextResponse.json(
      { error: err.message || "No se pudo guardar la imagen" },
      { status: 400 }
    );
  }
}
