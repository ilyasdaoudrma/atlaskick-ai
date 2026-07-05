import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { FIXTURES, type Fixture } from '../data/fixtures'
import { lockPredictions } from '../engine/accuracy'
import { enrichWithEspn, fetchEspnKnockouts } from './espn'
import { buildLeaderBoards, latestLeaders, type LeaderBoards } from './espnStats'
import { fetchSnapshot } from './snapshot'
import { fetchLiveFixtures } from './sportsdb'

const REFRESH_MS = 90_000
const CACHE_KEY = 'atlaskick-live-v1'

export interface LiveDataState {
  fixtures: Fixture[]
  source: 'live' | 'snapshot'
  lastSync: string | null // ISO
  refreshing: boolean
  leaders: LeaderBoards | null
  scheduledAt: string | null // generatedAt of the last 3-hourly snapshot
}

const SNAPSHOT: LiveDataState = { fixtures: FIXTURES, source: 'snapshot', lastSync: null, refreshing: false, leaders: null, scheduledAt: null }

const LiveDataContext = createContext<LiveDataState>(SNAPSHOT)

const readCache = (): LiveDataState | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { fixtures: Fixture[]; fetchedAt: string }
    if (!Array.isArray(parsed.fixtures) || parsed.fixtures.length === 0) return null
    return { fixtures: parsed.fixtures, source: 'live', lastSync: parsed.fetchedAt, refreshing: false, leaders: null, scheduledAt: null }
  } catch {
    return null
  }
}

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LiveDataState>(() => readCache() ?? SNAPSHOT)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const fixturesRef = useRef<Fixture[]>(state.fixtures)
  fixturesRef.current = state.fixtures

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, refreshing: true }))
    // Both providers are fetched in parallel; each one failing is non-fatal.
    const [sdb, espn] = await Promise.allSettled([fetchLiveFixtures(), fetchEspnKnockouts()])

    if (sdb.status === 'rejected' && espn.status === 'rejected') {
      // Keep whatever we had (cached live data or the bundled snapshot).
      setState((prev) => ({ ...prev, refreshing: false }))
      return
    }

    // ESPN upgrades whatever base we have: live clocks, faster score flips,
    // espnId links into the Match Centre.
    let merged = sdb.status === 'fulfilled' ? sdb.value.fixtures : fixturesRef.current
    if (espn.status === 'fulfilled') merged = enrichWithEspn(merged, espn.value)

    // Freeze pre-match predictions for the accuracy tracker (idempotent).
    try {
      lockPredictions(merged)
    } catch {
      // grading is a bonus feature — never let it break the refresh
    }

    const snap = { fixtures: merged, fetchedAt: new Date().toISOString() }
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(snap))
    } catch {
      // cache is best-effort only
    }
    setState((prev) => ({ ...prev, fixtures: merged, source: 'live', lastSync: snap.fetchedAt, refreshing: false }))

    // Leaderboards: one cheap official request + incremental roster aggregation
    // (per-match rows are cached, so only newly finished games hit the network).
    try {
      const leaders = await buildLeaderBoards(merged)
      setState((prev) => ({ ...prev, leaders }))
    } catch {
      // Boards keep their previous value; UI falls back to the snapshot table.
    }
  }, [])

  // Boot: read the 3-hourly snapshot first so the leaderboards appear instantly
  // (already ≤3h fresh from the last scheduled run), then let the live refresh
  // update them on top while the app stays open.
  useEffect(() => {
    let cancelled = false
    fetchSnapshot().then((snap) => {
      if (cancelled || !snap) return
      const leaders: LeaderBoards = { ...snap.leaders, fetchedAt: snap.generatedAt }
      latestLeaders.current = leaders // let the grounded assistant read it too
      setState((prev) => ({ ...prev, leaders: prev.leaders ?? leaders, scheduledAt: snap.generatedAt }))
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    refresh()
    timer.current = setInterval(refresh, REFRESH_MS)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [refresh])

  return <LiveDataContext.Provider value={state}>{children}</LiveDataContext.Provider>
}

export const useLiveData = (): LiveDataState => useContext(LiveDataContext)
