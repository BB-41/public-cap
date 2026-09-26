export function jsonOr(url, fallback) {
  return fetch(url).then((r) => (r.ok ? r.json() : fallback))
}

/** Roster files that are missing come back as the SPA homepage (200 HTML). */
export function parseRosterBook(text) {
  try {
    const data = JSON.parse(text)
    if (!data || typeof data !== 'object' || !data.schools) return { schools: {}, missing: true }
    return data
  } catch {
    return { schools: {}, missing: true }
  }
}

export function loadMeta() {
  return jsonOr('/data/meta.json', null)
}

export function loadDesk() {
  return jsonOr('/data/desk.json', null)
}

export function loadLayersLite() {
  return jsonOr('/data/layers-lite.json', { schools: {} })
}

export function loadLayers() {
  return jsonOr('/data/layers.json', { schools: {} })
}

export function loadTape() {
  return jsonOr('/data/tape.json', { items: [] })
}

export function loadRosters(season) {
  return fetch(`/data/rosters-${season}.json`).then(async (r) => {
    if (!r.ok) return { schools: {}, missing: true }
    return parseRosterBook(await r.text())
  })
}

export function loadSchoolFull(id) {
  return jsonOr(`/data/school-full/${id}.json`, null)
}

export function routeKind(pathname) {
  if (pathname === '/tape') return 'tape'
  if (pathname === '/tv') return 'tv'
  if (pathname === '/buyout') return 'buyout'
  if (pathname === '/coach-fa' || pathname.startsWith('/coach-fa/')) return 'coachFa'
  if (pathname === '/guarantee-games') return 'guaranteeGames'
  if (pathname === '/checkbook-bowl') return 'checkbookBowl'
  if (pathname === '/methods') return 'methods'
  if (pathname.startsWith('/school/')) return 'school'
  if (pathname === '/compare') return 'compare'
  if (pathname === '/reported-nil') return 'reportedNil'
  if (pathname === '/nil-101') return 'nil101'
  if (pathname === '/' || pathname === '') return 'home'
  return 'missing'
}

export function schoolIdFromPath(pathname) {
  if (!pathname.startsWith('/school/')) return null
  return pathname.split('/')[2] || null
}

/** Overlay one full school (staff / staffByYear) onto the slim desk book. */
export function mergeFullSchool(desk, full) {
  if (!desk || !full?.id) return desk
  return {
    ...desk,
    schools: desk.schools.map((s) => (s.id === full.id ? full : s)),
  }
}
