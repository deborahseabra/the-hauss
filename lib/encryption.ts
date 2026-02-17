/**
 * The Hauss — AES-256-GCM Encryption Utility
 *
 * All user-generated content (entry bodies, titles, headlines, AI results)
 * is encrypted before being stored in Supabase. The encryption key lives
 * exclusively on the server — never exposed to the client.
 *
 * Storage format per field: [IV (16 bytes)] [Auth Tag (16 bytes)] [Ciphertext]
 *
 * Usage:
 *   import { encrypt, decrypt, encryptOptional, decryptOptional } from '@/lib/encryption';
 *
 *   const encrypted = encrypt("Hello, world!");       // Buffer
 *   const plaintext = decrypt(encrypted);             // "Hello, world!"
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag
const KEY_LENGTH = 32; // 256-bit key

let _cachedKey: Buffer | null = null;

/**
 * Retrieves and validates the encryption key from environment variables.
 * The key is cached after first retrieval for performance.
 *
 * @throws {Error} If ENCRYPTION_KEY is missing or malformed
 */
function getKey(): Buffer {
  if (_cachedKey) return _cachedKey;

  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error(
      "ENCRYPTION_KEY not found in environment variables. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  if (keyHex.length !== KEY_LENGTH * 2) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes). ` +
        `Got ${keyHex.length} characters.`
    );
  }

  if (!/^[0-9a-fA-F]+$/.test(keyHex)) {
    throw new Error("ENCRYPTION_KEY must contain only hexadecimal characters (0-9, a-f, A-F).");
  }

  _cachedKey = Buffer.from(keyHex, "hex");
  return _cachedKey;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * @param text - The plaintext string to encrypt
 * @returns Buffer containing [IV (16B)][AuthTag (16B)][Ciphertext]
 *
 * @example
 *   const encrypted = encrypt("My secret journal entry");
 *   // Store `encrypted` as BYTEA in Supabase
 */
export function encrypt(text: string): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack: [IV][Auth Tag][Ciphertext]
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypts a buffer that was encrypted with `encrypt()`.
 *
 * @param data - Buffer containing [IV (16B)][AuthTag (16B)][Ciphertext]
 * @returns The decrypted plaintext string
 * @throws {Error} If decryption fails (wrong key, tampered data, etc.)
 *
 * @example
 *   const plaintext = decrypt(encryptedBuffer);
 */
export function decrypt(data: Buffer): string {
  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error("Encrypted data is too short to be valid.");
  }

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Encrypts a string that may be null/undefined.
 * Returns null if input is falsy — useful for optional fields like `title_encrypted`.
 */
export function encryptOptional(text: string | null | undefined): Buffer | null {
  if (!text) return null;
  return encrypt(text);
}

/**
 * Decrypts a buffer that may be null/undefined.
 * Returns null if input is falsy — useful for optional encrypted fields.
 */
export function decryptOptional(data: Buffer | null | undefined): string | null {
  if (!data) return null;
  return decrypt(data);
}

/**
 * Encrypts multiple fields of an object at once.
 * Only processes keys ending in `_plain` and outputs them as `_encrypted`.
 *
 * @example
 *   const encrypted = encryptFields({
 *     title_plain: "My Title",
 *     body_plain: "My content",
 *   });
 *   // Returns: { title_encrypted: Buffer, body_encrypted: Buffer }
 */
export function encryptFields(
  fields: Record<string, string | null | undefined>
): Record<string, Buffer | null> {
  const result: Record<string, Buffer | null> = {};

  for (const [key, value] of Object.entries(fields)) {
    const encKey = key.replace(/_plain$/, "_encrypted");
    result[encKey] = encryptOptional(value);
  }

  return result;
}

/**
 * Decrypts multiple encrypted fields of a database row.
 * Processes keys ending in `_encrypted` and outputs them without the suffix.
 *
 * @example
 *   const row = { title_encrypted: Buffer, body_encrypted: Buffer, section: "essay" };
 *   const decrypted = decryptFields(row, ["title_encrypted", "body_encrypted"]);
 *   // Returns: { title: "My Title", body: "My content" }
 */
export function decryptFields(
  row: Record<string, unknown>,
  encryptedKeys: string[]
): Record<string, string | null> {
  const result: Record<string, string | null> = {};

  for (const key of encryptedKeys) {
    const plainKey = key.replace(/_encrypted$/, "");
    const value = row[key];
    result[plainKey] = value instanceof Buffer ? decryptOptional(value) : null;
  }

  return result;
}

/**
 * Invalidate the cached key (useful for testing or key rotation).
 */
export function clearKeyCache(): void {
  _cachedKey = null;
}
