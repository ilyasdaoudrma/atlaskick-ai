// Retrieval layer for the LLM assistant — assembles a grounded DATA CONTEXT
// string from the live analytics tables. The LLM is forbidden from answering
// outside this block, so everything the user might reasonably ask about the
// tournament must be summarized here, compactly.

import type { Fixture } from '../data/fixtures'
import { MOROCCO_ATTACK_ZONES, MOROCCO_SQUAD } from '../data/players'
import { COMPARE_2022, MOROCCO_JOURNEY } from '../data/morocco'
import { TEAMS, formPoints, teamById, type Team } from '../data/teams'
import { latestLeaders } from '../services/espnStats'
import { predictMatch } from './predict'
import { runSimulation } from './simulate'

const fmtFixture = (f: Fixture): string => {
  const h = teamById(f.home).name
  const a = teamById(f.away).name
  if (f.status === 'played') return `${f.stage}: ${h} ${f.homeGoals}-${f.awayGoals} ${a}${f.pens ? ` (pens ${f.pens})` : ''}${f.venue ? ` @ ${f.venue}` : ''}`
  if (f.status === 'live') return `${f.stage}: ${h} ${f.homeGoals ?? 0}-${f.awayGoals ?? 0} ${a} — LIVE${f.minute ? ` ${f.minute}'` : ''}`
  return `${f.stage}: ${h} vs ${a} — ${new Date(f.date).toUTCString().slice(0, 22)} UTC${f.venue ? ` @ ${f.venue}` : ''}`
}

const teamProfile = (t: Team): string =>
  `${t.name}: group ${t.group} (${t.groupPts} pts), Elo ${t.elo}, FIFA rank ${t.fifaRank}, form ${t.form.join('')} (${formPoints(t.form)}pts/15), model xG for/against per match ${t.xgFor.toFixed(2)}/${t.xgAgainst.toFixed(2)}, clean sheets ${t.cleanSheets}, ${t.alive ? 'still alive' : 'eliminated'}. Style: ${t.style}`

const findMentioned = (q: string): Team[] => {
  const lower = q.toLowerCase()
  return TEAMS.filter((t) => lower.includes(t.name.toLowerCase()) || (t.id === 'usa' && /\busa\b/.test(lower)))
}

export interface GroundedContext {
  context: string
  sources: string[]
}

export const buildContext = (query: string, fixtures: Fixture[]): GroundedContext => {
  const q = query.toLowerCase()
  const sources = new Set<string>(['fixtures.live_feed'])
  const parts: string[] = []

  parts.push(
    'TOURNAMENT STATE: FIFA World Cup 2026 (USA/Canada/Mexico). Today is ' +
      new Date().toUTCString().slice(0, 16) +
      '. Group stage done; knockout stage in progress. Final: July 19, MetLife Stadium. Bracket: QF1=winner(Canada-Morocco) vs winner(Paraguay-France); QF2=winner(Portugal-Spain) vs winner(USA-Belgium); QF3=winner(Brazil-Norway) vs winner(Mexico-England); QF4=winners of remaining R32 ties.',
  )

  const played = fixtures.filter((f) => f.status === 'played')
  const rest = fixtures.filter((f) => f.status !== 'played')
  parts.push('RECENT RESULTS (real):\n' + played.slice(-10).map(fmtFixture).join('\n'))
  parts.push('LIVE & UPCOMING:\n' + rest.slice(0, 8).map(fmtFixture).join('\n'))

  // Mentioned teams → profiles; two teams → full model prediction.
  const mentioned = findMentioned(q).slice(0, 3)
  if (mentioned.length > 0) {
    parts.push('TEAM PROFILES:\n' + mentioned.map(teamProfile).join('\n'))
    sources.add('teams.ratings')
  }
  if (mentioned.length === 2) {
    const p = predictMatch(mentioned[0], mentioned[1])
    parts.push(
      `MODEL PREDICTION ${mentioned[0].name} vs ${mentioned[1].name} (ensemble Elo+Poisson+logistic): ` +
        `${mentioned[0].name} win ${(p.pHome * 100).toFixed(0)}%, draw ${(p.pDraw * 100).toFixed(0)}%, ${mentioned[1].name} win ${(p.pAway * 100).toFixed(0)}%. ` +
        `Expected goals ${p.lambdaHome.toFixed(2)}-${p.lambdaAway.toFixed(2)}, most likely score ${p.scoreline[0]}-${p.scoreline[1]}, confidence ${p.confidence}. ` +
        `Key factors: ${p.explanation.join(' ')}`,
    )
    sources.add('predictions.ensemble')
  }

  // Morocco material whenever relevant (or nothing else matched).
  if (q.includes('morocco') || q.includes('atlas') || mentioned.some((t) => t.id === 'mar') || mentioned.length === 0) {
    parts.push(
      'MOROCCO JOURNEY 2026 (coach Mohamed Ouahbi, 4-2-3-1): ' +
        MOROCCO_JOURNEY.map((j) => `${j.stage} vs ${teamById(j.opponentId).name}: ${j.result}`).join(' | ') +
        '. Key players: ' +
        MOROCCO_SQUAD.map((p) => `${p.name} (${p.position}, ${p.club}; ${p.keyStat}: ${p.keyValue}; danger ${p.danger}/100)`).join('; ') +
        '. Attack zones: ' +
        MOROCCO_ATTACK_ZONES.map((z) => `${z.zone} ${z.share}%`).join(', ') +
        '. 2022 vs 2026: ' +
        COMPARE_2022.map((c) => `${c.metric}: ${c.y2022} → ${c.y2026}`).join(' | '),
    )
    sources.add('morocco.journey')
  }

  // Leaderboards (live, auto-updated).
  const boards = latestLeaders.current
  if (boards) {
    const fmt = (rows: typeof boards.goals) => rows.slice(0, 6).map((r) => `${r.name}${r.teamId ? ` (${teamById(r.teamId).name})` : ''} ${r.value}`).join(', ')
    parts.push(
      `PLAYER LEADERS (auto-updated after every match) — Goals (full tournament): ${fmt(boards.goals)}. ` +
        `Assists: ${fmt(boards.assists)}. Saves (knockouts): ${fmt(boards.saves)}. ` +
        `Card points (knockouts, Y=1 R=2): ${fmt(boards.cards)}. Shots (knockouts): ${fmt(boards.shots)}.`,
    )
    sources.add('leaders.espn_stats')
  }

  // Monte Carlo — only when the question smells like odds/chances/winner.
  if (/(chance|odds|win the|champion|simulat|likely|favorite|favourite|reach)/.test(q)) {
    const sim = runSimulation(3000, fixtures)
    parts.push(
      'MONTE CARLO (3,000 sims of every undecided match, decided results locked) — champion odds: ' +
        sim.results.slice(0, 8).map((r) => `${r.team.name} ${(r.champion * 100).toFixed(1)}%`).join(', ') +
        '. Morocco path: QF ' +
        (() => {
          const m = sim.results.find((r) => r.team.id === 'mar')!
          return `${(m.quarter * 100).toFixed(0)}%, SF ${(m.semi * 100).toFixed(0)}%, final ${(m.final * 100).toFixed(0)}%, champion ${(m.champion * 100).toFixed(1)}%`
        })(),
    )
    sources.add('simulations.monte_carlo')
  }

  return { context: parts.join('\n\n').slice(0, 9000), sources: [...sources] }
}
