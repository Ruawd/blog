import type { Metadata } from "next"
import { Rss } from "lucide-react"

import { BlogExplorer, type BlogExplorerPost } from "@/components/blog-explorer"
import { SiteFrame } from "@/components/site-frame"
import { ManagedPageBody } from "@/components/managed-page-body"
import { listPublishedBlogPosts } from "@/lib/blog-repository"
import { getPageContent } from "@/lib/page-content"
import { listPostViewCounts } from "@/lib/post-view-repository"
import { createSearchAliases } from "@/lib/site-search"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "博客",
  description: "Ruawd 的技术教程、VPS 测评与自建服务记录。",
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const [blogPosts, page] = await Promise.all([listPublishedBlogPosts(), getPageContent("blog")])
  const viewCounts = listPostViewCounts(blogPosts.map((post) => post.slug))
  const { category } = await searchParams
  const publicPosts: BlogExplorerPost[] = blogPosts.map((post) => ({
    slug: post.slug,
    title: post.title,
    published: post.published,
    description: post.description,
    image: post.image,
    tags: post.tags,
    category: post.category,
    readingMinutes: post.readingMinutes,
    protected: post.protected,
    viewCount: viewCounts[post.slug] || 0,
    searchAliases: createSearchAliases([
      post.title,
      post.description,
      post.category,
      post.tags.join(" "),
      post.slug,
    ]),
  }))

  return (
    <SiteFrame
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
      heroAction={(
        <a className="blog-rss-link" href="/feed.xml" type="application/rss+xml" aria-label="订阅 Ruawd 的文章 RSS">
          <Rss aria-hidden="true" />
          <span>RSS</span>
          <small>订阅文章</small>
        </a>
      )}
    >
      <ManagedPageBody content={page.body} />
      <section className="page-section" aria-labelledby="latest-posts-title">
        <div className="page-section-heading">
          <div>
            <p className="section-kicker">LATEST NOTES</p>
            <h2 id="latest-posts-title">最近写下的</h2>
          </div>
          <p>共 {blogPosts.length} 篇文章，按发布时间从新到旧排列。</p>
        </div>

        <BlogExplorer posts={publicPosts} initialCategory={category} key={category || "all"} />
      </section>
    </SiteFrame>
  )
}
