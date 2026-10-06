/** Map a cited contract step schedule onto remaining games. */

import { moneyExact } from './format.js'

export const DESK_TODAY = '2026-09-16'
export const DEFAULT_SCHOOL = 'florida-state'

/**
 * As-of dates before the 2026 season — the Oct 8, 2025 USA TODAY database
 * and the other 2025 cites — are not a current buyout. Show the date.
 * Do not present the dollar as today's figure.
 */
export const STALE_ASOF_BEFORE = '2026-01-01'

/** USA TODAY football database. Page updated Oct. 8, 2025; buyout column is Dec. 1, 2025. */
export const USAT_FOOTBALL_COACH_URL = 'https://sportsdata.usatoday.com/ncaa/salaries/football/coach'
export const USAT_BUYOUT_ASOF = '2025-12-01'

/** A cited as-of older than this many months before the desk date is stale. */
export const STALE_AFTER_MONTHS = 9

export const HOT_SEAT_PATH = '/buyout/hot-seat'
export const HOT_SEAT_IDS = [
  'rutgers',
  'south-carolina',
  'florida-state',
  'clemson',
  'colorado',
  'purdue',
  'maryland',
  'texas',
]
export const HOT_SEAT_TITLE = 'Hot-seat coach buyouts | The Public Cap'
export const HOT_SEAT_DESCRIPTION =
  'Cited buyouts for eight football coaches on the hot seat, each with its source and as-of date. Pending stays pending. A firing liability, not yearly spend.'

export const BUYOUT_TITLE_BRAND = ' | The Public Cap'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function parseIso(iso) {
  if (!iso) return null
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) }
}

/** Calendar months, clamped to the last day of the target month. */
export function addMonths(iso, months) {
  const p = parseIso(iso)
  if (!p || !Number.isFinite(months)) return null
  const total = p.mo - 1 + months
  const y = p.y + Math.floor(total / 12)
  const mo = ((total % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate()
  const d = Math.min(p.d, lastDay)
  return `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function addDays(iso, n) {
  const p = parseIso(iso)
  if (!p) return null
  const dt = new Date(Date.UTC(p.y, p.mo - 1, p.d + n))
  const y = dt.getUTCFullYear()
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

export function cmpIso(a, b) {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a < b ? -1 : a > b ? 1 : 0
}

export function formatLongDate(iso) {
  const p = parseIso(iso)
  if (!p) return iso || 'TBD'
  return `${MONTHS[p.mo - 1]} ${p.d}, ${p.y}`
}

export function formatThrough(iso) {
  if (!iso) return 'open-ended'
  return `through ${formatLongDate(iso)}`
}

/** Accept {through, amount} or school-desk {asOf, remaining, contractYear}. */
export function normalizeStep(step) {
  if (!step) return null
  const amount = step.amount ?? step.remaining ?? null
  let through = step.through || null
  if (!through && step.asOf) {
    const y = Number(String(step.asOf).slice(0, 4))
    if (y) through = `${y}-12-31`
  }
  if (!through && step.contractYear) {
    const m = String(step.contractYear).match(/(20\d{2})/)
    if (m) through = `${m[1]}-12-31`
  }
  return { ...step, amount, through, remaining: step.remaining ?? amount }
}

export function normalizeSteps(steps) {
  return (steps || []).map(normalizeStep).filter(Boolean)
}

/**
 * Prefer school-desk buyout.steps when a PDF table produced a remaining tape.
 * The calculator then maps remaining → amount and asOf/contractYear → through.
 */
export function mergeSchoolSteps(bookCoach, schoolBuyout) {
  if (!bookCoach) return null
  const schoolSteps = schoolBuyout?.steps
  const raw = schoolSteps?.length ? schoolSteps : bookCoach.steps
  const steps = normalizeSteps(raw)
  const hasDollar = steps.some((s) => s.amount != null)
  return {
    ...bookCoach,
    steps,
    tape: hasDollar ? 'steps' : bookCoach.tape,
  }
}

/** Step in force on a calendar date.
 * Prefer the latest remaining asOf on or before the date (daily-proration tapes).
 * Fall back to inclusive through-date stairs when asOf is missing.
 */
export function stepInForce(steps, isoDate) {
  if (!steps?.length || !isoDate) return null
  const dated = normalizeSteps(steps)
  const withAsOf = dated.filter((s) => s.asOf).slice().sort((a, b) => cmpIso(a.asOf, b.asOf))
  if (withAsOf.length) {
    let pick = null
    for (const s of withAsOf) {
      if (cmpIso(s.asOf, isoDate) <= 0) pick = s
    }
    return pick || withAsOf[0]
  }
  const withThrough = dated
    .filter((s) => s.through)
    .slice()
    .sort((a, b) => cmpIso(a.through, b.through))
  for (const s of withThrough) {
    if (isoDate <= s.through) return s
  }
  return withThrough[withThrough.length - 1] || null
}

/** Label a remaining-as-of or through-date step. */
export function stepDateLabel(step) {
  if (!step) return 'step'
  if (step.firedLabel) return step.firedLabel
  if (step.asOf) return `as of ${formatLongDate(step.asOf)}`
  if (step.through) return formatThrough(step.through)
  return 'Current overhang'
}

export function afterKickoffDate(game) {
  if (!game?.date) return null
  return addDays(game.date, 1)
}

export function upcomingGames(games, today = DESK_TODAY) {
  return (games || []).filter((g) => !g.date || g.date >= today)
}

export function overhangAsStep(coach) {
  const oh = coach?.overhang
  if (!oh || oh.amount == null) return null
  return {
    through: null,
    amount: oh.amount,
    rule: oh.rule,
    confidence: oh.confidence || 'reported',
    source: oh.source,
    asOf: oh.asOf,
    firedLabel: oh.firedLabel || null,
    overhang: true,
  }
}

export function currentStep(coach, today = DESK_TODAY) {
  if (!coach) return null
  const steps = normalizeSteps(coach.steps)
  if (coach.tape === 'steps' || steps.some((s) => s.amount != null)) {
    return stepInForce(steps, today)
  }
  if (coach.tape === 'overhang') return overhangAsStep(coach)
  return null
}

export function mapGames(games, coach, today = DESK_TODAY) {
  const upcoming = upcomingGames(games, today)
  return upcoming.map((g) => {
    const after = afterKickoffDate(g)
    let step = null
    let pendingTape = false
    if ((coach?.tape === 'steps' || normalizeSteps(coach?.steps).some((s) => s.amount != null)) && after) {
      step = stepInForce(coach.steps, after)
    } else if (coach?.tape === 'overhang') {
      step = overhangAsStep(coach)
      pendingTape = true
    } else {
      pendingTape = true
    }
    return {
      game: g,
      afterDate: after,
      step,
      amount: step?.amount ?? null,
      confidence: step?.confidence || (coach?.tape === 'pending' ? 'pending' : null),
      pendingTape,
    }
  })
}

export function gameLabel(game) {
  if (!game) return '—'
  const opp = game.opponent || 'TBD'
  const loc = game.homeAway === 'away' ? 'at ' : game.homeAway === 'neutral' ? 'vs. ' : 'vs. '
  return `${loc}${opp}`
}

export function afterLabel(row) {
  const opp = row.game?.opponent || 'TBD'
  const date = row.game?.dateLabel || (row.game?.date ? formatLongDate(row.game.date) : 'date TBD')
  return `after ${opp}, ${date}`
}

export function classifyTape(coach) {
  return coach?.tape || 'pending'
}

export function coachOptions(book, schools) {
  const list = []
  const schoolBy = new Map((schools || []).map((s) => [s.id, s]))
  for (const [id, coach] of Object.entries(book?.coaches || {})) {
    const school = schoolBy.get(id)
    list.push({
      id,
      schoolName: school?.name || id,
      shortName: school?.shortName || school?.name || id,
      conference: school?.conference || '',
      coach: coach.name,
      tape: coach.tape,
      sport: coach.sport || 'fb',
    })
  }
  list.sort((a, b) => a.schoolName.localeCompare(b.schoolName))
  return list
}

export function buyoutPath(schoolId) {
  return `/buyout/${schoolId || DEFAULT_SCHOOL}`
}

export function schoolIdFromBuyoutPath(pathname) {
  if (!pathname?.startsWith('/buyout/')) return null
  const id = pathname.split('/')[2] || ''
  if (!id || id === 'hot-seat') return null
  return id
}

/** Clean share URL. Query-string links 301 here. */
export function sharePath(schoolId, sport = 'fb') {
  const path = buyoutPath(schoolId)
  if (sport && sport !== 'fb') return `${path}?sport=${encodeURIComponent(sport)}`
  return path
}

/**
 * Headline cite from a buyouts.json coach. Dollars and dates are the stored
 * step or overhang — never estimated.
 */
export function buyoutCite(coach, today = DESK_TODAY) {
  if (!coach?.name) return null
  const step = currentStep(coach, today)
  const amount = step?.amount ?? null
  if (amount == null) {
    return {
      name: coach.name,
      amount: null,
      asOf: null,
      source: null,
      confidence: null,
      freshness: 'pending',
    }
  }
  const asOf = step?.asOf || null
  let freshness = 'desk'
  if (!asOf) freshness = 'undated'
  else if (asOf < STALE_ASOF_BEFORE) freshness = 'stale'
  else if (asOf > today) freshness = 'later'
  return {
    name: coach.name,
    amount,
    asOf,
    source: step?.source || null,
    confidence: step?.confidence || null,
    freshness,
    priorContract: Boolean(coach.priorContract),
    firedLabel: step?.firedLabel || null,
  }
}

export function isUsatFootballBuyout(cite) {
  return cite?.source?.url === USAT_FOOTBALL_COACH_URL && cite?.asOf === USAT_BUYOUT_ASOF
}

/** Visible source line for a USA TODAY buyout column figure. */
export function usatBuyoutSourceText() {
  return 'USA TODAY coaches salary database, buyout as of Dec. 1, 2025'
}

/**
 * Newer contract exists; the printed dollar is the prior USA TODAY figure.
 * signedLabel is omitted when the repo does not record a date.
 */
export function priorContractFootnote(coach) {
  if (!coach?.priorContract || !coach?.name) return null
  const when = coach.priorContract.signedLabel ? ` (${coach.priorContract.signedLabel})` : ''
  return `${coach.name} signed a newer contract${when}. The updated buyout figure is pending; the figure above reflects the prior contract.`
}

/**
 * Visible staleness. A replaced contract uses the same pending phrase as the
 * footnote. Otherwise a figure whose as-of is more than about 9 months before
 * the desk date is marked old. Pending (no dollar) is not a stale dollar.
 */
export function buyoutStaleness(coach, today = DESK_TODAY) {
  const cite = buyoutCite(coach, today)
  if (!cite || cite.amount == null) return null
  if (cite.priorContract) {
    return {
      kind: 'prior-contract',
      label: 'Prior-contract figure, new deal pending',
    }
  }
  if (cite.asOf) {
    const aged = addMonths(cite.asOf, STALE_AFTER_MONTHS)
    if (aged && aged < today) {
      return {
        kind: 'older-than-9-months',
        label: 'Figure older than 9 months',
      }
    }
  }
  return null
}

/** Firing condition when the cite stored one; otherwise the as-of date. */
export function citeTimingPhrase(cite) {
  if (!cite) return ''
  if (cite.firedLabel) return cite.firedLabel
  if (cite.asOf) return `as of ${formatLongDate(cite.asOf)}`
  return ''
}

export function buyoutSourceLabel(cite) {
  if (!cite || cite.amount == null) return null
  if (isUsatFootballBuyout(cite)) return usatBuyoutSourceText()
  return cite.source?.label || null
}

/** Same-conference buyout pages, hot-seat peers first. Hub is added by the caller. */
export function relatedBuyoutSchools(schoolId, schools, { peerLimit = 5 } = {}) {
  const list = schools || []
  const byId = new Map(list.map((s) => [s.id, s]))
  const self = byId.get(schoolId)
  const conf = self?.conference || ''
  const hot = new Set(HOT_SEAT_IDS)
  const peers = list
    .filter((s) => s.id && s.id !== schoolId && conf && s.conference === conf)
    .sort((a, b) => {
      const ah = hot.has(a.id) ? 0 : 1
      const bh = hot.has(b.id) ? 0 : 1
      if (ah !== bh) return ah - bh
      return String(a.shortName || a.name).localeCompare(String(b.shortName || b.name))
    })
  const picked = []
  const push = (s) => {
    if (!s?.id || s.id === schoolId || picked.some((p) => p.id === s.id)) return
    picked.push(s)
  }
  for (const s of peers) {
    if (picked.length >= peerLimit) break
    push(s)
  }
  if (picked.length < 4) {
    for (const id of HOT_SEAT_IDS) {
      if (picked.length >= peerLimit) break
      push(byId.get(id))
    }
  }
  if (picked.length < 4) {
    const rest = list
      .filter((s) => s.id && s.id !== schoolId)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    for (const s of rest) {
      if (picked.length >= peerLimit) break
      push(s)
    }
  }
  return picked.slice(0, peerLimit)
}

export function hotSeatEntries(book, schools) {
  const byId = new Map((schools || []).map((s) => [s.id, s]))
  return HOT_SEAT_IDS.map((id) => {
    const coach = book?.coaches?.[id] || null
    const school = byId.get(id) || null
    const cite = coach ? buyoutCite(coach) : null
    return {
      id,
      coach,
      school,
      cite,
      staleness: coach ? buyoutStaleness(coach) : null,
      schoolName: school?.name || id,
      coachName: coach?.name || '',
    }
  })
}

export function buyoutHeading(coach) {
  const cite = buyoutCite(coach)
  return cite?.name ? `${cite.name} buyout` : 'Buyout'
}

/** Sentences before the source line. Dollars stay the stored cite. */
export function buyoutLead(coach, today = DESK_TODAY) {
  const cite = buyoutCite(coach, today)
  if (!cite?.name) return null
  if (cite.freshness === 'pending') {
    return `${cite.name} buyout: no cited dollar on this desk. We do not invent a figure. A liability if fired without cause, not yearly spend.`
  }
  const when = citeTimingPhrase(cite)
  let text = `${cite.name} buyout: ${moneyExact(cite.amount)}${when ? ` ${when}` : ''}.`
  const next = cite.firedLabel ? laterFiredStep(coach, today) : null
  if (next?.amount != null && next.firedLabel) {
    text += ` Then ${moneyExact(next.amount)} ${next.firedLabel}.`
  }
  if (cite.priorContract) text += ' Prior-contract figure, new deal pending.'
  else if (cite.freshness === 'stale') text += ' That as-of date is not current.'
  else if (cite.freshness === 'later') {
    text += ` That date is later than ${formatLongDate(today)}, so this is not the buyout if fired on the desk date.`
  } else if (cite.freshness === 'undated') {
    text += ' No as-of date is stored on this step, so it is not presented as current.'
  }
  return text
}

/** Next dated step after the desk date, used when the headline is a firing condition. */
function laterFiredStep(coach, today) {
  const steps = normalizeSteps(coach?.steps)
    .filter((s) => s.amount != null && s.asOf && s.asOf > today && s.firedLabel)
    .sort((a, b) => cmpIso(a.asOf, b.asOf))
  return steps[0] || null
}

export function buyoutSourceSentence(coach, today = DESK_TODAY) {
  const cite = buyoutCite(coach, today)
  if (!cite || cite.amount == null) return null
  if (isUsatFootballBuyout(cite)) return `Source: ${usatBuyoutSourceText()}.`
  if (cite.source?.label) return `Source: ${cite.source.label}.`
  return null
}

export function buyoutTitle(coach, today = DESK_TODAY) {
  const cite = buyoutCite(coach, today)
  if (!cite?.name) return `Buyout${BUYOUT_TITLE_BRAND}`
  if (cite.amount == null) return `${cite.name} buyout${BUYOUT_TITLE_BRAND}`
  const dollars = moneyExact(cite.amount)
  if (cite.firedLabel) {
    return `${cite.name} buyout: ${dollars} ${cite.firedLabel}${BUYOUT_TITLE_BRAND}`
  }
  if (cite.asOf && cite.priorContract) {
    return `${cite.name} buyout: ${dollars} as of ${formatLongDate(cite.asOf)} — prior-contract figure, new deal pending${BUYOUT_TITLE_BRAND}`
  }
  if (cite.asOf) return `${cite.name} buyout: ${dollars} as of ${formatLongDate(cite.asOf)}${BUYOUT_TITLE_BRAND}`
  return `${cite.name} buyout: ${dollars}${BUYOUT_TITLE_BRAND}`
}

export function buyoutDescription(coach, today = DESK_TODAY) {
  const cite = buyoutCite(coach, today)
  if (!cite?.name) {
    return 'What a school would owe if it fired the current football coach without cause. A liability, not yearly spend. Empty without a cite.'
  }
  const lead = buyoutLead(coach, today)
  if (cite.freshness === 'pending') return lead
  const footnote = priorContractFootnote(coach)
  const source = buyoutSourceSentence(coach, today)
  let text = lead
  if (footnote) text += ` ${footnote}`
  if (source) text += ` ${source}`
  text += ' If-fired overhang, not yearly spend.'
  return text
}

function escHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function stalenessHtml(staleness) {
  if (!staleness) return ''
  return `\n        <p class="buyout-staleness" data-buyout-staleness="${escHtml(staleness.kind)}">${escHtml(staleness.label)}</p>`
}

function relatedBuyoutsHtml(school, schools) {
  if (!school?.id) return ''
  const peers = relatedBuyoutSchools(school.id, schools)
  const items = [
    `<li><a href="/school/${escHtml(school.id)}">${escHtml(school.name || school.id)} school page</a></li>`,
    `<li><a href="${HOT_SEAT_PATH}">Hot-seat buyouts</a></li>`,
    ...peers.map(
      (s) => `<li><a href="/buyout/${escHtml(s.id)}">${escHtml(s.shortName || s.name)} buyout</a></li>`,
    ),
  ]
  return `\n        <nav class="buyout-related" aria-label="Related buyouts">
          <h2>Related buyouts</h2>
          <ul>
            ${items.join('\n            ')}
          </ul>
        </nav>`
}

function contractHtml(coach) {
  const bits = []
  if (coach?.contract?.url) {
    bits.push(`<a href="${escHtml(coach.contract.url)}">${escHtml(coach.contract.label || 'Contract')}</a>`)
  }
  for (const file of coach?.contract?.files || []) {
    if (!file?.url || file.url === coach?.contract?.url) continue
    bits.push(`<a href="${escHtml(file.url)}">${escHtml(file.label || 'Contract file')}</a>`)
  }
  if (!bits.length) return ''
  return `\n        <p class="fine">Contract: ${bits.join(' · ')}</p>`
}

/** Crawler body for /buyout/<school-id>. Same sentences as the meta description. */
export function renderBuyoutStaticBody(coach, school, schools) {
  const cite = buyoutCite(coach)
  const heading = buyoutHeading(coach)
  const lede = buyoutLead(coach) || buyoutDescription(coach)
  const footnote = priorContractFootnote(coach)
  const staleness = buyoutStaleness(coach)
  let sourceP = ''
  if (isUsatFootballBuyout(cite)) {
    sourceP = `\n        <p class="field-meta">Source: <a href="${escHtml(cite.source.url)}">USA TODAY coaches salary database</a>, buyout as of Dec. 1, 2025</p>`
  } else if (cite?.source?.url) {
    const when = cite.firedLabel ? '' : cite.asOf ? ` · as of ${escHtml(formatLongDate(cite.asOf))}` : ''
    sourceP = `\n        <p class="field-meta">Source: <a href="${escHtml(cite.source.url)}">${escHtml(cite.source.label || 'source')}</a>${when}</p>`
  } else if (cite?.source?.label) {
    sourceP = `\n        <p class="field-meta">Source: ${escHtml(cite.source.label)}</p>`
  }
  const footnoteP = footnote ? `\n        <p class="buyout-footnote">${escHtml(footnote)}</p>` : ''
  const closer = cite?.amount != null ? ' If-fired overhang, not yearly spend.' : ''
  const rootAttr = staleness ? ` data-buyout-staleness="${escHtml(staleness.kind)}"` : ''
  return `<div class="page-wrap buyout-static"${rootAttr}>
        <h1 class="issue-hed">${escHtml(heading)}</h1>
        <p class="lede">${escHtml(lede)}${closer}</p>${sourceP}${stalenessHtml(staleness)}${footnoteP}${contractHtml(coach)}${relatedBuyoutsHtml(school, schools)}
      </div>`
}

/** Crawler body for /buyout/hot-seat. Dollars are the buyout book, never estimated. */
export function renderHotSeatStaticBody(book, schools) {
  const rows = hotSeatEntries(book, schools)
    .map((row) => {
      const hrefBuy = `/buyout/${escHtml(row.id)}`
      const hrefSchool = `/school/${escHtml(row.id)}`
      const when = row.cite?.amount == null ? 'Pending' : citeTimingPhrase(row.cite) || 'Pending'
      const dollars = row.cite?.amount == null ? 'Pending' : moneyExact(row.cite.amount)
      const source = buyoutSourceLabel(row.cite)
      const sourceBit = row.cite?.source?.url && source
        ? `<a href="${escHtml(row.cite.source.url)}">${escHtml(source)}</a>`
        : escHtml(source || 'Pending')
      const badge = row.staleness
        ? ` <span class="buyout-staleness" data-buyout-staleness="${escHtml(row.staleness.kind)}">${escHtml(row.staleness.label)}</span>`
        : ''
      return `          <tr data-school="${escHtml(row.id)}"${row.staleness ? ` data-buyout-staleness="${escHtml(row.staleness.kind)}"` : ''}>
            <td><a href="${hrefBuy}">${escHtml(row.coachName || 'Coach')}</a></td>
            <td><a href="${hrefSchool}">${escHtml(row.schoolName)}</a></td>
            <td>${escHtml(dollars)}</td>
            <td>${escHtml(when)}${badge}</td>
            <td>${sourceBit}</td>
          </tr>`
    })
    .join('\n')
  return `<div class="page-wrap buyout-static hot-seat">
        <h1 class="issue-hed">Hot-seat coach buyouts</h1>
        <p class="lede">${escHtml(HOT_SEAT_DESCRIPTION)}</p>
        <p class="fine"><a href="/buyout">Buyout calculator</a></p>
        <table class="rank hot-seat-table">
          <thead>
            <tr>
              <th>Coach</th>
              <th>School</th>
              <th>Buyout</th>
              <th>As of</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </div>`
}
