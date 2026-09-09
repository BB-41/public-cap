/**
 * Compare-page difference: school A minus school B.
 * Pending or missing on either side stays pending — a blank is never $0.
 * House cap is the same cited number for participating schools, so $0 is real.
 * Reported NIL reuses roster-stack ranking but never invents a midpoint.
 */

import { money, winsPerM } from './format.js'
import {
  compareReportedNilRank,
  publishedReportedNilHigh,
  reportedNilVisibleLabel,
} from './rosterStack.js'

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

/**
 * Reported NIL gap. When both sides publish a numeric high (survey range
 * or modeled band), compare those highs and say so. A survey tier with
 * no numeric high keeps the published words — ranking may say who sits
 * higher, but the dollar gap is not a point estimate.
 */
export function formatReportedNilDiff({ barA, barB, nameA, nameB }) {
  if (!barA || !barB) return 'pending'
  const highA = publishedReportedNilHigh(barA)
  const highB = publishedReportedNilHigh(barB)
  if (highA != null && highB != null) {
    const delta = highA - highB
    const amount = money(Math.abs(delta))
    if (delta === 0) return `same ${amount} on the published top`
    const who = delta > 0 ? nameA : nameB
    return `${who} higher on the published top ${amount}`
  }
  const labelA = reportedNilVisibleLabel(barA)
  const labelB = reportedNilVisibleLabel(barB)
  const words = [labelA, labelB].filter(Boolean).join(' vs ')
  const rank = compareReportedNilRank(barA, barB)
  if (rank === 0) {
    return words ? `${words} — gap is not a point estimate` : 'gap is not a point estimate'
  }
  const who = rank < 0 ? nameA : nameB
  return words
    ? `${who} higher — ${words} — gap is not a point estimate`
    : `${who} higher — gap is not a point estimate`
}

export function reportedNilDiffTone(barA, barB) {
  if (!barA || !barB) return 'pending'
  const highA = publishedReportedNilHigh(barA)
  const highB = publishedReportedNilHigh(barB)
  if (highA != null && highB != null) return compareDiffTone(highA, highB)
  const rank = compareReportedNilRank(barA, barB)
  if (rank === 0) return 'same'
  return rank < 0 ? 'higher-a' : 'higher-b'
}
