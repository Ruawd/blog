import { reviewAllFriendLinks } from "@/lib/friend-maintenance"
import { expirePublicCache, publicCacheTags } from "@/lib/public-cache"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const result = await reviewAllFriendLinks("scheduled-review")
  expirePublicCache([publicCacheTags.friends], ["/friends"])
  return Response.json(result)
}
