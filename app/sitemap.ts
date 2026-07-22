import type { MetadataRoute } from "next"

import { listPublishedBlogPosts } from "@/lib/blog-repository"
import { listCachedAlbumCollections } from "@/lib/album-repository"
import { getPageContent, pageContentDefaults, type PageContentKey } from "@/lib/page-content"
import { siteConfig } from "@/lib/site"

export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listPublishedBlogPosts()
  const albums = await listCachedAlbumCollections()
  const pages = await Promise.all(
    (Object.keys(pageContentDefaults) as PageContentKey[]).map(getPageContent),
  )

  return [
    ...pages.map((page) => ({
      url: new URL(page.path, siteConfig.url).toString(),
      lastModified: page.updatedAt ? new Date(page.updatedAt) : new Date("2026-01-01T00:00:00+08:00"),
      changeFrequency: page.key === "home" ? "weekly" as const : "monthly" as const,
      priority: page.key === "home" ? 1 : page.key === "blog" ? 0.9 : 0.7,
    })),
    {
      url: new URL("/blog/categories", siteConfig.url).toString(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    ...albums.map((album) => ({
      url: new URL(`/mine/album/${album.slug}`, siteConfig.url).toString(),
      lastModified: new Date(album.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...posts.map((post) => ({
      url: new URL(`/blog/${post.slug}`, siteConfig.url).toString(),
      lastModified: new Date(`${post.updated || post.published}T00:00:00+08:00`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ]
}
