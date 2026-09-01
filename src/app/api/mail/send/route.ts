import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import { sendEmail } from "@/lib/smtp";
import { appendToSpecialFolder } from "@/lib/imap";
import { SendMailPayload } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return unauthorizedResponse();

  try {
    const payload: SendMailPayload = await req.json();

    if (!payload.to || payload.to.length === 0) {
      return NextResponse.json(
        { error: "Debe especificar al menos un destinatario" },
        { status: 400 }
      );
    }

    // Default sender
    const fromAddress =
      payload.from || `"${session.name}" <${session.email}>`;

    const result = await sendEmail(session.account.smtp, {
      ...payload,
      from: fromAddress,
    });

    // El correo ya salio del servidor. Si archivar la copia falla, se informa
    // pero no se convierte un envio exitoso en un error para el usuario.
    let savedTo: string | null = null;
    let saveError: string | undefined;
    try {
      savedTo = await appendToSpecialFolder(
        session.account.imap,
        "\\Sent",
        ["Sent", "Enviados", "Sent Items", "Elementos enviados"],
        result.raw
      );
    } catch (err: any) {
      saveError = err.message || "No se pudo archivar la copia en Enviados";
      console.error("Error saving message to Sent folder:", err);
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      savedTo,
      saveError,
    });
  } catch (err: any) {
    console.error("Error sending email:", err);
    return NextResponse.json(
      { error: err.message || "Error al enviar el correo electrónico" },
      { status: 500 }
    );
  }
}
