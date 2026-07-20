import Link from "next/link"

import { siteConfig } from "@/lib/site"

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>© 2026 {siteConfig.name}</span>
      <div className="footer-links">
        <Link href="/blog">博客</Link>
        <Link href="/friends">友链</Link>
        <a href={`mailto:${siteConfig.email}`}>邮件</a>
      </div>
      <Link href="/about/me">关于我 ↗</Link>
    </footer>
  )
}
