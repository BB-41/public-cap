/**
 * Season catalog for Public Cap.
 *
 * Seasons are keyed as football seasons 2021–2026 (the NIL era).
 * Athletic fiscal years run July–June and lag the fall: football
 * season Y overlaps conference FY(Y+1) (year ending June Y+1).
 *
 * Latest extracted school-level capacity stack is FY2025. It is shown
 * on football 2025 and 2026 as the latest public figures, still labeled
 * FY2025 — not invented 2026 dollars. Football 2021–2024 do not reuse
 * those FY2025 ticket / sponsorship / contribution dollars.
 */

export const CURRENT_SEASON = 2026

export const SEASONS = [
  {
    year: 2026,
    label: '2026 season',
    short: '2026',
    academic: '2026-27',
    houseKey: '2026-27',
    capacityMode: 'latest-extract',
    modeledNil: true,
    coaches: 'by-year',
  },
  {
    year: 2025,
    label: '2025',
    short: '2025',
    academic: '2025-26',
    houseKey: '2025-26',
    capacityMode: 'latest-extract',
    modeledNil: true,
    coaches: 'by-year',
  },
  {
    year: 2024,
    label: '2024',
    short: '2024',
    academic: '2024-25',
    houseKey: null,
    capacityMode: 'conference-floor',
    modeledNil: true,
    coaches: 'by-year',
  },
  {
    year: 2023,
    label: '2023',
    short: '2023',
    academic: '2023-24',
    houseKey: null,
    capacityMode: 'conference-floor',
    modeledNil: true,
    coaches: 'by-year',
  },
  {
    year: 2022,
    label: '2022',
    short: '2022',
    academic: '2022-23',
    houseKey: null,
    capacityMode: 'conference-floor',
    modeledNil: true,
    coaches: 'by-year',
  },
  {
    year: 2021,
    label: '2021',
    short: '2021',
    academic: '2021-22',
    houseKey: null,
    capacityMode: 'conference-floor',
    modeledNil: true,
    coaches: 'by-year',
  },
]

export const SEASON_BY_YEAR = Object.fromEntries(SEASONS.map((s) => [s.year, s]))

export const PRE_SETTLEMENT_HOUSE = {
  value: null,
  confidence: 'pending',
  source: null,
  url: null,
  asOf: null,
  notes: 'No House cap (pre-settlement). The NCAA House benefits pool starts 2025–26.',
}

export const PRIOR_LINE = {
  value: null,
  confidence: 'pending',
  source: null,
  url: null,
  asOf: null,
  notes: 'Prior-year line not extracted.',
}

const PENDING_PAY = {
  value: null,
  confidence: 'pending',
  source: null,
  url: null,
  asOf: null,
  notes: 'Prior-year USA TODAY salary table not extracted.',
}

/**
 * Conference affiliation overrides for the current 68-school book.
 * Default is the school’s current (2024–26) conference.
 */
const CONF_OVERRIDES = {
  texas: { 2021: 'Big 12', 2022: 'Big 12', 2023: 'Big 12' },
  oklahoma: { 2021: 'Big 12', 2022: 'Big 12', 2023: 'Big 12' },
  usc: { 2021: 'Pac-12', 2022: 'Pac-12', 2023: 'Pac-12' },
  ucla: { 2021: 'Pac-12', 2022: 'Pac-12', 2023: 'Pac-12' },
  oregon: { 2021: 'Pac-12', 2022: 'Pac-12', 2023: 'Pac-12' },
  washington: { 2021: 'Pac-12', 2022: 'Pac-12', 2023: 'Pac-12' },
  california: { 2021: 'Pac-12', 2022: 'Pac-12', 2023: 'Pac-12' },
  stanford: { 2021: 'Pac-12', 2022: 'Pac-12', 2023: 'Pac-12' },
  arizona: { 2021: 'Pac-12', 2022: 'Pac-12', 2023: 'Pac-12' },
  'arizona-state': { 2021: 'Pac-12', 2022: 'Pac-12', 2023: 'Pac-12' },
  colorado: { 2021: 'Pac-12', 2022: 'Pac-12', 2023: 'Pac-12' },
  utah: { 2021: 'Pac-12', 2022: 'Pac-12', 2023: 'Pac-12' },
  smu: { 2021: 'AAC', 2022: 'AAC', 2023: 'AAC' },
  byu: { 2021: 'Independent', 2022: 'Independent' },
  cincinnati: { 2021: 'AAC', 2022: 'AAC' },
  houston: { 2021: 'AAC', 2022: 'AAC' },
  ucf: { 2021: 'AAC', 2022: 'AAC' },
}

export function conferenceInSeason(school, year) {
  const hit = CONF_OVERRIDES[school.id]?.[year]
  return hit || school.conference
}

/**
 * Conference media floors keyed by football season.
 * Football season Y uses conference FY(Y+1) 990s (year ending June Y+1).
 * Floors are estimated school-level media/conference flow — not a school 990.
 */
const SRC = {
  usat_p4_25: {
    url: 'https://www.usatoday.com/story/sports/college/2026/05/22/power-4-conference-money-comparison-big-ten-sec-acc-big-12-pac-12-brett-yormark/90204563007/',
    label: 'USA TODAY — Power 4 FY2025 tax-return distributions',
    asOf: '2026-05-22',
    fy: 'FY2025',
  },
  b1g_25: {
    url: 'https://buckeyeswire.usatoday.com/story/sports/college/buckeyes/football/2026/05/23/big-ten-programs-revenue-distribution-numbers-ohio-state/90236918007/',
    label: 'USA TODAY / Buckeyes Wire — Big Ten FY2025 Form 990 distributions',
    asOf: '2026-05-23',
    fy: 'FY2025',
  },
  wral_acc_25: {
    url: 'https://www.wral.com/sports/acc-revenue-record-tax-documents-average-per-school-distribution-jim-phillips-may-2026/',
    label: 'WRAL / USA TODAY — ACC FY2025 full-share floor',
    asOf: '2026-05',
    fy: 'FY2025',
  },
  usat_p5_24: {
    url: 'https://www.cincinnati.com/story/sports/college/2025/05/16/sec-big-12-pac-12-tax-returns-revenues/83671479007/',
    label: 'USA TODAY — Power Five FY2024 tax returns (via Cincinnati.com)',
    asOf: '2025-05-16',
    fy: 'FY2024',
  },
  argus_b1g_24: {
    url: 'https://www.argusleader.com/story/sports/college/2025/05/06/big-ten-revenue-money-iu-purdue/83482992007/',
    label: 'Argus Leader / USA TODAY — Big Ten FY2024 full-share ~$63.2M; SEC ~$52.5M',
    asOf: '2025-05-06',
    fy: 'FY2024',
  },
  ap_p5_23: {
    url: 'https://apnews.com/article/sec-big-ten-acc-pac12-big-12-4721d67592a5daa51bbdb34a45b90e81',
    label: 'AP — Power Five FY2023 tax returns',
    asOf: '2024-05',
    fy: 'FY2023',
  },
  usat_p5_22: {
    url: 'https://www.cbssports.com/college-football/news/big-ten-leads-power-five-conferences-with-845-6-million-in-revenue-in-2022-fiscal-year-per-report/',
    label: 'CBS Sports citing USA TODAY — Power Five FY2022 tax returns',
    asOf: '2023-05-19',
    fy: 'FY2022',
  },
  usat_p5_22_primary: {
    url: 'https://www.usatoday.com/story/sports/college/2023/05/19/power-5-conferences-earnings-billions-2022/70235450007/',
    label: 'USA TODAY — Power Five FY2022 tax returns',
    asOf: '2023-05-19',
    fy: 'FY2022',
  },
  cbs_p5_23: {
    url: 'https://www.cbssports.com/college-football/news/big-ten-remains-power-five-revenue-leader-with-880-million-haul-for-2023-fiscal-year-per-report/',
    label: 'CBS Sports citing USA TODAY — Power Five FY2023 tax returns (Notre Dame ACC $22.1M)',
    asOf: '2024-05-23',
    fy: 'FY2023',
  },
  usat_aac_24: {
    url: 'https://www.commercialappeal.com/story/sports/college/memphis-tigers/2025/05/17/memphis-athletics-aac-american-athletic-conference-2024-revenue-payouts/83682673007/',
    label: 'USA TODAY / Commercial Appeal — AAC FY2024 tax-return distributions',
    asOf: '2025-05-17',
    fy: 'FY2024',
  },
  yahoo_aac_22: {
    url: 'https://sports.yahoo.com/ucf-receives-8-8-million-175200727.html',
    label: 'Yahoo / Orlando Sentinel — AAC FY2022 Form 990 distributions',
    asOf: '2023-05-05',
    fy: 'FY2022',
  },
}

function floor(value, src, notes) {
  return {
    value,
    confidence: 'estimated',
    source: src.label,
    url: src.url,
    asOf: src.asOf,
    fiscalYear: src.fy,
    notes:
      notes ||
      'Conference 990 full-share floor used as estimated media/conference flow. School-level 990 not extracted for this year. Not a ticket / sponsorship / contribution line.',
  }
}

/** Football season → conference floor (full-share / typical member). */
export const CONFERENCE_FLOORS = {
  2024: {
    'Big Ten': floor(76_000_000, SRC.b1g_25, 'FY2025 Big Ten full-share floor. Oregon/Washington were half-shares that year; we still use the floor as the conference context, not a school 990.'),
    SEC: floor(70_300_000, SRC.usat_p4_25, 'FY2025 SEC minimum to 14 full-share members. Texas/Oklahoma were phase-in.'),
    ACC: floor(42_800_000, SRC.wral_acc_25, 'FY2025 ACC minimum to 14 full-share football members.'),
    'Big 12': floor(37_900_000, SRC.usat_p4_25, 'FY2025 Big 12 full-share floor.'),
    'Independent / ACC': floor(18_100_000, SRC.wral_acc_25, 'FY2025 Notre Dame ACC distribution $18.1M (partial share as football independent). NBC football rights not added (terms not extracted for this year).'),
    Independent: null,
    'Pac-12': null,
    AAC: null,
  },
  2023: {
    'Big Ten': floor(63_200_000, SRC.argus_b1g_24, 'FY2024 Big Ten ~$63.2M to the 12 longest-standing members (tax records).'),
    SEC: floor(52_500_000, SRC.argus_b1g_24, 'FY2024 SEC average ~$52.5M to the 14 schools other than Oklahoma and Texas.'),
    ACC: floor(43_100_000, SRC.usat_p5_24, 'FY2024 ACC per-school range $43.1–46.4M (Notre Dame $20.7M). Floor uses the low end.'),
    'Big 12': floor(37_800_000, SRC.usat_p5_24, 'FY2024 Big 12 established-member range $37.8–42.1M; newcomers ~$20M. Floor uses the established low end.'),
    'Pac-12': floor(30_150_000, SRC.usat_p5_24, 'FY2024 Pac-12 tax-return payouts: $30.15M to each of the 10 departing schools (Oregon/UCLA/USC/Washington/Cal/Stanford/Arizona/ASU/Colorado/Utah); $46.6M to Oregon State and Washington State. Equal-share check: (10 × $30.15M) + (2 × $46.6M) = $394.7M; $394.7M / 12 = $32.9M (USA TODAY 12-school average). Floor uses the $30.15M departing-school figure those 10 book members received.'),
    AAC: floor(10_400_000, SRC.usat_aac_24, 'FY2024 AAC SMU distribution $10.4M. Only 2023 book member still in the AAC; conference does not pay an equal share (Memphis $11.0M high / Wichita State $3.3M low).'),
    Independent: null,
    'Independent / ACC': floor(20_700_000, SRC.usat_p5_24, 'FY2024 Notre Dame ACC distribution $20.7M. NBC football rights not added (terms not extracted for this year).'),
  },
  2022: {
    'Big Ten': floor(60_500_000, SRC.ap_p5_23, 'FY2023 Big Ten ~$60.5M per school ($58.8M to 2014 additions).'),
    SEC: floor(51_000_000, SRC.ap_p5_23, 'FY2023 SEC ~$51M per school.'),
    ACC: floor(43_300_000, SRC.ap_p5_23, 'FY2023 ACC range $43.3–46.9M. Floor uses the low end.'),
    'Big 12': floor(43_800_000, SRC.ap_p5_23, 'FY2023 Big 12 range $43.8–48.2M. Floor uses the low end.'),
    'Pac-12': floor(33_600_000, SRC.ap_p5_23, 'FY2023 Pac-12 ~$33.6M per school.'),
    AAC: null,
    Independent: null,
    'Independent / ACC': floor(22_100_000, SRC.cbs_p5_23, 'FY2023 Notre Dame ACC distribution $22.1M (partial share as football independent). NBC football rights not added.'),
  },
  2021: {
    'Big Ten': floor(58_800_000, SRC.usat_p5_22, 'FY2022 Big Ten ~$58.8M to 11 of 14 members (Nebraska/Maryland/Rutgers several million less).'),
    SEC: floor(49_900_000, SRC.usat_p5_22, 'FY2022 SEC ~$49.9M per member.'),
    ACC: floor(37_900_000, SRC.usat_p5_22, 'FY2022 ACC range $37.9–41.3M. Floor uses the low end.'),
    'Big 12': floor(42_000_000, SRC.usat_p5_22, 'FY2022 Big 12 range $42–44.9M. Floor uses the low end.'),
    'Pac-12': floor(37_000_000, SRC.usat_p5_22, 'FY2022 Pac-12 ~$37M per member (conference release; USA TODAY noted a possible amended return).'),
    AAC: floor(8_280_000, SRC.yahoo_aac_22, 'FY2022 AAC 990 payouts to 2021 book members: Cincinnati $11.32M, UCF $8.88M, Houston $8.28M, SMU $8.28M. Floor uses the $8.28M low end. Conference does not pay an equal share ($93.83M distributed across 12 members).'),
    Independent: null,
    'Independent / ACC': floor(17_400_000, SRC.usat_p5_22, 'FY2022 Notre Dame ACC distribution $17.4M. NBC football rights not added.'),
  },
}

function pendingMedia(notes) {
  return {
    ...PRIOR_LINE,
    notes: notes || 'Prior-year conference distribution not extracted for this affiliation.',
  }
}

export function mediaForSeason(school, year) {
  const conf = conferenceInSeason(school, year)
  const row = CONFERENCE_FLOORS[year]?.[conf]
  if (row && row.value != null) return row
  return pendingMedia(
    `Prior-year conference distribution not extracted (${conf}, football ${year}).`
  )
}

export function houseFieldForSeason(meta, year) {
  if (year >= 2026) return meta.houseCap.y2026_27
  if (year === 2025) return meta.houseCap.y2025_26
  return PRE_SETTLEMENT_HOUSE
}

export function houseValueForSeason(meta, year) {
  const f = houseFieldForSeason(meta, year)
  return f && f.value != null ? Number(f.value) : null
}

function pendingNil(notes) {
  return {
    value: null,
    confidence: 'pending',
    source: null,
    url: null,
    asOf: null,
    notes:
      notes ||
      'No booked FOIA / MFRS / collective 990 figure on the desk for this season.',
  }
}

function emptyCoach() {
  return {
    name: '—',
    pay: { ...PENDING_PAY },
    buyout: { ...PENDING_PAY },
    term: {
      confidence: 'pending',
      notes: 'No chair of record on the desk for this football season.',
    },
  }
}

function clone(obj) {
  return obj == null ? obj : JSON.parse(JSON.stringify(obj))
}

function yearKey(book, year) {
  if (!book) return null
  return book[year] || book[String(year)] || null
}

/** Chair of record for a football season. A year key wins; we do not fall back to the current hire. */
export function coachesForSeason(school, year) {
  const row = yearKey(school.coachesByYear, year)
  if (row) {
    return {
      football: clone(row.football) || emptyCoach(),
      mbb: clone(row.mbb) || emptyCoach(),
    }
  }
  return {
    football: emptyCoach(),
    mbb: emptyCoach(),
  }
}

function assistantNameKey(staff) {
  return (staff?.assistants || []).map((a) => a.name).join('|')
}

/** True when two year keys list the same assistant names (a silent directory clone). */
export function staffRowsAreClone(a, b) {
  if (!a || !b) return false
  const na = assistantNameKey(a)
  const nb = assistantNameKey(b)
  return na.length > 0 && na === nb
}

export function emptyStaffForSeason(year) {
  if (year === 2025) {
    return {
      athleticDirector: {
        confidence: 'pending',
        asOf: null,
        notes:
          'No year-accurate 2025 staff tape on the desk. We do not show the 2026 official directory or 2024 USA TODAY assistant dollars as 2025.',
      },
      office: [],
      otherHeadCoaches: [],
      assistants: [],
      notes:
        'No year-accurate 2025 football staff directory on the desk. Honest empty — not a 2026 clone and not 2024 USA TODAY pay.',
    }
  }
  if (year <= 2023) {
    return {
      athleticDirector: {
        confidence: 'pending',
        asOf: null,
        notes: `No year-accurate ${year} staff tape on the desk.`,
      },
      office: [],
      otherHeadCoaches: [],
      assistants: [],
      notes: `${year} USA TODAY assistant table not on this school. Same staffByYear.${year} slot as 2024 — do not copy 2024 or 2026 onto this year.`,
    }
  }
  return {
    athleticDirector: {
      confidence: 'pending',
      asOf: null,
      notes: 'Prior-year staff pay not extracted.',
    },
    office: [],
    otherHeadCoaches: [],
    assistants: [],
    notes:
      'Prior-year assistants not on this desk. USA TODAY assistant dollars (as of Dec 18, 2024) live on staffByYear.2024 only. We do not show 2026 staff on earlier years.',
  }
}

/**
 * Year-keyed staff only. A year key wins.
 * 2026 may fall back to the current official directory (`school.staff`).
 * 2025 never inherits 2026 — a missing or cloned 2025 key is an honest empty.
 * 2024 is the USA TODAY contract-year tape when present.
 */
export function staffForSeason(school, year) {
  const row = yearKey(school.staffByYear, year)
  if (year === 2025 && row) {
    const current = yearKey(school.staffByYear, CURRENT_SEASON) || school.staff
    if (staffRowsAreClone(row, current)) return emptyStaffForSeason(2025)
    return clone(row)
  }
  if (row) return clone(row)
  if (year === CURRENT_SEASON) return clone(school.staff) || emptyStaffForSeason(year)
  return emptyStaffForSeason(year)
}

export function applySeason(school, year) {
  const spec = SEASON_BY_YEAR[year] || SEASON_BY_YEAR[CURRENT_SEASON]
  const bookConference = school.conference
  const conference = conferenceInSeason(school, year)
  const out = {
    ...school,
    conference,
    _bookConference: bookConference,
    _season: spec,
    _seasonYear: spec.year,
  }

  if (spec.capacityMode === 'conference-floor') {
    const media = mediaForSeason(school, year)
    const priv = !!school.private
    out.capacity = {
      fiscalYearPrimary: `FY${year + 1}`,
      fiscalYearNote:
        `Football ${year} (${spec.academic}). Capacity uses a cited conference-year media floor when we have one; tickets, sponsorships, and contributions stay pending — prior-year line not extracted. We do not reuse FY2025 school dollars as ${year}.`,
      gapNote: priv
        ? school.capacity?.gapNote ||
          'Private institution. Tickets, sponsorships, and athletic contributions are a revenue gap.'
        : undefined,
      mediaConference: media,
      sponsorships: priv
        ? { ...PRIOR_LINE, notes: 'Private-school gap. Prior-year line not extracted.' }
        : { ...PRIOR_LINE },
      tickets: priv
        ? { ...PRIOR_LINE, notes: 'Private-school gap. Prior-year line not extracted.' }
        : { ...PRIOR_LINE },
      contributions: priv
        ? { ...PRIOR_LINE, notes: 'Private-school gap. Prior-year line not extracted.' }
        : { ...PRIOR_LINE },
    }
  } else {
    out.capacity = {
      ...school.capacity,
      fiscalYearNote: [
        school.capacity?.fiscalYearNote,
        `Football ${year} (${spec.academic}). Latest extracted school-level stack is FY2025; FY2026/27 filings are not on the desk. Shown as the latest public figures, not invented ${year} dollars.`,
      ]
        .filter(Boolean)
        .join(' '),
    }
  }

  const nil = { ...(school.nil || {}) }
  if (year === 2025) {
    // House Year 1 window — booked figures stay. FY2025 preCap stays as a companion cell.
  } else if (year === 2024 && school.nil?.preCap && school.nil.preCap.value != null) {
    nil.booked = {
      ...school.nil.preCap,
      notes:
        (school.nil.preCap.notes || '') +
        ' Shown on football 2024 as the cited FY2025 institutional NIL line.',
    }
    delete nil.preCap
  } else {
    nil.booked = pendingNil(
      year >= 2026
        ? '2026–27 booked NIL not extracted. House Year 1 (2025–26) and FY2025 MFRS cells stay on those seasons.'
        : 'No booked FOIA / MFRS / collective 990 figure on the desk for this season.'
    )
    delete nil.preCap
  }
  if (year !== 2025) delete nil.preCap
  out.nil = nil

  out.coaches = coachesForSeason(school, year)
  out.staff = staffForSeason(school, year)

  return out
}

export function seasonLabel(year) {
  const s = SEASON_BY_YEAR[year]
  return s ? s.label : String(year)
}

export function chipsForSeason(year) {
  const base = [
    { id: 'all', label: 'All' },
    { id: 'SEC', label: 'SEC' },
    { id: 'Big Ten', label: 'B1G' },
    { id: 'ACC', label: 'ACC' },
    { id: 'Big 12', label: 'Big 12' },
    { id: 'ND', label: 'ND' },
  ]
  if (year <= 2023) {
    base.splice(5, 0, { id: 'Pac-12', label: 'Pac-12' })
  }
  if (year <= 2023) {
    base.splice(-1, 0, { id: 'AAC', label: 'AAC' })
  }
  return base
}

export function parseSeasonParam(raw) {
  const n = Number(raw)
  return SEASON_BY_YEAR[n] ? n : CURRENT_SEASON
}
