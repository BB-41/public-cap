/** Scorecard corroboration — labor-market context, not a second wealth engine.
 *  No LinkedIn / Glassdoor / On3 / Opendorse / NIL Go / social ingest.
 */

const TECH_IDS = new Set([
  'georgia-tech',
  'virginia-tech',
  'texas-tech',
  'purdue',
  'nc-state',
])

/** Official / well-known state open-payroll or transparency sites only. Skip if not obvious. */
const STATE_PAYROLL = {
  TX: {
    state: 'Texas',
    name: 'Texas Comptroller — Transparency',
    url: 'https://www.texastransparency.org/',
    notes: 'State open-finance portal. Public-university alumni who land on the state payroll can show up in Comptroller-derived salary tapes (e.g. newsroom explorers of those records). Not a school earnings figure.',
  },
  OH: {
    state: 'Ohio',
    name: 'Ohio Checkbook — state employee salaries',
    url: 'https://checkbook.ohio.gov/Salaries/State.aspx',
    notes: 'Official Ohio Checkbook salary tape. Exists for public-university alumni on the state payroll. Not a school earnings figure.',
  },
  CA: {
    state: 'California',
    name: 'California State Controller — Government Compensation',
    url: 'https://www.publicpay.ca.gov/',
    notes: 'Official public-employer compensation site (includes UC when the campus reports). Not a school earnings figure.',
  },
  FL: {
    state: 'Florida',
    name: 'State of Florida employee salaries',
    url: 'https://salaries.myflorida.com/',
    notes: 'Official People First salary tape for state agencies. It does not include the state university system. Still the public payroll window for alumni in state government. Not a school earnings figure.',
  },
}

/** Fat-tail public filings only where the alum + EDGAR/IR link is obvious. Skip rather than guess. */
const NOTABLE_FILINGS = {
  texas: [
    {
      name: 'Michael Dell',
      role: 'Chairman and CEO, Dell Technologies',
      note: 'Attended UT Austin (did not graduate). Fat-tail illustration, not a cohort average.',
      url: 'https://www.sec.gov/Archives/edgar/data/1571996/000119312526226734/d132444ddef14a.htm',
      source: 'Dell Technologies DEF 14A (2026 annual meeting)',
      confidence: 'reported',
    },
  ],
  'notre-dame': [
    {
      name: 'Brian T. Moynihan',
      role: 'Chair and CEO, Bank of America',
      note: 'Notre Dame Law. Fat-tail illustration, not a cohort average.',
      url: 'https://www.sec.gov/Archives/edgar/data/70858/000119312526118929/d43888ddef14a.htm',
      source: 'Bank of America DEF 14A (2026)',
      confidence: 'reported',
    },
  ],
  stanford: [
    {
      name: 'Jen-Hsun (Jensen) Huang',
      role: 'President and CEO, NVIDIA',
      note: 'Stanford MSEE. Fat-tail illustration, not a cohort average.',
      url: 'https://www.sec.gov/Archives/edgar/data/1045810/000104581026000036/nvda-20260512.htm',
      source: 'NVIDIA DEF 14A (filed 2026-05-12)',
      confidence: 'reported',
    },
  ],
  michigan: [
    {
      name: 'Larry Page',
      role: 'Co-founder and director, Alphabet',
      note: 'Michigan B.S.E. (computer engineering, 1995). Fat-tail illustration, not a cohort average.',
      url: 'https://www.sec.gov/Archives/edgar/data/1652044/000130817925000511/goog012701-def14a.htm',
      source: 'Alphabet DEF 14A (2025)',
      confidence: 'reported',
    },
  ],
}

const OEWS_TABLE = 'https://www.bls.gov/news.release/ocwage.t01.htm'
const OEWS_ASOF = 'May 2025'

/** National OEWS. Annual median = published median hourly × 2,080 (BLS standard year). Mean used only when that is the BLS-highlighted annual figure. */
const OCC = {
  accountants: {
    title: 'Accountants and auditors',
    soc: '13-2011',
    url: 'https://www.bls.gov/oes/current/oes132011.htm',
    annual: 83678,
    stat: 'median',
    confidence: 'reported',
  },
  opsManagers: {
    title: 'General and operations managers',
    soc: '11-1021',
    url: 'https://www.bls.gov/oes/current/oes111021.htm',
    annual: 105768,
    stat: 'median',
    confidence: 'reported',
  },
  nurses: {
    title: 'Registered nurses',
    soc: '29-1141',
    url: 'https://www.bls.gov/oes/current/oes291141.htm',
    annual: 101420,
    stat: 'mean',
    confidence: 'reported',
  },
  software: {
    title: 'Software developers',
    soc: '15-1252',
    url: 'https://www.bls.gov/oes/current/oes151252.htm',
    annual: 135990,
    stat: 'median',
    confidence: 'reported',
  },
  cisManagers: {
    title: 'Computer and information systems managers',
    soc: '11-3021',
    url: 'https://www.bls.gov/oes/current/oes113021.htm',
    annual: 175136,
    stat: 'median',
    confidence: 'reported',
  },
  elecEng: {
    title: 'Electrical engineers',
    soc: '17-2071',
    url: 'https://www.bls.gov/oes/current/oes172071.htm',
    annual: null,
    stat: null,
    confidence: 'reported',
  },
  lawyers: {
    title: 'Lawyers',
    soc: '23-1011',
    url: 'https://www.bls.gov/oes/current/oes231011.htm',
    annual: 159661,
    stat: 'median',
    confidence: 'reported',
  },
  finManagers: {
    title: 'Financial managers',
    soc: '11-3031',
    url: 'https://www.bls.gov/oes/current/oes113031.htm',
    annual: 166566,
    stat: 'median',
    confidence: 'reported',
  },
  mgmtAnalysts: {
    title: 'Management analysts',
    soc: '13-1111',
    url: 'https://www.bls.gov/oes/current/oes131111.htm',
    annual: null,
    stat: null,
    confidence: 'reported',
  },
}

const MIXES = {
  flagshipPublic: {
    key: 'flagshipPublic',
    label: 'flagship public',
    occupations: [OCC.accountants, OCC.nurses, OCC.opsManagers, OCC.software],
  },
  tech: {
    key: 'tech',
    label: 'tech / engineering',
    occupations: [OCC.software, OCC.cisManagers, OCC.elecEng, OCC.accountants],
  },
  privateElite: {
    key: 'privateElite',
    label: 'private elite',
    occupations: [OCC.lawyers, OCC.finManagers, OCC.mgmtAnalysts, OCC.software],
  },
}

export function schoolCareerMix(school) {
  if (TECH_IDS.has(school.id)) return MIXES.tech
  if (school.private) return MIXES.privateElite
  return MIXES.flagshipPublic
}

export function stateAbbr(school) {
  const city = school.city || ''
  const m = city.match(/,\s*([A-Z]{2})\s*$/)
  return m ? m[1] : null
}

export function oewsStateUrl(abbr) {
  if (!abbr) return null
  return `https://www.bls.gov/oes/current/oes_${abbr.toLowerCase()}.htm`
}

export function earningsBack(school) {
  const mix = schoolCareerMix(school)
  const abbr = stateAbbr(school)
  const scorecardUrl = school.alumni?.scorecardUrl || school.scorecardUrl
  return {
    mix,
    scorecardUrl,
    oewsTableUrl: OEWS_TABLE,
    oewsAsOf: OEWS_ASOF,
    oewsState: abbr
      ? { abbr, url: oewsStateUrl(abbr), confidence: 'reported' }
      : null,
    statePayroll: abbr && STATE_PAYROLL[abbr] ? STATE_PAYROLL[abbr] : null,
    filings: NOTABLE_FILINGS[school.id] || null,
  }
}
