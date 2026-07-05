import { motion } from 'framer-motion'
import type { FeatureContribution } from '../../engine/predict'

interface WaterfallProps {
  contributions: FeatureContribution[]
  homeName: string
  awayName: string
}

// SHAP-style horizontal contribution chart: bars extend right (favors home,
// pitch green) or left (favors away, crimson) from a zero axis.
export function Waterfall({ contributions, homeName, awayName }: WaterfallProps) {
  const max = Math.max(...contributions.map((c) => Math.abs(c.deltaPp)), 1)

  return (
    <div>
      <div className="mono mb-4 flex justify-between text-[0.65rem] uppercase tracking-[0.2em]">
        <span style={{ color: 'var(--mar-red)' }}>← favors {awayName}</span>
        <span style={{ color: 'var(--pitch)' }}>favors {homeName} →</span>
      </div>
      <div className="space-y-3">
        {contributions.map((c, i) => {
          const positive = c.deltaPp >= 0
          const width = (Math.abs(c.deltaPp) / max) * 50
          return (
            <div key={c.feature} className="grid grid-cols-[minmax(120px,1fr)_2fr] items-center gap-3">
              <div>
                <div className="text-[0.78rem] font-medium">{c.label}</div>
                <div className="mono text-[0.62rem]" style={{ color: 'var(--faint)' }}>
                  {c.value}
                </div>
              </div>
              <div className="relative h-7">
                <div className="absolute inset-y-0 left-1/2 w-px" style={{ background: 'var(--line-strong)' }} />
                <motion.div
                  className="absolute top-1 bottom-1 rounded-sm"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${width}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    left: positive ? '50%' : undefined,
                    right: positive ? undefined : '50%',
                    background: positive
                      ? 'linear-gradient(90deg, rgba(242,182,60,0.25), var(--pitch))'
                      : 'linear-gradient(270deg, rgba(226,75,88,0.25), var(--mar-red))',
                  }}
                />
                <span
                  className="mono absolute top-1/2 -translate-y-1/2 text-[0.66rem] font-semibold"
                  style={{
                    left: positive ? `calc(50% + ${width}% + 8px)` : undefined,
                    right: positive ? undefined : `calc(50% + ${width}% + 8px)`,
                    color: positive ? 'var(--pitch)' : 'var(--mar-red)',
                  }}
                >
                  {positive ? '+' : '−'}
                  {Math.abs(c.deltaPp).toFixed(1)}pp
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
