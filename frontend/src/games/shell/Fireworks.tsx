import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

const COLORS = ['#41b653', '#da315f', '#f8f294', '#31a9e0', '#ef60a3', '#f26a45', '#fedf00']
const GRAVITY = 0.06
const FRICTION = 0.985

interface FireworksProps {
  // Milliseconds between bursts — lower is a bigger show.
  burstIntervalMs?: number
}

// Full-screen firework bursts drawn on a canvas. Purely decorative: it never
// intercepts pointer events, and it stays off for users who prefer reduced motion.
export function Fireworks({ burstIntervalMs = 500 }: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const particles: Particle[] = []
    let frame = 0
    let lastBurst = -Infinity

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function burst() {
      if (!canvas) return
      const x = canvas.width * (0.15 + Math.random() * 0.7)
      const y = canvas.height * (0.1 + Math.random() * 0.45)
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 4.5
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color,
        })
      }
    }

    function tick(now: number) {
      if (!canvas || !ctx) return
      if (now - lastBurst >= burstIntervalMs) {
        burst()
        lastBurst = now
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.vx *= FRICTION
        p.vy = p.vy * FRICTION + GRAVITY
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.012
        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }
        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [burstIntervalMs])

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-30" aria-hidden />
}
