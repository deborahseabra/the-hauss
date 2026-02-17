/**
 * The Hauss — Browser-compatible AES-256-GCM Encryption
 *
 * Uses the Web Crypto API (SubtleCrypto) for encryption/decryption.
 * Binary format is compatible with the Node.js version in lib/encryption.ts:
 *   [IV (16 bytes)][Auth Tag (16 bytes)][Ciphertext]
 *
 * Web Crypto's AES-GCM outputs [Ciphertext][AuthTag] concatenated,
 * so this module rearranges bytes for cross-platform compatibility.
 */

const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

let _cachedKey = null;

function hexToBytes(hex) {
  const clean = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function getKey() {
  if (_cachedKey) return _cachedKey;

  const keyHex = import.meta.env.VITE_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("VITE_ENCRYPTION_KEY not found in environment variables.");
  }
  if (keyHex.length !== KEY_LENGTH * 2) {
    throw new Error(`VITE_ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters.`);
  }

  const keyBytes = hexToBytes(keyHex);
  _cachedKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return _cachedKey;
}

/**
 * Encrypts plaintext and returns a hex string suitable for Supabase BYTEA.
 * Output format: \x[IV 16B][AuthTag 16B][Ciphertext]
 */
export async function encrypt(text) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(text);

  // Web Crypto returns [Ciphertext][AuthTag] concatenated
  const encryptedWithTag = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: AUTH_TAG_LENGTH * 8 },
    key,
    encoded
  );

  const result = new Uint8Array(encryptedWithTag);
  const ciphertext = result.slice(0, result.length - AUTH_TAG_LENGTH);
  const authTag = result.slice(result.length - AUTH_TAG_LENGTH);

  // Rearrange to Node.js format: [IV][AuthTag][Ciphertext]
  const packed = new Uint8Array(IV_LENGTH + AUTH_TAG_LENGTH + ciphertext.length);
  packed.set(iv, 0);
  packed.set(authTag, IV_LENGTH);
  packed.set(ciphertext, IV_LENGTH + AUTH_TAG_LENGTH);

  return "\\x" + bytesToHex(packed);
}

/**
 * Decrypts a hex string (from Supabase BYTEA) back to plaintext.
 * Input format: \x[IV 16B][AuthTag 16B][Ciphertext]  OR  plain hex string
 */
export async function decrypt(hexString) {
  if (!hexString) return null;

  const key = await getKey();
  const data = hexToBytes(hexString);

  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error("Encrypted data is too short to be valid.");
  }

  const iv = data.slice(0, IV_LENGTH);
  const authTag = data.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.slice(IV_LENGTH + AUTH_TAG_LENGTH);

  // Web Crypto expects [Ciphertext][AuthTag] concatenated
  const combined = new Uint8Array(ciphertext.length + AUTH_TAG_LENGTH);
  combined.set(ciphertext, 0);
  combined.set(authTag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: AUTH_TAG_LENGTH * 8 },
    key,
    combined
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Decrypts a hex string that may be null/undefined.
 * Returns null if input is falsy.
 */
export async function decryptOptional(hexString) {
  if (!hexString) return null;
  return decrypt(hexString);
}
