export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean; // TLS / SSL
  auth: {
    user: string;
    pass: string;
  };
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  imap: ImapConfig;
  smtp: SmtpConfig;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  account: {
    imap: ImapConfig;
    smtp: SmtpConfig;
  };
  exp?: number;
}

export interface MailboxFolder {
  path: string;
  name: string;
  specialUse?: string; // \Inbox, \Sent, \Drafts, \Trash, \Junk, \Archive
  unseen: number;
  total: number;
  subscribed?: boolean;
}

export interface EmailAddress {
  name: string;
  address: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
  inline?: boolean;
  checksum?: string;
}

export interface EmailSummary {
  uid: number;
  seq: number;
  id?: string;
  messageId?: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  date: string;
  flags: string[]; // \Seen, \Flagged, \Answered, \Draft, \Deleted
  unread: boolean;
  flagged: boolean;
  answered: boolean;
  hasAttachments: boolean;
  size?: number;
  snippet?: string;
}

export interface FullEmailMessage extends EmailSummary {
  folder: string;
  textBody?: string;
  htmlBody?: string;
  sanitizedHtml?: string;
  hasRemoteImages?: boolean;
  replyTo?: EmailAddress[];
  inReplyTo?: string;
  references?: string[];
  attachments: EmailAttachment[];
  headers?: Record<string, string | string[]>;
}

export interface Signature {
  id: string;
  userId: string;
  name: string;
  htmlContent: string;
  plainText?: string;
  isDefault: boolean;
  /** true cuando la genero la app: se regenera al cambiar la identidad */
  generated?: boolean;
  associatedIdentityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Identity {
  id: string;
  userId: string;
  /** Nombre visible para el destinatario, p. ej. "LyF Soluciones" */
  name: string;
  email: string;
  replyTo?: string;
  organization?: string;
  /** Datos que alimentan la firma. Sin ellos se rellenaba con marcadores. */
  title?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  websiteUrl?: string;
  address?: string;
  logoUrl?: string;
  brandColor?: string;
  isDefault: boolean;
  signatureId?: string;
}

/** Direccion vista en el buzon o usada al enviar, para autocompletar */
export interface Contact {
  address: string;
  name?: string;
  lastSeen: string;
  count: number;
}

export interface UserPreferences {
  theme: "dark" | "light" | "system";
  previewPanePosition: "right" | "bottom" | "hidden";
  messagesPerPage: number;
  blockRemoteImages: boolean;
  defaultSignatureId?: string;
  autoSaveDraftInterval: number; // seconds
  /** Tipografia del redactor y de los correos que se envian */
  composeFontFamily?: string;
  composeFontSize?: number; // px
  composeLineHeight?: number; // 1.2 - 1.8
}

export interface SendMailPayload {
  from: string; // "John Doe <john@domain.com>"
  identityId?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  inReplyTo?: string;
  references?: string[];
  signatureId?: string;
  attachments?: {
    filename: string;
    content: string; // Base64
    contentType: string;
  }[];
}
