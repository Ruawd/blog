import { revalidatePath, revalidateTag } from "next/cache"

export const publicCacheTags = {
  album: "public-album",
  blog: "public-blog",
  friends: "public-friends",
  pages: "public-pages",
  projects: "public-projects",
} as const

export type PublicCacheTag = (typeof publicCacheTags)[keyof typeof publicCacheTags]

export function expirePublicCache(tags: PublicCacheTag[], paths: string[] = []): void {
  for (const tag of tags) revalidateTag(tag, { expire: 0 })
  for (const path of paths) revalidatePath(path)
}
