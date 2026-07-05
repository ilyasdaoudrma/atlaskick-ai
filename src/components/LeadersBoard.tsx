import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { TEAMS } from '../data/teams'
import type { LeaderBoards, LeaderRow } from '../services/espnStats'
import { Flag } from './ui/primitives'

const TABS: { key: keyof Omit<LeaderBoards, 'fetchedAt'>; label: string; unit: string }[] = [
  { key: 'goals', label: 'Goals', unit: 'G' },
  { key: 'assists', label: 'Assists', unit: 'A' },
  { key: 'saves', label: 'Saves', unit: 'SV' },
  { key: 'cards', label: 'Cards', unit: 'PTS' },
  { key: 'shots', label: 'Shots', unit: 'SH' },
]

const flagCode = (teamId?: string): string | undefined => TEAMS.find((t) => t.id === teamId)?.code

// Tabbed tournament leaderboards, refreshed automatically after every match.
export function LeadersBoard({ leaders, scheduledAt }: { leaders: LeaderBoards; scheduledAt?: string | null }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0])
  const rows: LeaderRow[] = leaders[tab.key]
  const max = Math.max(...rows.map((r) => r.value), 1)

  return (
    <div>
      <div className="relative flex flex-wrap gap-1.5 rounded-full border p-1" style={{ borderColor: 'var(--line)', background: 'rgba(18,14,8,0.28)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t)}
            className="mono relative min-h-10 cursor-pointer rounded-full border px-3.5 py-1.5 text-[0.62rem] tracking-[0.16em] uppercase transition-colors"
            style={{ borderColor: 'transparent', color: tab.key === t.key ? 'var(--on-accent)' : 'var(--muted)', fontWeight: tab.key === t.key ? 600 : 400 }}
          >
            {tab.key === t.key && (
              <motion.span
                layoutId="leader-tab-indicator"
                className="absolute inset-0 rounded-full"
                style={{ background: 'var(--pitch)' }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--line)' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab.key}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {rows.length === 0 ? (
              <div className="empty-state px-5 py-8 text-center text-[0.82rem]">
                No data yet for this category.
              </div>
            ) : (
              rows.map((r, i) => {
                const code = flagCode(r.teamId)
                return (
                  <div
                    key={`${r.name}-${i}`}
                    className="flex items-center gap-3 border-t px-4 py-2.5 first:border-t-0"
                    style={{ borderColor: 'var(--line)', background: r.teamId === 'mar' ? 'var(--mar-red-soft)' : i === 0 ? 'var(--surface-2)' : undefined }}
                  >
                    <span className="mono w-5 shrink-0 text-right text-[0.68rem]" style={{ color: i === 0 ? 'var(--gold)' : 'var(--faint)' }}>
                      {i + 1}
                    </span>
                    {code ? <Flag code={code} size={20} /> : <span className="inline-block w-5" />}
                    <span className="min-w-0 flex-1 truncate text-[0.82rem] font-medium">{r.name}</span>
                    <span className="mono hidden text-[0.6rem] sm:block" style={{ color: 'var(--faint)' }}>
                      {r.detail}
                    </span>
                    <div className="hidden h-1.5 w-16 overflow-hidden rounded-full sm:block" style={{ background: 'var(--surface)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(r.value / max) * 100}%` }}
                        transition={{ duration: 0.7, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                        style={{ background: r.teamId === 'mar' ? 'var(--mar-red)' : 'var(--pitch)' }}
                      />
                    </div>
                    <span className="display w-10 shrink-0 text-right text-xl" style={{ color: 'var(--pitch)' }}>
                      {r.value}
                    </span>
                  </div>
                )
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mono mt-3 text-[0.58rem] leading-relaxed tracking-[0.08em] uppercase" style={{ color: 'var(--faint)' }}>
        Goals & assists: full tournament · Saves, cards, shots: knockout aggregate · Sources: ESPN
        + worldfootballrankings{scheduledAt ? ` · auto-refreshed every 3h · last ${new Date(scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ' · live'}
      </p>
    </div>
  )
}
