/**
 * Modeled NIL range (conference heuristic).
 *
 * Not a filing. Not an On3 / Opendorse / NIL Go player value. Booked NIL is untouched.
 *
 * House-era (2025–26 / 2026–27) — existing formula, unchanged:
 *   House 2025–26 institutional ceiling H = $20.5M.
 *   Conference medians (total = rev-share + third-party) from nil-ncaa.com 2026–27:
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
 *
 * Collective-era (football 2021–24) — third-party only, no House rev-share:
 *   Mature (2024–25) third-party median = conferenceNilBand(school.conference).thirdParty.
 *   yearFactor = published national NIL market / $1.67B (2024–25 baseline).
 *   median_y = thirdParty × yearFactor
 *   low = 0.70 × median_y   (no $10.25M House half-share floor)
 *   high0 = 1.25 × median_y
 *   high = median_y + (high0 − median_y) × (capacityQuartile / 4)
 *   mid = (low + high) / 2
 *   Year scalar is a published market total (Opendorse “NIL at 3” / Athletic Business
 *   recap), not a player file.
 *   Pac-12 (2021–23) has no published third-party row in CONFERENCE_NIL and no
 *   invented House rev-share. conferenceNilBand uses the average of Big 12 and
 *   ACC third-party medians as a documented proxy.
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

/** Opendorse “NIL at 3” national market size, keyed as football seasons. */
export const NIL_MARKET_BY_SEASON = {
  2021: 917_000_000, // 2021–22
  2022: 1_140_000_000, // 2022–23
  2023: 1_170_000_000, // 2023–24
  2024: 1_670_000_000, // 2024–25 baseline
}

export const NIL_MARKET_BASELINE = 1_670_000_000

export const NIL_MARKET_SOURCE = {
  source: 'Opendorse “NIL at 3” national market size (Athletic Business recap)',
  pdf: 'https://biz.opendorse.com/wp-content/uploads/2024/07/NIL-AT-3-The-Annual-Opendorse-Report-1.pdf',
  recap:
    'https://www.athleticbusiness.com/operations/marketing/article/15710488/report-total-nil-market-for-202425-expected-to-hit-167b',
  asOf: '2024-25',
}

export function nilYearFactor(season) {
  const market = NIL_MARKET_BY_SEASON[season]
  if (!market) return null
  return market / NIL_MARKET_BASELINE
}

/** Average of published Big 12 + ACC third-party medians. Not a Pac-12 House row. */
export function pac12ThirdPartyProxy() {
  return Math.round((CONFERENCE_NIL['Big 12'].thirdParty + CONFERENCE_NIL.ACC.thirdParty) / 2)
}

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
  // Pac-12 is absent from CONFERENCE_NIL. Do not invent a House rev-share /
  // total-roster row; collective-era years only need a third-party median.
  if (conference === 'Pac-12') {
    const thirdParty = pac12ThirdPartyProxy()
    return {
      key: 'Pac-12',
      label: 'Pac-12 (Big 12 + ACC third-party average proxy)',
      total: null,
      revShare: null,
      thirdParty,
      premium: 1,
      proxy: 'big12-acc-third-party-avg',
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
    era: 'house',
    source: NIL_MODEL_SOURCE.source,
    url: NIL_MODEL_SOURCE.url,
    asOf: NIL_MODEL_SOURCE.asOf,
    notes: bits.join(' '),
    conferenceKey: conf.key,
    conferenceTotal: conf.total,
    conferenceThirdParty: conf.thirdParty,
    halfShare: half,
    capacityQuartile: q,
    yearFactor: null,
    method:
      'Modeled range from nil-ncaa.com 2026–27 conference medians: low = 50% of House ($10.25M) for phase-in/half-share members, else 70% of conference total; high = min(1.25× median, House + third-party) × capacity-quartile share. Estimates, not filings.',
  }
}

function collectiveEraConfNote(school, season, conf) {
  const book = school._bookConference || school.conference
  const seasonal = school.conference
  if (conf.proxy === 'big12-acc-third-party-avg') {
    return (
      `Conference bucket is this school’s ${season} affiliation (Pac-12) via conferenceInSeason. ` +
      `CONFERENCE_NIL has no Pac-12 third-party median and this desk does not invent a Pac-12 House rev-share. ` +
      `Proxy is the average of published Big 12 and ACC third-party medians ($${(conf.thirdParty / 1e6).toFixed(2)}M), then the same year factor as every other school.`
    )
  }
  const published = !!(CONFERENCE_NIL[seasonal] || seasonal === 'Independent / ACC')
  if (seasonal !== book) {
    return published
      ? `Conference bucket is this school’s ${season} affiliation (${conf.label}) from the desk’s existing 2021–23 remaps (conferenceInSeason).`
      : `${seasonal} (${season} remap) has no published third-party median; conferenceNilBand inherits the ${conf.label} row.`
  }
  return `Uses this school’s current book conference bucket (${conf.label}).`
}

/**
 * 2021–24 collective-era model: third-party / collective only.
 * Does not add House rev-share ($15.6M / $20.5M). Half-share list is ignored.
 */
export function computeCollectiveEraNil(school, capacityTotal, allCapacityTotals, season) {
  const factor = nilYearFactor(season)
  const conf = conferenceNilBand(school.conference)
  const medianY = conf.thirdParty * factor
  const low = 0.7 * medianY
  const high0 = 1.25 * medianY
  const q = capacityQuartile(capacityTotal, allCapacityTotals)
  const high = medianY + (high0 - medianY) * (q / 4)
  const lo = Math.round(low)
  const hi = Math.round(Math.max(high, low))
  const mid = Math.round((lo + hi) / 2)
  const market = NIL_MARKET_BY_SEASON[season]
  const academic =
    season === 2021 ? '2021–22' : season === 2022 ? '2022–23' : season === 2023 ? '2023–24' : '2024–25'

  const bits = [
    'Collective-era third-party only — no House rev-share is added to 2021–24.',
    `Mature (2024–25) ${conf.label} third-party median $${(conf.thirdParty / 1e6).toFixed(2)}M from ${NIL_MODEL_SOURCE.source}, scaled by published national NIL market ${academic} $${(market / 1e9).toFixed(season === 2021 ? 3 : 2)}B ÷ $1.67B (year factor ${factor.toFixed(3)}).`,
    `Low is 70% of that year’s median (no $10.25M House half-share floor). High is 1.25× the year median, then scaled by capacity quartile Q${q}/4 using this season’s conference-media-floor capacity totals.`,
    collectiveEraConfNote(school, season, conf),
    'Estimates, not filings. Booked NIL (FOIA / MFRS / 990) is unchanged. The year scalar is a published market total, not an On3 / Opendorse / NIL Go player file.',
  ]

  return {
    low: lo,
    high: hi,
    mid,
    confidence: 'modeled',
    era: 'collective',
    source: `${NIL_MARKET_SOURCE.source}; ${NIL_MODEL_SOURCE.source}`,
    url: NIL_MARKET_SOURCE.recap,
    asOf: NIL_MARKET_SOURCE.asOf,
    notes: bits.join(' '),
    conferenceKey: conf.key,
    conferenceTotal: Math.round(medianY),
    conferenceThirdParty: conf.thirdParty,
    halfShare: false,
    capacityQuartile: q,
    yearFactor: factor,
    method:
      'Collective-era third-party model: conference third-party median × Opendorse NIL-at-3 national market vs 2024–25. Low = 70% of the year median; high = 1.25× year median scaled by capacity quartile. No House rev-share. Estimates, not filings.',
  }
}

export function modeledNilForSeason(school, capacityTotal, allCapacityTotals, season, house) {
  if (season >= 2025) {
    if (house == null) return null
    return computeModeledNil(school, capacityTotal, allCapacityTotals, house)
  }
  if (season >= 2021 && season <= 2024) {
    return computeCollectiveEraNil(school, capacityTotal, allCapacityTotals, season)
  }
  return null
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
