"use client"

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

type ParticlesProps = ComponentPropsWithoutRef<"div"> & {
  quantity?: number
  staticity?: number
  ease?: number
  size?: number
  color?: string
  vx?: number
  vy?: number
}

type Particle = {
  x: number
  y: number
  dx: number
  dy: number
  size: number
  alpha: number
  magnetism: number
}

function rgb(hex: string) {
  const value = Number.parseInt(hex.replace("#", ""), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

export function Particles({
  className,
  quantity = 100,
  staticity = 50,
  ease = 50,
  size = 0.4,
  color = "#ffffff",
  vx = 0,
  vy = 0,
  ...props
}: ParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!container || !canvas || !context) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const pointer = { x: 0, y: 0 }
    let width = 0
    let height = 0
    let frame = 0
    let particles: Particle[] = []
    const [red, green, blue] = rgb(color)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const createParticle = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      dx: (Math.random() - 0.5) * 0.12,
      dy: (Math.random() - 0.5) * 0.12,
      size: Math.random() * 1.5 + size,
      alpha: Math.random() * 0.35 + 0.08,
      magnetism: Math.random() * 3 + 1,
    })

    const resize = () => {
      width = container.clientWidth
      height = container.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles = Array.from({ length: quantity }, createParticle)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      pointer.x = event.clientX - rect.left - width / 2
      pointer.y = event.clientY - rect.top - height / 2
    }

    const draw = () => {
      context.clearRect(0, 0, width, height)
      particles.forEach((particle) => {
        particle.x += particle.dx + vx + pointer.x / (staticity * ease * particle.magnetism)
        particle.y += particle.dy + vy + pointer.y / (staticity * ease * particle.magnetism)
        if (particle.x < -4) particle.x = width + 4
        if (particle.x > width + 4) particle.x = -4
        if (particle.y < -4) particle.y = height + 4
        if (particle.y > height + 4) particle.y = -4
        context.beginPath()
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${particle.alpha})`
        context.fill()
      })
      if (!prefersReducedMotion) frame = window.requestAnimationFrame(draw)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(container)
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    resize()
    draw()

    return () => {
      observer.disconnect()
      window.removeEventListener("pointermove", onPointerMove)
      window.cancelAnimationFrame(frame)
    }
  }, [color, ease, quantity, size, staticity, vx, vy])

  return (
    <div className={cn("magic-particles", className)} ref={containerRef} aria-hidden="true" {...props}>
      <canvas ref={canvasRef} />
    </div>
  )
}
