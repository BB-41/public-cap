/**
 * Desk layers that sit beside the capacity stack:
 * transfer portal, apparel/naming, student-fee subsidy,
 * athletics debt, conference exit, wins-per-dollar, and buyouts actually paid.
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

export function computeEfficiency(school, layer, includeAlumni = false) {
  const fb = layer?.record?.football
  const wins = fb && fb.wins != null ? Number(fb.wins) : null
  const pot = nilPot(school)
  const cap = includeAlumni ? school?._cap?.total : school?._cap?.booked
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

/**
 * School-object capacity cells win when present. layers.subsidy keeps
 * feeRate and any layer-only notes. Does not invent a $0.
 */
export function mergeSubsidy(layerSubsidy, capacity) {
  const capFees = capacity?.studentFees
  const capInst = capacity?.institutionalSupport
  const capGov = capacity?.governmentSupport
  const hasCap =
    capFees?.value != null || capInst?.value != null || capGov?.value != null
  if (!hasCap) return layerSubsidy || null
  return {
    ...(layerSubsidy || {}),
    studentFees: capFees ?? layerSubsidy?.studentFees,
    institutionalSupport: capInst ?? layerSubsidy?.institutionalSupport,
    governmentSupport: capGov ?? layerSubsidy?.governmentSupport,
    notes: capacity?.subsidyNotes || layerSubsidy?.notes,
  }
}

/** Estimated IPEDS-ish undergrad headcount already on the school card. */
export function enrollmentHeadcount(school) {
  const n = school?.alumni?.undergradEnrollment?.value
  return n != null && Number(n) > 0 ? Number(n) : null
}

/**
 * Booked student-fee total spread across the enrollment proxy.
 * Not a published fee schedule. Does not replace the booked total.
 */
export function impliedFeePerStudent(studentFees, enrollment) {
  if (studentFees?.value == null || !enrollment) return null
  return studentFees.value / enrollment
}

export function feeRateTermsPerYear(feeRate) {
  const unit = String(feeRate?.unit || '')
  if (/semester/i.test(unit)) return 2
  if (/\byear\b|annual/i.test(unit)) return 1
  return null
}

/**
 * Published athletic-fee rate × terms × enrollment.
 * Only when a feeRate is already on the desk. Does not overwrite studentFees.value.
 */
export function publishedFeeTimesEnrollment(feeRate, enrollment) {
  const terms = feeRateTermsPerYear(feeRate)
  if (feeRate?.value == null || !enrollment || !terms) return null
  return {
    rate: Number(feeRate.value),
    terms,
    enrollment,
    impliedAnnual: Number(feeRate.value) * terms * enrollment,
    unit: feeRate.unit,
  }
}

export function layerHasBuyoutPaid(layer) {
  return (layer?.buyoutsPaid || []).some((b) => b.amount != null || b.confidence === 'pending')
}

/** Outstanding stock wins the headline. Debt service is the fallback. Projects alone stay in the breakdown. */
export function debtHeadline(debt) {
  if (debt?.outstanding?.value != null) return { field: debt.outstanding, kind: 'outstanding' }
  if (debt?.debtService?.value != null) return { field: debt.debtService, kind: 'debtService' }
  return { field: null, kind: null }
}

export function layerHasDebt(layer) {
  const d = layer?.debt
  if (!d) return false
  if (d.outstanding?.value != null || d.debtService?.value != null) return true
  return (d.projects || []).some((p) => p && (p.cost != null || p.remaining != null || p.name))
}
