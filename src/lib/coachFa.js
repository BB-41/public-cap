/** Coach free-agent / buyout-offset lane. Booked A-side; modeled B salary. */

export const DESK_AS_OF = '2026-09-04'
export const DEFAULT_COACH = 'jimbo-fisher'
export const JOB_TYPES = [
  { id: 'head-coach', label: 'Head coach' },
  { id: 'coordinator', label: 'Coordinator' },
  { id: 'analyst', label: 'Analyst / other' },
]

export const POWER4 = new Set(['ACC', 'Big Ten', 'Big 12', 'SEC'])

/** booked ∧ booked → booked; any modeled → modeled; missing required → pending. */
export function inheritStatus(...marks) {
  const list = marks.filter((m) => m != null)
  if (!list.length) return 'pending'
  if (list.some((m) => m === 'pending' || m === 'missing')) return 'pending'
  if (list.some((m) => m === 'modeled' || m === 'estimated')) return 'modeled'
  if (list.every((m) => m === 'booked' || m === 'reported')) return 'booked'
  return 'modeled'
}

export function hasDollar(n) {
  return n != null && Number.isFinite(Number(n))
}

export function parseMoneyInput(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  const m = s.match(/^\$?\s*([\d,.]+)\s*([MmKk])?$/)
  if (!m) {
    const n = Number(s.replace(/[$,\s]/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  const n = Number(m[1].replace(/,/g, ''))
  if (!Number.isFinite(n) || n < 0) return null
  if (m[2] && m[2].toLowerCase() === 'm') return n * 1e6
  if (m[2] && m[2].toLowerCase() === 'k') return n * 1e3
  return n
}

export function parseYearsInput(raw) {
  if (raw == null || String(raw).trim() === '') return null
  const n = Number(String(raw).trim())
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/**
 * Offset credit against School A residual.
 * none / offsetApplies false → 0 (booked when the rule is cited).
 * dollar-for-dollar → overlap of B salary with the residual years (modeled).
 */
export function offsetCredit({ offset, bAnnual, termYears } = {}) {
  const formula = offset?.offsetFormula || 'none'
  const applies = offset?.offsetApplies !== false && formula !== 'none'
  if (!applies || formula === 'none') {
    const cited = Boolean(offset && (offset.confidence === 'booked' || offset.confidence === 'reported'))
    return {
      value: cited || offset ? 0 : null,
      confidence: offset ? (offset.confidence || 'booked') : 'pending',
      formula: 'none',
    }
  }
  if (!hasDollar(bAnnual)) {
    return { value: null, confidence: 'pending', formula }
  }
  const years = hasDollar(termYears) ? Number(termYears) : 1
  const credit = Number(bAnnual) * years
  return {
    value: credit,
    confidence: 'modeled',
    formula,
  }
}

export function netCostToA({ grossRemaining, offsetCredit: credit, aConfidence } = {}) {
  if (!hasDollar(grossRemaining) || !credit || !hasDollar(credit.value)) {
    return { value: null, confidence: 'pending' }
  }
  return {
    value: Number(grossRemaining) - Number(credit.value),
    confidence: inheritStatus(aConfidence || 'booked', credit.confidence),
  }
}

export function totalCompCostToB({ annual, termYears } = {}) {
  if (!hasDollar(annual)) return { value: null, confidence: 'pending' }
  if (hasDollar(termYears)) {
    return {
      value: Number(annual) * Number(termYears),
      confidence: 'modeled',
      basis: 'term-total',
    }
  }
  return {
    value: Number(annual),
    confidence: 'modeled',
    basis: 'annual',
  }
}

export function allInToFan({ netA, costB, enabled } = {}) {
  if (!enabled) return { value: null, confidence: 'pending', shown: false }
  if (!netA || !hasDollar(netA.value) || !costB || !hasDollar(costB.value)) {
    return { value: null, confidence: 'pending', shown: true }
  }
  return {
    value: Number(netA.value) + Number(costB.value),
    confidence: inheritStatus(netA.confidence, costB.confidence),
    shown: true,
  }
}

export function resolveScenario(coach, input = {}) {
  const buyout = coach?.buyout || {}
  const offset = coach?.offset || null
  const seed = coach?.defaultScenario || {}
  const bAnnual = hasDollar(input.annualSalary) ? Number(input.annualSalary) : null
  const termYears = hasDollar(input.termYears) ? Number(input.termYears) : null
  const schoolBId = input.schoolBId || seed.schoolBId || null
  const jobType = input.jobType || seed.jobType || 'head-coach'
  const allIn = Boolean(input.allIn)

  const credit = offsetCredit({ offset, bAnnual, termYears })
  const netA = netCostToA({
    grossRemaining: buyout.grossRemaining,
    offsetCredit: credit,
    aConfidence: buyout.confidence || 'booked',
  })
  const costB = totalCompCostToB({ annual: bAnnual, termYears })
  const allInFig = allInToFan({ netA, costB, enabled: allIn })

  return {
    schoolBId,
    jobType,
    annualSalary: bAnnual,
    termYears,
    allIn,
    offsetCredit: credit,
    netCostToA: netA,
    totalCompCostToB: costB,
    allInToFan: allInFig,
  }
}

export function listCoaches(book) {
  const rows = Object.values(book?.coaches || {})
  rows.sort((a, b) => {
    if (a.id === DEFAULT_COACH) return -1
    if (b.id === DEFAULT_COACH) return 1
    return String(a.name || '').localeCompare(String(b.name || ''))
  })
  return rows
}

export function getCoach(book, id) {
  if (!book?.coaches) return null
  return book.coaches[id] || null
}

export function resolveCite(book, id) {
  if (!id) return null
  return book?.cites?.[id] || null
}

export function citesFor(book, ids) {
  return (ids || []).map((id) => resolveCite(book, id)).filter(Boolean)
}

export function coachCites(book, coach) {
  const ids = new Set(coach?.citeIds || [])
  for (const id of coach?.buyout?.citeIds || []) ids.add(id)
  for (const id of coach?.offset?.citeIds || []) ids.add(id)
  for (const id of coach?.contract?.citeIds || []) ids.add(id)
  for (const id of coach?.compBand?.citeIds || []) ids.add(id)
  return citesFor(book, [...ids])
}

export function power4Schools(schools) {
  return (schools || [])
    .filter((s) => POWER4.has(s.conference) || s.id === 'notre-dame')
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
}

export function schoolById(schools, id) {
  return (schools || []).find((s) => s.id === id) || null
}

export function statusLabel(status) {
  if (status === 'free-agent') return 'Free agent'
  if (status === 'hired') return 'Hired'
  return status || 'pending'
}

export function jobTypeLabel(id) {
  return JOB_TYPES.find((j) => j.id === id)?.label || id || '—'
}

export function sharePath(coachId, extra = {}) {
  const id = coachId || DEFAULT_COACH
  const p = new URLSearchParams()
  if (extra.schoolBId) p.set('b', extra.schoolBId)
  if (hasDollar(extra.annualSalary)) p.set('pay', String(Math.round(extra.annualSalary)))
  if (hasDollar(extra.termYears)) p.set('years', String(extra.termYears))
  if (extra.jobType && extra.jobType !== 'head-coach') p.set('job', extra.jobType)
  if (extra.allIn) p.set('allin', '1')
  const qs = p.toString()
  return qs ? `/coach-fa/${id}?${qs}` : `/coach-fa/${id}`
}

export function parseScenarioParams(params, coach) {
  const seed = coach?.defaultScenario || {}
  const pay = parseMoneyInput(params?.get?.('pay'))
  const years = parseYearsInput(params?.get?.('years'))
  return {
    schoolBId: params?.get?.('b') || seed.schoolBId || null,
    annualSalary: pay,
    termYears: years,
    jobType: params?.get?.('job') || seed.jobType || 'head-coach',
    allIn: params?.get?.('allin') === '1',
  }
}

export function bandRange(band) {
  const pays = (band?.peers || []).map((p) => p.totalPay).filter(hasDollar)
  if (!pays.length) return null
  return { low: Math.min(...pays), high: Math.max(...pays) }
}

export function vsBand(annual, band) {
  const range = bandRange(band)
  if (!hasDollar(annual) || !range) return null
  if (annual < range.low) return 'below'
  if (annual > range.high) return 'above'
  return 'inside'
}
