import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import { fetchFullMessage } from "@/lib/imap";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  const { uid } = await params;
  const uidNum = parseInt(uid, 10);

  if (isNaN(uidNum)) {
    return NextResponse.json({ error: "UID inválido" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder") || "INBOX";
  const allowRemoteImages = searchParams.get("allowRemoteImages") === "1";

  try {
    const message = await fetchFullMessage(
      session.account.imap,
      folder,
      uidNum,
      allowRemoteImages
    );

    if (!message) {
      return NextResponse.json(
        { error: "Mensaje no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message });
  } catch (err: any) {
    console.error("Error fetching full message:", err);
    return NextResponse.json(
      { error: err.message || "Error al obtener el contenido del correo" },
      { status: 500 }
    );
  }
}
