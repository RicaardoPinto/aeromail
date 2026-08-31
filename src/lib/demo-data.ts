import {
  MailboxFolder,
  EmailSummary,
  FullEmailMessage,
  Identity,
  Signature,
} from "./types";

export const DEMO_USER = {
  email: "demo@tudominio.com",
  name: "Alex Rivera",
  userId: "demo@tudominio.com",
};

export const DEMO_FOLDERS: MailboxFolder[] = [
  { path: "INBOX", name: "Bandeja de entrada", specialUse: "\\inbox", unseen: 2, total: 5 },
  { path: "Sent", name: "Enviados", specialUse: "\\sent", unseen: 0, total: 12 },
  { path: "Drafts", name: "Borradores", specialUse: "\\drafts", unseen: 0, total: 1 },
  { path: "Archive", name: "Archivo", specialUse: "\\archive", unseen: 0, total: 45 },
  { path: "Junk", name: "Spam", specialUse: "\\junk", unseen: 1, total: 1 },
  { path: "Trash", name: "Papelera", specialUse: "\\trash", unseen: 0, total: 3 },
];

export const DEMO_MESSAGES: Record<string, FullEmailMessage[]> = {
  INBOX: [
    {
      uid: 101,
      seq: 1,
      folder: "INBOX",
      messageId: "<msg-101@tudominio.com>",
      subject: "🚀 Bienvenido a tu nuevo Webmail Privado",
      from: { name: "Administrador del Servidor", address: "admin@tudominio.com" },
      to: [{ name: "Alex Rivera", address: "demo@tudominio.com" }],
      date: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      flags: [],
      unread: true,
      flagged: true,
      answered: false,
      hasAttachments: false,
      textBody: "¡Bienvenido a tu Webmail Privado y Soberano montado en tu VPS!",
      htmlBody: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b;">
  <h2 style="color: #2563eb; margin-bottom: 8px;">¡Bienvenido a tu nuevo Webmail!</h2>
  <p>Hola <strong>Alex</strong>,</p>
  <p>Este es tu nuevo cliente webmail 100% independiente, autohospedado en tu VPS y libre de proveedores o rastreos externos.</p>
  
  <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 14px; margin: 16px 0; border-radius: 4px;">
    <h4 style="margin: 0 0 6px 0; color: #0f172a;">Funciones destacadas:</h4>
    <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569;">
      <li>Presiona el botón <strong>"Firmas"</strong> en la barra superior para diseñar firmas con logotipo, colores corporativos y proporciones sutiles.</li>
      <li>Pulsa la tecla <kbd style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">C</kbd> para redactar un nuevo correo con tu firma automática.</li>
      <li>Alterna entre modo oscuro y claro con el icono superior.</li>
    </ul>
  </div>

  <p style="font-size: 12px; color: #64748b;">Consumo ligero optimizado para funcionar con menos de 100MB de memoria RAM en tu VPS.</p>
  <br/>
  <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 11px; color: #64748b;">
    <strong>Administración del Servidor de Correo</strong><br/>
    <span>Entorno Seguro TLS / IMAP</span>
  </div>
</div>
      `.trim(),
      sanitizedHtml: "",
      hasRemoteImages: false,
      attachments: [],
    },
    {
      uid: 102,
      seq: 2,
      folder: "INBOX",
      messageId: "<msg-102@servidor-vps.local>",
      subject: "📊 Reporte de rendimiento del VPS y memoria",
      from: { name: "Monitor de Servidor", address: "sistema@servidor-vps.local" },
      to: [{ name: "Alex Rivera", address: "demo@tudominio.com" }],
      date: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      flags: [],
      unread: true,
      flagged: false,
      answered: false,
      hasAttachments: true,
      textBody: "El consumo de memoria se mantiene en 48 MB.",
      htmlBody: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b;">
  <h3>Reporte de Estado del Servidor VPS</h3>
  <p>Tu servidor Linux con Docker está funcionando de manera óptima:</p>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
    <thead>
      <tr style="background: #f1f5f9; text-align: left;">
        <th style="padding: 8px; border: 1px solid #cbd5e1;">Servicio</th>
        <th style="padding: 8px; border: 1px solid #cbd5e1;">Uso de RAM</th>
        <th style="padding: 8px; border: 1px solid #cbd5e1;">Estado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">Webmail App</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">48 MB</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; color: #16a34a; font-weight: bold;">Activo</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">Caddy SSL Proxy</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">14 MB</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; color: #16a34a; font-weight: bold;">Activo (HTTPS OK)</td>
      </tr>
    </tbody>
  </table>
  <p>Adjuntamos el informe detallado en formato PDF.</p>
</div>
      `.trim(),
      sanitizedHtml: "",
      hasRemoteImages: false,
      attachments: [
        {
          id: "att_report_pdf",
          filename: "reporte_servidor.pdf",
          contentType: "application/pdf",
          size: 245000,
        },
      ],
    },
    {
      uid: 103,
      seq: 3,
      folder: "INBOX",
      messageId: "<msg-103@seguridad.local>",
      subject: "🔒 Demostración: Bloqueo de Tracking Pixels e Imágenes Remotas",
      from: { name: "Centro de Ciberseguridad", address: "seguridad@tudominio.com" },
      to: [{ name: "Alex Rivera", address: "demo@tudominio.com" }],
      date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      flags: ["\\Seen"],
      unread: false,
      flagged: true,
      answered: false,
      hasAttachments: false,
      textBody: "Prueba el bloqueo de imágenes externas en este mensaje.",
      htmlBody: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b;">
  <h3>Demostración de Privacidad y Aislamiento</h3>
  <p>Este correo simula contener una imagen remota y un pixel de seguimiento externo.</p>
  <p>Observa el banner de advertencia en la parte superior que bloquea automáticamente la carga para proteger tu dirección IP.</p>
  <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80" alt="Banner de Seguridad" style="max-width: 100%; border-radius: 8px; margin-top: 10px;" />
  <p style="font-size: 12px; color: #64748b; margin-top: 10px;">Esta protección previene que emisores no autorizados conozcan tu ubicación o confirmen la apertura del correo.</p>
</div>
      `.trim(),
      sanitizedHtml: "",
      hasRemoteImages: true,
      attachments: [],
    },
    {
      uid: 104,
      seq: 4,
      folder: "INBOX",
      messageId: "<msg-104@cliente.local>",
      subject: "Propuesta de diseño corporativo",
      from: { name: "Valentina Gómez", address: "valentina@estudiocreativo.local" },
      to: [{ name: "Alex Rivera", address: "demo@tudominio.com" }],
      date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      flags: ["\\Seen"],
      unread: false,
      flagged: false,
      answered: true,
      hasAttachments: true,
      textBody: "Adjunto el mock de la propuesta.",
      htmlBody: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b;">
  <p>Hola Alex,</p>
  <p>Te comparto el archivo con la propuesta gráfica y las especificaciones técnicas.</p>
  <p>Quedo atenta a tus comentarios.</p>
  <br/>
  <p>Saludos cordiales,<br/><strong>Valentina Gómez</strong><br/>Estudio Creativo</p>
</div>
      `.trim(),
      sanitizedHtml: "",
      hasRemoteImages: false,
      attachments: [
        {
          id: "att_mockup_png",
          filename: "propuesta_grafica_v2.png",
          contentType: "image/png",
          size: 1420000,
        },
      ],
    },
    {
      uid: 105,
      seq: 5,
      folder: "INBOX",
      messageId: "<msg-105@hosting.local>",
      subject: "Confirmación de renovación de certificado SSL",
      from: { name: "Administración SSL", address: "certificados@tudominio.com" },
      to: [{ name: "Alex Rivera", address: "demo@tudominio.com" }],
      date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      flags: ["\\Seen"],
      unread: false,
      flagged: false,
      answered: false,
      hasAttachments: false,
      textBody: "El certificado SSL automático de tu VPS ha sido renovado correctamente.",
      htmlBody: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b;">
  <p>Estimado usuario,</p>
  <p>Confirmamos que el certificado SSL (HTTPS) de tu webmail ha sido verificado y renovado correctamente por el proxy Caddy.</p>
  <p>Tu conexión se mantiene completamente segura y cifrada.</p>
</div>
      `.trim(),
      sanitizedHtml: "",
      hasRemoteImages: false,
      attachments: [],
    },
  ],
};
