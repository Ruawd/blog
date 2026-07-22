import { createHash } from "node:crypto"

import { getApprovedCommentEmail } from "@/lib/comment-repository"

export const dynamic = "force-dynamic"

const NOT_FOUND_HEADERS = {
  "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
}

function notFound() {
  return new Response(null, { status: 404, headers: NOT_FOUND_HEADERS })
}

function avatarCandidates(email: string): URL[] {
  const candidates: URL[] = []
  const qqNumber = email.match(/^([1-9]\d{4,11})@qq\.com$/i)?.[1]
  if (qqNumber) {
    const qqAvatar = new URL("https://q1.qlogo.cn/g")
    qqAvatar.searchParams.set("b", "qq")
    qqAvatar.searchParams.set("nk", qqNumber)
    qqAvatar.searchParams.set("s", "160")
    candidates.push(qqAvatar)
  }

  const hash = createHash("md5").update(email).digest("hex")
  const gravatar = new URL(`https://www.gravatar.com/avatar/${hash}`)
  gravatar.searchParams.set("s", "160")
  gravatar.searchParams.set("d", "404")
  gravatar.searchParams.set("r", "g")
  candidates.push(gravatar)
  return candidates
}

async function fetchAvatar(url: URL): Promise<Response | null> {
  try {
    const response = await fetch(url, {
      cache: "force-cache",
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(6_000),
    })
    if (!response.ok) return null

    const contentType = response.headers.get("content-type") || ""
    const contentLength = Number(response.headers.get("content-length") || 0)
    if (!contentType.startsWith("image/") || contentLength > 2_000_000) return null

    const image = await response.arrayBuffer()
    if (image.byteLength > 2_000_000) return null

    return new Response(image, {
      headers: {
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
        "content-length": String(image.byteLength),
        "content-type": contentType,
        "x-content-type-options": "nosniff",
      },
    })
  } catch {
    return null
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = Number(rawId)
  const email = getApprovedCommentEmail(id)
  if (!email) return notFound()

  for (const candidate of avatarCandidates(email)) {
    const response = await fetchAvatar(candidate)
    if (response) return response
  }
  return notFound()
}
