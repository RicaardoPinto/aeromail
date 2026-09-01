import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import { getSpecialFolderPath, moveMessages } from "@/lib/imap";

/**
 * Marca o desmarca correo como no deseado moviendolo entre la bandeja de
 * entrada y la carpeta de spam. Stalwart entrena su clasificador a partir de
 * esos movimientos, asi que mover es tambien la forma de ensenarle.
 */
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  try {
    const { action, folder, uids } = await req.json();

    if (!folder || !Array.isArray(uids) || uids.length === 0) {
      return NextResponse.json(
        { error: "Parámetros inválidos para marcar correo no deseado" },
        { status: 400 }
      );
    }

    let targetFolder: string | null;

    if (action === "mark") {
      targetFolder = await getSpecialFolderPath(
        session.account.imap,
        "\\Junk",
        ["Junk", "Spam", "Correo no deseado", "Bulk Mail"]
      );
      if (!targetFolder) {
        return NextResponse.json(
          { error: "La cuenta no tiene carpeta de correo no deseado" },
          { status: 409 }
        );
      }
    } else if (action === "unmark") {
      targetFolder = "INBOX";
    } else {
      return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
    }

    // Mover un mensaje a la carpeta donde ya esta hace fallar al servidor IMAP.
    if (targetFolder.toLowerCase() === folder.toLowerCase()) {
      return NextResponse.json({ success: true, targetFolder });
    }

    await moveMessages(
      session.account.imap,
      folder,
      targetFolder,
      uids.map(Number)
    );

    return NextResponse.json({ success: true, targetFolder });
  } catch (err: any) {
    console.error("Error updating spam state:", err);
    return NextResponse.json(
      { error: err.message || "Error al actualizar el estado de correo no deseado" },
      { status: 500 }
    );
  }
}
