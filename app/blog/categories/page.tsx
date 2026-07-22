import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Folder } from "lucide-react"

import { SiteFrame } from "@/components/site-frame"
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list"
import { listPublishedBlogPosts } from "@/lib/blog-repository"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "文章分类",
  description: "按分类浏览 Ruawd 的全部博客文章。",
}

export default async function BlogCategoriesPage() {
  const posts = await listPublishedBlogPosts()
  const counts = new Map<string, number>()
  posts.forEach((post) => counts.set(post.category, (counts.get(post.category) || 0) + 1))
  const categories = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))

  return (
    <SiteFrame
      eyebrow="BLOG / CATEGORIES"
      title="文章分类"
      description="按主题找到文章，选择一个分类即可返回博客列表继续阅读。"
    >
      <section className="page-section blog-category-directory" aria-labelledby="category-directory-title">
        <div className="page-section-heading">
          <div>
            <p className="section-kicker">ALL CATEGORIES</p>
            <h2 id="category-directory-title">全部分类</h2>
          </div>
          <Link className="category-back-link" href="/blog">
            <ArrowLeft aria-hidden="true" />
            <span>返回全部文章</span>
          </Link>
        </div>

        <AnimatedList className="blog-category-directory-grid">
          {categories.map(([category, count]) => (
            <AnimatedListItem key={category}>
              <Link className="blog-category-card" href={`/blog?category=${encodeURIComponent(category)}#latest-posts-title`}>
                <Folder aria-hidden="true" />
                <span>
                  <strong>{category}</strong>
                  <small>{count} 篇文章</small>
                </span>
                <ArrowRight aria-hidden="true" />
              </Link>
            </AnimatedListItem>
          ))}
        </AnimatedList>
      </section>
    </SiteFrame>
  )
}
