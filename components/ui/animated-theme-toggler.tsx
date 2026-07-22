"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

type Theme = "light" | "dark"

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.dataset.theme = theme
  root.style.colorScheme = theme
  window.localStorage.setItem("ruawd-theme", theme)
}

export function AnimatedThemeToggler() {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light")
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const next: Theme = theme === "dark" ? "light" : "dark"
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const transition = document.startViewTransition?.(() => {
      applyTheme(next)
      setTheme(next)
    })
    if (!transition) {
      applyTheme(next)
      setTheme(next)
      return
    }
    if (reduced) return
    const x = event.clientX
    const y = event.clientY
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    void transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 420, easing: "cubic-bezier(.16,1,.3,1)", pseudoElement: "::view-transition-new(root)" },
      )
    })
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
      title={theme === "dark" ? "浅色模式" : "深色模式"}
      onClick={toggle}
    >
      {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  )
}
