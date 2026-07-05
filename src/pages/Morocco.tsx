import { motion, useScroll, useTransform } from 'framer-motion'
import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Counter, Flag, ProbBar, Reveal, SectionHead } from '../components/ui/primitives'
import { MOROCCO_ATTACK_ZONES, MOROCCO_SQUAD } from '../data/players'
import { COMPARE_2022, type JourneyStep } from '../data/morocco'
import { teamById } from '../data/teams'
import { deriveMoroccoJourney, deriveMoroccoNext } from '../engine/moroccoJourney'
import { predictMatch } from '../engine/predict'
import { runSimulation } from '../engine/simulate'
import { winnerOf } from '../engine/bracket'
import { useLiveData } from '../services/LiveDataContext'

/* ---------- Hero ---------- */
function MoroccoHero({ facts }: { facts: { label: string; value: string }[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1.35])
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '22%'])
  const fade = useTransform(scrollYProgress, [0, 0.65], [1, 0])

  return (
    <div ref={ref} className="relative h-[100vh] overflow-hidden">
      <motion.div className="image-grade absolute inset-0" style={{ scale, y }}>
        <img src="/img/morocco-hero.png" alt="" width="1280" height="720" loading="eager" className="h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(18,14,8,0.5), rgba(18,14,8,0.2) 45%, var(--bg) 97%)' }} />
      </motion.div>
      <motion.div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-24" style={{ opacity: fade }}>
        <motion.p className="kicker kicker--red" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}>
          Morocco World Cup Journey · 2026
        </motion.p>
        <h1 className="display mt-4" style={{ fontSize: 'var(--text-hero)' }}>
          <span className="block overflow-hidden">
            <motion.span className="block" initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              Atlas Lions,
            </motion.span>
          </span>
          <span className="block overflow-hidden">
            <motion.span className="block" style={{ color: 'var(--mar-red)' }} initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 1, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}>
              unbeaten again.
            </motion.span>
          </span>
        </h1>
        <motion.div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }}>
          {facts.map((f) => (
            <div key={f.label} className="border-l pl-3" style={{ borderColor: 'rgba(226,75,88,0.5)' }}>
              <div className="display text-2xl" style={{ color: 'var(--mar-red)' }}>
                {f.value}
              </div>
              <div className="mono text-[0.6rem] uppercase tracking-[0.2em]" style={{ color: 'rgba(245,238,222,0.8)' }}>
                {f.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ---------- Journey timeline ---------- */
function Journey({ steps }: { steps: JourneyStep[] }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start center', 'end center'] })

  return (
    <section ref={ref} className="mx-auto grid max-w-7xl gap-10 px-5 py-[var(--space-section)] lg:grid-cols-[0.78fr_1.22fr]">
      <div className="lg:sticky lg:top-28 lg:h-fit">
        <SectionHead
          kicker="The campaign"
          title="Match by match"
          red
          sub="A scroll-drawn crimson thread traces Morocco's run from group-stage control to the next knockout test."
        />
        <div className="mt-8 hidden max-w-xs border-l pl-5 lg:block" style={{ borderColor: 'rgba(226,75,88,0.38)' }}>
          <div className="display text-5xl" style={{ color: 'var(--mar-red)' }}>
            {steps.length}
          </div>
          <div className="mono text-[0.62rem] uppercase tracking-[0.2em]" style={{ color: 'var(--faint)' }}>
            chapter campaign rail
          </div>
        </div>
      </div>

      <div className="relative">
        <svg aria-hidden className="absolute top-2 bottom-2 left-[18px] h-[calc(100%-1rem)] w-9 md:left-1/2 md:-translate-x-1/2" viewBox="0 0 40 100" preserveAspectRatio="none">
          <path d="M20 0 V100" fill="none" stroke="rgba(226,75,88,0.18)" strokeWidth="2" />
          <motion.path
            d="M20 0 V100"
            fill="none"
            stroke="var(--mar-red)"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ pathLength: scrollYProgress }}
          />
        </svg>

        <div className="space-y-12">
          {steps.map((step, i) => {
            const opp = teamById(step.opponentId)
            const left = i % 2 === 0
            const isNext = step.outcome === 'next'
            return (
              <Reveal key={`${step.stage}-${i}`} delay={0.05} once={false}>
                <div className={`relative flex pl-12 md:w-1/2 md:pl-0 ${left ? 'md:pr-12' : 'md:ml-auto md:pl-12'}`}>
                  <div
                    className={`absolute top-6 left-[11px] z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 md:top-8 ${left ? 'md:right-[-8px] md:left-auto' : 'md:left-[-8px]'}`}
                    style={{ borderColor: isNext ? 'var(--gold)' : 'var(--mar-red)', background: 'var(--bg)' }}
                  >
                    {isNext && <span className="live-dot" style={{ background: 'var(--gold)' }} />}
                  </div>
                  <motion.div
                    whileHover={{ y: -5, rotate: left ? -1.2 : 1.2 }}
                    whileTap={{ scale: 0.99 }}
                    className="panel panel--glow w-full p-5 sm:p-6"
                    style={isNext ? { borderColor: 'rgba(242,182,60,0.45)', boxShadow: '0 0 40px rgba(242,182,60,0.08)' } : undefined}
                  >
                    <div className="mono flex items-center justify-between gap-4 text-[0.6rem] uppercase tracking-[0.2em]" style={{ color: isNext ? 'var(--gold)' : 'var(--faint)' }}>
                      <span>{step.stage}</span>
                      <span>{step.date}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <Flag code="ma" size={34} />
                      <span className="display text-3xl" style={{ color: step.outcome === 'W' ? 'var(--pitch)' : step.outcome === 'D' ? 'var(--gold)' : isNext ? 'var(--gold)' : 'var(--danger)' }}>
                        {step.result}
                      </span>
                      <Flag code={opp.code} size={34} />
                      <span className="text-[0.85rem] font-semibold">{opp.name}</span>
                    </div>
                    <p className="mt-3 text-[0.85rem] leading-relaxed" style={{ color: 'var(--muted)' }}>
                      {step.story}
                    </p>
                  </motion.div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ZelligeBreak() {
  return (
    <motion.div
      className="zellige-band"
      initial={{ clipPath: 'inset(0 50% 0 50%)', opacity: 0 }}
      whileInView={{ clipPath: 'inset(0 0% 0 0%)', opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    />
  )
}

/* ---------- Next match + simulation odds ---------- */
function NextMatch() {
  const { fixtures } = useLiveData()
  const next = useMemo(() => deriveMoroccoNext(fixtures), [fixtures])
  const sim = useMemo(() => runSimulation(10000, fixtures), [fixtures])
  const mar = sim.results.find((r) => r.team.id === 'mar')

  // Eliminated (or champions) — no next match.
  if (!next || !mar) {
    const marPlayed = fixtures.filter((f) => f.stage !== 'Group' && (f.home === 'mar' || f.away === 'mar') && f.status === 'played')
    const lastLost = marPlayed.find((f) => winnerOf(f) && winnerOf(f) !== 'mar')
    return (
      <section className="mx-auto max-w-4xl px-5 pb-[var(--space-section)] text-center">
        <SectionHead kicker="The run" title={lastLost ? 'A run to be proud of' : 'Champions of the world'} red />
        <p className="mx-auto mt-6 max-w-lg text-[0.95rem]" style={{ color: 'var(--muted)' }}>
          {lastLost
            ? `Morocco's 2026 World Cup ends in the ${lastLost.stage}. Dima Maghrib — the Atlas Lions carried a nation again.`
            : 'The Atlas Lions have gone all the way. History.'}
        </p>
      </section>
    )
  }

  // Orient prediction to Morocco's home/away side in the fixture.
  const home = teamById(next.homeId)
  const away = teamById(next.awayId)
  const prediction = predictMatch(home, away)
  const dateLabel = next.date && next.date.includes('T') ? new Date(next.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : next.date

  return (
    <section className="mx-auto max-w-7xl px-5 pb-[var(--space-section)]">
      <SectionHead
        kicker={`${next.stage}${next.venue ? ` · ${next.venue}` : ''}${dateLabel ? ` · ${dateLabel}` : ''}`}
        title={next.known ? `${home.name} vs ${away.name}` : `Morocco await their ${next.stage} opponent`}
        red
        sub={
          next.known
            ? "The model's read on Morocco's next test — win probabilities, expected goals and the factors driving them."
            : `Morocco are through. The ${next.stage} opponent will be decided by the highlighted tie — the projection updates the moment it finishes.`
        }
      />
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="panel p-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flag code={home.code} size={44} />
              <span className="display text-2xl">{home.name}</span>
            </div>
            <span className="display text-xl" style={{ color: 'var(--faint)' }}>vs</span>
            <div className="flex items-center gap-3">
              <span className="display text-2xl">{next.known ? away.name : `${away.name}?`}</span>
              <Flag code={away.code} size={44} />
            </div>
          </div>
          {!next.known && (
            <p className="mono mt-3 text-[0.62rem] uppercase tracking-[0.18em]" style={{ color: 'var(--gold)' }}>
              Opponent provisional — projection assumes {away.name}
            </p>
          )}
          <div className="mt-7">
            <ProbBar pHome={prediction.pHome} pDraw={prediction.pDraw} pAway={prediction.pAway} labels={[home.name, 'Draw', away.name]} height={14} />
          </div>
          <ul className="m-0 mt-6 list-none space-y-2 p-0 text-[0.88rem]">
            {prediction.explanation.map((line) => (
              <li key={line} style={{ color: 'var(--muted)' }}>
                · {line}
              </li>
            ))}
          </ul>
          <Link to={`/predict?h=${home.id}&a=${away.id}`} className="mono mt-6 inline-block text-[0.68rem] tracking-[0.25em] uppercase no-underline" style={{ color: 'var(--mar-red)' }}>
            Full breakdown with SHAP attributions →
          </Link>
        </div>
        <div className="panel p-7">
          <div className="mono text-[0.62rem] uppercase tracking-[0.24em]" style={{ color: 'var(--faint)' }}>
            {sim.runs.toLocaleString()} Monte Carlo simulations
          </div>
          <div className="mt-5 space-y-5">
            {[
              { label: 'Reach quarter-final', value: mar.quarter },
              { label: 'Reach semi-final', value: mar.semi },
              { label: 'Reach the final', value: mar.final },
              { label: 'Win the World Cup', value: mar.champion },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[0.82rem]">{row.label}</span>
                  <span className="display text-2xl" style={{ color: 'var(--mar-red)' }}>
                    <Counter value={row.value * 100} decimals={1} suffix="%" />
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${row.value * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ background: 'linear-gradient(90deg, rgba(226,75,88,0.4), var(--mar-red))' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Squad danger board ---------- */
function Squad() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-[var(--space-section)]">
      <SectionHead kicker="Players to watch" title="Danger board" red sub="Danger index blends xG + xA contribution, progressive actions and final-third touches per 90." />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MOROCCO_SQUAD.map((p, i) => (
          <Reveal key={p.name} delay={i * 0.05}>
            <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="panel panel--glow h-full p-5">
              <div className="flex items-baseline justify-between">
                <span className="mono text-[0.62rem] uppercase tracking-[0.18em]" style={{ color: 'var(--mar-red)' }}>
                  {p.position}
                </span>
                <span className="display text-lg" style={{ color: 'var(--gold)' }}>
                  {p.rating.toFixed(1)}
                </span>
              </div>
              <div className="display mt-2 text-2xl leading-none">{p.name}</div>
              <div className="mono mt-1 text-[0.62rem]" style={{ color: 'var(--faint)' }}>
                {p.club}
              </div>
              <div className="mt-4 text-[0.72rem]" style={{ color: 'var(--muted)' }}>
                {p.keyStat}
              </div>
              <div className="display text-xl" style={{ color: 'var(--pitch)' }}>
                {p.keyValue}
              </div>
              <div className="mt-4">
                <div className="mono mb-1 flex justify-between text-[0.58rem] uppercase tracking-[0.15em]" style={{ color: 'var(--faint)' }}>
                  <span>Danger index</span>
                  <span>{p.danger}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full" style={{ background: 'var(--surface)' }}>
                  <motion.div
                    className="h-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${p.danger}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.2 }}
                    style={{ background: 'linear-gradient(90deg, var(--mar-red), var(--gold))' }}
                  />
                </div>
              </div>
            </motion.div>
          </Reveal>
        ))}
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {MOROCCO_ATTACK_ZONES.map((z, i) => (
          <Reveal key={z.zone} delay={i * 0.07}>
            <div className="panel p-6">
              <div className="display text-5xl" style={{ color: 'var(--mar-red)' }}>
                <Counter value={z.share} suffix="%" />
              </div>
              <div className="mt-2 text-[0.85rem] font-semibold">{z.zone}</div>
              <p className="mt-2 text-[0.75rem]" style={{ color: 'var(--muted)' }}>
                {z.note}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ---------- 2022 vs 2026 ---------- */
function Compare() {
  return (
    <section className="mx-auto max-w-4xl px-5 pb-[var(--space-section)]">
      <SectionHead kicker="History repeating?" title="2022 Qatar vs 2026" red sub="The semi-final run in Qatar set the bar. Ouahbi's side has matched the group-stage haul — and added another famous shootout to the collection." />
      <div className="mt-10 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--line)' }}>
        {COMPARE_2022.map((row, i) => (
          <Reveal key={row.metric} delay={i * 0.04} y={10}>
            <div
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-t px-5 py-3.5 sm:grid-cols-[2fr_1fr_1fr]"
              style={{ borderColor: i === 0 ? 'transparent' : 'var(--line)' }}
            >
              <span className="text-[0.82rem]" style={{ color: 'var(--muted)' }}>
                {row.metric}
              </span>
              <span className="mono text-right text-[0.8rem]" style={{ color: row.better === '2022' ? 'var(--gold)' : 'var(--faint)' }}>
                {row.y2022}
              </span>
              <span className="mono text-right text-[0.8rem] font-semibold" style={{ color: row.better === '2026' ? 'var(--pitch)' : 'var(--text)' }}>
                {row.y2026}
              </span>
            </div>
          </Reveal>
        ))}
        <div className="mono grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-2.5 text-[0.58rem] tracking-[0.2em] uppercase sm:grid-cols-[2fr_1fr_1fr]" style={{ background: 'var(--surface)', color: 'var(--faint)' }}>
          <span />
          <span className="text-right">Qatar 2022</span>
          <span className="text-right">2026</span>
        </div>
      </div>
    </section>
  )
}

function buildFacts(steps: JourneyStep[]): { label: string; value: string }[] {
  const wins = steps.filter((s) => s.outcome === 'W').length
  const draws = steps.filter((s) => s.outcome === 'D').length
  const losses = steps.filter((s) => s.outcome === 'L').length
  const played = steps.filter((s) => s.outcome !== 'next')
  const next = steps.find((s) => s.outcome === 'next')
  const latestKO = [...played].reverse().find((s) => !s.stage.startsWith('Group'))
  return [
    { label: losses === 0 ? 'Unbeaten in' : 'Record', value: losses === 0 ? `${played.length} games` : `${wins}W ${draws}D ${losses}L` },
    { label: 'Group C finish', value: '2nd · 7 pts' },
    { label: latestKO ? latestKO.stage : 'Round of 32', value: latestKO ? `${teamById(latestKO.opponentId).code.toUpperCase()} ${latestKO.result.includes('pens') ? '· pens' : latestKO.result}` : 'NED · pens' },
    { label: 'Next up', value: next ? `${teamById(next.opponentId).code.toUpperCase()}${next.result === 'Awaiting opponent' ? '?' : ''}` : 'TBD' },
  ]
}

export default function Morocco() {
  const { fixtures } = useLiveData()
  const steps = useMemo(() => deriveMoroccoJourney(fixtures), [fixtures])
  const facts = useMemo(() => buildFacts(steps), [steps])

  return (
    <div>
      <MoroccoHero facts={facts} />
      <ZelligeBreak />
      <Journey steps={steps} />
      <ZelligeBreak />
      <NextMatch />
      <Squad />
      <ZelligeBreak />
      <Compare />
    </div>
  )
}
