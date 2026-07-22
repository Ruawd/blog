import { isSameOrigin } from "@/lib/admin-session"
import { reviewFriendCandidate } from "@/lib/friend-review"
import {
  normalizeFriendApplication,
  saveFriendApplication,
} from "@/lib/friend-repository"
import { expirePublicCache, publicCacheTags } from "@/lib/public-cache"
import { clientAddress } from "@/lib/request-client"
import { consumeRateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  if (Number(request.headers.get("content-length") || 0) > 20_000) {
    return Response.json({ error: "友链申请内容过大" }, { status: 413 })
  }
  const address = clientAddress(request)
  const limit = consumeRateLimit({ action: "friend-application", actor: address, limit: 3, windowMs: 30 * 60_000 })
  if (!limit.allowed) {
    return Response.json({ error: "提交太频繁，请稍后再试" }, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    })
  }

  try {
    const input = normalizeFriendApplication(await request.json())
    const review = await reviewFriendCandidate(input)
    const application = saveFriendApplication(input, address, review)
    if (application.status === "approved") {
      expirePublicCache([publicCacheTags.friends], ["/friends"])
    }
    return Response.json({
      application: {
        id: application.id,
        name: application.name,
        url: application.url,
        status: application.status,
        reviewMessage: application.reviewMessage,
      },
    }, { status: 201 })
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "友链申请提交失败",
    }, { status: 400 })
  }
}
