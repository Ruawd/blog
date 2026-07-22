import type { ReactNode } from "react"

export function Marquee({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`magic-marquee ${className}`.trim()}>
      <div className="magic-marquee-track">
        <div className="magic-marquee-group">{children}</div>
        <div className="magic-marquee-group" aria-hidden="true">{children}</div>
      </div>
    </div>
  )
}
