import { randomUUID } from "node:crypto"
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, extname, join } from "node:path"

import { getDatabasePath } from "@/db"

const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/avif", ".avif"],
  ["image/gif", ".gif"],
])

function uploadDirectory(): string {
  const directory = join(/* turbopackIgnore: true */ dirname(getDatabasePath()), "uploads", "album")
  mkdirSync(directory, { recursive: true })
  return directory
}

function validSignature(type: string, bytes: Buffer): boolean {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"))
  if (type === "image/webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP"
  if (type === "image/avif") return bytes.subarray(4, 12).toString("ascii").includes("ftyp")
  return false
}

export function saveAlbumUpload(file: File): { src: string; name: string; size: number; type: string } {
  const extension = allowedTypes.get(file.type)
  if (!extension) throw new Error("仅支持 JPG、PNG、WebP、AVIF 或 GIF 图片")
  if (file.size < 32 || file.size > 20 * 1024 * 1024) throw new Error("图片大小需在 20MB 以内")
  return { src: "", name: extension, size: file.size, type: file.type }
}

export async function persistAlbumUpload(file: File): Promise<{ src: string; name: string; size: number; type: string }> {
  const checked = saveAlbumUpload(file)
  const bytes = Buffer.from(await file.arrayBuffer())
  if (!validSignature(checked.type, bytes)) throw new Error("图片文件签名与格式不匹配")
  const name = `${Date.now()}-${randomUUID().slice(0, 12)}${checked.name}`
  writeFileSync(join(uploadDirectory(), name), bytes, { flag: "wx", mode: 0o640 })
  return { src: `/api/media/album/${name}`, name, size: bytes.length, type: checked.type }
}

export function readAlbumUpload(name: string): { body: Buffer; type: string; size: number } {
  if (!/^\d{13}-[a-f0-9-]{12}\.(?:jpg|png|webp|avif|gif)$/.test(name)) throw new Error("图片文件名不正确")
  const path = join(uploadDirectory(), name)
  const extension = extname(name).toLowerCase()
  const type = [...allowedTypes.entries()].find(([, value]) => value === extension)?.[0]
  if (!type) throw new Error("图片格式不支持")
  const stats = statSync(path)
  return { body: readFileSync(path), type, size: stats.size }
}
