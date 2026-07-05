// World Cup 2026 analytics dataset — real groups, standings and knockout state.
// Elo = worldfootballrankings.com ELO ratings (July 4 2026 baseline, includes
// all results through the Round of 32 — Morocco #6); fifaRank = FIFA live
// ranking. Attack/defense and xG remain the platform's own model indices
// (1.0 = tournament average).

export type FormResult = 'W' | 'D' | 'L'

export interface Team {
  id: string
  name: string
  code: string // ISO 3166-1 alpha-2, used for flag rendering
  group: string
  groupPts: number // real final group-stage points
  elo: number
  fifaRank: number
  attack: number // chance creation index (1.0 = avg)
  defense: number // chances conceded index (lower = better)
  form: FormResult[] // last 5, most recent last (shootout results count as draws)
  xgFor: number // model-estimated xG created per match this tournament
  xgAgainst: number
  cleanSheets: number
  style: string
  alive: boolean // still in the tournament (R16 qualified, or R32 tie pending)
}

const t = (
  id: string,
  name: string,
  code: string,
  group: string,
  groupPts: number,
  elo: number,
  fifaRank: number,
  attack: number,
  defense: number,
  form: string,
  xgFor: number,
  xgAgainst: number,
  cleanSheets: number,
  style: string,
  alive = false,
): Team => ({
  id,
  name,
  code,
  group,
  groupPts,
  elo,
  fifaRank,
  attack,
  defense,
  form: form.split('') as FormResult[],
  xgFor,
  xgAgainst,
  cleanSheets,
  style,
  alive,
})

export const TEAMS: Team[] = [
  // Group A — Mexico 9, South Africa 4, South Korea 3, Czechia 1
  t('mex', 'Mexico', 'mx', 'A', 9, 1754, 13, 1.16, 0.86, 'WWWWW', 1.52, 0.74, 3, 'Host-powered high press, quick wide rotations', true),
  t('rsa', 'South Africa', 'za', 'A', 4, 1451, 61, 0.84, 1.06, 'DWDLL', 0.92, 1.28, 1, 'Energetic ground combinations, brave press'),
  t('kor', 'South Korea', 'kr', 'A', 3, 1559, 22, 0.94, 1.08, 'LWDLL', 1.02, 1.3, 0, 'Vertical transitions, compact mid-block'),
  t('cze', 'Czechia', 'cz', 'A', 1, 1467, 40, 0.82, 1.12, 'DLDLD', 0.86, 1.34, 0, 'Direct play, set-piece threat'),
  // Group B — Switzerland 7, Canada 4, Bosnia 1, Qatar 1
  t('sui', 'Switzerland', 'ch', 'B', 7, 1696, 16, 1.0, 0.88, 'WWWDL', 1.18, 0.92, 2, 'Structured 4-2-3-1, disciplined rest defense', true),
  t('can', 'Canada', 'ca', 'B', 4, 1571, 25, 1.02, 0.94, 'LWDLW', 1.21, 1.05, 2, 'Athletic wing play through Davies, aggressive counter-press', true),
  t('bih', 'Bosnia and Herzegovina', 'ba', 'B', 1, 1409, 70, 0.74, 1.16, 'DLDLL', 0.78, 1.4, 0, 'Veteran spine, deep block'),
  t('qat', 'Qatar', 'qa', 'B', 1, 1411, 51, 0.66, 1.24, 'LDLDL', 0.68, 1.55, 0, 'Patient possession, narrow 3-5-2'),
  // Group C — Brazil 7, Morocco 7, Scotland 3, Haiti 0
  t('bra', 'Brazil', 'br', 'C', 7, 1805, 5, 1.32, 0.8, 'WDWWW', 1.88, 0.82, 2, 'Wide 1v1 overloads through Vinícius, inverted full-backs', true),
  t('mar', 'Morocco', 'ma', 'C', 7, 1789, 6, 1.1, 0.76, 'WDWWD', 1.42, 0.72, 1, 'Ouahbi 4-2-3-1: Brahim between the lines, Hakimi overlaps, elite shootout nerve', true),
  t('sco', 'Scotland', 'gb-sct', 'C', 3, 1491, 36, 0.8, 1.04, 'WDLWL', 0.85, 1.22, 1, 'Back-three resilience, midfield runners'),
  t('hai', 'Haiti', 'ht', 'C', 0, 1265, 88, 0.62, 1.38, 'LWLLL', 0.6, 1.92, 0, 'Fearless counters, raw athleticism'),
  // Group D — USA 6, Australia 4, Paraguay 4, Turkey 3
  t('usa', 'United States', 'us', 'D', 6, 1690, 15, 1.1, 0.9, 'WWLWW', 1.44, 0.95, 3, 'Pressing 4-2-3-1 built on athletic duels, home crowds', true),
  t('aus', 'Australia', 'au', 'D', 4, 1582, 23, 0.86, 1.02, 'DWDWL', 0.94, 1.18, 1, 'Compact 4-4-2, transition-led attacks', true),
  t('par', 'Paraguay', 'py', 'D', 4, 1542, 26, 0.82, 0.88, 'WDLWD', 0.88, 0.94, 2, 'Gritty low block, penalty-box heroics — beat Germany on penalties', true),
  t('tur', 'Turkey', 'tr', 'D', 3, 1583, 24, 0.92, 1.06, 'WLWLL', 1.0, 1.24, 0, 'Technical wide play, streaky finishing'),
  // Group E — Germany 6, Ivory Coast 6, Ecuador 4, Curaçao 1
  t('ger', 'Germany', 'de', 'E', 6, 1726, 10, 1.24, 0.86, 'WWLWD', 1.68, 0.9, 1, 'Musiala-driven half-space overloads, high press — out on penalties'),
  t('civ', 'Ivory Coast', 'ci', 'E', 6, 1565, 38, 0.92, 0.98, 'WWLWL', 1.02, 1.12, 1, 'Powerful spine, direct wing service'),
  t('ecu', 'Ecuador', 'ec', 'E', 4, 1593, 20, 0.9, 0.9, 'WDWDL', 0.98, 0.98, 1, 'Physical midfield, high defensive line'),
  t('cuw', 'Curaçao', 'cw', 'E', 1, 1286, 90, 0.62, 1.3, 'DLLDL', 0.62, 1.72, 0, 'Resolute 5-3-2, direct outlets'),
  // Group F — Netherlands 7, Japan 5, Sweden 4, Tunisia 0
  t('ned', 'Netherlands', 'nl', 'F', 7, 1776, 8, 1.22, 0.82, 'WWDWD', 1.66, 0.84, 2, 'Hybrid 4-3-3, Gakpo-led verticality — out on penalties vs Morocco'),
  t('jpn', 'Japan', 'jp', 'F', 5, 1674, 14, 1.06, 0.88, 'WWDLL', 1.28, 0.94, 1, 'Rapid ball circulation, wing-back overlaps'),
  t('swe', 'Sweden', 'se', 'F', 4, 1526, 31, 0.88, 1.0, 'WDLDL', 0.95, 1.15, 1, 'Organized 4-4-2, target-man outlets'),
  t('tun', 'Tunisia', 'tn', 'F', 0, 1427, 43, 0.72, 1.2, 'LLLDL', 0.72, 1.5, 0, 'Deep 4-1-4-1 block, set-piece threat'),
  // Group G — Belgium 5, Egypt 5, Iran 3, New Zealand 1
  t('bel', 'Belgium', 'be', 'G', 5, 1757, 9, 1.18, 0.94, 'WDDWW', 1.58, 1.05, 1, 'De Bruyne-conducted attacks, aging but elite core', true),
  t('egy', 'Egypt', 'eg', 'G', 5, 1597, 29, 0.9, 0.96, 'DWWDL', 0.98, 1.08, 1, 'Salah-led right-side overloads, disciplined block', true),
  t('irn', 'Iran', 'ir', 'G', 3, 1610, 27, 0.82, 1.04, 'WLDLL', 0.88, 1.22, 1, 'Organized 4-4-2 block, counter through wings'),
  t('nzl', 'New Zealand', 'nz', 'G', 1, 1270, 83, 0.6, 1.32, 'DLLLD', 0.58, 1.78, 0, 'Deep block, aerial set-piece focus'),
  // Group H — Spain 7, Cabo Verde 3, Uruguay 2, Saudi Arabia 2
  t('esp', 'Spain', 'es', 'H', 7, 1892, 2, 1.4, 0.7, 'WWDWW', 2.08, 0.64, 3, 'Positional play, Yamal–Oyarzabal axis, third-man patterns', true),
  t('cpv', 'Cabo Verde', 'cv', 'H', 3, 1403, 72, 0.68, 1.18, 'LWDLL', 0.7, 1.46, 1, 'Compact block, counters through pace', true),
  t('uru', 'Uruguay', 'uy', 'H', 2, 1635, 17, 1.0, 0.92, 'DDLWD', 1.12, 1.02, 1, 'Man-press intensity, veteran know-how'),
  t('ksa', 'Saudi Arabia', 'sa', 'H', 2, 1426, 59, 0.72, 1.18, 'DDLLL', 0.74, 1.5, 0, 'Brave high line, quick vertical breaks'),
  // Group I — France 9, Norway 6, Senegal 3, Iraq 0
  t('fra', 'France', 'fr', 'I', 9, 1916, 1, 1.38, 0.72, 'WWWWW', 2.02, 0.66, 3, 'Elite transitions around Mbappé (6 goals), positional flexibility', true),
  t('nor', 'Norway', 'no', 'I', 6, 1618, 19, 1.16, 0.98, 'WWLWW', 1.6, 1.08, 1, 'Haaland-focused box occupation (5 goals), direct supply', true),
  t('sen', 'Senegal', 'sn', 'I', 3, 1653, 18, 0.96, 0.92, 'WLLWL', 1.05, 1.04, 1, 'Physical 4-3-3, dominant duels'),
  t('irq', 'Iraq', 'iq', 'I', 0, 1404, 58, 0.62, 1.3, 'LLLLD', 0.6, 1.74, 0, 'Compact 5-4-1, long-ball outlets'),
  // Group J — Argentina 9, Austria 4, Algeria 4, Jordan 0
  t('arg', 'Argentina', 'ar', 'J', 9, 1914, 3, 1.36, 0.74, 'WWWWW', 1.96, 0.7, 3, 'Messi-orchestrated free roles (6 goals), ferocious counter-press', true),
  t('aut', 'Austria', 'at', 'J', 4, 1599, 21, 0.98, 0.96, 'WWDLL', 1.14, 1.1, 1, 'Rangnick pressing machine — routed by Spain in the R32'),
  t('alg', 'Algeria', 'dz', 'J', 4, 1577, 28, 0.92, 1.0, 'LWDWL', 1.0, 1.14, 1, 'Technical wide play, patient build-up', true),
  t('jor', 'Jordan', 'jo', 'J', 0, 1350, 62, 0.64, 1.28, 'LLLLL', 0.62, 1.7, 0, 'Compact 5-4-1, long-ball outlets'),
  // Group K — Colombia 7, Portugal 5, DR Congo 4, Uzbekistan 0
  t('col', 'Colombia', 'co', 'K', 7, 1740, 12, 1.1, 0.88, 'WWWDW', 1.4, 0.96, 2, 'Left-side overloads through Luis Díaz', true),
  t('por', 'Portugal', 'pt', 'K', 5, 1788, 7, 1.28, 0.84, 'WDDWW', 1.8, 0.88, 1, 'Inverted wingers, Bruno-led final-third creativity', true),
  t('cod', 'DR Congo', 'cd', 'K', 4, 1495, 60, 0.8, 1.1, 'WDLWL', 0.86, 1.32, 1, 'Explosive athleticism, direct wing raids'),
  t('uzb', 'Uzbekistan', 'uz', 'K', 0, 1410, 55, 0.68, 1.22, 'LLDLL', 0.68, 1.52, 0, 'Technical short build-up, youthful midfield'),
  // Group L — England 7, Croatia 6, Ghana 4, Panama 0
  t('eng', 'England', 'gb-eng', 'L', 7, 1851, 4, 1.28, 0.78, 'WWWDW', 1.82, 0.74, 2, 'Structured possession, Kane focal point (5 goals), elite set pieces', true),
  t('cro', 'Croatia', 'hr', 'L', 6, 1723, 11, 1.04, 0.9, 'WWLWL', 1.2, 0.96, 1, 'Midfield control, tempo dictation — edged out by Portugal'),
  t('gha', 'Ghana', 'gh', 'L', 4, 1387, 66, 0.88, 1.1, 'WDWLL', 0.94, 1.35, 1, 'Explosive transitions, high-risk pressing', true),
  t('pan', 'Panama', 'pa', 'L', 0, 1478, 30, 0.7, 1.22, 'LLLDL', 0.7, 1.55, 0, 'Aggressive man-marking, low block'),
]

export const teamById = (id: string): Team => {
  const team = TEAMS.find((x) => x.id === id)
  if (!team) throw new Error(`Unknown team id: ${id}`)
  return team
}

export const flagUrl = (code: string, size: 'w40' | 'w80' | 'w160' = 'w80'): string =>
  `https://flagcdn.com/${size}/${code}.png`

export const formPoints = (form: FormResult[]): number =>
  form.reduce((acc, r) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0)
