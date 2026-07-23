import { useId, type SVGProps } from "react"

import { cn } from "@/lib/utils"

export function DotPattern({ className, ...props }: SVGProps<SVGSVGElement>) {
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const patternId = `ruawd-dot-pattern-${instanceId}`
  const gradientId = `ruawd-dot-fade-${instanceId}`
  const maskId = `ruawd-dot-mask-${instanceId}`

  return (
    <svg className={cn("magic-dot-pattern", className)} aria-hidden="true" {...props}>
      <defs>
        <pattern id={patternId} width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="currentColor" />
        </pattern>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity=".9" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id={maskId}><rect width="100%" height="100%" fill={`url(#${gradientId})`} /></mask>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} mask={`url(#${maskId})`} />
    </svg>
  )
}
