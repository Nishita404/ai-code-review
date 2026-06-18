import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not configured in the environment.");
  }
  // Standardise the secret to a 32-byte key via SHA-256
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a string using AES-256-GCM.
 * Returns a colon-separated string in the format: iv:encryptedText:authTag
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  return `${iv.toString("hex")}:${encrypted}:${authTag}`;
}

/**
 * Decrypts a colon-separated string (iv:encryptedText:authTag) using AES-256-GCM.
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format. Expected iv:text:authTag");
  }
  
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const authTag = Buffer.from(parts[2], "hex");
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}
