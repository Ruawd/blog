"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ChevronDown, Menu, X } from "lucide-react"

import { aboutItems, mineItems, navItems, siteConfig } from "@/lib/site"

type SiteHeaderProps = {
  showBrand?: boolean
}

export function SiteHeader({ showBrand = true }: SiteHeaderProps) {
  const [openDesktopMenu, setOpenDesktopMenu] = useState<"mine" | "about" | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const desktopNavRef = useRef<HTMLElement>(null)
  const mineMenuButtonRef = useRef<HTMLButtonElement>(null)
  const aboutMenuButtonRef = useRef<HTMLButtonElement>(null)
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
    if (!openDesktopMenu) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!desktopNavRef.current?.contains(event.target as Node)) {
        setOpenDesktopMenu(null)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return

      event.preventDefault()
      const buttonRef = openDesktopMenu === "mine" ? mineMenuButtonRef : aboutMenuButtonRef
      setOpenDesktopMenu(null)
      window.requestAnimationFrame(() => buttonRef.current?.focus())
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [openDesktopMenu])

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
      {showBrand ? (
        <Link className="brand" href="/" aria-label="返回主页">
          <span className="brand-mark" aria-hidden="true">{siteConfig.initials}</span>
          <span>{siteConfig.name}</span>
        </Link>
      ) : (
        <span className="brand-placeholder" aria-hidden="true" />
      )}

      <nav ref={desktopNavRef} className="desktop-nav" aria-label="主导航">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}

        <div className="nav-dropdown" data-open={openDesktopMenu === "mine"}>
          <button
            ref={mineMenuButtonRef}
            type="button"
            aria-expanded={openDesktopMenu === "mine"}
            aria-controls="mine-dropdown"
            onClick={() => setOpenDesktopMenu((current) => current === "mine" ? null : "mine")}
          >
            我的 <ChevronDown aria-hidden="true" />
          </button>
          <div
            id="mine-dropdown"
            className="dropdown-panel"
            aria-hidden={openDesktopMenu !== "mine"}
          >
            {mineItems.map((item) => (
              <Link
                href={item.href}
                key={item.href}
                tabIndex={openDesktopMenu === "mine" ? 0 : -1}
                onClick={() => setOpenDesktopMenu(null)}
              >
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="nav-dropdown" data-open={openDesktopMenu === "about"}>
          <button
            ref={aboutMenuButtonRef}
            type="button"
            aria-expanded={openDesktopMenu === "about"}
            aria-controls="about-dropdown"
            onClick={() => setOpenDesktopMenu((current) => current === "about" ? null : "about")}
          >
            关于 <ChevronDown aria-hidden="true" />
          </button>
          <div
            id="about-dropdown"
            className="dropdown-panel"
            aria-hidden={openDesktopMenu !== "about"}
          >
            {aboutItems.map((item) => (
              <Link
                href={item.href}
                key={item.href}
                tabIndex={openDesktopMenu === "about" ? 0 : -1}
                onClick={() => setOpenDesktopMenu(null)}
              >
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </Link>
            ))}
          </div>
        </div>

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
