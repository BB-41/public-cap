/**
 * Modeled NIL range (conference heuristic).
 *
 * Not a filing. Not On3 / Opendorse / NIL Go. Booked NIL is untouched.
 *
 * Source commentary: nil-ncaa.com 2026–27 P4 roster-cost table, which splits
 * institutional revenue share vs third-party NIL. Those figures are estimates.
 *
 * Formula:
 *   House 2025–26 institutional ceiling H = $20.5M.
 *   Conference medians (total = rev-share + third-party):
 *     SEC $30.16M ($15.6M + $14.56M)
 *     Big Ten $24.41M ($15.6M + $8.81M)
 *     Big 12 $21.61M ($15.6M + $6.01M)
 *     ACC $21.24M ($15.6M + $5.64M)
 *     Notre Dame: ACC × 1.08 (small independent premium).
 *   low  = phase-in / half-share / newcomer → 0.50 × H ($10.25M)
 *          else 0.70 × conference total median.
 *   high0 = min(1.25 × conference total median, H + conference third-party median).
 *   high  = conference median + (high0 − median) × (capacity quartile / 4)
 *           so only the top capacity quartile sits at the top of the band.
 *   mid   = (low + high) / 2.
 */

export const HOUSE_2025_26 = 20_500_000

export const NIL_MODEL_SOURCE = {
  confidence: 'modeled',
  source: 'nil-ncaa.com 2026–27 P4 roster-cost table (estimates, not filings)',
  url: 'https://nil-ncaa.com/',
  asOf: '2026-27',
}

/** Phase-in, half-share, or recent P4 newcomers — institutional spend may sit lower. */
export const HALF_SHARE_IDS = new Set([
  'oregon',
  'washington',
  'ucla',
  'usc',
  'california',
  'stanford',
  'smu',
  'byu',
  'houston',
  'ucf',
  'cincinnati',
  'texas',
  'oklahoma',
])

export const CONFERENCE_NIL = {
  SEC: { total: 30_160_000, revShare: 15_600_000, thirdParty: 14_560_000 },
  'Big Ten': { total: 24_410_000, revShare: 15_600_000, thirdParty: 8_810_000 },
  'Big 12': { total: 21_610_000, revShare: 15_600_000, thirdParty: 6_010_000 },
  ACC: { total: 21_240_000, revShare: 15_600_000, thirdParty: 5_640_000 },
}

const ND_PREMIUM = 1.08

export function conferenceNilBand(conference) {
  if (conference === 'Independent / ACC' || conference === 'Independent') {
    const acc = CONFERENCE_NIL.ACC
    return {
      key: 'ND',
      label: 'Notre Dame (ACC + independent premium)',
      total: Math.round(acc.total * ND_PREMIUM),
      revShare: acc.revShare,
      thirdParty: Math.round(acc.thirdParty * ND_PREMIUM),
      premium: ND_PREMIUM,
    }
  }
  const row = CONFERENCE_NIL[conference] || CONFERENCE_NIL.ACC
  return { key: conference, label: conference, ...row, premium: 1 }
}

export function capacityQuartile(value, allValues) {
  if (!allValues?.length) return 3
  const sorted = [...allValues].sort((a, b) => a - b)
  const n = sorted.length
  let rank = 0
  for (let i = 0; i < n; i++) if (sorted[i] <= value) rank = i
  const p = n === 1 ? 1 : rank / (n - 1)
  if (p >= 0.75) return 4
  if (p >= 0.5) return 3
  if (p >= 0.25) return 2
  return 1
}

export function computeModeledNil(school, capacityTotal, allCapacityTotals, house = HOUSE_2025_26) {
  const conf = conferenceNilBand(school.conference)
  const half = HALF_SHARE_IDS.has(school.id)
  const low = half ? 0.5 * house : 0.7 * conf.total
  const highCap = house + conf.thirdParty
  const high0 = Math.min(conf.total * 1.25, highCap)
  const q = capacityQuartile(capacityTotal, allCapacityTotals)
  const high = conf.total + (high0 - conf.total) * (q / 4)
  const lo = Math.round(low)
  const hi = Math.round(Math.max(high, low))
  const mid = Math.round((lo + hi) / 2)

  const bits = [
    `Conference heuristic from ${NIL_MODEL_SOURCE.source}.`,
    `${conf.label} median total roster cost $${(conf.total / 1e6).toFixed(2)}M (rev-share ~$${(conf.revShare / 1e6).toFixed(1)}M + third-party ~$${(conf.thirdParty / 1e6).toFixed(2)}M).`,
    half
      ? 'Low end is 50% of the $20.5M House cap because this school is a phase-in, half-share, or recent P4 newcomer.'
      : 'Low end is 70% of the conference total-roster median.',
    `High end is min(1.25× conference median, House + conference third-party), then scaled by capacity quartile Q${q}/4 so only the richest public-cap programs sit at the top of the band.`,
    'nil-ncaa.com numbers are estimates, not filings. Booked NIL (FOIA / MFRS / 990) is unchanged.',
  ]

  return {
    low: lo,
    high: hi,
    mid,
    confidence: 'modeled',
    source: NIL_MODEL_SOURCE.source,
    url: NIL_MODEL_SOURCE.url,
    asOf: NIL_MODEL_SOURCE.asOf,
    notes: bits.join(' '),
    conferenceKey: conf.key,
    conferenceTotal: conf.total,
    conferenceThirdParty: conf.thirdParty,
    halfShare: half,
    capacityQuartile: q,
    method:
      'Modeled range from nil-ncaa.com 2026–27 conference medians: low = 50% of House ($10.25M) for phase-in/half-share members, else 70% of conference total; high = min(1.25× median, House + third-party) × capacity-quartile share. Estimates, not filings.',
  }
}

export function attachModeledNil(schools, house = HOUSE_2025_26) {
  const totals = schools.map((s) => (s._cap ? s._cap.total : 0))
  return schools.map((s, i) => {
    const modeled = computeModeledNil(s, totals[i], totals, house)
    return {
      ...s,
      nil: { ...s.nil, modeled },
    }
  })
}
