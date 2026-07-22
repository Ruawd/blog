import { isSameOrigin } from "@/lib/admin-session"
import { ensureCommentActor } from "@/lib/comment-actor"
import { toggleCommentInteraction } from "@/lib/comment-repository"
import { clientAddress } from "@/lib/request-client"
import { consumeRateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  if (Number(request.headers.get("content-length") || 0) > 2_000) {
    return Response.json({ error: "回应内容过大" }, { status: 413 })
  }
  const limit = consumeRateLimit({ action: "comment-interaction", actor: clientAddress(request), limit: 80, windowMs: 10 * 60_000 })
  if (!limit.allowed) {
    return Response.json({ error: "操作太频繁，请稍后再试" }, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    })
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
