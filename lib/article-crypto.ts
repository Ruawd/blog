import type { EncryptedBlogContent } from "@/lib/blog-posts.generated"

const PBKDF2_ITERATIONS = 180_000

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function encodeBase64(value: Uint8Array) {
  let binary = ""
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary)
}

async function deriveArticleKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  usage: KeyUsage[],
) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  )

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    usage,
  )
}

export async function decryptArticleContent(encrypted: EncryptedBlogContent, password: string) {
  const salt = decodeBase64(encrypted.salt)
  const key = await deriveArticleKey(password, salt, encrypted.iterations, ["decrypt"])
  const plainBuffer = await crypto.subtle.decrypt(
    { name: encrypted.algorithm, iv: decodeBase64(encrypted.iv) },
    key,
    decodeBase64(encrypted.payload),
  )
  return new TextDecoder().decode(plainBuffer)
}

export async function encryptArticleContent(content: string, password: string): Promise<EncryptedBlogContent> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveArticleKey(password, salt, PBKDF2_ITERATIONS, ["encrypt"])
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(content),
  )

  return {
    algorithm: "AES-GCM",
    iterations: PBKDF2_ITERATIONS,
    salt: encodeBase64(salt),
    iv: encodeBase64(iv),
    payload: encodeBase64(new Uint8Array(encrypted)),
  }
}
