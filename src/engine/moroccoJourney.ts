// Live Morocco journey — the three group games are fixed history; every
// knockout step is derived from the live fixtures feed, and the "next" step
// resolves the upcoming opponent from the bracket (which may still be a
// "winner of X–Y" placeholder). This keeps the Morocco page current on its
// own — a win advances the timeline automatically.

import type { Fixture } from '../data/fixtures'
import { MOROCCO_JOURNEY, type JourneyStep } from '../data/morocco'
import { teamById } from '../data/teams'
import { resolveBracket, winnerOf, type BracketTie } from './bracket'

// The static group-stage chapters (indices 0–2 of the authored journey).
const GROUP_STEPS: JourneyStep[] = MOROCCO_JOURNEY.slice(0, 3)

const stageOrder = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final']

const opponentOf = (f: Fixture): string => (f.home === 'mar' ? f.away : f.home)

const moroccoScore = (f: Fixture): string => {
  const marHome = f.home === 'mar'
  const mg = marHome ? f.homeGoals : f.awayGoals
  const og = marHome ? f.awayGoals : f.homeGoals
  let s = `${mg} – ${og}`
  if (f.pens) {
    // pens stored home-first; re-orient to Morocco-first.
    const [ph, pa] = f.pens.split('–')
    s += ` · ${marHome ? `${ph}–${pa}` : `${pa}–${ph}`} pens`
  }
  return s
}

const outcomeFor = (f: Fixture): JourneyStep['outcome'] => {
  const w = winnerOf(f)
  if (!w) return 'D'
  return w === 'mar' ? 'W' : 'L'
}

const knockoutStory = (stage: string, oppName: string, outcome: JourneyStep['outcome']): string => {
  if (outcome === 'W') return `Job done. Morocco see off ${oppName} to march into the ${nextStageName(stage)}. Dima Maghrib.`
  if (outcome === 'L') return `The run ends against ${oppName}, but the Atlas Lions leave the ${stage} with their heads high.`
  return `Level with ${oppName} — heading for extra time and, if needed, another shootout.`
}

const nextStageName = (stage: string): string => {
  const i = stageOrder.indexOf(stage)
  return i >= 0 && i < stageOrder.length - 1 ? stageOrder[i + 1].toLowerCase() : 'next round'
}

export const deriveMoroccoJourney = (fixtures: Fixture[]): JourneyStep[] => {
  const steps: JourneyStep[] = [...GROUP_STEPS]

  // Morocco's knockout fixtures that exist in the feed, in stage order.
  const marKnockouts = fixtures
    .filter((f) => f.stage !== 'Group' && (f.home === 'mar' || f.away === 'mar'))
    .sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage))

  for (const f of marKnockouts) {
    const opp = teamById(opponentOf(f))
    if (f.status === 'played') {
      const outcome = outcomeFor(f)
      steps.push({
        stage: f.stage,
        opponentId: opp.id,
        result: moroccoScore(f),
        outcome,
        date: `${new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${f.city ? ` · ${f.city}` : ''}`,
        story: knockoutStory(f.stage, opp.name, outcome),
      })
    } else {
      const when = new Date(f.date)
      steps.push({
        stage: f.stage,
        opponentId: opp.id,
        result: f.status === 'live' ? 'LIVE' : `${when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        outcome: 'next',
        date: `${when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${f.venue ? ` · ${f.venue}` : ''}`,
        story: `Next up: ${opp.name}. ${f.status === 'live' ? 'Kick-off has arrived — follow it live.' : 'The model likes Morocco to keep the run alive.'}`,
      })
    }
  }

  // If Morocco has won its latest tie but the next fixture doesn't exist yet
  // in the feed (opponent still TBD), append a "winner of X–Y" placeholder.
  const last = steps[steps.length - 1]
  if (last.outcome === 'W' && last.stage !== 'Final') {
    const bracket = resolveBracket(fixtures)
    const allTies: BracketTie[] = [...bracket.qf, ...bracket.sf, bracket.final]
    // Find the tie whose known participant is Morocco but that has no fixture yet.
    const marTie = allTies.find(
      (t) => (t.a.id === 'mar' || t.b.id === 'mar') && !t.fixture && !t.winner,
    )
    if (marTie) {
      const otherSlot = marTie.a.id === 'mar' ? marTie.b : marTie.a
      const label =
        otherSlot.id
          ? teamById(otherSlot.id).name
          : otherSlot.from
            ? `Winner of ${teamById(otherSlot.from[0]).name} vs ${teamById(otherSlot.from[1]).name}`
            : 'TBD'
      steps.push({
        stage: marTie.label.split(' · ')[0],
        opponentId: otherSlot.id ?? (otherSlot.from ? otherSlot.from[0] : 'fra'),
        result: 'Awaiting opponent',
        outcome: 'next',
        date: marTie.label.split(' · ').slice(1).join(' · '),
        story:
          otherSlot.id
            ? `Morocco await ${teamById(otherSlot.id).name} in the ${marTie.label.split(' · ')[0]}.`
            : `Morocco are through and waiting on ${label} to learn their ${marTie.label.split(' · ')[0]} opponent.`,
      })
    }
  }

  return steps
}

export interface MoroccoNextMatch {
  homeId: string
  awayId: string
  known: boolean // false when the opponent is still "winner of X–Y"
  stage: string
  venue?: string
  date?: string
  fixture?: Fixture
}

// The single upcoming Morocco match to feature (or null if eliminated / champions).
export const deriveMoroccoNext = (fixtures: Fixture[]): MoroccoNextMatch | null => {
  const upcoming = fixtures
    .filter((f) => f.stage !== 'Group' && (f.home === 'mar' || f.away === 'mar') && f.status !== 'played')
    .sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage))[0]

  if (upcoming) {
    return {
      homeId: upcoming.home,
      awayId: upcoming.away,
      known: true,
      stage: upcoming.stage,
      venue: upcoming.venue,
      date: upcoming.date,
      fixture: upcoming,
    }
  }

  // No fixture yet — is Morocco still alive with a TBD opponent?
  const marPlayed = fixtures.filter((f) => f.stage !== 'Group' && (f.home === 'mar' || f.away === 'mar') && f.status === 'played')
  const latest = marPlayed.sort((a, b) => stageOrder.indexOf(b.stage) - stageOrder.indexOf(a.stage))[0]
  if (!latest || winnerOf(latest) !== 'mar') return null // eliminated or no data

  const bracket = resolveBracket(fixtures)
  const allTies: BracketTie[] = [...bracket.qf, ...bracket.sf, bracket.final]
  const marTie = allTies.find((t) => (t.a.id === 'mar' || t.b.id === 'mar') && !t.winner)
  if (!marTie) return null
  const otherSlot = marTie.a.id === 'mar' ? marTie.b : marTie.a
  return {
    homeId: 'mar',
    awayId: otherSlot.id ?? (otherSlot.from ? otherSlot.from[0] : 'fra'),
    known: Boolean(otherSlot.id),
    stage: marTie.label.split(' · ')[0],
    date: marTie.label.split(' · ').slice(1).join(' · '),
  }
}
