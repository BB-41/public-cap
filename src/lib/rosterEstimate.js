/**
 * Industry football roster estimate — a labeled modeled / survey lane.
 *
 * Not booked NIL. Not House spent. Never enters capacity, leftover,
 * or the capacity waterfall. Leftover still only exists when a booked
 * House spent cell is on the desk.
 */

export const ROSTER_ESTIMATE_LABEL = 'Industry football roster estimate'
export const ROSTER_ESTIMATE_HASH = 'roster-estimate'
export const ROSTER_ESTIMATE_SEASON = 2026

export function industryRosterEstimate(school) {
  const field = school?.nil?.industryRosterEstimate
  if (!field || field.confidence === 'pending') return null
  if (field.kind === 'range' && field.low != null && field.high != null) return field
  if (field.kind === 'tier' && field.tier) return field
  return null
}

export function rosterEstimateDisplay(field) {
  if (!field) return null
  if (field.display) return field.display
  if (field.kind === 'range' && field.low != null && field.high != null) {
    return `$${(field.low / 1e6).toFixed(0)}–${(field.high / 1e6).toFixed(0)}M`
  }
  if (field.kind === 'tier' && field.tier) return `${field.tier}, survey`
  return null
}

export function rosterEstimateCites(field) {
  const rows = field?.cites
  if (!Array.isArray(rows)) return []
  return rows.filter((c) => c && (c.url || c.source))
}

/** True when leftover/House spent must stay pending even though a survey exists. */
export function leftoverStillPending(spent) {
  return spent == null
}
