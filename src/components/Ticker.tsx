import { teamById } from '../data/teams'
import { useLiveData } from '../services/LiveDataContext'
import { Flag } from './ui/primitives'

// Broadcast-style infinite results ticker, fed by the live API when available.
export function Ticker() {
  const { fixtures, source, lastSync, refreshing } = useLiveData()

  const items = fixtures
    .filter((f) => f.status !== 'upcoming')
    .slice(-18)
    .map((f) => ({
      id: f.id,
      home: teamById(f.home),
      away: teamById(f.away),
      score: `${f.homeGoals ?? 0}–${f.awayGoals ?? 0}${f.pens ? ` (${f.pens} pens)` : ''}`,
      live: f.status === 'live',
      minute: f.minute,
      stage: f.stage,
    }))
  const loop = [...items, ...items]

  const syncLabel = source === 'live' && lastSync
    ? `LIVE FEED · ${new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'SNAPSHOT · JUL 3'

  return (
    <div className="flex items-stretch border-y" style={{ borderColor: 'var(--line)', background: 'var(--bg-2)' }}>
      <div
        className="mono z-10 flex shrink-0 items-center gap-2 border-r px-4 text-[0.6rem] tracking-[0.18em] whitespace-nowrap uppercase"
        style={{ borderColor: 'var(--line)', background: 'var(--bg-2)', color: source === 'live' ? 'var(--pitch)' : 'var(--gold)' }}
        title={source === 'live' ? 'Scores auto-refresh every 90 seconds from TheSportsDB' : 'Live feed unreachable — showing bundled July 3 snapshot'}
      >
        <span
          className="live-dot"
          style={{ background: source === 'live' ? 'var(--pitch)' : 'var(--gold)', opacity: refreshing ? 0.4 : 1 }}
        />
        {syncLabel}
      </div>
      <div className="ticker-viewport relative h-11 min-w-0 flex-1 overflow-hidden">
        <div className="ticker-track absolute inset-y-0 left-0 flex w-max items-center gap-10 pl-6">
          {loop.map((m, i) => (
            <div key={`${m.id}-${i}`} className="ticker-item mono flex items-center gap-2.5 text-[0.72rem] whitespace-nowrap">
              <span className="text-[0.6rem] uppercase tracking-widest" style={{ color: 'var(--faint)' }}>
                {m.stage}
              </span>
              <Flag code={m.home.code} size={18} />
              <span style={{ color: 'var(--text)' }}>{m.home.name}</span>
              <span
                className="rounded px-1.5 py-0.5 font-semibold"
                style={{ background: m.live ? 'var(--mar-red-soft)' : 'var(--surface-2)', color: m.live ? 'var(--danger)' : 'var(--pitch)' }}
              >
                {m.score}
              </span>
              <span style={{ color: 'var(--text)' }}>{m.away.name}</span>
              <Flag code={m.away.code} size={18} />
              {m.live && (
                <span className="flex items-center gap-1.5" style={{ color: 'var(--danger)' }}>
                  <span className="live-dot" style={{ background: 'var(--danger)' }} />
                  LIVE{m.minute ? ` ${m.minute}′` : ''}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
