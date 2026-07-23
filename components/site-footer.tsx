import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { siteConfig } from "@/lib/site"

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} {siteConfig.name}</span>
      <div className="footer-links">
        <Link href="/blog">博客</Link>
        <Link href="/projects">项目</Link>
        <Link href="/mine/album">相册</Link>
        <Link href="/friends">友链</Link>
        <a href={`mailto:${siteConfig.email}`}>邮件</a>
      </div>
      <Link href="/about/me">
        关于我
        <ArrowRight aria-hidden="true" />
      </Link>
    </footer>
  )
}
