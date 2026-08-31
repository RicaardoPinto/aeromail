import nodemailer from "nodemailer";
import { SmtpConfig, SendMailPayload } from "./types";

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
      rejectUnauthorized: process.env.NODE_ENV === "production",
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
): Promise<{ messageId: string }> {
  const transporter = createSmtpTransporter(config);

  const attachments = (payload.attachments || []).map((att) => ({
    filename: att.filename,
    content: Buffer.from(att.content, "base64"),
    contentType: att.contentType,
  }));

  const mailOptions: nodemailer.SendMailOptions = {
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

  const info = await transporter.sendMail(mailOptions);

  return {
    messageId: info.messageId,
  };
}
