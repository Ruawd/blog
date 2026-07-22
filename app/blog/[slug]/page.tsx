import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Clock3, History, LockKeyhole } from "lucide-react"
import { notFound } from "next/navigation"

import { ArticleMarkdown } from "@/components/article-markdown"
import { ArticleReadingTools } from "@/components/article-reading-tools"
import { CommentSection } from "@/components/comment-section"
import { PostViewCount } from "@/components/post-view-count"
import { ProtectedArticle } from "@/components/protected-article"
import { ResilientImage } from "@/components/resilient-image"
import { SiteFrame } from "@/components/site-frame"
import { extractArticleHeadings } from "@/lib/article-headings"
import { getPublishedBlogPost, listPublishedBlogPosts } from "@/lib/blog-repository"
import { getPostViewCount } from "@/lib/post-view-repository"
import { siteConfig } from "@/lib/site"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedBlogPost(slug)
  if (!post) return {}

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `/blog/${post.slug}`,
      publishedTime: post.published,
      modifiedTime: post.updated,
      tags: post.tags,
      images: post.image ? [{ url: post.image }] : undefined,
    },
  }
}

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
})

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [post, posts] = await Promise.all([
    getPublishedBlogPost(slug),
    listPublishedBlogPosts(),
  ])
  if (!post) notFound()
  const initialViewCount = getPostViewCount(post.slug)
  const headings = extractArticleHeadings(post.content || "")
  const currentIndex = posts.findIndex((item) => item.slug === post.slug)
  const newerPost = currentIndex > 0 ? posts[currentIndex - 1] : null
  const olderPost = currentIndex >= 0 && currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null
  const relatedPosts = posts
    .filter((item) => item.slug !== post.slug)
    .map((item) => ({
      item,
      score: (item.category === post.category ? 4 : 0)
        + item.tags.filter((tag) => post.tags.includes(tag)).length * 2,
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || right.item.published.localeCompare(left.item.published))
    .slice(0, 3)
    .map(({ item }) => item)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: `${post.published}T00:00:00+08:00`,
    dateModified: `${post.updated || post.published}T00:00:00+08:00`,
    mainEntityOfPage: new URL(`/blog/${post.slug}`, siteConfig.url).toString(),
    author: { "@type": "Person", name: siteConfig.name, url: siteConfig.url },
    publisher: { "@type": "Person", name: siteConfig.name, url: siteConfig.url },
    image: post.image || new URL("/opengraph-image", siteConfig.url).toString(),
    keywords: post.tags.join(", "),
    articleSection: post.category,
    isAccessibleForFree: !post.protected,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: { "@type": "ViewAction" },
      userInteractionCount: initialViewCount,
    },
  }

  return (
    <SiteFrame
      eyebrow={`BLOG / ${post.category}`}
      title={post.title}
      description={post.description}
      variant="article"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }}
      />
      <article className="article-page">
        <div className="article-reading-layout">
          <div className="article-reading-column">
            <header className="article-details">
              <span><CalendarDays aria-hidden="true" /></span>
              <time dateTime={post.published}>
                {dateFormatter.format(new Date(`${post.published}T00:00:00+08:00`))}
              </time>
              <span><Clock3 aria-hidden="true" />约 {post.readingMinutes} 分钟</span>
              {post.updated && post.updated !== post.published ? (
                <span><History aria-hidden="true" />更新于 {dateFormatter.format(new Date(`${post.updated}T00:00:00+08:00`))}</span>
              ) : null}
              <PostViewCount key={post.slug} slug={post.slug} initialCount={initialViewCount} track showLabel />
              {post.protected ? <span><LockKeyhole aria-hidden="true" />密码保护</span> : null}
              <ul aria-label="文章标签">
                {post.tags.map((tag) => <li key={tag}>#{tag}</li>)}
              </ul>
            </header>

            {post.image ? (
              <ResilientImage
                className="article-cover"
                src={post.image}
                alt=""
                width={1600}
                height={900}
                fetchPriority="high"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : null}

            {post.protected && post.encrypted ? (
              <ProtectedArticle encrypted={post.encrypted} passwordHint={post.passwordHint} />
            ) : (
              <ArticleMarkdown content={post.content || ""} />
            )}

            <footer className="article-footer">
              <Link href="/blog"><ArrowLeft aria-hidden="true" />返回博客</Link>
              {post.sourceLink ? (
                <a href={post.sourceLink} target="_blank" rel="noreferrer">
                  查看原始测试报告<ArrowUpRight aria-hidden="true" />
                </a>
              ) : null}
            </footer>

            {(newerPost || olderPost) ? (
              <nav className="article-neighbor-nav" aria-label="相邻文章">
                {newerPost ? (
                  <Link href={`/blog/${newerPost.slug}`}>
                    <ArrowLeft aria-hidden="true" />
                    <span><small>更新一篇</small><strong>{newerPost.title}</strong></span>
                  </Link>
                ) : <span />}
                {olderPost ? (
                  <Link href={`/blog/${olderPost.slug}`}>
                    <span><small>更早一篇</small><strong>{olderPost.title}</strong></span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                ) : <span />}
              </nav>
            ) : null}

            {relatedPosts.length ? (
              <section className="article-related" aria-labelledby="article-related-title">
                <header>
                  <p className="section-kicker">KEEP READING</p>
                  <h2 id="article-related-title">继续阅读</h2>
                </header>
                <div>
                  {relatedPosts.map((item) => (
                    <Link href={`/blog/${item.slug}`} key={item.slug}>
                      <small>{item.category} · {item.readingMinutes} 分钟</small>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <CommentSection scope="article" target={post.slug} title="文章评论" />
          </div>

          <ArticleReadingTools headings={headings} />
        </div>
      </article>
    </SiteFrame>
  )
}
