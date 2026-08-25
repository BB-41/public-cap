import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import School from './pages/School.jsx'
import Compare from './pages/Compare.jsx'
import Methods from './pages/Methods.jsx'
import { computeCapacity, confidenceRollup, houseCap, ratios } from './lib/compute.js'
import { computeModeledNil } from './lib/nilModel.js'
import { allocateNamedPlayers, scaleRosterToModeled } from './lib/nilRoster.js'

export default function App() {
  const [data, setData] = useState(null)
  const [rosters, setRosters] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/data/schools.json').then((r) => {
        if (!r.ok) throw new Error(r.statusText)
        return r.json()
      }),
      fetch('/data/rosters.json').then((r) => (r.ok ? r.json() : { schools: {} })).catch(() => ({ schools: {} })),
    ])
      .then(([schools, rosterBook]) => {
        setData(schools)
        setRosters(rosterBook)
      })
      .catch((e) => setErr(String(e)))
  }, [])

  if (err) return <div className="page-wrap"><p className="lede">Failed to load desk data. {err}</p></div>
  if (!data) return <div className="page-wrap"><p className="lede">Setting type…</p></div>

  const house = houseCap(data.meta)
  const withCap = data.schools.map((s) => ({ ...s, _cap: computeCapacity(s) }))
  const capTotals = withCap.map((s) => s._cap.total)
  const enriched = withCap.map((s) => {
    const modeled = computeModeledNil(s, s._cap.total, capTotals, house)
    const nil = { ...s.nil, modeled }
    const r = ratios({ ...s, nil }, data.meta)
    const roster = scaleRosterToModeled(modeled)
    const named = allocateNamedPlayers(rosters?.schools?.[s.id], modeled, roster)
    return { ...s, nil, _cap: s._cap, _ratios: r, _roster: roster, _named: named, _conf: confidenceRollup(s) }
  })

  return (
    <div>
      <div className="mast-rule" />
      <header className="mast">
        <div className="brand">
          <Link to="/" className="mark" aria-label="Public Cap">
            <img src="/logo-pc.png" alt="" />
          </Link>
          <div>
            <div className="kicker">A college athletics capacity desk · v1.1 · Aug 23, 2026</div>
            <Link to="/" className="wordmark">Public Cap</Link>
          </div>
        </div>
        <p className="tagline">
          Economic capacity versus the House revenue-share cap versus booked NIL
          and a modeled conference range — football and men’s basketball, Power 4 plus Notre Dame.
        </p>
        <nav className="nav">
          <NavLink to="/" end>Rank list</NavLink>
          <NavLink to="/compare">Compare</NavLink>
          <NavLink to="/methods">Methods</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home schools={enriched} meta={data.meta} house={houseCap(data.meta)} />} />
        <Route path="/school/:id" element={<School schools={enriched} meta={data.meta} />} />
        <Route path="/compare" element={<Compare schools={enriched} meta={data.meta} />} />
        <Route path="/methods" element={<Methods meta={data.meta} />} />
      </Routes>
      <footer className="site-foot">
        Capacity is annual, not lifetime. Buyouts are overhang.
        Booked NIL stays official. Modeled NIL is a conference heuristic from nil-ncaa.com
        (estimates, not filings). We do not scrape On3, Opendorse, NIL Go, or social apps.
        Every figure carries a source, a date, and a confidence mark.
      </footer>
    </div>
  )
}
