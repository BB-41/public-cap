/**
 * Share URLs, captions, and a tiny canvas card for the desk charts.
 * No chart library. No OG image service.
 */

import { CURRENT_SEASON } from './seasons.js'
import { money, moneyExact, moneyRange, winsPerM } from './format.js'
import { isPlayerHash, isPosHash } from './nilHistory.js'

export const DEFAULT_TITLE = 'Public Cap — College Athletics Capacity Desk'
export const SITE = 'thepubliccap.com'

export const SCHOOL_DRILLS = new Set([
  'stack-media',
  'stack-spon',
  'stack-tix',
  'stack-give',
  'stack-extra',
  'capacity',
  'house',
  'nil',
  'nil-modeled',
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

export const PAGE_TITLES = {
  home: DEFAULT_TITLE,
  tape: 'Tape — Public Cap',
  methods: 'Methods — Public Cap',
  buyout: 'Buyout — Public Cap',
  coachFa: 'Offsets / free agents — Public Cap',
  compare: 'Compare — Public Cap',
  tv: 'TV — Public Cap',
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

function upsertHomeJsonLd(on) {
  if (typeof document === 'undefined') return
  let el = document.getElementById(HOME_JSON_LD_ID)
  if (!on) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('script')
    el.id = HOME_JSON_LD_ID
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Public Cap',
        url: `https://${SITE}/`,
      },
      {
        '@type': 'Organization',
        name: 'Public Cap',
        url: `https://${SITE}/`,
      },
    ],
  })
}

/** Set document title, matching og:title, and a canonical URL for the current route. */
export function applyDocumentMeta({ title, path, jsonLd = false }) {
  const href = canonicalUrl(path)
  if (typeof document === 'undefined') return href
  document.title = title
  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:url', href)
  upsertCanonical(href)
  upsertHomeJsonLd(jsonLd)
  return href
}

export function schoolTitle(name, season) {
  const yr = season && season !== CURRENT_SEASON ? ` · ${season}` : ''
  return `${name}${yr} — Public Cap`
}

export function compareTitle(nameA, nameB, season) {
  const yr = season && season !== CURRENT_SEASON ? ` · ${season}` : ''
  return `${nameA} vs ${nameB}${yr} — Public Cap`
}

export function schoolCaption(name) {
  return `${name} — capacity stack — Public Cap`
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
  const w = 1000
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
    sub: seasonTag(season, fy),
    footer: `Public Cap  ·  ${SITE}  ·  ${seasonTag(season, fy)}`,
  })
  const max = Math.max(1, ...values)
  metrics.forEach((m, i) => {
    const y = top + i * rowH
    const va = m.va
    const vb = m.vb
    ctx.fillStyle = PAPER_DIM
    ctx.font = `12px ${FONT}`
    ctx.fillText(fitText(ctx, m.label, 200), 36, y + 18)
    const mid = 250
    const half = 250
    ctx.fillStyle = INK2
    ctx.fillRect(mid, y + 6, half, 12)
    ctx.fillRect(mid + half + 16, y + 6, half, 12)
    ctx.fillStyle = GOLD
    ctx.fillRect(mid, y + 6, va ? Math.max(2, (va / max) * half) : 0, 12)
    ctx.fillStyle = BLOOD
    ctx.fillRect(mid + half + 16, y + 6, vb ? Math.max(2, (vb / max) * half) : 0, 12)
    ctx.fillStyle = PAPER
    ctx.font = `11px ${FONT}`
    ctx.fillText(fitText(ctx, m.da, 118), mid, y + 32)
    ctx.textAlign = 'right'
    ctx.fillText(fitText(ctx, m.db, 118), mid + half + 16 + half, y + 32)
    ctx.textAlign = 'left'
  })
  if (openLabel) {
    ctx.fillStyle = GOLD
    ctx.font = `12px ${FONT}`
    ctx.fillText(fitText(ctx, openLabel, w - 72), 36, h - 44)
  }
  downloadCanvas(canvas, pngName([A.shortName || A.id, B.shortName || B.id], season))
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
