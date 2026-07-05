import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useLiveData } from '../services/LiveDataContext'

const LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/predict', label: 'Predictions' },
  { to: '/morocco', label: 'Morocco' },
  { to: '/simulator', label: 'Simulator' },
  { to: '/accuracy', label: 'Accuracy' },
  { to: '/assistant', label: 'Analyst AI' },
]

function Logo() {
  return (
    <NavLink to="/" className="flex items-center gap-2.5 no-underline">
      <img src="/img/logo.png" alt="AtlasKick" width="34" height="34" className="h-[34px] w-[34px] object-contain" />
      <span className="display text-lg tracking-tight" style={{ color: 'var(--text)' }}>
        AtlasKick<span className="grad-text">·AI</span>
      </span>
    </NavLink>
  )
}

export function Nav() {
  const { pathname } = useLocation()
  const { source } = useLiveData()
  const [open, setOpen] = useState(false)

  // Close the mobile menu on navigation and lock scroll while open.
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
        <div
          className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl border px-4 backdrop-blur-xl sm:px-5"
          style={{
            background: 'rgba(18, 14, 8, 0.9)',
            borderColor: 'var(--line-strong)',
            boxShadow: '0 10px 34px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(245, 238, 222, 0.05)',
          }}
        >
          <Logo />

          {/* Desktop links */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'} className="relative rounded-full px-4 py-1.5 text-[0.8rem] font-medium no-underline">
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--line-strong)' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10" style={{ color: isActive ? 'var(--pitch)' : 'var(--muted)' }}>
                      {l.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="mono hidden items-center gap-2 text-[0.6rem] tracking-[0.2em] uppercase lg:flex" style={{ color: source === 'live' ? 'var(--emerald)' : 'var(--gold)' }}>
              <span className="live-dot" style={{ background: source === 'live' ? 'var(--emerald)' : 'var(--gold)' }} />
              {source === 'live' ? 'Live feed' : 'Snapshot'}
            </div>
            {/* Mobile burger */}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="flex h-11 w-11 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-xl border md:hidden"
              style={{ background: 'var(--surface)', borderColor: 'var(--line-strong)' }}
            >
              <motion.span animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }} className="block h-[2px] w-4 rounded" style={{ background: 'var(--text)' }} />
              <motion.span animate={open ? { opacity: 0 } : { opacity: 1 }} className="block h-[2px] w-4 rounded" style={{ background: 'var(--text)' }} />
              <motion.span animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }} className="block h-[2px] w-4 rounded" style={{ background: 'var(--text)' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="zellige fixed inset-0 z-40 flex flex-col justify-center px-8 md:hidden"
            style={{ background: 'rgba(18, 14, 8, 0.96)', backdropFilter: 'blur(14px)' }}
          >
            <nav className="flex flex-col gap-2">
              {LINKS.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ opacity: 0, x: -28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ delay: 0.06 + i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <NavLink to={l.to} end={l.to === '/'} className="group flex items-baseline gap-4 py-2 no-underline">
                    {({ isActive }) => (
                      <>
                        <span className="mono text-[0.65rem]" style={{ color: 'var(--faint)' }}>
                          0{i + 1}
                        </span>
                        <span className={`display text-5xl ${isActive ? 'grad-text' : ''}`} style={isActive ? undefined : { color: 'var(--text)' }}>
                          {l.label}
                        </span>
                      </>
                    )}
                  </NavLink>
                </motion.div>
              ))}
            </nav>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="mono mt-12 text-[0.62rem] tracking-[0.25em] uppercase"
              style={{ color: 'var(--faint)' }}
            >
              World Cup 2026 · Knockout stage
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
