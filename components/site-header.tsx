"use client"

import Link from "next/link"
import { ChevronDown, Menu } from "lucide-react"

import { aboutItems, mineItems, navItems, siteConfig } from "@/lib/site"

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="返回主页">
        <span className="brand-mark" aria-hidden="true">{siteConfig.initials}</span>
        <span>{siteConfig.name}</span>
      </Link>

      <nav className="desktop-nav" aria-label="主导航">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}

        <details className="nav-dropdown">
          <summary>
            我的 <ChevronDown aria-hidden="true" />
          </summary>
          <div className="dropdown-panel">
            {mineItems.map((item) => (
              <Link href={item.href} key={item.href}>
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </Link>
            ))}
          </div>
        </details>

        <details className="nav-dropdown">
          <summary>
            关于 <ChevronDown aria-hidden="true" />
          </summary>
          <div className="dropdown-panel">
            {aboutItems.map((item) => (
              <Link href={item.href} key={item.href}>
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </Link>
            ))}
          </div>
        </details>

        <Link href="/links">链接</Link>
      </nav>

      <details className="mobile-menu">
        <summary aria-label="打开导航菜单"><Menu aria-hidden="true" /></summary>
        <nav className="mobile-panel" aria-label="移动端导航">
          {[...navItems, { label: "链接", href: "/links" }].map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
          <p>我的</p>
          {mineItems.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
          <p>关于</p>
          {aboutItems.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
        </nav>
      </details>
    </header>
  )
}
