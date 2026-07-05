// Model accuracy tracker — the model keeps score on itself.
//
// Locking: every time the live feed refreshes, the current ensemble prediction
// for each not-yet-played knockout fixture is written once to localStorage.
// From that moment it is frozen — a genuine pre-match call. When the fixture
// later finishes, the locked probabilities are graded against the 90-minute
// result (shootouts grade as draws). Fixtures that finished before the user
// ever saw them are graded as a backtest on current ratings, clearly flagged.

import type { Fixture } from '../data/fixtures'
import { teamById } from '../data/teams'
import { predictMatch } from './predict'

const LOCK_KEY = 'atlaskick-predlog-v1'

interface LockedPrediction {
  pHome: number
  pDraw: number
  pAway: number
  scoreline: [number, number]
  lockedAt: string
}

type LockBook = Record<string, LockedPrediction>

const pairKey = (f: Fixture): string => `${f.stage}|${[f.home, f.away].sort().join('|')}`

const readBook = (): LockBook => {
  try {
    const raw = localStorage.getItem(LOCK_KEY)
    if (raw) return JSON.parse(raw) as LockBook
  } catch {
    // corrupted book → start fresh
  }
  return {}
}

// Call on every live refresh: freezes predictions for unplayed knockout games.
export const lockPredictions = (fixtures: Fixture[]): void => {
  const book = readBook()
  let changed = false
  fixtures
    .filter((f) => f.stage !== 'Group' && f.status !== 'played')
    .forEach((f) => {
      const key = pairKey(f)
      if (book[key]) return
      const p = predictMatch(teamById(f.home), teamById(f.away))
      // Orientation: stored relative to the fixture's home side at lock time.
      const homeFirst = f.home < f.away
      book[key] = {
        pHome: homeFirst ? p.pHome : p.pAway,
        pDraw: p.pDraw,
        pAway: homeFirst ? p.pAway : p.pHome,
        scoreline: homeFirst ? p.scoreline : [p.scoreline[1], p.scoreline[0]],
        lockedAt: new Date().toISOString(),
      }
      changed = true
    })
  if (changed) {
    try {
      localStorage.setItem(LOCK_KEY, JSON.stringify(book))
    } catch {
      // best effort
    }
  }
}

export type Outcome = 'home' | 'draw' | 'away'

export interface GradedMatch {
  fixture: Fixture
  homeName: string
  awayName: string
  probs: [number, number, number] // home/draw/away, fixture orientation
  predicted: Outcome
  actual: Outcome
  correct: boolean
  pActual: number // probability the model gave the true outcome
  brierOne: number // multiclass Brier score for this match (lower = better)
  locked: boolean // true = frozen pre-match, false = backtest
}

export interface AccuracyReport {
  graded: GradedMatch[]
  correct: number
  total: number
  avgPActual: number
  brier: number
  calibration: { bucket: string; predicted: number; actual: number; n: number }[]
}

const outcomeOf = (f: Fixture): Outcome | null => {
  if (f.homeGoals == null || f.awayGoals == null) return null
  if (f.homeGoals > f.awayGoals) return 'home'
  if (f.homeGoals < f.awayGoals) return 'away'
  return 'draw'
}

export const buildAccuracyReport = (fixtures: Fixture[]): AccuracyReport => {
  const book = readBook()
  const graded: GradedMatch[] = []

  fixtures
    .filter((f) => f.stage !== 'Group' && f.status === 'played')
    .forEach((f) => {
      const actual = outcomeOf(f)
      if (!actual) return

      const key = pairKey(f)
      const lock = book[key]
      let probs: [number, number, number]
      if (lock) {
        // Re-orient stored (alphabetical) probs back to this fixture's home side.
        const homeFirst = f.home < f.away
        probs = homeFirst ? [lock.pHome, lock.pDraw, lock.pAway] : [lock.pAway, lock.pDraw, lock.pHome]
      } else {
        const p = predictMatch(teamById(f.home), teamById(f.away))
        probs = [p.pHome, p.pDraw, p.pAway]
      }

      const outcomes: Outcome[] = ['home', 'draw', 'away']
      const predicted = outcomes[probs.indexOf(Math.max(...probs))]
      const actualIdx = outcomes.indexOf(actual)
      const target: [number, number, number] = [0, 0, 0]
      target[actualIdx] = 1
      const brierOne = probs.reduce((s, p, i) => s + (p - target[i]) ** 2, 0)

      graded.push({
        fixture: f,
        homeName: teamById(f.home).name,
        awayName: teamById(f.away).name,
        probs,
        predicted,
        actual,
        correct: predicted === actual,
        pActual: probs[actualIdx],
        brierOne,
        locked: Boolean(lock),
      })
    })

  const total = graded.length
  const correct = graded.filter((g) => g.correct).length
  const avgPActual = total ? graded.reduce((s, g) => s + g.pActual, 0) / total : 0
  const brier = total ? graded.reduce((s, g) => s + g.brierOne, 0) / total : 0

  // Calibration: bucket the favorite's probability, compare to hit rate.
  const buckets = [
    { lo: 0.33, hi: 0.45, label: '33–45%' },
    { lo: 0.45, hi: 0.55, label: '45–55%' },
    { lo: 0.55, hi: 0.65, label: '55–65%' },
    { lo: 0.65, hi: 1.01, label: '65%+' },
  ]
  const calibration = buckets
    .map(({ lo, hi, label }) => {
      const inBucket = graded.filter((g) => {
        const fav = Math.max(...g.probs)
        return fav >= lo && fav < hi
      })
      const n = inBucket.length
      return {
        bucket: label,
        predicted: n ? inBucket.reduce((s, g) => s + Math.max(...g.probs), 0) / n : 0,
        actual: n ? inBucket.filter((g) => g.correct).length / n : 0,
        n,
      }
    })
    .filter((b) => b.n > 0)

  return { graded: graded.reverse(), correct, total, avgPActual, brier, calibration }
}
