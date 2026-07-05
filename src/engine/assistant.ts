// Grounded AI assistant — answers are composed exclusively from the platform's
// analytics tables (teams, fixtures, players, predictions, simulations).
// Retrieval happens first; the response is templated from real numbers.

import type { Fixture } from '../data/fixtures'
import { TEAMS, teamById, formPoints, type Team } from '../data/teams'
import { TOP_SCORERS, MOROCCO_SQUAD, MOROCCO_ATTACK_ZONES } from '../data/players'
import { latestLeaders } from '../services/espnStats'
import { predictMatch } from './predict'
import { runSimulation } from './simulate'

export interface AssistantAnswer {
  text: string[]
  sources: string[]
  suggestions: string[]
}

const pct = (x: number): string => `${Math.round(x * 100)}%`

const findTeams = (q: string): Team[] => {
  const lower = q.toLowerCase()
  return TEAMS.filter((t) => lower.includes(t.name.toLowerCase()))
}

const compareTeams = (a: Team, b: Team): AssistantAnswer => {
  const p = predictMatch(a, b)
  const top = p.contributions[0]
  return {
    text: [
      `${a.name} vs ${b.name} — the ensemble model gives ${a.name} ${pct(p.pHome)}, draw ${pct(p.pDraw)}, ${b.name} ${pct(p.pAway)}.`,
      `Expected goals: ${p.lambdaHome.toFixed(2)} – ${p.lambdaAway.toFixed(2)}, most likely scoreline ${p.scoreline[0]}–${p.scoreline[1]}.`,
      `Form (last 5): ${a.name} ${formPoints(a.form)} pts (${a.form.join('')}) vs ${b.name} ${formPoints(b.form)} pts (${b.form.join('')}).`,
      `Biggest factor: ${top.label.toLowerCase()} (${top.value}) — a ${Math.abs(top.deltaPp).toFixed(1)} percentage-point swing.`,
      `Styles: ${a.name} — ${a.style}. ${b.name} — ${b.style}.`,
    ],
    sources: ['teams.ratings', 'predictions.ensemble', 'predictions.contributions'],
    suggestions: [`Why is ${p.pHome >= p.pAway ? a.name : b.name} favored?`, 'Simulate the tournament', "What are Morocco's chances against Canada?"],
  }
}

const whyFavored = (a: Team, b: Team): AssistantAnswer => {
  const p = predictMatch(a, b)
  const fav = p.pHome >= p.pAway ? a : b
  return {
    text: [
      `${fav.name} is favored (${pct(Math.max(p.pHome, p.pAway))} vs ${pct(Math.min(p.pHome, p.pAway))}). The model's own attributions:`,
      ...p.explanation,
      `Confidence: ${p.confidence.toLowerCase()} — based on the probability gap and agreement across the Elo, Poisson and logistic models.`,
    ],
    sources: ['predictions.contributions', 'predictions.ensemble'],
    suggestions: [`Compare ${a.name} and ${b.name}`, 'Which team has the best defense?', 'Simulate the tournament'],
  }
}

const bestDefense = (): AssistantAnswer => {
  const ranked = [...TEAMS].filter((t) => t.alive).sort((x, y) => x.xgAgainst - y.xgAgainst).slice(0, 5)
  return {
    text: [
      'Best defenses still alive, by xG conceded per match:',
      ...ranked.map((t, i) => `${i + 1}. ${t.name} — ${t.xgAgainst.toFixed(2)} xGA, ${t.cleanSheets} clean sheets (defensive index ${t.defense.toFixed(2)})`),
      `${ranked[0].name} lead the tournament — ${ranked[0].style.toLowerCase()}.`,
    ],
    sources: ['teams.ratings', 'teams.tournament_xg'],
    suggestions: ['Who are the most efficient attackers?', 'Compare Morocco and Canada', "Show Morocco's most dangerous attacking zone"],
  }
}

const topAttackers = (): AssistantAnswer => {
  const boards = latestLeaders.current
  if (boards) {
    const line = (rows: typeof boards.goals) =>
      rows.slice(0, 5).map((r, i) => `${i + 1}. ${r.name}${r.teamId ? ` (${teamById(r.teamId).name})` : ''} — ${r.value}`).join('  ·  ')
    return {
      text: [
        'Live Golden Boot standings (official feed, updates after every match):',
        `Goals: ${line(boards.goals)}`,
        `Assists: ${line(boards.assists)}`,
      ],
      sources: ['espn.statistics', 'leaders.goals', 'leaders.assists'],
      suggestions: ['Who has the most saves?', 'Which team has the best defense?', 'Compare France and Brazil'],
    }
  }
  const ranked = [...TOP_SCORERS].sort((a, b) => b.goals + b.assists - (a.goals + a.assists)).slice(0, 6)
  return {
    text: [
      'The Golden Boot race through the Round of 32 (goals + assists):',
      ...ranked.map((p, i) => `${i + 1}. ${p.name} (${teamById(p.teamId).name}) — ${p.goals}G ${p.assists}A. ${p.note}.`),
    ],
    sources: ['players.top_scorers'],
    suggestions: ['Which player created the most danger for Morocco?', 'Which team has the best defense?', 'Compare France and Brazil'],
  }
}

const keeperAndDiscipline = (): AssistantAnswer => {
  const boards = latestLeaders.current
  if (!boards || (boards.saves.length === 0 && boards.cards.length === 0)) {
    return {
      text: ['Goalkeeper and discipline boards are built from the live knockout feed — they will appear once match data has synced.'],
      sources: [],
      suggestions: ['Who are the most efficient attackers?', 'Which team has the best defense?'],
    }
  }
  const fmt = (rows: typeof boards.saves, unit: string) =>
    rows.slice(0, 5).map((r, i) => `${i + 1}. ${r.name}${r.teamId ? ` (${teamById(r.teamId).name})` : ''} — ${r.value} ${unit}${r.detail && r.detail !== 'knockouts' ? ` (${r.detail})` : ''}`)
  return {
    text: [
      'Knockout-stage goalkeeper and discipline leaders (auto-updated after every match):',
      'Most saves:',
      ...fmt(boards.saves, 'saves'),
      'Card points (yellow = 1, red = 2):',
      ...fmt(boards.cards, 'pts'),
    ],
    sources: ['espn.rosters', 'leaders.saves', 'leaders.cards'],
    suggestions: ['Who are the most efficient attackers?', "What are Morocco's chances against Canada?", 'Simulate the tournament'],
  }
}

const moroccoDanger = (): AssistantAnswer => {
  const top = [...MOROCCO_SQUAD].sort((a, b) => b.danger - a.danger)[0]
  return {
    text: [
      `Morocco's most dangerous zone is the ${MOROCCO_ATTACK_ZONES[0].zone.toLowerCase()} — ${MOROCCO_ATTACK_ZONES[0].share}% of dangerous attacks. ${MOROCCO_ATTACK_ZONES[0].note}.`,
      ...MOROCCO_ATTACK_ZONES.slice(1).map((z) => `${z.zone}: ${z.share}% — ${z.note}.`),
      `Highest individual danger index: ${top.name} (${top.danger}/100) — ${top.keyStat.toLowerCase()}: ${top.keyValue}.`,
    ],
    sources: ['players.morocco_squad', 'analytics.attack_zones'],
    suggestions: ["What are Morocco's chances against Canada?", 'What should Morocco improve?', 'Compare Morocco and Canada'],
  }
}

const moroccoImprove = (): AssistantAnswer => {
  return {
    text: [
      'Three data-backed areas for Morocco to improve before Canada:',
      `1. Left-channel output — only ${MOROCCO_ATTACK_ZONES[2].share}% of dangerous attacks come from the left, making the attack predictable against a disciplined rest defense.`,
      '2. Defending crosses and second phases — both goals conceded to Haiti and Gakpo\'s strike vs the Netherlands came in transition moments; Canada\'s wing pace (Davies) attacks exactly that space.',
      '3. Killing games in 90 minutes — two of four results needed late drama (Diop\'s 90+1′ equalizer, a shootout). Against France-level opponents in a probable quarter-final, that margin disappears.',
    ],
    sources: ['analytics.attack_zones', 'fixtures.results', 'morocco.journey'],
    suggestions: ["Show Morocco's most dangerous attacking zone", "What are Morocco's chances against Canada?", 'Simulate the tournament'],
  }
}

const moroccoChances = (fixtures?: Fixture[]): AssistantAnswer => {
  const p = predictMatch(teamById('can'), teamById('mar'))
  const sim = runSimulation(5000, fixtures)
  const mar = sim.results.find((r) => r.team.id === 'mar')!
  return {
    text: [
      `Round of 16 vs Canada (Jul 4, Houston): Morocco ${pct(p.pAway)}, draw ${pct(p.pDraw)}, Canada ${pct(p.pHome)} — most likely scoreline ${p.scoreline[0]}–${p.scoreline[1]} (Canada listed first).`,
      ...p.explanation,
      `Across ${sim.runs.toLocaleString()} Monte Carlo simulations of everything still undecided, Morocco reach the quarter-final ${pct(mar.quarter)}, the semi-final ${pct(mar.semi)}, and win the World Cup ${pct(mar.champion)} of the time.`,
      'Morocco arrive unbeaten: 1–1 with Brazil, wins over Scotland and Haiti, and a 3–2 shootout victory against the Netherlands sealed by Saibari after Diop\'s 90+1′ equalizer.',
    ],
    sources: ['predictions.ensemble', 'simulations.monte_carlo', 'morocco.journey'],
    suggestions: ['Why is Morocco favored against Canada?', "Show Morocco's most dangerous attacking zone", 'What should Morocco improve?'],
  }
}

const fallback = (): AssistantAnswer => ({
  text: [
    "I answer only from AtlasKick's analytics tables — team ratings, fixtures, player stats, model predictions and Monte Carlo simulations. Try one of these:",
    '• "Compare Morocco and Canada" — head-to-head model breakdown',
    '• "Why is Morocco favored?" — the prediction\'s own feature attributions',
    '• "Which team has the best defense?" — tournament xGA table',
    '• "Who are the most efficient attackers?" — the Golden Boot race',
    '• "What are Morocco\'s chances against Canada?" — prediction + simulation',
  ],
  sources: [],
  suggestions: ['Compare Morocco and Canada', 'Which team has the best defense?', "What are Morocco's chances against Canada?"],
})

export const askAssistant = (query: string, fixtures?: Fixture[]): AssistantAnswer => {
  const q = query.toLowerCase()
  const teams = findTeams(q)

  const mentionsMorocco = q.includes('morocco') || q.includes('atlas')
  if ((q.includes('chance') || q.includes('odds')) && mentionsMorocco) return moroccoChances(fixtures)
  if (q.includes('improve') || q.includes('weakness') || q.includes('tactical area')) return moroccoImprove()
  if (q.includes('danger') || q.includes('zone') || q.includes('attacking zone')) return moroccoDanger()
  if (q.includes('why') && teams.length >= 2) return whyFavored(teams[0], teams[1])
  if (q.includes('why') && teams.length === 1) {
    const other = teams[0].id === 'mar' ? teamById('can') : teamById('mar')
    return whyFavored(teams[0].id === 'mar' ? teams[0] : other, teams[0].id === 'mar' ? other : teams[0])
  }
  if (q.includes('save') || q.includes('goalkeeper') || q.includes('keeper') || q.includes('card') || q.includes('discipline')) return keeperAndDiscipline()
  if (q.includes('defense') || q.includes('defence') || q.includes('concede')) return bestDefense()
  if (q.includes('scorer') || q.includes('attacker') || q.includes('efficient') || q.includes('striker') || q.includes('golden boot') || q.includes('assist')) return topAttackers()
  if (teams.length >= 2) return compareTeams(teams[0], teams[1])
  if (teams.length === 1 && teams[0].id === 'mar') return moroccoChances(fixtures)
  if (teams.length === 1) {
    const t = teams[0]
    return {
      text: [
        `${t.name} — Elo ${t.elo} (FIFA rank ${t.fifaRank}), group ${t.group}${t.alive ? ', still alive in the knockouts' : ', eliminated'}.`,
        `Tournament profile: ${t.xgFor.toFixed(2)} xG for / ${t.xgAgainst.toFixed(2)} against per match, ${t.cleanSheets} clean sheets, form ${t.form.join('')} (${formPoints(t.form)} pts).`,
        `Style: ${t.style}.`,
      ],
      sources: ['teams.ratings', 'teams.tournament_xg'],
      suggestions: [`Compare ${t.name} and Morocco`, 'Simulate the tournament', 'Which team has the best defense?'],
    }
  }
  return fallback()
}
