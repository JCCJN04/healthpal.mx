/**
 * Client-side encryption utilities for HealthPal.mx medical documents.
 * Uses Web Crypto API only. Private keys never leave the browser unencrypted.
 *
 * Scheme:
 *   - RSA-OAEP 2048-bit keypair per user (public key in DB, private key wrapped with password)
 *   - PBKDF2 (600k, SHA-256) → AES-256-GCM key wraps the RSA private key
 *   - AES-256-GCM key per document (wrapped with user RSA public key, stored in document_keys)
 *   - Sharing: re-wrap doc AES key with recipient's RSA public key
 */

const PBKDF2_ITERATIONS = 600_000

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

/** Derive AES-256-GCM key from password + salt via PBKDF2 (for wrapping RSA private key) */
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const rawKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as Uint8Array<ArrayBuffer>, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  )
}

/** Generate RSA-OAEP 2048-bit keypair for a user */
export async function generateUserKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['wrapKey', 'unwrapKey']
  )
}

/** Export RSA public key as base64 SPKI for storage in DB */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey('spki', key)
  return bufferToBase64(spki)
}

/** Import RSA public key from base64 SPKI */
export async function importPublicKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    base64ToBuffer(base64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['wrapKey']
  )
}

/** Wrap RSA private key with password-derived AES-GCM key */
export async function wrapPrivateKey(
  privateKey: CryptoKey,
  password: string
): Promise<{ wrappedPrivateKey: string; wrapIv: string; wrapSalt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const passwordKey = await deriveKeyFromPassword(password, salt)

  const wrappedBuffer = await crypto.subtle.wrapKey('pkcs8', privateKey, passwordKey, {
    name: 'AES-GCM',
    iv,
  })

  return {
    wrappedPrivateKey: bufferToBase64(wrappedBuffer),
    wrapIv: bufferToBase64(iv.buffer),
    wrapSalt: bufferToBase64(salt.buffer),
  }
}

/** Unwrap RSA private key using password */
export async function unwrapPrivateKey(
  wrappedPrivateKey: string,
  wrapIv: string,
  wrapSalt: string,
  password: string
): Promise<CryptoKey> {
  const saltBytes = new Uint8Array(base64ToBuffer(wrapSalt))
  const ivBytes = new Uint8Array(base64ToBuffer(wrapIv))
  const passwordKey = await deriveKeyFromPassword(password, saltBytes)

  return crypto.subtle.unwrapKey(
    'pkcs8',
    base64ToBuffer(wrappedPrivateKey),
    passwordKey,
    { name: 'AES-GCM', iv: ivBytes },
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['unwrapKey']
  )
}

/** Generate a random AES-256-GCM key for a document */
export async function generateDocumentKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

/** Wrap document AES key with user's RSA public key */
export async function wrapDocumentKey(docKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
  const wrappedBuffer = await crypto.subtle.wrapKey('raw', docKey, publicKey, { name: 'RSA-OAEP' })
  return bufferToBase64(wrappedBuffer)
}

/** Unwrap document AES key with user's RSA private key */
export async function unwrapDocumentKey(wrappedKey: string, privateKey: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    base64ToBuffer(wrappedKey),
    privateKey,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

/** Encrypt a File. Returns encrypted bytes and the IV needed for decryption. */
export async function encryptFile(
  file: File,
  docKey: CryptoKey
): Promise<{ encryptedData: ArrayBuffer; docIv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const fileBuffer = await file.arrayBuffer()
  const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, docKey, fileBuffer)
  return { encryptedData, docIv: bufferToBase64(iv.buffer) }
}

/** Decrypt an encrypted document blob. Returns decrypted ArrayBuffer. */
export async function decryptFileBuffer(
  encryptedData: ArrayBuffer,
  docIv: string,
  docKey: CryptoKey
): Promise<ArrayBuffer> {
  const iv = new Uint8Array(base64ToBuffer(docIv))
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, docKey, encryptedData)
}
