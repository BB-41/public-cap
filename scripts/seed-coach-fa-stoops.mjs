/**
 * Seed Mark Stoops (employed-elsewhere, Kentucky residual, no offset).
 * Cite-only dollars. Syncs data/ and public/data/.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const dataPath = new URL('../data/coach-fa.json', import.meta.url)
const pubPath = new URL('../public/data/coach-fa.json', import.meta.url)
const book = JSON.parse(readFileSync(dataPath, 'utf8'))

book.meta.asOf = '2026-09-05'
book.meta.scope =
  'Fired Power 4 football head coaches still carrying a cited residual buyout — including chairs now employed at another school while School A still pays. School A residual and offset rules are booked / cite-only (reported when the cite is a newsroom figure, not a hosted EA). School B salary may be a labeled modeled input.'
book.meta.notes =
  'Sibling to the current-chair /buyout calculator. A-side dollars stay empty without a cite. We do not invent today’s remaining principal, and we do not invent an offset credit when the file says none. Optional all-in is A residual + B salary — two payers, off by default. 2025 carousel chairs are reported newsroom / census figures, not FOIA PDFs. Employed-elsewhere means a new job at School B/C while School A still owes a residual — A and B stay separate payers.'

const stoopsSources = [
  'The Athletic March 2026 contract census — Mark Stoops Kentucky residual $37.6M* guaranteed through April 2031, no mitigation',
  'Courier Journal / USA TODAY Network — Stoops separation $37,687,500 (~$37.69M); $3,937,500 lump within 15 days; $6.75M/year quarterly through April 1, 2031; payments not subject to mitigation',
  'Courier Journal (March 2, 2026) — Stoops hired at Texas as special assistant to Steve Sarkisian; Texas salary not announced',
]
for (const line of stoopsSources) {
  if (!book.meta.sources.includes(line)) book.meta.sources.push(line)
}

Object.assign(book.cites, {
  'cj-stoops-buyout-2025-12-08': {
    id: 'cj-stoops-buyout-2025-12-08',
    label: 'Courier Journal / USA TODAY Network (Dec. 8, 2025) — Stoops Kentucky buyout agreement',
    url: 'https://www.cincinnati.com/story/sports/college/kentucky/2025/12/08/mark-stoops-kentucky-buyout-agreement-details-money-owed-fired-uk-football-coach-will-stein-contract/87608348007/',
    asOf: '2025-12-08',
    confidence: 'reported',
  },
  'cj-stoops-texas-2026-03-02': {
    id: 'cj-stoops-texas-2026-03-02',
    label: 'Courier Journal (March 2, 2026) — Stoops hired at Texas; salary not announced',
    url: 'https://www.courier-journal.com/story/sports/college/kentucky/2026/03/02/mark-stoops-texas-longhorns-salary-job-kentucky-football-coach-sec-coaching-carousel-uk-wildcats/85583860007/',
    asOf: '2026-03-02',
    confidence: 'reported',
  },
})

book.coaches['mark-stoops'] = {
  id: 'mark-stoops',
  name: 'Mark Stoops',
  status: 'employed-elsewhere',
  sport: 'fb',
  priorSchoolId: 'kentucky',
  currentEmployerSchoolId: 'texas',
  currentJobTitle: 'Special assistant to the head coach',
  tapeId: 'kentucky-paid-buyout-stoops-2026-03-03',
  contract: {
    schoolId: 'kentucky',
    role: 'football-hc',
    signed: '2023-01',
    through: '2031-04-01',
    confidence: 'reported',
    citeIds: ['cj-stoops-buyout-2025-12-08', 'athletic-census-2026-03-03'],
  },
  buyout: {
    firedOn: '2025-12-01',
    cause: 'without-cause',
    grossRemaining: 37600000,
    grossRemainingKind: 'reported-at-termination',
    asOf: '2025-12-01',
    confidence: 'reported',
    rangeLow: 37600000,
    rangeHigh: 37687500,
    notes:
      'Unpaid balance as of 2026-09-05 is not ledger-verified. The cited remaining principal is the termination-date / census figure. The payment window continues through April 1, 2031. We do not invent today’s remaining principal. We print one cited figure — The Athletic census $37.6 million (starred) guaranteed through April 2031. Courier Journal / USA TODAY Network, quoting the separation agreement: $37,687,500 (~$37.69M). We leave the open-records figure in the range and do not invent a reconciled total or today’s unpaid principal.',
    schedule: [
      {
        kind: 'lump',
        label: 'Lump within 15 days of termination',
        amount: 3937500,
        due: 'within 15 days',
        confidence: 'reported',
        notes: 'Courier Journal / USA TODAY Network quoting the separation agreement.',
      },
      {
        kind: 'annual',
        label: '$6.75 million a year, quarterly, through April 1, 2031',
        amount: 6750000,
        through: '2031-04-01',
        confidence: 'reported',
        notes: 'Courier Journal: quarterly installments. Per-quarter dollar not separately ledger-verified.',
      },
    ],
    citeIds: [
      'athletic-census-2026-03-03',
      'cj-stoops-buyout-2025-12-08',
    ],
  },
  offset: {
    offsetFormula: 'none',
    offsetApplies: false,
    paragraph: null,
    asOf: '2025-12-01',
    rule: 'No mitigation. Courier Journal, quoting the separation agreement: payments are not subject to mitigation. Athletic census: $37.6 million guaranteed. A new job at Texas does not reduce what Kentucky owes. Typing a modeled School B salary does not reduce A.',
    confidence: 'reported',
    citeIds: [
      'cj-stoops-buyout-2025-12-08',
      'athletic-census-2026-03-03',
      'cj-stoops-texas-2026-03-02',
    ],
  },
  currentEmployer: {
    schoolId: 'texas',
    jobTitle: 'Special assistant to the head coach',
    asOf: '2026-03-02',
    annualSalary: null,
    confidence: 'reported',
    notes: 'Courier Journal: hired at Texas on the staff of Steve Sarkisian. Texas has not announced a salary. The cell stays empty — we do not invent a dollar.',
    citeIds: ['cj-stoops-texas-2026-03-02'],
  },
  defaultScenario: {
    schoolBId: 'texas',
    jobType: 'analyst',
    annualSalary: null,
    termYears: null,
  },
  citeIds: [
    'athletic-census-2026-03-03',
    'cj-stoops-buyout-2025-12-08',
    'cj-stoops-texas-2026-03-02',
    'usat-salaries-2025',
  ],
}

const json = `${JSON.stringify(book, null, 2)}\n`
writeFileSync(dataPath, json)
writeFileSync(pubPath, json)
console.log('seeded mark-stoops · synced data/ and public/data/')
