// Morocco World Cup journey — the real 2026 campaign + 2022 benchmark data.

export interface JourneyStep {
  stage: string
  opponentId: string
  result: string
  outcome: 'W' | 'D' | 'L' | 'next'
  date: string
  story: string
}

export const MOROCCO_JOURNEY: JourneyStep[] = [
  {
    stage: 'Group C — Matchday 1',
    opponentId: 'bra',
    result: '1 – 1',
    outcome: 'D',
    date: 'Jun 13',
    story: 'A statement point against the five-time champions. Ouahbi’s 4-2-3-1 stayed compact for long stretches and struck once through its quick-transition game — the draw that framed the whole group.',
  },
  {
    stage: 'Group C — Matchday 2',
    opponentId: 'sco',
    result: '0 – 1',
    outcome: 'W',
    date: 'Jun 19',
    story: 'The grinding kind of win tournament runs are built on. Scotland sat deep and disrupted; Morocco found the single goal it needed and managed the rest.',
  },
  {
    stage: 'Group C — Matchday 3',
    opponentId: 'hai',
    result: '4 – 2',
    outcome: 'W',
    date: 'Jun 24',
    story: 'Four goals to close the group with 7 points, level with Brazil and second only on goal difference. The attack finally cut loose; the two conceded gave Ouahbi something to fix.',
  },
  {
    stage: 'Round of 32',
    opponentId: 'ned',
    result: '1 – 1 · 3–2 pens',
    outcome: 'W',
    date: 'Jun 29 · Guadalupe',
    story: 'Gakpo put the Dutch ahead in the 72nd. In the first minute of stoppage time, Issa Diop rose to head the equalizer — then Bounou’s shootout aura did the rest, and Ismael Saibari buried the decisive kick, 3–2.',
  },
  {
    stage: 'Round of 16',
    opponentId: 'can',
    result: 'Jul 4 · 17:00 UTC',
    outcome: 'next',
    date: 'Jul 4 · NRG Stadium, Houston',
    story: 'A co-host with a home continent behind it — but a team Morocco outrates on every model index. Win, and a probable quarter-final against France awaits in Foxborough.',
  },
]

export interface CampaignComparison {
  metric: string
  y2022: string
  y2026: string
  better: '2022' | '2026' | 'even'
}

export const COMPARE_2022: CampaignComparison[] = [
  { metric: 'Group stage points', y2022: '7 / 9', y2026: '7 / 9', better: 'even' },
  { metric: 'Group finish', y2022: '1st in F (over Croatia)', y2026: '2nd in C (behind Brazil on GD)', better: '2022' },
  { metric: 'Group goals for–against', y2022: '4 – 1', y2026: '6 – 3', better: 'even' },
  { metric: 'Signature result', y2022: 'Beat Spain on penalties (R16)', y2026: 'Beat Netherlands on penalties (R32)', better: 'even' },
  { metric: 'Shootout record', y2022: 'Won 3–0 vs Spain', y2026: 'Won 3–2 vs Netherlands', better: 'even' },
  { metric: 'Coach', y2022: 'Walid Regragui', y2026: 'Mohamed Ouahbi (U-20 world champion 2025)', better: 'even' },
  { metric: 'Furthest stage', y2022: 'Semi-final (4th place)', y2026: 'Round of 16 — in progress', better: 'even' },
]

export const MOROCCO_2026_FACTS: { label: string; value: string }[] = [
  { label: 'Unbeaten in', value: '4 games' },
  { label: 'Group C finish', value: '2nd · 7 pts' },
  { label: 'Round of 32', value: 'NED · pens' },
  { label: 'Next up', value: 'CAN · Jul 4' },
]
