import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, LockKeyhole } from "lucide-react"

import { SiteFrame } from "@/components/site-frame"
import { ResilientImage } from "@/components/resilient-image"
import { blogPosts } from "@/lib/blog-posts.generated"

export const metadata: Metadata = {
  title: "博客",
  description: "Ruawd 的技术教程、VPS 测评与自建服务记录。",
}

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

export default function BlogPage() {
  return (
    <SiteFrame
      eyebrow="JOURNAL / BLOG"
      title="博客"
      description="迁移自原来的 Firefly 博客，保留文章的发布日期、分类、标签与正文。"
    >
      <section className="page-section" aria-labelledby="latest-posts-title">
        <div className="page-section-heading">
          <div>
            <p className="section-kicker">LATEST NOTES</p>
            <h2 id="latest-posts-title">最近写下的</h2>
          </div>
          <p>共 {blogPosts.length} 篇文章，按发布时间从新到旧排列。</p>
        </div>

        <div className="post-list">
          {blogPosts.map((post, index) => (
            <article className="post-card" key={post.slug}>
              <header className="post-meta">
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <time dateTime={post.published}>
                  {dateFormatter.format(new Date(`${post.published}T00:00:00+08:00`))}
                </time>
                <span>{post.category}</span>
              </header>

              <div className="post-copy">
                <h3>
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h3>
                <p>{post.description}</p>
              </div>

              {post.image ? (
                <Link
                  className="post-cover-link"
                  href={`/blog/${post.slug}`}
                  aria-label={`阅读《${post.title}》`}
                  tabIndex={-1}
                >
                  <ResilientImage
                    className="post-cover"
                    src={post.image}
                    alt=""
                    width={640}
                    height={360}
                    loading={index < 3 ? "eager" : "lazy"}
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </Link>
              ) : null}

              <footer className="post-footer">
                <ul className="post-tags" aria-label="文章标签">
                  {post.tags.map((tag) => (
                    <li key={tag}>#{tag}</li>
                  ))}
                </ul>
                <Link className="post-read-link" href={`/blog/${post.slug}`}>
                  {post.protected ? <LockKeyhole aria-hidden="true" /> : null}
                  <span>{post.protected ? "密码保护" : `约 ${post.readingMinutes} 分钟`}</span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </footer>
            </article>
          ))}
        </div>
      </section>
    </SiteFrame>
  )
}
