import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Home from './pages/Home.jsx'
import { parseAlumniParam } from './lib/compute.js'
import { enrichSchools } from './lib/enrich.js'
import {
  loadDesk,
  loadLayers,
  loadLayersLite,
  loadMeta,
  loadRosters,
  loadSchoolFull,
  loadTape,
  mergeFullSchool,
  routeKind,
  schoolIdFromPath,
} from './lib/loadDesk.js'
import { CURRENT_SEASON, houseFieldForSeason, houseValueForSeason, parseSeasonParam } from './lib/seasons.js'
import {
  DEFAULT_TITLE,
  PAGE_TITLES,
  applyDocumentMeta,
  compareTitle,
  schoolTitle,
} from './lib/share.js'
import Shell, { SettingType } from './components/Shell.jsx'

const Compare = lazy(() => import('./pages/Compare.jsx'))
const School = lazy(() => import('./pages/School.jsx'))
const Methods = lazy(() => import('./pages/Methods.jsx'))
const Tape = lazy(() => import('./pages/Tape.jsx'))
const Tv = lazy(() => import('./pages/Tv.jsx'))
const Buyout = lazy(() => import('./pages/Buyout.jsx'))
const CoachFa = lazy(() => import('./pages/CoachFa.jsx'))

export default function App() {
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const season = parseSeasonParam(params.get('season'))
  const includeAlumni = parseAlumniParam(params.get('alumni'))
  const kind = routeKind(location.pathname)
  const schoolId = schoolIdFromPath(location.pathname)

  const [desk, setDesk] = useState(null)
  const [fullSchool, setFullSchool] = useState(null)
  const [fullStatus, setFullStatus] = useState('idle')
  const [rosters, setRosters] = useState(null)
  const [layers, setLayers] = useState(null)
  const [tape, setTape] = useState(null)
  const [metaOnly, setMetaOnly] = useState(null)
  const [rosterYear, setRosterYear] = useState(null)
  const [err, setErr] = useState(null)

  function setSeason(year) {
    const next = new URLSearchParams(params)
    if (year === CURRENT_SEASON) next.delete('season')
    else next.set('season', String(year))
    const search = next.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash }, { replace: true })
  }

  function setIncludeAlumni(on) {
    const next = new URLSearchParams(params)
    if (on) next.set('alumni', '1')
    else next.delete('alumni')
    const search = next.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash }, { replace: true })
  }

  const needsDesk = kind === 'home' || kind === 'compare' || kind === 'school'
  const needsLayersFull = kind === 'school'
  const needsLayersLite = kind === 'home' || kind === 'compare'
  const needsTape = kind === 'tape' || kind === 'school'
  const needsRosters = kind === 'school'
  const needsMeta = kind === 'methods'

  useEffect(() => {
    if (!needsDesk) return
    let cancelled = false
    loadDesk()
      .then((book) => {
        if (!book?.schools) throw new Error('desk book missing')
        if (!cancelled) setDesk(book)
      })
      .catch((e) => {
        if (!cancelled) setErr(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [needsDesk])

  useEffect(() => {
    if (!needsLayersLite) return
    let cancelled = false
    loadLayersLite()
      .then((book) => {
        if (!cancelled) setLayers(book)
      })
      .catch(() => {
        if (!cancelled) setLayers({ schools: {} })
      })
    return () => {
      cancelled = true
    }
  }, [needsLayersLite])

  useEffect(() => {
    if (!needsLayersFull) return
    let cancelled = false
    loadLayers()
      .then((book) => {
        if (!cancelled) setLayers(book)
      })
      .catch(() => {
        if (!cancelled) setLayers({ schools: {} })
      })
    return () => {
      cancelled = true
    }
  }, [needsLayersFull])

  useEffect(() => {
    if (!needsTape) return
    let cancelled = false
    loadTape()
      .then((book) => {
        if (!cancelled) setTape(book)
      })
      .catch(() => {
        if (!cancelled) setTape({ items: [] })
      })
    return () => {
      cancelled = true
    }
  }, [needsTape])

  useEffect(() => {
    if (!needsRosters) return
    let cancelled = false
    loadRosters(season)
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
  }, [needsRosters, season])

  useEffect(() => {
    if (!needsMeta) return
    let cancelled = false
    loadMeta()
      .then((m) => {
        if (!cancelled) setMetaOnly(m)
      })
      .catch((e) => {
        if (!cancelled) setErr(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [needsMeta])

  useEffect(() => {
    if (!schoolId) {
      setFullSchool(null)
      setFullStatus('idle')
      return
    }
    let cancelled = false
    setFullStatus('loading')
    loadSchoolFull(schoolId)
      .then((full) => {
        if (!cancelled) {
          setFullSchool(full)
          setFullStatus('done')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFullSchool(null)
          setFullStatus('done')
        }
      })
    return () => {
      cancelled = true
    }
  }, [schoolId])

  const data = useMemo(() => mergeFullSchool(desk, fullSchool), [desk, fullSchool])

  const enriched = useMemo(() => {
    if (!data) return null
    return enrichSchools({
      data,
      season,
      includeAlumni,
      layers,
      rosters,
      rosterYear,
    })
  }, [data, rosters, rosterYear, season, layers, includeAlumni])

  const meta = data?.meta || metaOnly
  const house = meta ? houseValueForSeason(meta, season) : null
  const houseField = meta ? houseFieldForSeason(meta, season) : null

  useEffect(() => {
    const path = location.pathname
    if (kind === 'school') {
      const school = enriched?.find((s) => s.id === schoolId)
      applyDocumentMeta({
        title: school ? schoolTitle(school.name, season) : DEFAULT_TITLE,
        path: schoolId ? `/school/${schoolId}` : path,
      })
      return
    }
    if (kind === 'compare') {
      const A = enriched?.find((s) => s.id === params.get('a'))
      const B = enriched?.find((s) => s.id === params.get('b'))
      applyDocumentMeta({
        title: A && B ? compareTitle(A.name, B.name, season) : PAGE_TITLES.compare,
        path: '/compare',
      })
      return
    }
    if (kind === 'coachFa') {
      const coachId = path.split('/')[2]
      const names = {
        'jimbo-fisher': 'Jimbo Fisher',
        'brian-kelly': 'Brian Kelly',
        'jonathan-smith': 'Jonathan Smith',
        'hugh-freeze': 'Hugh Freeze',
        'mike-gundy': 'Mike Gundy',
        'justin-wilcox': 'Justin Wilcox',
        'deshaun-foster': 'DeShaun Foster',
      }
      applyDocumentMeta({
        title: names[coachId]
          ? `${names[coachId]} — Offsets / free agents — Public Cap`
          : PAGE_TITLES.coachFa,
        path,
      })
      return
    }
    const title = PAGE_TITLES[kind] || DEFAULT_TITLE
    const routePath = kind === 'home' ? '/' : path
    applyDocumentMeta({ title, path: routePath, jsonLd: kind === 'home' })
  }, [kind, schoolId, season, enriched, params, location.pathname])

  const ready =
    (!needsDesk || (data && enriched)) &&
    (kind !== 'school' || fullStatus === 'done') &&
    (kind !== 'tape' || tape != null) &&
    (kind !== 'methods' || metaOnly != null)

  const homeReady = !needsDesk || (data && enriched)

  return (
    <Shell params={params}>
      {err ? (
        <div className="page-wrap"><p className="lede">Failed to load desk data. {err}</p></div>
      ) : location.pathname === '/' ? (
        <Home
          schools={homeReady ? enriched : null}
          meta={meta}
          house={house}
          houseField={houseField}
          season={season}
          setSeason={setSeason}
          includeAlumni={includeAlumni}
          setIncludeAlumni={setIncludeAlumni}
        />
      ) : !ready ? (
        <SettingType />
      ) : (
        <Suspense fallback={<SettingType />}>
          <Routes>
            <Route
              path="/school/:id"
              element={
                <School
                  schools={enriched}
                  meta={meta}
                  season={season}
                  setSeason={setSeason}
                  includeAlumni={includeAlumni}
                  setIncludeAlumni={setIncludeAlumni}
                  tape={tape?.items || []}
                  rawSchools={data?.schools}
                />
              }
            />
            <Route
              path="/compare"
              element={
                <Compare
                  schools={enriched}
                  meta={meta}
                  house={house}
                  houseField={houseField}
                  season={season}
                  setSeason={setSeason}
                  includeAlumni={includeAlumni}
                  setIncludeAlumni={setIncludeAlumni}
                />
              }
            />
            <Route path="/tape" element={<Tape items={tape?.items || []} season={season} />} />
            <Route path="/tv" element={<Tv />} />
            <Route path="/buyout" element={<Buyout />} />
            <Route path="/coach-fa" element={<CoachFa />} />
            <Route path="/coach-fa/:coachId" element={<CoachFa />} />
            <Route path="/methods" element={<Methods meta={metaOnly} />} />
          </Routes>
        </Suspense>
      )}
    </Shell>
  )
}
