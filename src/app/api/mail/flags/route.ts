import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import { setMessageFlags } from "@/lib/imap";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  try {
    const { folder, uids, action, flags } = await req.json();

    if (!folder || !uids || !Array.isArray(uids) || !flags || !action) {
      return NextResponse.json(
        { error: "Parámetros inválidos para cambiar banderas de correo" },
        { status: 400 }
      );
    }

    await setMessageFlags(
      session.account.imap,
      folder,
      uids.map(Number),
      action,
      flags
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error setting flags:", err);
    return NextResponse.json(
      { error: err.message || "Error al actualizar banderas del correo" },
      { status: 500 }
    );
  }
}
