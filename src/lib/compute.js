/**
 * Public Cap compute layer
 *
 * Capacity is an ANNUAL FLOW, not a wealth stock:
 *   media/conference + sponsorships/licensing + tickets/premium
 *   + booked athletic contributions
 *   + modeled extra alumni giving (booked contributions subtracted)
 *
 * Student fees and institutional/government support live on capacity as
 * cited side cells. They are not added to the booked stack.
 *
 * Alumni net worth is NEVER shown as a silent point total.
 * Official line = College Scorecard 10-year median earnings.
 * Second line = modeled wealth RANGE (low/high).
 *
 * Cohort sketch (documented, labeled modeled):
 *   living_alumni_proxy = undergrad_enrollment × 35 × 0.72 × 0.88
 *   wealth_low  = proxy × official_earnings × 5.0   (SCF-like median W/I)
 *   wealth_high = proxy × official_earnings × 12.0  (mean + top-1% bump)
 *   giving_low  = 0.5% of wealth_low
 *   giving_high = 2.0% of wealth_high
 *   extra       = max(0, giving − booked_contributions)
 */

export const MODEL = {
  careerYears: 35,
  completionRate: 0.72,
  survival: 0.88,
  wtiLow: 5,
  wtiHigh: 12,
  giveLow: 0.005,
  giveHigh: 0.02,
  athleticsShare: 0.04,
}

export function val(field) {
  if (!field || field.value == null) return 0
  return Number(field.value) || 0
}

export function hasVal(field) {
  return !!(field && field.value != null)
}

export function computeAlumni(school) {
  const enroll = val(school.alumni.undergradEnrollment)
  const earn = val(school.alumni.officialEarnings)
  const proxy =
    enroll * MODEL.careerYears * MODEL.completionRate * MODEL.survival
  const wealthLow = proxy * earn * MODEL.wtiLow
  const wealthHigh = proxy * earn * MODEL.wtiHigh
  const giveLow = wealthLow * MODEL.giveLow
  const giveHigh = wealthHigh * MODEL.giveHigh
  const booked = hasVal(school.capacity.contributions)
    ? val(school.capacity.contributions)
    : 0
  const athLow = giveLow * MODEL.athleticsShare
  const athHigh = giveHigh * MODEL.athleticsShare
  const extraLow = Math.max(0, athLow - booked)
  const extraHigh = Math.max(0, athHigh - booked)
  return {
    proxy,
    wealthLow,
    wealthHigh,
    giveLow,
    giveHigh,
    athLow,
    athHigh,
    bookedContributions: booked,
    extraLow,
    extraHigh,
    extraMid: (extraLow + extraHigh) / 2,
    subtractedBooked: booked > 0,
  }
}

export function computeCapacity(school) {
  const c = school.capacity
  const media = val(c.mediaConference)
  const spon = val(c.sponsorships)
  const tick = val(c.tickets)
  const contrib = val(c.contributions)
  const alumni = computeAlumni(school)
  const booked = media + spon + tick + contrib
  const extra = alumni.extraMid
  return {
    media,
    sponsorships: spon,
    tickets: tick,
    contributions: contrib,
    booked,
    extraAlumni: extra,
    extraLow: alumni.extraLow,
    extraHigh: alumni.extraHigh,
    total: booked + extra,
    totalLow: booked + alumni.extraLow,
    totalHigh: booked + alumni.extraHigh,
    alumni,
    components: [
      { key: 'media', label: 'Media / conference', value: media, field: c.mediaConference },
      { key: 'spon', label: 'Sponsorships / licensing', value: spon, field: c.sponsorships },
      { key: 'tix', label: 'Tickets / premium gate', value: tick, field: c.tickets },
      { key: 'give', label: 'Athletic contributions booked', value: contrib, field: c.contributions },
      {
        key: 'extra',
        label: alumni.subtractedBooked
          ? 'Modeled extra alumni giving (net of booked)'
          : 'Modeled alumni giving flow',
        value: extra,
        field: { confidence: 'modeled', notes: 'Midpoint of 0.5–2% wealth flow minus booked contributions.' },
      },
    ],
  }
}

export function houseCap(meta, year = '2025-26') {
  if (year === '2026-27' || year === 2026) return val(meta.houseCap.y2026_27)
  if (year === '2025-26' || year === 2025) return val(meta.houseCap.y2025_26)
  if (year === null || year === 'pre' || (typeof year === 'number' && year < 2025)) return null
  return val(meta.houseCap.y2025_26)
}

export function nilBooked(school) {
  return hasVal(school.nil.booked) ? val(school.nil.booked) : null
}

/** House Year 1 leftover (cap − booked House spent). Only exists on five booked schools. */
export function houseRemaining(school) {
  return hasVal(school?.nil?.houseRemaining) ? val(school.nil.houseRemaining) : null
}

export const YEAR1_LEAD_LABEL = '2025–26 filing / House Year 1'

/**
 * Homepage lead-column booked NIL.
 * Uses the season overlay’s booked cell when one exists.
 * On 2026, when 2026–27 booked has not been extracted, falls back to the
 * House Year 1 / 2025–26 filing via year1Lead — labeled, not rebooked as 2026–27.
 */
export function leadBookedNil(school) {
  if (hasVal(school?.nil?.booked)) {
    return { value: val(school.nil.booked), field: school.nil.booked, carry: false, label: null }
  }
  const carry = school?.nil?.year1Lead
  if (hasVal(carry?.booked)) {
    return {
      value: val(carry.booked),
      field: carry.booked,
      carry: true,
      label: carry.label || YEAR1_LEAD_LABEL,
    }
  }
  return { value: null, field: null, carry: false, label: null }
}

/**
 * Homepage leftover / House remaining.
 * Only when a booked House spent cell exists (overlay or Year 1 carry).
 * Never invent leftover from a cap plan or “will spend $20.5M.”
 */
export function leadHouseRemaining(school) {
  const booked = leadBookedNil(school)
  if (booked.field == null) {
    return { value: null, field: null, carry: false, label: null }
  }
  if (hasVal(school?.nil?.houseRemaining)) {
    return {
      value: val(school.nil.houseRemaining),
      field: school.nil.houseRemaining,
      carry: booked.carry,
      label: booked.carry ? booked.label : null,
    }
  }
  const carry = school?.nil?.year1Lead
  if (hasVal(carry?.houseRemaining)) {
    return {
      value: val(carry.houseRemaining),
      field: carry.houseRemaining,
      carry: true,
      label: carry.label || YEAR1_LEAD_LABEL,
    }
  }
  return { value: null, field: null, carry: false, label: null }
}

/** Third-party collective 990 cells. Never a booked House / Item 44 input. */
export function collective990Cells(school) {
  const rows = school?.nil?.collective990
  if (!Array.isArray(rows)) return []
  return rows.filter((row) => row && (row.value != null || row.confidence === 'pending'))
}

export function nilModeled(school) {
  return school?.nil?.modeled || null
}

export function parseAlumniParam(raw) {
  return raw === '1'
}

/** Display capacity: booked filing stack, or booked + extra-alumni midpoint. */
export function displayCap(cap, includeAlumni) {
  if (!cap) return 0
  return includeAlumni ? cap.total : cap.booked
}

export function displayCapRange(cap, includeAlumni) {
  if (!cap) return { low: 0, high: 0 }
  if (includeAlumni) return { low: cap.totalLow, high: cap.totalHigh }
  return { low: cap.booked, high: cap.booked }
}

export function ratios(school, meta, houseYear, includeAlumni = false) {
  const cap = computeCapacity(school)
  const capacity = displayCap(cap, includeAlumni)
  const nil = nilBooked(school)
  const house = houseCap(meta, houseYear ?? school._season?.houseKey ?? '2025-26')
  const modeled = nilModeled(school)
  return {
    capacity,
    house,
    nil,
    modeled,
    nilOverCapacity: nil == null || !capacity ? null : nil / capacity,
    nilOverHouse: nil == null || !house ? null : nil / house,
    modeledMidOverCapacity: modeled && capacity ? modeled.mid / capacity : null,
    modeledMidOverHouse: modeled && house ? modeled.mid / house : null,
  }
}

export function confidenceRollup(school) {
  const fields = [
    school.capacity.mediaConference,
    school.capacity.sponsorships,
    school.capacity.tickets,
    school.capacity.contributions,
    school.nil.booked,
    school.coaches.football.pay,
    school.coaches.football.buyout,
  ]
  const ranks = { reported: 0, estimated: 0, modeled: 0, pending: 0 }
  for (const f of fields) {
    const c = (f && f.confidence) || 'pending'
    ranks[c] = (ranks[c] || 0) + 1
  }
  let primary = 'reported'
  if (ranks.pending >= 3) primary = 'pending'
  else if (ranks.estimated + ranks.modeled >= 3) primary = 'estimated'
  return { ...ranks, primary }
}

export function collectSources(school, meta) {
  const out = []
  const seen = new Set()
  function walk(node, label) {
    if (!node || typeof node !== 'object') return
    if (node.url && node.source && !seen.has(node.url + node.source)) {
      seen.add(node.url + node.source)
      out.push({
        label,
        source: node.source,
        url: node.url,
        asOf: node.asOf,
        fiscalYear: node.fiscalYear,
        confidence: node.confidence,
        notes: node.notes,
        window: node.window,
      })
    }
    for (const [k, v] of Object.entries(node)) {
      if (v && typeof v === 'object') walk(v, k)
    }
  }
  walk(school, school.name)
  walk(meta.houseCap, 'House cap')
  return out
}
