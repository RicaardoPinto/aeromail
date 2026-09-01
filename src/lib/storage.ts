import fs from "node:fs";
import path from "node:path";
import { Contact, Identity, Signature, UserPreferences } from "./types";
import {
  generateProfessionalSignatureHtml,
  DEFAULT_BRANDING_CONFIG,
  FONT_STACK,
  SignatureBrandingConfig,
} from "./signature-generator";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

interface UserDataStore {
  identities: Identity[];
  signatures: Signature[];
  preferences: UserPreferences;
  /** Direcciones vistas en el buzon, para autocompletar destinatarios */
  contacts?: Contact[];
}

export function getDefaultSignaturesForUser(
  userId: string,
  userName?: string,
  userEmail?: string,
  userOrg?: string,
  identidad?: Partial<Identity>
): Signature[] {
  // Los datos salen de la identidad. Lo que no este definido se omite en vez
  // de rellenarse con un ejemplo: una firma con un telefono falso es peor que
  // una firma sin telefono.
  const baseConfig: SignatureBrandingConfig = {
    ...DEFAULT_BRANDING_CONFIG,
    name: identidad?.name || userName || "",
    email: identidad?.email || userEmail || "",
    company: identidad?.organization || userOrg || "",
    title: identidad?.title || "",
    phone: identidad?.phone || "",
    mobile: identidad?.mobile || "",
    website: identidad?.website || "",
    websiteUrl: identidad?.websiteUrl || identidad?.website || "",
    address: identidad?.address || "",
    logoUrl: identidad?.logoUrl || "",
    primaryColor: identidad?.brandColor || DEFAULT_BRANDING_CONFIG.primaryColor,
    linkedin: "",
    twitter: "",
    github: "",
    whatsapp: "",
  };

  const templates: {
    id: string;
    name: string;
    layout: SignatureBrandingConfig["layout"];
    isDefault: boolean;
  }[] = [
    {
      id: "sig_1",
      name: "Corporativa Ejecutiva (Recomendada)",
      layout: "executive",
      isDefault: true,
    },
    {
      id: "sig_2",
      name: "Tarjeta Moderna Compacta",
      layout: "modern-card",
      isDefault: false,
    },
    {
      id: "sig_3",
      name: "Minimalista con Acento de Marca",
      layout: "minimal-accent",
      isDefault: false,
    },
    {
      id: "sig_4",
      name: "Horizontal Compacto & Logos",
      layout: "horizontal-badge",
      isDefault: false,
    },
    {
      id: "sig_5",
      name: "Insignia Creativa con Fondo",
      layout: "creative-gradient",
      isDefault: false,
    },
  ];

  const now = new Date().toISOString();
  return templates.map((item) => ({
    id: item.id,
    userId,
    name: item.name,
    htmlContent: generateProfessionalSignatureHtml({
      ...baseConfig,
      layout: item.layout,
    }),
    isDefault: item.isDefault,
    generated: true,
    createdAt: now,
    updatedAt: now,
  }));
}

function getUserFilePath(userId: string): string {
  ensureDataDir();
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(DATA_DIR, `user_${safeId}.json`);
}

export function getUserData(
  userId: string,
  defaultEmail?: string,
  defaultName?: string
): UserDataStore {
  const filePath = getUserFilePath(userId);

  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed: UserDataStore = JSON.parse(content);
      
      // Las firmas creadas antes de introducir la marca "generated" no la traen.
      // Las cinco plantillas de la app se reconocen por su id: marcarlas es lo
      // que permite que se rehagan al cambiar los datos de la identidad. Sin
      // esto, una cuenta existente nunca veria sus datos reales en la firma.
      const idsDePlantilla = new Set(["sig_1", "sig_2", "sig_3", "sig_4", "sig_5"]);
      let marcadas = false;
      for (const firma of parsed.signatures || []) {
        if (firma.generated === undefined && idsDePlantilla.has(firma.id)) {
          firma.generated = true;
          marcadas = true;
        }
      }
      if (marcadas) saveUserData(userId, parsed);

      // Auto-migrate if user has old/legacy signatures or less than modern studio layouts
      if (
        !parsed.signatures ||
        parsed.signatures.length === 0 ||
        parsed.signatures.some((s) => s.name.includes("Texto Plano"))
      ) {
        parsed.signatures = getDefaultSignaturesForUser(
          userId,
          parsed.identities?.[0]?.name || defaultName,
          parsed.identities?.[0]?.email || defaultEmail,
          parsed.identities?.[0]?.organization || "Mi Empresa"
        );
        saveUserData(userId, parsed);
      }

      return parsed;
    } catch (err) {
      console.error("Error reading user data file:", err);
    }
  }

  // Initial seed data with all 5 modern studio signatures
  const defaultIdentities: Identity[] = [
    {
      id: "id_default",
      userId,
      name: defaultName || "Alex Rivera",
      email: defaultEmail || "usuario@tudominio.com",
      isDefault: true,
      organization: "Mi Empresa",
    },
  ];

  const defaultSignatures = getDefaultSignaturesForUser(
    userId,
    defaultName || "Alex Rivera",
    defaultEmail || "usuario@tudominio.com",
    "Mi Empresa"
  );

  const initialStore: UserDataStore = {
    identities: defaultIdentities,
    signatures: defaultSignatures,
    preferences: {
      theme: "dark",
      previewPanePosition: "right",
      messagesPerPage: 50,
      blockRemoteImages: true,
      defaultSignatureId: defaultSignatures[0]?.id || "sig_1",
      autoSaveDraftInterval: 30,
      composeFontFamily: FONT_STACK,
      composeFontSize: 14,
      composeLineHeight: 1.4,
    },
    contacts: [],
  };

  saveUserData(userId, initialStore);
  return initialStore;
}

export function saveUserData(userId: string, data: UserDataStore): void {
  ensureDataDir();
  const filePath = getUserFilePath(userId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function getSignatures(
  userId: string,
  defaultEmail?: string,
  defaultName?: string
): Signature[] {
  const store = getUserData(userId, defaultEmail, defaultName);
  return store.signatures;
}

export function saveSignature(
  userId: string,
  signature: Partial<Signature>
): Signature {
  const store = getUserData(userId);
  const now = new Date().toISOString();

  let target: Signature;
  if (signature.id) {
    const existingIndex = store.signatures.findIndex((s) => s.id === signature.id);
    if (existingIndex !== -1) {
      target = {
        ...store.signatures[existingIndex],
        ...signature,
        updatedAt: now,
      } as Signature;
      store.signatures[existingIndex] = target;
    } else {
      target = {
        id: signature.id,
        userId,
        name: signature.name || "Nueva Firma",
        htmlContent: signature.htmlContent || "",
        isDefault: signature.isDefault ?? false,
        createdAt: now,
        updatedAt: now,
      };
      store.signatures.push(target);
    }
  } else {
    target = {
      id: `sig_${Date.now()}`,
      userId,
      name: signature.name || "Nueva Firma",
      htmlContent: signature.htmlContent || "",
      isDefault: signature.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };
    store.signatures.push(target);
  }

  // If set as default, unset others
  if (target.isDefault) {
    store.signatures.forEach((s) => {
      if (s.id !== target.id) s.isDefault = false;
    });
    store.preferences.defaultSignatureId = target.id;
  }

  saveUserData(userId, store);
  return target;
}

export function deleteSignature(userId: string, signatureId: string): boolean {
  const store = getUserData(userId);
  const initialLength = store.signatures.length;
  store.signatures = store.signatures.filter((s) => s.id !== signatureId);

  if (store.signatures.length < initialLength) {
    if (!store.signatures.some((s) => s.isDefault) && store.signatures.length > 0) {
      store.signatures[0].isDefault = true;
      store.preferences.defaultSignatureId = store.signatures[0].id;
    }
    saveUserData(userId, store);
    return true;
  }
  return false;
}

export function getIdentities(
  userId: string,
  defaultEmail?: string,
  defaultName?: string
): Identity[] {
  const store = getUserData(userId, defaultEmail, defaultName);
  return store.identities;
}

export function saveIdentity(
  userId: string,
  identity: Partial<Identity>
): Identity {
  const store = getUserData(userId);
  let target: Identity;

  if (identity.id) {
    const existingIndex = store.identities.findIndex((i) => i.id === identity.id);
    if (existingIndex !== -1) {
      target = {
        ...store.identities[existingIndex],
        ...identity,
      } as Identity;
      store.identities[existingIndex] = target;
    } else {
      target = {
        id: identity.id,
        userId,
        name: identity.name || "Identidad",
        email: identity.email || "usuario@tudominio.com",
        organization: identity.organization,
        isDefault: identity.isDefault ?? false,
      };
      store.identities.push(target);
    }
  } else {
    target = {
      id: `id_${Date.now()}`,
      userId,
      name: identity.name || "Identidad",
      email: identity.email || "usuario@tudominio.com",
      organization: identity.organization,
      isDefault: identity.isDefault ?? false,
    };
    store.identities.push(target);
  }

  if (target.isDefault) {
    store.identities.forEach((i) => {
      if (i.id !== target.id) i.isDefault = false;
    });

    // Las firmas guardan HTML con los datos ya incrustados, asi que cambiar la
    // identidad no bastaria: hay que rehacerlas. Solo las generadas por la app;
    // las que el usuario haya editado se respetan.
    const regeneradas = getDefaultSignaturesForUser(
      userId,
      target.name,
      target.email,
      target.organization,
      target
    );
    const porId = new Map(regeneradas.map((f) => [f.id, f]));
    store.signatures = store.signatures.map((firma) => {
      if (!firma.generated) return firma;
      const nueva = porId.get(firma.id);
      if (!nueva) return firma;
      return {
        ...firma,
        htmlContent: nueva.htmlContent,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  saveUserData(userId, store);
  return target;
}

export function deleteIdentity(userId: string, identityId: string): boolean {
  const store = getUserData(userId);
  if (store.identities.length <= 1) return false;
  const initialLen = store.identities.length;
  store.identities = store.identities.filter((i) => i.id !== identityId);
  if (store.identities.length < initialLen) {
    if (!store.identities.some((i) => i.isDefault) && store.identities.length > 0) {
      store.identities[0].isDefault = true;
    }
    saveUserData(userId, store);
    return true;
  }
  return false;
}

export function getUserPreferences(userId: string): UserPreferences {
  const store = getUserData(userId);
  return store.preferences;
}

export function saveUserPreferences(
  userId: string,
  prefs: Partial<UserPreferences>
): UserPreferences {
  const store = getUserData(userId);
  store.preferences = {
    ...store.preferences,
    ...prefs,
  };
  saveUserData(userId, store);
  return store.preferences;
}

const MAX_CONTACTOS = 500;

/**
 * Devuelve los contactos ordenados por uso reciente y frecuencia, que es el
 * orden en que una persona espera verlos al autocompletar.
 */
export function getContacts(userId: string): Contact[] {
  const store = getUserData(userId);
  const contactos = store.contacts || [];
  return [...contactos].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.lastSeen.localeCompare(a.lastSeen);
  });
}

/**
 * Registra direcciones vistas o usadas. Se acumula el contador para que las
 * habituales suban solas, y se conserva el nombre mas informativo conocido.
 */
export function recordContacts(
  userId: string,
  entradas: { address: string; name?: string }[]
): Contact[] {
  if (entradas.length === 0) return getContacts(userId);

  const store = getUserData(userId);
  const contactos = store.contacts || [];
  const indice = new Map(contactos.map((c) => [c.address.toLowerCase(), c]));
  const ahora = new Date().toISOString();

  for (const entrada of entradas) {
    const direccion = (entrada.address || "").trim().toLowerCase();
    if (!direccion || !direccion.includes("@")) continue;

    const existente = indice.get(direccion);
    if (existente) {
      existente.count += 1;
      existente.lastSeen = ahora;
      // Un nombre real vale mas que la direccion repetida como nombre.
      if (entrada.name && entrada.name !== existente.name && entrada.name !== direccion) {
        existente.name = entrada.name;
      }
    } else {
      const nuevo: Contact = {
        address: direccion,
        name: entrada.name && entrada.name !== direccion ? entrada.name : undefined,
        lastSeen: ahora,
        count: 1,
      };
      indice.set(direccion, nuevo);
    }
  }

  // Se poda por uso, no por antiguedad: perder un contacto frecuente molesta
  // mas que conservar uno visto una vez.
  const actualizados = [...indice.values()]
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : b.lastSeen.localeCompare(a.lastSeen)))
    .slice(0, MAX_CONTACTOS);

  store.contacts = actualizados;
  saveUserData(userId, store);
  return actualizados;
}

export const getPreferences = getUserPreferences;
export const updatePreferences = saveUserPreferences;
