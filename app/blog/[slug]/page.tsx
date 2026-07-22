import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock3, LockKeyhole } from "lucide-react"
import { notFound } from "next/navigation"

import { ArticleMarkdown } from "@/components/article-markdown"
import { ArticleReadingTools } from "@/components/article-reading-tools"
import { CommentSection } from "@/components/comment-section"
import { ProtectedArticle } from "@/components/protected-article"
import { ResilientImage } from "@/components/resilient-image"
import { SiteFrame } from "@/components/site-frame"
import { extractArticleHeadings } from "@/lib/article-headings"
import { getPublishedBlogPost } from "@/lib/blog-repository"

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
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
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
  const post = await getPublishedBlogPost(slug)
  if (!post) notFound()
  const headings = extractArticleHeadings(post.content || "")

  return (
    <SiteFrame
      eyebrow={`BLOG / ${post.category}`}
      title={post.title}
      description={post.description}
      variant="article"
    >
      <article className="article-page">
        <div className="article-reading-layout">
          <div className="article-reading-column">
            <header className="article-details">
              <span><CalendarDays aria-hidden="true" /></span>
              <time dateTime={post.published}>
                {dateFormatter.format(new Date(`${post.published}T00:00:00+08:00`))}
              </time>
              <span><Clock3 aria-hidden="true" />约 {post.readingMinutes} 分钟</span>
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

            <CommentSection scope="article" target={post.slug} title="文章评论" />
          </div>

          <ArticleReadingTools headings={headings} />
        </div>
      </article>
    </SiteFrame>
  )
}
