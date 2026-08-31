import { ImapFlow } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";
import {
  ImapConfig,
  MailboxFolder,
  EmailSummary,
  FullEmailMessage,
  EmailAddress,
  EmailAttachment,
} from "./types";
import { sanitizeEmailHtml } from "./sanitizer";

export function createImapClient(config: ImapConfig): ImapFlow {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass,
    },
    logger: false, // Set to true if debugging connection
    emitLogs: false,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });
}

/**
 * Tests IMAP credentials against the server
 */
export async function testImapConnection(config: ImapConfig): Promise<boolean> {
  const client = createImapClient(config);
  try {
    await client.connect();
    await client.logout();
    return true;
  } catch (err) {
    console.error("IMAP Connection test failed:", err);
    try {
      await client.logout();
    } catch {}
    return false;
  }
}

/**
 * Lists all mailboxes and calculates total/unseen counters
 */
export async function getMailboxes(config: ImapConfig): Promise<MailboxFolder[]> {
  const client = createImapClient(config);
  const folders: MailboxFolder[] = [];

  try {
    await client.connect();
    const list = await client.list();

    for (const mailbox of list) {
      let unseen = 0;
      let total = 0;

      try {
        const status = await client.status(mailbox.path, {
          unseen: true,
          messages: true,
        });
        unseen = status.unseen || 0;
        total = status.messages || 0;
      } catch {
        // Status may fail on non-selectable folders
      }

      folders.push({
        path: mailbox.path,
        name: mailbox.name,
        specialUse: mailbox.specialUse,
        unseen,
        total,
        subscribed: mailbox.subscribed,
      });
    }
  } finally {
    try {
      await client.logout();
    } catch {}
  }

  // Ensure INBOX is first, followed by Sent, Drafts, Trash, Junk
  return sortFolders(folders);
}

function sortFolders(folders: MailboxFolder[]): MailboxFolder[] {
  const order: Record<string, number> = {
    "\\inbox": 1,
    inbox: 1,
    "\\sent": 2,
    sent: 2,
    "\\drafts": 3,
    drafts: 3,
    "\\archive": 4,
    archive: 4,
    "\\junk": 5,
    "\\spam": 5,
    junk: 5,
    spam: 5,
    "\\trash": 6,
    trash: 6,
  };

  return folders.sort((a, b) => {
    const keyA = (a.specialUse || a.name).toLowerCase();
    const keyB = (b.specialUse || b.name).toLowerCase();
    const orderA = order[keyA] || 99;
    const orderB = order[keyB] || 99;

    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Fetches message headers and envelopes with pagination
 */
export async function fetchMessageList(
  config: ImapConfig,
  folderPath: string = "INBOX",
  page: number = 1,
  pageSize: number = 50,
  searchQuery?: string
): Promise<{ messages: EmailSummary[]; total: number }> {
  const client = createImapClient(config);
  const messages: EmailSummary[] = [];
  let total = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock(folderPath);

    try {
      const status = await client.status(folderPath, { messages: true });
      total = status.messages || 0;

      if (total === 0) {
        return { messages: [], total: 0 };
      }

      // Calculate range from latest to oldest
      let searchRange: any = "1:*";

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.trim();
        searchRange = {
          or: [
            { subject: q },
            { from: q },
            { to: q },
            { body: q },
          ],
        };
      }

      // Fetch sequence IDs
      const searchResults = await client.search(searchRange, { uid: true });
      const uids = Array.isArray(searchResults) ? searchResults : [];
      total = uids.length;

      // Reverse so newest is first
      const sortedUids = [...uids].reverse();
      const startIndex = (page - 1) * pageSize;
      const paginatedUids = sortedUids.slice(startIndex, startIndex + pageSize);

      if (paginatedUids.length === 0) {
        return { messages: [], total };
      }

      for await (const msg of client.fetch(paginatedUids, {
        uid: true,
        envelope: true,
        flags: true,
        size: true,
        bodyStructure: true,
      })) {
        const env = msg.envelope;
        const flags = Array.from(msg.flags || []);

        const fromAddr: EmailAddress = env?.from?.[0]
          ? {
              name: env.from[0].name || env.from[0].address || "",
              address: env.from[0].address || "",
            }
          : { name: "Desconocido", address: "" };

        const toAddrs: EmailAddress[] = (env?.to || []).map((t) => ({
          name: t.name || t.address || "",
          address: t.address || "",
        }));

        const hasAttachments =
          !!msg.bodyStructure?.childNodes?.some(
            (node) => node.disposition === "attachment" || (node.type && !node.type.startsWith("text/"))
          );

        messages.push({
          uid: msg.uid,
          seq: msg.seq,
          messageId: env?.messageId,
          subject: env?.subject || "(Sin asunto)",
          from: fromAddr,
          to: toAddrs,
          date: env?.date ? env.date.toISOString() : new Date().toISOString(),
          flags,
          unread: !flags.includes("\\Seen"),
          flagged: flags.includes("\\Flagged"),
          answered: flags.includes("\\Answered"),
          hasAttachments,
          size: msg.size,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {}
  }

  // Sort messages descending by UID / date
  return {
    messages: messages.sort((a, b) => b.uid - a.uid),
    total,
  };
}

/**
 * Fetches a single message with full body, attachments, and sanitized HTML
 */
export async function fetchFullMessage(
  config: ImapConfig,
  folderPath: string,
  uid: number,
  allowRemoteImages: boolean = false
): Promise<FullEmailMessage | null> {
  const client = createImapClient(config);

  try {
    await client.connect();
    const lock = await client.getMailboxLock(folderPath);

    try {
      const msgSource = await client.download(String(uid), undefined, { uid: true });
      if (!msgSource || !msgSource.content) {
        return null;
      }

      // Mark as seen automatically
      try {
        await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      } catch {}

      // Parse the RFC 822 MIME message safely
      const parsed: ParsedMail = await simpleParser(msgSource.content);

      const fromAddr: EmailAddress = parsed.from?.value?.[0]
        ? {
            name: parsed.from.value[0].name || parsed.from.value[0].address || "",
            address: parsed.from.value[0].address || "",
          }
        : { name: "Desconocido", address: "" };

      const toAddrs: EmailAddress[] = (
        Array.isArray(parsed.to) ? parsed.to : parsed.to?.value ? parsed.to.value : []
      ).map((t: any) => ({
        name: t.name || t.address || "",
        address: t.address || "",
      }));

      const ccAddrs: EmailAddress[] = (
        Array.isArray(parsed.cc) ? parsed.cc : parsed.cc?.value ? parsed.cc.value : []
      ).map((c: any) => ({
        name: c.name || c.address || "",
        address: c.address || "",
      }));

      // Extract and sanitize HTML or wrap text
      let htmlContent = parsed.html || "";
      if (!htmlContent && parsed.textAsHtml) {
        htmlContent = parsed.textAsHtml;
      } else if (!htmlContent && parsed.text) {
        htmlContent = `<pre style="font-family: inherit; white-space: pre-wrap; word-break: break-word;">${escapeHtml(
          parsed.text
        )}</pre>`;
      }

      const { sanitizedHtml, hasRemoteImages } = sanitizeEmailHtml(
        htmlContent,
        allowRemoteImages
      );

      // Attachments list
      const attachments: EmailAttachment[] = (parsed.attachments || []).map((att, idx) => ({
        id: `att_${idx}_${att.checksum || idx}`,
        filename: att.filename || `adjunto_${idx + 1}`,
        contentType: att.contentType || "application/octet-stream",
        size: att.size || 0,
        contentId: att.contentId,
        inline: att.related,
        checksum: att.checksum,
      }));

      return {
        uid,
        seq: 0,
        folder: folderPath,
        messageId: parsed.messageId,
        subject: parsed.subject || "(Sin asunto)",
        from: fromAddr,
        to: toAddrs,
        cc: ccAddrs,
        date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
        flags: ["\\Seen"],
        unread: false,
        flagged: false,
        answered: false,
        hasAttachments: attachments.length > 0,
        textBody: parsed.text,
        htmlBody: htmlContent,
        sanitizedHtml,
        hasRemoteImages,
        inReplyTo: parsed.inReplyTo,
        references: Array.isArray(parsed.references) ? parsed.references : parsed.references ? [parsed.references] : [],
        attachments,
      };
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {}
  }
}

/**
 * Downloads a specific attachment from an email
 */
export async function downloadAttachment(
  config: ImapConfig,
  folderPath: string,
  uid: number,
  attachmentIndexOrId: number | string
): Promise<{ filename: string; contentType: string; content: Buffer } | null> {
  const client = createImapClient(config);

  try {
    await client.connect();
    const lock = await client.getMailboxLock(folderPath);

    try {
      const msgSource = await client.download(String(uid), undefined, { uid: true });
      if (!msgSource?.content) return null;

      const parsed: ParsedMail = await simpleParser(msgSource.content);
      const attachments = parsed.attachments || [];

      let target = null;
      if (typeof attachmentIndexOrId === "number") {
        target = attachments[attachmentIndexOrId];
      } else {
        const idx = parseInt(attachmentIndexOrId.replace("att_", ""), 10);
        target = !isNaN(idx) ? attachments[idx] : attachments.find((a) => a.checksum === attachmentIndexOrId);
      }

      if (!target) return null;

      return {
        filename: target.filename || "archivo",
        contentType: target.contentType || "application/octet-stream",
        content: target.content,
      };
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {}
  }
}

/**
 * Modifies message flags (\Seen, \Flagged, etc.)
 */
export async function setMessageFlags(
  config: ImapConfig,
  folderPath: string,
  uids: number[],
  action: "add" | "remove" | "set",
  flags: string[]
): Promise<void> {
  const client = createImapClient(config);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folderPath);
    try {
      const uidSequence = uids.map(String).join(",");
      if (action === "add") {
        await client.messageFlagsAdd(uidSequence, flags, { uid: true });
      } else if (action === "remove") {
        await client.messageFlagsRemove(uidSequence, flags, { uid: true });
      } else if (action === "set") {
        await client.messageFlagsSet(uidSequence, flags, { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {}
  }
}

/**
 * Moves messages to target folder
 */
export async function moveMessages(
  config: ImapConfig,
  sourceFolder: string,
  targetFolder: string,
  uids: number[]
): Promise<void> {
  const client = createImapClient(config);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(sourceFolder);
    try {
      const uidSequence = uids.map(String).join(",");
      await client.messageMove(uidSequence, targetFolder, { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {}
  }
}

/**
 * Deletes messages (moves to Trash or marks \Deleted + expunges)
 */
export async function deleteMessages(
  config: ImapConfig,
  folderPath: string,
  uids: number[],
  trashFolderPath = "Trash"
): Promise<void> {
  const client = createImapClient(config);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folderPath);
    try {
      const uidSequence = uids.map(String).join(",");
      // If already in trash, expunge directly
      if (folderPath.toLowerCase().includes("trash") || folderPath.toLowerCase().includes("papelera")) {
        await client.messageDelete(uidSequence, { uid: true });
      } else {
        try {
          await client.messageMove(uidSequence, trashFolderPath, { uid: true });
        } catch {
          // Fallback delete if trash folder doesn't exist
          await client.messageDelete(uidSequence, { uid: true });
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {}
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
