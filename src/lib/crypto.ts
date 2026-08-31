import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { UserSession } from "./types";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;

// Secret key derivation (32 bytes for AES-256)
function getMasterKey(): Buffer {
  const secret = process.env.APP_SECRET || "aeromail-super-secure-production-secret-key-32b!";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a string (e.g. password or sensitive session data) with AES-256-GCM.
 * Output format: base64(iv + authTag + cipherText)
 */
export function encryptData(plainText: string): string {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);

  let encrypted = cipher.update(plainText, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine IV (12) + AuthTag (16) + EncryptedData
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64url");
}

/**
 * Decrypts a base64url AES-256-GCM encrypted payload.
 */
export function decryptData(cipherPayload: string): string {
  try {
    const masterKey = getMasterKey();
    const combined = Buffer.from(cipherPayload, "base64url");

    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error("Invalid cipher payload length");
    }

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err);
    throw new Error("Failed to decrypt secure data");
  }
}

/**
 * Creates a signed JWT session cookie for the user.
 */
export async function createSessionToken(session: UserSession): Promise<string> {
  const secretKey = getMasterKey();
  
  // Encrypt the credentials payload inside the token for zero-exposure
  const encryptedAccount = encryptData(JSON.stringify(session.account));
  
  const token = await new SignJWT({
    userId: session.userId,
    email: session.email,
    name: session.name,
    encryptedAccount,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // 7 days session
    .sign(secretKey);

  return token;
}

/**
 * Verifies and decodes a signed session JWT token.
 */
export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const secretKey = getMasterKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (!payload || !payload.email || !payload.encryptedAccount) {
      return null;
    }

    const decryptedAccount = JSON.parse(decryptData(payload.encryptedAccount as string));

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: (payload.name as string) || (payload.email as string),
      account: decryptedAccount,
      exp: payload.exp,
    };
  } catch (err) {
    return null;
  }
}
