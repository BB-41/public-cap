/**
 * Football roster stack: prefer a CBS/SI survey cell, else a labeled
 * modeled range from SI conference medians. Position dollars split that
 * stack by the existing FB rate-card seat weights.
 *
 * Never booked NIL. Never House spent. Never leftover. Never capacity.
 */

import { moneyRange } from './format.js'
import { FAMILY_SEATS, FB_UNIT_SUM } from './nilRoster.js'
import { leadBookedNil, leadHouseRemaining } from './compute.js'
import {
  CITED_POSITION_FAMILIES,
  FOOTBALL_POSITIONS,
  industryPositionEstimates,
  positionEstimateDisplay,
  positionEstimateFor,
} from './positionEstimate.js'
import { industryRosterEstimate, rosterEstimateDisplay } from './rosterEstimate.js'

export const SI_STACK_URL =
  'https://www.si.com/college-football/welcome-to-college-football-50-million-era-inside-the-roster-spending-explosion'
export const STACK_BASELINES = {
  asOf: '2026-08-27',
  source: 'Sports Illustrated — Fischer, Aug 27, 2026. Estimate for the median team, by conference.',
  url: SI_STACK_URL,
  notes:
    'Narrowest published conference bands in the public SI $50M-era piece. Same band for every school the CBS/SI articles do not name — not a school-by-school guess. The public CBS Aug 17, 2026 poll does not publish a Power 4 average or a full ranking table (the 247Sports companion is paywalled). SI’s “at least $20M” competitive floor is a floor, not a P4 average. Not a filing. Not booked NIL.',
  conferenceMedians: {
    ACC: { low: 17_000_000, high: 24_000_000, label: 'SI ACC median' },
    'Big 12': { low: 18_000_000, high: 25_000_000, label: 'SI Big 12 median' },
    'Big Ten': { low: 22_000_000, high: 28_000_000, label: 'SI Big Ten median' },
    SEC: { low: 25_000_000, high: 33_000_000, label: 'SI SEC median' },
  },
  tierAllocationEnvelopes: {
    'above $40M': {
      low: 40_000_000,
      high: 50_000_000,
      note: 'Allocation envelope only. School cell stays the above-$40M survey tier. Floor is the CBS/SI $40M line; high is the articles’ $50M-era top, not a school filing.',
    },
    'just below $40M': {
      low: 35_000_000,
      high: 40_000_000,
      note: 'CBS just a smidge below $40M; SI not far behind $40M. Allocation envelope only — school cell stays the tier.',
    },
    'right off the $40M line': {
      low: 35_000_000,
      high: 40_000_000,
      note: 'CBS “right off the $40 million line”; SI upward of $35M for this group. Allocation envelope only.',
    },
    'upper $30M': {
      low: 35_000_000,
      high: 40_000_000,
      note: 'CBS upper-$30-million range; SI upward of $35M. Allocation envelope only.',
    },
    'high $30M': {
      low: 35_000_000,
      high: 40_000_000,
      note: 'CBS high-$30 million range; SI upward of $35M. Allocation envelope only.',
    },
    'high $30s': {
      low: 35_000_000,
      high: 40_000_000,
      note: 'CBS high $30s / just below $40M. Allocation envelope only.',
    },
    'at or slightly under $40M': {
      low: 35_000_000,
      high: 40_000_000,
      note: 'SI at or slightly under $40M. Allocation envelope only.',
    },
    'closer to $30M': {
      low: 20_000_000,
      high: 30_000_000,
      note: 'SI: closer to the $30 million range than the $20 million estimated last year. Those two poles are the allocation envelope.',
    },
    'around $20M': {
      low: 20_000_000,
      high: 22_000_000,
      note: 'SI around the $20 million mark; $22M is the SI Big Ten median floor. Allocation envelope only.',
    },
    'more than $20M': {
      low: 20_000_000,
      high: 24_000_000,
      note: 'SI named floor more than $20M; $24M is the SI ACC median high — narrowest cited ACC band that contains that floor.',
    },
    'at least $20M': {
      low: 20_000_000,
      high: 33_000_000,
      note: 'SI named SEC floor $20M; $33M is the SI SEC median high — narrowest cited SEC band that contains that floor.',
    },
  },
  surveyRangeHighs: [50_000_000, 35_000_000],
  reportedBar: {
    min: 0,
    maxNote:
      'Highest published/modeled top among Power 4 + Notre Dame: LSU survey high $50M and the above-$40M allocation envelope high $50M. Same $0–$50M scale on every school page.',
  },
}
const baselines = STACK_BASELINES
export const CBS_STACK_URL =
  'https://www.cbssports.com/college-football/news/college-football-roster-spending-rankings-most-expensive-teams-2026/'

export function conferenceStackKey(school) {
  const c = school?.conference
  if (c === 'Independent / ACC' || c === 'Independent') return 'Independent'
  return c || null
}

export function modeledConferenceMedian(school) {
  const key = conferenceStackKey(school)
  const row = baselines.conferenceMedians[key]
  if (!row) return null
  return {
    lane: 'modeled',
    kind: 'range',
    low: row.low,
    high: row.high,
    display: moneyRange(row.low, row.high, 0),
    conference: key,
    label: row.label,
    formula: `${row.label} ${moneyRange(row.low, row.high, 0)}. Same band for every ${key} school the public CBS / SI pieces do not name — not a school-by-school guess. SI Fischer, Aug 27, 2026. Not a filing. Not booked NIL.`,
    source: baselines.source,
    url: SI_STACK_URL,
    asOf: baselines.asOf,
  }
}

export function tierAllocationEnvelope(tier) {
  if (!tier) return null
  const row = baselines.tierAllocationEnvelopes[tier]
  if (!row) return null
  return {
    low: row.low,
    high: row.high,
    display: moneyRange(row.low, row.high, 0),
    formula: row.note,
  }
}

export function allocationRangeFromSurvey(survey) {
  if (!survey) return null
  if (survey.kind === 'range' && survey.low != null && survey.high != null) {
    return {
      low: survey.low,
      high: survey.high,
      display: moneyRange(survey.low, survey.high, 0),
      formula: `Survey range ${moneyRange(survey.low, survey.high, 0)} split by football seat weights (QB1 = 100). Not a filing.`,
    }
  }
  const env = tierAllocationEnvelope(survey.tier)
  if (!env) return null
  return {
    ...env,
    formula: `${env.formula} Split by football seat weights (QB1 = 100). School cell stays the survey tier, not this envelope’s midpoint.`,
  }
}

/**
 * School-level football stack. Survey range/tier wins. Silent schools
 * get the SI conference-median range, labeled modeled.
 */
export function footballRosterStack(school) {
  const survey = industryRosterEstimate(school)
  if (survey) {
    return {
      lane: 'survey',
      kind: survey.kind,
      display: rosterEstimateDisplay(survey),
      survey,
      allocation: allocationRangeFromSurvey(survey),
    }
  }
  const modeled = modeledConferenceMedian(school)
  if (!modeled) return null
  return {
    lane: 'modeled',
    kind: 'range',
    display: modeled.display,
    modeled,
    allocation: {
      low: modeled.low,
      high: modeled.high,
      display: modeled.display,
      formula: modeled.formula,
    },
  }
}

export function stackFormula(stack) {
  if (!stack) return ''
  if (stack.lane === 'survey') {
    const extra = stack.allocation?.formula ? ` Position allocation: ${stack.allocation.formula}` : ''
    return `Survey — ${stack.display}.${extra}`
  }
  return stack.modeled?.formula || stack.allocation?.formula || ''
}

function familySeat(family) {
  return FAMILY_SEATS[family] || null
}

export function allocateStackBySeats(allocation) {
  if (!allocation || allocation.low == null || allocation.high == null || !FB_UNIT_SUM) return []
  const dpuLow = allocation.low / FB_UNIT_SUM
  const dpuHigh = allocation.high / FB_UNIT_SUM
  return FOOTBALL_POSITIONS.map((pos) => {
    const seat = familySeat(pos.family)
    if (!seat) return null
    const starterLow = Math.round(seat.starterUnits * dpuLow)
    const starterHigh = Math.round(seat.starterUnits * dpuHigh)
    const backupLow = Math.round(seat.depthUnits * dpuLow)
    const backupHigh = Math.round(seat.depthUnits * dpuHigh)
    return {
      family: pos.family,
      label: pos.label,
      starterShort: seat.starterShort,
      backupShort: seat.depthShort,
      starterLow,
      starterHigh,
      backupLow,
      backupHigh,
      starterDisplay: moneyRange(starterLow, starterHigh, 1),
      backupDisplay: moneyRange(backupLow, backupHigh, 1),
      formula: `${seat.starterShort} = ${seat.starterUnits} / ${FB_UNIT_SUM} of the football stack. Backup = ${seat.depthUnits} / ${FB_UNIT_SUM}. Modeled seat weights, not a contract.`,
      confidence: 'modeled',
    }
  }).filter(Boolean)
}

export function stackPositionRows(school) {
  const stack = footballRosterStack(school)
  if (!stack?.allocation) return []
  const modeled = allocateStackBySeats(stack.allocation)
  const cited = industryPositionEstimates(school)
  return modeled.map((row) => {
    const survey = cited ? positionEstimateFor(school, row.family) : null
    return {
      ...row,
      survey,
      surveyDisplay: survey ? positionEstimateDisplay(survey) : null,
      surveyMark: survey?.mark || (survey ? 'survey' : null),
    }
  })
}

export function reportedBarMax() {
  const highs = [
    ...(STACK_BASELINES.surveyRangeHighs || []),
    ...Object.values(STACK_BASELINES.conferenceMedians).map((r) => r.high),
    ...Object.values(STACK_BASELINES.tierAllocationEnvelopes).map((r) => r.high),
  ]
  return Math.max(...highs)
}

function pctOfScale(value, max) {
  if (value == null || !Number.isFinite(value) || max <= 0) return null
  return Math.max(0, Math.min(100, (Number(value) / max) * 100))
}

function citeBooked(school, override) {
  if (override != null && override !== '') return Number(override)
  const lead = leadBookedNil(school)
  return lead.value != null ? Number(lead.value) : null
}

function citeSpent(school, override) {
  if (override != null && override !== '') return Number(override)
  const leftover = leadHouseRemaining(school)
  if (leftover.field && leftover.field.spent != null && leftover.field.spent !== '') {
    return Number(leftover.field.spent)
  }
  return null
}

/**
 * Comparable NIL reported bar. Band is the football-stack range
 * (rev-share + third-party NIL). Booked NIL / House spent are
 * separate marks — never mixed into the band, leftover, or waterfall.
 */
export function reportedNilBar(school, extras = {}) {
  const stack = footballRosterStack(school)
  if (!stack?.allocation) return null
  const max = reportedBarMax()
  const { low, high } = stack.allocation
  const left = pctOfScale(low, max)
  const right = pctOfScale(high, max)
  const bookedVal = citeBooked(school, extras.booked)
  const spentVal = citeSpent(school, extras.spent)
  const bookedMark = bookedVal != null ? { value: bookedVal, pct: pctOfScale(bookedVal, max) } : null
  const spentMark = spentVal != null ? { value: spentVal, pct: pctOfScale(spentVal, max) } : null
  return {
    max,
    low,
    high,
    mid: (low + high) / 2,
    rangeDisplay: moneyRange(low, high, 0),
    lane: stack.lane,
    kind: stack.kind,
    display: stack.display,
    formula: stack.allocation.formula,
    leftPct: left,
    rightPct: right,
    widthPct: right == null || left == null ? 0 : Math.max(1.2, right - left),
    booked: bookedMark,
    spent: spentMark,
    sameBookedSpent: !!(bookedMark && spentMark && bookedMark.value === spentMark.value),
    scaleNote: `Same $0–$${(max / 1e6).toFixed(0)}M scale for every Power 4 + Notre Dame school. Max is the highest published or modeled top in the set (LSU survey high $50M; above-$40M allocation envelope $50M). The gold band is the football-stack range (rev-share + third-party NIL) — not booked NIL and not House spent.`,
    stack,
  }
}

export function reportedBarBreakdown(school) {
  const want = new Set(CITED_POSITION_FAMILIES)
  return stackPositionRows(school).filter((row) => want.has(row.family))
}

export const REPORTED_BAR_HASH = 'nil-reported'
export { FB_UNIT_SUM }
