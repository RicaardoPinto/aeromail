import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-helper";
import { sendEmail } from "@/lib/smtp";
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

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (err: any) {
    console.error("Error sending email:", err);
    return NextResponse.json(
      { error: err.message || "Error al enviar el correo electrónico" },
      { status: 500 }
    );
  }
}
