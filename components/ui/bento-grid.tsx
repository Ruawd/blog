import type { HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

export function BentoGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("magic-bento-grid", className)} {...props} />
}

export function BentoGridItem({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <article className={cn("magic-bento-grid-item", className)} {...props} />
}
