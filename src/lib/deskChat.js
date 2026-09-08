/**
 * Deterministic desk chat. Answers come from the public JSON only.
 * No hosted model. Empty cells stay pending. Booked and modeled stay distinct.
 */

import {
  computeCapacity,
  displayCap,
  hasVal,
  collective990Cells,
  leadBookedNil,
  leadHouseRemaining,
} from './compute.js'
import { DEFS } from './definitions.js'
import { money, moneyExact, moneyRange } from './format.js'
import { modeledNilForSeason } from './nilModel.js'
import {
  industryRosterEstimate,
  rosterEstimateDisplay,
  ROSTER_ESTIMATE_HASH,
} from './rosterEstimate.js'
import {
  detectPositionFamily,
  industryPositionEstimates,
  positionEstimateDisplay,
  positionEstimateFor,
  positionLabel,
  POSITION_ESTIMATE_HASH,
  FOOTBALL_POSITIONS,
} from './positionEstimate.js'
import {
  footballRosterStack,
  reportedNilBar,
  REPORTED_BAR_HASH,
  REPORTED_NIL_PATH,
  stackFormula,
  stackPositionRows,
} from './rosterStack.js'
import { applySeason, CURRENT_SEASON, houseFieldForSeason, houseValueForSeason } from './seasons.js'
import { comparePath, schoolPath } from './share.js'
import { deskMedia, schoolCheck } from './tv.js'
import { getCoach, hasDollar, listCoaches } from './coachFa.js'

export const CHAT_VOICE =
  'Lookup only. Grounded in the public desk JSON. Empty stays empty. Booked and modeled stay distinct.'

export const SUGGESTED_PROMPTS = [
  "What's Louisville's leftover / House spent / booked NIL?",
  'Which schools have booked House spent?',
  'What NIL do you have for Texas?',
  'What data is missing for SMU?',
  'What is booked vs modeled vs pending?',
  'What does leftover mean?',
  "What's LSU's industry football roster estimate?",
  "What's the industry estimate for Miami's QB?",
  'How does Alabama compare on reported NIL?',
]

const EXTRA_ALIASES = {
  louisville: ['uofl', 'u of l', 'university of louisville'],
  kentucky: ['university of kentucky'],
  california: ['cal', 'berkeley', 'uc berkeley', 'ucb'],
  washington: ['uw', 'university of washington'],
  'notre-dame': ['nd', 'irish'],
  'texas-am': ['texas a and m', 'texas am', 'tamu', 'a and m'],
  'ohio-state': ['ohio st', 'the ohio state'],
  'oklahoma-state': ['ok state', 'oklahoma st'],
  'penn-state': ['penn st'],
  'michigan-state': ['michigan st'],
  'mississippi-state': ['miss state'],
  'nc-state': ['nc state', 'n c state'],
  'ole-miss': ['ole miss'],
  'georgia-tech': ['georgia tech', 'ga tech'],
  'boston-college': ['boston college'],
  'wake-forest': ['wake forest'],
  'west-virginia': ['west virginia'],
  'arizona-state': ['arizona state'],
  'kansas-state': ['kansas state'],
  'iowa-state': ['iowa state'],
  'florida-state': ['florida state'],
  'north-carolina': ['north carolina'],
  'south-carolina': ['south carolina'],
  'texas-tech': ['texas tech'],
  'miami': ['the u'],
  smu: ['southern methodist'],
  ucla: ['ucla'],
  usc: ['usc'],
}

const STOP_PHRASES = new Set([
  'house',
  'cap',
  'leftover',
  'nil',
  'tv',
  'media',
  'roster',
  'coach',
  'buyout',
  'compare',
  'what',
  'which',
  'who',
  'school',
  'schools',
])

function fold(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function yearLabel(lead) {
  if (!lead) return null
  if (lead.label) return lead.label
  if (lead.carry) return '2025–26 filing / House Year 1'
  if (lead.field?.partialYear) return 'House Year 1 · YTD'
  return null
}

function mark(field, fallback = 'pending') {
  return field?.confidence || fallback
}

function schoolHref(id, season, hash) {
  return schoolPath(id, season, hash || '')
}

function pendingWhy(field) {
  const notes = String(field?.notes || '').trim()
  if (notes) return notes
  return 'No public cite on the desk. We looked. The cell stays empty — not that the number is zero.'
}

function pendingLine(school, cell, _hash, field) {
  return `${school.name}’s ${cell} is not on the desk — pending. ${pendingWhy(field)} See the ${school.name} page.`
}

function buildSchoolIndex(schools) {
  const entries = []
  for (const s of schools || []) {
    const names = new Set(
      [s.id.replace(/-/g, ' '), s.name, s.shortName, s.abbr, ...(EXTRA_ALIASES[s.id] || [])]
        .filter(Boolean)
        .map(fold)
        .filter((n) => n && n.length >= 2 && !STOP_PHRASES.has(n)),
    )
    for (const phrase of names) {
      entries.push({ id: s.id, phrase, len: phrase.length })
    }
  }
  entries.sort((a, b) => b.len - a.len || a.phrase.localeCompare(b.phrase))
  return entries
}

export function matchSchools(question, schools) {
  const index = buildSchoolIndex(schools)
  let hay = ` ${fold(question)} `
  const ids = []
  const seen = new Set()
  for (const e of index) {
    if (seen.has(e.id)) continue
    const re = new RegExp(`\\s${escapeRe(e.phrase)}s?\\s`)
    if (!re.test(hay)) continue
    ids.push(e.id)
    seen.add(e.id)
    hay = hay.replace(re, ' ')
  }
  return ids
}

function matchCoaches(question, coachFa) {
  const coaches = listCoaches(coachFa)
  if (!coaches.length) return []
  const hay = ` ${fold(question)} `
  const hits = []
  for (const c of coaches) {
    const names = [c.name, c.id.replace(/-/g, ' '), ...(c.name || '').split(/\s+/).slice(-1)]
    if (names.some((n) => n && new RegExp(`\\s${escapeRe(fold(n))}s?\\s`).test(hay))) {
      hits.push(c)
    }
  }
  return hits
}

function detectIntents(q) {
  const t = fold(q)
  const intents = new Set()
  if (/on3|franchise valu|enterprise valu|nil rank|recruiting rank/.test(t)) intents.add('refuse')
  if (/what does leftover|explain leftover|leftover mean|meaning of leftover|what leftover is/.test(t) || (/what is leftover/.test(t) && !/ vs |versus|house spent|booked nil/.test(t))) {
    intents.add('defineLeftover')
  }
  if (/what is (the )?house cap|what does house cap|explain house cap/.test(t)) intents.add('defineHouse')
  if (/what is booked nil|what does booked nil|explain booked nil/.test(t) && !/vs|versus|modeled|pending/.test(t)) {
    intents.add('defineNil')
  }
  if (/what is (annual )?capacity|what does capacity mean|explain capacity/.test(t)) intents.add('defineCapacity')
  if (/what is (nil )?modeled|explain modeled nil|what does modeled/.test(t) && !/vs|versus|booked|pending|roster estimate|industry/.test(t)) {
    intents.add('defineModeled')
  }
  if (/what is (an |the )?(industry )?(football )?roster estimate|explain (the )?industry (football )?roster|what does industry roster/.test(t)) {
    intents.add('defineRosterEstimate')
  }
  if (/what is (an |the )?(industry )?(position|player salary)|explain (the )?industry (position|player salary)|position estimate mean/.test(t)) {
    intents.add('definePositionEstimate')
  }
  if (/what is (the )?(nil )?reported bar|explain (the )?(nil )?reported bar|what does reported nil/.test(t)) {
    intents.add('defineReportedNil')
  }
  if (/what is (a )?buyout|buyout overhang|is (a )?buyout|buyout.*(annual|yearly|spend)/.test(t)) {
    intents.add('defineBuyout')
  }
  if (/booked vs|modeled vs|pending vs|vs modeled|vs pending|confidence|what is booked|reported vs|included vs|not included|what data (do you|does the desk)|whats on (the )?(desk|public cap)|what do you (track|include|cover|have)|what does (the )?desk (have|include|cover)/.test(t)) {
    intents.add('coverage')
  }
  if (/missing|not on the desk|what dont you|what do you not|dont you have/.test(t)) intents.add('missing')
  if (/do you have|have you got|is there (a |any )?(booked |house )?/.test(t)) intents.add('doYouHave')
  if (/what nil do you have|which nil|nil do you have|what nil (is |are )?(on|for)/.test(t)) intents.add('nilCoverage')
  if (/house spent vs|leftover vs|booked nil vs|house cap vs|difference between (leftover|house|booked)/.test(t)) {
    intents.add('lanes')
  }
  if (/which schools|who has booked|schools have booked|booked house spent/.test(t) && /house spent|booked house|leftover/.test(t)) {
    intents.add('listHouseSpent')
  }
  if (/which schools|who has/.test(t) && /roster estimate|industry roster|above.?40/.test(t)) {
    intents.add('listRosterEstimate')
  }
  if (/which (schools|positions)|who has/.test(t) && /position (estimate|band|salary)|industry estimate by position|player salary|salary band/.test(t)) {
    intents.add('listPositionEstimate')
  }
  const posHit = detectPositionFamily(t)
  if (
    posHit &&
    (/industry|survey|estimate|position (salary|pay|band)|player salary|how much/.test(t) ||
      (/salary|pay|band/.test(t) && !/coach|buyout|who is|starting qb|depth chart/.test(t)))
  ) {
    intents.add('positionEstimate')
  }
  if (/industry estimate by position|position (salary|pay) band|approximate player salary/.test(t)) {
    intents.add('positionEstimate')
  }
  if (/industry (football )?roster|roster estimate|football roster (payroll|spend|spending)|40.?50\s*m|50 million roster|40 million roster|most expensive roster/.test(t)) {
    intents.add('rosterEstimate')
  }
  if (/\bpayroll\b/.test(t) && /roster|football|industry/.test(t)) intents.add('rosterEstimate')
  if (
    /reported nil|nil reported|reported bar/.test(t) ||
    (/how does .+ compare/.test(t) && /reported|industry roster|roster stack/.test(t))
  ) {
    intents.add('reportedNil')
  }
  if (/leftover|house remaining|remaining house/.test(t)) intents.add('leftover')
  if (/house spent|spent cell|year 1 spent/.test(t)) intents.add('houseSpent')
  if (
    /booked nil|nil booked/.test(t) ||
    (/\bnil\b/.test(t) &&
      !/modeled/.test(t) &&
      !/990/.test(t) &&
      !intents.has('rosterEstimate') &&
      !intents.has('reportedNil'))
  ) {
    intents.add('bookedNil')
  }
  if (/modeled nil|nil modeled/.test(t)) intents.add('modeledNil')
  if (/house cap/.test(t) && !intents.has('defineHouse')) intents.add('houseCap')
  if (/\bcapacity\b/.test(t) && !intents.has('defineCapacity')) intents.add('capacity')
  if (/\btv\b|media (rights|line|check|deal)|conference media|full tv|broadcast media/.test(t)) intents.add('tv')
  if (
    /starting qb|qb1|\bqb\b|who is .+ start|depth chart/.test(t) ||
    (/\broster\b/.test(t) && !intents.has('rosterEstimate') && !intents.has('listRosterEstimate') && !intents.has('defineRosterEstimate'))
  ) {
    intents.add('roster')
  }
  if (/buyout|coach pay|head coach|salary/.test(t)) intents.add('coach')
  if (/compare|\bvs\b|versus/.test(t)) intents.add('compare')
  if (/methods|how (is|does) the desk/.test(t)) intents.add('methods')
  return intents
}

function overlaySchool(raw, season) {
  const year = season || CURRENT_SEASON
  return applySeason(raw, year)
}

function attachModeled(school, desk, season) {
  if (!desk?.schools || !school._season?.modeledNil) return school
  const houseVal = houseValueForSeason(desk.meta, season)
  const capTotals = desk.schools.map((s) => computeCapacity(applySeason(s, season)).total)
  const modeled = modeledNilForSeason(school, computeCapacity(school).total, capTotals, season, houseVal)
  return { ...school, nil: { ...school.nil, modeled } }
}

function leftoverBundle(school) {
  const leftover = leadHouseRemaining(school)
  const booked = leadBookedNil(school)
  const spent =
    leftover.field && leftover.field.spent != null && leftover.field.spent !== ''
      ? Number(leftover.field.spent)
      : null
  return { leftover, booked, spent }
}

function estimateAside(school, spent) {
  const stack = footballRosterStack(school)
  if (!stack) return null
  const display = stack.display
  const bits = [
    `A separate industry football roster estimate is on the desk (${display}, labeled ${stack.lane}) — not booked NIL, not House spent, and not subtracted from capacity or leftover.`,
  ]
  if (spent == null) {
    bits.push(
      `We do not have a booked ${school.name} House spent total. Leftover only exists when that spent cell is booked.`,
    )
  } else {
    bits.push('Leftover on this desk is House cap minus booked House spent, not this survey.')
  }
  return bits.join(' ')
}

function capacityOf(school, includeAlumni) {
  const cap = computeCapacity(school)
  return {
    cap,
    value: displayCap(cap, includeAlumni),
    fy: school.capacity?.fiscalYearPrimary || null,
  }
}

function answerDefine(key, extra) {
  const def = DEFS[key]
  const links = [{ to: '/methods', label: 'Methods' }]
  if (key === 'nilReportedBar') links.unshift({ to: REPORTED_NIL_PATH, label: 'Reported NIL board' })
  return {
    text: def ? `${def.label}: ${def.text}` : extra || 'See Methods.',
    links,
    suggested: SUGGESTED_PROMPTS.slice(0, 3),
  }
}

function schoolFacts(raw, season, includeAlumni, desk) {
  const school = attachModeled(overlaySchool(raw, season), desk, season)
  const { leftover, booked, spent } = leftoverBundle(school)
  const cap = capacityOf(school, includeAlumni)
  const coach = school.coaches?.football || raw.coaches?.football
  return { school, leftover, booked, spent, cap, coach }
}

function factLine(label, value, opts = {}) {
  if (value == null) return `${label}: pending`
  const bits = [`${label}: ${typeof value === 'number' ? moneyExact(value) : value}`]
  if (opts.compact != null && typeof value === 'number') bits[0] = `${label}: ${money(value)}`
  if (opts.mark) bits.push(opts.mark)
  if (opts.note) bits.push(opts.note)
  return bits.join(' · ')
}

function schoolAnswer(raw, season, includeAlumni, intents, tv, rosters, desk, question) {
  const { school, leftover, booked, spent, cap, coach } = schoolFacts(raw, season, includeAlumni, desk)
  const lines = []
  const facts = []
  const links = [{ to: schoolHref(school.id, season), label: `${school.name} page` }]
  const wantAll = !intents.size || (intents.has('leftover') && intents.has('houseSpent') && intents.has('bookedNil'))
  const broad = !intents.size || (intents.has('leftover') && (intents.has('houseSpent') || intents.has('bookedNil')))

  if (intents.has('refuse')) {
    return refuseAnswer()
  }

  if (intents.has('defineLeftover')) {
    return {
      ...answerDefine('houseRemaining'),
      links: [...answerDefine('houseRemaining').links, { to: schoolHref(school.id, season, 'leftover'), label: `${school.name} leftover` }],
    }
  }

  if (intents.has('tv')) {
    return tvAnswer(school, tv, season)
  }

  if (intents.has('positionEstimate') && !intents.has('leftover') && !intents.has('houseSpent') && !intents.has('bookedNil')) {
    return positionEstimateAnswer(school, season, spent, question)
  }

  if (intents.has('reportedNil') && !intents.has('leftover') && !intents.has('houseSpent') && !intents.has('bookedNil')) {
    return reportedNilAnswer(school, season, spent, booked)
  }

  if (intents.has('rosterEstimate') && !intents.has('leftover') && !intents.has('houseSpent') && !intents.has('bookedNil')) {
    return rosterEstimateAnswer(school, season, spent)
  }

  if (intents.has('roster') && !intents.has('positionEstimate')) {
    return rosterAnswer(school, rosters, season)
  }

  if (intents.has('coach') && !intents.has('positionEstimate') && !intents.has('leftover') && !intents.has('bookedNil') && !intents.has('capacity')) {
    return coachAnswer(school, coach, season)
  }

  if (intents.has('capacity') || (!intents.size && !broad)) {
    if (cap.value) {
      lines.push(
        `${school.name} booked-only capacity is ${money(cap.value)}${cap.fy ? ` (${cap.fy})` : ''}. Latest extracted stack — not invented ${season} dollars.`,
      )
      facts.push(factLine('Capacity (booked)', cap.value, { mark: school.capacity?.mediaConference?.confidence || 'estimated', note: cap.fy }))
      links.push({ to: schoolHref(school.id, season, 'capacity'), label: `${school.name} capacity` })
    } else {
      lines.push(pendingLine(school, 'capacity', 'capacity', school.capacity?.mediaConference))
    }
  }

  if (intents.has('houseCap')) {
    // House cap is a book-level cell; filled by the caller via meta.
  }

  if (intents.has('bookedNil') || wantAll || (broad && intents.has('leftover'))) {
    if (booked.value != null) {
      const yl = yearLabel(booked)
      lines.push(
        `${school.name} booked NIL is ${money(booked.value)}${yl ? ` (${yl})` : ''}. Booked — FOIA / MFRS / counsel. Not modeled.`,
      )
      facts.push(factLine('Booked NIL', booked.value, { mark: mark(booked.field, 'reported'), note: yl }))
      links.push({ to: schoolHref(school.id, season, 'nil'), label: `${school.name} booked NIL` })
    } else {
      lines.push(pendingLine(school, 'booked NIL', 'nil', bookedPendingField(school, booked, raw)))
      if (intents.has('modeledNil') && school.nil?.modeled) {
        lines.push(
          `Labeled modeled NIL band is ${moneyRange(school.nil.modeled.low, school.nil.modeled.high)} — a conference heuristic, not a filing.`,
        )
      } else if (!intents.has('modeledNil')) {
        lines.push('Modeled NIL is a separate labeled heuristic and is not a substitute for booked.')
      }
      links.push({ to: schoolHref(school.id, season, 'nil'), label: `${school.name} NIL` })
    }
  }

  if (intents.has('modeledNil') && !intents.has('bookedNil')) {
    const m = school.nil?.modeled
    if (m?.mid != null) {
      lines.push(
        `${school.name} labeled modeled NIL is ${moneyRange(m.low, m.high)} (mid ${money(m.mid)}). Conference heuristic — not booked, not a filing.`,
      )
      facts.push(factLine('NIL modeled', moneyRange(m.low, m.high), { mark: 'modeled' }))
    } else {
      lines.push(`${school.name} has no modeled NIL band on this season.`)
    }
    links.push({ to: schoolHref(school.id, season, 'nil-modeled'), label: `${school.name} modeled NIL` })
  }

  if (intents.has('houseSpent') || wantAll || (broad && intents.has('leftover'))) {
    if (spent != null) {
      const yl = yearLabel(leftover)
      const ytd = leftover.field?.partialYear ? ' · YTD' : ''
      lines.push(
        `${school.name} booked House spent is ${money(spent)}${yl ? ` (${yl}${ytd})` : ytd}. This is the House Year 1 spent cell — not leftover, not the full booked-NIL window when those differ.`,
      )
      facts.push(factLine('House spent', spent, { mark: mark(leftover.field, 'reported'), note: yl }))
      links.push({ to: schoolHref(school.id, season, 'house-spent'), label: `${school.name} House spent` })
    } else {
      lines.push(pendingLine(school, 'House spent', 'house-spent', leftover.field || school.nil?.houseRemaining))
      lines.push('Leftover is only computed when a booked House spent cell exists. We do not invent leftover from a cap plan.')
      const mentionEstimateHere = !intents.has('leftover') && !wantAll
      const houseAside = mentionEstimateHere ? estimateAside(school, spent) : null
      if (houseAside) lines.push(houseAside)
      links.push({ to: schoolHref(school.id, season, 'house'), label: `${school.name} House` })
      if (houseAside) {
        links.push({ to: schoolHref(school.id, season, ROSTER_ESTIMATE_HASH), label: `${school.name} industry roster estimate` })
      }
    }
  }

  if (intents.has('leftover') || wantAll) {
    if (leftover.value != null) {
      const yl = yearLabel(leftover)
      const extra = leftover.field?.overhang
        ? ' Overhang — spent above the Year 1 cap.'
        : leftover.field?.partialYear
          ? ' Year-to-date residual, not a full-year leftover.'
          : ''
      lines.push(
        `${school.name} leftover is ${money(leftover.value)}${yl ? ` (${yl})` : ''}. House cap minus booked House spent.${extra} Not capacity − House − NIL.`,
      )
      const leftoverOnAside = estimateAside(school, spent)
      if (leftoverOnAside) lines.push(leftoverOnAside)
      facts.push(factLine('Leftover', leftover.value, { mark: mark(leftover.field, 'estimated'), note: yl }))
      links.push({ to: schoolHref(school.id, season, 'leftover'), label: `${school.name} leftover` })
      if (leftoverOnAside) {
        links.push({ to: schoolHref(school.id, season, ROSTER_ESTIMATE_HASH), label: `${school.name} industry roster estimate` })
      }
    } else {
      lines.push(pendingLine(school, 'leftover', 'leftover', leftover.field || school.nil?.houseRemaining))
      lines.push('Leftover is House Year 1 cap minus booked House spent, only when that spent cell exists — not capacity − House − NIL.')
      const leftoverAside = estimateAside(school, spent)
      if (leftoverAside) lines.push(leftoverAside)
      links.push({ to: schoolHref(school.id, season, 'leftover'), label: `${school.name} leftover` })
      if (leftoverAside) {
        links.push({ to: schoolHref(school.id, season, ROSTER_ESTIMATE_HASH), label: `${school.name} industry roster estimate` })
      }
    }
  }

  if (intents.has('capacity') && !lines.some((l) => /capacity/i.test(l))) {
    if (cap.value) {
      lines.unshift(
        `${school.name} booked-only capacity is ${money(cap.value)}${cap.fy ? ` (${cap.fy})` : ''}.`,
      )
      links.push({ to: schoolHref(school.id, season, 'capacity'), label: `${school.name} capacity` })
    }
  }

  if (!lines.length) {
    return snapshotAnswer(raw, season, includeAlumni, desk)
  }

  const uniqLinks = dedupeLinks(links)
  return {
    text: lines.join(' '),
    facts,
    links: uniqLinks,
    suggested: SUGGESTED_PROMPTS.filter((p) => !fold(p).includes(fold(school.name))).slice(0, 3),
  }
}

function snapshotAnswer(raw, season, includeAlumni, desk) {
  const { school, leftover, booked, spent, cap, coach } = schoolFacts(raw, season, includeAlumni, desk)
  const facts = [
    factLine('Capacity (booked)', cap.value || null, { note: cap.fy }),
    factLine('Booked NIL', booked.value, { note: yearLabel(booked) }),
    factLine('House spent', spent, { note: yearLabel(leftover) }),
    factLine('Leftover', leftover.value, { note: yearLabel(leftover) }),
  ]
  const bits = [`${school.name} on the desk (booked cells only).`]
  if (booked.value == null && leftover.value == null) {
    bits.push('Booked NIL and leftover are pending.')
  }
  if (coach?.name) bits.push(`Football chair: ${coach.name}.`)
  return {
    text: bits.join(' '),
    facts,
    links: [{ to: schoolHref(school.id, season), label: `${school.name} page` }],
    suggested: SUGGESTED_PROMPTS.slice(0, 4),
  }
}

function tvAnswer(school, tv, season) {
  const media = deskMedia(school)
  const checks = tv ? schoolCheck(school, tv) : []
  const lines = []
  const facts = []
  const links = [
    { to: schoolHref(school.id, season, 'stack-media'), label: `${school.name} media` },
    { to: '/tv', label: 'TV desk' },
  ]

  if (media && hasVal(media)) {
    const label = media.stackLabel || 'Media / conference'
    const notFull = /not acc tv|not a television|no tv|early-membership|not equal/i.test(
      `${media.stackLabel || ''} ${media.notes || ''} ${media.source || ''}`,
    )
    lines.push(
      `${school.name} conference media line is ${money(media.value)} (${mark(media, 'reported')}${media.fiscalYear ? ` · ${media.fiscalYear}` : ''}). ${label}.`,
    )
    if (notFull) {
      lines.push('Not a full conference TV equal share.')
    }
    facts.push(factLine('Conference media', media.value, { mark: mark(media), note: media.fiscalYear }))
  } else {
    lines.push(pendingLine(school, 'conference media', 'stack-media', school.capacity?.mediaConference))
  }

  for (const ex of checks) {
    if (ex.kind === 'reported-exception') {
      const fullTv = /no tv|not a television|not an equal|partial|nothing from media|nine years/i.test(
        `${ex.name || ''} ${ex.notes || ''}`,
      )
      if (ex.value != null && media?.value !== ex.value) {
        lines.push(`${ex.name}: ${money(ex.value)} (${ex.confidence || 'reported'}).`)
      } else if (ex.value == null) {
        lines.push(`${ex.name}.`)
      }
      if (fullTv) lines.push('The TV book says this is not a full media equal share.')
    } else if (ex.kind === 'equal-share-estimate' && ex.value != null) {
      lines.push(
        `Implied conference media check ${money(ex.value)} — labeled estimated (${ex.formula}). Not a school contract.`,
      )
    } else if (ex.kind === 'pending') {
      lines.push(ex.notes || 'Conference media check pending.')
    }
  }

  if (!tv) {
    lines.push('Open the chat on the site to load the TV book, or see /tv.')
  }

  return { text: lines.join(' '), facts, links, suggested: SUGGESTED_PROMPTS.slice(0, 3) }
}

function rosterEstimateAnswer(school, season, spent) {
  const links = [
    { to: schoolHref(school.id, season, ROSTER_ESTIMATE_HASH), label: `${school.name} industry roster estimate` },
    { to: '/methods', label: 'Methods' },
  ]
  const offYear = season != null && season !== 2026
  if (offYear) {
    return {
      text: `${school.name} has no industry football roster estimate on ${season}. That lane is a 2026 modeled / survey cell. Switch the season to 2026.`,
      facts: ['Industry football roster estimate: 2026 only'],
      links,
      suggested: ["What's LSU's industry football roster estimate?", "What's the industry roster estimate for Alabama?"],
    }
  }
  const stack = footballRosterStack(school)
  if (!stack) {
    return {
      text: `${school.name} has no defensible public input for a football roster stack — no CBS / SI named cell and no cited conference median. Empty is not zero. Not booked NIL, not House spent.`,
      facts: ['Industry football roster estimate: no defensible public input'],
      links,
      suggested: ["What's LSU's industry football roster estimate?"],
    }
  }
  const leftoverBit =
    spent == null
      ? ` We do not have a booked ${school.name} House spent total. Leftover only exists when that spent cell is booked — this stack does not create leftover.`
      : ' Leftover on this desk is House cap minus booked House spent, not this stack.'
  if (stack.lane === 'survey') {
    const est = stack.survey
    const display = stack.display
    const lines = [
      est.kind === 'range'
        ? `${school.name} industry football roster estimate is ${display}${est.qualifier ? ` (${est.qualifier})` : ''}. Labeled survey — not modeled from a conference median, not booked NIL, not House spent. Combines football’s share of institutional revenue-share plus third-party NIL; not a school filing. Do not subtract from capacity or leftover.`
        : `${school.name} industry football roster estimate is ${display}${est.qualifier ? ` (${est.qualifier})` : ''}. Labeled survey — a published tier, not a point estimate and not a modeled midpoint. Not booked NIL, not House spent. Do not subtract from capacity or leftover.`,
    ]
    if (est.kind === 'tier' && stack.allocation) {
      lines.push(`Position allocation uses the modeled envelope ${stack.allocation.display}. ${stack.allocation.formula}`)
    }
    lines.push(leftoverBit.trim())
    return {
      text: lines.join(' '),
      facts: [`Industry roster estimate: ${display} (survey)`, est.qualifier, 'survey — not House spent'].filter(Boolean),
      links,
      suggested: [`What's ${school.name}'s leftover?`, "What's the industry roster estimate for Alabama?"],
    }
  }
  return {
    text: `${school.name} is not named in the published CBS / SI survey. The industry football roster estimate is modeled ${stack.display} — ${stackFormula(stack)} Not a survey cell, not a filing, not booked NIL, not House spent.${leftoverBit}`,
    facts: [`Industry roster estimate: ${stack.display} (modeled)`, 'modeled — not survey — not House spent'],
    links,
    suggested: ["What's LSU's industry football roster estimate?", `What's the industry estimate for ${school.name}'s QB?`],
  }
}

function reportedNilAnswer(school, season, spent, booked) {
  const links = [
    { to: REPORTED_NIL_PATH, label: 'Reported NIL board' },
    { to: schoolHref(school.id, season, REPORTED_BAR_HASH), label: `${school.name} NIL reported bar` },
    { to: schoolHref(school.id, season, ROSTER_ESTIMATE_HASH), label: `${school.name} industry roster estimate` },
  ]
  if (season !== 2026) {
    return {
      text: `${school.name} has no NIL reported bar on ${season}. That comparable bar is a 2026 modeled / survey cell. Switch the season to 2026.`,
      facts: ['NIL reported bar: 2026 only'],
      links,
      suggested: ['How does Alabama compare on reported NIL?', "What's LSU's industry football roster estimate?"],
    }
  }
  const bar = reportedNilBar(school, {
    booked: typeof booked === 'number' ? booked : booked?.value,
    spent,
  })
  if (!bar) {
    return {
      text: `${school.name} has no football stack to plot on the NIL reported bar. Empty is not zero. Not booked NIL, not House spent.`,
      facts: ['NIL reported bar: no defensible public input'],
      links,
      suggested: ['How does Alabama compare on reported NIL?'],
    }
  }
  const maxM = Math.round(bar.max / 1_000_000)
  const citeBits = []
  if (bar.sameBookedSpent && bar.booked) {
    citeBits.push(
      `Booked NIL and House spent sit at the same separate mark (${money(bar.booked.value)}) — not mixed into the reported band.`,
    )
  } else {
    if (bar.booked) citeBits.push(`Booked NIL is a separate mark at ${money(bar.booked.value)}.`)
    if (bar.spent) citeBits.push(`House spent is a separate mark at ${money(bar.spent.value)}.`)
  }
  const leftoverBit =
    spent == null
      ? ` Leftover only exists when a booked House spent cell exists — this bar does not create leftover.`
      : ' Leftover on this desk is House cap minus booked House spent, not this bar.'
  const laneBit =
    bar.lane === 'survey'
      ? `Labeled survey (${bar.display}). The comparable band is ${bar.rangeDisplay}.`
      : `Labeled modeled (${bar.display}).`
  return {
    text: `${school.name} reported NIL bar is ${bar.rangeDisplay} on the shared $0–$${maxM}M Power 4 + Notre Dame scale. ${laneBit} The gold band is the industry/survey or modeled football-stack range (rev-share + third-party NIL) — not booked NIL and not House spent. Scale max is the highest published or modeled top in the set ($${maxM}M — LSU survey high and the above-$40M allocation envelope). ${citeBits.join(' ')}${leftoverBit}`,
    facts: [
      `NIL reported bar: ${bar.rangeDisplay} (${bar.lane})`,
      `Scale: $0–$${maxM}M`,
      bar.booked ? `Booked NIL mark: ${money(bar.booked.value)}` : null,
      bar.spent ? `House spent mark: ${money(bar.spent.value)}` : null,
    ].filter(Boolean),
    links,
    suggested: [
      'How does Alabama compare on reported NIL?',
      'Compare LSU and Alabama on reported NIL',
      "What's LSU's industry football roster estimate?",
    ],
  }
}

function compareReportedNil(rawA, rawB, season, includeAlumni, desk) {
  const A = schoolFacts(rawA, season, includeAlumni, desk)
  const B = schoolFacts(rawB, season, includeAlumni, desk)
  const barA = reportedNilBar(A.school, { booked: A.booked.value, spent: A.spent })
  const barB = reportedNilBar(B.school, { booked: B.booked.value, spent: B.spent })
  const links = [
    { to: REPORTED_NIL_PATH, label: 'Reported NIL board' },
    { to: schoolHref(A.school.id, season, REPORTED_BAR_HASH), label: `${A.school.name} NIL reported bar` },
    { to: schoolHref(B.school.id, season, REPORTED_BAR_HASH), label: `${B.school.name} NIL reported bar` },
  ]
  if (!barA || !barB) {
    const missing = !barA ? A.school.name : B.school.name
    return {
      text: `${missing} has no football stack on this season, so the desk will not compare reported NIL bars. Empty is not zero.`,
      links,
      suggested: ['How does Alabama compare on reported NIL?'],
    }
  }
  const maxM = Math.round(barA.max / 1_000_000)
  const higher =
    barA.mid === barB.mid
      ? null
      : barA.mid > barB.mid
        ? A.school.name
        : B.school.name
  const lead = higher
    ? `${A.school.name} reported NIL band is ${barA.rangeDisplay} (${barA.lane}); ${B.school.name} is ${barB.rangeDisplay} (${barB.lane}). Same $0–$${maxM}M scale. ${higher} sits higher on the comparable bar.`
    : `${A.school.name} and ${B.school.name} share the same reported NIL band (${barA.rangeDisplay}) on the $0–$${maxM}M scale.`
  return {
    text: `${lead} The band is the industry/survey or modeled football-stack range (rev-share + third-party NIL) — not booked NIL and not House spent. Booked cites stay separate marks. Leftover is still House cap minus booked House spent when that cell exists.`,
    facts: [
      `${A.school.name}: ${barA.rangeDisplay} (${barA.lane})`,
      `${B.school.name}: ${barB.rangeDisplay} (${barB.lane})`,
      `Scale: $0–$${maxM}M`,
    ],
    links,
    suggested: ['How does Alabama compare on reported NIL?', "What's LSU's leftover?"],
  }
}

function listRosterEstimates(desk, season) {
  const survey = []
  const modeled = []
  for (const raw of desk?.schools || []) {
    const school = overlaySchool(raw, season)
    const stack = footballRosterStack(school)
    if (!stack) continue
    const row = { id: school.id, name: school.name, display: stack.display, lane: stack.lane, kind: stack.kind }
    if (stack.lane === 'survey') survey.push(row)
    else modeled.push(row)
  }
  if (!survey.length && !modeled.length) {
    return {
      text: 'No industry football roster estimate is on this season. That lane is a 2026 modeled / survey cell only.',
      links: [{ to: '/methods', label: 'Methods' }],
    }
  }
  const lines = [
    `Industry football roster estimate is a labeled modeled / survey lane — not booked NIL, not House spent, and not leftover. ${survey.length} survey cell${survey.length === 1 ? '' : 's'}; ${modeled.length} modeled from the SI conference median.`,
  ]
  if (survey.length) {
    lines.push('Survey: ' + survey.map((r) => `${r.name} ${r.display}`).join('; ') + '.')
  }
  if (modeled.length) {
    lines.push('Modeled (same conference band, not a school-by-school guess): ' + modeled.map((r) => `${r.name} ${r.display}`).join('; ') + '.')
  }
  lines.push('Leftover still only exists when a booked House spent cell exists.')
  return {
    text: lines.join(' '),
    facts: [...survey, ...modeled].map((r) => `${r.name}: ${r.display} (${r.lane})`),
    links: [
      { to: REPORTED_NIL_PATH, label: 'Reported NIL board' },
      ...survey.slice(0, 8).map((r) => ({ to: schoolHref(r.id, season, ROSTER_ESTIMATE_HASH), label: r.name })),
      { to: '/methods', label: 'Methods' },
    ],
  }
}

function positionEstimateAnswer(school, season, spent, question) {
  const family = detectPositionFamily(question || '')
  const links = [
    { to: schoolHref(school.id, season, POSITION_ESTIMATE_HASH), label: `${school.name} position estimate` },
    { to: '/methods', label: 'Methods' },
  ]
  const offYear = season != null && season !== 2026
  if (offYear) {
    return {
      text: `${school.name} has no industry position estimate on ${season}. That lane is a 2026 modeled / survey cell. Switch the season to 2026.`,
      facts: ['Industry estimate by position: 2026 only'],
      links,
      suggested: ["What's the industry estimate for Miami's QB?", 'Which positions have an industry salary band?'],
    }
  }
  const stack = footballRosterStack(school)
  const rows = stackPositionRows(school)
  const leftoverBit =
    spent == null
      ? ` Leftover only exists when a booked House spent cell exists — this stack does not create leftover.`
      : ' Leftover on this desk is House cap minus booked House spent, not this stack.'
  if (!stack || !rows.length) {
    return {
      text: `${school.name} has no defensible public input for a football stack, so there is no modeled position range. Empty is not zero. Not booked NIL.`,
      facts: ['Industry estimate by position: no defensible public input'],
      links,
      suggested: ["What's the industry estimate for Miami's QB?"],
    }
  }
  const modeledRow = family ? rows.find((r) => r.family === family.family) : null
  const surveyRow = family ? positionEstimateFor(school, family.family) : null
  if (family && modeledRow) {
    const modeledBit = `Modeled ${family.label} starter ${modeledRow.starterDisplay}${modeledRow.backupDisplay ? `, backup ${modeledRow.backupDisplay}` : ''} — ${modeledRow.formula} Stack is ${stack.lane} ${stack.display}.`
    if (surveyRow) {
      const mark = surveyRow.mark === 'reported-estimate' ? 'reported-estimate' : 'survey'
      return {
        text: `${school.name} ${family.label} survey band is ${positionEstimateDisplay(surveyRow)} (${mark} — industry estimate, not a contract). ${modeledBit} Not booked NIL, not House spent.${leftoverBit}`,
        facts: [`${family.label}: ${positionEstimateDisplay(surveyRow)} (${mark})`, `Modeled starter: ${modeledRow.starterDisplay}`],
        links,
        suggested: [`What's ${school.name}'s leftover?`, "What's Alabama's QB salary?"],
      }
    }
    return {
      text: `${school.name} ${family.label} has no CBS / SI position band. The modeled range is starter ${modeledRow.starterDisplay}${modeledRow.backupDisplay ? `, backup ${modeledRow.backupDisplay}` : ''}. Labeled modeled, not survey. ${modeledRow.formula} Stack is ${stack.lane} ${stack.display}. Industry estimate, not a contract. Not booked NIL.${leftoverBit}`,
      facts: [`${family.label} starter: ${modeledRow.starterDisplay} (modeled)`, `stack: ${stack.display} (${stack.lane})`],
      links,
      suggested: ["What's the industry estimate for Miami's QB?", `What's ${school.name}'s industry football roster estimate?`],
    }
  }
  const cited = industryPositionEstimates(school)
  const citedBits = cited
    ? cited.positions.map((p) => `${p.label || positionLabel(p.family)} ${positionEstimateDisplay(p)} (${p.mark === 'reported-estimate' ? 'reported-estimate' : 'survey'})`)
    : []
  return {
    text: `${school.name} position approximates are modeled shares of the ${stack.lane} football stack ${stack.display}. ${rows.slice(0, 4).map((r) => `${r.label} starter ${r.starterDisplay}`).join('; ')}. ${citedBits.length ? `Survey / reported-estimate overlays: ${citedBits.join('; ')}.` : 'No CBS / SI position band on this school — modeled only.'} Industry estimate, not a contract. Not booked NIL.${leftoverBit}`,
    facts: rows.slice(0, 6).map((r) => `${r.label}: ${r.starterDisplay} (modeled)`),
    links,
    suggested: [`What's the industry estimate for ${school.name}'s QB?`],
  }
}

function listPositionEstimates(desk, season) {
  const rows = []
  for (const raw of desk?.schools || []) {
    const school = overlaySchool(raw, season)
    const field = industryPositionEstimates(school)
    if (!field) continue
    for (const p of field.positions) {
      rows.push({
        id: school.id,
        name: school.name,
        family: p.family,
        label: p.label || positionLabel(p.family),
        display: positionEstimateDisplay(p),
        mark: p.mark,
      })
    }
  }
  if (!rows.length) {
    return {
      text: 'No industry position estimate is on this season. That lane is a 2026 modeled / survey cell only.',
      links: [{ to: '/methods', label: 'Methods' }],
    }
  }
  const cited = [...new Set(rows.map((r) => r.label))]
  const missing = FOOTBALL_POSITIONS.filter((p) => !rows.some((r) => r.family === p.family)).map((p) => p.label)
  const lines = [
    `Every Power 4 + Notre Dame school has modeled starter / backup ranges — the football stack split by existing seat weights (QB1 = 100). Labeled modeled, not a contract. ${rows.length} CBS / SI cited overlay${rows.length === 1 ? '' : 's'}:`,
    rows.map((r) => `${r.name} ${r.label} ${r.display}${r.mark === 'reported-estimate' ? ' (reported-estimate)' : ' (survey)'}`).join('; ') + '.',
    `Cited overlays: ${cited.join(', ')}. Positions with no CBS / SI band still show the modeled seat share (including ${missing.join(', ') || 'none'}). Not booked NIL.`,
  ]
  return {
    text: lines.join(' '),
    facts: rows.map((r) => `${r.name} ${r.label}: ${r.display}`),
    links: [
      ...[...new Set(rows.map((r) => r.id))].map((id) => ({
        to: schoolHref(id, season, POSITION_ESTIMATE_HASH),
        label: `${rows.find((r) => r.id === id).name} position estimate`,
      })),
      { to: '/methods', label: 'Methods' },
    ],
  }
}

function rosterAnswer(school, rosters, season) {
  const book = rosters?.schools?.[school.id]
  const players = book?.players || []
  const links = [{ to: schoolHref(school.id, season), label: `${school.name} roster` }]
  if (!players.length) {
    return {
      text: `No verified public football roster names on the desk for ${school.name} this season. See the school page.`,
      links,
      suggested: SUGGESTED_PROMPTS.slice(0, 3),
    }
  }

  const qbs = players.filter((p) => p.family === 'qb' || /qb/i.test(p.pos || ''))
  const starter = qbs.find((p) => p.depthRank === 1)
  if (starter) {
    const cite = starter.depthSource ? ` Cited: ${starter.depthSource}.` : ' Depth rank 1 on the desk roster.'
    return {
      text: `${school.name}’s starting QB on the public roster is ${starter.name} (${starter.pos || 'QB'}${starter.class ? `, ${starter.class}` : ''}).${cite} Player dollars on the roster are modeled shares of the school pot, not contracts — this answer is the name only.`,
      facts: [`Starter: ${starter.name}`, starter.depthSource || 'depthRank 1'].filter(Boolean),
      links,
      suggested: SUGGESTED_PROMPTS.filter((p) => !/washington/i.test(p)).slice(0, 3),
    }
  }
  const named = qbs.map((p) => p.name).filter(Boolean)
  if (named.length) {
    return {
      text: `${school.name} has ${named.length} quarterback name${named.length === 1 ? '' : 's'} on the ESPN roster (${named.join(', ')}). No depthRank 1 starter is cited on the desk — we do not invent a starter.`,
      links,
      suggested: SUGGESTED_PROMPTS.slice(0, 3),
    }
  }
  return {
    text: `${school.name} roster is on the desk (${players.length} names) but no QB starter is cited. See the school page.`,
    links,
    suggested: SUGGESTED_PROMPTS.slice(0, 3),
  }
}

function coachAnswer(school, coach, season) {
  const links = [{ to: schoolHref(school.id, season), label: `${school.name} page` }, { to: '/buyout', label: 'Buyout calculator' }]
  if (!coach?.name) {
    return { text: `${school.name} has no football chair on this season overlay.`, links }
  }
  const lines = [`${school.name} football chair: ${coach.name}.`]
  const facts = []
  if (hasVal(coach.pay)) {
    lines.push(`Annual pay ${money(coach.pay.value)} (${mark(coach.pay)}). This year’s check, not lifetime wealth.`)
    facts.push(factLine('Coach pay', coach.pay.value, { mark: mark(coach.pay) }))
  } else {
    lines.push('Coach pay is pending — we do not invent a dollar.')
  }
  if (hasVal(coach.buyout)) {
    lines.push(`If-fired buyout overhang ${money(coach.buyout.value)} (${mark(coach.buyout)}). A liability, not yearly spend.`)
    facts.push(factLine('Buyout overhang', coach.buyout.value, { mark: mark(coach.buyout) }))
    links.push({ to: '/buyout', label: 'Buyout' })
  } else {
    lines.push('Current-chair buyout is pending.')
  }
  return { text: lines.join(' '), facts, links, suggested: SUGGESTED_PROMPTS.slice(0, 3) }
}

function listHouseSpent(desk, season) {
  const rows = []
  for (const raw of desk.schools) {
    const school = overlaySchool(raw, season)
    const { leftover, booked, spent } = leftoverBundle(school)
    if (leftover.value == null || spent == null) continue
    rows.push({
      id: school.id,
      name: school.name,
      leftover: leftover.value,
      spent,
      booked: booked.value,
      ytd: leftover.field?.partialYear || false,
      label: yearLabel(leftover),
    })
  }
  rows.sort((a, b) => a.name.localeCompare(b.name))
  if (!rows.length) {
    return {
      text: 'No school on this season overlay has a booked House spent cell. Leftover stays empty until that cell exists.',
      links: [{ to: '/', label: 'Rank list' }, { to: '/methods', label: 'Methods' }],
    }
  }
  const facts = rows.map((r) => {
    const ytd = r.ytd ? ' · YTD' : ''
    return `${r.name}: House spent ${money(r.spent)}, leftover ${money(r.leftover)}${ytd}`
  })
  return {
    text: `Booked House spent is on the desk for ${rows.length} school${rows.length === 1 ? '' : 's'}: ${rows.map((r) => r.name).join(', ')}. Leftover is House Year 1 cap minus that spent cell — including $0 leftovers. Collective 990s are not in this math.`,
    facts,
    links: [
      ...rows.map((r) => ({ to: schoolHref(r.id, season, 'leftover'), label: r.name })),
      { to: '/', label: 'Rank list' },
    ],
    suggested: SUGGESTED_PROMPTS.filter((p) => !/which schools/i.test(p)).slice(0, 3),
  }
}

function compareSchools(rawA, rawB, season, includeAlumni, intents, desk) {
  const A = schoolFacts(rawA, season, includeAlumni, desk)
  const B = schoolFacts(rawB, season, includeAlumni, desk)
  const meta = desk?.meta
  const metric = intents.has('leftover')
    ? 'leftover'
    : intents.has('houseSpent')
      ? 'houseSpent'
      : intents.has('bookedNil')
        ? 'bookedNil'
        : intents.has('capacity')
          ? 'capacity'
          : intents.has('houseCap')
            ? 'houseCap'
            : 'leftover'

  const pick = (bundle) => {
    if (metric === 'leftover') return { value: bundle.leftover.value, hash: 'leftover', label: 'Leftover', lead: bundle.leftover }
    if (metric === 'houseSpent') return { value: bundle.spent, hash: 'house-spent', label: 'House spent', lead: bundle.leftover }
    if (metric === 'bookedNil') return { value: bundle.booked.value, hash: 'nil', label: 'Booked NIL', lead: bundle.booked }
    if (metric === 'capacity') return { value: bundle.cap.value, hash: 'capacity', label: 'Capacity (booked)', lead: null }
    const house = houseValueForSeason(meta, season)
    return { value: house, hash: 'house', label: 'House cap', lead: null }
  }

  const a = pick(A)
  const b = pick(B)
  const links = [
    { to: comparePath({ a: A.school.id, b: B.school.id, season, includeAlumni }), label: `Compare ${A.school.name} / ${B.school.name}` },
    { to: schoolHref(A.school.id, season, a.hash), label: A.school.name },
    { to: schoolHref(B.school.id, season, b.hash), label: B.school.name },
  ]

  if (a.value == null && b.value == null) {
    return {
      text: `Both ${A.school.name} and ${B.school.name} have a pending ${a.label.toLowerCase()} cell. We do not invent a comparison. See each school page.`,
      links,
    }
  }
  if (a.value == null || b.value == null) {
    const missing = a.value == null ? A.school.name : B.school.name
    const have = a.value == null ? B.school : A.school
    const haveVal = a.value == null ? b.value : a.value
    return {
      text: `${missing}’s ${a.label.toLowerCase()} cell is pending, so the desk will not compare it. ${have.name} is ${money(haveVal)}. See the pending school page.`,
      links,
    }
  }

  const delta = a.value - b.value
  const same = delta === 0
  const lead = same
    ? `${A.school.name} and ${B.school.name} match on ${a.label.toLowerCase()} at ${money(a.value)}.`
    : `${A.school.name} ${a.label.toLowerCase()} is ${money(a.value)}; ${B.school.name} is ${money(b.value)} (${money(Math.abs(delta))} ${delta > 0 ? 'higher at ' + A.school.name : 'higher at ' + B.school.name}).`
  const caveat =
    metric === 'leftover'
      ? ' Leftover is House cap minus booked House spent when that cell exists — not capacity − House − NIL.'
      : metric === 'bookedNil'
        ? ' Booked only — modeled stays off this comparison.'
        : metric === 'capacity'
          ? ' Booked-only capacity (filing stack). Modeled extra alumni is off unless that toggle is on.'
          : ''

  return {
    text: lead + caveat,
    facts: [
      factLine(A.school.name, a.value, { note: yearLabel(a.lead) }),
      factLine(B.school.name, b.value, { note: yearLabel(b.lead) }),
    ],
    links,
    suggested: SUGGESTED_PROMPTS.slice(0, 3),
  }
}

function coachFaAnswer(coach, season) {
  const residual = coach.buyout?.grossRemaining
  const conf = coach.buyout?.confidence
  const lines = [`${coach.name} is on the offsets / free-agent desk (fired chair, not the current-chair buyout calculator).`]
  if (hasDollar(residual)) {
    lines.push(
      `Cited residual at termination: ${moneyExact(residual)} (${conf || 'reported'}). We do not invent today’s remaining principal.`,
    )
  } else {
    lines.push('Residual is pending — empty without a cite.')
  }
  if (coach.offset) {
    const formula = coach.offset.offsetFormula
    lines.push(
      formula === 'none' || coach.offset.offsetApplies === false
        ? 'Offset: none (file says no mitigation).'
        : `Offset rule: ${formula}. Empty without a cited formula.`,
    )
  }
  return {
    text: lines.join(' '),
    links: [
      { to: `/coach-fa/${coach.id}`, label: `${coach.name} offsets` },
      { to: '/coach-fa', label: 'Offsets desk' },
    ],
    suggested: SUGGESTED_PROMPTS.slice(0, 3),
  }
}

function capLineStatus(field, label, hash) {
  if (field && field.value != null) {
    return {
      on: true,
      label,
      value: field.value,
      mark: field.confidence || 'reported',
      note: [field.fiscalYear, field.stackLabel].filter(Boolean).join(' · ') || null,
      source: field.source || null,
      hash,
    }
  }
  return {
    on: false,
    label,
    mark: 'pending',
    why: pendingWhy(field),
    hash,
  }
}

function bookedPendingField(school, booked, raw) {
  if (booked.value != null) return booked.field
  const overlay = school.nil?.booked
  const source = raw?.nil?.booked
  if (source && source.value == null && /not extracted/i.test(overlay?.notes || '')) return source
  return booked.field || overlay || source
}

function schoolCoverage(raw, season, includeAlumni, desk) {
  const { school, leftover, booked, spent, cap, coach } = schoolFacts(raw, season, includeAlumni, desk)
  const c = school.capacity || {}
  const rows = [
    capLineStatus(
      bookedPendingField(school, booked, raw),
      'Booked NIL',
      'nil',
    ),
    {
      ...(spent != null
        ? {
            on: true,
            label: 'House spent',
            value: spent,
            mark: mark(leftover.field, 'reported'),
            note: yearLabel(leftover),
            hash: 'house-spent',
          }
        : { on: false, label: 'House spent', mark: 'pending', why: pendingWhy(leftover.field || school.nil?.houseRemaining), hash: 'house-spent' }),
    },
    {
      ...(leftover.value != null
        ? {
            on: true,
            label: 'Leftover',
            value: leftover.value,
            mark: mark(leftover.field, 'estimated'),
            note: yearLabel(leftover),
            hash: 'leftover',
          }
        : {
            on: false,
            label: 'Leftover',
            mark: 'pending',
            why: 'Leftover is House remaining (cap − booked House spent) only when that spent cell exists. We do not invent leftover from a cap plan.',
            hash: 'leftover',
          }),
    },
    capLineStatus(c.mediaConference, c.mediaConference?.stackLabel || 'Media / conference', 'stack-media'),
    capLineStatus(c.sponsorships, 'Sponsorships / licensing', 'stack-spon'),
    capLineStatus(c.tickets, 'Tickets / premium gate', 'stack-tix'),
    capLineStatus(c.contributions, 'Athletic contributions booked', 'stack-give'),
    capLineStatus(coach?.pay, 'Coach pay', null),
    capLineStatus(coach?.buyout, 'Buyout overhang', null),
  ]
  if (booked.field && booked.value != null) {
    rows[0].value = booked.value
    rows[0].note = yearLabel(booked) || rows[0].note
    rows[0].mark = mark(booked.field, 'reported')
  }
  const nines = collective990Cells(school).filter((r) => r.value != null)
  const est = industryRosterEstimate(school)
  if (est) {
    rows.push({
      on: true,
      label: 'Industry football roster estimate',
      value: rosterEstimateDisplay(est),
      mark: 'modeled',
      note: est.qualifier || 'survey — not House spent',
      hash: ROSTER_ESTIMATE_HASH,
    })
  } else if (season === 2026) {
    const stack = footballRosterStack(school)
    if (stack?.lane === 'modeled') {
      rows.push({
        on: true,
        label: 'Industry football roster estimate',
        value: stack.display,
        mark: 'modeled',
        note: 'SI conference median — not survey, not House spent',
        hash: ROSTER_ESTIMATE_HASH,
      })
    } else {
      rows.push({
        on: false,
        label: 'Industry football roster estimate',
        mark: 'pending',
        why: 'No CBS / SI named cell and no cited conference median.',
        hash: ROSTER_ESTIMATE_HASH,
      })
    }
  }
  if (season === 2026 && footballRosterStack(school)?.allocation) {
    const bar = reportedNilBar(school, { booked: booked.value, spent })
    rows.push({
      on: true,
      label: 'NIL reported bar',
      value: bar?.rangeDisplay,
      mark: 'modeled',
      note: 'comparable $0–$50M scale — not booked NIL, not House spent',
      hash: REPORTED_BAR_HASH,
    })
  }
  const pos = industryPositionEstimates(school)
  const stackPos = season === 2026 ? footballRosterStack(school) : null
  if (pos || stackPos) {
    rows.push({
      on: true,
      label: 'Industry estimate by position',
      value: pos
        ? pos.positions.map((p) => `${p.label || positionLabel(p.family)} ${positionEstimateDisplay(p)}`).join('; ')
        : `modeled shares of ${stackPos.display}`,
      mark: 'modeled',
      note: pos ? 'survey overlay + modeled seat shares' : 'modeled seat shares of the football stack',
      hash: POSITION_ESTIMATE_HASH,
    })
  }
  return { school, leftover, booked, spent, cap, coach, rows, nines }
}

function coverageMapAnswer() {
  return {
    text: [
      'Included vs not, in the desk’s own language.',
      `${DEFS.reported.label}: ${DEFS.reported.text}`,
      `${DEFS.estimated.label}: ${DEFS.estimated.text}`,
      `${DEFS.modeled.label}: ${DEFS.modeled.text}`,
      `${DEFS.pending.label}: ${DEFS.pending.text} Empty is not zero.`,
      `${DEFS.nil.label}: ${DEFS.nil.text} The desk does not carry On3 or invented player deals. Roster position dollars are a labeled modeled allocation of the school pot — not contracts.`,
      `${DEFS.nilCollective990.label}: ${DEFS.nilCollective990.text}`,
      `${DEFS.industryRosterEstimate.label}: ${DEFS.industryRosterEstimate.text}`,
      `${DEFS.industryPositionEstimate.label}: ${DEFS.industryPositionEstimate.text}`,
      `${DEFS.house.label}: ${DEFS.house.text} House spent is the booked Year 1 spent cell when one exists. ${DEFS.houseRemaining.label}: ${DEFS.houseRemaining.text}`,
      `${DEFS.capacity.label}: ${DEFS.capacity.text} Filed 990 / MFRS lines are tagged reported. Conference-floor media and equal-share TV math are tagged estimated.`,
      `${DEFS.buyout.label}: ${DEFS.buyout.text}`,
    ].join(' '),
    links: [
      { to: '/methods', label: 'Methods' },
      { to: '/', label: 'Rank list' },
    ],
    suggested: [
      'What NIL do you have for Texas?',
      'What data is missing for SMU?',
      'Which schools have booked House spent?',
    ],
  }
}

function lanesAnswer() {
  return {
    text: [
      `${DEFS.house.label}: ${DEFS.house.text}`,
      'House spent is the booked House Year 1 spent cell — only on schools that have one.',
      `${DEFS.nil.label}: ${DEFS.nil.text}`,
      `${DEFS.houseRemaining.label}: ${DEFS.houseRemaining.text}`,
      'Leftover is House remaining. It is not capacity − House − NIL.',
      `${DEFS.industryRosterEstimate.label}: ${DEFS.industryRosterEstimate.text}`,
      `${DEFS.industryPositionEstimate.label}: ${DEFS.industryPositionEstimate.text}`,
    ].join(' '),
    links: [{ to: '/methods', label: 'Methods' }, { to: '/', label: 'Rank list' }],
    suggested: [
      "What's Louisville's leftover / House spent / booked NIL?",
      'Which schools have booked House spent?',
      'What does leftover mean?',
    ],
  }
}

function nilCoverageAnswer(raw, season, includeAlumni, desk) {
  const cov = schoolCoverage(raw, season, includeAlumni, desk)
  const { school, leftover, booked, spent, nines } = cov
  const lines = []
  const facts = []
  const links = [
    { to: schoolHref(school.id, season, 'nil'), label: `${school.name} NIL` },
    { to: '/methods', label: 'Methods' },
  ]

  if (booked.value != null) {
    const yl = yearLabel(booked)
    const src = booked.field?.source ? ` Source: ${booked.field.source}.` : ''
    lines.push(
      `${school.name} booked NIL is ${money(booked.value)}${yl ? ` (${yl})` : ''} — ${mark(booked.field, 'reported')}.${src} That is the official institutional cite on the desk (FOIA / MFRS / counsel). Not modeled.`,
    )
    facts.push(factLine('Booked NIL', booked.value, { mark: mark(booked.field, 'reported'), note: yl }))
  } else {
    lines.push(
      `No. ${school.name} booked NIL is not on the desk — pending. ${pendingWhy(bookedPendingField(school, booked, raw))} Booked NIL is cites only. Empty is not zero.`,
    )
    facts.push('Booked NIL: pending — no public cite')
  }

  if (spent != null) {
    const yl = yearLabel(leftover)
    lines.push(
      `House spent is ${money(spent)}${yl ? ` (${yl})` : ''}${leftover.field?.partialYear ? ' · YTD' : ''}. Leftover is ${money(leftover.value)} — House cap minus that spent cell, not capacity − House − NIL.`,
    )
    facts.push(factLine('House spent', spent, { note: yl }))
    facts.push(factLine('Leftover', leftover.value, { note: yl }))
    links.push({ to: schoolHref(school.id, season, 'leftover'), label: `${school.name} leftover` })
  } else {
    lines.push('House spent and leftover are not on the desk — leftover only exists when a booked House spent cell exists.')
    const aside = estimateAside(school, spent)
    if (aside) lines.push(aside)
  }

  if (nines.length) {
    lines.push(
      `Collective 990s sit on a separate cited lane (${nines.length} return${nines.length === 1 ? '' : 's'}) — not House spent, not Item 44, not added to booked NIL.`,
    )
  } else {
    lines.push('No public collective Form 990 on the desk. That lane stays pending — not that payout is zero.')
  }
  if (industryRosterEstimate(school)) {
    links.push({ to: schoolHref(school.id, season, ROSTER_ESTIMATE_HASH), label: `${school.name} industry roster estimate` })
  }

  const estimateOn = estimateAside(school, spent)
  if (estimateOn && spent != null) lines.push(estimateOn)

  lines.push(
    'The desk does not have On3, recruiting ranks, franchise valuations, or invented player deals. Roster position bands are labeled modeled allocations of the school pot when a midpoint exists — not booked contracts. A cited CBS / SI position band, when present, is a separate modeled / survey lane (industry estimate, not a contract) and is not booked NIL. Modeled NIL is a separate conference heuristic and is not a substitute for booked. An industry football roster estimate, when present, is a labeled modeled / survey lane and is not booked NIL or House spent. The NIL reported bar plots that same range on one $0–$50M scale; booked NIL and House spent stay separate marks.',
  )

  return {
    text: lines.join(' '),
    facts,
    links: dedupeLinks(links),
    suggested: SUGGESTED_PROMPTS.filter((p) => !fold(p).includes(fold(school.name))).slice(0, 3),
  }
}

function missingAnswer(raw, season, includeAlumni, desk, { leadMissing = true } = {}) {
  const cov = schoolCoverage(raw, season, includeAlumni, desk)
  const { school, rows, cap } = cov
  const on = rows.filter((r) => r.on)
  const off = rows.filter((r) => !r.on)
  const lines = []
  const facts = []

  if (leadMissing) {
    lines.push(
      off.length
        ? `${school.name} cells not on the desk (pending — no public cite, not zero): ${off.map((r) => r.label).join(', ')}.`
        : `${school.name} lead cells that this chat checks are on the desk.`,
    )
    for (const r of off) {
      facts.push(`${r.label}: pending — ${r.why}`)
    }
    if (on.length) {
      lines.push(
        `On the desk: ${on
          .map((r) => `${r.label} ${typeof r.value === 'number' ? money(r.value) : ''} (${r.mark}${r.note ? ` · ${r.note}` : ''})`.replace(/\s+/g, ' ').trim())
          .join('; ')}.`,
      )
    }
  } else {
    lines.push(`${school.name} — what the desk has, then what it does not.`)
    for (const r of on) {
      facts.push(factLine(r.label, r.value, { mark: r.mark, note: r.note }))
    }
    for (const r of off) {
      facts.push(`${r.label}: pending — ${r.why}`)
    }
  }

  const filed = on.filter((r) => r.mark === 'reported')
  const est = on.filter((r) => r.mark === 'estimated')
  if (filed.length || est.length) {
    lines.push(
      'Capacity / pay lines tagged reported are a filing or a newsroom story that quotes one (990 / MFRS / FOIA). Estimated is a named residual or unofficial term. Modeled stays labeled and is not a filing.',
    )
  }
  if (cap.fy) lines.push(`Capacity stack year label: ${cap.fy} — latest extract, not invented ${season} dollars.`)
  if (school.capacity?.gapNote) lines.push(school.capacity.gapNote)
  lines.push(`${DEFS.buyout.label}: ${DEFS.buyout.text}`)
  lines.push('See the school page for every source. Empty means we looked.')

  return {
    text: lines.join(' '),
    facts,
    links: dedupeLinks([
      { to: schoolHref(school.id, season), label: `${school.name} page` },
      { to: '/methods', label: 'Methods' },
      ...off.slice(0, 3).map((r) => (r.hash ? { to: schoolHref(school.id, season, r.hash), label: r.label } : null)).filter(Boolean),
    ]),
    suggested: [
      `What NIL do you have for ${school.name}?`,
      'What is booked vs modeled vs pending?',
      'Which schools have booked House spent?',
    ],
  }
}

function refuseAnswer() {
  return {
    text: 'Public Cap does not carry On3, recruiting ranks, or franchise valuations. The desk is capacity, the House cap, booked NIL, leftover (when House spent exists), a labeled industry football roster survey when CBS/SI named a school, cited position bands when those pieces state one, the comparable NIL reported bar, TV, buyouts, and public rosters.',
    links: [
      { to: '/', label: 'Rank list' },
      { to: '/methods', label: 'Methods' },
    ],
    suggested: SUGGESTED_PROMPTS.slice(0, 4),
    refuse: true,
  }
}

function helpAnswer() {
  return {
    text: 'Ask about a Power 4 school (plus Notre Dame), or about coverage: what is booked vs modeled vs pending, what NIL the desk has (cites only — no On3), and what is missing. Numbers come from the public JSON only. Empty cells stay pending. Leftover is House cap minus booked House spent — not capacity − House − NIL. An industry football roster estimate is a separate modeled / survey lane and does not create leftover. The NIL reported bar plots that range on one $0–$50M scale so schools can be compared — not booked NIL and not House spent. A cited position band is an industry estimate, not a contract. Buyouts are overhang, not yearly spend.',
    links: [
      { to: '/', label: 'Rank list' },
      { to: '/methods', label: 'Methods' },
      { to: '/tv', label: 'TV' },
    ],
    suggested: SUGGESTED_PROMPTS,
  }
}

function dedupeLinks(links) {
  const seen = new Set()
  const out = []
  for (const l of links) {
    const key = `${l.to}|${l.label}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(l)
  }
  return out
}

function detectSeason(question, fallback) {
  const m = String(question || '').match(/\b(202[1-6])\b/)
  if (m) return Number(m[1])
  return fallback || CURRENT_SEASON
}

/**
 * Answer a visitor question from already-loaded public JSON.
 * Never invents a dollar, rank, or cite.
 */
export function answerDeskQuestion(question, ctx = {}) {
  const q = String(question || '').trim()
  const desk = ctx.desk
  const season = detectSeason(q, ctx.season || CURRENT_SEASON)
  const includeAlumni = !!ctx.includeAlumni
  const intents = detectIntents(q)

  if (!q) return helpAnswer()
  if (intents.has('refuse')) return refuseAnswer()
  if (!desk?.schools?.length) {
    return {
      text: 'Desk JSON is not loaded yet. Open the panel on thepubliccap.com after the book paints, or refresh.',
      links: [{ to: '/', label: 'Rank list' }],
    }
  }

  if (intents.has('defineLeftover') && matchSchools(q, desk.schools).length === 0) {
    return answerDefine('houseRemaining')
  }
  if (intents.has('defineHouse') && !intents.has('lanes')) return answerDefine('house')
  if (intents.has('defineNil') && !intents.has('coverage')) return answerDefine('nil')
  if (intents.has('defineCapacity') && !intents.has('coverage')) return answerDefine('capacity')
  if (intents.has('defineModeled') && !intents.has('coverage')) return answerDefine('nilModeled')
  if (intents.has('defineRosterEstimate') && matchSchools(q, desk.schools).length === 0) {
    return answerDefine('industryRosterEstimate')
  }
  if (intents.has('definePositionEstimate') && matchSchools(q, desk.schools).length === 0) {
    return answerDefine('industryPositionEstimate')
  }
  if (intents.has('defineReportedNil') && matchSchools(q, desk.schools).length === 0) {
    return answerDefine('nilReportedBar')
  }
  if (intents.has('defineBuyout') && matchSchools(q, desk.schools).length === 0) {
    return answerDefine('buyout')
  }
  if (intents.has('lanes') && matchSchools(q, desk.schools).length === 0) {
    return lanesAnswer()
  }
  if (intents.has('coverage') && matchSchools(q, desk.schools).length === 0 && !intents.has('listHouseSpent')) {
    return coverageMapAnswer()
  }
  if (intents.has('methods') && matchSchools(q, desk.schools).length === 0) {
    return {
      text: 'Methods is the source of record for every definition on this desk. Pending means we looked and do not have a number.',
      links: [{ to: '/methods', label: 'Methods' }],
      suggested: SUGGESTED_PROMPTS.slice(0, 3),
    }
  }

  if (intents.has('listHouseSpent') || (/which schools|who has/.test(fold(q)) && /house spent|booked house|leftover/.test(fold(q)))) {
    return listHouseSpent(desk, season)
  }
  if (intents.has('listRosterEstimate')) {
    return listRosterEstimates(desk, season)
  }
  if (intents.has('listPositionEstimate')) {
    return listPositionEstimates(desk, season)
  }

  const ids = matchSchools(q, desk.schools)
  const byId = Object.fromEntries(desk.schools.map((s) => [s.id, s]))

  if (ids.length >= 1 && intents.has('reportedNil')) {
    if (ids.length >= 2) {
      return compareReportedNil(byId[ids[0]], byId[ids[1]], season, includeAlumni, desk)
    }
    const raw = byId[ids[0]]
    const facts = schoolFacts(raw, season, includeAlumni, desk)
    return reportedNilAnswer(facts.school, season, facts.spent, facts.booked)
  }

  if (ids.length >= 2 && (intents.has('compare') || intents.has('leftover') || intents.has('capacity') || intents.has('bookedNil') || /compare|\bvs\b|versus| and /.test(fold(q)))) {
    return compareSchools(byId[ids[0]], byId[ids[1]], season, includeAlumni, intents, desk)
  }

  if (ids.length === 1) {
    const raw = byId[ids[0]]
    if (intents.has('nilCoverage') || (intents.has('doYouHave') && intents.has('bookedNil') && !intents.has('leftover') && !intents.has('houseSpent'))) {
      return nilCoverageAnswer(raw, season, includeAlumni, desk)
    }
    if (intents.has('missing') || (intents.has('coverage') && !intents.has('leftover') && !intents.has('tv') && !intents.has('roster') && !intents.has('positionEstimate') && !intents.has('rosterEstimate'))) {
      return missingAnswer(raw, season, includeAlumni, desk, { leadMissing: intents.has('missing') || /missing/.test(fold(q)) })
    }
    const out = schoolAnswer(raw, season, includeAlumni, intents, ctx.tv, ctx.rosters, desk, q)
    if (intents.has('houseCap') && desk.meta) {
      const house = houseValueForSeason(desk.meta, season)
      const field = houseFieldForSeason(desk.meta, season)
      const bit =
        house == null
          ? ' No House cap (pre-settlement) on this season.'
          : ` House cap on this season is ${money(house)} (${field?.confidence || 'reported'}). Same number for every participating school.`
      out.text = `${out.text}${bit}`
    }
    return out
  }

  if (ids.length > 2) {
    return {
      text: `Matched ${ids.length} schools. Ask about one school, or compare two (for example “compare Louisville and Kentucky leftover”).`,
      links: ids.slice(0, 4).map((id) => ({ to: schoolHref(id, season), label: byId[id].name })),
      suggested: SUGGESTED_PROMPTS,
    }
  }

  const coaches = matchCoaches(q, ctx.coachFa)
  if (coaches.length === 1) return coachFaAnswer(coaches[0], season)
  if (coaches.length > 1) {
    return {
      text: `Offsets desk matches: ${coaches.map((c) => c.name).join(', ')}. Ask for one name.`,
      links: coaches.map((c) => ({ to: `/coach-fa/${c.id}`, label: c.name })),
    }
  }

  if (/hello|hi there|help|what can you/.test(fold(q))) return helpAnswer()

  return {
    text: 'I can look up booked cells — leftover, House spent, booked NIL, capacity, conference media, buyouts, roster starters, the labeled industry football roster survey when one exists, cited position bands when CBS/SI stated one, and how a school compares on the NIL reported bar. Name a Power 4 school (or Notre Dame), or ask what leftover means. I will not invent a dollar.',
    links: [
      { to: '/', label: 'Rank list' },
      { to: '/methods', label: 'Methods' },
    ],
    suggested: SUGGESTED_PROMPTS,
  }
}

/** Schools with a leftover / House spent cell after the season overlay. */
export function bookedHouseSpentSchools(desk, season = CURRENT_SEASON) {
  return (desk?.schools || [])
    .map((raw) => overlaySchool(raw, season))
    .filter((s) => leftoverBundle(s).spent != null)
    .map((s) => s.id)
}

