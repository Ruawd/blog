import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  CircleUserRound,
  Clapperboard,
  Heart,
  ImageIcon,
  Link2,
  UsersRound,
} from "lucide-react"

import { HomeAvatar } from "@/components/home-avatar"
import { HomeParticleBackground } from "@/components/home-background-switcher"
import { ManagedPageBody } from "@/components/managed-page-body"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { MagicCard } from "@/components/ui/magic-card"
import { Marquee } from "@/components/ui/marquee"
import { listPublishedBlogPosts } from "@/lib/blog-repository"
import { getPageContent } from "@/lib/page-content"

export const dynamic = "force-dynamic"

const heroActions = [
  { label: "认识我", href: "/about/me", icon: CircleUserRound, primary: true },
  { label: "浏览相册", href: "/mine/album", icon: ImageIcon },
  { label: "阅读文章", href: "/blog", icon: BookOpen },
] as const

const featureLinks = [
  {
    label: "关于我",
    href: "/about/me",
    description: "这里是 Ruawd 的个人主页，也是文章、影像与兴趣收藏的入口。",
    action: "认识我",
    icon: CircleUserRound,
    featured: true,
  },
  {
    label: "博客",
    href: "/blog",
    description: "技术实践、VPS 测评与数字生活记录。",
    action: "阅读文章",
    icon: BookOpen,
  },
  {
    label: "相册",
    href: "/mine/album",
    description: "按主题整理插画、日常与远方的影像切片。",
    action: "打开相册",
    icon: ImageIcon,
  },
  {
    label: "番组计划",
    href: "/mine/bangumi",
    description: "正在看、想看与看过的动画。",
    action: "查看计划",
    icon: Clapperboard,
  },
  {
    label: "友链",
    href: "/friends",
    description: "我在互联网上遇见的好邻居。",
    action: "拜访邻居",
    icon: UsersRound,
  },
  {
    label: "常用链接",
    href: "/links",
    description: "常用服务与站外入口集合。",
    action: "查看链接",
    icon: Link2,
  },
  {
    label: "打赏",
    href: "/about/support",
    description: "如果内容有帮助，可以支持本站。",
    action: "支持一下",
    icon: Heart,
  },
] as const

export default async function Home() {
  const [page, posts] = await Promise.all([getPageContent("home"), listPublishedBlogPosts()])
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

        <section className="home-explore" id="home-explore" aria-labelledby="home-explore-title">
          <header className="home-explore-heading">
            <p>EXPLORE</p>
            <h2 id="home-explore-title">站内入口</h2>
          </header>

          <div className="home-feature-grid">
            {featureLinks.map((item) => {
              const Icon = item.icon

              return (
                <MagicCard className={"featured" in item && item.featured ? "home-feature-magic is-featured" : "home-feature-magic"} key={item.href}>
                  <Link
                    className={"featured" in item && item.featured ? "home-feature-card is-featured" : "home-feature-card"}
                    href={item.href}
                  >
                    <Icon className="home-feature-icon" aria-hidden="true" />
                    <div>
                      <h3>{item.label}</h3>
                      <p>{item.description}</p>
                    </div>
                    <span className="home-feature-action">
                      {item.action}
                      <ArrowRight aria-hidden="true" />
                    </span>
                  </Link>
                </MagicCard>
              )
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
