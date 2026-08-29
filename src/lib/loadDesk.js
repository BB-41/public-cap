export function jsonOr(url, fallback) {
  return fetch(url).then((r) => (r.ok ? r.json() : fallback))
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
  return jsonOr(`/data/rosters-${season}.json`, { schools: {} })
}

export function loadSchoolFull(id) {
  return jsonOr(`/data/school-full/${id}.json`, null)
}

export function routeKind(pathname) {
  if (pathname === '/tape') return 'tape'
  if (pathname === '/tv') return 'tv'
  if (pathname === '/buyout') return 'buyout'
  if (pathname === '/methods') return 'methods'
  if (pathname.startsWith('/school/')) return 'school'
  if (pathname === '/compare') return 'compare'
  return 'home'
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
