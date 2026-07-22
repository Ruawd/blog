import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock3, LockKeyhole, MessageSquare } from "lucide-react"
import { notFound } from "next/navigation"

import { ArticleMarkdown } from "@/components/article-markdown"
import { ArticleReadingTools } from "@/components/article-reading-tools"
import { ProtectedArticle } from "@/components/protected-article"
import { ResilientImage } from "@/components/resilient-image"
import { SiteFrame } from "@/components/site-frame"
import { extractArticleHeadings } from "@/lib/article-headings"
import { blogPosts, getBlogPost } from "@/lib/blog-posts.generated"

export const dynamic = "force-static"
export const dynamicParams = false

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
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
  const post = getBlogPost(slug)
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

            <section className="article-comments" id="article-comments" aria-labelledby="article-comments-title">
              <p className="section-kicker">COMMENTS</p>
              <h2 id="article-comments-title" tabIndex={-1}>评论</h2>
              <p>想补充文章内容或交流细节，可以继续在留言页里说。</p>
              <Link href="/message"><MessageSquare aria-hidden="true" />前往留言</Link>
            </section>
          </div>

          <ArticleReadingTools headings={headings} />
        </div>
      </article>
    </SiteFrame>
  )
}
