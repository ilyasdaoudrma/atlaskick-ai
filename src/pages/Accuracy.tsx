import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Counter, Flag, Reveal, SectionHead } from '../components/ui/primitives'
import { teamById } from '../data/teams'
import { buildAccuracyReport } from '../engine/accuracy'
import { useLiveData } from '../services/LiveDataContext'

const OUTCOME_LABEL = { home: 'Home win', draw: 'Draw', away: 'Away win' } as const

function CalibrationChart({ points }: { points: { bucket: string; predicted: number; actual: number; n: number }[] }) {
  const W = 320
  const H = 220
  const pad = 34
  const sx = (v: number) => pad + v * (W - pad * 2)
  const sy = (v: number) => H - pad - v * (H - pad * 2)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[380px]" role="img" aria-label="Calibration chart">
      {/* perfect-calibration diagonal */}
      <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} stroke="var(--line-strong)" strokeDasharray="4 5" />
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <text x={sx(v)} y={H - 10} textAnchor="middle" fontSize="8" fill="var(--faint)" fontFamily="IBM Plex Mono">
            {Math.round(v * 100)}%
          </text>
          <text x={12} y={sy(v) + 3} textAnchor="middle" fontSize="8" fill="var(--faint)" fontFamily="IBM Plex Mono">
            {Math.round(v * 100)}
          </text>
        </g>
      ))}
      <text x={W / 2} y={12} textAnchor="middle" fontSize="8" fill="var(--muted)" fontFamily="IBM Plex Mono" letterSpacing="2">
        PREDICTED CONFIDENCE → ACTUAL HIT RATE
      </text>
      {points.map((p, i) => (
        <motion.g key={p.bucket} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.12, type: 'spring', stiffness: 200 }}>
          <circle cx={sx(p.predicted)} cy={sy(p.actual)} r={5 + Math.min(p.n, 8)} fill="rgba(242,182,60,0.2)" stroke="var(--pitch)" strokeWidth="1.5" />
          <text x={sx(p.predicted)} y={sy(p.actual) - 12 - Math.min(p.n, 8)} textAnchor="middle" fontSize="8" fill="var(--muted)" fontFamily="IBM Plex Mono">
            {p.bucket} · n={p.n}
          </text>
        </motion.g>
      ))}
    </svg>
  )
}

export default function Accuracy() {
  const { fixtures } = useLiveData()
  const report = useMemo(() => buildAccuracyReport(fixtures), [fixtures])
  const accuracy = report.total ? (report.correct / report.total) * 100 : 0

  return (
    <div className="mx-auto max-w-6xl px-4 pt-28 pb-10 sm:px-5 sm:pt-32">
      <SectionHead
        kicker="Model report card"
        title="The model keeps score on itself"
        sub="Every knockout prediction is frozen before kickoff and graded against the 90-minute result (shootouts grade as draws). No cherry-picking — this page updates automatically as matches finish."
      />

      {/* ---- Headline metrics ---- */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Matches graded', value: <Counter value={report.total} />, accent: undefined },
          { label: 'Correct calls', value: <span>{report.correct} / {report.total}</span>, accent: 'var(--pitch)' },
          { label: 'Hit rate', value: <Counter value={accuracy} decimals={0} suffix="%" />, accent: accuracy >= 50 ? 'var(--emerald)' : 'var(--gold)' },
          { label: 'Brier score', value: <span>{report.brier.toFixed(3)}</span>, accent: undefined },
        ].map((s) => (
          <div key={s.label} className="panel px-4 py-4">
            <div className="mono text-[0.6rem] uppercase tracking-[0.2em]" style={{ color: 'var(--faint)' }}>
              {s.label}
            </div>
            <div className="display mt-1.5 text-3xl" style={{ color: s.accent ?? 'var(--text)' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
      <p className="mono mt-3 text-[0.62rem]" style={{ color: 'var(--faint)' }}>
        BRIER: mean squared error across all three outcomes — 0 is perfect, 0.667 is random three-way guessing.
        A ~33% baseline hit rate is chance; a knockout coin-flip favorite baseline is ~45–50%.
      </p>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        {/* ---- Calibration ---- */}
        <Reveal>
          <h3 className="display text-3xl">Calibration</h3>
          <p className="mt-2 max-w-sm text-[0.85rem]" style={{ color: 'var(--muted)' }}>
            When the model says "{'>'}65%", does it win that often? Dots on the dashed line = perfectly calibrated.
          </p>
          <div className="panel mt-5 p-5">
            {report.calibration.length > 0 ? (
              <CalibrationChart points={report.calibration} />
            ) : (
              <p className="py-8 text-center text-[0.85rem]" style={{ color: 'var(--faint)' }}>
                Not enough graded matches yet.
              </p>
            )}
          </div>
        </Reveal>

        {/* ---- Match-by-match ledger ---- */}
        <Reveal delay={0.1}>
          <h3 className="display text-3xl">The ledger</h3>
          <p className="mt-2 text-[0.85rem]" style={{ color: 'var(--muted)' }}>
            Locked 🔒 = prediction frozen before kickoff · Backtest = graded on current ratings.
          </p>
          <div className="mt-5 space-y-2">
            {report.graded.map((g, i) => {
              const f = g.fixture
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.45, delay: (i % 6) * 0.05 }}
                  className="panel flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
                  style={{ borderColor: g.correct ? 'rgba(62,194,132,0.35)' : 'rgba(255,93,108,0.3)' }}
                >
                  <span className="display w-7 text-2xl" style={{ color: g.correct ? 'var(--emerald)' : 'var(--danger)' }}>
                    {g.correct ? '✓' : '✗'}
                  </span>
                  <span className="flex min-w-0 items-center gap-2 text-[0.82rem] font-medium">
                    <Flag code={teamById(f.home).code} size={18} />
                    {g.homeName} {f.homeGoals}–{f.awayGoals} {g.awayName}
                    {f.pens && <span className="mono text-[0.6rem]" style={{ color: 'var(--faint)' }}>({f.pens}p)</span>}
                    <Flag code={teamById(f.away).code} size={18} />
                  </span>
                  <span className="mono ml-auto text-[0.62rem]" style={{ color: 'var(--muted)' }}>
                    called {OUTCOME_LABEL[g.predicted]} · gave truth {(g.pActual * 100).toFixed(0)}%
                  </span>
                  <span className="mono rounded px-1.5 py-0.5 text-[0.55rem] uppercase tracking-widest" style={{ background: 'var(--surface)', color: g.locked ? 'var(--emerald)' : 'var(--faint)', border: '1px solid var(--line)' }}>
                    {g.locked ? '🔒 locked' : 'backtest'}
                  </span>
                </motion.div>
              )
            })}
            {report.graded.length === 0 && (
              <div className="panel p-8 text-center text-[0.85rem]" style={{ color: 'var(--faint)' }}>
                Grading begins as soon as the first knockout match finishes.
              </div>
            )}
          </div>
        </Reveal>
      </div>

      <div className="mt-12">
        <Link to="/predict" className="mono text-[0.68rem] tracking-[0.25em] uppercase no-underline" style={{ color: 'var(--pitch)' }}>
          Try the prediction engine →
        </Link>
      </div>
    </div>
  )
}
