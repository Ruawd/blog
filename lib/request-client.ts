import { isIP } from "node:net"

export function clientAddress(request: Request): string {
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for")?.split(",")[0],
  ]
  for (const candidate of candidates) {
    const value = candidate?.trim().replace(/^\[|\]$/g, "") || ""
    if (isIP(value)) return value
  }
  return "unknown"
}
