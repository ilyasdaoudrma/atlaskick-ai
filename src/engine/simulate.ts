// Monte Carlo tournament simulator — plays out everything still undecided
// N times using the ensemble match probabilities. Decided matches (from the
// bundled snapshot or the live API feed) are locked to their real result, so
// the simulation always continues from the tournament's true current state.
//
// Bracket structure:
//   R16-1 can–mar   R16-2 par–fra   → QF1 (Jul 9, Foxborough)
//   R16-3 por–esp   R16-4 usa–bel   → QF2 (Jul 10, Inglewood)
//   R16-5 bra–nor   R16-6 mex–eng   → QF3 (Jul 11, Miami)
//   R16-7 W(arg–cpv) v W(aus–egy)
//   R16-8 W(sui–alg) v W(col–gha)   → QF4 (Jul 12, Kansas City)
//   SF1 = QF1 v QF2 · SF2 = QF3 v QF4 · Final Jul 19, MetLife

import type { Fixture } from '../data/fixtures'
import { teamById, type Team } from '../data/teams'
import { FEEDERS, R16_FIXED, actualWinner, deriveKnockoutSeed } from './bracket'
import { predictMatch } from './predict'

export interface SimResult {
  team: Team
  r16: number
  quarter: number
  semi: number
  final: number
  champion: number
}

const knockoutWinProb = (home: Team, away: Team): number => {
  const p = predictMatch(home, away)
  // Split the draw probability by relative strength (extra time + penalties
  // still slightly favor the stronger side, but far less than regulation).
  const strengthShare = p.pHome / (p.pHome + p.pAway)
  const homeShare = 0.5 + (strengthShare - 0.5) * 0.6
  return p.pHome + p.pDraw * homeShare
}

// What-if overrides: sorted "idA|idB" pair key → forced winner id. Overrides
// beat sampling but real (played) results always beat overrides.
export type Overrides = Map<string, string>

export const overrideKey = (a: string, b: string): string => [a, b].sort().join('|')

export const runSimulation = (
  runs: number,
  liveFixtures?: Fixture[],
  overrides?: Overrides,
): { results: SimResult[]; runs: number } => {
  const seed = deriveKnockoutSeed(liveFixtures)
  const fixed = R16_FIXED.map(([h, a]) => [teamById(h), teamById(a)] as [Team, Team])
  const feeders = FEEDERS.map(([h, a]) => [teamById(h), teamById(a)] as [Team, Team])

  const cache = new Map<string, number>()
  const pWin = (a: Team, b: Team): number => {
    const key = `${a.id}|${b.id}`
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    const p = knockoutWinProb(a, b)
    cache.set(key, p)
    cache.set(`${b.id}|${a.id}`, 1 - p)
    return p
  }

  // Real result beats everything; then a user's what-if override; then sampling.
  const play = (a: Team, b: Team): Team => {
    const decided = actualWinner(seed, a.id, b.id)
    if (decided) return decided === a.id ? a : b
    const forced = overrides?.get(overrideKey(a.id, b.id))
    if (forced) return forced === a.id ? a : b
    return Math.random() < pWin(a, b) ? a : b
  }

  const zero = () => ({ r16: 0, quarter: 0, semi: 0, final: 0, champion: 0 })
  const counts = new Map<string, ReturnType<typeof zero>>()
  const allTeams = [...fixed.flat(), ...feeders.flat()]
  allTeams.forEach((team) => counts.set(team.id, zero()))
  fixed.flat().forEach((team) => (counts.get(team.id)!.r16 = runs))

  for (let i = 0; i < runs; i++) {
    const feederW = feeders.map(([a, b]) => play(a, b))
    feederW.forEach((w) => counts.get(w.id)!.r16++)

    // Full R16 in bracket order: tie 7 = W(arg–cpv) v W(aus–egy), tie 8 = W(sui–alg) v W(col–gha)
    const r16: [Team, Team][] = [...fixed, [feederW[0], feederW[1]], [feederW[2], feederW[3]]]

    const qf = r16.map(([a, b]) => {
      const w = play(a, b)
      counts.get(w.id)!.quarter++
      return w
    })
    const sf: Team[] = []
    for (let m = 0; m < 4; m++) {
      const w = play(qf[m * 2], qf[m * 2 + 1])
      counts.get(w.id)!.semi++
      sf.push(w)
    }
    const finalists: Team[] = []
    for (let m = 0; m < 2; m++) {
      const w = play(sf[m * 2], sf[m * 2 + 1])
      counts.get(w.id)!.final++
      finalists.push(w)
    }
    const champ = play(finalists[0], finalists[1])
    counts.get(champ.id)!.champion++
  }

  const results: SimResult[] = [...counts.entries()]
    .map(([id, c]) => ({
      team: teamById(id),
      r16: c.r16 / runs,
      quarter: c.quarter / runs,
      semi: c.semi / runs,
      final: c.final / runs,
      champion: c.champion / runs,
    }))
    .sort((a, b) => b.champion - a.champion || b.final - a.final)

  return { results, runs }
}
