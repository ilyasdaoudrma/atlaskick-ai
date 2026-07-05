// Live Elo — base ratings are the real worldfootballrankings.com ELO table
// fetched July 4, 2026, which already includes every result through the
// Round of 32 (Morocco #6). From that baseline, each newly played fixture is
// applied with the standard Elo update (K=50 for World Cup finals,
// goal-difference multiplier, shootouts scored as draws), so the table keeps
// moving after every match without double-counting history.

import type { Fixture } from '../data/fixtures'
import { TEAMS } from '../data/teams'

const K = 50
// Results on/after this instant are NOT yet in the imported base ratings.
const BASELINE = '2026-07-04T06:00:00Z'

const gdMultiplier = (diff: number): number => {
  if (diff <= 1) return 1
  if (diff === 2) return 1.5
  return (11 + diff) / 8
}

export interface EloEntry {
  teamId: string
  elo: number
  delta: number // movement since the July 4 worldfootballrankings.com baseline
}

export interface EloBaseOverride {
  bases: Record<string, number> // team id → synced site rating
  syncedAt: string // only results AFTER this instant are re-applied locally
}

export const computeCurrentElo = (fixtures: Fixture[], override?: EloBaseOverride | null): Map<string, EloEntry> => {
  const ratings = new Map<string, number>(
    TEAMS.map((t) => [t.id, override?.bases[t.id] ?? t.elo]),
  )
  const since = override?.syncedAt ?? BASELINE

  const played = fixtures
    .filter((f) => f.status === 'played' && f.homeGoals != null && f.awayGoals != null && f.date >= since)
    .sort((a, b) => a.date.localeCompare(b.date))

  for (const f of played) {
    const ra = ratings.get(f.home)
    const rb = ratings.get(f.away)
    if (ra == null || rb == null) continue

    const gh = f.homeGoals!
    const ga = f.awayGoals!
    // Shootouts count as draws for Elo purposes (standard convention).
    const scoreHome = gh > ga ? 1 : gh < ga ? 0 : 0.5
    const expectedHome = 1 / (1 + Math.pow(10, (rb - ra) / 400))
    const change = K * gdMultiplier(Math.abs(gh - ga)) * (scoreHome - expectedHome)

    ratings.set(f.home, ra + change)
    ratings.set(f.away, rb - change)
  }

  const result = new Map<string, EloEntry>()
  TEAMS.forEach((t) => {
    const base = override?.bases[t.id] ?? t.elo
    const elo = Math.round(ratings.get(t.id) ?? base)
    result.set(t.id, { teamId: t.id, elo, delta: elo - base })
  })
  return result
}
