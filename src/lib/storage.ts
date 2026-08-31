import fs from "node:fs";
import path from "node:path";
import { Identity, Signature, UserPreferences } from "./types";
import {
  generateProfessionalSignatureHtml,
  DEFAULT_BRANDING_CONFIG,
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
}

export function getDefaultSignaturesForUser(
  userId: string,
  userName?: string,
  userEmail?: string,
  userOrg?: string
): Signature[] {
  const baseConfig: SignatureBrandingConfig = {
    ...DEFAULT_BRANDING_CONFIG,
    name: userName || "Alex Rivera",
    email: userEmail || "usuario@tudominio.com",
    company: userOrg || "Mi Empresa",
    title: "Director de Operaciones",
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
    },
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

export const getPreferences = getUserPreferences;
export const updatePreferences = saveUserPreferences;
