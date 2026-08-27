/** Desk tape helpers. Filing log, not a news feed. */

export const KIND_LABELS = {
  'booked-nil': 'Booked NIL',
  'collective-990': 'Collective 990',
  contract: 'Contract',
  'paid-buyout': 'Paid buyout',
  apparel: 'Apparel',
  naming: 'Naming',
  subsidy: 'Subsidy',
  'student-fee': 'Student fee',
  990: '990',
  foia: 'FOIA',
  'house-cap': 'House cap',
}

export const EMPTY_TAPE = 'No public filing on the desk yet.'

/** Pad YYYY or YYYY-MM so year-only dates do not jump ahead of dated filings. */
export function dateSortKey(date) {
  if (!date) return '0000-01-01'
  const s = String(date)
  if (/^\d{4}$/.test(s)) return `${s}-01-01`
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`
  return s
}

export function sortTapeNewest(items) {
  return [...(items || [])].sort((a, b) => {
    const d = dateSortKey(b.date).localeCompare(dateSortKey(a.date))
    if (d) return d
    return String(a.id || '').localeCompare(String(b.id || ''))
  })
}

export function tapeForSchool(items, schoolId) {
  return sortTapeNewest((items || []).filter((it) => it.school === schoolId))
}

export function formatTapeDate(date) {
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
