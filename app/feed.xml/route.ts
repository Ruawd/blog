import { listPublishedBlogPosts } from "@/lib/blog-repository"
import { siteConfig } from "@/lib/site"

export const dynamic = "force-dynamic"

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

export async function GET() {
  const posts = await listPublishedBlogPosts()
  const latest = posts[0]?.updated || posts[0]?.published || new Date().toISOString().slice(0, 10)
  const items = posts.slice(0, 50).map((post) => {
    const url = new URL(`/blog/${post.slug}`, siteConfig.url).toString()
    return `
      <item>
        <title>${escapeXml(post.title)}</title>
        <link>${escapeXml(url)}</link>
        <guid isPermaLink="true">${escapeXml(url)}</guid>
        <pubDate>${new Date(`${post.published}T00:00:00+08:00`).toUTCString()}</pubDate>
        <category>${escapeXml(post.category)}</category>
        <description>${escapeXml(post.description)}</description>
      </item>`
  }).join("")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>Ruawd Blog</title>
        <link>${escapeXml(siteConfig.url)}</link>
        <description>${escapeXml(siteConfig.description)}</description>
        <language>zh-CN</language>
        <lastBuildDate>${new Date(`${latest.slice(0, 10)}T00:00:00+08:00`).toUTCString()}</lastBuildDate>
        <atom:link href="${escapeXml(new URL("/feed.xml", siteConfig.url).toString())}" rel="self" type="application/rss+xml" />
        ${items}
      </channel>
    </rss>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  })
}
