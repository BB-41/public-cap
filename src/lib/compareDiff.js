/**
 * Compare-page difference: school A minus school B.
 * Pending or missing on either side stays pending — a blank is never $0.
 * House cap is the same cited number for participating schools, so $0 is real.
 */

import { money, winsPerM } from './format.js'

export function isCompareNumber(v) {
  return v != null && v !== '' && Number.isFinite(Number(v))
}

/** A − B, or null when either side is pending / missing. */
export function compareDelta(va, vb) {
  if (!isCompareNumber(va) || !isCompareNumber(vb)) return null
  return Number(va) - Number(vb)
}

export function metricUnit(key, unit) {
  if (unit === 'wins' || unit === 'money') return unit
  return key === 'winsPerNil' || key === 'winsPerCap' ? 'wins' : 'money'
}

export function formatUnitAmount(n, unit) {
  if (unit === 'wins') return `${winsPerM(n)} W/$M`
  return money(n)
}

/**
 * Plain-language gap: who is higher, and by how much.
 * Equal values (including House $0) stay a real result, not pending.
 */
export function formatCompareDiff({ va, vb, unit = 'money', nameA, nameB }) {
  const delta = compareDelta(va, vb)
  if (delta == null) return 'pending'
  const amount = formatUnitAmount(Math.abs(delta), unit)
  if (delta === 0) return `same ${amount}`
  const who = delta > 0 ? nameA : nameB
  return `${who} higher ${amount}`
}

export function compareDiffTone(va, vb) {
  const delta = compareDelta(va, vb)
  if (delta == null) return 'pending'
  if (delta === 0) return 'same'
  return delta > 0 ? 'higher-a' : 'higher-b'
}

export function schoolCompareName(school) {
  return school?.shortName || school?.name || 'School'
}
