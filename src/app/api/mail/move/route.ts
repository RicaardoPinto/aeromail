import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import { moveMessages, deleteMessages } from "@/lib/imap";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  try {
    const { action, folder, targetFolder, uids } = await req.json();

    if (!folder || !uids || !Array.isArray(uids)) {
      return NextResponse.json(
        { error: "Parámetros inválidos para mover/eliminar correos" },
        { status: 400 }
      );
    }

    if (action === "move" && targetFolder) {
      await moveMessages(
        session.account.imap,
        folder,
        targetFolder,
        uids.map(Number)
      );
    } else if (action === "delete") {
      await deleteMessages(
        session.account.imap,
        folder,
        uids.map(Number)
      );
    } else {
      return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error moving/deleting messages:", err);
    return NextResponse.json(
      { error: err.message || "Error al procesar la acción en los correos" },
      { status: 500 }
    );
  }
}
