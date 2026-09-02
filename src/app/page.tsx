"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MailboxFolder,
  EmailSummary,
  FullEmailMessage,
  Signature,
  Identity,
  UserPreferences,
} from "@/lib/types";
import { AppHeader } from "@/components/layout/AppHeader";
import { FolderList } from "@/components/mail/FolderList";
import { MessageList } from "@/components/mail/MessageList";
import { MessageViewer } from "@/components/mail/MessageViewer";
import { ComposeModal } from "@/components/mail/ComposeModal";
import { SignatureManager } from "@/components/signatures/SignatureManager";
import { LoginForm } from "@/components/auth/LoginForm";

/** Dominio de una direccion, en minusculas. "" si no parece una direccion. */
function dominioDe(direccion?: string): string {
  if (!direccion) return "";
  const partes = direccion.toLowerCase().trim().split("@");
  return partes.length === 2 ? partes[1] : "";
}

export default function WebmailPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  const [folders, setFolders] = useState<MailboxFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("INBOX");
  const [messages, setMessages] = useState<EmailSummary[]>([]);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [currentMessage, setCurrentMessage] = useState<FullEmailMessage | null>(null);

  const [identities, setIdentities] = useState<Identity[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingViewer, setIsLoadingViewer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [hasLoadedRemoteImages, setHasLoadedRemoteImages] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [showSignatures, setShowSignatures] = useState(false);
  const [composeInitialData, setComposeInitialData] = useState<{
    to?: string;
    subject?: string;
    body?: string;
    inReplyTo?: string;
    references?: string[];
  } | undefined>();

  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");

  // Fetch session & check authentication
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setUserEmail(data.user.email);
        setUserName(data.user.name);
        setIdentities(data.identities || []);
        setSignatures(data.signatures || []);
        setPreferences(data.preferences);
        if (data.preferences?.theme) {
          setTheme(data.preferences.theme);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Apply theme class to <html>
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Fetch folders list
  const loadFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/mail/folders");
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch messages in selected folder
  // selectedUid se lee por referencia para que NO entre en las dependencias de
  // loadMessages. Estando dentro, cada clic en un mensaje cambiaba la identidad
  // de la funcion, relanzaba el efecto de carga y repetia la conexion IMAP, la
  // busqueda completa y la reescritura del fichero de contactos.
  const uidRef = useRef<number | null>(selectedUid);
  uidRef.current = selectedUid;

  const loadMessages = useCallback(
    async (folderPath: string, query?: string) => {
      setIsLoadingMessages(true);
      try {
        let url = `/api/mail/messages?folder=${encodeURIComponent(folderPath)}`;
        if (query) {
          url += `&q=${encodeURIComponent(query)}`;
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
          // Auto select first message if available
          if (data.messages?.length > 0 && !uidRef.current) {
            setSelectedUid(data.messages[0].uid);
          } else if (data.messages?.length === 0) {
            setSelectedUid(null);
            setCurrentMessage(null);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    []
  );

  // Fetch full message when selectedUid changes
  const loadFullMessage = useCallback(
    async (uid: number, allowRemoteImages = false) => {
      setIsLoadingViewer(true);
      try {
        const url = `/api/mail/message/${uid}?folder=${encodeURIComponent(
          selectedFolder
        )}&allowRemoteImages=${allowRemoteImages ? "1" : "0"}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setCurrentMessage(data.message);
          // Mark as seen in state
          setMessages((prev) =>
            prev.map((m) => (m.uid === uid ? { ...m, unread: false } : m))
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingViewer(false);
      }
    },
    [selectedFolder]
  );

  // Initial load when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadFolders();
      loadMessages(selectedFolder);
    }
  }, [isAuthenticated, selectedFolder, loadFolders, loadMessages]);

  const dominiosDeConfianza = preferences?.dominiosDeConfianza || [];

  const esDeConfianza = useCallback(
    (direccion?: string) => {
      const dominio = dominioDe(direccion);
      return !!dominio && dominiosDeConfianza.includes(dominio);
    },
    [dominiosDeConfianza]
  );

  useEffect(() => {
    if (!selectedUid) return;
    // Si ya se confia en el remitente, las imagenes se cargan de entrada y el
    // aviso ni siquiera aparece.
    const mensaje = messages.find((m) => m.uid === selectedUid);
    const confiado = esDeConfianza(mensaje?.from.address);
    setHasLoadedRemoteImages(confiado);
    loadFullMessage(selectedUid, confiado);
    // messages cambia al marcar como leido; incluirlo relanzaria la carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUid, loadFullMessage, esDeConfianza]);

  /**
   * Aceptar las imagenes de un correo pasa a valer para todo el dominio: es
   * una decision sobre en quien confias, no sobre un mensaje suelto. Repetirla
   * en cada correo del mismo remitente no aporta seguridad, solo fatiga.
   */
  const confiarEnRemitente = async () => {
    setHasLoadedRemoteImages(true);
    if (selectedUid) loadFullMessage(selectedUid, true);

    const dominio = dominioDe(currentMessage?.from.address);
    if (!dominio || dominiosDeConfianza.includes(dominio)) return;

    const actualizados = [...dominiosDeConfianza, dominio];
    setPreferences((prev) =>
      prev ? { ...prev, dominiosDeConfianza: actualizados } : prev
    );

    try {
      await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dominiosDeConfianza: actualizados }),
      });
    } catch (err) {
      console.error("No se pudo recordar el dominio de confianza:", err);
    }
  };

  // Global keyboard shortcuts (C for compose, Escape to close, / to search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const escribiendo =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable;

      // Escape debe funcionar tambien desde un campo: escribiendo en "Para:" no
      // hacia nada, ni cerrar la lista de sugerencias ni el redactor. Los demas
      // atajos son letras sueltas y ahi si hay que respetar lo que se escribe.
      if (escribiendo && e.key !== "Escape") return;

      if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setComposeInitialData(undefined);
        setShowCompose(true);
      }
      if (e.key === "Escape") {
        setShowCompose(false);
        setShowSignatures(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadFolders(), loadMessages(selectedFolder, searchQuery)]);
    if (selectedUid) {
      await loadFullMessage(selectedUid, hasLoadedRemoteImages);
    }
    setIsRefreshing(false);
  };

  const handleToggleFlag = async (
    uid: number,
    flag: "\\Flagged" | "\\Seen",
    current: boolean
  ) => {
    try {
      await fetch("/api/mail/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: selectedFolder,
          uids: [uid],
          action: current ? "remove" : "add",
          flags: [flag],
        }),
      });

      setMessages((prev) =>
        prev.map((m) => {
          if (m.uid === uid) {
            if (flag === "\\Flagged") return { ...m, flagged: !current };
            if (flag === "\\Seen") return { ...m, unread: current };
          }
          return m;
        })
      );

      if (currentMessage && currentMessage.uid === uid) {
        if (flag === "\\Flagged") {
          setCurrentMessage({ ...currentMessage, flagged: !current });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (uid: number) => {
    try {
      await fetch("/api/mail/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          folder: selectedFolder,
          uids: [uid],
        }),
      });

      setMessages((prev) => prev.filter((m) => m.uid !== uid));
      if (selectedUid === uid) {
        setSelectedUid(null);
        setCurrentMessage(null);
      }
      loadFolders();
    } catch (err) {
      console.error(err);
    }
  };

  // La carpeta de spam se detecta por su marca IMAP, con nombres habituales
  // como respaldo para servidores que no la anuncian.
  const carpetaSpam = folders.find(
    (f) =>
      (f.specialUse || "").toLowerCase().endsWith("junk") ||
      ["junk", "spam", "correo no deseado"].includes(f.name.toLowerCase())
  );
  const isSpamFolder =
    !!carpetaSpam &&
    selectedFolder.toLowerCase() === carpetaSpam.path.toLowerCase();

  const handleMarkSpam = async () => {
    if (!selectedUid) return;
    try {
      const res = await fetch("/api/mail/spam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isSpamFolder ? "unmark" : "mark",
          folder: selectedFolder,
          uids: [selectedUid],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error(data.error || "No se pudo mover el correo");
        return;
      }

      setMessages((prev) => prev.filter((m) => m.uid !== selectedUid));
      setSelectedUid(null);
      setCurrentMessage(null);
      loadFolders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReply = (mode: "reply" | "replyAll" | "forward") => {
    if (!currentMessage) return;

    let to = currentMessage.from.address;
    let subject = currentMessage.subject;

    if (mode === "forward") {
      to = "";
      subject = subject.startsWith("Fwd:") ? subject : `Fwd: ${subject}`;
    } else {
      subject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
    }

    const quoteHeader = `El ${new Date(currentMessage.date).toLocaleString()}, ${
      currentMessage.from.name || currentMessage.from.address
    } escribió:`;

    // sanitizedHtml es la version ya filtrada; htmlBody es el HTML crudo del
    // correo entrante y no debe reenviarse a terceros sin pasar por el filtro.
    const quotedBody = `<blockquote>${currentMessage.sanitizedHtml || currentMessage.textBody || ""}</blockquote>`;

    setComposeInitialData({
      to,
      subject,
      body: `<p></p><br/><br/>${quoteHeader}<br/>${quotedBody}`,
      inReplyTo: currentMessage.messageId,
      references: currentMessage.messageId ? [currentMessage.messageId] : undefined,
    });

    setShowCompose(true);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={checkSession} />;
  }

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Application Header */}
      <AppHeader
        userEmail={userEmail}
        userName={userName}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          loadMessages(selectedFolder, q);
        }}
        onOpenSignatures={() => setShowSignatures(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main 3-Pane Body */}
      <main className="flex-1 flex overflow-hidden">
        {/* 1. Folders Column */}
        <FolderList
          folders={folders}
          selectedFolder={selectedFolder}
          onSelectFolder={(folder) => {
            setSelectedFolder(folder);
            setSelectedUid(null);
            setCurrentMessage(null);
          }}
          onCompose={() => {
            setComposeInitialData(undefined);
            setShowCompose(true);
          }}
        />

        {/* 2. Message List Column */}
        <MessageList
          messages={messages}
          selectedUid={selectedUid}
          onSelectMessage={(uid) => setSelectedUid(uid)}
          onToggleFlag={handleToggleFlag}
          onDeleteMessage={handleDeleteMessage}
          isLoading={isLoadingMessages}
        />

        {/* 3. Reading Pane / Message Viewer */}
        <MessageViewer
          message={currentMessage}
          isLoading={isLoadingViewer}
          onReply={handleReply}
          onMarkSpam={handleMarkSpam}
          isSpamFolder={isSpamFolder}
          onDelete={() => selectedUid && handleDeleteMessage(selectedUid)}
          onToggleStar={() =>
            selectedUid &&
            handleToggleFlag(
              selectedUid,
              "\\Flagged",
              !!currentMessage?.flagged
            )
          }
          onLoadRemoteImages={confiarEnRemitente}
          hasLoadedRemoteImages={hasLoadedRemoteImages}
          dominioRemitente={dominioDe(currentMessage?.from.address)}
        />
      </main>

      {/* Floating Compose Modal */}
      <ComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        identities={identities}
        signatures={signatures}
        initialData={composeInitialData}
        onSentSuccess={() => {
          loadFolders();
        }}
      />

      {/* Signatures Management Modal */}
      {showSignatures && (
        <SignatureManager
          signatures={signatures}
          identities={identities}
          onSignaturesUpdated={(updated) => setSignatures(updated)}
          onIdentityUpdated={async (ident) => {
            setIdentities((prev) => [
              ident,
              ...prev.filter((i) => i.id !== ident.id).map((i) => ({ ...i, isDefault: false })),
            ]);
            // Las firmas automaticas se rehacen en el servidor al guardar la
            // identidad, asi que hay que releerlas para ver los datos nuevos.
            try {
              const res = await fetch("/api/signatures");
              const data = await res.json();
              if (data.signatures) setSignatures(data.signatures);
            } catch (err) {
              console.error(err);
            }
          }}
          onClose={() => setShowSignatures(false)}
        />
      )}
    </div>
  );
}
