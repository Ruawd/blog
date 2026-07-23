import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  CircleUserRound,
  ImageIcon,
} from "lucide-react"

import { HomeAvatar } from "@/components/home-avatar"
import { HomeParticleBackground } from "@/components/home-background-switcher"
import { HomeBento } from "@/components/home-bento"
import { ManagedPageBody } from "@/components/managed-page-body"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Marquee } from "@/components/ui/marquee"
import { listCachedAlbumCollectionSummaries } from "@/lib/album-repository"
import { listPublishedBlogPosts } from "@/lib/blog-repository"
import { getPageContent } from "@/lib/page-content"
import { listPostViewCounts } from "@/lib/post-view-repository"
import { listPublishedProjects } from "@/lib/project-repository"

export const dynamic = "force-dynamic"

const heroActions = [
  { label: "认识我", href: "/about/me", icon: CircleUserRound, primary: true },
  { label: "浏览相册", href: "/mine/album", icon: ImageIcon },
  { label: "阅读文章", href: "/blog", icon: BookOpen },
] as const

export default async function Home() {
  const [page, posts, albums, projects] = await Promise.all([
    getPageContent("home"),
    listPublishedBlogPosts(),
    listCachedAlbumCollectionSummaries(),
    listPublishedProjects(),
  ])
  const viewCounts = listPostViewCounts(posts.map((post) => post.slug))
  const latestAlbum = [...albums].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null
  const photoCount = albums.reduce((total, album) => total + album.photoCount, 0)
  return (
    <div className="site-shell home-shell" data-home-layout="two-x-inspired-v5">
      <a className="skip-link" href="#main">跳到主要内容</a>
      <SiteHeader />
      <main id="main" className="home-main">
        <section className="home-profile" aria-labelledby="home-title">
          <HomeParticleBackground />

          <div className="home-landing-inner">
            <h1 className="sr-only" id="home-title">{page.title}</h1>
            <HomeAvatar name={page.title} note={page.description} />

            <nav className="home-hero-actions" aria-label="主页快捷入口">
              {heroActions.map((item) => {
                const Icon = item.icon

                return (
                  <Link
                    className={"primary" in item && item.primary ? "home-hero-action is-primary" : "home-hero-action"}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <a className="home-scroll-link" href="#home-explore" aria-label="继续浏览主页">
            <ChevronDown aria-hidden="true" />
          </a>
        </section>

        <ManagedPageBody content={page.body} />

        {posts.length ? (
          <section className="home-recent" aria-labelledby="home-recent-title">
            <header><p>LATEST NOTES</p><h2 id="home-recent-title">最近更新</h2></header>
            <Marquee>
              {posts.slice(0, 8).map((post) => (
                <Link href={`/blog/${post.slug}`} key={post.slug}>
                  <small>{post.category} · {post.published}</small>
                  <strong>{post.title}</strong>
                  <ArrowRight aria-hidden="true" />
                </Link>
              ))}
            </Marquee>
          </section>
        ) : null}

        <HomeBento
          postCount={posts.length}
          totalViews={Object.values(viewCounts).reduce((total, count) => total + count, 0)}
          albumCount={albums.length}
          photoCount={photoCount}
          projectCount={projects.length}
          latestPost={posts[0] || null}
          latestAlbum={latestAlbum}
        />
      </main>
      <SiteFooter />
    </div>
  )
}
