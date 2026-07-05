// Hourly Elo sync — pulls the live ELO table from worldfootballrankings.com.
// The site sits behind Cloudflare with no CORS, so the fetch goes through the
// r.jina.ai reader proxy (CORS-enabled) and the rankings are parsed out of the
// returned markdown. Only the top-50 table is exposed; teams outside it keep
// their last known base and continue to be updated by the local Elo engine.

import { useEffect, useState } from 'react'
import { NAME_TO_ID } from './sportsdb'

const PROXY_URL = 'https://r.jina.ai/https://worldfootballrankings.com/rankings'
const CACHE_KEY = 'atlaskick-elosync-v1'
const MAX_AGE_MS = 60 * 60 * 1000 // 1 hour

export interface EloSync {
  bases: Record<string, number> // team id → site ELO rating
  syncedAt: string // ISO — results after this instant are applied locally
}

// The reader proxy returns a markdown table whose cells look like:
//   `| 6 | [Morocco MA](https://…/country/MAR) | 1803.99 ELO Rating | …`
// This regex captures the linked team name and the ELO rating that follows,
// tolerating either the piped-table layout or a compact `](url)1803.99` one.
const ROW_RE = /\[([^\]]+?)\]\(https?:\/\/worldfootballrankings\.com\/country\/[A-Z]{2,3}\)[^\d]{0,14}(\d{3,4}(?:\.\d+)?)/g

// Names arrive as "Morocco MA" / "United States US" / "England GB-ENG" —
// strip the trailing ISO code token (2 letters, optionally hyphenated).
const cleanName = (raw: string): string =>
  raw
    .replace(/\s+[A-Z]{2}(?:-[A-Z]{2,3})?$/, '')
    .trim()
    .toLowerCase()

export const fetchSiteElo = async (): Promise<EloSync> => {
  const res = await fetch(PROXY_URL, { headers: { Accept: 'text/plain' } })
  if (!res.ok) throw new Error(`elo sync: HTTP ${res.status}`)
  const text = await res.text()

  const bases: Record<string, number> = {}
  for (const m of text.matchAll(ROW_RE)) {
    const name = cleanName(m[1])
    const id = NAME_TO_ID[name]
    if (id && !(id in bases)) bases[id] = Math.round(Number(m[2]))
  }
  if (Object.keys(bases).length < 20) throw new Error('elo sync: parse produced too few teams')
  return { bases, syncedAt: new Date().toISOString() }
}

const readCache = (): EloSync | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as EloSync
    if (!parsed.bases || !parsed.syncedAt) return null
    return parsed
  } catch {
    return null
  }
}

// Hook: returns the freshest site sync (cached across reloads), refreshing
// automatically every hour while the app is open.
export const useSyncedElo = (): EloSync | null => {
  const [sync, setSync] = useState<EloSync | null>(readCache)

  useEffect(() => {
    let cancelled = false
    const refresh = async (force = false) => {
      const cached = readCache()
      if (!force && cached && Date.now() - new Date(cached.syncedAt).getTime() < MAX_AGE_MS) {
        setSync(cached)
        return
      }
      try {
        const fresh = await fetchSiteElo()
        if (cancelled) return
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(fresh))
        } catch {
          // best effort
        }
        setSync(fresh)
      } catch {
        // Site unreachable → keep whatever we had; the local engine still
        // moves ratings after every result.
        if (cached && !cancelled) setSync(cached)
      }
    }
    refresh()
    const timer = setInterval(() => refresh(true), MAX_AGE_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return sync
}
