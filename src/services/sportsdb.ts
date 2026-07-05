// Live data client — TheSportsDB (FIFA World Cup, league 4429).
// The free community key works from the browser (CORS enabled); set
// VITE_SPORTSDB_KEY in .env to use a personal key with higher limits.
// Every fetched round is mapped into the platform's Fixture shape, so the
// rest of the app is agnostic about where fixtures come from.

import { FIXTURES, type Fixture, type Stage } from '../data/fixtures'
import { TEAMS } from '../data/teams'

const API_KEY = import.meta.env.VITE_SPORTSDB_KEY ?? '123'
const LEAGUE_ID = 4429 // FIFA World Cup
const SEASON = '2026'
const BASE = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`

// Knockout rounds as TheSportsDB numbers them, mapped to our stage names.
// Group-stage results stay in the bundled snapshot (the free tier caps
// full-season queries); knockouts are what moves daily.
const ROUNDS: { round: number; stage: Stage }[] = [
  { round: 32, stage: 'Round of 32' },
  { round: 16, stage: 'Round of 16' },
  { round: 8, stage: 'Quarter-final' },
  { round: 125, stage: 'Quarter-final' }, // TheSportsDB's alternate QF code
  { round: 150, stage: 'Semi-final' },
  { round: 200, stage: 'Final' },
]

// API team names → platform team ids (covers naming differences across
// TheSportsDB and ESPN). Shared by both service clients.
export const NAME_TO_ID: Record<string, string> = Object.fromEntries([
  ...TEAMS.map((t) => [t.name.toLowerCase(), t.id] as [string, string]),
  ['usa', 'usa'],
  ['united states', 'usa'],
  ['cape verde', 'cpv'],
  ['cabo verde', 'cpv'],
  ['bosnia-herzegovina', 'bih'],
  ['bosnia and herzegovina', 'bih'],
  ['czech republic', 'cze'],
  ['south korea', 'kor'],
  ['korea republic', 'kor'],
  ['ivory coast', 'civ'],
  ['dr congo', 'cod'],
  ['turkey', 'tur'],
  ['türkiye', 'tur'],
  ['iran', 'irn'],
  ['ir iran', 'irn'],
  ['curacao', 'cuw'],
  ['czechia', 'cze'],
])

interface SportsDbEvent {
  idEvent: string
  strHomeTeam: string
  strAwayTeam: string
  intHomeScore: string | null
  intAwayScore: string | null
  strStatus: string // NS, 1H, HT, 2H, ET, P, FT, AET, AP…
  strResult: string | null // e.g. "Morocco win 3-2 on penalties"
  strTimestamp: string // "2026-07-04T17:00:00" (UTC)
  strVenue: string | null
}

const FINISHED = new Set(['FT', 'AET', 'AP'])
const NOT_STARTED = new Set(['NS', '', 'Not Started'])

const mapEvent = (e: SportsDbEvent, stage: Stage): Fixture | null => {
  const home = NAME_TO_ID[e.strHomeTeam?.toLowerCase() ?? '']
  const away = NAME_TO_ID[e.strAwayTeam?.toLowerCase() ?? '']
  if (!home || !away) return null

  const status: Fixture['status'] = FINISHED.has(e.strStatus)
    ? 'played'
    : NOT_STARTED.has(e.strStatus ?? 'NS')
      ? 'upcoming'
      : 'live'

  // strResult reads "<Winner> win X-Y on penalties" — X is always the winner's
  // count, so re-orient to home perspective before storing.
  const pensMatch = e.strResult?.match(/^(.+?)\s+win\s+(\d+)\s*-\s*(\d+)\s*on penalties/i)
  let pens: string | undefined
  if (pensMatch) {
    const winnerId = NAME_TO_ID[pensMatch[1].trim().toLowerCase()]
    const [hi, lo] = [pensMatch[2], pensMatch[3]]
    pens = winnerId === away ? `${lo}–${hi}` : `${hi}–${lo}`
  }

  return {
    id: `sdb-${e.idEvent}`,
    stage,
    home,
    away,
    date: `${e.strTimestamp}Z`.replace('ZZ', 'Z'),
    venue: e.strVenue ?? '',
    city: '',
    status,
    homeGoals: e.intHomeScore != null ? Number(e.intHomeScore) : undefined,
    awayGoals: e.intAwayScore != null ? Number(e.intAwayScore) : undefined,
    pens,
    note: e.strResult && status === 'played' ? e.strResult : undefined,
  }
}

const fetchRound = async (round: number, stage: Stage): Promise<Fixture[]> => {
  const res = await fetch(`${BASE}/eventsround.php?id=${LEAGUE_ID}&r=${round}&s=${SEASON}`)
  if (!res.ok) throw new Error(`SportsDB round ${round}: HTTP ${res.status}`)
  const data = (await res.json()) as { events: SportsDbEvent[] | null }
  return (data.events ?? []).map((e) => mapEvent(e, stage)).filter((f): f is Fixture => f !== null)
}

export interface LiveSnapshot {
  fixtures: Fixture[]
  fetchedAt: string // ISO
}

// Group-stage fixtures from the bundled snapshot + every knockout round live.
export const fetchLiveFixtures = async (): Promise<LiveSnapshot> => {
  const rounds = await Promise.all(ROUNDS.map(({ round, stage }) => fetchRound(round, stage).catch(() => [] as Fixture[])))
  const knockout = rounds.flat().sort((a, b) => a.date.localeCompare(b.date))
  if (knockout.length === 0) throw new Error('SportsDB returned no knockout fixtures')
  const groupGames = FIXTURES.filter((f) => f.stage === 'Group')
  return { fixtures: [...groupGames, ...knockout], fetchedAt: new Date().toISOString() }
}
