import { isSameOrigin } from "@/lib/admin-session"
import { reviewFriendCandidate } from "@/lib/friend-review"
import {
  normalizeFriendApplication,
  saveFriendApplication,
} from "@/lib/friend-repository"

export const dynamic = "force-dynamic"

const attempts = new Map<string, number[]>()

function clientAddress(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local"
}

function isRateLimited(address: string): boolean {
  const now = Date.now()
  const recent = (attempts.get(address) ?? []).filter((time) => now - time < 30 * 60_000)
  attempts.set(address, recent)
  if (recent.length >= 3) return true
  recent.push(now)
  return false
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  if (Number(request.headers.get("content-length") || 0) > 20_000) {
    return Response.json({ error: "友链申请内容过大" }, { status: 413 })
  }
  const address = clientAddress(request)
  if (isRateLimited(address)) {
    return Response.json({ error: "提交太频繁，请半小时后再试" }, { status: 429 })
  }

  try {
    const input = normalizeFriendApplication(await request.json())
    const review = await reviewFriendCandidate(input)
    const application = saveFriendApplication(input, address, review)
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
