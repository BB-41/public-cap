/** Shared on-desk definitions. Plain English, same voice as Methods. */

export const DEFS = {
  house: {
    label: 'House cap',
    text: 'Official House settlement benefits pool. $20.5 million in 2025–26 (reported) and ~$21.3 million in 2026–27 (estimated). The same number for every participating school. No House cap before 2025–26 (pre-settlement). Not our capacity stack.',
  },
  capacity: {
    label: 'Annual capacity',
    text: 'Default is booked-only: media + sponsorships + tickets + booked contributions — the filing stack. Flip on Include modeled alumni to add the Scorecard-based extra-alumni midpoint, net of booked gifts. Annual, not lifetime.',
  },
  nil: {
    label: 'Booked NIL',
    text: 'FOIA, MFRS institutional NIL, or collective 990 spend we can cite. Empty means pending — we do not have a number, not that spend is zero. Booked is the official number when it exists.',
  },
  nilModeled: {
    label: 'NIL modeled',
    text: 'Conference-heuristic range, not a filing: low is 70% of the nil-ncaa.com 2026–27 conference total-roster median, or 50% of the $20.5M House cap for phase-in / half-share members. High is min(1.25× median, House + conference third-party), then scaled by capacity quartile. Estimates. Not On3 / Opendorse / NIL Go. Does not replace booked NIL.',
  },
  nilCap: {
    label: 'NIL / capacity',
    text: 'Booked NIL divided by annual capacity. Pending if we have no booked NIL figure.',
  },
  nilHouse: {
    label: 'NIL / House',
    text: 'Booked NIL divided by the $20.5M House cap. Pending if we have no booked NIL figure.',
  },
  coachPay: {
    label: 'Coach pay',
    text: 'Annual pay from the USA TODAY Sports salary desk. This year’s check, not lifetime wealth.',
  },
  buyout: {
    label: 'Buyout overhang',
    text: 'What the school would owe if it fired the coach without cause on the as-of date. A liability, not yearly spend.',
  },
  coachTerm: {
    label: 'Contract term',
    text: 'Through-year or years remaining on the current head-coach deal, cited from the employment agreement or a newsroom/school release that quotes one. Not a guess. Pending if we do not have a public through-year.',
  },
  staffPay: {
    label: 'Staff pay',
    text: 'Cited public pay for the athletic director, other head coaches, and football assistants. USA TODAY assistant and WBB tables, school releases, 990s, or state payrolls. Empty means pending — we do not invent a title or a dollar.',
  },
  earnings: {
    label: 'Official alumni earnings',
    text: 'College Scorecard median earnings, 10 years after entry. The official line. It is not net worth.',
  },
  earningsBack: {
    label: 'What backs this',
    text: 'Corroboration of the Scorecard average: BLS OEWS occupation wages for a simple school-type career mix, plus a state payroll window when one is obvious, and a rare public-company filing when we have a real EDGAR/IR link. Not a second alumni net-worth engine. Glassdoor and LinkedIn are not ingested.',
  },
  wealth: {
    label: 'Modeled wealth',
    text: 'A range only: living-alumni proxy × official earnings × 5–12× wealth-to-income. Not a silent net-worth total.',
  },
  reported: {
    label: 'reported',
    text: 'A primary public document, or a newsroom story that quotes one.',
  },
  estimated: {
    label: 'estimated',
    text: 'Desk estimate, residual, or unofficial deal term. The source is still named.',
  },
  modeled: {
    label: 'modeled',
    text: 'A desk construct: alumni cohort / wealth / giving, the conference-heuristic NIL range, the position rate card, a named-player share of that card, or wins-per-dollar when the NIL denominator is modeled. Labeled as such. Not a filing.',
  },
  rosterNamed: {
    label: 'Named roster (modeled)',
    text: 'Public-roster names (ESPN) with a modeled share of the school’s football NIL pot. Starters on a verified Wikipedia two-deep get the high end of the position band; backups the low end; no rank uses the midpoint. Sum of player mids stays inside the 93% pool. Not a reported deal.',
  },
  portal: {
    label: 'Transfer portal',
    text: 'Notable football portal additions and departures for the 2025–26 / 2026 cycle (NCAA single window Jan 2–16, 2026). Names from public ESPN/Wikipedia/school-release pages. Dollars only if a cited news number exists — otherwise name + position, no dollar. On3 is not scraped.',
  },
  apparel: {
    label: 'Apparel + naming rights',
    text: 'Current outfitter (Nike / Adidas / Under Armour / Jordan) and stadium or facility naming deals. Annual value only when a Sportico, Athletic, FOIA, or local-paper number exists. Pending otherwise.',
  },
  subsidy: {
    label: 'Student fees + institutional subsidy',
    text: 'Knight-Newhouse / NCAA MFRS allocated revenue: student fees and institutional or government support. This is where the check really came from. Reported when a school PDF or newsroom figure exists; $0 is printed only when a source says the department is self-funded. Empty means pending, not zero.',
  },
  winsPerDollar: {
    label: 'Wins per dollar',
    text: 'Last completed football season wins divided by booked NIL if we have one, else the modeled NIL midpoint (labeled modeled), and divided by annual capacity (booked-only unless the alumni toggle is on). Win totals from Wikipedia / NCAA 2025 standings. Not a ranking of coaches.',
  },
  buyoutPaid: {
    label: 'Buyouts actually paid',
    text: 'Money the school (or a new employer, via offset) actually owes or has settled with a former coach after a firing — USA TODAY, The Athletic contract census, school 990, or local FOIA. Not the if-fired overhang on the current chair.',
  },
  tape: {
    label: 'Desk tape',
    text: 'A dated log of filings that moved a Public Cap figure — booked NIL, contract PDFs, paid buyouts, apparel and naming, student-fee subsidies, House-cap Q&As. Not a news feed. Empty means no public filing on the desk yet.',
  },
  tv: {
    label: 'TV / media rights',
    text: 'Most Power 4 TV contracts are conference deals, not 68 school contracts. Holders, term, pot, and split are cited. A school media check appears only when reported or as a labeled equal-share estimate (pot ÷ members). Notre Dame’s NBC football deal is the school-level exception. CFP is one national package. Empty means pending.',
  },
  pending: {
    label: 'pending',
    text: 'We looked. We do not have a number. The cell stays empty.',
  },
}

export function defTitle(key) {
  const d = DEFS[key]
  return d ? d.text : undefined
}
