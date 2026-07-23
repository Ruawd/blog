import type { Image, Link, Root } from "mdast"
import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"
import { visit } from "unist-util-visit"

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

function wrapCdata(value: string): string {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`
}

function resolveFeedUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value, baseUrl)
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function remarkResolveFeedUrls({ baseUrl }: { baseUrl: string }) {
  return (tree: Root) => {
    visit(tree, (node) => {
      if (node.type !== "link" && node.type !== "image") return
      const resource = node as Link | Image
      const resolvedUrl = resolveFeedUrl(resource.url, baseUrl)
      if (resolvedUrl) resource.url = resolvedUrl
    })
  }
}

function renderMarkdownForFeed(content: string, articleUrl: string): string {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkResolveFeedUrls, { baseUrl: articleUrl })
    .use(remarkRehype)
    .use(rehypeStringify)
    .processSync(content)
    .toString()
}

function renderFeedContent(post: Awaited<ReturnType<typeof listPublishedBlogPosts>>[number], articleUrl: string): string {
  if (post.protected) {
    return renderMarkdownForFeed(
      `${post.description}\n\n[本文受密码保护，请前往网站解锁阅读。](${articleUrl})`,
      articleUrl,
    )
  }
  return renderMarkdownForFeed(post.content?.trim() || post.description, articleUrl)
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
        <content:encoded>${wrapCdata(renderFeedContent(post, url))}</content:encoded>
      </item>`
  }).join("")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
      <channel>
        <title>Ruawd 的文章</title>
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
