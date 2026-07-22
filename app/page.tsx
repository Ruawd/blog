import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, Mail } from "lucide-react"

import { HomeBackgroundSwitcher } from "@/components/home-background-switcher"
import { TextAnimate } from "@/components/ui/text-animate"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { siteConfig } from "@/lib/site"

const socialLinks = [
  { label: "GitHub", href: siteConfig.github },
  { label: "Bilibili", href: siteConfig.bilibili },
]

const homeLinks = [
  { label: "博客", href: "/blog", description: "技术与生活记录" },
  { label: "留言", href: "/message", description: "说点什么" },
  { label: "友链", href: "/friends", description: "互联网邻居" },
  { label: "相册", href: "/mine/album", description: "日常切片" },
  { label: "番组计划", href: "/mine/bangumi", description: "观看清单" },
  { label: "关于我", href: "/about/me", description: "认识 Ruawd" },
  { label: "打赏", href: "/about/support", description: "支持本站" },
  { label: "常用链接", href: "/links", description: "快速入口" },
]

export default function Home() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">跳到主要内容</a>
      <SiteHeader />
      <main id="main" className="home-main">
        <section className="home-profile" aria-labelledby="hero-title">
          <HomeBackgroundSwitcher />

          <div className="home-profile-inner">
            <TextAnimate as="p" by="character" animation="blurInUp" duration={0.68} once className="eyebrow home-eyebrow">
              {"WELCOME TO MY PERSONAL SITE"}
            </TextAnimate>

            <h1 className="home-title" id="hero-title">
              <TextAnimate as="span" by="character" animation="slideUp" duration={0.62} once>
                {siteConfig.name}
              </TextAnimate>
              <span className="home-avatar-wrap">
                <Image
                  className="home-avatar"
                  src={siteConfig.avatar}
                  alt="Ruawd 的头像"
                  width={224}
                  height={224}
                  priority
                />
              </span>
              <TextAnimate as="span" by="word" animation="slideUp" duration={0.62} delay={0.08} once>
                {"的个人站"}
              </TextAnimate>
            </h1>

            <p className="home-tagline">{siteConfig.tagline}</p>
            <p className="home-signature">Protect what you love, and record it carefully.</p>
          </div>

          <div className="home-profile-index" aria-hidden="true">
            <span>RUAWD / BLOG</span>
            <span>SINCE 2025</span>
          </div>
        </section>

        <section className="home-directory" aria-labelledby="home-directory-title">
          <header className="home-directory-heading">
            <div>
              <p className="section-kicker">DIRECTORY / 目录</p>
              <h2 id="home-directory-title">从这里开始</h2>
            </div>
            <p>博客、生活记录和我在互联网上留下的入口，都放在这里。</p>
          </header>

          <div className="home-directory-grid">
            <section className="home-link-group" aria-labelledby="social-title">
              <div className="home-group-heading">
                <span>01</span>
                <h3 id="social-title">社交</h3>
              </div>
              <div className="home-social-links">
                {socialLinks.map((item) => (
                  <a href={item.href} target="_blank" rel="noreferrer" key={item.href}>
                    <span>{item.label}</span>
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                ))}
                <a href={`mailto:${siteConfig.email}`}>
                  <span>邮件</span>
                  <Mail aria-hidden="true" />
                </a>
              </div>
            </section>

            <section className="home-link-group" aria-labelledby="navigate-title">
              <div className="home-group-heading">
                <span>02</span>
                <h3 id="navigate-title">导航</h3>
              </div>
              <div className="home-nav-links">
                {homeLinks.map((item) => (
                  <Link href={item.href} key={item.href}>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
