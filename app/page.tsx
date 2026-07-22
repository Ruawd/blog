import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { BorderBeam } from "@/components/ui/border-beam"
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern"
import { TextAnimate } from "@/components/ui/text-animate"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { siteConfig } from "@/lib/site"

export default function Home() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">跳到主要内容</a>
      <SiteHeader />
      <main id="main">
        <section className="hero home-hero" aria-labelledby="hero-title">
          <InteractiveGridPattern
            aria-hidden="true"
            width={54}
            height={54}
            squares={[28, 22]}
            className="hero-grid"
            squaresClassName="hero-grid-square"
          />

          <div className="pixel-field" aria-hidden="true">
            <span className="pixel pixel-a">LOG</span>
            <span className="pixel pixel-b">+</span>
            <span className="pixel pixel-c">PHOTO</span>
            <span className="pixel pixel-d">*</span>
            <span className="pixel pixel-e">{`</>`}</span>
            <span className="pixel pixel-f">ANIME</span>
            <span className="pixel pixel-g">●</span>
            <span className="pixel pixel-h">CN</span>
          </div>

          <div className="hero-content">
            <TextAnimate as="p" by="character" animation="blurInUp" duration={0.8} once className="eyebrow">
              {"WELCOME TO MY LITTLE CORNER"}
            </TextAnimate>
            <TextAnimate as="h1" by="word" animation="slideUp" duration={0.72} delay={0.08} once className="hero-title" id="hero-title">
              {siteConfig.name}
            </TextAnimate>
            <TextAnimate as="p" by="word" animation="fadeIn" duration={0.5} delay={0.3} once className="hero-role">
              {siteConfig.title}
            </TextAnimate>
            <p className="hero-statement">{siteConfig.tagline}</p>

            <div className="hero-actions">
              <Link className="hero-cta primary" href="/blog">
                <span>阅读博客</span><ArrowRight aria-hidden="true" />
                <BorderBeam className="border-beam-motion" size={90} duration={7} colorFrom="#c6ff00" colorTo="#ffffff" />
              </Link>
              <Link className="hero-cta secondary" href="/message">
                <span>给我留言</span><ArrowRight aria-hidden="true" />
              </Link>
              <Link className="hero-cta ghost" href="/links">
                <span>常用链接</span><ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="hero-index" aria-hidden="true">HOME / 2026</div>
          <div className="scroll-cue" aria-hidden="true"><span>BLOG · PHOTO · ANIME · LIFE</span></div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
