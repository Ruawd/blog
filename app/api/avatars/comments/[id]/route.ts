import { createHash } from "node:crypto"

import { getApprovedCommentEmail } from "@/lib/comment-repository"

export const dynamic = "force-dynamic"

const NOT_FOUND_HEADERS = {
  "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
}

function notFound() {
  return new Response(null, { status: 404, headers: NOT_FOUND_HEADERS })
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = Number(rawId)
  const email = getApprovedCommentEmail(id)
  if (!email) return notFound()

  const hash = createHash("md5").update(email).digest("hex")
  const url = new URL(`https://www.gravatar.com/avatar/${hash}`)
  url.searchParams.set("s", "160")
  url.searchParams.set("d", "404")
  url.searchParams.set("r", "g")

  try {
    const response = await fetch(url, {
      cache: "force-cache",
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(6_000),
    })
    if (!response.ok) return notFound()

    const contentType = response.headers.get("content-type") || ""
    const contentLength = Number(response.headers.get("content-length") || 0)
    if (!contentType.startsWith("image/") || contentLength > 2_000_000) return notFound()

    const image = await response.arrayBuffer()
    if (image.byteLength > 2_000_000) return notFound()

    return new Response(image, {
      headers: {
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
        "content-length": String(image.byteLength),
        "content-type": contentType,
        "x-content-type-options": "nosniff",
      },
    })
  } catch {
    return notFound()
  }
}
