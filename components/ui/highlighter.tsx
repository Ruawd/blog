import type { ReactNode } from "react"

export function Highlighter({ children }: { children: ReactNode }) {
  return (
    <span className="magic-highlighter">
      <span>{children}</span>
      <svg viewBox="0 0 220 22" preserveAspectRatio="none" aria-hidden="true">
        <path d="M4 13 C 44 5, 82 19, 122 10 S 188 8, 216 12" pathLength="1" />
      </svg>
    </span>
  )
}
