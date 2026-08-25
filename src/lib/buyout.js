/** Map a cited contract step schedule onto remaining games. */

export const DESK_TODAY = '2026-08-25'
export const DEFAULT_SCHOOL = 'florida-state'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function parseIso(iso) {
  if (!iso) return null
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) }
}

export function addDays(iso, n) {
  const p = parseIso(iso)
  if (!p) return null
  const dt = new Date(Date.UTC(p.y, p.mo - 1, p.d + n))
  const y = dt.getUTCFullYear()
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

export function cmpIso(a, b) {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a < b ? -1 : a > b ? 1 : 0
}

export function formatLongDate(iso) {
  const p = parseIso(iso)
  if (!p) return iso || 'TBD'
  return `${MONTHS[p.mo - 1]} ${p.d}, ${p.y}`
}

export function formatThrough(iso) {
  if (!iso) return 'open-ended'
  return `through ${formatLongDate(iso)}`
}

/** Step in force on a calendar date (inclusive through). */
export function stepInForce(steps, isoDate) {
  if (!steps?.length || !isoDate) return null
  const dated = steps
    .filter((s) => s.through)
    .slice()
    .sort((a, b) => cmpIso(a.through, b.through))
  for (const s of dated) {
    if (isoDate <= s.through) return s
  }
  return dated[dated.length - 1] || null
}

export function afterKickoffDate(game) {
  if (!game?.date) return null
  return addDays(game.date, 1)
}

export function upcomingGames(games, today = DESK_TODAY) {
  return (games || []).filter((g) => !g.date || g.date >= today)
}

export function overhangAsStep(coach) {
  const oh = coach?.overhang
  if (!oh || oh.amount == null) return null
  return {
    through: null,
    amount: oh.amount,
    rule: oh.rule,
    confidence: oh.confidence || 'reported',
    source: oh.source,
    asOf: oh.asOf,
    overhang: true,
  }
}

export function currentStep(coach, today = DESK_TODAY) {
  if (!coach) return null
  if (coach.tape === 'steps') return stepInForce(coach.steps, today)
  if (coach.tape === 'overhang') return overhangAsStep(coach)
  return null
}

export function mapGames(games, coach, today = DESK_TODAY) {
  const upcoming = upcomingGames(games, today)
  return upcoming.map((g) => {
    const after = afterKickoffDate(g)
    let step = null
    let pendingTape = false
    if (coach?.tape === 'steps' && after) {
      step = stepInForce(coach.steps, after)
    } else if (coach?.tape === 'overhang') {
      step = overhangAsStep(coach)
      pendingTape = true
    } else {
      pendingTape = true
    }
    return {
      game: g,
      afterDate: after,
      step,
      amount: step?.amount ?? null,
      confidence: step?.confidence || (coach?.tape === 'pending' ? 'pending' : null),
      pendingTape,
    }
  })
}

export function gameLabel(game) {
  if (!game) return '—'
  const opp = game.opponent || 'TBD'
  const loc = game.homeAway === 'away' ? 'at ' : game.homeAway === 'neutral' ? 'vs. ' : 'vs. '
  return `${loc}${opp}`
}

export function afterLabel(row) {
  const opp = row.game?.opponent || 'TBD'
  const date = row.game?.dateLabel || (row.game?.date ? formatLongDate(row.game.date) : 'date TBD')
  return `after ${opp}, ${date}`
}

export function classifyTape(coach) {
  return coach?.tape || 'pending'
}

export function coachOptions(book, schools) {
  const list = []
  const schoolBy = new Map((schools || []).map((s) => [s.id, s]))
  for (const [id, coach] of Object.entries(book?.coaches || {})) {
    const school = schoolBy.get(id)
    list.push({
      id,
      schoolName: school?.name || id,
      shortName: school?.shortName || school?.name || id,
      conference: school?.conference || '',
      coach: coach.name,
      tape: coach.tape,
      sport: coach.sport || 'fb',
    })
  }
  list.sort((a, b) => a.schoolName.localeCompare(b.schoolName))
  return list
}

export function sharePath(schoolId, sport = 'fb') {
  const q = new URLSearchParams()
  q.set('school', schoolId || DEFAULT_SCHOOL)
  if (sport && sport !== 'fb') q.set('sport', sport)
  return `/buyout?${q}`
}
