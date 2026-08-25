/**
 * Desk layers that sit beside the capacity stack:
 * transfer portal, apparel/naming, student-fee subsidy,
 * wins-per-dollar, and buyouts actually paid.
 *
 * Efficiency is computed here. NIL denominator is booked when present,
 * else the modeled midpoint (labeled modeled).
 */

export function nilPot(school) {
  const booked = school?._ratios?.nil
  if (booked != null) {
    return { value: booked, label: 'booked NIL', confidence: 'reported' }
  }
  const mid = school?.nil?.modeled?.mid
  if (mid != null) {
    return { value: mid, label: 'modeled NIL mid', confidence: 'modeled' }
  }
  return { value: null, label: 'pending', confidence: 'pending' }
}

export function computeEfficiency(school, layer) {
  const fb = layer?.record?.football
  const wins = fb && fb.wins != null ? Number(fb.wins) : null
  const pot = nilPot(school)
  const cap = school?._cap?.total
  const perNil = wins != null && pot.value ? wins / pot.value : null
  const perCap = wins != null && cap ? wins / cap : null
  return {
    season: fb?.season || '2025',
    wins,
    losses: fb?.losses ?? null,
    pot,
    capacity: cap ?? null,
    winsPerNil: perNil,
    winsPerNilPerM: perNil != null ? perNil * 1e6 : null,
    winsPerCap: perCap,
    winsPerCapPerM: perCap != null ? perCap * 1e6 : null,
    recordSource: fb || null,
  }
}

export function winsPerMLabel(perM) {
  if (perM == null || Number.isNaN(perM)) return '—'
  return `${perM.toFixed(2)} W/$M`
}

export function layerHasNames(layer) {
  const p = layer?.portal
  if (!p) return false
  return (p.additions?.length || 0) + (p.departures?.length || 0) > 0
}

export function layerHasApparel(layer) {
  const a = layer?.apparel
  if (!a) return false
  return !!(a.brand?.value || a.annualValue?.value != null || (a.naming && a.naming.some((n) => n.sponsor)))
}

export function layerHasSubsidy(layer) {
  const s = layer?.subsidy
  if (!s) return false
  return s.studentFees?.value != null || s.institutionalSupport?.value != null || s.governmentSupport?.value != null
}

export function layerHasBuyoutPaid(layer) {
  return (layer?.buyoutsPaid || []).some((b) => b.amount != null || b.confidence === 'pending')
}
