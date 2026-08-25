/** Shared on-desk definitions. Plain English, same voice as Methods. */

export const DEFS = {
  house: {
    label: 'House cap',
    text: 'Official House settlement benefits pool. $20.5 million in 2025–26 — the same number for every participating school. Not our capacity stack.',
  },
  capacity: {
    label: 'Annual capacity',
    text: 'Our public-cap stack: media + sponsorships + tickets + booked contributions + modeled extra alumni giving. Annual, not lifetime.',
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
    text: 'A desk construct: alumni cohort / wealth / giving, the conference-heuristic NIL range, the position rate card, or a named-player share of that card. Labeled as such. Not a filing.',
  },
  rosterNamed: {
    label: 'Named roster (modeled)',
    text: 'Public-roster names (ESPN) with a modeled share of the school’s football NIL pot. Starters on a verified Wikipedia two-deep get the high end of the position band; backups the low end; no rank uses the midpoint. Sum of player mids stays inside the 93% pool. Not a reported deal.',
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
