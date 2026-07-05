// ESPN public soccer API — keyless, CORS-open, and the only free source with
// exact live match clocks and full boxscore statistics. Used as an enrichment
// layer on top of TheSportsDB fixtures: it never replaces the fixture list,
// it upgrades it (live minute, faster score flips, espnId for the Match Centre).

import type { Fixture } from '../data/fixtures'
import { NAME_TO_ID } from './sportsdb'

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
// Knockout window — one date-range request maps every knockout match.
const KNOCKOUT_RANGE = '20260628-20260719'
// Full-tournament window — one request returns every match's scoring plays.
const TOURNAMENT_RANGE = '20260611-20260719'

/* ---------------- scoreboard (list + live clocks) ---------------- */

interface EspnCompetitor {
  homeAway: 'home' | 'away'
  score?: string
  winner?: boolean
  team: { id: string; displayName: string }
  shootoutScore?: number
}

interface EspnEvent {
  id: string
  date: string
  status: {
    displayClock?: string
    type: { state: 'pre' | 'in' | 'post'; shortDetail?: string; description?: string }
  }
  competitions: { competitors: EspnCompetitor[] }[]
}

export interface EspnMatch {
  espnId: string
  homeId: string
  awayId: string
  state: 'pre' | 'in' | 'post'
  homeGoals?: number
  awayGoals?: number
  pens?: string // home-perspective shootout score
  minute?: number
  clock?: string
}

const teamId = (c: EspnCompetitor): string | undefined => NAME_TO_ID[c.team.displayName.toLowerCase()]

const parseEvent = (e: EspnEvent): EspnMatch | null => {
  const comps = e.competitions[0]?.competitors ?? []
  const home = comps.find((c) => c.homeAway === 'home')
  const away = comps.find((c) => c.homeAway === 'away')
  if (!home || !away) return null
  const homeId = teamId(home)
  const awayId = teamId(away)
  if (!homeId || !awayId) return null

  const state = e.status.type.state
  const clock = e.status.displayClock
  const minuteNum = clock ? Number.parseInt(clock, 10) : NaN

  return {
    espnId: e.id,
    homeId,
    awayId,
    state,
    homeGoals: home.score != null ? Number(home.score) : undefined,
    awayGoals: away.score != null ? Number(away.score) : undefined,
    pens:
      home.shootoutScore != null && away.shootoutScore != null
        ? `${home.shootoutScore}–${away.shootoutScore}`
        : undefined,
    minute: state === 'in' && !Number.isNaN(minuteNum) && minuteNum > 0 ? minuteNum : undefined,
    clock: state === 'in' ? clock : undefined,
  }
}

/* ---------------- tournament scorers (lag-free) ---------------- */
// ESPN's tournament /statistics aggregate lags a few hours on the newest
// round. The scoreboard, by contrast, carries every match's scoring plays in
// real time. Counting those across the whole tournament gives an accurate,
// live Golden Boot with no lag and no double-counting.

export interface ScorerCount {
  name: string
  teamId: string
  goals: number
}

interface ScoringDetail {
  scoringPlay?: boolean
  type?: { text?: string }
  clock?: { displayValue?: string }
  team?: { id?: string }
  athletesInvolved?: { displayName?: string }[]
}

const GOAL_PLAY_TYPES = new Set(['Goal', 'Penalty - Scored'])

const fixName = (s: string): string => {
  try {
    return decodeURIComponent(escape(s))
  } catch {
    return s
  }
}

export const fetchTournamentScorers = async (): Promise<ScorerCount[]> => {
  const res = await fetch(`${BASE}/scoreboard?dates=${TOURNAMENT_RANGE}`)
  if (!res.ok) throw new Error(`ESPN scorers: HTTP ${res.status}`)
  const data = (await res.json()) as {
    events?: {
      competitions?: {
        competitors?: EspnCompetitor[]
        details?: ScoringDetail[]
        status?: { type?: { state?: string } }
      }[]
    }[]
  }

  const tally = new Map<string, ScorerCount>()

  for (const e of data.events ?? []) {
    const comp = e.competitions?.[0]
    if (!comp) continue
    // ESPN team id → our team id, from this match's competitors.
    const teamMap = new Map<string, string>()
    for (const c of comp.competitors ?? []) {
      const id = NAME_TO_ID[c.team.displayName?.toLowerCase() ?? '']
      if (id && c.team.id) teamMap.set(c.team.id, id)
    }

    for (const det of comp.details ?? []) {
      if (!det.scoringPlay) continue
      const type = det.type?.text ?? ''
      if (!GOAL_PLAY_TYPES.has(type)) continue // excludes Own Goal, missed pens
      // Skip shootout goals: their clock reads past 120' or is blank.
      const minute = Number.parseInt(det.clock?.displayValue ?? '', 10)
      if (!Number.isNaN(minute) && minute > 120) continue
      const scorer = det.athletesInvolved?.[0]?.displayName
      if (!scorer) continue
      const teamId = det.team?.id ? teamMap.get(det.team.id) : undefined
      if (!teamId) continue
      const name = fixName(scorer)
      const key = name.toLowerCase()
      const row = tally.get(key) ?? { name, teamId, goals: 0 }
      row.goals += 1
      tally.set(key, row)
    }
  }

  return [...tally.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
}

export const fetchEspnKnockouts = async (): Promise<EspnMatch[]> => {
  const res = await fetch(`${BASE}/scoreboard?dates=${KNOCKOUT_RANGE}`)
  if (!res.ok) throw new Error(`ESPN scoreboard: HTTP ${res.status}`)
  const data = (await res.json()) as { events?: EspnEvent[] }
  return (data.events ?? []).map(parseEvent).filter((m): m is EspnMatch => m !== null)
}

// Upgrade fixtures in place (immutably): attach espnId, live minute, and the
// freshest scores. ESPN's clock flips to live within seconds of kickoff —
// usually ahead of TheSportsDB.
export const enrichWithEspn = (fixtures: Fixture[], espn: EspnMatch[]): Fixture[] => {
  const byPair = new Map<string, EspnMatch>()
  espn.forEach((m) => byPair.set([m.homeId, m.awayId].sort().join('|'), m))

  return fixtures.map((f) => {
    const m = byPair.get([f.home, f.away].sort().join('|'))
    if (!m) return f
    const sameOrientation = m.homeId === f.home
    const g = (h?: number, a?: number) => (sameOrientation ? [h, a] : [a, h]) as [number?, number?]
    const [homeGoals, awayGoals] = g(m.homeGoals, m.awayGoals)

    if (m.state === 'in') {
      return { ...f, espnId: m.espnId, status: 'live', homeGoals, awayGoals, minute: m.minute }
    }
    if (m.state === 'post') {
      const pens = m.pens ? (sameOrientation ? m.pens : m.pens.split('–').reverse().join('–')) : f.pens
      return { ...f, espnId: m.espnId, status: 'played', homeGoals, awayGoals, pens }
    }
    return { ...f, espnId: m.espnId }
  })
}

/* ---------------- match summary (deep stats) ---------------- */

export interface StatRow {
  label: string
  home: string
  away: string
}

export interface TimelineEvent {
  minute: string
  type: string
  text: string
  isGoal: boolean
  side: 'home' | 'away' | 'neutral'
}

export interface MatchSummary {
  espnId: string
  homeId: string
  awayId: string
  homeName: string
  awayName: string
  homeGoals: number
  awayGoals: number
  state: 'pre' | 'in' | 'post'
  detail: string
  clock?: string
  venue?: string
  attendance?: number
  possession?: [number, number]
  stats: StatRow[]
  timeline: TimelineEvent[]
  lineups?: [TeamLineup, TeamLineup] // [home, away], present once XIs are announced
}

export interface LineupPlayer {
  name: string
  jersey: string
  position: string
  place: number // ESPN formationPlace: 1 = GK, then outfield rows
}

export interface TeamLineup {
  teamName: string
  formation?: string // e.g. "4-2-3-1"
  starters: LineupPlayer[]
  subs: string[]
}

// Boxscore stat keys worth showing, in display order.
const STAT_KEYS: [string, string][] = [
  ['totalShots', 'Shots'],
  ['shotsOnTarget', 'On target'],
  ['wonCorners', 'Corners'],
  ['saves', 'Saves'],
  ['totalPasses', 'Passes'],
  ['passPct', 'Pass accuracy'],
  ['totalTackles', 'Tackles'],
  ['interceptions', 'Interceptions'],
  ['effectiveClearance', 'Clearances'],
  ['foulsCommitted', 'Fouls'],
  ['yellowCards', 'Yellow cards'],
  ['redCards', 'Red cards'],
]

const GOAL_TYPES = new Set(['Goal', 'Own Goal', 'Penalty - Scored'])

interface RawSummary {
  header?: {
    competitions?: {
      status?: EspnEvent['status']
      competitors?: EspnCompetitor[]
    }[]
  }
  gameInfo?: { venue?: { fullName?: string }; attendance?: number }
  boxscore?: { teams?: { team: { id: string; displayName: string }; statistics?: { name: string; displayValue: string }[] }[] }
  keyEvents?: {
    clock?: { displayValue?: string }
    type?: { text?: string }
    text?: string
    team?: { id?: string }
  }[]
  rosters?: {
    homeAway?: 'home' | 'away'
    formation?: string
    team?: { displayName?: string }
    roster?: {
      starter?: boolean
      jersey?: string
      formationPlace?: string
      athlete?: { displayName?: string }
      position?: { abbreviation?: string }
    }[]
  }[]
}

const parseLineup = (side: NonNullable<RawSummary['rosters']>[number] | undefined): TeamLineup | null => {
  if (!side?.roster) return null
  const starters: LineupPlayer[] = side.roster
    .filter((p) => p.starter)
    .map((p) => ({
      name: p.athlete?.displayName ?? '',
      jersey: p.jersey ?? '',
      position: p.position?.abbreviation ?? '',
      place: Number(p.formationPlace ?? 0) || 0,
    }))
    .filter((p) => p.name)
    .sort((a, b) => a.place - b.place)
  if (starters.length < 11) return null
  const subs = side.roster
    .filter((p) => !p.starter && p.athlete?.displayName)
    .slice(0, 12)
    .map((p) => p.athlete!.displayName!)
  return { teamName: side.team?.displayName ?? '', formation: side.formation, starters, subs }
}

export const fetchMatchSummary = async (espnId: string): Promise<MatchSummary> => {
  const res = await fetch(`${BASE}/summary?event=${espnId}`)
  if (!res.ok) throw new Error(`ESPN summary: HTTP ${res.status}`)
  const d = (await res.json()) as RawSummary

  const comp = d.header?.competitions?.[0]
  const home = comp?.competitors?.find((c) => c.homeAway === 'home')
  const away = comp?.competitors?.find((c) => c.homeAway === 'away')
  if (!home || !away) throw new Error('ESPN summary: missing competitors')

  const homeId = teamId(home) ?? ''
  const awayId = teamId(away) ?? ''

  const teams = d.boxscore?.teams ?? []
  const homeStats = new Map((teams.find((t) => t.team.id === home.team.id)?.statistics ?? []).map((s) => [s.name, s.displayValue]))
  const awayStats = new Map((teams.find((t) => t.team.id === away.team.id)?.statistics ?? []).map((s) => [s.name, s.displayValue]))

  const pct = (v?: string) => {
    const n = Number(v)
    return Number.isNaN(n) ? undefined : n
  }
  const hPoss = pct(homeStats.get('possessionPct'))
  const aPoss = pct(awayStats.get('possessionPct'))

  const asPct = (v?: string) => {
    const n = Number(v)
    return Number.isNaN(n) ? (v ?? '—') : `${Math.round(n * 100)}%`
  }

  const stats: StatRow[] = STAT_KEYS.filter(([key]) => homeStats.has(key) || awayStats.has(key)).map(([key, label]) => ({
    label,
    home: key === 'passPct' ? asPct(homeStats.get(key)) : (homeStats.get(key) ?? '—'),
    away: key === 'passPct' ? asPct(awayStats.get(key)) : (awayStats.get(key) ?? '—'),
  }))

  const timeline: TimelineEvent[] = (d.keyEvents ?? [])
    .filter((k) => k.type?.text && !['Kickoff', 'Start Delay', 'End Delay', 'Halftime', 'Start 2nd Half'].includes(k.type.text))
    .map((k) => ({
      minute: k.clock?.displayValue ?? '',
      type: k.type?.text ?? '',
      text: k.text ?? k.type?.text ?? '',
      isGoal: GOAL_TYPES.has(k.type?.text ?? '') || (k.type?.text ?? '').toLowerCase().includes('goal'),
      side: k.team?.id === home.team.id ? 'home' : k.team?.id === away.team.id ? 'away' : 'neutral',
    }))

  return {
    espnId,
    homeId,
    awayId,
    homeName: home.team.displayName,
    awayName: away.team.displayName,
    homeGoals: Number(home.score ?? 0),
    awayGoals: Number(away.score ?? 0),
    state: comp?.status?.type.state ?? 'post',
    detail: comp?.status?.type.shortDetail ?? '',
    clock: comp?.status?.type.state === 'in' ? comp?.status?.displayClock : undefined,
    venue: d.gameInfo?.venue?.fullName,
    attendance: d.gameInfo?.attendance,
    possession: hPoss != null && aPoss != null ? [hPoss, aPoss] : undefined,
    stats,
    timeline,
    lineups: (() => {
      const h = parseLineup(d.rosters?.find((r) => r.homeAway === 'home') ?? d.rosters?.[0])
      const a = parseLineup(d.rosters?.find((r) => r.homeAway === 'away') ?? d.rosters?.[1])
      return h && a ? ([h, a] as [TeamLineup, TeamLineup]) : undefined
    })(),
  }
}
