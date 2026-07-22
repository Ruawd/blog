import Image from "next/image"
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
  MessageSquare,
  UsersRound,
} from "lucide-react"

import { HomeParticleBackground } from "@/components/home-background-switcher"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { BorderBeam } from "@/components/ui/border-beam"
import { siteConfig } from "@/lib/site"

const heroActions = [
  { label: "阅读博客", href: "/blog", icon: BookOpen, primary: true },
  { label: "给我留言", href: "/message", icon: MessageSquare },
  { label: "查看友链", href: "/friends", icon: UsersRound },
] as const

const featureLinks = [
  {
    label: "博客",
    href: "/blog",
    description: "技术实践、VPS 测评与数字生活记录。",
    action: "阅读文章",
    icon: BookOpen,
    featured: true,
  },
  {
    label: "相册",
    href: "/mine/album",
    description: "日常与远方的影像切片。",
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
    label: "关于我",
    href: "/about/me",
    description: "认识屏幕后的 Ruawd。",
    action: "继续了解",
    icon: CircleUserRound,
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

export default function Home() {
  return (
    <div className="site-shell home-shell" data-home-layout="two-x-inspired-v3">
      <a className="skip-link" href="#main">跳到主要内容</a>
      <SiteHeader showBrand={false} />
      <main id="main" className="home-main">
        <section className="home-profile" aria-labelledby="home-title">
          <HomeParticleBackground />

          <div className="home-landing-inner">
            <h1 className="sr-only" id="home-title">Ruawd</h1>
            <div className="home-avatar-frame">
              <Image
                className="home-avatar-only"
                src={siteConfig.avatar}
                alt="Ruawd 的头像"
                width={320}
                height={320}
                priority
                unoptimized
              />
              <BorderBeam
                size={90}
                duration={8}
                colorFrom="#111111"
                colorTo="#b7b7b7"
                borderWidth={1}
              />
            </div>

            <nav className="home-hero-actions" aria-label="主页快捷入口">
              {heroActions.map((item) => {
                const Icon = item.icon

                return (
                  <Link
                    className={item.primary ? "home-hero-action is-primary" : "home-hero-action"}
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

        <section className="home-explore" id="home-explore" aria-labelledby="home-explore-title">
          <header className="home-explore-heading">
            <p>EXPLORE</p>
            <h2 id="home-explore-title">站内入口</h2>
          </header>

          <div className="home-feature-grid">
            {featureLinks.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  className={item.featured ? "home-feature-card is-featured" : "home-feature-card"}
                  href={item.href}
                  key={item.href}
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
              )
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
