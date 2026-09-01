import { NextRequest, NextResponse } from "next/server";
import { leerImagen } from "@/lib/media";

/**
 * Sirve una imagen guardada. Es PÚBLICA a propósito y no debe pedir sesión:
 * quien la descarga es el programa de correo del destinatario.
 *
 * El nombre del archivo deriva del contenido, así que nunca cambia para una
 * misma imagen y se puede cachear indefinidamente.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ archivo: string }> }
) {
  const { archivo } = await params;
  const imagen = leerImagen(archivo);

  if (!imagen) {
    return new NextResponse("No encontrada", { status: 404 });
  }

  return new NextResponse(new Uint8Array(imagen.datos), {
    status: 200,
    headers: {
      "Content-Type": imagen.tipo,
      "Content-Length": String(imagen.datos.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      // Que no se interprete como otra cosa aunque el contenido engañe.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
