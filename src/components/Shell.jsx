import { Link, NavLink } from 'react-router-dom'

export default function Shell({ params, children }) {
  const search = params?.toString() ? `?${params}` : ''
  return (
    <div>
      <div className="mast-rule" />
      <header className="mast">
        <div className="brand">
          <Link to="/" className="mark" aria-label="Public Cap">
            <img
              src="/logo-pc.png"
              alt=""
              width={92}
              height={92}
              decoding="async"
              fetchPriority="high"
            />
          </Link>
          <div>
            <div className="kicker">A college athletics capacity desk · v1.2 · Aug 30, 2026</div>
            <Link to="/" className="wordmark">Public Cap</Link>
          </div>
        </div>
        <p className="tagline">
          Two ceilings on every Power 4 program: the House benefits cap, and what
          they can actually write this year from public filings. Then whatever NIL
          is in a filing. Seasons run 2021–2026 (NIL era).
        </p>
        <nav className="nav">
          <NavLink to={{ pathname: '/', search }} end>Rank list</NavLink>
          <NavLink to={{ pathname: '/compare', search }}>Compare</NavLink>
          <NavLink to={{ pathname: '/tape', search }}>Tape</NavLink>
          <NavLink to={{ pathname: '/tv', search }}>TV</NavLink>
          <NavLink to={{ pathname: '/buyout', search }}>Buyout</NavLink>
          <NavLink to={{ pathname: '/methods', search }}>Methods</NavLink>
        </nav>
      </header>
      {children}
      <footer className="site-foot">
        Capacity is annual, not lifetime. Current-coach buyouts are overhang; paid buyouts are a separate tape.
        Booked NIL stays official. Collective 990 is a separate cited lane, not House.
        Modeled NIL is a conference heuristic: House-era
        (rev-share + third-party) for 2025–26 and 2026–27, and a labeled collective-era
        third-party-only backcast for 2021–24.
        Every figure carries a source, a date, and a confidence mark.
      </footer>
    </div>
  )
}

export function SettingType() {
  return (
    <div className="page-wrap">
      <p className="lede">Setting type…</p>
      <div className="table-scroll table-pending" aria-busy="true" />
    </div>
  )
}
