// Scheduled data fetcher — runs OUTSIDE the browser (Node), so it works even
// when the app is closed. A cron (GitHub Actions in the cloud, or a Windows
// Scheduled Task locally) invokes this every 3 hours; it pulls every source,
// aggregates the leaderboards + Elo + fixtures, and writes
// public/data/snapshot.json. The app reads that snapshot on open, so whenever
// you launch it the stats are as fresh as the last scheduled run.
//
// Sources (all free, server-side so no CORS restrictions apply):
//   · ESPN scoreboard        — fixtures, live scores, goal scorers (lag-free)
//   · ESPN /statistics       — official goals & assists leaders
//   · ESPN /summary rosters  — per-player saves, shots, cards, assists
//   · worldfootballrankings  — ELO ratings (via r.jina.ai reader for HTML)

import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
const TOURNAMENT_RANGE = '20260611-20260719'
const ELO_URL = 'https://r.jina.ai/https://worldfootballrankings.com/rankings'

const NAME_TO_ID = {
  mexico: 'mex', 'south africa': 'rsa', 'south korea': 'kor', 'korea republic': 'kor', czechia: 'cze',
  'czech republic': 'cze', switzerland: 'sui', canada: 'can', 'bosnia and herzegovina': 'bih',
  'bosnia-herzegovina': 'bih', qatar: 'qat', brazil: 'bra', morocco: 'mar', scotland: 'sco', haiti: 'hai',
  'united states': 'usa', usa: 'usa', australia: 'aus', paraguay: 'par', turkey: 'tur', 'türkiye': 'tur',
  germany: 'ger', 'ivory coast': 'civ', "côte d'ivoire": 'civ', ecuador: 'ecu', 'curaçao': 'cuw', curacao: 'cuw',
  netherlands: 'ned', japan: 'jpn', sweden: 'swe', tunisia: 'tun', belgium: 'bel', egypt: 'egy', iran: 'irn',
  'ir iran': 'irn', 'new zealand': 'nzl', spain: 'esp', 'cabo verde': 'cpv', 'cape verde': 'cpv', uruguay: 'uru',
  'saudi arabia': 'ksa', france: 'fra', norway: 'nor', senegal: 'sen', iraq: 'irq', argentina: 'arg',
  austria: 'aut', algeria: 'alg', jordan: 'jor', colombia: 'col', portugal: 'por', 'dr congo': 'cod',
  'congo dr': 'cod', uzbekistan: 'uzb', england: 'eng', croatia: 'cro', ghana: 'gha', panama: 'pan',
}

const fixEnc = (s) => {
  try {
    return decodeURIComponent(escape(s))
  } catch {
    return s
  }
}
const idOf = (name) => NAME_TO_ID[(name ?? '').toLowerCase()]

const getJson = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'AtlasKick/1.0' } })
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  return res.json()
}

// ---------- fixtures + goal scorers from the scoreboard ----------
async function fetchScoreboard() {
  const data = await getJson(`${BASE}/scoreboard?dates=${TOURNAMENT_RANGE}`)
  const fixtures = []
  const goals = new Map()
  const GOAL_TYPES = new Set(['Goal', 'Penalty - Scored'])

  for (const e of data.events ?? []) {
    const comp = e.competitions?.[0]
    if (!comp) continue
    const comps = comp.competitors ?? []
    const home = comps.find((c) => c.homeAway === 'home')
    const away = comps.find((c) => c.homeAway === 'away')
    const hId = idOf(home?.team?.displayName)
    const aId = idOf(away?.team?.displayName)
    const teamMap = new Map()
    for (const c of comps) {
      const id = idOf(c.team?.displayName)
      if (id && c.team?.id) teamMap.set(c.team.id, id)
    }

    if (hId && aId) {
      const state = e.status?.type?.state
      fixtures.push({
        espnId: e.id,
        home: hId,
        away: aId,
        date: e.date,
        state, // pre | in | post
        homeGoals: home?.score != null ? Number(home.score) : null,
        awayGoals: away?.score != null ? Number(away.score) : null,
        minute: state === 'in' ? e.status?.displayClock ?? null : null,
      })
    }

    for (const det of comp.details ?? []) {
      if (!det.scoringPlay || !GOAL_TYPES.has(det.type?.text ?? '')) continue
      const minute = Number.parseInt(det.clock?.displayValue ?? '', 10)
      if (!Number.isNaN(minute) && minute > 120) continue
      const scorer = det.athletesInvolved?.[0]?.displayName
      const teamId = det.team?.id ? teamMap.get(det.team.id) : undefined
      if (!scorer || !teamId) continue
      const name = fixEnc(scorer)
      const key = name.toLowerCase()
      const row = goals.get(key) ?? { name, teamId, value: 0 }
      row.value += 1
      goals.set(key, row)
    }
  }
  return { fixtures, scoreboardGoals: [...goals.values()] }
}

// ---------- official goals/assists ----------
async function fetchOfficial() {
  const data = await getJson(`${BASE}/statistics`)
  const pick = (name) =>
    (data.stats?.find((s) => s.name === name)?.leaders ?? []).map((l) => ({
      name: fixEnc(l.athlete?.displayName ?? ''),
      teamId: idOf(l.athlete?.team?.displayName),
      value: l.value,
    }))
  return { officialGoals: pick('goalsLeaders'), officialAssists: pick('assistsLeaders') }
}

// ---------- per-match rosters → saves/shots/cards/assists ----------
async function fetchRosterAggregate(fixtures) {
  const knockoutIds = fixtures.filter((f) => f.state !== 'pre').map((f) => f.espnId)
  const totals = new Map()
  await Promise.allSettled(
    knockoutIds.map(async (id) => {
      const d = await getJson(`${BASE}/summary?event=${id}`)
      for (const side of d.rosters ?? []) {
        const teamId = idOf(side.team?.displayName)
        if (!teamId) continue
        for (const p of side.roster ?? []) {
          const name = fixEnc(p.athlete?.displayName ?? '')
          if (!name) continue
          const st = new Map((p.stats ?? []).map((s) => [s.name, s.value ?? 0]))
          const key = `${name.toLowerCase()}|${teamId}`
          const acc = totals.get(key) ?? { name, teamId, g: 0, a: 0, sv: 0, yc: 0, rc: 0, sh: 0 }
          acc.g += st.get('totalGoals') ?? 0
          acc.a += st.get('goalAssists') ?? 0
          acc.sv += st.get('saves') ?? 0
          acc.yc += st.get('yellowCards') ?? 0
          acc.rc += st.get('redCards') ?? 0
          acc.sh += st.get('totalShots') ?? 0
          totals.set(key, acc)
        }
      }
    }),
  )
  return [...totals.values()]
}

// ---------- Elo ratings ----------
async function fetchElo() {
  const res = await fetch(ELO_URL, { headers: { Accept: 'text/plain', 'User-Agent': 'AtlasKick/1.0' } })
  if (!res.ok) throw new Error(`elo → HTTP ${res.status}`)
  const text = await res.text()
  const RE = /\[([^\]]+?)\]\(https?:\/\/worldfootballrankings\.com\/country\/[A-Z]{2,3}\)[^\d]{0,14}(\d{3,4}(?:\.\d+)?)/g
  const bases = {}
  for (const m of text.matchAll(RE)) {
    const name = m[1].replace(/\s+[A-Z]{2}(?:-[A-Z]{2,3})?$/, '').trim().toLowerCase()
    const id = NAME_TO_ID[name]
    if (id && !(id in bases)) bases[id] = Math.round(Number(m[2]))
  }
  return Object.keys(bases).length >= 20 ? { bases, syncedAt: new Date().toISOString() } : null
}

const topBoard = (rows, field, detail) =>
  rows
    .filter((r) => (field ? r[field] : r.value) > 0)
    .map((r) => ({ name: r.name, teamId: r.teamId, value: field ? r[field] : r.value, detail: detail ? detail(r) : '' }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .slice(0, 8)

async function main() {
  const [sb, official] = await Promise.all([fetchScoreboard(), fetchOfficial().catch(() => ({ officialGoals: [], officialAssists: [] }))])
  const roster = await fetchRosterAggregate(sb.fixtures).catch(() => [])
  const elo = await fetchElo().catch(() => null)

  const bump = (map, name, teamId, value) => {
    if (value <= 0) return
    const k = name.toLowerCase()
    const ex = map.get(k)
    if (ex) {
      ex.value = Math.max(ex.value, value)
      ex.teamId = ex.teamId ?? teamId
    } else map.set(k, { name, teamId, value, detail: '' })
  }

  // Goals = per-player MAX(official aggregate, live scoreboard scorer count).
  const goalMap = new Map()
  for (const r of official.officialGoals) goalMap.set(r.name.toLowerCase(), { ...r, detail: '' })
  for (const s of sb.scoreboardGoals) bump(goalMap, s.name, s.teamId, s.value)

  // Assists = MAX(official, knockout roster) so new assists appear promptly.
  const assistMap = new Map()
  for (const r of official.officialAssists) assistMap.set(r.name.toLowerCase(), { ...r, detail: '' })
  for (const r of roster) bump(assistMap, r.name, r.teamId, r.a)

  const cardsRows = roster.map((r) => ({ ...r, cp: r.yc + r.rc * 2 }))

  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: 'espn + worldfootballrankings',
    leaders: {
      goals: topBoard([...goalMap.values()]).slice(0, 8),
      assists: topBoard([...assistMap.values()]).slice(0, 8),
      saves: topBoard(roster, 'sv', () => 'knockouts'),
      cards: topBoard(cardsRows, 'cp', (r) => `${r.yc}Y${r.rc ? ` ${r.rc}R` : ''}`),
      shots: topBoard(roster, 'sh', (r) => `${r.g} goals`),
    },
    elo,
    fixtures: sb.fixtures,
  }

  const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data')
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'snapshot.json'), JSON.stringify(snapshot, null, 0))
  console.log(
    `[snapshot] ${snapshot.generatedAt} — goals:${snapshot.leaders.goals.length} assists:${snapshot.leaders.assists.length} saves:${snapshot.leaders.saves.length} elo:${elo ? Object.keys(elo.bases).length : 0} fixtures:${sb.fixtures.length}`,
  )
}

main().catch((err) => {
  console.error('[snapshot] failed:', err.message)
  process.exit(1)
})
