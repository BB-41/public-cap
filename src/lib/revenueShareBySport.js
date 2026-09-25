/** By-sport revenue-share lane. Display only. Never House spent, capacity, or rank math. */

import { money, moneyExact } from './format.js'
import { formatTapeDate } from './tape.js'

export function formatPercentShare(row) {
  if (!row || row.percent == null || Number.isNaN(Number(row.percent))) return null
  const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n))
  const core = row.percentHigh != null
    ? `${fmt(row.percent)}–${fmt(row.percentHigh)}%`
    : `${fmt(row.percent)}%`
  return row.percentApproximate ? `~${core}` : core
}

export function formatAmountShare(row) {
  if (!row || row.amount == null || Number.isNaN(Number(row.amount))) return null
  return row.amountApproximate ? `about ${money(row.amount)}` : moneyExact(row.amount)
}

/** Null when a row has neither a percent nor an amount. Callers skip those rows. */
export function formatShareLine(row) {
  const bits = [formatPercentShare(row), formatAmountShare(row)].filter(Boolean)
  return bits.length ? bits.join(' · ') : null
}

export function formatSourceDate(date) {
  if (!date) return ''
  return formatTapeDate(date)
}

/**
 * Statements for one school, or null when the desk has nothing to show.
 * Rows without a percent or an amount are dropped so the block never prints a zero.
 */
export function statementsFor(book, schoolId) {
  const list = book?.schools?.[schoolId]
  if (!Array.isArray(list)) return null
  const usable = list
    .map((statement) => ({
      ...statement,
      rows: (statement.rows || []).filter((row) => formatShareLine(row)),
    }))
    .filter((statement) => statement.rows.length > 0 && statement.fiscalYear && statement.status)
  return usable.length ? usable : null
}
