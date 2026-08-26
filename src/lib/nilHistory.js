/**
 * Position / player NIL history across the year-picker span.
 *
 * Position dollars are an allocation of the school pot across that year’s
 * named roster, not reported player contracts. Pot, in order:
 *   1. that year’s booked school / collective NIL when a FOIA / MFRS / 990 /
 *      counsel cell exists
 *   2. else that year’s already-on-desk modeled school NIL band
 *
 * Spread with the existing nilRoster unit card, then sum by position.
 * Years with no named roster file fall back to the same rate card.
 *
 * Every position point/band is labeled modeled unless it is a real booked
 * player cell or the school booked cell itself. We do not invent On3-style
 * “QB market” percentages or booked player dollars.
 *
 * No On3 / Opendorse / NIL Go / social.
 */

import { hasVal, val, computeCapacity } from './compute.js'
import { modeledNilForSeason } from './nilModel.js'
import {
  FAMILY_SEATS,
  allocateNamedPlayers,
  namedRosterOnly,
  scaleRosterToModeled,
} from './nilRoster.js'
import { SEASONS, houseValueForSeason, applySeasonForNil } from './seasons.js'

export const FAMILY_ORDER = ['qb', 'rb', 'wr', 'te', 'ol', 'edge', 'dl', 'lb', 'cb', 's', 'k', 'ath']

export const FAMILY_LABELS = {
  qb: 'QB',
  rb: 'RB',
  wr: 'WR',
  te: 'TE',
  ol: 'OL',
  edge: 'EDGE',
  dl: 'DL',
  lb: 'LB',
  cb: 'CB',
  s: 'S',
  k: 'ST',
  ath: 'ATH',
}

export function familyLabel(family) {
  return FAMILY_LABELS[family] || String(family || '').toUpperCase() || '—'
}

export function posHash(family) {
  return `pos-${family}`
}

export function playerHash(name) {
  return `player-${nameSlug(name)}`
}

export function nameSlug(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function isPosHash(key) {
  if (!key || !String(key).startsWith('pos-')) return false
  return !!FAMILY_SEATS[String(key).slice(4)]
}

export function isPlayerHash(key) {
  return !!key && /^player-[a-z0-9-]+$/.test(String(key))
}

export function parsePosFamily(key) {
  if (!isPosHash(key)) return ''
  return String(key).slice(4)
}

export function parsePlayerSlug(key) {
  if (!isPlayerHash(key)) return ''
  return String(key).slice(7)
}

export const HISTORY_NOTES =
  'Position dollars are an allocation of the school pot across that year’s named roster, not reported player contracts. The pot is the booked school / collective cell when a FOIA / MFRS / 990 / counsel filing exists; otherwise the on-desk school modeled band. Years without a named roster file use the same position rate card. Not marketplace valuations. Not an On3 / Opendorse / NIL Go player scrape.'

export const HISTORY_METHOD =
  'Named football players at this position (or the position rate card when that year has no roster file) share that year’s school pot via the existing roster unit card, then we sum the position. Pot = booked school cell if one exists, else the conference-heuristic modeled band. The position split is labeled modeled. A booked label is only a real booked player or school cell — not an invented QB-market percentage.'

/**
 * Prefer a real booked school/collective cell as the allocation pot.
 * Else the on-desk modeled school band. Do not invent a new national model.
 */
export function schoolNilPot(modeled, booked) {
  if (booked != null && Number.isFinite(Number(booked))) {
    const mid = Number(booked)
    const base = modeled || {
      confidence: 'modeled',
      era: null,
      conferenceKey: null,
      conferenceTotal: mid,
    }
    return { ...base, low: mid, mid, high: mid, potSource: 'booked-school' }
  }
  if (modeled?.mid) return { ...modeled, potSource: 'modeled-school' }
  return null
}

function familyUnits(family) {
  const seat = FAMILY_SEATS[family] || FAMILY_SEATS.ath
  return seat.starterCount * seat.starterUnits + seat.depthCount * seat.depthUnits
}

function sumKey(rows, key) {
  return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0)
}

function rateCardFamilyBand(bands, modeled, family) {
  if (!bands?.dollarPerUnit || !modeled?.mid) return { low: null, mid: null, high: null }
  const mid = Math.round(familyUnits(family) * bands.dollarPerUnit)
  const lowScale = modeled.low / modeled.mid
  const highScale = modeled.high / modeled.mid
  return {
    low: Math.round(mid * lowScale),
    mid,
    high: Math.round(mid * highScale),
  }
}

/**
 * Allocate school booked onto a modeled share. Null if there is no booked
 * cell or no modeled mid to share against — never invent a booked dollar.
 */
export function allocateBooked(schoolBooked, shareMid, schoolModeledMid) {
  if (schoolBooked == null || schoolBooked === 0) return schoolBooked === 0 ? 0 : null
  if (shareMid == null || !schoolModeledMid) return null
  if (shareMid === 0) return 0
  return Math.round(schoolBooked * (shareMid / schoolModeledMid))
}

export function groupNamedByFamily(named) {
  const players = named?.players || []
  const groups = []
  const byFam = {}
  for (const fam of FAMILY_ORDER) byFam[fam] = []
  for (const p of players) {
    const fam = FAMILY_SEATS[p.family] ? p.family : 'ath'
    ;(byFam[fam] || (byFam[fam] = [])).push({ ...p, family: fam })
  }
  for (const fam of FAMILY_ORDER) {
    const rows = byFam[fam] || []
    if (!rows.length) continue
    const modeled = rows.some((p) => p.mid != null)
    groups.push({
      family: fam,
      label: familyLabel(fam),
      hash: posHash(fam),
      players: rows,
      count: rows.length,
      low: modeled ? sumKey(rows, 'low') : null,
      mid: modeled ? sumKey(rows, 'mid') : null,
      high: modeled ? sumKey(rows, 'high') : null,
    })
  }
  return groups
}

function familyPoint(family, yearRow) {
  const { year, modeled, booked, bookedField, named, bands, pot } = yearRow
  const hasRoster = !!(named?.players?.length)
  let low = null
  let mid = null
  let high = null
  let names = []
  let via = 'empty'

  if (hasRoster) {
    const group = named.players.filter((p) => (p.family || 'ath') === family)
    names = group.map((p) => p.name)
    if (group.length && group.some((p) => p.mid != null)) {
      low = sumKey(group, 'low')
      mid = sumKey(group, 'mid')
      high = sumKey(group, 'high')
      via = 'named'
    } else {
      low = 0
      mid = 0
      high = 0
      via = group.length ? 'named' : 'named-empty'
    }
  } else if (bands && pot?.mid) {
    const band = rateCardFamilyBand(bands, pot, family)
    low = band.low
    mid = band.mid
    high = band.high
    via = 'rate-card'
  }

  return {
    year,
    low,
    mid,
    high,
    label: 'modeled',
    booked: null,
    bookedSchool: booked,
    bookedField: booked != null ? bookedField : null,
    potSource: pot?.potSource || null,
    names,
    via,
    modeled,
  }
}

function playerPoint(player, year, yearRow) {
  const { modeled, booked, bookedField, pot } = yearRow
  if (!player) {
    return {
      year,
      low: null,
      mid: null,
      high: null,
      label: 'modeled',
      booked: null,
      bookedSchool: booked,
      bookedField: booked != null ? bookedField : null,
      potSource: pot?.potSource || null,
      name: null,
      via: 'empty',
      modeled,
    }
  }
  // No named booked dollars unless a public file names the athlete (none in v1).
  return {
    year,
    low: player.low,
    mid: player.mid,
    high: player.high,
    label: 'modeled',
    booked: null,
    bookedSchool: booked,
    bookedField: null,
    potSource: pot?.potSource || null,
    name: player.name,
    via: player.mid != null ? 'named' : 'names-only',
    modeled,
  }
}

export function packYear(rawSchools, meta, year) {
  const houseVal = houseValueForSeason(meta, year)
  const seasonal = rawSchools.map((s) => applySeasonForNil(s, year))
  const withCap = seasonal.map((s) => ({ ...s, _cap: computeCapacity(s) }))
  const totals = withCap.map((s) => s._cap.total)
  const byId = {}
  for (const s of withCap) {
    const modeled = s._season.modeledNil
      ? modeledNilForSeason(s, s._cap.total, totals, year, houseVal)
      : null
    const bookedField = s.nil?.booked || null
    const booked = hasVal(bookedField) ? val(bookedField) : null
    byId[s.id] = { school: s, modeled, booked, bookedField }
  }
  return { year, byId }
}

export function attachNamed(yearPack, schoolId, rosterBook) {
  const row = yearPack.byId[schoolId]
  if (!row) return null
  const entry = rosterBook?.schools?.[schoolId]
  const pot = schoolNilPot(row.modeled, row.booked)
  const bands = pot?.mid ? scaleRosterToModeled(pot) : null
  const named = pot?.mid
    ? allocateNamedPlayers(entry, pot, bands)
    : namedRosterOnly(entry)
  return {
    year: yearPack.year,
    modeled: row.modeled,
    booked: row.booked,
    bookedField: row.bookedField,
    pot,
    named,
    bands,
  }
}

export function buildSchoolHistoryFromYears(schoolId, yearRows) {
  const years = yearRows
  const familySeries = {}
  const playerSeries = {}
  for (const fam of FAMILY_ORDER) familySeries[fam] = []

  const span = [...SEASONS].sort((a, b) => a.year - b.year)
  for (const spec of span) {
    const yearRow = years[spec.year]
    if (!yearRow) continue
    for (const fam of FAMILY_ORDER) {
      familySeries[fam].push(familyPoint(fam, yearRow))
    }
    const seen = new Set()
    for (const p of yearRow.named?.players || []) {
      const slug = nameSlug(p.name)
      if (!slug || seen.has(slug)) continue
      seen.add(slug)
      if (!playerSeries[slug]) playerSeries[slug] = { name: p.name, slug, points: [] }
    }
  }

  for (const slug of Object.keys(playerSeries)) {
    const row = playerSeries[slug]
    row.points = span.map((spec) => {
      const yearRow = years[spec.year]
      const hit = yearRow?.named?.players?.find((p) => nameSlug(p.name) === slug) || null
      return playerPoint(hit, spec.year, yearRow || { year: spec.year })
    })
    row.yearsOnRoster = row.points.filter((p) => p.name).length
  }

  return { schoolId, years, familySeries, playerSeries }
}

export function buildSchoolNilHistory(rawSchools, meta, schoolId, rosterBooks) {
  if (!rawSchools?.length || !rosterBooks) return null
  const packs = cachedYearPacks(rawSchools, meta)
  return buildSchoolNilHistoryFromPacks(schoolId, packs, rosterBooks)
}

let packCache = null

export function cachedYearPacks(rawSchools, meta) {
  if (packCache && packCache.raw === rawSchools && packCache.meta === meta) return packCache.packs
  const packs = {}
  for (const spec of SEASONS) packs[spec.year] = packYear(rawSchools, meta, spec.year)
  packCache = { raw: rawSchools, meta, packs }
  return packs
}

export function buildSchoolNilHistoryFromPacks(schoolId, packs, rosterBooks) {
  const years = {}
  for (const spec of SEASONS) {
    const yearRow = attachNamed(packs[spec.year], schoolId, rosterBooks?.[spec.year])
    if (yearRow) years[spec.year] = yearRow
  }
  return buildSchoolHistoryFromYears(schoolId, years)
}

/** Pack each season once, then attach named history for every school. */
export function buildAllNilHistory(rawSchools, meta, rosterBooks) {
  if (!rawSchools?.length || !rosterBooks) return null
  const packs = cachedYearPacks(rawSchools, meta)
  const out = {}
  for (const s of rawSchools) {
    out[s.id] = buildSchoolNilHistoryFromPacks(s.id, packs, rosterBooks)
  }
  return out
}

export function historyCaption(kind, label) {
  if (kind === 'player') return `${label} — modeled NIL by year — Public Cap`
  return `${label} — position NIL history — Public Cap`
}

export const ROSTER_YEARS = SEASONS.map((s) => s.year)

export function emptyRosterBook() {
  return { schools: {} }
}

let rosterBooksCache = null
let rosterBooksPending = null

export async function fetchRosterBooks(fetcher = fetch) {
  if (fetcher === fetch) {
    if (rosterBooksCache) return rosterBooksCache
    if (rosterBooksPending) return rosterBooksPending
  }
  const run = Promise.all(
    ROSTER_YEARS.map((year) =>
      fetcher(`/data/rosters-${year}.json`)
        .then((r) => (r.ok ? r.json() : emptyRosterBook()))
        .then((book) => [year, book])
        .catch(() => [year, emptyRosterBook()])
    )
  ).then((pairs) => {
    const map = Object.fromEntries(pairs)
    if (fetcher === fetch) rosterBooksCache = map
    return map
  })
  if (fetcher === fetch) rosterBooksPending = run
  return run
}
