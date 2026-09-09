/**
 * Share URLs, captions, and a tiny canvas card for the desk charts.
 * No chart library. No OG image service.
 */

import { CURRENT_SEASON } from './seasons.js'
import { money, moneyExact, moneyRange, winsPerM } from './format.js'
import { isPlayerHash, isPosHash } from './nilHistory.js'

export const DEFAULT_TITLE = 'Public Cap — Capacity vs House cap vs booked NIL'
export const SITE = 'thepubliccap.com'
export const SCHOOL_TITLE_FRAME = 'Capacity vs House cap vs booked NIL'

export const SCHOOL_DRILLS = new Set([
  'stack-media',
  'stack-spon',
  'stack-tix',
  'stack-give',
  'stack-extra',
  'capacity',
  'house',
  'house-spent',
  'leftover',
  'nil',
  'nil-modeled',
  'roster-estimate',
  'nil-reported',
  'position-estimate',
  'debt',
  'conference-exit',
])

export function isSchoolDrill(key) {
  return SCHOOL_DRILLS.has(key) || isPosHash(key) || isPlayerHash(key)
}

export const COMPARE_VIEWS = new Set([
  'capacity',
  'house',
  'nil',
  'nilModeled',
  'media',
  'tix',
  'give',
  'extra',
  'fb',
  'buy',
  'winsPerNil',
  'winsPerCap',
])

export const COMPARE_TO_SCHOOL_HASH = {
  capacity: 'capacity',
  house: 'house',
  nil: 'nil',
  nilModeled: 'nil-modeled',
  media: 'stack-media',
  tix: 'stack-tix',
  give: 'stack-give',
  extra: 'stack-extra',
  winsPerNil: 'nil',
  winsPerCap: 'capacity',
}

const INK = '#100e0b'
const INK2 = '#1a1712'
const PAPER = '#efe4cc'
const PAPER_DIM = '#cfc3a8'
const GOLD = '#d4a24a'
const BLOOD = '#c43b22'
const MUTED = '#9a8d74'
const RULE = '#8a7d62'
const SLATE = '#6e8ca0'
const SAGE = '#6e8b62'
const FONT = 'Arial, Helvetica, sans-serif'

const BAR_FILL = {
  media: '#c4a35a',
  spon: '#8a7d4a',
  tix: '#b9a98a',
  give: SAGE,
  extra: SLATE,
  total: PAPER,
  house: BLOOD,
  nil: GOLD,
  'nil-modeled': SLATE,
  a: GOLD,
  b: BLOOD,
}

export function publicOrigin() {
  if (typeof location === 'undefined') return `https://${SITE}`
  const host = location.host || ''
  if (host === SITE || host === `www.${SITE}` || host.endsWith('.pages.dev')) {
    return `https://${SITE}`
  }
  return location.origin
}

export function hashKey(raw) {
  return String(raw || '').replace(/^#/, '')
}

export function alumniSearch(includeAlumni) {
  return includeAlumni ? 'alumni=1' : ''
}

export function deskSearch({ season, includeAlumni, extra } = {}) {
  const p = new URLSearchParams()
  if (season && season !== CURRENT_SEASON) p.set('season', String(season))
  if (includeAlumni) p.set('alumni', '1')
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v != null && v !== '') p.set(k, String(v))
    }
  }
  const qs = p.toString()
  return qs ? `?${qs}` : ''
}

export function homePath({ season, includeAlumni } = {}) {
  return `/${deskSearch({ season, includeAlumni })}`
}

export function schoolPath(id, season, hash, includeAlumni) {
  const qs = deskSearch({ season, includeAlumni })
  const h = hash ? `#${hashKey(hash)}` : ''
  return `/school/${id}${qs}${h}`
}

export function compareSearch({ a, b, season, view, includeAlumni }) {
  const p = new URLSearchParams()
  if (a) p.set('a', a)
  if (b) p.set('b', b)
  if (season && season !== CURRENT_SEASON) p.set('season', String(season))
  if (includeAlumni) p.set('alumni', '1')
  if (view && COMPARE_VIEWS.has(view)) p.set('view', view)
  const qs = p.toString()
  return qs ? `?${qs}` : ''
}

export function comparePath({ a, b, season, view, includeAlumni }) {
  const qs = compareSearch({ a, b, season, view, includeAlumni })
  const h = view && COMPARE_VIEWS.has(view) ? `#${view}` : ''
  return `/compare${qs}${h}`
}

export function canonicalUrl(path) {
  return `${publicOrigin()}${path}`
}

export const OG_DEFAULT_PATH = '/og-default.png'
export const OG_REPORTED_NIL_PATH = '/og-reported-nil.png'

export function ogImageFromPath(pathname) {
  const origin = typeof location === 'undefined' ? `https://${SITE}` : publicOrigin()
  if (pathname === '/reported-nil') return `${origin}${OG_REPORTED_NIL_PATH}`
  return `${origin}${OG_DEFAULT_PATH}`
}

export const PAGE_TITLES = {
  home: DEFAULT_TITLE,
  tape: 'Tape — Public Cap',
  methods: 'Methods — Public Cap',
  buyout: 'Buyout — Public Cap',
  coachFa: 'Coach buyout offsets / free agents — Public Cap',
  compare: 'Compare capacity vs House vs NIL — Public Cap',
  reportedNil: 'Reported NIL by school — Power 4 football roster stack — Public Cap',
  tv: 'TV — Public Cap',
}

export const PAGE_DESCRIPTIONS = {
  home: 'Two ceilings on every Power 4 program: the House benefits cap, and what they can actually write this year from public filings. Then booked NIL. Collective 990 payout is a separate cited lane. Pending stays empty.',
  tape: 'A dated log of filings that moved a Public Cap figure — booked NIL, collective 990 payouts, contracts, and House-cap Q&As. Not a news feed. Empty means no public filing on the desk yet.',
  methods: 'How Public Cap books Power 4 capacity, the House benefits cap, booked NIL, and collective 990 payouts. Pending stays empty. We do not invent House or NIL dollars.',
  buyout: 'What a school would owe if it fired the current football coach without cause. A liability, not yearly spend. Empty without a cite.',
  coachFa: 'Residual School A buyout after a firing, plus a labeled modeled School B salary. Offset rules stay booked or cite-only. Empty without a cite — we do not invent remaining principal.',
  compare: 'Compare two Power 4 programs: annual capacity versus the House benefits cap versus booked NIL. Collective 990 payout stays in its own cited lane. Pending stays empty.',
  reportedNil:
    'Reported NIL by school: named survey ranges versus labeled modeled conference bands for the Power 4 football roster stack — all 68 Power 4 + Notre Dame schools on one $0–$50M scale. Booked NIL and House spent stay separate. Not leftover.',
  tv: 'Conference TV contracts, holders, and school media checks when a filing exists. Notre Dame’s NBC football deal is the school-level exception. Empty means pending.',
  school:
    'Annual capacity from public filings versus the House benefits cap versus booked NIL. Reported football NIL is a separate survey range or labeled modeled conference band — not booked NIL and not a midpoint. Collective 990 payout is a separate cited lane, not House. Pending stays empty.',
}

const HOME_JSON_LD_ID = 'public-cap-jsonld'

function upsertMeta(attr, key, content) {
  if (typeof document === 'undefined') return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href) {
  if (typeof document === 'undefined') return
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function siteJsonLd() {
  return {
    '@type': 'WebSite',
    name: 'Public Cap',
    alternateName: 'College Athletics Capacity Desk',
    url: `https://${SITE}/`,
    description: PAGE_DESCRIPTIONS.home,
  }
}

function upsertRouteJsonLd(kind, { title, description, href }) {
  if (typeof document === 'undefined') return
  let el = document.getElementById(HOME_JSON_LD_ID)
  if (!kind) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('script')
    el.id = HOME_JSON_LD_ID
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  if (kind === 'home') {
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        siteJsonLd(),
        {
          '@type': 'Organization',
          name: 'Public Cap',
          url: `https://${SITE}/`,
        },
      ],
    })
    return
  }
  el.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description: description || PAGE_DESCRIPTIONS.school,
    url: href,
    isPartOf: siteJsonLd(),
  })
}

/** Set document title, description, matching OG/Twitter tags, and a canonical URL. */
export function applyDocumentMeta({ title, path, description, jsonLd = false, image }) {
  const href = canonicalUrl(path)
  const img = image || ogImageFromPath(path)
  if (typeof document === 'undefined') return href
  document.title = title
  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:url', href)
  upsertMeta('property', 'og:site_name', 'Public Cap')
  upsertMeta('property', 'og:image', img)
  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('name', 'twitter:title', title)
  upsertMeta('name', 'twitter:image', img)
  if (description) {
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:description', description)
    upsertMeta('name', 'twitter:description', description)
  }
  upsertCanonical(href)
  upsertRouteJsonLd(jsonLd, { title, description, href })
  return href
}

export function displayNameFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function schoolTitle(name, season) {
  const yr = season && season !== CURRENT_SEASON ? ` · ${season}` : ''
  return `${name}${yr} — ${SCHOOL_TITLE_FRAME} — reported football NIL — Public Cap`
}

export function compareTitle(nameA, nameB, season) {
  const yr = season && season !== CURRENT_SEASON ? ` · ${season}` : ''
  return `${nameA} vs ${nameB}${yr} — Capacity vs House vs NIL — Public Cap`
}

export function coachFaTitle(coachName) {
  if (!coachName) return PAGE_TITLES.coachFa
  return `${coachName} — Coach buyout offsets — Public Cap`
}

export function schoolDescription(schoolOrName) {
  const name = typeof schoolOrName === 'string' ? schoolOrName : schoolOrName?.name
  if (!name) return PAGE_DESCRIPTIONS.school
  const gap = typeof schoolOrName === 'object' && !!(schoolOrName.revenueGap || schoolOrName.private)
  if (gap) {
    return `${name} football revenue on Public Cap is booked capacity from public filings, not a full athletic-revenue total. House cap and booked NIL sit beside it. Reported football NIL is a separate survey range or labeled modeled conference band — not booked NIL and not a midpoint. Collective 990 payout is a separate cited lane. Pending stays empty.`
  }
  return `${name} — annual capacity from public filings versus the House benefits cap versus booked NIL. Reported football NIL is a separate survey range or labeled modeled conference band — not booked NIL and not a midpoint. Collective 990 payout is a separate cited lane, not House. Pending stays empty.`
}

export function pageDescription(kind) {
  return PAGE_DESCRIPTIONS[kind] || PAGE_DESCRIPTIONS.home
}

export function titleFromPath(pathname, { season, schoolName, compareNames, coachName } = {}) {
  const p = pathname || '/'
  if (p === '/') return PAGE_TITLES.home
  if (p.startsWith('/school/')) {
    const name = schoolName || displayNameFromSlug(p.split('/')[2])
    return name ? schoolTitle(name, season) : PAGE_TITLES.home
  }
  if (p === '/compare') {
    if (compareNames?.[0] && compareNames?.[1]) return compareTitle(compareNames[0], compareNames[1], season)
    return PAGE_TITLES.compare
  }
  if (p === '/reported-nil') return PAGE_TITLES.reportedNil
  if (p === '/coach-fa' || p.startsWith('/coach-fa/')) return coachFaTitle(coachName)
  if (p === '/tape') return PAGE_TITLES.tape
  if (p === '/methods') return PAGE_TITLES.methods
  if (p === '/buyout') return PAGE_TITLES.buyout
  if (p === '/tv') return PAGE_TITLES.tv
  return DEFAULT_TITLE
}

export function descriptionFromPath(pathname, { school, schoolName, coachName } = {}) {
  const p = pathname || '/'
  if (p === '/') return PAGE_DESCRIPTIONS.home
  if (p.startsWith('/school/')) {
    return schoolDescription(school || schoolName || displayNameFromSlug(p.split('/')[2]))
  }
  if (p === '/compare') return PAGE_DESCRIPTIONS.compare
  if (p === '/reported-nil') return PAGE_DESCRIPTIONS.reportedNil
  if (p === '/coach-fa' || p.startsWith('/coach-fa/')) {
    if (coachName) {
      return `${coachName} — residual School A buyout after a firing, plus a labeled modeled School B salary. Offset rules stay booked or cite-only. Empty without a cite.`
    }
    return PAGE_DESCRIPTIONS.coachFa
  }
  if (p === '/tape') return PAGE_DESCRIPTIONS.tape
  if (p === '/methods') return PAGE_DESCRIPTIONS.methods
  if (p === '/buyout') return PAGE_DESCRIPTIONS.buyout
  if (p === '/tv') return PAGE_DESCRIPTIONS.tv
  return PAGE_DESCRIPTIONS.home
}

export function schoolCaption(name) {
  return `${name} — capacity vs House cap vs booked NIL — Public Cap`
}

export function compareCaption(nameA, nameB) {
  return `${nameA} vs ${nameB} — capacity vs House vs NIL — Public Cap`
}

export function seasonTag(season, fy) {
  const bits = []
  if (fy) bits.push(fy)
  if (season) bits.push(`football ${season}`)
  return bits.join(' · ')
}

function slug(s) {
  return String(s || 'chart')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function pngName(parts, season) {
  return `public-cap-${parts.map(slug).filter(Boolean).join('-')}${season ? `-${season}` : ''}.png`
}

function makeCanvas(cssW, cssH) {
  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  return { canvas, ctx }
}

function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 2500)
  }, 'image/png')
}

function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1)
  return `${t}…`
}

function paintFrame(ctx, w, h, { kicker, title, sub, footer }) {
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = BLOOD
  ctx.fillRect(0, 0, w, 6)
  ctx.fillStyle = GOLD
  ctx.font = `600 11px ${FONT}`
  ctx.fillText(kicker, 36, 36)
  ctx.fillStyle = PAPER
  ctx.font = `700 28px ${FONT}`
  ctx.fillText(fitText(ctx, title, w - 72), 36, 72)
  ctx.fillStyle = PAPER_DIM
  ctx.font = `13px ${FONT}`
  ctx.fillText(fitText(ctx, sub, w - 72), 36, 96)
  ctx.strokeStyle = RULE
  ctx.beginPath()
  ctx.moveTo(36, 112)
  ctx.lineTo(w - 36, 112)
  ctx.stroke()
  ctx.fillStyle = MUTED
  ctx.font = `11px ${FONT}`
  ctx.fillText(footer, 36, h - 22)
}

export function downloadStackPng({ school, season, cap, house, nil, houseLabel, openLabel, includeAlumni }) {
  const shown = includeAlumni ? cap.total : cap.booked
  const rows = [
    ...cap.components.map((c) => ({
      label: c.key === 'extra' && !includeAlumni ? `${c.label} (excluded)` : c.label,
      value: c.value,
      key: c.key,
      display: c.value ? money(c.value) : '—',
    })),
    { label: includeAlumni ? 'Annual capacity' : 'Annual capacity (booked only)', value: shown, key: 'total', display: money(shown) },
    {
      label: houseLabel,
      value: house || 0,
      key: 'house',
      display: house == null ? 'no House cap' : money(house),
    },
    { label: 'NIL booked', value: nil || 0, key: 'nil', display: nil == null ? 'pending' : money(nil) },
    school.nil.modeled
      ? {
          label: 'NIL modeled',
          value: school.nil.modeled.mid,
          key: 'nil-modeled',
          display: moneyRange(school.nil.modeled.low, school.nil.modeled.high),
        }
      : { label: 'NIL modeled', value: 0, key: 'nil-modeled', display: 'pending' },
  ]
  const maxBar = Math.max(cap.total, house || 0, nil || 0, school.nil.modeled?.high || 0, 1)
  const w = 920
  const rowH = 34
  const top = 128
  const extra = openLabel ? 36 : 0
  const h = top + rows.length * rowH + 56 + extra
  const { canvas, ctx } = makeCanvas(w, h)
  const fy = school.capacity?.fiscalYearPrimary
  paintFrame(ctx, w, h, {
    kicker: 'PUBLIC CAP',
    title: school.name,
    sub: [school.conference, seasonTag(season, fy)].filter(Boolean).join(' · '),
    footer: `Public Cap  ·  ${SITE}  ·  ${seasonTag(season, fy)}`,
  })
  rows.forEach((r, i) => {
    const y = top + i * rowH
    ctx.fillStyle = PAPER_DIM
    ctx.font = `13px ${FONT}`
    ctx.fillText(fitText(ctx, r.label, 250), 36, y + 16)
    const trackX = 300
    const trackW = 480
    ctx.fillStyle = INK2
    ctx.fillRect(trackX, y + 4, trackW, 14)
    const bw = Math.max(r.value ? 3 : 0, (r.value / maxBar) * trackW)
    ctx.fillStyle = BAR_FILL[r.key] || PAPER_DIM
    ctx.fillRect(trackX, y + 4, bw, 14)
    ctx.fillStyle = PAPER
    ctx.font = `12px ${FONT}`
    ctx.textAlign = 'right'
    ctx.fillText(r.display, w - 36, y + 16)
    ctx.textAlign = 'left'
  })
  if (openLabel) {
    ctx.fillStyle = GOLD
    ctx.font = `12px ${FONT}`
    ctx.fillText(fitText(ctx, openLabel, w - 72), 36, h - 44)
  }
  downloadCanvas(canvas, pngName([school.shortName || school.id], season))
}

export function downloadComparePng({ A, B, season, house, metrics, values, openLabel }) {
  const w = 1100
  const rowH = 36
  const top = 128
  const extra = openLabel ? 36 : 0
  const h = top + metrics.length * rowH + 56 + extra
  const { canvas, ctx } = makeCanvas(w, h)
  const fyA = A.capacity?.fiscalYearPrimary
  const fyB = B.capacity?.fiscalYearPrimary
  const fy = fyA && fyB && fyA !== fyB ? `${fyA} / ${fyB}` : fyA || fyB
  paintFrame(ctx, w, h, {
    kicker: 'PUBLIC CAP',
    title: `${A.name} vs ${B.name}`,
    sub: `${seasonTag(season, fy)}  ·  difference is A − B`,
    footer: `Public Cap  ·  ${SITE}  ·  ${seasonTag(season, fy)}`,
  })
  const max = Math.max(1, ...values)
  metrics.forEach((m, i) => {
    const y = top + i * rowH
    const va = m.va
    const vb = m.vb
    ctx.fillStyle = PAPER_DIM
    ctx.font = `12px ${FONT}`
    ctx.fillText(fitText(ctx, m.label, 176), 36, y + 18)
    const mid = 220
    const half = 210
    const gap = 12
    ctx.fillStyle = INK2
    ctx.fillRect(mid, y + 6, half, 12)
    ctx.fillRect(mid + half + gap, y + 6, half, 12)
    ctx.fillStyle = GOLD
    ctx.fillRect(mid, y + 6, va ? Math.max(2, (va / max) * half) : 0, 12)
    ctx.fillStyle = BLOOD
    ctx.fillRect(mid + half + gap, y + 6, vb ? Math.max(2, (vb / max) * half) : 0, 12)
    ctx.fillStyle = PAPER
    ctx.font = `11px ${FONT}`
    ctx.fillText(fitText(ctx, m.da, 118), mid, y + 32)
    ctx.textAlign = 'right'
    ctx.fillText(fitText(ctx, m.db, 118), mid + half + gap + half, y + 32)
    if (m.dd) {
      ctx.fillStyle = m.dd === 'pending' ? MUTED : PAPER
      ctx.fillText(fitText(ctx, m.dd, 220), w - 36, y + 18)
    }
    ctx.textAlign = 'left'
  })
  if (openLabel) {
    ctx.fillStyle = GOLD
    ctx.font = `12px ${FONT}`
    ctx.fillText(fitText(ctx, openLabel, w - 72), 36, h - 44)
  }
  downloadCanvas(canvas, pngName([A.shortName || A.id, B.shortName || B.id], season))
}

/**
 * Coach-FA share card. Booked / reported stack + cites.
 * Modeled B salary is labeled modeled. Empty cells stay empty — no invented $0.
 */
export function downloadCoachFaPng({
  coach,
  prior,
  current,
  scenario,
  cites,
  statusLine,
}) {
  const rows = []
  const pushRow = (label, display, key) => {
    rows.push({ label, display: display == null ? '' : String(display), key })
  }

  if (hasCitedDollar(coach?.buyout?.grossRemaining)) {
    pushRow(
      'A residual',
      `${moneyExact(coach.buyout.grossRemaining)}  ${coach.buyout.confidence || ''}`.trim(),
      'a',
    )
  } else {
    pushRow('A residual', '', 'a')
  }

  pushRow('Offset', offsetFormulaDisplay(coach?.offset), 'offset')

  if (hasCitedDollar(scenario?.offsetCredit?.value)) {
    pushRow(
      'Offset credit',
      `${moneyExact(scenario.offsetCredit.value)}  ${scenario.offsetCredit.confidence || ''}`.trim(),
      'credit',
    )
  } else {
    pushRow('Offset credit', '', 'credit')
  }

  if (hasCitedDollar(scenario?.netCostToA?.value)) {
    pushRow(
      'Still owe at A',
      `${moneyExact(scenario.netCostToA.value)}  ${scenario.netCostToA.confidence || ''}`.trim(),
      'net',
    )
  } else {
    pushRow('Still owe at A', '', 'net')
  }

  const bName = current?.shortName || current?.name || scenario?.schoolBId || 'School B'
  if (hasCitedDollar(scenario?.annualSalary)) {
    pushRow(`Modeled ${bName} salary`, `${moneyExact(scenario.annualSalary)}  modeled`, 'b')
  } else {
    pushRow(`Modeled ${bName} salary`, '', 'b')
  }

  if (scenario?.allIn && hasCitedDollar(scenario?.allInToFan?.value)) {
    pushRow(
      'All-in (two payers)',
      `${moneyExact(scenario.allInToFan.value)}  ${scenario.allInToFan.confidence || ''}`.trim(),
      'allin',
    )
  }

  const citeLine = (cites || [])
    .map((c) => c.label)
    .filter(Boolean)
    .slice(0, 2)
    .join(' · ')

  const w = 920
  const rowH = 36
  const top = 128
  const extra = citeLine ? 28 : 0
  const h = top + rows.length * rowH + 56 + extra
  const { canvas, ctx } = makeCanvas(w, h)
  const priorName = prior?.shortName || prior?.name || coach?.priorSchoolId || 'School A'
  paintFrame(ctx, w, h, {
    kicker: 'PUBLIC CAP',
    title: coach?.name || 'Offsets',
    sub: [statusLine, `${priorName} residual`].filter(Boolean).join(' · '),
    footer: `Public Cap  ·  ${SITE}  ·  offsets / free agents`,
  })
  rows.forEach((r, i) => {
    const y = top + i * rowH
    ctx.fillStyle = PAPER_DIM
    ctx.font = `13px ${FONT}`
    ctx.fillText(fitText(ctx, r.label, 280), 36, y + 18)
    ctx.fillStyle = r.key === 'b' ? SLATE : PAPER
    ctx.font = `13px ${FONT}`
    ctx.textAlign = 'right'
    ctx.fillText(fitText(ctx, r.display, 360), w - 36, y + 18)
    ctx.textAlign = 'left'
  })
  if (citeLine) {
    ctx.fillStyle = MUTED
    ctx.font = `11px ${FONT}`
    ctx.fillText(fitText(ctx, citeLine, w - 72), 36, h - 44)
  }
  downloadCanvas(canvas, pngName(['coach-fa', coach?.id || 'coach']))
}

function hasCitedDollar(n) {
  return n != null && Number.isFinite(Number(n))
}

function offsetFormulaDisplay(offset) {
  if (!offset) return ''
  const raw = String(offset.offsetFormula || '').toLowerCase().replace(/_/g, '-')
  if (raw === 'none' || offset.offsetApplies === false) return 'None'
  if (raw === 'dollar-for-dollar' || raw === 'dollar-for-dollar-overlap') return 'Dollar-for-dollar'
  return offset.offsetFormula || ''
}

export function formatExact(n) {
  return moneyExact(n)
}

export function formatWins(n) {
  return winsPerM(n)
}

export function downloadNilHistoryPng({ school, season, title, subtitle, points, openLabel }) {
  const w = 920
  const top = 128
  const chartH = 168
  const extra = openLabel ? 28 : 0
  const h = top + chartH + 72 + extra
  const { canvas, ctx } = makeCanvas(w, h)
  const fy = school.capacity?.fiscalYearPrimary
  paintFrame(ctx, w, h, {
    kicker: 'PUBLIC CAP',
    title: title || school.name,
    sub: [subtitle, seasonTag(season, fy)].filter(Boolean).join(' · '),
    footer: `Public Cap  ·  ${SITE}  ·  modeled roster-share`,
  })
  const left = 56
  const right = w - 36
  const trackW = right - left
  const baseY = top + chartH
  const max = Math.max(1, ...points.map((p) => Math.max(p.high || 0, p.booked || 0, p.mid || 0)))
  const n = points.length
  const gap = n > 1 ? trackW / (n - 1) : 0
  const xAt = (i) => left + i * gap
  const yAt = (v) => baseY - ((v || 0) / max) * (chartH - 8)

  ctx.strokeStyle = RULE
  ctx.beginPath()
  ctx.moveTo(left, baseY)
  ctx.lineTo(right, baseY)
  ctx.stroke()

  const modeled = points
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.mid != null)
  if (modeled.length) {
    ctx.beginPath()
    modeled.forEach(({ p, i }, k) => {
      const x = xAt(i)
      if (k === 0) ctx.moveTo(x, yAt(p.high))
      else ctx.lineTo(x, yAt(p.high))
    })
    for (let k = modeled.length - 1; k >= 0; k--) {
      const { p, i } = modeled[k]
      ctx.lineTo(xAt(i), yAt(p.low))
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(110, 140, 160, 0.35)'
    ctx.fill()

    ctx.strokeStyle = SLATE
    ctx.lineWidth = 2
    ctx.beginPath()
    modeled.forEach(({ p, i }, k) => {
      const x = xAt(i)
      if (k === 0) ctx.moveTo(x, yAt(p.mid))
      else ctx.lineTo(x, yAt(p.mid))
    })
    ctx.stroke()
    ctx.lineWidth = 1
  }

  points.forEach((p, i) => {
    const x = xAt(i)
    ctx.fillStyle = PAPER_DIM
    ctx.font = `11px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(String(p.year), x, baseY + 18)
    if (p.booked != null) {
      ctx.fillStyle = GOLD
      ctx.beginPath()
      ctx.arc(x, yAt(p.booked), 4, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.potSource === 'booked-school' && p.mid != null) {
      ctx.strokeStyle = GOLD
      ctx.beginPath()
      ctx.arc(x, yAt(p.mid), 5, 0, Math.PI * 2)
      ctx.stroke()
    }
  })
  ctx.textAlign = 'left'
  ctx.fillStyle = SLATE
  ctx.font = `11px ${FONT}`
  ctx.fillText('Modeled allocation', left, baseY + 40)
  ctx.fillStyle = GOLD
  ctx.fillText('Booked school pot (position split still modeled)', left + 140, baseY + 40)
  if (openLabel) {
    ctx.fillStyle = GOLD
    ctx.font = `12px ${FONT}`
    ctx.fillText(fitText(ctx, openLabel, w - 72), 36, h - 44)
  }
  downloadCanvas(canvas, pngName([school.shortName || school.id, slug(title || 'nil-history')], season))
}
