import { motion } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import { Flag, Reveal, SectionHead } from '../components/ui/primitives'
import { teamById } from '../data/teams'
import { overrideKey, runSimulation, type Overrides, type SimResult } from '../engine/simulate'
import { useLiveData } from '../services/LiveDataContext'

const RUNS = 10000
const QUICK_RUNS = 3000

export default function Simulator() {
  const { fixtures, source } = useLiveData()
  const [results, setResults] = useState<SimResult[] | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [overrides, setOverrides] = useState<Overrides>(new Map())

  // Every knockout tie that hasn't been decided yet is overridable.
  const openTies = useMemo(
    () =>
      fixtures
        .filter((f) => f.stage !== 'Group' && f.status !== 'played')
        .map((f) => ({ key: overrideKey(f.home, f.away), home: teamById(f.home), away: teamById(f.away), stage: f.stage })),
    [fixtures],
  )

  const toggleOverride = (key: string, winner: string) => {
    const next = new Map(overrides)
    if (next.get(key) === winner) next.delete(key)
    else next.set(key, winner)
    setOverrides(next)
    // Instant what-if feedback: quick pass, full 10k still available via the button.
    setRunning(true)
    setTimeout(() => {
      const { results: quick } = runSimulation(QUICK_RUNS, fixtures, next)
      setResults(quick)
      setRunning(false)
      setProgress(1)
    }, 30)
  }

  const simulate = useCallback(() => {
    if (running) return
    setRunning(true)
    setResults(null)
    setProgress(0)
    // Chunked so the progress bar actually animates while the sim runs.
    const CHUNKS = 20
    const perChunk = RUNS / CHUNKS
    const totals = new Map<string, { r16: number; quarter: number; semi: number; final: number; champion: number }>()
    let chunk = 0
    const step = () => {
      const { results: partial } = runSimulation(perChunk, fixtures, overrides)
      partial.forEach((r) => {
        const acc = totals.get(r.team.id) ?? { r16: 0, quarter: 0, semi: 0, final: 0, champion: 0 }
        acc.r16 += r.r16 / CHUNKS
        acc.quarter += r.quarter / CHUNKS
        acc.semi += r.semi / CHUNKS
        acc.final += r.final / CHUNKS
        acc.champion += r.champion / CHUNKS
        totals.set(r.team.id, acc)
      })
      chunk++
      setProgress(chunk / CHUNKS)
      if (chunk < CHUNKS) {
        setTimeout(step, 30)
      } else {
        const merged: SimResult[] = [...totals.entries()]
          .map(([id, c]) => ({ team: partial.find((r) => r.team.id === id)!.team, ...c }))
          .sort((a, b) => b.champion - a.champion || b.final - a.final)
        setResults(merged)
        setRunning(false)
      }
    }
    setTimeout(step, 60)
  }, [running, fixtures, overrides])

  const maxChampion = results ? Math.max(...results.map((r) => r.champion)) : 1

  return (
    <div className="relative overflow-hidden">
      <div className="page-backdrop">
        <img src="/img/simulator-bg.png" alt="" width="1280" height="720" loading="eager" />
      </div>
      <div className="relative z-10 mx-auto max-w-6xl px-5 pt-32 pb-10">
      <SectionHead
        kicker="Monte Carlo engine"
        title="Simulate the tournament ×10,000"
        sub="Everything still undecided — tonight's four Round-of-32 ties, then the full bracket to the July 19 final at MetLife — is sampled from the ensemble probabilities and replayed ten thousand times."
      />

      <div className="mt-10 flex flex-wrap items-center gap-6">
        <motion.button
          onClick={simulate}
          disabled={running}
          whileTap={{ scale: 0.97 }}
          className="display grad-bg cursor-pointer rounded-xl border-0 px-8 py-3.5 text-lg tracking-wide transition-transform hover:scale-[1.03] disabled:cursor-wait disabled:opacity-60"
        >
          {running ? `Simulating… ${Math.round(progress * RUNS).toLocaleString()} runs` : results ? 'Run again' : `Run ${RUNS.toLocaleString()} simulations`}
        </motion.button>
        {running && (
          <div className="h-2 w-56 overflow-hidden rounded-full" style={{ background: 'var(--surface)' }}>
            <motion.div className="h-full" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.1 }} style={{ background: 'var(--pitch)' }} />
          </div>
        )}
        {results && !running && (
          <span className="mono text-[0.7rem]" style={{ color: 'var(--muted)' }}>
            {source === 'live' ? 'seeded from the live results feed' : 'seeded from the Jul 3 snapshot'}
            {overrides.size > 0 ? ` · ${overrides.size} what-if override${overrides.size > 1 ? 's' : ''} active` : ''}
          </span>
        )}
      </div>

      {/* ---- What-if lab ---- */}
      {openTies.length > 0 && (
        <Reveal className="mt-10">
          <div className="panel p-5 sm:p-6" style={overrides.size > 0 ? { borderColor: 'rgba(255,107,53,0.45)' } : undefined}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="kicker">What-if lab</p>
                <h3 className="display mt-1 text-2xl">Force a winner, re-run the future</h3>
              </div>
              {overrides.size > 0 && (
                <button
                  onClick={() => {
                    setOverrides(new Map())
                    setResults(null)
                  }}
                  className="mono cursor-pointer rounded-full border px-4 py-2 text-[0.62rem] tracking-[0.18em] uppercase transition-colors hover:border-[var(--ember)]"
                  style={{ background: 'transparent', borderColor: 'var(--line-strong)', color: 'var(--muted)' }}
                >
                  ⟲ Reset scenario
                </button>
              )}
            </div>
            <p className="mt-2 max-w-xl text-[0.82rem]" style={{ color: 'var(--muted)' }}>
              Tap a team to lock them through their tie — the Monte Carlo instantly replays the
              tournament under your scenario. Tap again to release.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {openTies.map((tie) => {
                const forced = overrides.get(tie.key)
                return (
                  <div key={tie.key} className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: forced ? 'rgba(255,107,53,0.4)' : 'var(--line)' }}>
                    <span className="mono w-9 shrink-0 text-[0.55rem] uppercase" style={{ color: 'var(--faint)' }}>
                      {tie.stage === 'Round of 16' ? 'R16' : tie.stage === 'Round of 32' ? 'R32' : tie.stage}
                    </span>
                    {[tie.home, tie.away].map((team) => {
                      const active = forced === team.id
                      return (
                        <button
                          key={team.id}
                          onClick={() => toggleOverride(tie.key, team.id)}
                          className={`flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[0.72rem] font-medium transition-all ${active ? 'grad-bg border-transparent' : ''}`}
                          style={active ? undefined : { background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--muted)' }}
                          title={active ? `${team.name} forced through — tap to release` : `Force ${team.name} through`}
                        >
                          <Flag code={team.code} size={16} />
                          {team.id.toUpperCase()}
                          {active && <span className="mono text-[0.55rem]">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </Reveal>
      )}

      {results && (
        <div className="mt-12">
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[760px]">
          <div className="mono mb-4 grid grid-cols-[minmax(150px,2fr)_1fr_1fr_1fr_1fr_1.4fr] gap-3 px-4 text-[0.58rem] tracking-[0.2em] uppercase" style={{ color: 'var(--faint)' }}>
            <span>Team</span>
            <span className="text-right">Round of 16</span>
            <span className="text-right">Quarter-final</span>
            <span className="text-right">Semi-final</span>
            <span className="text-right">Final</span>
            <span className="text-right">🏆 Champion</span>
          </div>
          <div className="space-y-1.5">
            {results.map((r, i) => {
              const isMar = r.team.id === 'mar'
              return (
                <motion.div
                  key={r.team.id}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className="grid grid-cols-[minmax(150px,2fr)_1fr_1fr_1fr_1fr_1.4fr] items-center gap-3 rounded-lg border px-4 py-2.5"
                  style={{
                    borderColor: isMar ? 'rgba(226,75,88,0.45)' : 'var(--line)',
                    background: isMar ? 'var(--mar-red-soft)' : i < 3 ? 'var(--surface-2)' : 'transparent',
                  }}
                >
                  <span className="flex items-center gap-2.5 text-[0.85rem] font-medium">
                    <span className="mono w-5 text-[0.65rem]" style={{ color: 'var(--faint)' }}>
                      {i + 1}
                    </span>
                    <Flag code={r.team.code} size={22} />
                    {r.team.name}
                  </span>
                  {[r.r16, r.quarter, r.semi, r.final].map((v, j) => (
                    <span key={j} className="mono text-right text-[0.78rem]" style={{ color: 'var(--muted)' }}>
                      {(v * 100).toFixed(1)}%
                    </span>
                  ))}
                  <span className="flex items-center justify-end gap-2.5">
                    <span className="h-1.5 w-24 overflow-hidden rounded-full" style={{ background: 'var(--surface)' }}>
                      <motion.span
                        className="block h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(r.champion / maxChampion) * 100}%` }}
                        transition={{ duration: 0.9, delay: 0.3 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                        style={{ background: isMar ? 'var(--mar-red)' : 'var(--pitch)' }}
                      />
                    </span>
                    <span className="display w-14 text-right text-lg" style={{ color: isMar ? 'var(--mar-red)' : 'var(--pitch)' }}>
                      {(r.champion * 100).toFixed(1)}%
                    </span>
                  </span>
                </motion.div>
              )
            })}
          </div>
            </div>
          </div>
          <Reveal className="mt-8">
            <p className="mono max-w-2xl text-[0.68rem] leading-relaxed" style={{ color: 'var(--faint)' }}>
              METHOD — For each of the {RUNS.toLocaleString()} iterations, the four remaining Round-of-32
              ties are sampled first; their winners fill Round-of-16 ties 7 and 8, and every knockout
              match is a Bernoulli trial on the ensemble win probabilities through the real bracket
              (QF1 = Canada/Morocco side, QF4 = tonight's winners). Reported percentages are empirical
              frequencies — re-running produces slightly different numbers, which is the point of Monte Carlo.
            </p>
          </Reveal>
        </div>
      )}

      {!results && !running && (
        <Reveal className="mt-16">
          <div className="panel flex flex-col items-center gap-3 p-16 text-center">
            <div className="display text-3xl" style={{ color: 'var(--faint)' }}>
              The bracket is loaded.
            </div>
            <p className="max-w-md text-[0.85rem]" style={{ color: 'var(--muted)' }}>
              16 teams. 15 matches per tournament. 10,000 tournaments. One click.
            </p>
          </div>
        </Reveal>
      )}
      </div>
    </div>
  )
}
