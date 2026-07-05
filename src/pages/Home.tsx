import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Bracket } from '../components/Bracket'
import { EmberField } from '../components/EmberField'
import { LeadersBoard } from '../components/LeadersBoard'
import { MatchCarousel } from '../components/MatchCarousel'
import { Ticker } from '../components/Ticker'
import { Counter, Flag, MagneticLink, ProbBar, Reveal, SectionHead } from '../components/ui/primitives'
import { TOP_SCORERS } from '../data/players'
import { TEAMS, teamById } from '../data/teams'
import { computeCurrentElo } from '../engine/elo'
import { deriveMoroccoNext } from '../engine/moroccoJourney'
import { useSyncedElo } from '../services/eloSync'
import { predictMatch } from '../engine/predict'
import { useLiveData } from '../services/LiveDataContext'

function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const { fixtures } = useLiveData()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [1.12, 1.34])
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const meshY = useTransform(scrollYProgress, [0, 1], ['-6%', '14%'])
  const orbitY = useTransform(scrollYProgress, [0, 1], ['0%', '8%'])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  // Primary CTA always points at Morocco's *next* match, never a finished one.
  const next = deriveMoroccoNext(fixtures)
  const featured = (() => {
    if (next) {
      const home = teamById(next.homeId)
      const away = teamById(next.awayId)
      return { to: `/predict?h=${home.id}&a=${away.id}`, label: `${home.name} vs ${away.name} / ${next.stage} preview` }
    }
    // Morocco done — fall back to the tournament favourite (top Elo, still alive).
    const fav = [...TEAMS].filter((t) => t.alive).sort((a, b) => b.elo - a.elo)[0]
    return fav ? { to: `/predict?h=${fav.id}&a=mar`, label: 'Open the prediction engine' } : { to: '/predict', label: 'Open the prediction engine' }
  })()

  return (
    <div ref={ref} className="relative h-[112svh] min-h-[720px] overflow-hidden">
      <motion.div className="image-grade absolute inset-0" style={{ scale, y }}>
        <img
          src="/img/stadium-hero.png"
          alt=""
          width="1680"
          height="720"
          loading="eager"
          className="h-full w-full object-cover opacity-95 mix-blend-luminosity"
        />
        <div className="absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(18,14,8,0.34)_0%,rgba(18,14,8,0.08)_42%,var(--bg)_96%)]" />
        <div className="absolute inset-0 z-[3] bg-[radial-gradient(circle_at_74%_34%,rgba(242,182,60,0.14),transparent_22%),linear-gradient(90deg,rgba(18,14,8,0.9)_0%,rgba(18,14,8,0.2)_48%,rgba(18,14,8,0.72)_100%)] mix-blend-multiply" />
      </motion.div>

      <motion.div className="hero-mesh absolute inset-x-[8%] top-[10%] h-[58vh]" style={{ y: meshY }} />
      <motion.svg
        aria-hidden
        className="absolute inset-0 z-[4] h-full w-full opacity-35"
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
        style={{ y: orbitY }}
      >
        <defs>
          <linearGradient id="hero-orbit" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f2b63c" stopOpacity="0.1" />
            <stop offset="55%" stopColor="#ff6b35" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#e24b58" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <motion.path
          d="M-40 590 C210 480 250 210 492 294 C700 366 713 132 960 178 C1092 203 1160 132 1250 70"
          fill="none"
          stroke="url(#hero-orbit)"
          strokeWidth="2"
          strokeDasharray="8 18"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.6, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
        />
      </motion.svg>

      <EmberField />

      <motion.div
        className="mono absolute top-28 right-5 z-10 hidden flex-col items-center gap-4 text-[0.62rem] tracking-[0.32em] uppercase lg:flex"
        style={{ color: 'rgba(245,238,222,0.66)', writingMode: 'vertical-rl' }}
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        World Cup 2026
        <span className="h-24 w-px bg-[var(--line-strong)]" />
        Terracotta Broadcast
      </motion.div>

      <motion.div
        className="relative z-10 mx-auto flex h-full max-w-7xl flex-col overflow-hidden px-5 pt-32 pb-14 [justify-content:safe_center] sm:pt-36"
        style={{ opacity: fade }}
      >
        <motion.p
          className="kicker max-w-[19rem] border-l pl-3 sm:max-w-none"
          style={{ borderColor: 'var(--line-strong)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Explainable Football Intelligence / World Cup 2026
        </motion.p>
        <h1 className="display mt-5 max-w-[940px] md:-ml-3" style={{ fontSize: 'var(--text-hero)' }}>
          {[
            { text: 'Every match.', className: '' },
            { text: 'Every probability.', className: 'outline-word' },
            { text: 'Explained.', className: 'grad-text' },
          ].map((line, i) => (
            <span key={line.text} className="block overflow-hidden">
              <motion.span
                className={`block ${line.className}`}
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                transition={{ duration: 1, delay: 0.35 + i * 0.14, ease: [0.16, 1, 0.3, 1] }}
              >
                {line.text}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p
          className="mt-6 max-w-xl text-[1.02rem]"
          style={{ color: 'var(--muted)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
        >
          AtlasKick fuses Elo ratings, Poisson goal models and feature-based machine learning into
          one ensemble, then shows exactly why each prediction is what it is.
        </motion.p>
        <motion.div
          className="mt-9 flex flex-wrap gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 0.8 }}
        >
          <MagneticLink
            to={featured.to}
            className="display grad-bg min-h-11 rounded-xl px-6 py-3 text-base tracking-wide no-underline shadow-[0_18px_44px_rgba(226,75,88,0.18)] transition-transform hover:scale-[1.02] sm:px-7 sm:text-lg"
          >
            {featured.label}
          </MagneticLink>
          <MagneticLink
            to="/simulator"
            className="display min-h-11 rounded-xl border px-6 py-3 text-base tracking-wide no-underline transition-colors hover:border-[var(--ember)] sm:px-7 sm:text-lg"
            style={{ borderColor: 'var(--line-strong)', color: 'var(--text)', background: 'rgba(18,14,8,0.5)', backdropFilter: 'blur(6px)' }}
          >
            Simulate the Tournament x10,000
          </MagneticLink>
        </motion.div>

        <motion.div
          className="mt-14 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
        >
          {[
            { label: 'Teams tracked', value: 48 },
            { label: 'Models in ensemble', value: 3 },
            { label: 'Sim runs / click', value: 10000 },
            { label: 'Matches analyzed', value: 84 },
          ].map((s) => (
            <div key={s.label} className="border-l pl-3" style={{ borderColor: 'var(--line-strong)' }}>
              <div className="display text-3xl" style={{ color: 'var(--pitch)' }}>
                <Counter value={s.value} />
              </div>
              <div className="mono text-[0.6rem] uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        className="mono absolute bottom-24 left-1/2 z-10 -translate-x-1/2 text-[0.62rem] tracking-[0.3em] uppercase"
        style={{ color: 'var(--muted)' }}
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      >
        Scroll v
      </motion.div>
    </div>
  )
}

function Results() {
  const { fixtures } = useLiveData()
  const played = fixtures.filter((f) => f.stage !== 'Group' && f.status === 'played').slice(-9).reverse()
  const nextMorocco = fixtures.find((f) => f.status !== 'played' && (f.home === 'mar' || f.away === 'mar'))
  const spanPattern = ['lg:col-span-4', 'lg:col-span-3', 'lg:col-span-4', 'lg:col-span-5', 'lg:col-span-3', 'lg:col-span-4']

  if (played.length === 0 && !nextMorocco) return null

  return (
    <section className="mx-auto max-w-7xl px-5 pt-[var(--space-section)]">
      <SectionHead
        kicker="Knockout results / Tap for full stats"
        title="Results, Recut"
        sub="Possession, shots, pass maps and goal timelines sit beside the match that matters next."
      />
      <div className="mt-10 grid auto-rows-[minmax(150px,auto)] gap-4 md:grid-cols-2 lg:grid-cols-12">
        {nextMorocco && (() => {
          const home = teamById(nextMorocco.home)
          const away = teamById(nextMorocco.away)
          const date = new Date(nextMorocco.date)
          const prediction = predictMatch(home, away)
          const moroccoProb = nextMorocco.home === 'mar' ? prediction.pHome : prediction.pAway

          return (
            <motion.div
              className="grad-frame relative min-h-[360px] overflow-hidden p-5 md:col-span-2 lg:col-span-5 lg:row-span-2 lg:min-h-[430px]"
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <img
                src="/img/card-morocco.png"
                alt=""
                width="960"
                height="1200"
                loading="lazy"
                className="absolute inset-y-0 right-0 h-full w-[58%] object-cover opacity-70 mix-blend-screen"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--surface)_0%,rgba(29,22,12,0.86)_42%,rgba(18,14,8,0.35)_100%)]" />
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div>
                  <p className="kicker kicker--red">Oversized fixture</p>
                  <h3 className="display mt-4 max-w-[11ch] text-5xl leading-[0.9] sm:text-6xl">
                    Next Morocco Match
                  </h3>
                  <div className="mt-7 flex items-center gap-3">
                    <Flag code={home.code} size={44} />
                    <span className="display text-2xl">{home.name}</span>
                    <span className="display text-xl" style={{ color: 'var(--faint)' }}>vs</span>
                    <span className="display text-2xl">{away.name}</span>
                    <Flag code={away.code} size={44} />
                  </div>
                  <div className="mono mt-3 text-[0.66rem] uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
                    {nextMorocco.stage} / {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} / {nextMorocco.city}
                  </div>
                </div>
                <div className="mt-9 max-w-md">
                  <div className="display text-6xl" style={{ color: 'var(--mar-red)' }}>
                    <Counter value={moroccoProb * 100} decimals={0} suffix="%" />
                  </div>
                  <div className="mono mt-1 text-[0.62rem] uppercase tracking-[0.22em]" style={{ color: 'var(--faint)' }}>
                    Morocco win probability
                  </div>
                  <div className="mt-5">
                    <ProbBar pHome={prediction.pHome} pDraw={prediction.pDraw} pAway={prediction.pAway} labels={[home.id.toUpperCase(), 'D', away.id.toUpperCase()]} />
                  </div>
                  <Link
                    to={`/predict?h=${home.id}&a=${away.id}`}
                    className="mono mt-6 inline-flex min-h-11 items-center text-[0.68rem] tracking-[0.25em] uppercase no-underline"
                    style={{ color: 'var(--pitch)' }}
                  >
                    Open prediction -&gt;
                  </Link>
                </div>
              </div>
            </motion.div>
          )
        })()}

        {played.map((f, i) => {
          const home = teamById(f.home)
          const away = teamById(f.away)
          const stage = f.stage === 'Round of 32' ? 'R32' : f.stage === 'Round of 16' ? 'R16' : f.stage
          const className = `panel panel--glow min-h-[150px] p-4 md:p-5 ${spanPattern[i % spanPattern.length]}`
          const card = (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.55, delay: (i % 4) * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className={className}
            >
              <div className="mono flex items-center justify-between text-[0.58rem] uppercase tracking-[0.2em]" style={{ color: 'var(--faint)' }}>
                <span>{stage}</span>
                <span style={{ color: f.espnId ? 'var(--pitch)' : 'var(--faint)' }}>{f.espnId ? 'Stats feed' : 'Final'}</span>
              </div>
              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="min-w-0 text-right">
                  <Flag code={home.code} size={26} />
                  <div className="mt-2 truncate text-[0.82rem] font-semibold">{home.name}</div>
                </div>
                <div className="display text-4xl" style={{ color: 'var(--pitch)' }}>
                  {f.homeGoals}-{f.awayGoals}
                </div>
                <div className="min-w-0">
                  <Flag code={away.code} size={26} />
                  <div className="mt-2 truncate text-[0.82rem] font-semibold">{away.name}</div>
                </div>
              </div>
              <div className="mono mt-5 flex items-center justify-between text-[0.6rem] uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
                <span>{f.city || 'World Cup 2026'}</span>
                <span>{f.pens ? `${f.pens} pens` : f.note ? 'Storyline' : 'Report'}</span>
              </div>
            </motion.div>
          )
          return f.espnId ? (
            <Link key={f.id} to={`/match/${f.espnId}`} className="no-underline md:contents" style={{ color: 'inherit' }}>
              {card}
            </Link>
          ) : (
            <div key={f.id} className="md:contents">
              {card}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ExplainTeaser() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-12%', '12%'])
  const scale = useTransform(scrollYProgress, [0, 1], [1.25, 1.05])

  return (
    <section ref={ref} className="relative my-[var(--space-section)] overflow-hidden py-28">
      <motion.div className="image-grade absolute inset-0" style={{ y, scale }}>
        <img src="/img/pitch-data.png" alt="" width="1280" height="720" loading="lazy" className="h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 z-[2] bg-[linear-gradient(90deg,var(--bg)_8%,rgba(18,14,8,0.52)_55%,var(--bg)_96%)]" />
      </motion.div>
      <div className="relative z-10 mx-auto max-w-7xl px-5">
        <div className="max-w-xl">
          <SectionHead
            kicker="Why this prediction?"
            title="Predictions you can interrogate"
            sub="Every probability decomposes into feature attributions: Elo gap, form, chance creation, defensive stability and xG balance."
          />
          <Reveal delay={0.15}>
            <div className="mt-8 space-y-3">
              {[
                ['Elo win-expectancy model', 'baseline rating-difference probability'],
                ['Poisson / Dixon-Coles goal model', 'full scoreline probability matrix'],
                ['Feature logistic model', 'form / xG / defense / clean sheets'],
              ].map(([name, desc]) => (
                <div key={name} className="panel flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <span className="text-[0.88rem] font-semibold">{name}</span>
                  <span className="mono text-[0.68rem]" style={{ color: 'var(--muted)' }}>
                    {desc}
                  </span>
                </div>
              ))}
            </div>
            <Link to="/predict" className="mono mt-7 inline-flex min-h-11 items-center text-[0.7rem] tracking-[0.25em] uppercase no-underline" style={{ color: 'var(--pitch)' }}>
              Open the prediction engine -&gt;
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Tables() {
  const { leaders, fixtures, scheduledAt } = useLiveData()
  // Real ELO ratings (worldfootballrankings.com, Jul 4 baseline) with every
  // newly played result applied live — the table moves after every match.
  const eloSync = useSyncedElo()
  const eloNow = computeCurrentElo(fixtures, eloSync)
  const all = [...TEAMS]
    .map((team) => ({ team, ...eloNow.get(team.id)! }))
    .sort((a, b) => b.elo - a.elo)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }))

  const ranked = all.slice(0, 12)
  const mar = all.find((e) => e.team.id === 'mar')
  if (mar && !ranked.some((e) => e.team.id === 'mar')) ranked.push(mar)
  const maxStrength = Math.max(...ranked.map((entry) => entry.elo))
  const minStrength = Math.min(...ranked.map((entry) => entry.elo))
  const leader = all[0]

  return (
    <section className="mx-auto max-w-7xl px-5 py-[var(--space-section)]">
      <SectionHead
        kicker="Live power rankings / Player boards"
        title="Leaderboards, Bent Into View"
        sub="Real ELO ratings synced hourly from worldfootballrankings.com; results since the last sync are applied on top by the local engine (K=50, goal-difference weighted)."
      />
      <div className="mt-10 grid gap-4 lg:grid-cols-12">
        <div className="panel p-5 sm:p-7 lg:col-span-7 lg:row-span-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker">ELO top 12 · live</p>
              <h3 className="display mt-2 text-4xl">Power Table</h3>
            </div>
            <div className="mono text-right text-[0.58rem] uppercase tracking-[0.18em]" style={{ color: 'var(--faint)' }}>
              {mar ? `Morocco #${mar.rank} · ${mar.elo}` : ''}
              {eloSync
                ? ` · synced ${new Date(eloSync.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : ' · local engine'}
            </div>
          </div>
          <div className="mt-7 space-y-2.5">
            {ranked.map(({ team: t, elo, delta, rank }, i) => (
              <Reveal key={t.id} delay={i * 0.035} y={12}>
                <div
                  className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2.5 sm:grid-cols-[auto_auto_8rem_minmax(0,1fr)_auto_auto]"
                  style={{
                    opacity: t.alive ? 1 : 0.45,
                    borderColor: t.id === 'mar' ? 'rgba(226,75,88,0.5)' : 'var(--line)',
                    background: t.id === 'mar' ? 'var(--mar-red-soft)' : i < 3 ? 'rgba(242,182,60,0.045)' : 'transparent',
                  }}
                >
                  <span className="mono w-5 text-right text-[0.7rem]" style={{ color: rank <= 12 ? 'var(--faint)' : 'var(--mar-red)' }}>
                    {rank}
                  </span>
                  <Flag code={t.code} size={24} />
                  <span className="min-w-0 truncate text-[0.85rem] font-medium" style={t.id === 'mar' ? { color: 'var(--mar-red)' } : undefined}>
                    {t.name}
                    {!t.alive && (
                      <span className="mono ml-1.5 text-[0.55rem] tracking-widest uppercase" style={{ color: 'var(--faint)' }}>
                        out
                      </span>
                    )}
                  </span>
                  <div className="relative hidden h-5 overflow-hidden rounded sm:block" style={{ background: 'var(--surface)' }}>
                    <motion.div
                      className="h-full rounded"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${((elo - minStrength) / Math.max(maxStrength - minStrength, 1)) * 82 + 18}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                      style={{ background: t.id === 'mar' ? 'linear-gradient(90deg, rgba(226,75,88,0.3), var(--mar-red))' : 'linear-gradient(90deg, rgba(242,182,60,0.18), rgba(242,182,60,0.75))' }}
                    />
                  </div>
                  <span className="mono w-12 text-right text-[0.72rem]" style={{ color: 'var(--muted)' }}>
                    {elo}
                  </span>
                  <span
                    className="mono hidden w-12 text-right text-[0.62rem] sm:block"
                    style={{ color: delta > 0 ? 'var(--emerald)' : delta < 0 ? 'var(--danger)' : 'var(--faint)' }}
                  >
                    {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${Math.abs(delta)}` : '—'}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="panel p-5 sm:p-6 lg:col-span-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="kicker">{leaders ? 'Live player leaders' : 'Golden boot race'}</p>
              <h3 className="display mt-2 text-4xl">{leaders ? 'Leaderboards' : 'Top Scorers'}</h3>
            </div>
            <div className="h-12 w-12 rounded-full grad-bg" />
          </div>
          {leaders ? (
            <div className="mt-7">
              <LeadersBoard leaders={leaders} scheduledAt={scheduledAt} />
            </div>
          ) : (
            <div className="mt-7 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--line)' }}>
              <table className="w-full border-collapse text-[0.82rem]">
                <tbody>
                  {[...TOP_SCORERS].sort((a, b) => b.goals - a.goals || b.assists - a.assists).map((p, i) => (
                    <motion.tr
                      key={p.name}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ duration: 0.6, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      className="border-t first:border-t-0"
                      style={{ borderColor: 'var(--line)', background: p.teamId === 'mar' ? 'var(--mar-red-soft)' : undefined }}
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2.5">
                          <Flag code={teamById(p.teamId).code} size={20} />
                          <span>
                            <span className="block font-medium">{p.name}</span>
                            <span className="mono block text-[0.58rem]" style={{ color: 'var(--faint)' }}>
                              {p.goals}G / {p.assists}A - {p.note}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="display px-4 text-right text-xl" style={{ color: 'var(--pitch)' }}>
                        {p.goals}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel p-6 lg:col-span-3">
          <p className="kicker">Current #1</p>
          <div className="mt-4 flex items-center gap-3">
            <Flag code={leader.team.code} size={38} />
            <div>
              <div className="display text-3xl">{leader.team.name}</div>
              <div className="mono text-[0.62rem] uppercase tracking-[0.2em]" style={{ color: 'var(--faint)' }}>
                ELO {leader.elo} · #{leader.rank}
              </div>
            </div>
          </div>
        </div>

        <div className="grad-frame p-6 lg:col-span-4">
          <p className="kicker kicker--red">Pinned watch</p>
          <div className="display mt-3 text-4xl" style={{ color: 'var(--mar-red)' }}>
            Morocco · #{mar?.rank ?? '—'}
          </div>
          <p className="mt-3 text-[0.84rem]" style={{ color: 'var(--muted)' }}>
            {mar
              ? `The Atlas Lions rate ${mar.elo} ELO${mar.delta !== 0 ? ` (${mar.delta > 0 ? '+' : ''}${mar.delta} since the last sync)` : ''} — this card tracks the table live, and the pin keeps Morocco visible even outside the top 12.`
              : 'Tracking Morocco in the live ELO table.'}
          </p>
        </div>
      </div>
    </section>
  )
}

function MoroccoBanner() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [1.3, 1])
  const y = useTransform(scrollYProgress, [0, 1], ['-10%', '10%'])

  return (
    <section ref={ref} className="relative my-[var(--space-section)] overflow-hidden">
      <div className="relative h-[70vh] min-h-[480px]">
        <motion.div className="image-grade absolute inset-0" style={{ scale, y }}>
          <img src="/img/morocco-hero.png" alt="Moroccan fans" width="1280" height="720" loading="lazy" className="h-full w-full object-cover" />
          <div className="absolute inset-0 z-[2] bg-[linear-gradient(180deg,var(--bg)_0%,rgba(18,14,8,0.18)_35%,rgba(18,14,8,0.34)_65%,var(--bg)_100%)]" />
        </motion.div>
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col items-start justify-end px-5 pb-16">
          <Reveal>
            <p className="kicker kicker--red">Dima Maghrib / Atlas Lions</p>
            <h2 className="display mt-3" style={{ fontSize: 'var(--text-h2)' }}>
              The Atlas Lions'
              <br />
              <span style={{ color: 'var(--mar-red)' }}>2026 Journey</span>
            </h2>
            <p className="mt-4 max-w-lg text-[0.95rem]" style={{ color: 'rgba(245,238,222,0.88)' }}>
              Unbeaten through Group C, shootout winners over the Netherlands and now facing Canada in Houston.
            </p>
            <div className="mt-7">
              <MagneticLink
                to="/morocco"
                className="display inline-flex min-h-11 items-center rounded-md px-7 py-3 text-lg tracking-wide no-underline transition-transform hover:scale-[1.02]"
                style={{ background: 'var(--mar-red)', color: '#fff' }}
              >
                Enter Morocco Mode -&gt;
              </MagneticLink>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <div>
      <Hero />
      <Ticker />
      <section className="mx-auto max-w-7xl px-5 pt-[var(--space-section)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead kicker="Knockout stage / Live model odds" title="Next Matches" sub="Drag to explore. Probabilities update from the three-model ensemble." />
        </div>
        <div className="mt-10">
          <MatchCarousel />
        </div>
      </section>
      <Results />
      <ExplainTeaser />
      <section className="mx-auto max-w-7xl px-5">
        <SectionHead kicker="Road to MetLife / July 19" title="The Bracket" sub="Advance probabilities on every tie come straight from the ensemble, with draw mass reallocated for extra time and penalties." />
        <div className="mt-10">
          <Bracket />
        </div>
      </section>
      <Tables />
      <MoroccoBanner />
    </div>
  )
}
