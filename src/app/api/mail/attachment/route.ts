import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import { downloadAttachment } from "@/lib/imap";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder") || "INBOX";
  const uid = parseInt(searchParams.get("uid") || "", 10);
  const partId = searchParams.get("partId") || "0";

  if (isNaN(uid)) {
    return NextResponse.json({ error: "UID inválido" }, { status: 400 });
  }

  try {
    const attachment = await downloadAttachment(
      session.account.imap,
      folder,
      uid,
      partId
    );

    if (!attachment) {
      return NextResponse.json(
        { error: "Archivo adjunto no encontrado" },
        { status: 404 }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", attachment.contentType);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(attachment.filename)}"`
    );
    headers.set("Content-Length", String(attachment.content.length));

    return new NextResponse(attachment.content as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error("Attachment download error:", err);
    return NextResponse.json(
      { error: err.message || "Error al descargar el adjunto" },
      { status: 500 }
    );
  }
}
