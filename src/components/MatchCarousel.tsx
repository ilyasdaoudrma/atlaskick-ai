import { motion } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { teamById } from '../data/teams'
import { predictMatch } from '../engine/predict'
import { useLiveData } from '../services/LiveDataContext'
import { Flag, ProbBar } from './ui/primitives'

// Draggable, momentum-scrolling carousel of live + upcoming fixtures with model odds.
export function MatchCarousel() {
  const ref = useRef<HTMLDivElement>(null)
  const { fixtures: allFixtures } = useLiveData()
  const fixtures = allFixtures.filter((f) => f.status !== 'played').slice(0, 12)

  return (
    <div ref={ref} className="overflow-hidden">
      <motion.div
        className="flex cursor-grab gap-5 active:cursor-grabbing"
        drag="x"
        dragConstraints={ref}
        dragElastic={0.08}
        whileTap={{ cursor: 'grabbing' }}
      >
        {fixtures.map((f, i) => {
          const home = teamById(f.home)
          const away = teamById(f.away)
          const p = predictMatch(home, away)
          const isMorocco = f.home === 'mar' || f.away === 'mar'
          const date = new Date(f.date)
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -8, rotate: isMorocco ? -3.5 : i % 2 === 0 ? 2.5 : -2.5 }}
              whileTap={{ scale: 0.98, rotate: 0 }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="panel panel--glow w-[82vw] max-w-[320px] shrink-0 select-none p-5 sm:w-[300px]"
              style={{
                transformOrigin: i % 2 === 0 ? '70% 20%' : '30% 20%',
                ...(isMorocco ? { borderColor: 'rgba(226,75,88,0.4)' } : {}),
              }}
            >
              <div className="mono flex items-center justify-between text-[0.62rem] uppercase tracking-[0.18em]" style={{ color: 'var(--faint)' }}>
                <span style={isMorocco ? { color: 'var(--mar-red)' } : undefined}>{f.stage}</span>
                <span>
                  {f.status === 'live' ? (
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--danger)' }}>
                      <span className="live-dot" style={{ background: 'var(--danger)' }} /> LIVE{f.minute ? ` ${f.minute}′` : ''}
                    </span>
                  ) : (
                    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  )}
                </span>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <div className="flex flex-col items-center gap-2">
                  <Flag code={home.code} size={44} />
                  <span className="display text-lg">{home.id.toUpperCase()}</span>
                </div>
                <div className="text-center">
                  {f.status === 'live' ? (
                    <div className="display text-3xl">{f.homeGoals ?? 0}–{f.awayGoals ?? 0}</div>
                  ) : (
                    <div className="mono text-[0.7rem]" style={{ color: 'var(--muted)' }}>
                      {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  <div className="mono mt-1 text-[0.6rem]" style={{ color: 'var(--faint)' }}>
                    {f.city}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Flag code={away.code} size={44} />
                  <span className="display text-lg">{away.id.toUpperCase()}</span>
                </div>
              </div>
              <div className="mt-5">
                <ProbBar pHome={p.pHome} pDraw={p.pDraw} pAway={p.pAway} labels={[home.id.toUpperCase(), 'DRAW', away.id.toUpperCase()]} height={8} />
              </div>
              <div className="mt-4 flex items-center justify-center gap-5">
                <Link
                  to={`/predict?h=${home.id}&a=${away.id}`}
                  className="mono text-[0.65rem] tracking-[0.2em] uppercase no-underline transition-colors"
                  style={{ color: 'var(--pitch)' }}
                >
                  Prediction →
                </Link>
                {f.espnId && f.status === 'live' && (
                  <Link
                    to={`/match/${f.espnId}`}
                    className="mono text-[0.65rem] tracking-[0.2em] uppercase no-underline transition-colors"
                    style={{ color: 'var(--danger)' }}
                  >
                    Match centre →
                  </Link>
                )}
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
