import { useEffect, useRef } from 'react'

// Scroll- and pointer-reactive ember field. A lightweight canvas particle
// system: warm embers drift upward, accelerate with scroll velocity, and lean
// toward the pointer. Fully self-cleaning, DPR-aware, mobile-capped, and
// disabled entirely under prefers-reduced-motion.
interface Ember {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  life: number
  max: number
  hue: number
}

const COLORS = ['242,182,60', '255,107,53', '226,75,88']

export function EmberField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = 0
    let height = 0
    const isMobile = window.innerWidth < 640
    const COUNT = isMobile ? 34 : 80

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const embers: Ember[] = []
    const spawn = (initial = false): Ember => ({
      x: Math.random() * width,
      y: initial ? Math.random() * height : height + 10,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(0.25 + Math.random() * 0.7),
      r: 0.6 + Math.random() * 1.9,
      life: 0,
      max: 260 + Math.random() * 320,
      hue: Math.floor(Math.random() * COLORS.length),
    })
    for (let i = 0; i < COUNT; i++) embers.push(spawn(true))

    // Scroll velocity → upward push; pointer → gentle lateral lean.
    let scrollBoost = 0
    let lastScroll = window.scrollY
    const onScroll = () => {
      const dy = window.scrollY - lastScroll
      lastScroll = window.scrollY
      scrollBoost = Math.min(3, scrollBoost + Math.abs(dy) * 0.04)
    }
    let pointerX = width / 2
    let pointerActive = false
    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointerX = e.clientX - rect.left
      pointerActive = e.clientY - rect.top < height
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('resize', resize)

    let raf = 0
    const tick = () => {
      ctx.clearRect(0, 0, width, height)
      scrollBoost *= 0.92
      for (const e of embers) {
        e.life += 1
        e.y += e.vy * (1 + scrollBoost)
        e.x += e.vx
        if (pointerActive) e.x += ((pointerX - e.x) / width) * 0.5
        if (e.y < -10 || e.life > e.max) Object.assign(e, spawn())
        const fade = Math.sin((e.life / e.max) * Math.PI)
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${COLORS[e.hue]}, ${(fade * 0.55).toFixed(3)})`
        ctx.shadowBlur = 8
        ctx.shadowColor = `rgba(${COLORS[e.hue]}, ${(fade * 0.4).toFixed(3)})`
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 5 }} aria-hidden />
}
