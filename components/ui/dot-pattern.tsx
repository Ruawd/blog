import type { SVGProps } from "react"

import { cn } from "@/lib/utils"

export function DotPattern({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={cn("magic-dot-pattern", className)} aria-hidden="true" {...props}>
      <defs>
        <pattern id="ruawd-dot-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="currentColor" />
        </pattern>
        <linearGradient id="ruawd-dot-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity=".9" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="ruawd-dot-mask"><rect width="100%" height="100%" fill="url(#ruawd-dot-fade)" /></mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#ruawd-dot-pattern)" mask="url(#ruawd-dot-mask)" />
    </svg>
  )
}
