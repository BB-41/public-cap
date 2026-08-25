import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Home from './pages/Home.jsx'
import School from './pages/School.jsx'
import Compare from './pages/Compare.jsx'
import Methods from './pages/Methods.jsx'
import Tape from './pages/Tape.jsx'
import { computeCapacity, confidenceRollup, ratios } from './lib/compute.js'
import { computeModeledNil } from './lib/nilModel.js'
import { allocateNamedPlayers, namedRosterOnly, scaleRosterToModeled } from './lib/nilRoster.js'
import {
  CURRENT_SEASON,
  applySeason,
  houseFieldForSeason,
  houseValueForSeason,
  parseSeasonParam,
} from './lib/seasons.js'
import { computeEfficiency } from './lib/layers.js'

export default function App() {
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const season = parseSeasonParam(params.get('season'))
  const [data, setData] = useState(null)
  const [rosters, setRosters] = useState(null)
  const [layers, setLayers] = useState(null)
  const [tape, setTape] = useState(null)
  const [rosterYear, setRosterYear] = useState(null)
  const [err, setErr] = useState(null)

  function setSeason(year) {
    const next = new URLSearchParams(params)
    if (year === CURRENT_SEASON) next.delete('season')
    else next.set('season', String(year))
    const search = next.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash }, { replace: true })
  }

  useEffect(() => {
    fetch('/data/schools.json')
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText)
        return r.json()
      })
      .then(setData)
      .catch((e) => setErr(String(e)))
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(`/data/rosters-${season}.json`)
      .then((r) => (r.ok ? r.json() : { schools: {} }))
      .then((book) => {
        if (!cancelled) {
          setRosters(book)
          setRosterYear(season)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRosters({ schools: {} })
          setRosterYear(season)
        }
      })
    return () => {
      cancelled = true
    }
  }, [season])

  useEffect(() => {
    fetch('/data/layers.json')
      .then((r) => (r.ok ? r.json() : { schools: {} }))
      .then(setLayers)
      .catch(() => setLayers({ schools: {} }))
  }, [])

  useEffect(() => {
    fetch('/data/tape.json')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then(setTape)
      .catch(() => setTape({ items: [] }))
  }, [])

  const enriched = useMemo(() => {
    if (!data) return null
    const houseVal = houseValueForSeason(data.meta, season)
    const houseField = houseFieldForSeason(data.meta, season)
    const seasonal = data.schools.map((s) => applySeason(s, season))
    const withCap = seasonal.map((s) => ({ ...s, _cap: computeCapacity(s) }))
    const capTotals = withCap.map((s) => s._cap.total)
    const book = rosterYear === season ? rosters : { schools: {} }
    return withCap.map((s) => {
      const modeled = s._season.modeledNil && houseVal
        ? computeModeledNil(s, s._cap.total, capTotals, houseVal)
        : null
      const nil = { ...s.nil, modeled }
      const r = ratios({ ...s, nil }, data.meta, s._season.houseKey)
      const roster = modeled ? scaleRosterToModeled(modeled) : null
      const named = modeled
        ? allocateNamedPlayers(book?.schools?.[s.id], modeled, roster)
        : namedRosterOnly(book?.schools?.[s.id])
      const rawLayer = layers?.schools?.[s.id] || {}
      const layer = {
        ...rawLayer,
        record: season >= 2025 ? rawLayer.record : { football: null },
        portal: season >= 2026 ? rawLayer.portal : { additions: [], departures: [] },
        apparel: season >= 2025 ? rawLayer.apparel : null,
        subsidy: season >= 2025 ? rawLayer.subsidy : null,
        buyoutsPaid: season >= 2025 ? rawLayer.buyoutsPaid : [],
      }
      const withNil = { ...s, nil, _cap: s._cap, _ratios: r }
      const eff = computeEfficiency(withNil, layer)
      return {
        ...s,
        nil,
        layers: layer,
        _cap: s._cap,
        _ratios: r,
        _roster: roster,
        _named: named,
        _conf: confidenceRollup(s),
        _houseField: houseField,
        _eff: eff,
      }
    })
  }, [data, rosters, rosterYear, season, layers])

  if (err) return <div className="page-wrap"><p className="lede">Failed to load desk data. {err}</p></div>
  if (!data || !enriched) return <div className="page-wrap"><p className="lede">Setting type…</p></div>

  const house = houseValueForSeason(data.meta, season)
  const houseField = houseFieldForSeason(data.meta, season)

  return (
    <div>
      <div className="mast-rule" />
      <header className="mast">
        <div className="brand">
          <Link to="/" className="mark" aria-label="Public Cap">
            <img src="/logo-pc.png" alt="" />
          </Link>
          <div>
            <div className="kicker">A college athletics capacity desk · v1.2 · Aug 24, 2026</div>
            <Link to="/" className="wordmark">Public Cap</Link>
          </div>
        </div>
        <p className="tagline">
          Economic capacity versus the House revenue-share cap versus booked NIL
          and a modeled conference range — football and men’s basketball, Power 4 plus Notre Dame.
          Seasons run 2021–2026 (NIL era).
        </p>
        <nav className="nav">
          <NavLink to={{ pathname: '/', search: params.toString() ? `?${params}` : '' }} end>Rank list</NavLink>
          <NavLink to={{ pathname: '/compare', search: params.toString() ? `?${params}` : '' }}>Compare</NavLink>
          <NavLink to={{ pathname: '/tape', search: params.toString() ? `?${params}` : '' }}>Tape</NavLink>
          <NavLink to={{ pathname: '/methods', search: params.toString() ? `?${params}` : '' }}>Methods</NavLink>
        </nav>
      </header>
      <Routes>
        <Route
          path="/"
          element={
            <Home
              schools={enriched}
              meta={data.meta}
              house={house}
              houseField={houseField}
              season={season}
              setSeason={setSeason}
            />
          }
        />
        <Route
          path="/school/:id"
          element={
            <School
              schools={enriched}
              meta={data.meta}
              season={season}
              setSeason={setSeason}
              tape={tape?.items || []}
            />
          }
        />
        <Route
          path="/compare"
          element={
            <Compare
              schools={enriched}
              meta={data.meta}
              house={house}
              houseField={houseField}
              season={season}
              setSeason={setSeason}
            />
          }
        />
        <Route path="/tape" element={<Tape items={tape?.items || []} season={season} />} />
        <Route path="/methods" element={<Methods meta={data.meta} />} />
      </Routes>
      <footer className="site-foot">
        Capacity is annual, not lifetime. Current-coach buyouts are overhang; paid buyouts are a separate tape.
        Booked NIL stays official. Modeled NIL is a conference heuristic from nil-ncaa.com
        and is shown only for 2025–26 and 2026–27. We do not scrape On3, Opendorse, NIL Go, or social apps.
        Every figure carries a source, a date, and a confidence mark.
      </footer>
    </div>
  )
}
