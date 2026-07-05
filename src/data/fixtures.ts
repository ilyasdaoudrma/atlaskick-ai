// Real tournament state — data snapshot: 3 July 2026.
// Group stage complete; 12 of 16 Round-of-32 ties decided; the last four
// (Switzerland–Algeria, Australia–Egypt, Argentina–Cabo Verde, Colombia–Ghana)
// play July 2–3 and feed Round-of-16 ties 7 and 8.

export type Stage = 'Group' | 'Round of 32' | 'Round of 16' | 'Quarter-final' | 'Semi-final' | 'Final'

export interface Fixture {
  id: string
  stage: Stage
  home: string // team id
  away: string
  date: string // ISO (UTC)
  venue: string
  city: string
  status: 'played' | 'live' | 'upcoming'
  homeGoals?: number
  awayGoals?: number
  pens?: string // penalty shootout result, home perspective, e.g. '2–3'
  minute?: number
  note?: string
  espnId?: string // ESPN event id — unlocks the Match Centre deep stats
}

export const FIXTURES: Fixture[] = [
  // ---- Morocco's group-stage results (Group C) ----
  { id: 'g-bra-mar', stage: 'Group', home: 'bra', away: 'mar', date: '2026-06-13T20:00:00Z', venue: '', city: '', status: 'played', homeGoals: 1, awayGoals: 1, note: 'Morocco held the five-time champions on matchday one' },
  { id: 'g-sco-mar', stage: 'Group', home: 'sco', away: 'mar', date: '2026-06-19T20:00:00Z', venue: '', city: '', status: 'played', homeGoals: 0, awayGoals: 1, note: 'A grinding 1–0 that all but sealed qualification' },
  { id: 'g-mar-hai', stage: 'Group', home: 'mar', away: 'hai', date: '2026-06-24T20:00:00Z', venue: '', city: '', status: 'played', homeGoals: 4, awayGoals: 2, note: '7 points — level with Brazil, second on goal difference' },

  // ---- Round of 32: decided ----
  { id: 'r32-can-rsa', stage: 'Round of 32', home: 'can', away: 'rsa', date: '2026-06-28T20:00:00Z', venue: 'SoFi Stadium', city: 'Inglewood', status: 'played', homeGoals: 1, awayGoals: 0 },
  { id: 'r32-bra-jpn', stage: 'Round of 32', home: 'bra', away: 'jpn', date: '2026-06-29T17:00:00Z', venue: 'NRG Stadium', city: 'Houston', status: 'played', homeGoals: 2, awayGoals: 1 },
  { id: 'r32-par-ger', stage: 'Round of 32', home: 'par', away: 'ger', date: '2026-06-29T20:00:00Z', venue: 'Gillette Stadium', city: 'Foxborough', status: 'played', homeGoals: 1, awayGoals: 1, pens: '4–3', note: 'Paraguay stun Germany in the shootout' },
  { id: 'r32-ned-mar', stage: 'Round of 32', home: 'ned', away: 'mar', date: '2026-06-29T23:00:00Z', venue: 'Estadio BBVA', city: 'Guadalupe', status: 'played', homeGoals: 1, awayGoals: 1, pens: '2–3', note: 'Gakpo 72′ — Diop 90+1′; Saibari buries the decisive penalty' },
  { id: 'r32-nor-civ', stage: 'Round of 32', home: 'nor', away: 'civ', date: '2026-06-30T20:00:00Z', venue: 'AT&T Stadium', city: 'Arlington', status: 'played', homeGoals: 2, awayGoals: 1, note: 'Haaland strikes late — his 5th of the tournament' },
  { id: 'r32-fra-swe', stage: 'Round of 32', home: 'fra', away: 'swe', date: '2026-06-30T23:00:00Z', venue: '', city: '', status: 'played', homeGoals: 3, awayGoals: 0, note: 'Mbappé brace takes him to 6 goals' },
  { id: 'r32-mex-ecu', stage: 'Round of 32', home: 'mex', away: 'ecu', date: '2026-07-01T01:00:00Z', venue: '', city: '', status: 'played', homeGoals: 2, awayGoals: 0 },
  { id: 'r32-eng-cod', stage: 'Round of 32', home: 'eng', away: 'cod', date: '2026-07-01T19:00:00Z', venue: '', city: '', status: 'played', homeGoals: 2, awayGoals: 1, note: 'Kane double — 5 goals in the race' },
  { id: 'r32-bel-sen', stage: 'Round of 32', home: 'bel', away: 'sen', date: '2026-07-01T22:00:00Z', venue: '', city: '', status: 'played', homeGoals: 3, awayGoals: 2 },
  { id: 'r32-usa-bih', stage: 'Round of 32', home: 'usa', away: 'bih', date: '2026-07-02T00:00:00Z', venue: '', city: '', status: 'played', homeGoals: 2, awayGoals: 0 },
  { id: 'r32-esp-aut', stage: 'Round of 32', home: 'esp', away: 'aut', date: '2026-07-02T19:00:00Z', venue: '', city: '', status: 'played', homeGoals: 3, awayGoals: 0 },
  { id: 'r32-por-cro', stage: 'Round of 32', home: 'por', away: 'cro', date: '2026-07-02T22:00:00Z', venue: '', city: '', status: 'played', homeGoals: 2, awayGoals: 1, note: 'Dramatic late winner in a heavyweight tie' },

  // ---- Round of 32: still to play (feed R16 ties 7 & 8) ----
  { id: 'r32-sui-alg', stage: 'Round of 32', home: 'sui', away: 'alg', date: '2026-07-03T04:00:00Z', venue: 'BC Place', city: 'Vancouver', status: 'upcoming' },
  { id: 'r32-aus-egy', stage: 'Round of 32', home: 'aus', away: 'egy', date: '2026-07-03T19:00:00Z', venue: 'AT&T Stadium', city: 'Arlington', status: 'upcoming' },
  { id: 'r32-arg-cpv', stage: 'Round of 32', home: 'arg', away: 'cpv', date: '2026-07-03T22:00:00Z', venue: 'Hard Rock Stadium', city: 'Miami Gardens', status: 'upcoming' },
  { id: 'r32-col-gha', stage: 'Round of 32', home: 'col', away: 'gha', date: '2026-07-04T01:00:00Z', venue: 'Arrowhead Stadium', city: 'Kansas City', status: 'upcoming' },

  // ---- Round of 16 (4–7 July) — six ties known, two await R32 winners ----
  { id: 'r16-can-mar', stage: 'Round of 16', home: 'can', away: 'mar', date: '2026-07-04T17:00:00Z', venue: 'NRG Stadium', city: 'Houston', status: 'upcoming' },
  { id: 'r16-par-fra', stage: 'Round of 16', home: 'par', away: 'fra', date: '2026-07-04T21:00:00Z', venue: 'Lincoln Financial Field', city: 'Philadelphia', status: 'upcoming' },
  { id: 'r16-bra-nor', stage: 'Round of 16', home: 'bra', away: 'nor', date: '2026-07-05T20:00:00Z', venue: 'MetLife Stadium', city: 'East Rutherford', status: 'upcoming' },
  { id: 'r16-mex-eng', stage: 'Round of 16', home: 'mex', away: 'eng', date: '2026-07-06T00:00:00Z', venue: 'Estadio Azteca', city: 'Mexico City', status: 'upcoming' },
  { id: 'r16-por-esp', stage: 'Round of 16', home: 'por', away: 'esp', date: '2026-07-06T19:00:00Z', venue: 'AT&T Stadium', city: 'Arlington', status: 'upcoming' },
  { id: 'r16-usa-bel', stage: 'Round of 16', home: 'usa', away: 'bel', date: '2026-07-07T00:00:00Z', venue: 'Lumen Field', city: 'Seattle', status: 'upcoming' },
]

// Pending R32 ties whose winners fill Round-of-16 ties 7 and 8:
//   R16-7 (Jul 7, Mercedes-Benz Stadium, Atlanta):  W(arg–cpv) vs W(aus–egy)
//   R16-8 (Jul 7, BC Place, Vancouver):             W(sui–alg) vs W(col–gha)
export const PENDING_R32: [string, string][] = [
  ['sui', 'alg'],
  ['aus', 'egy'],
  ['arg', 'cpv'],
  ['col', 'gha'],
]

export interface TbdTie {
  label: string
  date: string
  venue: string
  city: string
  feeders: [[string, string], [string, string]] // [home-tie, away-tie] as pending R32 pairs
}

export const R16_TBD: TbdTie[] = [
  {
    label: 'R16 · Tie 7',
    date: '2026-07-07T16:00:00Z',
    venue: 'Mercedes-Benz Stadium',
    city: 'Atlanta',
    feeders: [
      ['arg', 'cpv'],
      ['aus', 'egy'],
    ],
  },
  {
    label: 'R16 · Tie 8',
    date: '2026-07-07T20:00:00Z',
    venue: 'BC Place',
    city: 'Vancouver',
    feeders: [
      ['sui', 'alg'],
      ['col', 'gha'],
    ],
  },
]

// Known R16 fixture ids in BRACKET order (quarter-final pairings):
//   QF1 (Jul 9, Foxborough):   W(can–mar) vs W(par–fra)
//   QF2 (Jul 10, Inglewood):   W(por–esp) vs W(usa–bel)
//   QF3 (Jul 11, Miami):       W(bra–nor) vs W(mex–eng)
//   QF4 (Jul 12, Kansas City): W(R16-7)  vs W(R16-8)
//   SF1 (Jul 14, Arlington) = QF1 v QF2 · SF2 (Jul 15, Atlanta) = QF3 v QF4
export const R16_BRACKET_KNOWN: string[] = ['r16-can-mar', 'r16-par-fra', 'r16-por-esp', 'r16-usa-bel', 'r16-bra-nor', 'r16-mex-eng']

export const upcomingFixtures = (): Fixture[] => FIXTURES.filter((f) => f.status !== 'played')

export const fixtureById = (id: string): Fixture => {
  const fx = FIXTURES.find((f) => f.id === id)
  if (!fx) throw new Error(`Unknown fixture id: ${id}`)
  return fx
}
