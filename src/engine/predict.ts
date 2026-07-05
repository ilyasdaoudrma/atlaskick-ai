// Match prediction engine — an ensemble of three models:
//  1. Elo win-expectancy model (rating-difference logistic)
//  2. Poisson goal model (attack/defense indices → full score matrix)
//  3. Feature-based logistic model (form, xG, defensive stability, clean sheets)
// Explanations are computed from the logistic model's log-odds contributions
// (sequential attribution — the same additive decomposition SHAP produces for
// linear models), not from a language model.

import { formPoints, type Team } from '../data/teams'

export interface FeatureContribution {
  feature: string
  label: string
  value: string
  logOdds: number
  deltaPp: number // percentage-point impact on home win probability
}

export interface Prediction {
  home: Team
  away: Team
  pHome: number
  pDraw: number
  pAway: number
  models: { name: string; pHome: number; pDraw: number; pAway: number }[]
  lambdaHome: number
  lambdaAway: number
  scoreline: [number, number]
  scoreMatrix: number[][] // [homeGoals][awayGoals] probabilities
  contributions: FeatureContribution[]
  confidence: 'High' | 'Medium' | 'Low'
  explanation: string[]
}

const AVG_GOALS = 1.32 // avg goals per team per match, WC 2026 through R32
const MAX_GOALS = 7

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z))

const poissonPmf = (lambda: number, k: number): number => {
  let fact = 1
  for (let i = 2; i <= k; i++) fact *= i
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / fact
}

// ---------- Model 1: Elo ----------
const eloModel = (home: Team, away: Team) => {
  const d = home.elo - away.elo
  const winExp = 1 / (1 + Math.pow(10, -d / 400))
  const pDraw = 0.29 * Math.exp(-Math.pow(d / 620, 2))
  return { name: 'Elo rating', pHome: winExp * (1 - pDraw), pDraw, pAway: (1 - winExp) * (1 - pDraw) }
}

// ---------- Model 2: Poisson goal model ----------
export const goalLambdas = (home: Team, away: Team): [number, number] => {
  const lambdaHome = AVG_GOALS * home.attack * away.defense
  const lambdaAway = AVG_GOALS * away.attack * home.defense
  return [Math.max(0.15, lambdaHome), Math.max(0.15, lambdaAway)]
}

const poissonModel = (home: Team, away: Team) => {
  const [lh, la] = goalLambdas(home, away)
  const matrix: number[][] = []
  let pHome = 0
  let pDraw = 0
  let pAway = 0
  for (let h = 0; h <= MAX_GOALS; h++) {
    matrix[h] = []
    for (let a = 0; a <= MAX_GOALS; a++) {
      let p = poissonPmf(lh, h) * poissonPmf(la, a)
      // Dixon-Coles style low-score correction: nudge probability mass
      // toward draws in tight low-scoring games.
      if (h === 0 && a === 0) p *= 1.12
      if ((h === 1 && a === 0) || (h === 0 && a === 1)) p *= 0.96
      matrix[h][a] = p
      if (h > a) pHome += p
      else if (h === a) pDraw += p
      else pAway += p
    }
  }
  const total = pHome + pDraw + pAway
  return {
    model: { name: 'Poisson goals', pHome: pHome / total, pDraw: pDraw / total, pAway: pAway / total },
    matrix: matrix.map((row) => row.map((p) => p / total)),
    lambdaHome: lh,
    lambdaAway: la,
  }
}

// ---------- Model 3: Feature logistic ----------
interface RawFeature {
  feature: string
  label: string
  weight: number
  x: number // signed, positive favors home
  display: string
}

const buildFeatures = (home: Team, away: Team): RawFeature[] => [
  {
    feature: 'elo',
    label: 'Elo rating gap',
    weight: 0.0042,
    x: home.elo - away.elo,
    display: `${home.elo} vs ${away.elo}`,
  },
  {
    feature: 'form',
    label: 'Recent form (last 5)',
    weight: 0.085,
    x: formPoints(home.form) - formPoints(away.form),
    display: `${formPoints(home.form)} pts vs ${formPoints(away.form)} pts`,
  },
  {
    feature: 'attack',
    label: 'Chance creation index',
    weight: 1.35,
    x: home.attack - away.attack,
    display: `${home.attack.toFixed(2)} vs ${away.attack.toFixed(2)}`,
  },
  {
    feature: 'defense',
    label: 'Defensive stability',
    weight: 1.45,
    x: away.defense - home.defense, // lower defense index = stronger
    display: `${home.defense.toFixed(2)} vs ${away.defense.toFixed(2)} conceded index`,
  },
  {
    feature: 'xg',
    label: 'Tournament xG difference',
    weight: 0.5,
    x: home.xgFor - home.xgAgainst - (away.xgFor - away.xgAgainst),
    display: `${(home.xgFor - home.xgAgainst).toFixed(2)} vs ${(away.xgFor - away.xgAgainst).toFixed(2)} per match`,
  },
  {
    feature: 'cleansheets',
    label: 'Clean sheets',
    weight: 0.12,
    x: home.cleanSheets - away.cleanSheets,
    display: `${home.cleanSheets} vs ${away.cleanSheets}`,
  },
]

const logisticModel = (home: Team, away: Team) => {
  const features = buildFeatures(home, away)
  const z = features.reduce((acc, f) => acc + f.weight * f.x, 0)
  const winExp = sigmoid(z)
  const pDraw = 0.27 * Math.exp(-Math.pow(z / 2.2, 2))
  const model = { name: 'Feature logistic', pHome: winExp * (1 - pDraw), pDraw, pAway: (1 - winExp) * (1 - pDraw) }

  // Sequential additive attribution in log-odds space, converted to
  // percentage-point deltas on the home-win probability.
  const contributions: FeatureContribution[] = features.map((f) => {
    const logOdds = f.weight * f.x
    return {
      feature: f.feature,
      label: f.label,
      value: f.display,
      logOdds,
      deltaPp: (sigmoid(z) - sigmoid(z - logOdds)) * 100,
    }
  })
  return { model, contributions, z }
}

// ---------- Ensemble ----------
export const predictMatch = (home: Team, away: Team): Prediction => {
  const elo = eloModel(home, away)
  const poisson = poissonModel(home, away)
  const logistic = logisticModel(home, away)

  const models = [elo, poisson.model, logistic.model]
  const pHome = models.reduce((s, m) => s + m.pHome, 0) / 3
  const pDraw = models.reduce((s, m) => s + m.pDraw, 0) / 3
  const pAway = models.reduce((s, m) => s + m.pAway, 0) / 3

  // Most likely scoreline from the Poisson matrix
  let best: [number, number] = [1, 0]
  let bestP = 0
  poisson.matrix.forEach((row, h) =>
    row.forEach((p, a) => {
      if (p > bestP) {
        bestP = p
        best = [h, a]
      }
    }),
  )

  // Confidence: gap between favorite and underdog + agreement across models
  const gap = Math.abs(pHome - pAway)
  const spread = Math.max(...models.map((m) => m.pHome)) - Math.min(...models.map((m) => m.pHome))
  const confidence: Prediction['confidence'] = gap > 0.34 && spread < 0.12 ? 'High' : gap > 0.15 ? 'Medium' : 'Low'

  const contributions = [...logistic.contributions].sort((a, b) => Math.abs(b.logOdds) - Math.abs(a.logOdds))

  return {
    home,
    away,
    pHome,
    pDraw,
    pAway,
    models,
    lambdaHome: poisson.lambdaHome,
    lambdaAway: poisson.lambdaAway,
    scoreline: best,
    scoreMatrix: poisson.matrix,
    contributions,
    confidence,
    explanation: buildExplanation(home, away, pHome, pAway, contributions),
  }
}

// ---------- In-play win probability ----------
// Conditions the Poisson goal model on the live score and clock: remaining
// expected goals shrink linearly with time left, the current score is fixed,
// and the full-time distribution is re-derived. For knockout ties, the draw
// mass is split into an "advances" probability (extra time + penalties favor
// the stronger side, weakly).
export interface LiveWinProb {
  pHome: number
  pDraw: number
  pAway: number
  pHomeAdvance: number
}

export const liveWinProbability = (
  home: Team,
  away: Team,
  homeGoals: number,
  awayGoals: number,
  minute: number,
): LiveWinProb => {
  const [lh, la] = goalLambdas(home, away)
  const remaining = Math.max(0, (90 - Math.min(minute, 90)) / 90)
  const rlh = Math.max(0.02, lh * remaining)
  const rla = Math.max(0.02, la * remaining)

  let pHome = 0
  let pDraw = 0
  let pAway = 0
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = poissonPmf(rlh, h) * poissonPmf(rla, a)
      const finalH = homeGoals + h
      const finalA = awayGoals + a
      if (finalH > finalA) pHome += p
      else if (finalH === finalA) pDraw += p
      else pAway += p
    }
  }
  const total = pHome + pDraw + pAway
  pHome /= total
  pDraw /= total
  pAway /= total

  const strengthShare = pHome + pAway > 0 ? pHome / (pHome + pAway) : 0.5
  const homeShare = 0.5 + (strengthShare - 0.5) * 0.6
  return { pHome, pDraw, pAway, pHomeAdvance: pHome + pDraw * homeShare }
}

// Natural-language explanation assembled from the model's own attributions —
// every sentence maps to a computed contribution, nothing is invented.
const buildExplanation = (
  home: Team,
  away: Team,
  pHome: number,
  pAway: number,
  contributions: FeatureContribution[],
): string[] => {
  const favorite = pHome >= pAway ? home : away
  const sign = pHome >= pAway ? 1 : -1
  const lines: string[] = []
  const phrase: Record<string, (fav: string, delta: string) => string> = {
    elo: (fav, d) => `${fav}'s Elo rating advantage shifts the win probability by ${d} points.`,
    form: (fav, d) => `Stronger recent form (last five matches) adds ${d} points for ${fav}.`,
    attack: (fav, d) => `${fav} creates more high-quality chances per match — worth ${d} points.`,
    defense: (fav, d) => `${fav}'s superior defensive stability contributes ${d} points.`,
    xg: (fav, d) => `A better tournament xG balance adds ${d} points for ${fav}.`,
    cleansheets: (fav, d) => `${fav}'s clean-sheet record adds ${d} points.`,
  }
  contributions
    .filter((c) => Math.abs(c.deltaPp) > 1.2)
    .slice(0, 4)
    .forEach((c) => {
      const favors = c.deltaPp * sign > 0 ? favorite.name : (favorite.id === home.id ? away : home).name
      const build = phrase[c.feature]
      if (build) lines.push(build(favors, Math.abs(c.deltaPp).toFixed(1)))
    })
  return lines
}
