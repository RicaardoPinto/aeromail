import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import { sendEmail } from "@/lib/smtp";
import { appendToSpecialFolder } from "@/lib/imap";
import { getUserPreferences, recordContacts } from "@/lib/storage";
import { prepararHtmlDeCorreo, textoPlanoDesdeHtml } from "@/lib/email-format";
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

    // Los clientes de correo ignoran las hojas de estilo, asi que el HTML se
    // prepara con estilos en linea antes de salir (ver email-format.ts).
    const prefs = getUserPreferences(session.userId);
    const htmlListo = prepararHtmlDeCorreo(payload.html, {
      fontFamily: prefs.composeFontFamily,
      fontSize: prefs.composeFontSize,
      lineHeight: prefs.composeLineHeight,
    });

    const result = await sendEmail(session.account.smtp, {
      ...payload,
      html: htmlListo,
      // Un correo solo-HTML es una de las senales que mas pesan en los filtros
      // de spam. Enviar tambien la parte de texto evita que los correos de la
      // casa acaben en no deseados.
      text: payload.text || textoPlanoDesdeHtml(htmlListo),
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

    // Sin carpeta reconocible no hay error, pero tampoco copia: hay que decirlo
    // o el usuario da por hecho que se guardo y la carpeta sigue vacia.
    if (!savedTo && !saveError) {
      saveError = "La cuenta no tiene una carpeta de Enviados reconocible";
    }

    // A quien escribes es la senal mas fuerte de que es un contacto tuyo.
    try {
      recordContacts(
        session.userId,
        [...payload.to, ...(payload.cc || []), ...(payload.bcc || [])].map(
          (address) => ({ address })
        )
      );
    } catch (err) {
      console.error("No se pudieron registrar los contactos:", err);
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
