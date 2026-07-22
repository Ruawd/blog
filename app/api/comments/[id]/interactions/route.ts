import { isSameOrigin } from "@/lib/admin-session"
import { ensureCommentActor } from "@/lib/comment-actor"
import { toggleCommentInteraction } from "@/lib/comment-repository"

export const dynamic = "force-dynamic"

const attempts = new Map<string, number[]>()

function clientAddress(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local"
}

function isRateLimited(address: string): boolean {
  const now = Date.now()
  const recent = (attempts.get(address) ?? []).filter((time) => now - time < 10 * 60_000)
  attempts.set(address, recent)
  if (recent.length >= 80) return true
  recent.push(now)
  return false
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  if (Number(request.headers.get("content-length") || 0) > 2_000) {
    return Response.json({ error: "回应内容过大" }, { status: 413 })
  }
  if (isRateLimited(clientAddress(request))) {
    return Response.json({ error: "操作太频繁，请稍后再试" }, { status: 429 })
  }

  try {
    const id = Number((await params).id)
    const body = await request.json() as Record<string, unknown>
    const actor = ensureCommentActor(request)
    const interaction = toggleCommentInteraction(id, body.kind, actor.hash)
    return Response.json({ interaction }, {
      headers: actor.setCookie ? { "set-cookie": actor.setCookie } : undefined,
    })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "回应失败" }, { status: 400 })
  }
}
