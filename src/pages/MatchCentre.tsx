import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Flag, ProbBar, Reveal } from '../components/ui/primitives'
import { TEAMS } from '../data/teams'
import { liveWinProbability } from '../engine/predict'
import { fetchMatchSummary, type LineupPlayer, type MatchSummary, type TeamLineup } from '../services/espn'

const flagCode = (teamId: string): string | undefined => TEAMS.find((t) => t.id === teamId)?.code

/* ---------- Formation pitch (ESPN lineups) ---------- */
function PitchLineup({ lineup, accent }: { lineup: TeamLineup; accent: string }) {
  // Row 1 is always the keeper; outfield rows follow the formation string.
  const formationRows = (lineup.formation ?? '4-4-2')
    .split('-')
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
  const rows: LineupPlayer[][] = [[lineup.starters[0]]]
  let idx = 1
  formationRows.forEach((n) => {
    rows.push(lineup.starters.slice(idx, idx + n))
    idx += n
  })
  if (idx < lineup.starters.length) rows[rows.length - 1].push(...lineup.starters.slice(idx))

  const lastName = (name: string) => name.split(' ').slice(-1)[0]

  return (
    <div>
      <div className="mono mb-2 flex items-baseline justify-between text-[0.62rem] uppercase tracking-[0.18em]">
        <span style={{ color: 'var(--text)' }}>{lineup.teamName}</span>
        <span style={{ color: 'var(--faint)' }}>{lineup.formation ?? ''}</span>
      </div>
      <div
        className="relative flex flex-col-reverse justify-between rounded-2xl border px-3 py-4"
        style={{
          minHeight: 380,
          borderColor: 'var(--line)',
          background:
            'repeating-linear-gradient(180deg, rgba(62,194,132,0.05) 0px, rgba(62,194,132,0.05) 46px, rgba(62,194,132,0.085) 46px, rgba(62,194,132,0.085) 92px), var(--surface)',
        }}
      >
        <div className="pointer-events-none absolute inset-x-3 top-1/2 h-px" style={{ background: 'var(--line-strong)' }} />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border" style={{ borderColor: 'var(--line-strong)' }} />
        {rows.map((row, r) => (
          <div key={r} className="relative z-10 flex items-center justify-around">
            {row.map((p, i) => (
              <motion.div
                key={`${p.name}-${i}`}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + r * 0.08 + i * 0.04, type: 'spring', stiffness: 260, damping: 18 }}
                className="flex w-14 flex-col items-center gap-1 text-center"
              >
                <span
                  className="mono flex h-8 w-8 items-center justify-center rounded-full text-[0.68rem] font-semibold"
                  style={{ background: accent, color: 'var(--on-accent)', boxShadow: '0 4px 12px rgba(0,0,0,0.35)' }}
                >
                  {p.jersey || p.position}
                </span>
                <span className="w-full truncate text-[0.58rem] leading-tight" style={{ color: 'var(--muted)' }}>
                  {lastName(p.name)}
                </span>
              </motion.div>
            ))}
          </div>
        ))}
      </div>
      {lineup.subs.length > 0 && (
        <p className="mono mt-2 text-[0.56rem] leading-relaxed" style={{ color: 'var(--faint)' }}>
          BENCH · {lineup.subs.slice(0, 9).join(' · ')}
        </p>
      )}
    </div>
  )
}

function PossessionBar({ home, away }: { home: number; away: number }) {
  const homeSafe = Math.max(0, Math.min(100, home))
  const awaySafe = Math.max(0, Math.min(100, away))

  return (
    <div>
      <div className="mono mb-3 flex justify-between text-[0.62rem] uppercase tracking-[0.2em]" style={{ color: 'var(--faint)' }}>
        <span style={{ color: 'var(--pitch)' }}>{homeSafe.toFixed(1)}%</span>
        <span>Possession tug-of-war</span>
        <span style={{ color: 'var(--mar-red)' }}>{awaySafe.toFixed(1)}%</span>
      </div>
      <div className="relative h-4 overflow-hidden rounded-full border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-r-full"
          initial={{ width: '50%' }}
          animate={{ width: `${homeSafe}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: 'linear-gradient(90deg, rgba(242,182,60,0.28), var(--pitch))' }}
        />
        <motion.div
          className="absolute inset-y-0 right-0 rounded-l-full"
          initial={{ width: '50%' }}
          animate={{ width: `${awaySafe}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: 'linear-gradient(270deg, rgba(226,75,88,0.34), var(--mar-red))' }}
        />
        <motion.div
          className="absolute top-1/2 h-7 w-px -translate-y-1/2"
          initial={{ left: '50%' }}
          animate={{ left: `${homeSafe}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: 'rgba(245,238,222,0.72)', boxShadow: '0 0 16px rgba(245,238,222,0.32)' }}
        />
      </div>
    </div>
  )
}

function StatBars({ label, home, away, index }: { label: string; home: string; away: string; index: number }) {
  const h = Number(home.replace('%', ''))
  const a = Number(away.replace('%', ''))
  const numeric = !Number.isNaN(h) && !Number.isNaN(a)
  const max = numeric ? Math.max(h, a, 1) : 1

  return (
    <div className="grid grid-cols-[1fr] gap-2 border-t py-3 first:border-t-0 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="mono text-[0.8rem]" style={{ color: numeric && h >= a ? 'var(--text)' : 'var(--muted)', fontWeight: numeric && h >= a ? 600 : 400 }}>
          {home}
        </span>
        {numeric && (
          <div className="h-1.5 w-full max-w-28 overflow-hidden rounded-full sm:w-24" style={{ background: 'var(--surface)' }}>
            <motion.div
              className="ml-auto h-full rounded-full"
              initial={{ width: 0 }}
              whileInView={{ width: `${(h / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: 'var(--pitch)' }}
            />
          </div>
        )}
      </div>
      <span className="mono order-first text-center text-[0.62rem] uppercase tracking-[0.16em] sm:order-none sm:w-32" style={{ color: 'var(--faint)' }}>
        {label}
      </span>
      <div className="flex items-center justify-between gap-3 sm:justify-start">
        {numeric && (
          <div className="h-1.5 w-full max-w-28 overflow-hidden rounded-full sm:w-24" style={{ background: 'var(--surface)' }}>
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              whileInView={{ width: `${(a / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: 'var(--mar-red)' }}
            />
          </div>
        )}
        <span className="mono text-[0.8rem]" style={{ color: numeric && a >= h ? 'var(--text)' : 'var(--muted)', fontWeight: numeric && a >= h ? 600 : 400 }}>
          {away}
        </span>
      </div>
    </div>
  )
}

function eventType(type: string, isGoal: boolean): string {
  if (isGoal) return 'GOAL'
  if (type.includes('Yellow')) return 'YC'
  if (type.includes('Red')) return 'RC'
  if (type.includes('Substitution')) return 'SUB'
  return 'EVT'
}

function SkeletonMatchCentre() {
  return (
    <div className="pt-28">
      <section className="relative overflow-hidden px-5 pt-12 pb-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(242,182,60,0.15),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(226,75,88,0.15),transparent_35%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="skeleton h-4 w-56 rounded-full" />
          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex flex-col items-center gap-4">
              <div className="skeleton h-14 w-20 rounded-md" />
              <div className="skeleton h-9 w-32 rounded" />
            </div>
            <div className="skeleton h-24 w-36 rounded-xl" />
            <div className="flex flex-col items-center gap-4">
              <div className="skeleton h-14 w-20 rounded-md" />
              <div className="skeleton h-9 w-32 rounded" />
            </div>
          </div>
          <div className="skeleton mt-10 h-4 rounded-full" />
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="panel p-6">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="skeleton my-4 h-9 rounded" />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MatchCentre() {
  const { espnId } = useParams<{ espnId: string }>()
  const [summary, setSummary] = useState<MatchSummary | null>(null)
  const [error, setError] = useState(false)
  // In-play win-probability history for the sparkline (per match, per session).
  const wpHistory = useRef<{ min: number; p: number }[]>([])

  useEffect(() => {
    wpHistory.current = []
  }, [espnId])

  useEffect(() => {
    if (!espnId) return
    let cancelled = false
    const load = () =>
      fetchMatchSummary(espnId)
        .then((s) => {
          if (!cancelled) {
            setSummary(s)
            setError(false)
          }
        })
        .catch(() => {
          if (!cancelled) setError(true)
        })
    load()
    const timer = setInterval(load, 45_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [espnId])

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-5 pt-40 pb-20 text-center">
        <div className="display text-3xl" style={{ color: 'var(--faint)' }}>
          Match data unavailable
        </div>
        <p className="mt-3 text-[0.9rem]" style={{ color: 'var(--muted)' }}>
          The stats feed could not be reached for this match.
        </p>
        <Link to="/" className="mono mt-6 inline-flex min-h-11 items-center text-[0.7rem] tracking-[0.25em] uppercase no-underline" style={{ color: 'var(--pitch)' }}>
          Back to dashboard
        </Link>
      </div>
    )
  }

  if (!summary) return <SkeletonMatchCentre />

  const live = summary.state === 'in'
  const homeFlag = flagCode(summary.homeId)
  const awayFlag = flagCode(summary.awayId)

  // ---- In-play win probability (Poisson conditioned on score + clock) ----
  const homeTeam = TEAMS.find((t) => t.id === summary.homeId)
  const awayTeam = TEAMS.find((t) => t.id === summary.awayId)
  const minuteNow = summary.clock ? Number.parseInt(summary.clock, 10) : 0
  const lwp =
    live && homeTeam && awayTeam
      ? liveWinProbability(homeTeam, awayTeam, summary.homeGoals, summary.awayGoals, Number.isNaN(minuteNow) ? 0 : minuteNow)
      : null
  if (lwp) {
    const last = wpHistory.current[wpHistory.current.length - 1]
    if (!last || last.min !== minuteNow) wpHistory.current = [...wpHistory.current, { min: minuteNow, p: lwp.pHome }]
  }

  return (
    <div className="pb-10">
      <section className="relative min-h-[560px] overflow-hidden px-5 pt-32 pb-14">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,14,8,0.1)_0%,var(--bg)_92%)]" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 18% 34%, rgba(242,182,60,0.26), transparent 34%), radial-gradient(circle at 82% 34%, rgba(226,75,88,0.26), transparent 34%)' }} />
        <div className="absolute inset-x-0 top-0 h-px grad-line" />

        <div className="relative mx-auto max-w-7xl">
          <p className="kicker">Match centre / ESPN stats feed</p>
          <div className="mt-10 grid grid-cols-[1fr] items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
            <motion.div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              {homeFlag && <Flag code={homeFlag} size={78} />}
              <span className="display max-w-[12ch] text-5xl leading-[0.9] sm:text-6xl">{summary.homeName}</span>
            </motion.div>

            <div className="text-center">
              <motion.div
                className="display text-7xl sm:text-8xl"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 16 }}
              >
                {summary.homeGoals}-{summary.awayGoals}
              </motion.div>
              <div className="mono mt-3 text-[0.68rem] uppercase tracking-[0.2em]" style={{ color: live ? 'var(--danger)' : 'var(--muted)' }}>
                {live ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="live-dot" style={{ background: 'var(--danger)' }} />
                    LIVE / {summary.clock ?? ''}
                  </span>
                ) : (
                  summary.detail
                )}
              </div>
              {summary.venue && (
                <div className="mono mt-2 text-[0.6rem]" style={{ color: 'var(--faint)' }}>
                  {summary.venue}
                  {summary.attendance ? ` / ${summary.attendance.toLocaleString()} fans` : ''}
                </div>
              )}
            </div>

            <motion.div className="flex flex-col items-center gap-4 text-center md:items-end md:text-right" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              {awayFlag && <Flag code={awayFlag} size={78} />}
              <span className="display max-w-[12ch] text-5xl leading-[0.9] sm:text-6xl">{summary.awayName}</span>
            </motion.div>
          </div>

          {summary.possession && (
            <div className="mx-auto mt-10 max-w-4xl">
              <PossessionBar home={summary.possession[0]} away={summary.possession[1]} />
            </div>
          )}

          {lwp && (
            <motion.div
              className="grad-frame mx-auto mt-8 max-w-4xl p-5 sm:p-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mono flex flex-wrap items-center justify-between gap-2 text-[0.6rem] uppercase tracking-[0.22em]">
                <span style={{ color: 'var(--ember)' }}>Live win probability · model, {minuteNow}′</span>
                <span style={{ color: 'var(--faint)' }}>
                  {summary.homeName} advances: {(lwp.pHomeAdvance * 100).toFixed(0)}%
                </span>
              </div>
              <div className="mt-4">
                <ProbBar pHome={lwp.pHome} pDraw={lwp.pDraw} pAway={lwp.pAway} labels={[summary.homeName, 'Draw (ET)', summary.awayName]} height={12} />
              </div>
              {wpHistory.current.length >= 2 && (
                <svg viewBox="0 0 300 54" className="mt-4 w-full" role="img" aria-label="Win probability over time">
                  <line x1="0" y1="27" x2="300" y2="27" stroke="var(--line)" strokeDasharray="3 4" />
                  <polyline
                    fill="none"
                    stroke="var(--pitch)"
                    strokeWidth="1.6"
                    points={wpHistory.current.map((s) => `${Math.min(s.min / 100, 1) * 300},${54 - s.p * 54}`).join(' ')}
                  />
                  <text x="2" y="10" fontSize="7" fill="var(--faint)" fontFamily="IBM Plex Mono">
                    {summary.homeName} WIN %
                  </text>
                </svg>
              )}
            </motion.div>
          )}
        </div>
      </section>

      <div className="mx-auto mt-10 grid max-w-7xl gap-10 px-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Reveal>
          <div className="flex items-end justify-between gap-4">
            <h3 className="display text-4xl">Team Statistics</h3>
            <span className="mono text-[0.58rem] uppercase tracking-[0.2em]" style={{ color: 'var(--faint)' }}>
              Broadcast feed
            </span>
          </div>
          <div className="panel mt-5 px-5 py-3 sm:px-6 sm:py-4">
            {summary.stats.length === 0 ? (
              <div className="empty-state rounded-xl px-5 py-8 text-center text-[0.85rem]">
                Statistics appear once the match kicks off.
              </div>
            ) : (
              summary.stats.map((s, i) => <StatBars key={s.label} label={s.label} home={s.home} away={s.away} index={i} />)
            )}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <h3 className="display text-4xl">Timeline</h3>
          <div className="relative mt-5 space-y-4 pl-5">
            <div className="absolute top-0 bottom-0 left-[8px] w-px bg-[linear-gradient(180deg,var(--pitch),rgba(226,75,88,0.16))]" />
            {summary.timeline.length === 0 ? (
              <div className="empty-state rounded-xl p-6 text-center text-[0.85rem]">
                Key events will appear here.
              </div>
            ) : (
              summary.timeline.map((ev, i) => (
                <motion.div
                  key={`${ev.minute}-${i}`}
                  initial={{ opacity: 0, x: ev.side === 'away' ? 22 : -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="panel relative px-4 py-3"
                  style={ev.isGoal ? { borderColor: 'rgba(62,194,132,0.4)', boxShadow: '0 12px 34px rgba(62,194,132,0.06)' } : undefined}
                >
                  <span className="absolute top-5 -left-[22px] h-3.5 w-3.5 rounded-full border-2" style={{ borderColor: ev.isGoal ? 'var(--emerald)' : 'var(--line-strong)', background: 'var(--bg)' }} />
                  <div className="mono flex items-center justify-between gap-3 text-[0.6rem] uppercase tracking-[0.18em]">
                    <span style={{ color: ev.isGoal ? 'var(--pitch)' : 'var(--faint)' }}>{ev.minute}</span>
                    <span style={{ color: ev.isGoal ? 'var(--emerald)' : 'var(--muted)' }}>{eventType(ev.type, ev.isGoal)}</span>
                  </div>
                  <p className="mt-2 text-[0.8rem] leading-relaxed" style={{ color: ev.isGoal ? 'var(--text)' : 'var(--muted)' }}>
                    {ev.text}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </Reveal>
      </div>

      {summary.lineups && (
        <div className="mx-auto mt-14 max-w-7xl px-5">
          <Reveal>
            <div className="flex items-end justify-between gap-4">
              <h3 className="display text-4xl">Lineups</h3>
              <span className="mono text-[0.58rem] uppercase tracking-[0.2em]" style={{ color: 'var(--faint)' }}>
                Starting XIs · official
              </span>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <PitchLineup lineup={summary.lineups[0]} accent="var(--pitch)" />
              <PitchLineup lineup={summary.lineups[1]} accent="var(--mar-red)" />
            </div>
          </Reveal>
        </div>
      )}

      <div className="mx-auto mt-12 flex max-w-7xl flex-wrap gap-6 px-5">
        <Link to="/" className="mono inline-flex min-h-11 items-center text-[0.68rem] tracking-[0.25em] uppercase no-underline" style={{ color: 'var(--muted)' }}>
          Dashboard
        </Link>
        <Link to={`/predict?h=${summary.homeId}&a=${summary.awayId}`} className="mono inline-flex min-h-11 items-center text-[0.68rem] tracking-[0.25em] uppercase no-underline" style={{ color: 'var(--pitch)' }}>
          Model view of this match -&gt;
        </Link>
      </div>
    </div>
  )
}
