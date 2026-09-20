# Deploying AtlasKick

AtlasKick is a **static single-page app** — it does not need a backend server to
run. Live data is fetched directly from keyless public APIs (ESPN,
worldfootballrankings) in the browser, and the heavier stats are pre-computed
into `public/data/snapshot.json`, which ships with the repo.

## 1. Host the frontend (free, no server)

Push this repo to GitHub, then import it on **Vercel** or **Netlify**:

- Build command: `npm run build`
- Output directory: `dist`

That's the whole app for every visitor. No PC of yours needs to stay on.

## 2. The stats snapshot (GitHub Actions, manual)

`.github/workflows/refresh-stats.yml` runs `scripts/fetch-snapshot.mjs` **on
GitHub's servers** (not your machine), regenerates `public/data/snapshot.json`,
and commits it. If your host auto-deploys on push (Vercel/Netlify do), the live
site picks it up automatically. Nothing to install.

It used to run every 3 hours. That schedule was removed on 2026-09-20 — the
2026 World Cup finished on 2026-07-19, so the committed snapshot is final and
re-running it only re-requested unchanging data from ESPN.

- Run it on demand: Actions tab → "Refresh stats snapshot" → Run workflow.

> You do **not** need a separate backend host (Hugging Face Space, etc.) for the
> refresh — GitHub Actions is the cloud cron. A backend is only worth adding for
> the one thing below.

## 3. Secrets (never shipped to the browser)

### Groq (the AI Analyst) — required for the assistant in production
The AI Analyst calls Groq. The key must stay server-side, so the app ships with
a serverless proxy at **`api/chat.ts`** (a Vercel Edge Function) that holds the
key and streams Groq's response back. The browser never sees it.

1. Get a key at **https://console.groq.com** (rotate the dev one that was shared
   during development).
2. On Vercel: Project → Settings → Environment Variables → add
   - Name: `GROQ_API_KEY`  ·  Value: your key  ·  Environment: Production
3. Redeploy. The assistant now works for every visitor with no key in the bundle.

> `vercel.json` already routes `/api/*` to the function and everything else to
> the SPA. Locally, `npm run dev` skips the function and calls Groq directly with
> `VITE_GROQ_API_KEY` from your `.env` (dev only, gitignored).
>
> Not on Vercel? The same `api/chat.ts` logic works as a Netlify Function or a
> tiny Hugging Face Space — it's a standard `Request → Response` handler.

## Summary

| Piece | Where it runs | Needs a server? |
|---|---|---|
| Frontend | Vercel/Netlify CDN | No |
| Stats snapshot rebuild (manual) | GitHub Actions (cloud) | No |
| Groq AI proxy | Vercel Edge Function (`api/chat.ts`) | Serverless, key = `GROQ_API_KEY` |

Stats come from ESPN + worldfootballrankings (both free, keyless). No other
API keys are needed.
