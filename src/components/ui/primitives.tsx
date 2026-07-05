import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { flagUrl } from '../../data/teams'

/* ---------- Reveal: fade/slide-in on scroll ---------- */
interface RevealProps {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  once?: boolean
}

export function Reveal({ children, delay = 0, y = 28, className, once = true }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

/* ---------- Kicker + heading combo ---------- */
interface SectionHeadProps {
  kicker: string
  title: string
  red?: boolean
  sub?: string
}

export function SectionHead({ kicker, title, red, sub }: SectionHeadProps) {
  return (
    <Reveal>
      <p className={`kicker ${red ? 'kicker--red' : ''}`}>{kicker}</p>
      <h2 className="display mt-3" style={{ fontSize: 'var(--text-h2)' }}>
        {title}
      </h2>
      <div className={`mt-4 h-[2px] w-14 ${red ? '' : 'grad-line'}`} style={red ? { background: 'var(--mar-red)' } : undefined} />
      {sub && (
        <p className="mt-4 max-w-xl text-[0.95rem]" style={{ color: 'var(--muted)' }}>
          {sub}
        </p>
      )}
    </Reveal>
  )
}

/* ---------- Flag ---------- */
interface FlagProps {
  code: string
  size?: number
  className?: string
}

export function Flag({ code, size = 28, className = '' }: FlagProps) {
  return (
    <img
      src={flagUrl(code, size > 44 ? 'w160' : 'w80')}
      width={size}
      height={Math.round(size * 0.75)}
      alt=""
      loading="lazy"
      className={`inline-block rounded-[3px] object-cover ${className}`}
      style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.12)' }}
    />
  )
}

/* ---------- Animated counter ---------- */
interface CounterProps {
  value: number
  decimals?: number
  suffix?: string
  className?: string
}

export function Counter({ value, decimals = 0, suffix = '', className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 82, damping: 18, mass: 0.82 })
  const display = useTransform(spring, (v) => `${v.toFixed(decimals)}${suffix}`)

  useEffect(() => {
    if (inView) mv.set(value)
  }, [inView, value, mv])

  return (
    <span ref={ref} className={className} aria-live="polite">
      <motion.span className="odometer-number">{display}</motion.span>
    </span>
  )
}

/* ---------- Three-way probability bar ---------- */
interface ProbBarProps {
  pHome: number
  pDraw: number
  pAway: number
  labels?: [string, string, string]
  height?: number
}

export function ProbBar({ pHome, pDraw, pAway, labels, height = 12 }: ProbBarProps) {
  const segments = [
    { p: pHome, color: 'var(--pitch)' },
    { p: pDraw, color: '#3a4a52' },
    { p: pAway, color: 'var(--mar-red)' },
  ]
  return (
    <div>
      <div className="flex w-full overflow-hidden rounded-full" style={{ height, background: 'var(--surface)' }}>
        {segments.map((s, i) => (
          <motion.div
            key={i}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, delay: 0.15 * i, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: `${s.p * 100}%`, background: s.color, transformOrigin: 'left' }}
          />
        ))}
      </div>
      {labels && (
        <div className="mono mt-2 flex justify-between text-[0.68rem]" style={{ color: 'var(--muted)' }}>
          <span style={{ color: 'var(--pitch)' }}>
            {labels[0]} {(pHome * 100).toFixed(0)}%
          </span>
          <span>
            {labels[1]} {(pDraw * 100).toFixed(0)}%
          </span>
          <span style={{ color: 'var(--mar-red)' }}>
            {labels[2]} {(pAway * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  )
}

/* ---------- Stat chip ---------- */
export function StatChip({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="panel px-4 py-3 transition-transform active:scale-[0.99]">
      <div className="mono text-[0.62rem] uppercase tracking-[0.22em]" style={{ color: 'var(--faint)' }}>
        {label}
      </div>
      <div className="display mt-1 text-2xl" style={{ color: accent ?? 'var(--text)' }}>
        {value}
      </div>
    </div>
  )
}

interface MagneticLinkProps {
  to: string
  children: ReactNode
  className?: string
  style?: CSSProperties
  ariaLabel?: string
}

export function MagneticLink({ to, children, className, style, ariaLabel }: MagneticLinkProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 260, damping: 20, mass: 0.35 })
  const springY = useSpring(y, { stiffness: 260, damping: 20, mass: 0.35 })

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return
    const rect = event.currentTarget.getBoundingClientRect()
    x.set((event.clientX - rect.left - rect.width / 2) * 0.12)
    y.set((event.clientY - rect.top - rect.height / 2) * 0.18)
  }

  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      className="inline-flex"
      style={{ x: springX, y: springY }}
      onPointerMove={move}
      onPointerLeave={reset}
      onPointerDown={reset}
    >
      <Link to={to} className={className} style={style} aria-label={ariaLabel}>
        {children}
      </Link>
    </motion.div>
  )
}
