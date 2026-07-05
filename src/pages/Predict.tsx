import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ScoreMatrix } from '../components/charts/ScoreMatrix'
import { Waterfall } from '../components/charts/Waterfall'
import { Counter, Flag, ProbBar, Reveal, SectionHead, StatChip } from '../components/ui/primitives'
import { TEAMS, formPoints, teamById, type Team } from '../data/teams'
import { predictMatch } from '../engine/predict'

function TeamSelect({ value, onChange, exclude }: { value: string; onChange: (id: string) => void; exclude: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mono w-full cursor-pointer rounded-lg border px-4 py-3 text-[0.85rem] outline-none"
      style={{ background: 'var(--surface)', borderColor: 'var(--line-strong)', color: 'var(--text)' }}
    >
      {[...TEAMS]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => (
          <option key={t.id} value={t.id} disabled={t.id === exclude}>
            {t.name} {t.alive ? '· alive' : ''}
          </option>
        ))}
    </select>
  )
}

function TeamPanel({ team, side }: { team: Team; side: 'home' | 'away' }) {
  const accent = side === 'home' ? 'var(--pitch)' : 'var(--mar-red)'
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <motion.div
        key={team.id}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      >
        <Flag code={team.code} size={72} />
      </motion.div>
      <div>
        <div className="display text-3xl">{team.name}</div>
        <div className="mono mt-1 text-[0.65rem] uppercase tracking-[0.18em]" style={{ color: 'var(--faint)' }}>
          Elo {team.elo} · Rank #{team.fifaRank} · Form {team.form.join('')} ({formPoints(team.form)}p)
        </div>
      </div>
      <div className="mono max-w-[220px] text-[0.68rem] leading-relaxed" style={{ color: accent }}>
        {team.style}
      </div>
    </div>
  )
}

export default function Predict() {
  const [params, setParams] = useSearchParams()
  const homeId = params.get('h') ?? 'can'
  const awayId = params.get('a') ?? 'mar'
  const prediction = useMemo(() => predictMatch(teamById(homeId), teamById(awayId)), [homeId, awayId])
  const { home, away } = prediction

  const set = (key: 'h' | 'a', id: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set(key, id)
      return next
    })

  return (
    <div className="relative overflow-hidden">
      <div className="page-backdrop">
        <img src="/img/predict-bg.png" alt="" width="1280" height="720" loading="eager" />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-5 pt-32 pb-10">
      <SectionHead
        kicker="Match prediction engine"
        title="Pick any matchup"
        sub="Three models — Elo, Poisson goals, feature logistic — blended into one calibrated probability, decomposed feature by feature."
      />

      <div className="mt-10 grid max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-4">
        <TeamSelect value={homeId} onChange={(id) => set('h', id)} exclude={awayId} />
        <span className="display text-xl" style={{ color: 'var(--faint)' }}>
          VS
        </span>
        <TeamSelect value={awayId} onChange={(id) => set('a', id)} exclude={homeId} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${homeId}-${awayId}`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* ---- Header face-off ---- */}
          <div className="panel mt-12 grid gap-8 p-8 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <TeamPanel team={home} side="home" />
            <div className="text-center">
              <div className="mono text-[0.62rem] uppercase tracking-[0.24em]" style={{ color: 'var(--faint)' }}>
                Most likely score
              </div>
              <div className="display mt-2 text-6xl" style={{ color: 'var(--gold)' }}>
                {prediction.scoreline[0]}–{prediction.scoreline[1]}
              </div>
              <div className="mono mt-2 text-[0.68rem]" style={{ color: 'var(--muted)' }}>
                xG {prediction.lambdaHome.toFixed(2)} vs {prediction.lambdaAway.toFixed(2)}
              </div>
              <div
                className="mono mx-auto mt-3 w-fit rounded-full border px-3 py-1 text-[0.6rem] uppercase tracking-[0.2em]"
                style={{
                  borderColor: prediction.confidence === 'High' ? 'var(--pitch)' : prediction.confidence === 'Medium' ? 'var(--gold)' : 'var(--danger)',
                  color: prediction.confidence === 'High' ? 'var(--pitch)' : prediction.confidence === 'Medium' ? 'var(--gold)' : 'var(--danger)',
                }}
              >
                {prediction.confidence} confidence
              </div>
            </div>
            <TeamPanel team={away} side="away" />
          </div>

          {/* ---- Probabilities ---- */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatChip label={`${home.name} win`} value={<Counter value={prediction.pHome * 100} decimals={0} suffix="%" />} accent="var(--pitch)" />
            <StatChip label="Draw" value={<Counter value={prediction.pDraw * 100} decimals={0} suffix="%" />} />
            <StatChip label={`${away.name} win`} value={<Counter value={prediction.pAway * 100} decimals={0} suffix="%" />} accent="var(--mar-red)" />
          </div>
          <div className="mt-6">
            <ProbBar pHome={prediction.pHome} pDraw={prediction.pDraw} pAway={prediction.pAway} labels={[home.name, 'Draw', away.name]} height={16} />
          </div>

          {/* ---- Model breakdown ---- */}
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {prediction.models.map((m, i) => (
              <Reveal key={m.name} delay={i * 0.08}>
                <div className="panel panel--glow p-5">
                  <div className="mono text-[0.62rem] uppercase tracking-[0.2em]" style={{ color: 'var(--faint)' }}>
                    Model {i + 1}
                  </div>
                  <div className="display mt-1 text-xl">{m.name}</div>
                  <div className="mt-4">
                    <ProbBar pHome={m.pHome} pDraw={m.pDraw} pAway={m.pAway} labels={[home.id.toUpperCase(), 'D', away.id.toUpperCase()]} height={8} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* ---- Explainability ---- */}
          <div className="mt-16 grid gap-12 lg:grid-cols-2">
            <div>
              <Reveal>
                <p className="kicker">Why this prediction?</p>
                <h3 className="display mt-3 text-4xl">Feature attributions</h3>
                <p className="mt-3 max-w-md text-[0.88rem]" style={{ color: 'var(--muted)' }}>
                  Additive log-odds decomposition of the logistic model — the same math SHAP
                  produces for linear models. Bars show each factor's percentage-point push.
                </p>
              </Reveal>
              <div className="panel mt-8 p-6">
                <Waterfall contributions={prediction.contributions} homeName={home.name} awayName={away.name} />
              </div>
            </div>
            <div>
              <Reveal>
                <p className="kicker">Scoreline distribution</p>
                <h3 className="display mt-3 text-4xl">Poisson matrix</h3>
                <p className="mt-3 max-w-md text-[0.88rem]" style={{ color: 'var(--muted)' }}>
                  Joint goal probabilities with a Dixon-Coles low-score correction. Gold outline
                  marks the modal scoreline.
                </p>
              </Reveal>
              <div className="panel mt-8 p-6">
                <ScoreMatrix matrix={prediction.scoreMatrix} homeName={home.name} awayName={away.name} best={prediction.scoreline} />
              </div>
            </div>
          </div>

          {/* ---- Narrative ---- */}
          <Reveal className="mt-14">
            <div className="panel border-l-2 p-7" style={{ borderLeftColor: 'var(--pitch)' }}>
              <div className="mono mb-3 text-[0.62rem] uppercase tracking-[0.24em]" style={{ color: 'var(--pitch)' }}>
                Model-generated explanation — every sentence maps to a computed attribution
              </div>
              <ul className="m-0 list-none space-y-2 p-0">
                {prediction.explanation.map((line) => (
                  <li key={line} className="text-[0.95rem]" style={{ color: 'var(--text)' }}>
                    · {line}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  )
}
