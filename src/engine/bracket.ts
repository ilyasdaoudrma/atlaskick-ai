// Knockout-state derivation — turns whatever fixtures we have (bundled
// snapshot or live API data) into a bracket seed the simulator and the
// bracket UI can consume. Played matches become hard results; everything
// else stays probabilistic.

import { FIXTURES, type Fixture } from '../data/fixtures'

// Fixed Round-of-16 structure in true bracket (quarter-final) order.
export const R16_FIXED: [string, string][] = [
  ['can', 'mar'],
  ['par', 'fra'],
  ['por', 'esp'],
  ['usa', 'bel'],
  ['bra', 'nor'],
  ['mex', 'eng'],
]

// The four Round-of-32 feeder games for R16 ties 7 and 8:
// tie 7 = W(arg–cpv) vs W(aus–egy) · tie 8 = W(sui–alg) vs W(col–gha)
export const FEEDERS: [string, string][] = [
  ['arg', 'cpv'],
  ['aus', 'egy'],
  ['sui', 'alg'],
  ['col', 'gha'],
]

const pairKey = (a: string, b: string): string => [a, b].sort().join('|')

export const winnerOf = (f: Fixture): string | undefined => {
  if (f.status !== 'played' || f.homeGoals == null || f.awayGoals == null) return undefined
  if (f.homeGoals > f.awayGoals) return f.home
  if (f.homeGoals < f.awayGoals) return f.away
  if (f.pens) {
    const [h, a] = f.pens.split('–').map(Number)
    if (!Number.isNaN(h) && !Number.isNaN(a)) return h > a ? f.home : f.away
  }
  return undefined
}

export interface KnockoutSeed {
  // Winner id for any decided knockout match, keyed by sorted team pair.
  // Stage is deliberately ignored: two teams meet at most once in knockouts.
  actual: Map<string, string>
  // Feeder winners (or undefined while the R32 tie is unplayed), same order as FEEDERS.
  feederWinners: (string | undefined)[]
}

export const deriveKnockoutSeed = (fixtures: Fixture[] = FIXTURES): KnockoutSeed => {
  const actual = new Map<string, string>()
  fixtures
    .filter((f) => f.stage !== 'Group')
    .forEach((f) => {
      const w = winnerOf(f)
      if (w) actual.set(pairKey(f.home, f.away), w)
    })
  const feederWinners = FEEDERS.map(([a, b]) => actual.get(pairKey(a, b)))
  return { actual, feederWinners }
}

export const actualWinner = (seed: KnockoutSeed, a: string, b: string): string | undefined =>
  seed.actual.get(pairKey(a, b))

/* ---------------- full bracket resolver ---------------- */
// Turns live results into a round-by-round structure: winners advance
// automatically, unknown slots carry the pair(s) they'll come from.

export interface BracketSlot {
  id?: string // resolved team
  from?: [string, string] // "winner of A–B" when unresolved
}

export interface BracketTie {
  label: string
  a: BracketSlot
  b: BracketSlot
  fixture?: Fixture // the live fixture for this pair, when both sides known
  winner?: string
}

export interface ResolvedBracket {
  r16: BracketTie[]
  qf: BracketTie[]
  sf: BracketTie[]
  final: BracketTie
}

const QF_META = ['QF1 · Jul 9 · Foxborough', 'QF2 · Jul 10 · Los Angeles', 'QF3 · Jul 11 · Miami', 'QF4 · Jul 12 · Kansas City']
const SF_META = ['SF1 · Jul 14 · Arlington', 'SF2 · Jul 15 · Atlanta']

export const resolveBracket = (fixtures: Fixture[] = FIXTURES): ResolvedBracket => {
  const seed = deriveKnockoutSeed(fixtures)
  const knockouts = fixtures.filter((f) => f.stage !== 'Group')
  const fixtureFor = (a?: string, b?: string): Fixture | undefined =>
    a && b ? knockouts.find((f) => pairKey(f.home, f.away) === pairKey(a, b)) : undefined

  const makeTie = (label: string, a: BracketSlot, b: BracketSlot): BracketTie => {
    const fixture = fixtureFor(a.id, b.id)
    const winner = a.id && b.id ? actualWinner(seed, a.id, b.id) : undefined
    return { label, a, b, fixture, winner }
  }

  const slotFromFeeder = (pair: [string, string]): BracketSlot => {
    const w = seed.actual.get(pairKey(pair[0], pair[1]))
    return w ? { id: w } : { from: pair }
  }

  const r16: BracketTie[] = [
    ...R16_FIXED.map(([a, b], i) => makeTie(`R16 · Tie ${i + 1}`, { id: a }, { id: b })),
    makeTie('R16 · Tie 7 · Atlanta', slotFromFeeder(FEEDERS[0]), slotFromFeeder(FEEDERS[1])),
    makeTie('R16 · Tie 8 · Vancouver', slotFromFeeder(FEEDERS[2]), slotFromFeeder(FEEDERS[3])),
  ]

  // A slot advancing from a previous tie: the winner if decided, otherwise
  // "winner of A–B" (only referencable once both participants are known).
  const advance = (tie: BracketTie): BracketSlot => {
    if (tie.winner) return { id: tie.winner }
    if (tie.a.id && tie.b.id) return { from: [tie.a.id, tie.b.id] }
    // Participants not even known yet — fall back to the first feeder pair.
    return { from: tie.a.from ?? tie.b.from ?? ['', ''] }
  }

  const qf = [0, 1, 2, 3].map((i) => makeTie(QF_META[i], advance(r16[i * 2]), advance(r16[i * 2 + 1])))
  const sf = [0, 1].map((i) => makeTie(SF_META[i], advance(qf[i * 2]), advance(qf[i * 2 + 1])))
  const final = makeTie('Final · Jul 19 · MetLife', advance(sf[0]), advance(sf[1]))

  return { r16, qf, sf, final }
}
