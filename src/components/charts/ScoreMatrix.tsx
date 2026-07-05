import { motion } from 'framer-motion'

interface ScoreMatrixProps {
  matrix: number[][]
  homeName: string
  awayName: string
  best: [number, number]
}

const SHOW = 5 // display 0..4 goals each side

export function ScoreMatrix({ matrix, homeName, awayName, best }: ScoreMatrixProps) {
  const cells = matrix.slice(0, SHOW).map((row) => row.slice(0, SHOW))
  const max = Math.max(...cells.flat())

  return (
    <div>
      <div className="mono mb-3 text-[0.62rem] uppercase tracking-[0.2em]" style={{ color: 'var(--faint)' }}>
        Scoreline probability matrix — {homeName} (rows) × {awayName} (cols)
      </div>
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `28px repeat(${SHOW}, 1fr)` }}>
        <div />
        {Array.from({ length: SHOW }, (_, a) => (
          <div key={a} className="mono pb-1 text-center text-[0.65rem]" style={{ color: 'var(--muted)' }}>
            {a}
          </div>
        ))}
        {cells.map((row, h) => (
          <div key={h} className="contents">
            <div className="mono flex items-center justify-center text-[0.65rem]" style={{ color: 'var(--muted)' }}>
              {h}
            </div>
            {row.map((p, a) => {
              const isBest = h === best[0] && a === best[1]
              return (
                <motion.div
                  key={a}
                  initial={{ opacity: 0, scale: 0.6 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: (h * SHOW + a) * 0.018 }}
                  className="mono flex aspect-square min-w-11 items-center justify-center rounded-md text-[0.68rem]"
                  style={{
                    background: `rgba(0, 229, 138, ${(0.04 + (p / max) * 0.55).toFixed(3)})`,
                    color: p / max > 0.5 ? 'var(--on-accent)' : 'var(--muted)',
                    fontWeight: p / max > 0.5 ? 600 : 400,
                    outline: isBest ? '1.5px solid var(--gold)' : 'none',
                  }}
                >
                  {(p * 100).toFixed(1)}
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
