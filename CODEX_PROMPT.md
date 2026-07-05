# Codex mission — AtlasKick AI: design/UI elevation + AI-generated imagery

You are enhancing **AtlasKick AI**, a fully working World Cup 2026 football-intelligence app
(React 19 + TypeScript + Vite + Tailwind v4 + Framer Motion) in this repository. Everything
functional already works — live scores, predictions, Monte Carlo simulator, Groq assistant.
Your job has exactly two goals:

1. **Enhance the design and the UI** on every page until it looks like a product a design
   studio shipped — richer composition, stronger hierarchy, better motion, flawless mobile.
2. **Generate new images with your image-generation tool** and wire them into the app.
   You HAVE image generation available — use it. Do not skip this or substitute CSS-only
   art for the assets listed below.

## Commands
- `npm run dev` → http://localhost:5190
- `npm run build` → must be green before you finish (strict tsc + vite). Run it.

## Design system (enhance, never replace)
Identity: **"Terracotta Broadcast"** — warm Moroccan-editorial sports journal. Tokens in
`src/index.css`:
- Palette: espresso `--bg #120e08`, ivory text, saffron `--pitch #f2b63c` (primary),
  ember `--ember #ff6b35`, crimson `--mar-red #e24b58` (Morocco/away), emerald (live/positive).
- Signature: animated saffron→ember→crimson gradient — `.grad-text`, `.grad-bg`,
  `.grad-line`, `.grad-frame`. Use it deliberately, not everywhere.
- Fonts: Bricolage Grotesque (display), Instrument Sans (body), IBM Plex Mono (data). Keep them.
- Keep every CSS variable NAME and its semantic meaning — dozens of components read them.

## Hard rules
1. NEVER modify logic in `src/engine/*` or `src/services/*` (models, live feeds, Groq
   assistant). Restyling the components that render their output is encouraged.
2. TypeScript strict-clean. No `any`, no ts-ignore. `npm run build` green.
3. No new runtime dependencies except optionally `lenis`. Motion = Framer Motion + CSS only.
4. Mobile first: verify every change at 375px — no horizontal overflow, ≥44px touch targets.
   The mobile menu, chat input and carousels must stay comfortable one-handed.
5. Respect `prefers-reduced-motion` (global reducer already exists).
6. Keep JS bundle under 200 kB gzipped.
7. The Elo rankings list pins Morocco's row when it falls outside the top 12 — preserve that.

## PART 1 — Design & UI enhancement (all pages)
Work through this backlog in order; commit after each item:

1. **Hero (src/pages/Home.tsx)** — make it magazine-cover grade: duotone/grade the stadium
   image toward the palette with blend-mode overlays, layered parallax depth (foreground
   gradient mesh or particle SVG), bolder type composition (headline overlapping the image
   edge, one outlined/hollow display word, kicker as a vertical side rail on desktop).
2. **Bento recomposition** — Results grid, Leaderboards and Elo rankings currently sit in
   uniform grids. Rebuild as an editorial bento: asymmetric spans, one oversized feature
   cell (next Morocco match) wrapped in `.grad-frame`, varied card heights, intentional
   negative space.
3. **Micro-interactions** — magnetic hover on primary CTAs; ≤4° 3D tilt on carousel match
   cards; odometer-style number ticks when probabilities change; animated tab indicator in
   LeadersBoard; ticker items lift on hover; button press states everywhere.
4. **Match Centre (src/pages/MatchCentre.tsx)** — full-bleed scoreline header with radial
   team-color glows behind each crest, possession bar animating like a tug-of-war,
   broadcast-style staggered timeline, skeleton shimmer while loading.
5. **Morocco page scrollytelling (src/pages/Morocco.tsx)** — pinned section heading while the
   journey steps scroll; a crimson thread line that draws with scroll progress
   (`useScroll` + SVG `pathLength`); zellige pattern reveals between sections.
6. **Route transitions (src/App.tsx)** — two-layer gradient wipe (clip-path inset), ≤450ms.
7. **Global polish** — saffron `focus-visible` rings, consistent empty/loading states,
   upgraded footer (oversized wordmark + gradient hairline), custom 404 page.

## PART 2 — Image generation (use your image tool — mandatory)
House art direction for every image: *warm terracotta/saffron light, deep espresso shadows,
cinematic film grain, anamorphic feel, NO text, NO logos, NO recognizable player faces.*
Export sizes noted below, optimize to sensible file sizes (< 600 kB each), save into
`public/img/` with these exact filenames (existing code already references the first three).

Generate ALL of these:
1. `stadium-hero.png` (21:9, ≥1600px wide) — "Colossal football stadium at night seen from
   pitch level behind the goal net, warm terracotta and saffron floodlight haze, deep
   espresso shadows, crowd as golden bokeh, cinematic anamorphic, film grain"
2. `morocco-hero.png` (16:9) — "Moroccan football fans at night, sea of red flags with green
   stars, saffron smoke and warm confetti in floodlights, deep crimson-and-umber cinematic
   grade, low angle, film grain"
3. `pitch-data.png` (16:9) — "Overhead dark football pitch with glowing saffron tactical
   lines and pass-network arcs projected on the grass, warm amber-on-umber palette,
   broadcast analytics aesthetic"
4. `predict-bg.png` (16:9) — "Extreme close-up of a football on a dark pitch at night, single
   saffron spotlight, long dramatic shadow, mist, warm cinematic grade" → subtle fixed
   backdrop for the Predictions page (low opacity, graded).
5. `simulator-bg.png` (16:9) — "Abstract Monte Carlo visual: thousands of tiny glowing amber
   particles branching like a probability tree over deep espresso darkness, warm data-viz
   aesthetic" → Simulator page ambient backdrop.
6. `assistant-bg.png` (1:1 or 16:9) — "Warm abstract topography of flowing saffron-to-crimson
   gradient ribbons over espresso black, soft grain, calm and premium" → Analyst AI page
   backdrop behind the chat, heavily dimmed.
7. `card-morocco.png` (4:5) — "Atlas lion silhouette in saffron rim light emerging from
   darkness, warm ember haze, minimalist cinematic poster" → feature cell art in the bento.
8. `og.jpg` (1200×630) — social share card: stadium image graded to palette with the
   AtlasKick gradient bar; reference it in `index.html` with `og:image`/`twitter:card` meta.

Integration requirements: wire every image with graded gradient overlays (never raw),
`loading="lazy"` for below-the-fold, explicit dimensions to avoid layout shift, and keep the
existing scroll-linked zoom effects working on the three hero images.

## Definition of done
- `npm run build` green; zero console errors on `/`, `/predict`, `/morocco`, `/simulator`,
  `/assistant`, `/match/760498`.
- All 8 images generated, optimized, wired in, and visible in the running app.
- 375px and 1440px both look intentional; motion smooth, nothing jittery.
- Before/after: the app should read as a designed editorial product, not a template.
