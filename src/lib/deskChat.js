/**
 * Deterministic desk chat. Answers come from the public JSON only.
 * No hosted model. Empty cells stay pending. Booked and modeled stay distinct.
 */

import {
  computeCapacity,
  displayCap,
  hasVal,
  leadBookedNil,
  leadHouseRemaining,
} from './compute.js'
import { DEFS } from './definitions.js'
import { money, moneyExact, moneyRange } from './format.js'
import { modeledNilForSeason } from './nilModel.js'
import { applySeason, CURRENT_SEASON, houseFieldForSeason, houseValueForSeason } from './seasons.js'
import { comparePath, schoolPath } from './share.js'
import { deskMedia, schoolCheck } from './tv.js'
import { getCoach, hasDollar, listCoaches } from './coachFa.js'

export const CHAT_VOICE =
  'Lookup only. Grounded in the public desk JSON. Empty stays empty. Booked and modeled stay distinct.'

export const SUGGESTED_PROMPTS = [
  "What's Louisville's leftover / House spent / booked NIL?",
  'Which schools have booked House spent?',
  "What's SMU's conference media line — is it full TV?",
  "Who is Washington's starting QB on the roster?",
  'Compare Louisville and Kentucky leftover',
  'What does leftover mean?',
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

function pendingLine(school, cell, hash) {
  return `${school.name}’s ${cell} cell is pending — the desk does not have a number. See the ${school.name} page.`
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
  if (/what does leftover|explain leftover|leftover mean|meaning of leftover|what is leftover|what leftover is/.test(t)) {
    intents.add('defineLeftover')
  }
  if (/what is (the )?house cap|what does house cap|explain house cap/.test(t)) intents.add('defineHouse')
  if (/what is booked nil|what does booked nil|explain booked nil/.test(t)) intents.add('defineNil')
  if (/what is (annual )?capacity|what does capacity mean|explain capacity/.test(t)) intents.add('defineCapacity')
  if (/what is (nil )?modeled|explain modeled nil|what does modeled/.test(t)) intents.add('defineModeled')
  if (/which schools|who has booked|schools have booked|booked house spent/.test(t) && /house spent|booked house|leftover/.test(t)) {
    intents.add('listHouseSpent')
  }
  if (/leftover|house remaining|remaining house/.test(t)) intents.add('leftover')
  if (/house spent|spent cell|year 1 spent/.test(t)) intents.add('houseSpent')
  if (/booked nil|nil booked/.test(t) || (/\bnil\b/.test(t) && !/modeled/.test(t) && !/990/.test(t))) {
    intents.add('bookedNil')
  }
  if (/modeled nil|nil modeled/.test(t)) intents.add('modeledNil')
  if (/house cap/.test(t) && !intents.has('defineHouse')) intents.add('houseCap')
  if (/\bcapacity\b/.test(t) && !intents.has('defineCapacity')) intents.add('capacity')
  if (/\btv\b|media (rights|line|check|deal)|conference media|full tv|broadcast media/.test(t)) intents.add('tv')
  if (/starting qb|qb1|\bqb\b|roster|who is .+ start|depth chart/.test(t)) intents.add('roster')
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
  return {
    text: def ? `${def.label}: ${def.text}` : extra || 'See Methods.',
    links: [{ to: '/methods', label: 'Methods' }],
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

function schoolAnswer(raw, season, includeAlumni, intents, tv, rosters, desk) {
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

  if (intents.has('roster')) {
    return rosterAnswer(school, rosters, season)
  }

  if (intents.has('coach') && !intents.has('leftover') && !intents.has('bookedNil') && !intents.has('capacity')) {
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
      lines.push(pendingLine(school, 'capacity', 'capacity'))
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
      lines.push(pendingLine(school, 'booked NIL', 'nil'))
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
      lines.push(pendingLine(school, 'House spent', 'house-spent'))
      lines.push('Leftover is only computed when a booked House spent cell exists. We do not invent leftover from a cap plan.')
      links.push({ to: schoolHref(school.id, season, 'house'), label: `${school.name} House` })
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
      facts.push(factLine('Leftover', leftover.value, { mark: mark(leftover.field, 'estimated'), note: yl }))
      links.push({ to: schoolHref(school.id, season, 'leftover'), label: `${school.name} leftover` })
    } else {
      lines.push(pendingLine(school, 'leftover', 'leftover'))
      lines.push('Leftover is House Year 1 cap minus booked House spent, only when that spent cell exists.')
      links.push({ to: schoolHref(school.id, season, 'leftover'), label: `${school.name} leftover` })
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
    lines.push(pendingLine(school, 'conference media', 'stack-media'))
  }

  for (const ex of checks) {
    if (ex.kind === 'reported-exception') {
      const fullTv = /no tv|not a television|not an equal|partial|nothing from media|nine years/i.test(
        `${ex.name || ''} ${ex.notes || ''}`,
      )
      if (ex.value != null) {
        lines.push(`${ex.name}: ${money(ex.value)} (${ex.confidence || 'reported'}).`)
      } else {
        lines.push(`${ex.name}.`)
      }
      if (fullTv) lines.push('The TV book says this is not a full media equal share.')
      if (ex.notes) lines.push(ex.notes)
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

function refuseAnswer() {
  return {
    text: 'Public Cap does not carry On3, recruiting ranks, or franchise valuations. The desk is capacity, the House cap, booked NIL, leftover (when House spent exists), TV, buyouts, and public rosters.',
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
    text: 'Ask about a Power 4 school (plus Notre Dame): leftover, House spent, booked NIL, capacity, conference media, buyouts, or a roster starter. Numbers come from the public JSON only. Empty cells stay pending. Booked and modeled stay distinct. Leftover is House cap minus booked House spent — not capacity − House − NIL.',
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
  if (intents.has('defineHouse')) return answerDefine('house')
  if (intents.has('defineNil')) return answerDefine('nil')
  if (intents.has('defineCapacity')) return answerDefine('capacity')
  if (intents.has('defineModeled')) return answerDefine('nilModeled')
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

  const ids = matchSchools(q, desk.schools)
  const byId = Object.fromEntries(desk.schools.map((s) => [s.id, s]))

  if (ids.length >= 2 && (intents.has('compare') || intents.has('leftover') || intents.has('capacity') || intents.has('bookedNil') || /compare|\bvs\b|versus| and /.test(fold(q)))) {
    return compareSchools(byId[ids[0]], byId[ids[1]], season, includeAlumni, intents, desk)
  }

  if (ids.length === 1) {
    const out = schoolAnswer(byId[ids[0]], season, includeAlumni, intents, ctx.tv, ctx.rosters, desk)
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
    text: 'I can look up booked cells — leftover, House spent, booked NIL, capacity, conference media, buyouts, and roster starters. Name a Power 4 school (or Notre Dame), or ask what leftover means. I will not invent a dollar.',
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

