import type { ReactNode } from "react"

import { TextAnimate } from "@/components/ui/text-animate"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

type SiteFrameProps = {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  variant?: "default" | "article"
}

export function SiteFrame({
  eyebrow,
  title,
  description,
  children,
  variant = "default",
}: SiteFrameProps) {
  return (
    <div className={variant === "article" ? "site-shell article-shell" : "site-shell"}>
      <a className="skip-link" href="#main">跳到主要内容</a>
      <SiteHeader />
      <main className="subpage-main" id="main">
        <section className="page-hero" aria-labelledby="page-title">
          <div className="page-hero-copy">
            <p className="eyebrow">{eyebrow}</p>
            <TextAnimate as="h1" by="word" animation="slideUp" duration={0.65} once id="page-title">
              {title}
            </TextAnimate>
            <p>{description}</p>
          </div>
        </section>
        <div className="page-content">{children}</div>
      </main>
      <SiteFooter />
    </div>
  )
}
