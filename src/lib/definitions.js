/** Shared on-desk definitions. Plain English, same voice as Methods. */

export const DEFS = {
  house: {
    label: 'House cap',
    text: 'Official House settlement benefits pool. $20.5 million in 2025–26 (reported) and ~$21.3 million in 2026–27 (estimated). The same number for every participating school. No House cap before 2025–26 (pre-settlement). Not our capacity stack.',
  },
  capacity: {
    label: 'Annual capacity',
    text: 'Default is booked-only: media + sponsorships + tickets + booked contributions — the filing stack. Flip on Include modeled alumni to add the Scorecard-based extra-alumni midpoint, net of booked gifts. Annual, not lifetime. Private EADA athletics revenue is a separate federal lane and is not added to this stack.',
  },
  eada: {
    label: 'EADA athletics revenue',
    text: 'Federal Equity in Athletics Disclosure Act grand total revenues for the school’s athletics department. Cited from the U.S. Dept. of Education public data file. Includes institutional support and other allocated items. Not comparable 1:1 to a public school’s Knight-Newhouse / MFRS capacity stack. We do not unpack it into tickets, sponsorships, or contributions. On private pages it sits beside conference media — the two lanes are not summed into one fake capacity.',
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
    text: 'Conference-heuristic range, not a filing. 2025–26 / 2026–27: House-era (rev-share + third-party) from the nil-ncaa.com table; low is 70% of the conference total or 50% of the $20.5M House cap for phase-in / half-share members. 2021–24: collective-era third-party only, scaled by the published national NIL market versus 2024–25. Estimates. Does not replace booked NIL.',
  },
  industryRosterEstimate: {
    label: 'Industry football roster estimate',
    text: 'A labeled modeled / survey lane. Prefer an explicit CBS Sports (Hummer/Talty, Aug 17, 2026) or SI (Fischer, Aug 27, 2026) range or tier (LSU $40–50M; Indiana $30–35M; above-$40M and other named tiers). Those stay survey — a published tier is not turned into a midpoint. Where those pieces are silent, the cell is modeled from SI’s published conference-median band (ACC $17–24M, Big 12 $18–25M, Big Ten $22–28M, SEC $25–33M) — the same band for every silent school in that league, not a school-by-school guess. The public CBS article does not publish a Power 4 average. Combines football rev-share plus third-party NIL — not a filing, not booked NIL, not House spent. Never subtracted from capacity or leftover. Not On3.',
  },
  industryPositionEstimate: {
    label: 'Industry estimate by position',
    text: 'Approximate player salaries by position. Prefer a CBS / SI position band or reported-estimate when one exists. Every other seat is a modeled range: that school’s football stack (survey range, or a documented allocation envelope for a survey tier, or the SI conference median) split by the existing rate-card seat weights (QB1 = 100). Starter and backup are ranges, not point estimates. Industry estimate, not a contract. Not booked NIL. Not On3.',
  },
  nilReportedBar: {
    label: 'NIL reported bar',
    text: 'A comparable gold band on every Power 4 + Notre Dame school page, and on the /reported-nil board. The band is that school’s industry/survey or modeled football-stack range (rev-share + third-party NIL) — not booked NIL and not House spent. Every school uses the same $0–$50M scale; $50M is the highest published or modeled top in the set (LSU survey high and the above-$40M allocation envelope). Survey tiers keep the published words on the board; rank uses the allocation envelope, not a midpoint. Booked NIL and House spent, when cited, are separate marks or a second thin track — never mixed into the reported band. Position starter ranges under the bar are a modeled/range breakdown of the same stack. The bar never enters leftover or the capacity waterfall. Not On3.',
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
    label: 'Leftover / House remaining',
    text: 'Published House Year 1 cap ($20.5 million) minus that school’s booked House spent cell. Only computed when a House Year 1 spent total is on the desk — not pre-cap, not a 990, not a cap plan, not “will spend $20.5M,” and not an industry football roster survey. A leftover of $0 is a real cell. Overhang (spent above the cap) is shown, not hidden. Texas is year-to-date. Collective 990s and industry roster estimates are not in this math. On the 2026 rank list this is still the Year 1 residual, labeled 2025–26 / House Year 1 — not a 2026–27 leftover.',
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
    text: 'A desk construct: alumni cohort / wealth / giving, the conference-heuristic NIL range, an industry football roster survey (CBS/SI), a cited industry position band, the position rate card, a named-player share of that card, or wins-per-dollar when the NIL denominator is modeled. Labeled as such. Not a filing.',
  },
  rosterNamed: {
    label: 'Named roster (modeled)',
    text: 'Public-roster names (ESPN) with a modeled share of the school’s football NIL pot. Position dollars are an allocation of the school pot across that year’s named roster, not reported player contracts. The pot is a booked school cell when a FOIA / MFRS / counsel filing exists; otherwise the on-desk conference-heuristic modeled band. Collective 990 dollars are a cited side lane and are not the allocation pot. Starters on a verified Wikipedia two-deep get the high end of the position band; backups the low end. On a full roster with no wiki rank, listed order fills starter then backup then developmental seats — not one family midpoint on every name. A cited news-URL booked player NIL is kept. Sum of player mids stays inside the 93% pool. Not a filing.',
  },
  rosterHistory: {
    label: 'Position NIL history',
    text: 'Position dollars are an allocation of the school pot across that year’s named roster, not reported player contracts. Prefer the booked school cell (FOIA / MFRS / counsel) when one exists; else the on-desk modeled school band. Collective 990 is displayed separately and is not the pot. A visible footnote under the graph names the filing or says the pot is a labeled model, then: we spread that pot across the named roster and summed this position. Not marketplace valuations.',
  },
  portal: {
    label: 'Transfer portal',
    text: 'Notable football portal additions and departures for the 2025–26 / 2026 cycle (NCAA single window Jan 2–16, 2026). Names from public ESPN/Wikipedia/school-release pages. Dollars only if a cited news number exists — otherwise name + position, no dollar.',
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
  coachFa: {
    label: 'Offsets / free agents',
    text: 'Residual School A buyout after a firing, plus an optional labeled modeled School B salary. A-side dollars and offset / mitigation rules are booked / cite-only — empty without a cite. We do not invent today’s remaining principal. Employed-elsewhere means a new job at School B/C while School A still owes a residual — two payers, not one check. Sibling to the current-chair buyout calculator, not a replacement.',
  },
  offsetCredit: {
    label: 'Offset credit',
    text: 'What School A would subtract from the residual if the employment agreement offsets new pay. Zero when the file says no offset. Dollar-for-dollar overlap with a School B salary is only computed when a sitting-HC clause is on the desk. Empty without a cited formula.',
  },
  netCostToA: {
    label: 'Net cost to A',
    text: 'School A residual minus offset credit. When the formula is none, this equals the booked residual. Booked ∧ booked stays booked; any modeled input makes the cell modeled; missing required inputs stay pending and empty.',
  },
  allInToFan: {
    label: 'All-in to fan',
    text: 'Optional sum of net cost to A plus School B compensation. Two payers — the prior school’s residual check and the new school’s salary — not one combined invoice. Off by default.',
  },
  compBand: {
    label: 'Comp band',
    text: 'USA TODAY Total Pay peers for the named season, shown as a labeled modeled / reported-database band — not FOIA PDFs. Used to place a typed School B annual. Empty without the database snapshot.',
  },
  debt: {
    label: 'Athletics debt',
    text: 'Athletics facility debt from the NCAA Membership Financial Report or a cited bond/board story — not the university’s entire balance sheet, and not part of annual capacity. Outstanding (MFRS Category 52 / Other Reporting Items) is a stock, like a buyout overhang. Annual debt service (Category 34 — principal, interest, leases, and rental fees on athletic facilities) is this year’s check. Named stadium or building projects are a cited tape only: project name, announced cost, remaining if the filing names it, through-date if named. We do not invent an amortization schedule. University-wide institutional debt stays out unless the filing itself splits an athletics-related amount. $0 is a real cell only when the filing says $0. Empty means pending.',
  },
  conferenceExit: {
    label: 'Conference exit',
    text: 'What a school would pay the conference to leave — a stock, not yearly spend, and not a coach-firing buyout. Four instruments, plus one modeled reporter estimate. ACC: settlement year ladder (FY 2025–26 / 2026 exit $165M, then −$18M a year to a $75M floor through 2036); paying the fee lets the school leave with media rights. SEC: 2023–24 bylaws §3.2.1 $30 million with-notice withdrawal fee — cash, not a rights buyback; $40M / $45M stairs are footnoted. Big 12: hosted bylaws §3.4 cash formula (sum of distributions for the final two years of membership), modeled as 2 × the last cited FY2025 Form 990 Schedule I line — labeled modeled, never booked; paying the fee does not buy back media rights (the grant of rights still sits with the league). Big Ten: no published cash exit fee (not $0); the lock is the grant of rights through 2036. Notre Dame: modeled ~$100 million Hale / 247Sports estimate of the non-football ACC membership exit — not the FSU/Clemson football ladder. Not part of annual capacity. Booked-only remains the default capacity toggle.',
  },
  guaranteeGames: {
    label: 'Guarantee games',
    text: 'How much a larger school (usually Power 4) pays a smaller opponent to play them on the football schedule — a buy-game check. Football guarantee dollars stay distinct from band or other fees. $0 only when the contract says $0 (home-and-home / no guarantee). Not House spent, not booked NIL, not a coach buyout. Empty without a hosted contract or named newsroom FOIA. We do not invent dollars.',
  },
  tape: {
    label: 'Desk tape',
    text: 'A dated log of filings that moved a Public Cap figure — booked NIL, collective 990s, contract PDFs, paid buyouts, apparel and naming, student-fee subsidies, athletics-debt filings, conference-exit filings, guarantee-game contracts, House-cap Q&As. Not a news feed. Empty means no public filing on the desk yet.',
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
