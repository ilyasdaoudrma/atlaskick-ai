import { Link } from 'react-router-dom'
import { teamById } from '../data/teams'
import { resolveBracket, type BracketSlot, type BracketTie } from '../engine/bracket'
import { predictMatch } from '../engine/predict'
import { useLiveData } from '../services/LiveDataContext'
import { Flag, Reveal } from './ui/primitives'

function SlotRow({ slot, isWinner, prob, dimmed }: { slot: BracketSlot; isWinner: boolean; prob?: number; dimmed: boolean }) {
  if (slot.id) {
    const t = teamById(slot.id)
    return (
      <div className="flex items-center justify-between gap-3 py-1" style={{ opacity: dimmed ? 0.42 : 1 }}>
        <span className="flex items-center gap-2 text-[0.78rem]" style={{ fontWeight: isWinner ? 700 : 400, color: isWinner ? 'var(--pitch)' : 'var(--text)' }}>
          <Flag code={t.code} size={18} />
          {t.name}
          {isWinner && <span aria-hidden>→</span>}
        </span>
        {prob !== undefined && (
          <span className="mono text-[0.66rem]" style={{ color: prob >= 0.5 ? 'var(--pitch)' : 'var(--faint)' }}>
            {(prob * 100).toFixed(0)}%
          </span>
        )}
      </div>
    )
  }
  const [a, b] = slot.from ?? ['', '']
  return (
    <div className="flex items-center gap-1.5 py-1.5" style={{ opacity: 0.75 }}>
      <span className="mono text-[0.58rem] uppercase" style={{ color: 'var(--faint)' }}>
        Winner of
      </span>
      {a && <Flag code={teamById(a).code} size={14} />}
      <span className="mono text-[0.6rem]" style={{ color: 'var(--muted)' }}>
        {a.toUpperCase()}–{b.toUpperCase()}
      </span>
      {b && <Flag code={teamById(b).code} size={14} />}
    </div>
  )
}

function TieCell({ tie, highlightMorocco = true }: { tie: BracketTie; highlightMorocco?: boolean }) {
  const bothKnown = Boolean(tie.a.id && tie.b.id)
  const played = tie.fixture?.status === 'played'
  const live = tie.fixture?.status === 'live'
  const involvesMar = tie.a.id === 'mar' || tie.b.id === 'mar'

  // Model advance probability for scheduled ties with both teams known.
  let pA: number | undefined
  let pB: number | undefined
  if (bothKnown && !played) {
    const p = predictMatch(teamById(tie.a.id!), teamById(tie.b.id!))
    pA = p.pHome + p.pDraw / 2
    pB = p.pAway + p.pDraw / 2
  }

  const score =
    played && tie.fixture
      ? `${tie.fixture.homeGoals}–${tie.fixture.awayGoals}${tie.fixture.pens ? ` (${tie.fixture.pens}p)` : ''}`
      : undefined
  // Fixture orientation can differ from slot order.
  const flipped = tie.fixture ? tie.fixture.home !== tie.a.id : false
  const displayScore = score && flipped ? score.split('–').reverse().join('–').replace(/\((.+)p\)/, (m) => m) : score

  const body = (
    <div
      className="panel px-3 py-2"
      style={
        highlightMorocco && involvesMar
          ? { borderColor: 'rgba(226,75,88,0.5)', boxShadow: '0 0 28px rgba(226,75,88,0.1)' }
          : tie.winner
            ? { borderColor: 'rgba(62,194,132,0.3)' }
            : undefined
      }
    >
      <div className="mono flex items-center justify-between text-[0.55rem] uppercase tracking-[0.14em]" style={{ color: 'var(--faint)' }}>
        <span>{tie.label}</span>
        {live && (
          <span className="flex items-center gap-1" style={{ color: 'var(--danger)' }}>
            <span className="live-dot" style={{ background: 'var(--danger)' }} /> LIVE
          </span>
        )}
        {displayScore && <span style={{ color: 'var(--pitch)' }}>{displayScore}</span>}
      </div>
      <div className="mt-1">
        <SlotRow slot={tie.a} isWinner={tie.winner !== undefined && tie.winner === tie.a.id} prob={pA} dimmed={tie.winner !== undefined && tie.winner !== tie.a.id} />
        <SlotRow slot={tie.b} isWinner={tie.winner !== undefined && tie.winner === tie.b.id} prob={pB} dimmed={tie.winner !== undefined && tie.winner !== tie.b.id} />
      </div>
    </div>
  )

  return tie.fixture?.espnId ? (
    <Link to={`/match/${tie.fixture.espnId}`} className="block no-underline" style={{ color: 'inherit' }}>
      {body}
    </Link>
  ) : (
    body
  )
}

// Knockout bracket — resolves itself from live results: winners advance to
// the next column automatically, undecided slots show where they come from.
export function Bracket() {
  const { fixtures } = useLiveData()
  const bracket = resolveBracket(fixtures)

  return (
    <div className="overflow-x-auto pb-4">
      <div className="grid min-w-[980px] grid-cols-4 gap-6">
        <div className="space-y-3">
          <div className="kicker mb-2">Round of 16</div>
          {bracket.r16.map((tie, i) => (
            <Reveal key={tie.label} delay={i * 0.04} y={14}>
              <TieCell tie={tie} />
            </Reveal>
          ))}
        </div>
        <div className="flex flex-col justify-around gap-4 pt-7">
          <div className="kicker mb-2">Quarter-finals</div>
          {bracket.qf.map((tie, i) => (
            <Reveal key={tie.label} delay={0.2 + i * 0.05} y={14}>
              <TieCell tie={tie} />
            </Reveal>
          ))}
        </div>
        <div className="flex flex-col justify-around gap-4 pt-7">
          <div className="kicker mb-2">Semi-finals</div>
          {bracket.sf.map((tie, i) => (
            <Reveal key={tie.label} delay={0.35 + i * 0.05} y={14}>
              <TieCell tie={tie} />
            </Reveal>
          ))}
        </div>
        <div className="flex flex-col justify-center gap-4 pt-7">
          <div className="kicker mb-2">Final</div>
          <Reveal delay={0.5} y={14}>
            <div className="grad-frame p-[2px]">
              <TieCell tie={bracket.final} highlightMorocco={false} />
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
