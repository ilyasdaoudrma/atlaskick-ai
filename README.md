# ⚽ AtlasKick AI — World Cup 2026 Match Intelligence

An **explainable football intelligence platform** for World Cup 2026 that combines historical
match data, probabilistic prediction, tactical indicators and AI-generated match insights —
with a dedicated **Morocco mode** following the Atlas Lions' knockout run.

> Not "my AI predicts winners." Every probability decomposes into feature attributions the
> user can interrogate: Elo gap, recent form, chance creation, defensive stability, xG balance.

**Live pages**

| Page | What it does |
|---|---|
| **Dashboard** | Cinematic hero, live results ticker, draggable fixtures carousel with live model odds, knockout bracket with advance probabilities, Elo power rankings, golden-boot race |
| **Predictions** | Pick any of the 48 teams: ensemble win/draw/loss, expected goals, most likely scoreline, per-model breakdown, SHAP-style waterfall of feature attributions, Poisson scoreline matrix, model-generated explanation |
| **Morocco** | Match-by-match journey timeline, Spain rematch analysis, Monte Carlo round-reach odds, player danger board, attack-zone analytics, 2022 Qatar vs 2026 comparison |
| **Simulator** | Monte Carlo engine — replays the remaining bracket 10,000× and reports quarter/semi/final/champion frequencies for all 16 alive teams |
| **AI Assistant** | Grounded, retrieval-first analyst. Answers only from the platform's analytics tables and cites its sources under every response — never invents numbers |

## The prediction engine (ensemble of 3 models)

1. **Elo win-expectancy** — rating-difference logistic baseline
2. **Poisson / Dixon-Coles goal model** — attack × defense indices → full scoreline
   probability matrix with low-score correction
3. **Feature logistic model** — form, tournament xG, defensive stability, clean sheets

Explainability: additive **log-odds attributions** from the logistic model (the exact
decomposition SHAP yields for linear models), converted to percentage-point swings and rendered
as a waterfall chart. The natural-language "why" is templated **from the model's own numbers** —
an LLM never invents the explanation.

The Monte Carlo simulator samples every knockout tie as a Bernoulli trial from the ensemble
probabilities (draw mass reallocated for extra time / penalties) and replays the bracket
10,000 times in chunks so the UI animates real progress.

## Stack

- **React 19 + TypeScript + Vite** — SPA with react-router
- **Framer Motion** — cinematic scroll-linked zooms, parallax, staggered reveals, draggable
  carousel, animated counters and charts
- **Tailwind CSS v4** + custom design tokens — dark broadcast-style design system
  (Barlow Condensed / Inter / IBM Plex Mono)
- **Pure-TS analytics engine** (`src/engine/`) — no server needed for the demo; the same
  interfaces map 1:1 onto the production architecture below
- **AI-generated imagery** — hero visuals generated with Nano Banana (stadium, Morocco fans,
  tactical pitch)

## Production architecture (Phase 3 target)

```
Football APIs / StatsBomb open data / fixture feeds
        ↓
Python data pipeline (Pandas)  →  PostgreSQL / Supabase
        ↓
ML training (scikit-learn, XGBoost) + SHAP explanations
        ↓
FastAPI backend  →  this React frontend  →  Vercel / Render
        ↑
GitHub Actions cron refresh
```

## Live data — dual-provider

Two keyless, CORS-open feeds, both refreshed every 90 seconds:

**TheSportsDB** (fixtures backbone) + **ESPN public API** (enrichment): exact live match
clocks, faster score flips, and the **Match Centre** (`/match/:espnId`) — possession bar,
full boxscore (shots, on target, pass accuracy, tackles, corners, cards…), minute-stamped
goal/card timeline, venue and attendance, auto-refreshing every 45s during live games.
Every finished knockout match on the dashboard's Results grid links into it.

**Player leaderboards** (dashboard, tabbed): Goals and Assists come from ESPN's official
tournament statistics feed (full tournament, 50 deep); Saves, Cards and Shots are aggregated
from every finished knockout match's rosters — each match is fetched exactly once and cached,
so one new request per finished game keeps every board current. The AI assistant answers
"who has the most saves / cards / goals" from the same live boards.

What the combined feed drives:

- **Ticker + carousel** — latest scores, penalty shootouts (`AET`/`AP` statuses) and upcoming
  kickoffs straight from the feed, with a `LIVE FEED · hh:mm` badge showing the last sync
- **Bracket** — TBD Round-of-16 slots resolve automatically as R32 winners come in
- **Simulator & assistant** — decided matches are *locked to their real result*; only
  undecided games are sampled, so the Monte Carlo always continues from the true bracket state
- **Fallbacks** — last successful payload is cached in `localStorage`; if the API is
  unreachable, the app degrades to the bundled July 3, 2026 snapshot (badge turns amber)

The free community key works out of the box; set `VITE_SPORTSDB_KEY` in `.env` (see
`.env.example`) for a personal key with higher limits. Providers are isolated in
`src/services/sportsdb.ts` and `src/services/espn.ts`; each failing independently degrades
gracefully (ESPN is an unofficial public API — if it ever changes, the app loses the live
clock and Match Centre but never the scores).

Group standings, squad facts and scorers are a verified July 3 snapshot; team ratings and xG
indices are the platform's own model values.

## Run it

```bash
npm install
npm run dev     # http://localhost:5190
npm run build   # production build (~140 kB gzipped)
```

## Credits & disclaimers

- Historical/event-level analysis pattern based on **StatsBomb open data** conventions.
- Demo dataset is illustrative. Not affiliated with FIFA.
