// Tournament player leaderboards — two ESPN sources combined:
//  1. /statistics       → official full-tournament Goals & Assists leaders,
//                         refreshed by ESPN after every match.
//  2. /summary rosters  → per-player match stats (saves, cards, shots, fouls)
//                         aggregated across every finished knockout match.
//                         Each match's rows are cached in localStorage, so
//                         exactly one new request happens per finished game.

import type { Fixture } from '../data/fixtures'
import { fetchTournamentScorers } from './espn'
import { NAME_TO_ID } from './sportsdb'

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
const EVENT_CACHE_PREFIX = 'ak-pstats-'

export interface LeaderRow {
  name: string
  teamId?: string
  value: number
  detail: string // e.g. "4 matches" or "2Y 1R"
}

export interface LeaderBoards {
  goals: LeaderRow[]
  assists: LeaderRow[]
  saves: LeaderRow[]
  cards: LeaderRow[]
  shots: LeaderRow[]
  fetchedAt: string
}

// ESPN's leader names arrive UTF-8-bytes-as-Latin-1 ("MbappÃ©") — repair them.
const fixEncoding = (s: string): string => {
  try {
    return decodeURIComponent(escape(s))
  } catch {
    return s
  }
}

/* ---------------- official goals / assists leaders ---------------- */

interface RawLeader {
  displayValue?: string
  value: number
  athlete?: { displayName?: string; team?: { displayName?: string } }
}

interface RawStatsResponse {
  stats?: { name: string; leaders?: RawLeader[] }[]
}

// Goals now come from the lag-free scoreboard scorer count, so no manual
// overrides are needed. Kept as an empty hook in case a future data gap needs
// a temporary patch.
const LIVE_CORRECTIONS: Partial<Record<keyof Omit<LeaderBoards, 'fetchedAt'>, Record<string, { min: number; detail?: string; teamId?: string }>>> = {}

const applyCorrections = (key: keyof Omit<LeaderBoards, 'fetchedAt'>, rows: LeaderRow[]): LeaderRow[] => {
  const corrections = LIVE_CORRECTIONS[key]
  if (!corrections) return rows

  const next = [...rows]
  for (const [nameKey, correction] of Object.entries(corrections)) {
    const index = next.findIndex((row) => row.name.toLowerCase() === nameKey)
    if (index >= 0) {
      const current = next[index]
      next[index] = {
        ...current,
        teamId: current.teamId ?? correction.teamId,
        value: Math.max(current.value, correction.min),
        detail: correction.detail ?? current.detail,
      }
    } else {
      next.push({
        name: nameKey.replace(/\b\w/g, (c) => c.toUpperCase()),
        teamId: correction.teamId,
        value: correction.min,
        detail: correction.detail ?? '',
      })
    }
  }

  return next.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)).slice(0, 8)
}

const parseLeaders = (key: keyof Omit<LeaderBoards, 'fetchedAt'>, raw: RawLeader[] | undefined, teamOf: Map<string, string>): LeaderRow[] =>
  applyCorrections(key, (raw ?? [])
    .map((l) => {
      const name = fixEncoding(l.athlete?.displayName ?? '')
      const teamName = fixEncoding(l.athlete?.team?.displayName ?? '').toLowerCase()
      const matches = l.displayValue?.match(/Matches:\s*(\d+)/i)?.[1]
      return {
        name,
        teamId: NAME_TO_ID[teamName] ?? teamOf.get(name.toLowerCase()),
        value: l.value,
        detail: matches ? `${matches} matches` : '',
      }
    })
    .filter((l) => l.name && l.value > 0)
    .slice(0, 8))

/* ---------------- per-match roster aggregation ---------------- */

// Compact per-player row persisted per event.
interface PlayerRow {
  n: string // name
  t: string // team id
  g: number
  a: number
  sv: number
  yc: number
  rc: number
  sh: number
}

interface RawRosterResponse {
  rosters?: {
    team?: { displayName?: string }
    roster?: {
      athlete?: { displayName?: string }
      stats?: { name: string; value?: number }[]
    }[]
  }[]
}

// cacheable=false is used for LIVE matches: their numbers change minute to
// minute, so they are re-fetched on every refresh and never persisted.
const fetchEventPlayerRows = async (espnId: string, cacheable = true): Promise<PlayerRow[]> => {
  const cacheKey = `${EVENT_CACHE_PREFIX}${espnId}`
  if (cacheable) {
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) return JSON.parse(cached) as PlayerRow[]
    } catch {
      // fall through to network
    }
  }

  const res = await fetch(`${BASE}/summary?event=${espnId}`)
  if (!res.ok) throw new Error(`ESPN summary ${espnId}: HTTP ${res.status}`)
  const d = (await res.json()) as RawRosterResponse

  const rows: PlayerRow[] = []
  for (const side of d.rosters ?? []) {
    const teamId = NAME_TO_ID[side.team?.displayName?.toLowerCase() ?? '']
    if (!teamId) continue
    for (const p of side.roster ?? []) {
      const name = fixEncoding(p.athlete?.displayName ?? '')
      if (!name) continue
      const stat = new Map((p.stats ?? []).map((s) => [s.name, s.value ?? 0]))
      const row: PlayerRow = {
        n: name,
        t: teamId,
        g: stat.get('totalGoals') ?? 0,
        a: stat.get('goalAssists') ?? 0,
        sv: stat.get('saves') ?? 0,
        yc: stat.get('yellowCards') ?? 0,
        rc: stat.get('redCards') ?? 0,
        sh: stat.get('totalShots') ?? 0,
      }
      if (row.g || row.a || row.sv || row.yc || row.rc || row.sh) rows.push(row)
    }
  }

  if (cacheable) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(rows))
    } catch {
      // cache is best-effort
    }
  }
  return rows
}

interface Totals extends Omit<PlayerRow, 'n' | 't'> {
  name: string
  teamId: string
}

const aggregate = async (playedIds: string[], liveIds: string[] = []): Promise<Map<string, Totals>> => {
  const settled = await Promise.allSettled([
    ...playedIds.map((id) => fetchEventPlayerRows(id, true)),
    ...liveIds.map((id) => fetchEventPlayerRows(id, false)),
  ])
  const totals = new Map<string, Totals>()
  settled.forEach((r) => {
    if (r.status !== 'fulfilled') return
    r.value.forEach((row) => {
      const key = `${row.n}|${row.t}`
      const acc = totals.get(key) ?? { name: row.n, teamId: row.t, g: 0, a: 0, sv: 0, yc: 0, rc: 0, sh: 0 }
      acc.g += row.g
      acc.a += row.a
      acc.sv += row.sv
      acc.yc += row.yc
      acc.rc += row.rc
      acc.sh += row.sh
      totals.set(key, acc)
    })
  })
  return totals
}

const board = (
  totals: Map<string, Totals>,
  value: (t: Totals) => number,
  detail: (t: Totals) => string,
): LeaderRow[] =>
  [...totals.values()]
    .filter((t) => value(t) > 0)
    .sort((a, b) => value(b) - value(a))
    .slice(0, 8)
    .map((t) => ({ name: t.name, teamId: t.teamId, value: value(t), detail: detail(t) }))

/* ---------------- public API ---------------- */

// Latest boards, readable synchronously by the grounded assistant.
// Mutable holder so other modules can both read and refresh the latest boards
// (the grounded AI assistant reads `latestLeaders.current`).
export const latestLeaders: { current: LeaderBoards | null } = { current: null }

export const buildLeaderBoards = async (fixtures: Fixture[]): Promise<LeaderBoards> => {
  const playedIds = fixtures.filter((f) => f.status === 'played' && f.espnId).map((f) => f.espnId!)
  const liveIds = fixtures.filter((f) => f.status === 'live' && f.espnId).map((f) => f.espnId!)

  const [officialRes, totalsRes, scorersRes] = await Promise.allSettled([
    fetch(`${BASE}/statistics`).then((r) => {
      if (!r.ok) throw new Error(`ESPN statistics: HTTP ${r.status}`)
      return r.json() as Promise<RawStatsResponse>
    }),
    aggregate(playedIds, liveIds),
    // Lag-free Golden Boot: goals counted from every match's scoring plays.
    fetchTournamentScorers(),
  ])

  const totals = totalsRes.status === 'fulfilled' ? totalsRes.value : new Map<string, Totals>()
  const scorers = scorersRes.status === 'fulfilled' ? scorersRes.value : []
  const teamOf = new Map([...totals.values()].map((t) => [t.name.toLowerCase(), t.teamId]))

  const official = officialRes.status === 'fulfilled' ? (officialRes.value.stats ?? []) : []
  const goalsRaw = official.find((s) => s.name === 'goalsLeaders')?.leaders
  const assistsRaw = official.find((s) => s.name === 'assistsLeaders')?.leaders

  // Reconcile the official full-tournament board with our own knockout roster
  // aggregation. ESPN's /statistics endpoint lags a few hours on the newest
  // round, so a goal scored in a just-finished knockout tie can be missing
  // from it. We fix this without double-counting or ever showing a decrease:
  //
  //   knockoutTotal(p)  = goals we counted from every knockout match roster
  //                       (accurate and near-live)
  //   groupFloor(p)     = a monotonic high-water mark of (official − knockout),
  //                       i.e. the player's group-stage tally, which official
  //                       reflects reliably. Cached so it survives the moment
  //                       official is mid-catch-up on the latest round.
  //   final(p)          = max(official, groupFloor + knockoutTotal)
  //
  // When official is up to date, final == official. When it lags on the newest
  // round, groupFloor + knockoutTotal supplies the missing goal. Once official
  // catches up the two converge, so it can never over-count.
  const reconcile = (rows: LeaderRow[], field: 'g' | 'a'): LeaderRow[] => {
    const floorKey = `ak-scorerfloor-${field}`
    let floors: Record<string, number> = {}
    try {
      floors = JSON.parse(localStorage.getItem(floorKey) ?? '{}') as Record<string, number>
    } catch {
      floors = {}
    }
    const knockoutOf = (name: string): Totals | undefined =>
      [...totals.values()].find((t) => t.name.toLowerCase() === name.toLowerCase())

    const out = rows.map((r) => {
      const ko = knockoutOf(r.name)
      const knockout = ko ? ko[field] : 0
      const key = r.name.toLowerCase()
      const groupFloor = Math.max(floors[key] ?? 0, r.value - knockout)
      floors[key] = groupFloor
      const reconciled = Math.max(r.value, groupFloor + knockout)
      const bumped = reconciled - r.value
      return { ...r, teamId: r.teamId ?? ko?.teamId, value: reconciled, detail: bumped > 0 ? `${r.detail} · +${bumped} live` : r.detail }
    })

    // Players scoring in a live/recent knockout match who aren't on the
    // official board yet (their whole tally is post-lag).
    totals.forEach((t) => {
      const scored = field === 'g' ? t.g : t.a
      if (scored > 0 && !out.some((r) => r.name.toLowerCase() === t.name.toLowerCase())) {
        out.push({ name: t.name, teamId: t.teamId, value: scored, detail: 'knockouts' })
      }
    })

    try {
      localStorage.setItem(floorKey, JSON.stringify(floors))
    } catch {
      // cache is best-effort
    }
    return out.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)).slice(0, 8)
  }

  // Goals: merge the two ESPN sources by taking each player's MAX.
  //  · official /statistics has accurate group/older totals but lags a few
  //    hours on the newest round (missed Mbappé's latest).
  //  · the scoreboard scorer count is live for new goals but can miss older
  //    ones whose play lacked an athlete tag (undercounts Messi/Kane).
  // Neither over-counts, so the per-player maximum is the true total.
  const goalsBoard: LeaderRow[] = (() => {
    const merged = new Map<string, LeaderRow>()
    if (goalsRaw?.length) {
      for (const r of parseLeaders('goals', goalsRaw, teamOf)) merged.set(r.name.toLowerCase(), r)
    }
    for (const s of scorers) {
      const key = s.name.toLowerCase()
      const existing = merged.get(key)
      if (existing) {
        existing.value = Math.max(existing.value, s.goals)
        existing.teamId = existing.teamId ?? s.teamId
      } else {
        merged.set(key, { name: s.name, teamId: s.teamId ?? teamOf.get(key), value: s.goals, detail: '' })
      }
    }
    if (merged.size === 0) return board(totals, (t) => t.g, (t) => `${t.a} assists`)
    return applyCorrections('goals', [...merged.values()])
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
      .slice(0, 8)
  })()

  const boards: LeaderBoards = {
    goals: goalsBoard,
    // Assists lack a scoreboard role, so keep the reconciled official board.
    assists: assistsRaw?.length
      ? reconcile(parseLeaders('assists', assistsRaw, teamOf), 'a')
      : board(totals, (t) => t.a, (t) => `${t.g} goals`),
    // Knockout-stage aggregates (group-stage rosters aren't in the free feed).
    saves: board(totals, (t) => t.sv, () => 'knockouts'),
    cards: board(
      totals,
      (t) => t.yc + t.rc * 2,
      (t) => `${t.yc}Y${t.rc ? ` ${t.rc}R` : ''}`,
    ),
    shots: board(totals, (t) => t.sh, (t) => `${t.g} goals`),
    fetchedAt: new Date().toISOString(),
  }

  latestLeaders.current = boards
  return boards
}
