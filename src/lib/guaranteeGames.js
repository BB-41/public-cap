/** 2026 football guarantee / buy-game lane. Cite-only. Empty without a FOIA. */

import { moneyExact } from './format.js'

export const DESK_AS_OF = '2026-09-11'
export const DEFAULT_SEASON = 2026
export const BOARD_PATH = '/guarantee-games'
export const SCHOOL_HASH = 'guarantee-games'

export const KIND_LABELS = {
  'buy-game': 'Buy game',
  'home-and-home': 'Home-and-home',
  'two-for-one': 'Two-for-one',
  'no-guarantee': 'No guarantee',
}

export const SORT_KEYS = [
  { id: 'amount', label: 'Guarantee', type: 'num', defaultDir: 'desc' },
  { id: 'payer', label: 'Payer', type: 'text', defaultDir: 'asc' },
  { id: 'payee', label: 'Payee', type: 'text', defaultDir: 'asc' },
  { id: 'date', label: 'Date', type: 'text', defaultDir: 'asc' },
]

export function hasDollar(n) {
  return n != null && Number.isFinite(Number(n))
}

export function resolveCite(book, id) {
  if (!id) return null
  return book?.cites?.[id] || null
}

export function citesFor(book, ids) {
  return (ids || []).map((id) => resolveCite(book, id)).filter(Boolean)
}

export function gameCites(book, game) {
  return citesFor(book, game?.citeIds)
}

export function primaryCite(book, game) {
  return gameCites(book, game)[0] || null
}

export function schoolById(schools, id) {
  if (!id) return null
  return (schools || []).find((s) => s.id === id) || null
}

function titleCaseSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** Desk school when an id is on the 68-school board; else the external label + slug. */
export function party(game, side, schools) {
  const idKey = side === 'payer' ? 'payerSchoolId' : side === 'payee' ? 'payeeSchoolId' : 'homeSchoolId'
  const labelKey = side === 'payer' ? 'payerLabel' : side === 'payee' ? 'payeeLabel' : 'homeLabel'
  const slugKey = side === 'payer' ? 'payerSlug' : side === 'payee' ? 'payeeSlug' : 'homeSlug'
  const id = game?.[idKey] || null
  const school = schoolById(schools, id)
  const label = game?.[labelKey] || school?.shortName || school?.name || (game?.[slugKey] ? titleCaseSlug(game[slugKey]) : null)
  return {
    id,
    slug: game?.[slugKey] || id || null,
    label: label || '—',
    onDesk: Boolean(school),
    school,
  }
}

export function partyLabel(game, side, schools) {
  return party(game, side, schools).label
}

export function kindLabel(kind) {
  return KIND_LABELS[kind] || kind || '—'
}

export function listGames(book, { season = DEFAULT_SEASON } = {}) {
  return (book?.games || []).filter((g) => g && (season == null || g.season === season))
}

export function gamesForSchool(book, schoolId, season = DEFAULT_SEASON) {
  const rows = listGames(book, { season })
  const paid = rows.filter((g) => g.payerSchoolId === schoolId)
  const received = rows.filter((g) => g.payeeSchoolId === schoolId)
  return { paid, received }
}

export function schoolHasGames(book, schoolId, season = DEFAULT_SEASON) {
  const { paid, received } = gamesForSchool(book, schoolId, season)
  return paid.length + received.length > 0
}

export function sumAmounts(games) {
  const rows = (games || []).filter((g) => hasDollar(g.amount))
  if (!rows.length) return null
  return rows.reduce((acc, g) => acc + Number(g.amount), 0)
}

export function compareGames(a, b, key, dir, schools) {
  const mul = dir === 'asc' ? 1 : -1
  let av
  let bv
  if (key === 'amount') {
    av = hasDollar(a.amount) ? Number(a.amount) : -1
    bv = hasDollar(b.amount) ? Number(b.amount) : -1
  } else if (key === 'payer') {
    av = partyLabel(a, 'payer', schools)
    bv = partyLabel(b, 'payer', schools)
  } else if (key === 'payee') {
    av = partyLabel(a, 'payee', schools)
    bv = partyLabel(b, 'payee', schools)
  } else {
    av = a.date || ''
    bv = b.date || ''
  }
  if (typeof av === 'number' && typeof bv === 'number') {
    if (av !== bv) return (av - bv) * mul
  } else {
    const c = String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' })
    if (c) return c * mul
  }
  return String(a.id || '').localeCompare(String(b.id || ''))
}

export function sortGames(games, { key = 'amount', dir = 'desc', schools } = {}) {
  return [...(games || [])].sort((a, b) => compareGames(a, b, key, dir, schools))
}

export function formatGameDate(date) {
  if (!date) return '—'
  const s = String(date)
  if (/^\d{4}$/.test(s)) return s
  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split('-')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[Number(m) - 1] || m} ${y}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[Number(m) - 1] || m} ${Number(d)}, ${y}`
  }
  return s
}

export function schoolHref(partyRow, season) {
  if (!partyRow?.onDesk || !partyRow.id) return null
  const qs = season && season !== DEFAULT_SEASON ? `?season=${season}` : ''
  return `/school/${partyRow.id}${qs}`
}

export function footballGuarantee(game) {
  if (!hasDollar(game?.amount)) return null
  return Number(game.amount)
}

export function bandFee(game) {
  if (!hasDollar(game?.bandAmount)) return null
  return Number(game.bandAmount)
}

/** Side cash only. Never the headline guarantee. */
export function otherFees(game) {
  if (!hasDollar(game?.otherFees)) return null
  return Number(game.otherFees)
}

export function shareCaption({ game, schools, cites } = {}) {
  const payer = partyLabel(game, 'payer', schools)
  const payee = partyLabel(game, 'payee', schools)
  const lines = [`${payer} → ${payee}`]
  if (hasDollar(game?.amount)) {
    lines.push(`Football guarantee ${moneyExact(game.amount)} (${game.confidence || 'reported'})`)
  }
  if (hasDollar(game?.bandAmount)) {
    lines.push(`Band ${moneyExact(game.bandAmount)} (not the football guarantee)`)
  }
  if (game?.kind) lines.push(kindLabel(game.kind))
  const citeLabs = (cites || []).map((c) => c.label).filter(Boolean).slice(0, 2)
  if (citeLabs.length) lines.push(`Cites: ${citeLabs.join('; ')}`)
  lines.push('Public Cap')
  return lines.join('\n')
}

export function tapeRowsForGame(game, book, schools) {
  const cite = primaryCite(book, game)
  const payer = party(game, 'payer', schools)
  const payee = party(game, 'payee', schools)
  const amount = footballGuarantee(game)
  const band = bandFee(game)
  const date = cite?.asOf || game.date
  const rows = []
  if (payer.onDesk) {
    rows.push({
      id: `${payer.id}-guarantee-${game.id}`,
      date,
      school: payer.id,
      schoolName: payer.school?.shortName || payer.school?.name || payer.label,
      kind: 'guarantee-game',
      headline: `${payer.label} pays ${payee.label} a ${hasDollar(amount) ? moneyExact(amount) : 'pending'} football guarantee${band != null ? `; band ${moneyExact(band)} is a separate cell` : ''}.`,
      figure: amount,
      figureNote: band != null ? 'football guarantee; band separate' : undefined,
      confidence: game.confidence || 'reported',
      source: cite ? { label: cite.label, url: cite.url } : undefined,
      field: 'guaranteeGames',
    })
  }
  if (payee.onDesk && payee.id !== payer.id) {
    rows.push({
      id: `${payee.id}-guarantee-received-${game.id}`,
      date,
      school: payee.id,
      schoolName: payee.school?.shortName || payee.school?.name || payee.label,
      kind: 'guarantee-game',
      headline: `${payee.label} receives a ${hasDollar(amount) ? moneyExact(amount) : 'pending'} football guarantee from ${payer.label}.`,
      figure: amount,
      confidence: game.confidence || 'reported',
      source: cite ? { label: cite.label, url: cite.url } : undefined,
      field: 'guaranteeGames',
    })
  }
  return rows
}
