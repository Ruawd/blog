import { reviewFriendCandidate } from "@/lib/friend-review"
import { applyFriendReview, listAdminFriendLinks, type FriendLink } from "@/lib/friend-repository"

export async function reviewAllFriendLinks(username: string): Promise<{
  friends: FriendLink[]
  checked: number
  approved: number
  pending: number
}> {
  const candidates = listAdminFriendLinks()
    .filter((friend) => friend.backlinkUrl && (friend.status === "approved" || friend.status === "pending"))
    .slice(0, 100)
  let checked = 0
  let approved = 0
  let pending = 0

  for (let index = 0; index < candidates.length; index += 4) {
    const batch = candidates.slice(index, index + 4)
    const results = await Promise.all(batch.map(async (friend) => ({
      friend,
      review: await reviewFriendCandidate(friend),
    })))
    for (const { friend, review } of results) {
      applyFriendReview(friend.id, review, username)
      checked += 1
      if (review.approved) approved += 1
      else pending += 1
    }
  }

  return { friends: listAdminFriendLinks(), checked, approved, pending }
}
