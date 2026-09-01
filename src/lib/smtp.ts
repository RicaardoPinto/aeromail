import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer";
import { randomUUID } from "crypto";
import { SmtpConfig, SendMailPayload } from "./types";
import { verificarCertificadoTls } from "./tls";

export function createSmtpTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure || config.port === 465,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass,
    },
    tls: {
      rejectUnauthorized: verificarCertificadoTls(),
    },
  });
}

/**
 * Tests SMTP credentials
 */
export async function testSmtpConnection(config: SmtpConfig): Promise<boolean> {
  const transporter = createSmtpTransporter(config);
  try {
    await transporter.verify();
    return true;
  } catch (err) {
    console.error("SMTP Connection test failed:", err);
    return false;
  }
}

/**
 * Sends an email via SMTP with full support for attachments, HTML, plain text, and threading headers
 */
export async function sendEmail(
  config: SmtpConfig,
  payload: SendMailPayload
): Promise<{ messageId: string; raw: Buffer }> {
  const transporter = createSmtpTransporter(config);

  const attachments = (payload.attachments || []).map((att) => ({
    filename: att.filename,
    content: Buffer.from(att.content, "base64"),
    contentType: att.contentType,
  }));

  // El identificador se fija aqui para que la copia guardada en Enviados sea
  // el mismo mensaje que salio del servidor, y no uno equivalente.
  const domain = payload.from.match(/@([^>\s]+)/)?.[1] || "localhost";
  const messageId = `<${randomUUID()}@${domain}>`;

  const mailOptions: nodemailer.SendMailOptions = {
    messageId,
    from: payload.from,
    to: payload.to.join(", "),
    cc: payload.cc && payload.cc.length > 0 ? payload.cc.join(", ") : undefined,
    bcc: payload.bcc && payload.bcc.length > 0 ? payload.bcc.join(", ") : undefined,
    subject: payload.subject || "(Sin asunto)",
    html: payload.html,
    text: payload.text,
    inReplyTo: payload.inReplyTo,
    references: payload.references,
    attachments,
  };

  // Se compila antes de enviar para que la copia conserve la misma fecha.
  // keepBcc mantiene la cabecera solo en la copia archivada: el envio real la
  // omite, asi que los destinatarios en copia oculta siguen sin verse entre si.
  const compiled = new MailComposer(mailOptions).compile();
  // keepBcc vive en el nodo MIME, no en las opciones del compositor: es como
  // lo aplica el propio nodemailer en sus transportes.
  (compiled as unknown as { keepBcc: boolean }).keepBcc = true;
  const raw = await new Promise<Buffer>((resolve, reject) => {
    compiled.build((err, message) => (err ? reject(err) : resolve(message)));
  });

  const info = await transporter.sendMail(mailOptions);

  return {
    messageId: info.messageId || messageId,
    raw,
  };
}
