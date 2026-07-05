export function Footer() {
  return (
    <footer className="mt-24 overflow-hidden px-5 pb-10 pt-16">
      <div className="mx-auto max-w-7xl">
        <div className="grad-line" />
        <div className="grid gap-8 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="flex items-center gap-5">
              <img src="/img/logo.png" alt="AtlasKick" width="80" height="80" className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20" />
              <div className="display text-[clamp(3.2rem,12vw,9rem)] leading-[0.78] tracking-normal">
                ATLAS<span className="grad-text">KICK</span>
              </div>
            </div>
            <p className="mt-6 max-w-2xl text-[0.88rem]" style={{ color: 'var(--muted)' }}>
              Explainable World Cup intelligence: Elo ratings, Poisson goal models, ensemble predictions,
              Monte Carlo simulation and a grounded AI assistant in a Moroccan editorial broadcast skin.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <div className="border-l pl-4" style={{ borderColor: 'var(--line-strong)' }}>
              <div className="mono text-[0.62rem] uppercase tracking-[0.22em]" style={{ color: 'var(--faint)' }}>
                Stack
              </div>
              <div className="mt-2 text-[0.82rem]" style={{ color: 'var(--text)' }}>
                React / TypeScript / Framer Motion / ML ensemble
              </div>
            </div>
            <div className="border-l pl-4" style={{ borderColor: 'var(--line-strong)' }}>
              <div className="mono text-[0.62rem] uppercase tracking-[0.22em]" style={{ color: 'var(--faint)' }}>
                Note
              </div>
              <div className="mt-2 text-[0.82rem]" style={{ color: 'var(--text)' }}>
                Portfolio project. Not affiliated with FIFA.
              </div>
            </div>
          </div>
        </div>
        <div className="grad-line opacity-60" />
        <p className="mono pt-6 text-center text-[0.72rem] tracking-[0.14em]" style={{ color: 'var(--muted)' }}>
          Created by <span style={{ color: 'var(--text)' }}>Ilyas Daoud El Asmi</span> by love{' '}
          <span className="grad-text" aria-hidden>
            ❤
          </span>
        </p>
      </div>
    </footer>
  )
}
