/**
 * Conference-exit lane. A stock / overhang, not annual capacity,
 * and not a coach-firing buyout.
 *
 * Four published instruments, plus one modeled reporter estimate:
 *   ACC    — settlement year ladder, media rights in tow (booked)
 *   SEC    — bylaw withdrawal fee (cash). Does not say you leave with rights. (booked)
 *   Big 12 — bylaw §3.4 cash formula modeled as 2× last cited FY2025 990
 *            distribution. Paying the fee does NOT abrogate the grant of rights.
 *   Big Ten — no published cash exit fee. The lock is the grant of rights
 *             through 2036. Not $0, not a borrowed 2× formula.
 *   ND     — modeled reporter estimate of the non-football ACC membership exit.
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

export const B12_BYLAWS = {
  source: 'Big 12 Conference Bylaws, §3.4 Buyout Amount and §3.1 Grant of Rights (hosted PDF)',
  url: 'https://static.big12sports.com/custompages/pdfs/handbook/bylaws.pdf',
  asOf: 'hosted handbook',
  confidence: 'reported',
}

export const B12_990 = {
  source:
    'Big 12 Conference Inc. FY2025 Form 990, Schedule I grantee list (year ended June 2025) — Plinth extract of IRS e-file',
  url: 'https://data.useplinth.com/foundation/the-big-12-conference-inc-752604555',
  propublica: 'https://projects.propublica.org/nonprofits/organizations/752604555',
  filing: 'https://projects.propublica.org/nonprofits/organizations/752604555/202641349349305844/full',
  asOf: '2026-05',
  fiscalYear: 'FY2025',
  ein: '75-2604555',
  confidence: 'modeled',
}

export const B12_USAT_FLOOR = {
  source:
    'USA TODAY — Power 4 FY2025 tax returns: Big 12 minimum full-share $37.9M; BYU / Houston / UCF / Cincinnati $19–23M half-shares that year',
  url: 'https://www.usatoday.com/story/sports/college/2026/05/22/power-4-conference-money-comparison-big-ten-sec-acc-big-12-pac-12-brett-yormark/90204563007/',
  asOf: '2026-05-22',
}

export const B12_AP = {
  source:
    'AP / FOX Sports — Big 12 FY2025 990: average ~$39.5M to full-share members; Arizona / ASU / Colorado / Utah full payouts $37.9M–$43M',
  url: 'https://apnews.com/article/acc-big-12-revenue-distribution-b114cc5b581d043344b0d06110e0e2b0',
  fox: 'https://www.foxsports.com/articles/cfb/tax-filings-acc-paid-average-of-471m-to-fullshare-member-schools-big-12-paid-average-of-395m',
  asOf: '2026-05',
}

export const B12_USAT_NAMED = {
  source:
    'USA TODAY — FY2025 school lines quoted from the 990 (Iowa State $41.2M, Oklahoma State $38M, Texas Tech $39.7M). FY2026 projections in that story are budgets, not used.',
  url: 'https://www.usatoday.com/story/sports/ncaaf/big12/2026/06/08/big-12-conference-revenue-dilution-realignment-big-ten-sec-acc/90375818007/',
  asOf: '2026-06-08',
}

export const B1G_NO_FEE = {
  source:
    'Wake Forest Law Review — Fumbling in Court: Exploring the Florida State–ACC Lawsuit: “The Big 10 does not have an exit fee.”',
  url: 'https://www.wakeforestlawreview.com/2024/09/fumbling-in-court-exploring-the-florida-state-acc-lawsuit/',
  asOf: '2024-09',
  confidence: 'reported',
}

export const B1G_GOR = {
  source:
    'ESPN — opposition at Michigan and USC pauses the $2.4B UC Investments Big Ten private-equity plan. Michigan Regent Jordan Acker discussed independence only “at the end of the Grant of Rights [in 2036]”; the paused PE plan would have extended the grant of rights to 2046.',
  url: 'https://www.espn.com/college-sports/story/_/id/47003108/opposition-michigan-usc-pauses-24b-big-ten-deal',
  asOf: '2025-08',
  through: 2036,
  pausedExtension: 2046,
}

export const ND_HALE = {
  source:
    '247Sports quoting ESPN’s David Hale — Notre Dame ACC membership exit in the range of ~$100 million (equal to three times the ACC’s then-recent annual revenue / the old 3× operating-budget style fee); Hale noted ND would be free of the football grant-of-rights charge. Reporter estimate, not a filing. Original espn.com story or post with that $100 million figure was not located.',
  url: 'https://247sports.com/article/explaining-notre-dames-realignment-dilemma-acc-grant-of-rights-fee-189990208/',
  asOf: '2022-08',
  confidence: 'modeled',
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

/** Current Big 12 football members only. Texas and Oklahoma are SEC — do not stamp. */
export const B12_IDS = [
  'arizona',
  'arizona-state',
  'baylor',
  'byu',
  'cincinnati',
  'colorado',
  'houston',
  'iowa-state',
  'kansas',
  'kansas-state',
  'oklahoma-state',
  'tcu',
  'texas-tech',
  'ucf',
  'utah',
  'west-virginia',
]

export const B12_HALF_SHARE_IDS = ['byu', 'cincinnati', 'houston', 'ucf']

export const B1G_IDS = [
  'illinois',
  'indiana',
  'iowa',
  'maryland',
  'michigan',
  'michigan-state',
  'minnesota',
  'nebraska',
  'northwestern',
  'ohio-state',
  'oregon',
  'penn-state',
  'purdue',
  'rutgers',
  'ucla',
  'usc',
  'washington',
  'wisconsin',
]

/**
 * FY2025 Schedule I amounts named on the Plinth extract of the Big 12 990.
 * Houston is not named on that extract — do not invent a point.
 */
export const B12_FY2025_990 = {
  'arizona-state': { amount: 43_009_550, grantee: 'Arizona State University' },
  'iowa-state': { amount: 41_194_426, grantee: 'Iowa State' },
  baylor: { amount: 39_950_085, grantee: 'Baylor University' },
  'kansas-state': { amount: 39_830_544, grantee: 'Kansas State University' },
  'texas-tech': { amount: 39_734_106, grantee: 'Texas Tech University' },
  'west-virginia': { amount: 39_582_600, grantee: 'West Virginia University' },
  tcu: { amount: 39_272_007, grantee: 'Texas Christian University' },
  colorado: { amount: 39_034_422, grantee: 'University of Colorado' },
  kansas: { amount: 38_312_680, grantee: 'Kansas Athletics Inc.' },
  'oklahoma-state': { amount: 38_038_756, grantee: 'Oklahoma State University' },
  arizona: { amount: 38_009_311, grantee: 'University of Arizona' },
  utah: { amount: 37_879_865, grantee: 'University of Utah' },
  byu: { amount: 23_110_622, grantee: 'Brigham Young University', halfShare: true },
  cincinnati: { amount: 20_211_539, grantee: 'University of Cincinnati', halfShare: true },
  ucf: { amount: 19_978_520, grantee: 'University of Central Florida', halfShare: true },
}

/** Named full-share floor / high from the same 990 list (Utah / Arizona State). */
export const B12_FULL_SHARE_LOW = B12_FY2025_990.utah.amount
export const B12_FULL_SHARE_HIGH = B12_FY2025_990['arizona-state'].amount
export const B12_MODELED_RANGE_LOW = B12_FULL_SHARE_LOW * 2
export const B12_MODELED_RANGE_HIGH = B12_FULL_SHARE_HIGH * 2

export const ACC_NOTES =
  'Settlement year ladder. Paying the published fee lets the school leave WITH media rights (unlike the old grant-of-rights + 3× operating budget). Not a coach-firing buyout. Not part of annual capacity.'

export const SEC_NOTES =
  'Bylaw withdrawal fee — cash to the conference. The bylaws do not say a departing school leaves with media rights. Not equivalent to the ACC settlement ladder. School-page cell is §3.2.1 with-notice ($30 million). §3.2.2 $40 million without notice and §3.2.3 $45 million if deemed withdrawn are footnoted, not booked as the headline. Not a coach-firing buyout. Not part of annual capacity.'

export const B12_FORMULA_QUOTE =
  'Any Withdrawing Member shall pay to the Conference a commitment buyout fee (the “Buyout Amount”) in an amount equal to the sum of the amount of distributions that otherwise would be paid to the Member during the final two years of its membership in the Conference.'

export const B12_GOR_QUOTE =
  'the Withdrawal of a Member and the payment of the Buyout Amount and implementation of the provisions of these Bylaws does not abrogate the obligations of such Withdrawing Member pursuant to that certain Amended and Restated Grant of Rights Agreement'

export const B12_GOR_PLAIN =
  'Paying the 2×-distributions cash formula does not buy back media rights. The grant of rights still sits with the league. This is a cash fee only — not the ACC settlement ladder, which lets a school leave with rights in tow.'

export const B12_NOTES = `${B12_GOR_PLAIN} Hosted Big 12 bylaws §3.4: Buyout Amount = the sum of distributions that otherwise would be paid during the final two years of membership. Modeled here as 2 × the last cited FY2025 Form 990 Schedule I distribution — a labeled model, not a booked invoice. The hosted PDF still lists old members; we cite the withdrawal section, not the stale roster. Not a coach-firing buyout. Not part of annual capacity.`

export const ND_NOTES =
  'Football independent; Notre Dame did not sign the ACC football grant of rights. This is a modeled reporter estimate of the non-football ACC membership exit — in the range of ~$100 million — not the FSU / Clemson settlement football ladder ($147M / $165M). Hale noted ND would be free of the football GOR charge. Not a filing. Not a coach-firing buyout. Not part of annual capacity.'

export const B1G_NO_FEE_PLAIN =
  'There is no published cash exit fee. Wake Forest Law Review, writing on the Florida State / ACC case: “The Big 10 does not have an exit fee.” That is not $0 — $0 would read as free to leave.'

export const B1G_GOR_PLAIN =
  'The lock is the grant of rights, currently through 2036. Media rights stay with the league if a school leaves before then. ESPN: Michigan Regent Jordan Acker discussed independence only “at the end of the Grant of Rights [in 2036]”; the paused UC Investments private-equity plan would have extended the grant of rights to 2046.'

export const B1G_FOIA_PLAIN =
  'Illinois FOIA has already been used to seek the Big Ten bylaws; they were withheld. We are not modeling a number from another conference’s constitution, and we do not apply the Big 12 2×-distributions formula or leftover TV value.'

export const B1G_NOTES = `${B1G_NO_FEE_PLAIN} ${B1G_GOR_PLAIN} ${B1G_FOIA_PLAIN} Not a coach-firing buyout. Not part of annual capacity.`

export function b1gRecord() {
  return {
    instrument: 'bigten-gor-no-cash-fee',
    conference: 'Big Ten',
    rightsInTow: false,
    label: 'Conference exit',
    status: 'none-published',
    source: B1G_NO_FEE.source,
    url: B1G_NO_FEE.url,
    gorUrl: B1G_GOR.url,
    asOf: B1G_NO_FEE.asOf,
    confidence: 'reported',
    fee: {
      value: null,
      low: null,
      high: null,
      confidence: 'reported',
      source: B1G_NO_FEE.source,
      url: B1G_NO_FEE.url,
      asOf: B1G_NO_FEE.asOf,
      fiscalYear: null,
      notes: 'No published cash exit fee. Grant of rights through 2036. Not $0.',
    },
    grantOfRights: {
      through: B1G_GOR.through,
      pausedExtension: B1G_GOR.pausedExtension,
      url: B1G_GOR.url,
    },
    notes: 'No published cash exit fee. Grant of rights through 2036. Not $0.',
  }
}

export const PENDING_NOTES = {
  'Big Ten':
    B1G_NOTES,
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
    low: extras.low ?? null,
    high: extras.high ?? null,
    confidence: extras.confidence ?? source.confidence,
    source: extras.source ?? source.source,
    url: extras.url ?? source.url,
    asOf: extras.asOf ?? source.asOf,
    fiscalYear: extras.fiscalYear ?? null,
    notes: extras.notes ?? null,
    approx: extras.approx ?? false,
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

export function isHalfShareB12(id) {
  return B12_HALF_SHARE_IDS.includes(id)
}

export function b12Distribution(id) {
  return B12_FY2025_990[id] || null
}

export function b12ModeledFee(id) {
  const row = b12Distribution(id)
  const half = isHalfShareB12(id)
  if (half) {
    const lastFiled = row?.amount ?? null
    return {
      value: null,
      low: B12_MODELED_RANGE_LOW,
      high: B12_MODELED_RANGE_HIGH,
      lastFiled,
      lastFiledTimes2: lastFiled != null ? lastFiled * 2 : null,
      share: 'half',
      named: !!row,
    }
  }
  if (!row) {
    return {
      value: null,
      low: B12_MODELED_RANGE_LOW,
      high: B12_MODELED_RANGE_HIGH,
      lastFiled: null,
      lastFiledTimes2: null,
      share: 'full',
      named: false,
    }
  }
  return {
    value: row.amount * 2,
    low: null,
    high: null,
    lastFiled: row.amount,
    lastFiledTimes2: row.amount * 2,
    share: 'full',
    named: true,
  }
}

function b12FeeNotes(id) {
  const fee = b12ModeledFee(id)
  const row = b12Distribution(id)
  const bits = [B12_NOTES]
  if (fee.share === 'half') {
    bits.push(
      'FY2025 was a half-share year for BYU / Houston / UCF / Cincinnati; FY2026 is their first full-share year. We do not silently 2× the half-share as if that is the going-forward buyout. Headline is a modeled range from named full-share peers on the same 990 (2 × $37,879,865–$43,009,550).',
    )
    if (fee.lastFiled != null) {
      bits.push(
        `Last filed FY2025 half-share (${row.grantee}) ${fee.lastFiled.toLocaleString('en-US')} × 2 = ${fee.lastFiledTimes2.toLocaleString('en-US')} — shown as a footnote only, not the headline.`,
      )
    } else {
      bits.push(
        'Houston’s school-level FY2025 Schedule I line was not independently extracted from the 990 (Plinth’s FY2025 table names 15 of 16 grants). USA TODAY grouped Houston with the $19–23M half-share band. No fake point estimate.',
      )
    }
  } else if (fee.named) {
    bits.push(
      `Named FY2025 Schedule I line (${row.grantee}) ${fee.lastFiled.toLocaleString('en-US')} × 2 = ${fee.value.toLocaleString('en-US')}. Labeled modeled — the bylaw looks forward two membership years; this is last filed × 2, not an invoice.`,
    )
  }
  return bits.join(' ')
}

export function b12Record(id) {
  const fee = b12ModeledFee(id)
  const row = b12Distribution(id)
  return {
    instrument: 'big12-bylaw-2x-distributions',
    conference: 'Big 12',
    rightsInTow: false,
    label: 'Conference exit',
    source: B12_990.source,
    url: B12_990.url,
    bylawsUrl: B12_BYLAWS.url,
    asOf: B12_990.asOf,
    confidence: 'modeled',
    formula: {
      bylaw: '3.4',
      text: B12_FORMULA_QUOTE,
      source: B12_BYLAWS.source,
      url: B12_BYLAWS.url,
    },
    grantOfRights: {
      bylaw: '3.1',
      text: B12_GOR_QUOTE,
      plain: B12_GOR_PLAIN,
      source: B12_BYLAWS.source,
      url: B12_BYLAWS.url,
    },
    distribution: {
      fiscalYear: 'FY2025',
      amount: row?.amount ?? null,
      grantee: row?.grantee || null,
      share: fee.share,
      named: fee.named,
      source: B12_990.source,
      url: B12_990.url,
      propublica: B12_990.propublica,
    },
    fee: {
      value: fee.value,
      low: fee.low,
      high: fee.high,
      confidence: 'modeled',
      source: B12_990.source,
      url: B12_990.url,
      asOf: B12_990.asOf,
      fiscalYear: 'FY2025',
      notes: b12FeeNotes(id),
    },
    notes: B12_NOTES,
  }
}

export function ndRecord() {
  return {
    instrument: 'nd-acc-membership-hale',
    conference: 'Independent / ACC',
    rightsInTow: false,
    label: 'Conference exit',
    source: ND_HALE.source,
    url: ND_HALE.url,
    asOf: ND_HALE.asOf,
    confidence: 'modeled',
    fee: {
      value: 100_000_000,
      low: null,
      high: null,
      approx: true,
      confidence: 'modeled',
      source: ND_HALE.source,
      url: ND_HALE.url,
      asOf: ND_HALE.asOf,
      fiscalYear: null,
      notes: ND_NOTES,
    },
    notes: ND_NOTES,
  }
}

/** Current-membership instrument. Ignores historical conference remaps (Texas/OU stay SEC). */
export function conferenceExitRecord(school) {
  return school?.conferenceExit || null
}

function pendingFee(notes) {
  return fieldFrom(
    { confidence: 'pending', source: null, url: null, asOf: null },
    { value: null, confidence: 'pending', notes },
  )
}

/**
 * Year-honest headline. Settlement / bylaw / modeled cells appear on 2025–26 and later.
 * Earlier seasons stay empty — we do not back-date the ACC stair or invent a 3× budget.
 */
export function resolveConferenceExit(school, season) {
  const raw = conferenceExitRecord(school)
  if (!raw) return null
  if (season < 2025) {
    return {
      ...raw,
      fee: pendingFee(
        'Conference-exit figures on this desk start with the 2025 season (ACC settlement FY 2025–26; SEC 2023–24 bylaws and Big 12 modeled 2× 990s shown from 2025). Empty means pending.',
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
  if (raw.instrument === 'big12-bylaw-2x-distributions') {
    const modeled = b12ModeledFee(school.id)
    return {
      ...raw,
      fee: fieldFrom(B12_990, {
        value: modeled.value,
        low: modeled.low,
        high: modeled.high,
        confidence: 'modeled',
        fiscalYear: 'FY2025',
        notes: raw.fee?.notes || b12FeeNotes(school.id),
      }),
      step: null,
    }
  }
  if (raw.instrument === 'nd-acc-membership-hale') {
    return {
      ...raw,
      fee: fieldFrom(ND_HALE, {
        value: 100_000_000,
        approx: true,
        confidence: 'modeled',
        notes: ND_NOTES,
      }),
      step: null,
    }
  }
  if (raw.instrument === 'bigten-gor-no-cash-fee') {
    return {
      ...raw,
      fee: fieldFrom(B1G_NO_FEE, {
        value: null,
        confidence: 'reported',
        notes: B1G_NOTES,
      }),
      step: null,
    }
  }
  return {
    ...raw,
    fee: pendingFee(raw.notes || PENDING_NOTES[raw.conference] || 'No hosted exit schedule on the desk.'),
    step: null,
  }
}

export function conferenceExitSortValue(resolved) {
  const fee = resolved?.fee
  if (!fee) return null
  if (fee.value != null) return fee.value
  if (fee.low != null && fee.high != null) return (fee.low + fee.high) / 2
  return null
}

export function conferenceExitHeadline(resolved) {
  if (resolved?.fee?.value != null || (resolved?.fee?.low != null && resolved?.fee?.high != null)) {
    return { field: resolved.fee, kind: resolved.instrument }
  }
  return { field: resolved?.fee || null, kind: null }
}

export function conferenceExitHasValue(resolved) {
  const fee = resolved?.fee
  if (!fee) return false
  return fee.value != null || (fee.low != null && fee.high != null)
}

export function conferenceExitIsNonePublished(resolved) {
  return resolved?.instrument === 'bigten-gor-no-cash-fee'
}
