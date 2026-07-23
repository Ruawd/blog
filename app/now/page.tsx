import type { Metadata } from "next"

import { ManagedPageBody } from "@/components/managed-page-body"
import { NowDashboard } from "@/components/now-dashboard"
import { SiteFrame } from "@/components/site-frame"
import { listCachedAlbumCollectionSummaries } from "@/lib/album-repository"
import { listPublishedBlogPosts } from "@/lib/blog-repository"
import { getPageContent } from "@/lib/page-content"

export const metadata: Metadata = {
  title: "此刻",
  description: "Ruawd 最近在做的事情与近期更新。",
  alternates: { canonical: "/now" },
}

export const dynamic = "force-dynamic"

export default async function NowPage() {
  const [page, posts, albums] = await Promise.all([
    getPageContent("now"),
    listPublishedBlogPosts(),
    listCachedAlbumCollectionSummaries(),
  ])
  const latestAlbum = [...albums].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null

  return (
    <SiteFrame eyebrow={page.eyebrow} title={page.title} description={page.description}>
      <ManagedPageBody content={page.body} />
      <NowDashboard
        posts={posts.slice(0, 4)}
        latestAlbum={latestAlbum}
        postCount={posts.length}
        albumCount={albums.length}
        photoCount={albums.reduce((total, album) => total + album.photoCount, 0)}
      />
    </SiteFrame>
  )
}
