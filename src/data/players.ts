// Player analytics tables — real Golden Boot race and Morocco squad,
// tournament stats through the Round of 32 (July 3, 2026 snapshot).

export interface PlayerStat {
  name: string
  teamId: string
  position: string
  goals: number
  assists: number
  note: string
}

export const TOP_SCORERS: PlayerStat[] = [
  { name: 'Kylian Mbappé', teamId: 'fra', position: 'FW', goals: 6, assists: 2, note: 'Braces vs Senegal & Iraq, two more vs Sweden — leads on assists' },
  { name: 'Lionel Messi', teamId: 'arg', position: 'RW', goals: 7, assists: 1, note: 'Scored his seventh in the 3-2 AET win over Cabo Verde' },
  { name: 'Erling Haaland', teamId: 'nor', position: 'FW', goals: 5, assists: 0, note: 'Late winner vs Ivory Coast in the Round of 32' },
  { name: 'Harry Kane', teamId: 'eng', position: 'FW', goals: 5, assists: 1, note: 'Double in the R32 win over DR Congo' },
  { name: 'Mikel Oyarzabal', teamId: 'esp', position: 'FW', goals: 4, assists: 1, note: 'Spain’s quiet engine alongside Yamal' },
  { name: 'Vinícius Júnior', teamId: 'bra', position: 'LW', goals: 4, assists: 1, note: 'Brazil’s left-side spark' },
]

export interface MoroccoPlayer {
  name: string
  position: string
  club: string
  keyStat: string
  keyValue: string
  rating: number // platform tournament rating /10
  danger: number // 0-100 platform danger-creation index
}

// Verified members of Ouahbi's 26-man squad. Seven survivors of the Qatar 2022
// semi-final run made the cut; En-Nesyri, famously, did not.
export const MOROCCO_SQUAD: MoroccoPlayer[] = [
  { name: 'Brahim Díaz', position: 'AM', club: 'Real Madrid', keyStat: 'AFCON 2025 Golden Boot', keyValue: '5 goals', rating: 8.3, danger: 90 },
  { name: 'Achraf Hakimi', position: 'RB', club: 'PSG', keyStat: 'Third World Cup · 2022 semi-finalist', keyValue: 'Capt.', rating: 8.1, danger: 84 },
  { name: 'Ismael Saibari', position: 'AM', club: 'PSV', keyStat: 'Decisive penalty vs Netherlands', keyValue: 'R32', rating: 7.8, danger: 80 },
  { name: 'Yassine Bounou', position: 'GK', club: 'Al-Hilal', keyStat: 'Career WC shootout wins', keyValue: '2', rating: 8.2, danger: 10 },
  { name: 'Issa Diop', position: 'CB', club: 'Fulham', keyStat: '90+1′ header vs Netherlands', keyValue: '1 goal', rating: 7.9, danger: 30 },
  { name: 'Sofyan Amrabat', position: 'DM', club: 'Fiorentina', keyStat: '2022 semi-final anchor', keyValue: 'DM', rating: 7.6, danger: 32 },
  { name: 'Ayyoub Bouaddi', position: 'CM', club: 'Lille', keyStat: 'Age — switched from France youth', keyValue: '18', rating: 7.5, danger: 58 },
]

export interface AttackZone {
  zone: string
  share: number // % of dangerous attacks (platform analytics index)
  note: string
}

export const MOROCCO_ATTACK_ZONES: AttackZone[] = [
  { zone: 'Central pockets (Brahim–Saibari)', share: 38, note: 'Ouahbi’s 4-2-3-1 funnels danger between the lines through Brahim' },
  { zone: 'Right channel (Hakimi)', share: 36, note: 'Hakimi’s overlaps remain the release valve on transitions' },
  { zone: 'Left channel', share: 26, note: 'More conservative — the full-back tucks in to protect rest defense' },
]
