/**
 * Conference-exit lane. A stock / overhang, not annual capacity,
 * and not a coach-firing buyout.
 *
 * Two published instruments only:
 *   ACC  — settlement year ladder, media rights in tow
 *   SEC  — bylaw withdrawal fee (cash). Does not say you leave with rights.
 * Empty — no hosted schedule (Big Ten, Big 12, Notre Dame football).
 */

import { SEASON_BY_YEAR } from './seasons.js'

export const ACC_SOURCE = {
  source:
    'The Post and Courier — 68-page ACC / Clemson / Florida State settlement (obtained by the newsroom)',
  url: 'https://www.postandcourier.com/sports/clemson/clemson-settlement-acc-lawsuit-exit-date/article_534238b8-1ec1-4ec4-b484-57ae49cd2cf5.html',
  asOf: '2025-07',
  confidence: 'reported',
}

export const SEC_SOURCE = {
  source: '2023–24 SEC Bylaws, §3.2 Withdrawal Fee (hosted PDF)',
  url: 'https://a.espncdn.com/sec/media/2023/2023-24%20SEC%20Bylaws.pdf',
  asOf: '2023-24',
  confidence: 'reported',
}

/** Settlement stair. FY 2025-26 is the 2026 season exit; later FYs step down $18M until the $75M floor. */
export const ACC_LADDER = [
  { fiscalYear: '2025-26', exitSeason: 2026, value: 165_000_000 },
  { fiscalYear: '2026-27', exitSeason: 2027, value: 147_000_000 },
  { fiscalYear: '2027-28', exitSeason: 2028, value: 129_000_000 },
  { fiscalYear: '2028-29', exitSeason: 2029, value: 111_000_000 },
  { fiscalYear: '2029-30', exitSeason: 2030, value: 93_000_000 },
  {
    fiscalYear: '2030-31',
    throughFiscalYear: '2035-36',
    exitSeason: 2031,
    value: 75_000_000,
    notes: 'Floor from 2030–31 through the remainder of the ACC / ESPN deal (through 2036).',
  },
]

export const SEC_STAIRS = [
  { bylaw: '3.2.1', label: 'With required notice', value: 30_000_000, booked: true },
  { bylaw: '3.2.2', label: 'Without notice', value: 40_000_000, booked: false },
  { bylaw: '3.2.3', label: 'Deemed withdrawn', value: 45_000_000, booked: false },
]

export const ACC_FOOTBALL_IDS = [
  'boston-college',
  'california',
  'clemson',
  'duke',
  'florida-state',
  'georgia-tech',
  'louisville',
  'miami',
  'nc-state',
  'north-carolina',
  'pittsburgh',
  'smu',
  'stanford',
  'syracuse',
  'virginia',
  'virginia-tech',
  'wake-forest',
]

export const SEC_IDS = [
  'alabama',
  'arkansas',
  'auburn',
  'florida',
  'georgia',
  'kentucky',
  'lsu',
  'mississippi-state',
  'missouri',
  'oklahoma',
  'ole-miss',
  'south-carolina',
  'tennessee',
  'texas',
  'texas-am',
  'vanderbilt',
]

export const ACC_NOTES =
  'Settlement year ladder. Paying the published fee lets the school leave WITH media rights (unlike the old grant-of-rights + 3× operating budget). Not a coach-firing buyout. Not part of annual capacity.'

export const SEC_NOTES =
  'Bylaw withdrawal fee — cash to the conference. The bylaws do not say a departing school leaves with media rights. Not equivalent to the ACC settlement ladder. School-page cell is §3.2.1 with-notice ($30 million). §3.2.2 $40 million without notice and §3.2.3 $45 million if deemed withdrawn are footnoted, not booked as the headline. Not a coach-firing buyout. Not part of annual capacity.'

export const PENDING_NOTES = {
  'Big Ten':
    'No published Big Ten exit stair on the desk. Grant of rights; a private-equity extension through 2046 is paused. Empty means pending — not a coach buyout, and not a modeled fee.',
  'Big 12':
    'The $100 million Texas / Oklahoma 2023–24 early-exit figure was a one-off, not a schedule for remaining members. We do not stamp it on Kansas, Iowa State, or anyone still in the league. Texas and Oklahoma are now SEC. Empty means pending.',
  'Independent / ACC':
    'Notre Dame football is independent. ACC membership for other sports is a different contract; no hosted football-exit schedule on the desk. Empty means pending.',
  Independent:
    'No hosted football-exit schedule on the desk. Empty means pending.',
}

function fieldFrom(source, extras = {}) {
  return {
    value: extras.value ?? null,
    confidence: extras.confidence ?? source.confidence,
    source: extras.source ?? source.source,
    url: extras.url ?? source.url,
    asOf: extras.asOf ?? source.asOf,
    fiscalYear: extras.fiscalYear ?? null,
    notes: extras.notes ?? null,
  }
}

export function accLadderRows() {
  return ACC_LADDER.map((row) => ({
    ...row,
    ...ACC_SOURCE,
    label: accStepLabel(row),
  }))
}

export function accStepLabel(row) {
  if (!row) return ''
  if (row.throughFiscalYear) {
    return `FY ${row.fiscalYear}–${row.throughFiscalYear.slice(-2)} · ${row.exitSeason}–36 season exits`
  }
  return `FY ${row.fiscalYear} · ${row.exitSeason} season exit`
}

export function accStepForSeason(season) {
  const spec = SEASON_BY_YEAR[season]
  if (!spec?.academic) return null
  return ACC_LADDER.find((row) => {
    if (row.fiscalYear === spec.academic) return true
    if (row.throughFiscalYear && spec.academic >= row.fiscalYear && spec.academic <= row.throughFiscalYear) {
      return true
    }
    return false
  }) || null
}

/** Current-membership instrument. Ignores historical conference remaps (Texas/OU stay SEC). */
export function conferenceExitRecord(school) {
  return school?.conferenceExit || null
}

/**
 * Year-honest headline. Settlement / bylaw cells appear on 2025–26 and later.
 * Earlier seasons stay empty — we do not back-date the ACC stair or invent a 3× budget.
 */
export function resolveConferenceExit(school, season) {
  const raw = conferenceExitRecord(school)
  if (!raw) return null
  if (season < 2025) {
    return {
      ...raw,
      fee: fieldFrom(
        { confidence: 'pending', source: null, url: null, asOf: null },
        {
          value: null,
          confidence: 'pending',
          notes:
            'Conference-exit figures on this desk start with the 2025 season (ACC settlement FY 2025–26; SEC 2023–24 bylaws shown from 2025). Empty means pending.',
        },
      ),
      step: null,
    }
  }
  if (raw.instrument === 'acc-settlement-ladder') {
    const step = accStepForSeason(season)
    if (!step) {
      return {
        ...raw,
        fee: fieldFrom(ACC_SOURCE, {
          value: null,
          confidence: 'pending',
          notes: `No ACC settlement step on the desk for this season. The published stair starts FY 2025–26.`,
        }),
        step: null,
      }
    }
    return {
      ...raw,
      fee: fieldFrom(ACC_SOURCE, {
        value: step.value,
        fiscalYear: step.fiscalYear,
        notes: `${accStepLabel(step)}. ${ACC_NOTES}`,
      }),
      step,
    }
  }
  if (raw.instrument === 'sec-bylaw-withdrawal') {
    const booked = SEC_STAIRS.find((s) => s.booked)
    return {
      ...raw,
      fee: fieldFrom(SEC_SOURCE, {
        value: booked.value,
        fiscalYear: '2023-24',
        notes: `§${booked.bylaw} ${booked.label}. ${SEC_NOTES}`,
      }),
      step: null,
    }
  }
  return {
    ...raw,
    fee: fieldFrom(
      { confidence: 'pending', source: null, url: null, asOf: null },
      {
        value: null,
        confidence: 'pending',
        notes: raw.notes || PENDING_NOTES[raw.conference] || 'No hosted exit schedule on the desk.',
      },
    ),
    step: null,
  }
}

export function conferenceExitHeadline(resolved) {
  if (resolved?.fee?.value != null) return { field: resolved.fee, kind: resolved.instrument }
  return { field: resolved?.fee || null, kind: null }
}

export function conferenceExitHasValue(resolved) {
  return resolved?.fee?.value != null
}
