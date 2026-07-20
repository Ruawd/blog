"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ChevronDown, Menu, X } from "lucide-react"

import { aboutItems, mineItems, navItems, siteConfig } from "@/lib/site"

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const closeMenu = (restoreFocus = true) => {
    setIsMenuOpen(false)

    if (restoreFocus) {
      window.requestAnimationFrame(() => menuTriggerRef.current?.focus())
    }
  }

  useEffect(() => {
    if (!isMenuOpen) return

    const previousOverflow = document.body.style.overflow

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        closeMenu()
        return
      }

      if (event.key !== "Tab") return

      const focusableElements = menuPanelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )

      if (!focusableElements?.length) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", handleKeyDown)
    window.requestAnimationFrame(() => closeButtonRef.current?.focus())

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isMenuOpen])

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

      <button
        ref={menuTriggerRef}
        className="mobile-menu-trigger"
        type="button"
        aria-expanded={isMenuOpen}
        aria-controls="mobile-navigation"
        aria-label="打开导航菜单"
        onClick={() => setIsMenuOpen(true)}
      >
        <Menu aria-hidden="true" />
      </button>

      <div
        className="mobile-drawer"
        data-open={isMenuOpen}
        aria-hidden={!isMenuOpen}
      >
        <button
          className="mobile-backdrop"
          type="button"
          aria-label="关闭导航菜单"
          tabIndex={isMenuOpen ? 0 : -1}
          onClick={() => closeMenu()}
        />

        <div
          ref={menuPanelRef}
          className="mobile-panel"
          role="dialog"
          aria-modal="true"
          aria-label="移动端导航"
        >
          <div className="mobile-panel-header">
            <div>
              <span>导航</span>
              <small>Navigation</small>
            </div>
            <button
              ref={closeButtonRef}
              className="mobile-menu-close"
              type="button"
              aria-label="关闭导航菜单"
              tabIndex={isMenuOpen ? 0 : -1}
              onClick={() => closeMenu()}
            >
              <X aria-hidden="true" />
            </button>
          </div>

          <nav id="mobile-navigation" className="mobile-panel-links">
            {[...navItems, { label: "链接", href: "/links" }].map((item) => (
              <Link
                href={item.href}
                key={item.href}
                tabIndex={isMenuOpen ? 0 : -1}
                onClick={() => closeMenu(false)}
              >
                {item.label}
              </Link>
            ))}
            <p>我的</p>
            {mineItems.map((item) => (
              <Link
                href={item.href}
                key={item.href}
                tabIndex={isMenuOpen ? 0 : -1}
                onClick={() => closeMenu(false)}
              >
                {item.label}
              </Link>
            ))}
            <p>关于</p>
            {aboutItems.map((item) => (
              <Link
                href={item.href}
                key={item.href}
                tabIndex={isMenuOpen ? 0 : -1}
                onClick={() => closeMenu(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
