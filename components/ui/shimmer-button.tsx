"use client"

import type { ButtonHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

export function ShimmerButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn("magic-shimmer-button", className)} {...props}>
      <span className="magic-shimmer-sweep" aria-hidden="true" />
      <span className="magic-shimmer-content">{children}</span>
    </button>
  )
}
