// Snapshot loader — reads public/data/snapshot.json, the file regenerated
// every 3 hours by the scheduled fetcher (scripts/fetch-snapshot.mjs) whether
// or not the app is open. Reading it on boot means the leaderboards (assists,
// shots, saves, cards, goals) and Elo are populated instantly and are never
// more than one cron cycle stale, even before any live fetch completes.

import type { LeaderBoards } from './espnStats'

export interface Snapshot {
  generatedAt: string
  leaders: Omit<LeaderBoards, 'fetchedAt'>
  elo: { bases: Record<string, number>; syncedAt: string } | null
}

export const fetchSnapshot = async (): Promise<Snapshot | null> => {
  try {
    const res = await fetch(`/data/snapshot.json?t=${Math.floor(Date.now() / 60000)}`)
    if (!res.ok) return null
    const data = (await res.json()) as Partial<Snapshot>
    if (!data.leaders || !data.generatedAt) return null
    return {
      generatedAt: data.generatedAt,
      leaders: data.leaders as Omit<LeaderBoards, 'fetchedAt'>,
      elo: data.elo ?? null,
    }
  } catch {
    return null
  }
}
