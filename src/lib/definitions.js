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
    text: 'FOIA, MFRS institutional NIL, or counsel spent totals we can cite. Collective Form 990s sit on a separate lane and never overwrite booked House / Item 44. Empty means pending — we do not have a number, not that spend is zero. Booked is the official institutional number when it exists.',
  },
  nilCollective990: {
    label: 'Collective 990',
    text: 'A third-party 501(c)(3) (or other public Form 990) line that names grants to individuals, athlete service compensation, or student-athlete appearances. Lagged. Not a House spent total, not Item 44, not a player contract. Never added to booked NIL, pre-cap, capacity, or the booked-only rank. Position allocation stays on booked-then-modeled only.',
  },
  nilModeled: {
    label: 'NIL modeled',
    text: 'Conference-heuristic range, not a filing. 2025–26 / 2026–27: House-era (rev-share + third-party) from the nil-ncaa.com table; low is 70% of the conference total or 50% of the $20.5M House cap for phase-in / half-share members. 2021–24: collective-era third-party only, scaled by the published national NIL market versus 2024–25. Estimates. Not an On3 / Opendorse / NIL Go player scrape. Does not replace booked NIL.',
  },
  nilCap: {
    label: 'NIL / capacity',
    text: 'Booked NIL divided by annual capacity. Pending if we have no booked NIL figure.',
  },
  nilHouse: {
    label: 'NIL / House',
    text: 'Booked NIL divided by the $20.5M House cap. Pending if we have no booked NIL figure.',
  },
  houseRemaining: {
    label: 'House remaining room',
    text: 'Published House Year 1 cap ($20.5 million) minus that school’s booked House spent cell. Only computed when a House Year 1 spent total is on the desk — not pre-cap, not a 990, not a cap plan. A leftover of $0 is a real cell. Overhang (spent above the cap) is shown, not hidden. Texas is year-to-date. Collective 990s are not in this math.',
  },
  coachPay: {
    label: 'Coach pay',
    text: 'Annual pay for the chair of record in the selected football season. A current-chair file wins when it publishes a dollar; USA TODAY is fallback only when that year’s file has no dollar. A new hire’s number is not copied onto a prior chair. This year’s check, not lifetime wealth. Incentives stay out of the annual cell.',
  },
  buyout: {
    label: 'Buyout overhang',
    text: 'What the school would owe if it fired the coach without cause on the as-of date. A liability, not yearly spend.',
  },
  coachTerm: {
    label: 'Contract term',
    text: 'Through-year or years remaining on the current head-coach deal, cited from the employment agreement or a newsroom/school release that quotes one. Public-school buyouts prefer the file; articles are fallback only when no current file is loaded. Not a guess. Pending if we do not have a public through-year.',
  },
  staffPay: {
    label: 'Staff pay',
    text: 'Cited public pay for the athletic director, other head coaches, and football assistants, keyed to the selected football season. Football assistant dollars for 2021–2024 are the USA TODAY contract year from each team page (row asOf, not a current 2026 salary). Titles are not invented. 2026 shows the official directory; assistant pay stays pending unless a cited 2026 dollar exists. Athletic-director pay is year-pinned from USA TODAY Network stories or state payroll / FOIA / board minutes — not invented, and not copied from a prior AD onto a new chair. 2025 stays empty without a year-accurate tape. Empty means pending — we do not invent a title or a dollar.',
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
    text: 'Public-roster names (ESPN) with a modeled share of the school’s football NIL pot. Position dollars are an allocation of the school pot across that year’s named roster, not reported player contracts. The pot is a booked school cell when a FOIA / MFRS / counsel filing exists; otherwise the on-desk conference-heuristic modeled band. Collective 990 dollars are a cited side lane and are not the allocation pot. Starters on a verified Wikipedia two-deep get the high end of the position band; backups the low end; no rank uses the midpoint. Sum of player mids stays inside the 93% pool. Not a filing. Not an On3 / Opendorse player value.',
  },
  rosterHistory: {
    label: 'Position NIL history',
    text: 'Position dollars are an allocation of the school pot across that year’s named roster, not reported player contracts. Prefer the booked school cell (FOIA / MFRS / counsel) when one exists; else the on-desk modeled school band. Collective 990 is displayed separately and is not the pot. A visible footnote under the graph names the filing or says the pot is a labeled model, then: we spread that pot across the named roster and summed this position. Not marketplace valuations.',
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
    text: 'Student fees are not tuition. They are a dedicated or allocated athletic fee (or a slice of a student activity fee) that athletics booked that year — an annual department total, NCAA MFRS line 3, already the receipt, not a rate to multiply. Institutional support is the university writing a check (MFRS line 4) or, when only Knight-Newhouse is on the desk, KN’s combined allocated-support line. Government is the tax/state slice (MFRS line 2) when a source splits it. Implied per-student is that booked total spread across the enrollment proxy, not a published fee schedule. Published rate × enrollment is shown only when a feeRate is already on the desk — labeled calculated, both inputs cited. $0 means the filing says self-funded or $0 on that line. Empty means pending.',
  },
  winsPerDollar: {
    label: 'Wins per dollar',
    text: 'Last completed football season wins divided by booked NIL if we have one, else the modeled NIL midpoint (labeled modeled), and divided by annual capacity (booked-only unless the alumni toggle is on). Win totals from Wikipedia / NCAA 2025 standings. Not a ranking of coaches.',
  },
  buyoutPaid: {
    label: 'Buyouts actually paid',
    text: 'Money the school (or a new employer, via offset) actually owes or has settled with a former coach after a firing — USA TODAY, The Athletic contract census, school 990, or local FOIA. Not the if-fired overhang on the current chair.',
  },
  debt: {
    label: 'Athletics debt',
    text: 'Athletics facility debt from the NCAA Membership Financial Report or a cited bond/board story — not the university’s entire balance sheet, and not part of annual capacity. Outstanding (MFRS Category 52 / Other Reporting Items) is a stock, like a buyout overhang. Annual debt service (Category 34 — principal, interest, leases, and rental fees on athletic facilities) is this year’s check. Named stadium or building projects are a cited tape only: project name, announced cost, remaining if the filing names it, through-date if named. We do not invent an amortization schedule. University-wide institutional debt stays out unless the filing itself splits an athletics-related amount. $0 is a real cell only when the filing says $0. Empty means pending.',
  },
  conferenceExit: {
    label: 'Conference exit',
    text: 'What a school would pay the conference to leave — a stock, not yearly spend, and not a coach-firing buyout. Four instruments, plus one modeled reporter estimate. ACC: settlement year ladder (FY 2025–26 / 2026 exit $165M, then −$18M a year to a $75M floor through 2036); paying the fee lets the school leave with media rights. SEC: 2023–24 bylaws §3.2.1 $30 million with-notice withdrawal fee — cash, not a rights buyback; $40M / $45M stairs are footnoted. Big 12: hosted bylaws §3.4 cash formula (sum of distributions for the final two years of membership), modeled as 2 × the last cited FY2025 Form 990 Schedule I line — labeled modeled, never booked; paying the fee does not buy back media rights (the grant of rights still sits with the league). Big Ten: no published cash exit fee (not $0); the lock is the grant of rights through 2036. Notre Dame: modeled ~$100 million Hale / 247Sports estimate of the non-football ACC membership exit — not the FSU/Clemson football ladder. Not part of annual capacity. Booked-only remains the default capacity toggle.',
  },
  tape: {
    label: 'Desk tape',
    text: 'A dated log of filings that moved a Public Cap figure — booked NIL, collective 990s, contract PDFs, paid buyouts, apparel and naming, student-fee subsidies, athletics-debt filings, conference-exit filings, House-cap Q&As. Not a news feed. Empty means no public filing on the desk yet.',
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
