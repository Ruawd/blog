import { lookup } from "node:dns/promises"
import type { LookupAddress } from "node:dns"
import { request as httpsRequest } from "node:https"
import { isIP } from "node:net"

const userAgent = "RuawdFriendReview/1.0 (+https://p8.nz/friends)"

export class UnsafeRemoteUrlError extends Error {}

class RemoteRequestError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

type SafeResponse = {
  body: Buffer
  contentType: string
  finalUrl: URL
  status: number
}

function isBlockedIpv4(address: string): boolean {
  const parts = address.split(".").map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b, c] = parts
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && (c === 0 || c === 2))
    || (a === 192 && b === 88 && c === 99)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224
}

function isBlockedIpv6(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "")
  if (normalized === "::" || normalized === "::1") return true
  // IPv4-compatible and IPv4-mapped forms are special-purpose. Reject all of
  // them instead of trying to infer whether every textual representation is
  // public (for example ::ffff:7f00:1).
  if (normalized.startsWith("::")) return true
  const segments = normalized.split(":")
  const first = Number.parseInt(segments[0] || "0", 16)
  const second = Number.parseInt(segments[1] || "0", 16)
  const special2001 = first === 0x2001 && (
    second === 0
    || second === 2
    || (second >= 0x10 && second <= 0x2f)
    || second === 0xdb8
  )
  return /^(?:fc|fd)/.test(normalized)
    || /^fe[89ab]/.test(normalized)
    || /^fe[c-f]/.test(normalized)
    || /^ff/.test(normalized)
    || normalized === "100::"
    || normalized.startsWith("100::")
    || /^100:0*:0*:0*:/.test(normalized)
    || special2001
    || /^2002:/.test(normalized)
    || /^64:ff9b:1:/.test(normalized)
}

function isBlockedAddress(address: string): boolean {
  const version = isIP(address.replace(/^\[|\]$/g, ""))
  if (version === 4) return isBlockedIpv4(address)
  if (version === 6) return isBlockedIpv6(address)
  return true
}

function assertSafeHostname(hostnameValue: string): void {
  const hostname = hostnameValue.toLowerCase().replace(/^\[|\]$/g, "")
  if (
    hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname.endsWith(".internal")
    || hostname.endsWith(".home.arpa")
  ) {
    throw new UnsafeRemoteUrlError("链接不能指向本机或内网地址")
  }
  if (isIP(hostname) && isBlockedAddress(hostname)) {
    throw new UnsafeRemoteUrlError("链接不能指向本机、内网或保留地址")
  }
}

export function normalizePublicHttpsUrl(value: unknown, label: string, optional = false): string {
  const raw = typeof value === "string" ? value.trim() : ""
  if (!raw && optional) return ""
  if (!raw || raw.length > 2_048 || /[\u0000-\u001f\\]/.test(raw)) {
    throw new Error(`${label}格式不正确`)
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`${label}格式不正确`)
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error(`${label}必须使用不含凭据的标准 HTTPS 地址`)
  }
  assertSafeHostname(url.hostname)
  url.hash = ""
  return url.toString()
}

async function resolvePublicAddress(url: URL): Promise<{ address: string; family: 4 | 6 }> {
  assertSafeHostname(url.hostname)
  const hostname = url.hostname.replace(/^\[|\]$/g, "")
  if (isIP(hostname)) {
    return { address: hostname, family: isIP(hostname) as 4 | 6 }
  }

  let addresses: LookupAddress[]
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true })
  } catch {
    throw new RemoteRequestError("域名暂时无法解析")
  }
  if (!addresses.length) throw new RemoteRequestError("域名暂时无法解析")
  if (addresses.some((item) => isBlockedAddress(item.address))) {
    throw new UnsafeRemoteUrlError("域名解析到了本机、内网或保留地址")
  }
  const selected = addresses[0]
  return { address: selected.address, family: selected.family as 4 | 6 }
}

async function safeRequest(
  source: string,
  options: {
    label: string
    method?: "GET" | "HEAD"
    maxBytes?: number
    redirects?: number
    probeOnly?: boolean
  },
): Promise<SafeResponse> {
  const url = new URL(source)
  const pinned = await resolvePublicAddress(url)
  const method = options.method ?? "GET"
  const maxBytes = options.maxBytes ?? 1_000_000
  const redirects = options.redirects ?? 0

  return new Promise<SafeResponse>((resolve, reject) => {
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      callback()
    }
    const request = httpsRequest(url, {
      method,
      headers: {
        "user-agent": userAgent,
        accept: options.probeOnly ? "image/*,*/*;q=0.2" : "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        ...(options.probeOnly && method === "GET" ? { range: "bytes=0-4095" } : {}),
      },
      lookup: (_hostname, _lookupOptions, callback) => {
        callback(null, pinned.address, pinned.family)
      },
    }, (response) => {
      const status = response.statusCode || 0
      const location = response.headers.location
      if ([301, 302, 303, 307, 308].includes(status) && location) {
        response.resume()
        if (redirects >= 4) {
          finish(() => reject(new RemoteRequestError(`${options.label}重定向次数过多`)))
          return
        }
        let nextUrl: URL
        try {
          nextUrl = new URL(location, url)
          normalizePublicHttpsUrl(nextUrl.toString(), options.label)
        } catch (error) {
          finish(() => reject(error))
          return
        }
        finish(() => {
          void safeRequest(nextUrl.toString(), { ...options, redirects: redirects + 1 })
            .then(resolve, reject)
        })
        return
      }

      if (status < 200 || status >= 300) {
        response.resume()
        finish(() => reject(new RemoteRequestError(`${options.label}返回 HTTP ${status || "错误"}`, status)))
        return
      }

      const contentType = String(response.headers["content-type"] || "").toLowerCase()
      if (options.probeOnly) {
        response.on("error", () => {})
        response.destroy()
        finish(() => resolve({ body: Buffer.alloc(0), contentType, finalUrl: url, status }))
        return
      }

      const declaredLength = Number(response.headers["content-length"] || 0)
      if (declaredLength > maxBytes) {
        response.resume()
        finish(() => reject(new RemoteRequestError(`${options.label}页面内容过大`)))
        return
      }

      const chunks: Buffer[] = []
      let length = 0
      response.on("data", (chunk: Buffer) => {
        length += chunk.length
        if (length > maxBytes) {
          response.destroy()
          finish(() => reject(new RemoteRequestError(`${options.label}页面内容过大`)))
          return
        }
        chunks.push(chunk)
      })
      response.on("end", () => finish(() => resolve({
        body: Buffer.concat(chunks),
        contentType,
        finalUrl: url,
        status,
      })))
      response.on("error", () => finish(() => reject(new RemoteRequestError(`${options.label}读取失败`))))
    })

    request.setTimeout(7_000, () => request.destroy(new RemoteRequestError(`${options.label}连接超时`)))
    request.on("error", (error) => finish(() => reject(
      error instanceof UnsafeRemoteUrlError || error instanceof RemoteRequestError
        ? error
        : new RemoteRequestError(`${options.label}暂时无法访问`),
    )))
    request.end()
  })
}

export async function safeReadHtml(source: string, label: string): Promise<{ html: string; finalUrl: string }> {
  const response = await safeRequest(normalizePublicHttpsUrl(source, label), {
    label,
    maxBytes: 1_000_000,
  })
  if (response.contentType && !response.contentType.includes("text/html") && !response.contentType.includes("application/xhtml")) {
    throw new RemoteRequestError(`${label}不是 HTML 页面`)
  }
  return { html: response.body.toString("utf8"), finalUrl: response.finalUrl.toString() }
}

export async function safeProbeImage(source: string, label: string): Promise<void> {
  const normalized = normalizePublicHttpsUrl(source, label)
  let response: SafeResponse
  let usedGet = false
  try {
    response = await safeRequest(normalized, { label, method: "HEAD", probeOnly: true })
  } catch (error) {
    if (!(error instanceof RemoteRequestError) || ![403, 405, 501].includes(error.status || 0)) throw error
    usedGet = true
    response = await safeRequest(normalized, { label, method: "GET", probeOnly: true })
  }
  if (!usedGet && !response.contentType.startsWith("image/")) {
    response = await safeRequest(normalized, { label, method: "GET", probeOnly: true })
  }
  if (!response.contentType.startsWith("image/")) {
    throw new RemoteRequestError(`${label}没有返回图片内容`)
  }
}
