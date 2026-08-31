/**
 * Position rate card (modeled desk heuristic).
 *
 * Football + a thin MBB card. A typical P4 85-man football roster plus a
 * 13-man basketball rotation is scaled so slot mids sum to 93% of the
 * *school* modeled NIL midpoint (7% left for other sports / unallocated).
 * That keeps the explanatory roster inside the conference / school modeled
 * range instead of inventing an $80M Texas board.
 *
 * Low/high on each slot track the school's modeled low/high vs mid.
 * No marketplace player-file or social scrape.
 * Named-player dollars are modeled shares of the school pot unless a news URL is attached (none in v1).
 */

export const ROSTER_POOL_SHARE = 0.93 // FB + MBB; 7% other / unallocated
export const FB_UNITS_TARGET = 85
export const MBB_UNITS_TARGET = 13

/**
 * Relative "units" per seat. Counts sum to an 85-man football roster.
 * Mid dollars = unit / sum(units×count) × school.modeled.mid × 0.93 × sportShare.
 */
export const FB_RATE_CARD = [
  { id: 'qb1', sport: 'fb', label: 'Starting QB', short: 'QB1', count: 1, units: 100, kind: 'starter' },
  { id: 'qb-depth', sport: 'fb', label: 'Backup QB', short: 'QB2+', count: 2, units: 15, kind: 'depth' },
  { id: 'rb1', sport: 'fb', label: 'Starting RB', short: 'RB', count: 2, units: 30, kind: 'starter' },
  { id: 'rb-depth', sport: 'fb', label: 'RB depth', short: 'RB+', count: 3, units: 8, kind: 'depth' },
  { id: 'wr-star', sport: 'fb', label: 'Portal / starting WR', short: 'WR1', count: 3, units: 45, kind: 'starter' },
  { id: 'wr-depth', sport: 'fb', label: 'WR depth', short: 'WR+', count: 6, units: 8, kind: 'depth' },
  { id: 'te1', sport: 'fb', label: 'Starting TE', short: 'TE', count: 2, units: 20, kind: 'starter' },
  { id: 'te-depth', sport: 'fb', label: 'TE depth', short: 'TE+', count: 2, units: 6, kind: 'depth' },
  { id: 'ol1', sport: 'fb', label: 'OL starter', short: 'OL', count: 5, units: 22, kind: 'starter' },
  { id: 'ol-depth', sport: 'fb', label: 'OL depth', short: 'OL+', count: 10, units: 8, kind: 'depth' },
  { id: 'edge1', sport: 'fb', label: 'Starting edge', short: 'EDGE', count: 2, units: 40, kind: 'starter' },
  { id: 'edge-depth', sport: 'fb', label: 'Edge depth', short: 'EDGE+', count: 4, units: 10, kind: 'depth' },
  { id: 'idl1', sport: 'fb', label: 'Starting IDL', short: 'IDL', count: 2, units: 18, kind: 'starter' },
  { id: 'idl-depth', sport: 'fb', label: 'IDL depth', short: 'IDL+', count: 4, units: 6, kind: 'depth' },
  { id: 'lb1', sport: 'fb', label: 'Starting LB', short: 'LB', count: 3, units: 16, kind: 'starter' },
  { id: 'lb-depth', sport: 'fb', label: 'LB depth', short: 'LB+', count: 5, units: 6, kind: 'depth' },
  { id: 'cb1', sport: 'fb', label: 'Starting CB', short: 'CB', count: 2, units: 22, kind: 'starter' },
  { id: 's1', sport: 'fb', label: 'Starting S', short: 'S', count: 2, units: 18, kind: 'starter' },
  { id: 'db-depth', sport: 'fb', label: 'DB depth', short: 'DB+', count: 8, units: 7, kind: 'depth' },
  { id: 'st', sport: 'fb', label: 'Specialist', short: 'ST', count: 4, units: 5, kind: 'special' },
  { id: 'scout', sport: 'fb', label: 'Developmental / scout', short: 'DEV', count: 13, units: 2, kind: 'depth' },
]

export const MBB_RATE_CARD = [
  { id: 'mbb-star', sport: 'mbb', label: 'Portal / star wing', short: 'WING1', count: 1, units: 50, kind: 'starter' },
  { id: 'mbb-pg', sport: 'mbb', label: 'Starting PG', short: 'PG', count: 1, units: 35, kind: 'starter' },
  { id: 'mbb-big', sport: 'mbb', label: 'Starting big', short: 'BIG', count: 1, units: 30, kind: 'starter' },
  { id: 'mbb-starter', sport: 'mbb', label: 'Other starter', short: 'ST2', count: 2, units: 22, kind: 'starter' },
  { id: 'mbb-rot', sport: 'mbb', label: 'Rotation', short: 'ROT', count: 4, units: 10, kind: 'depth' },
  { id: 'mbb-bench', sport: 'mbb', label: 'Bench', short: 'BN', count: 4, units: 4, kind: 'depth' },
]

function cardUnits(card) {
  return card.reduce((s, r) => s + r.units * r.count, 0)
}

export const FB_UNIT_SUM = cardUnits(FB_RATE_CARD)
export const MBB_UNIT_SUM = cardUnits(MBB_RATE_CARD)
export const ALL_UNIT_SUM = FB_UNIT_SUM + MBB_UNIT_SUM

export function scaleRosterToModeled(modeled) {
  const midPool = modeled.mid * ROSTER_POOL_SHARE
  const lowScale = modeled.low / modeled.mid
  const highScale = modeled.high / modeled.mid
  const dollarPerUnit = midPool / ALL_UNIT_SUM

  function rows(card) {
    return card.map((r) => {
      const mid = Math.round(r.units * dollarPerUnit)
      return {
        ...r,
        mid,
        low: Math.round(mid * lowScale),
        high: Math.round(mid * highScale),
        lineMid: Math.round(mid * r.count),
        lineLow: Math.round(mid * lowScale * r.count),
        lineHigh: Math.round(mid * highScale * r.count),
        confidence: 'modeled',
      }
    })
  }

  const fb = rows(FB_RATE_CARD)
  const mbb = rows(MBB_RATE_CARD)
  const sum = (list, key) => list.reduce((s, r) => s + r[key], 0)

  return {
    confidence: 'modeled',
    dollarPerUnit,
    fb,
    mbb,
    footballSeats: FB_RATE_CARD.reduce((s, r) => s + r.count, 0),
    mbbSeats: MBB_RATE_CARD.reduce((s, r) => s + r.count, 0),
    rollup: {
      fbMid: sum(fb, 'lineMid'),
      mbbMid: sum(mbb, 'lineMid'),
      mid: sum(fb, 'lineMid') + sum(mbb, 'lineMid'),
      low: sum(fb, 'lineLow') + sum(mbb, 'lineLow'),
      high: sum(fb, 'lineHigh') + sum(mbb, 'lineHigh'),
      otherMid: Math.round(modeled.mid * (1 - ROSTER_POOL_SHARE)),
    },
    notes:
      'Position bands are a desk heuristic. Slot mids sum to 93% of the school modeled NIL midpoint (football + MBB); 7% is other sports / unallocated. Low/high track the school modeled range. Not a player contract.',
  }
}

/** Illustrative depth-chart slots (no invented player names). */
export function illustrativeSlots(bands, sport = 'fb') {
  const card = sport === 'mbb' ? bands.mbb : bands.fb
  const slots = []
  for (const row of card) {
    if (row.kind === 'depth' && row.count > 3) {
      slots.push({
        id: row.id,
        label: row.label,
        short: row.short,
        seat: `${row.short} ×${row.count}`,
        low: row.low,
        high: row.high,
        mid: row.mid,
        count: row.count,
        confidence: 'modeled',
      })
      continue
    }
    for (let i = 0; i < row.count; i++) {
      slots.push({
        id: `${row.id}-${i + 1}`,
        label: row.count === 1 ? row.label : `${row.label} ${i + 1}`,
        short: row.count === 1 ? row.short : `${row.short.replace(/\+$/, '')}${i + 1}`,
        seat: row.count === 1 ? row.short : `${row.short.replace(/\+$/, '')}${i + 1}`,
        low: row.low,
        high: row.high,
        mid: row.mid,
        count: 1,
        confidence: 'modeled',
      })
    }
  }
  return slots
}

export function rateCardForMethods(exampleMid) {
  const modeled = { low: exampleMid * 0.7, mid: exampleMid, high: exampleMid * 1.15 }
  return scaleRosterToModeled(modeled)
}


export const DEV_UNITS = 2

/** Position family → starter / depth units (same card as FB_RATE_CARD). */
export const FAMILY_SEATS = {
  qb: { starterCount: 1, starterUnits: 100, depthCount: 2, depthUnits: 15, starterId: 'qb1', depthId: 'qb-depth', starterShort: 'QB1', depthShort: 'QB2+' },
  rb: { starterCount: 2, starterUnits: 30, depthCount: 3, depthUnits: 8, starterId: 'rb1', depthId: 'rb-depth', starterShort: 'RB', depthShort: 'RB+' },
  wr: { starterCount: 3, starterUnits: 45, depthCount: 6, depthUnits: 8, starterId: 'wr-star', depthId: 'wr-depth', starterShort: 'WR1', depthShort: 'WR+' },
  te: { starterCount: 2, starterUnits: 20, depthCount: 2, depthUnits: 6, starterId: 'te1', depthId: 'te-depth', starterShort: 'TE', depthShort: 'TE+' },
  ol: { starterCount: 5, starterUnits: 22, depthCount: 10, depthUnits: 8, starterId: 'ol1', depthId: 'ol-depth', starterShort: 'OL', depthShort: 'OL+' },
  edge: { starterCount: 2, starterUnits: 40, depthCount: 4, depthUnits: 10, starterId: 'edge1', depthId: 'edge-depth', starterShort: 'EDGE', depthShort: 'EDGE+' },
  dl: { starterCount: 2, starterUnits: 18, depthCount: 4, depthUnits: 6, starterId: 'idl1', depthId: 'idl-depth', starterShort: 'IDL', depthShort: 'IDL+' },
  lb: { starterCount: 3, starterUnits: 16, depthCount: 5, depthUnits: 6, starterId: 'lb1', depthId: 'lb-depth', starterShort: 'LB', depthShort: 'LB+' },
  cb: { starterCount: 2, starterUnits: 22, depthCount: 4, depthUnits: 7, starterId: 'cb1', depthId: 'db-depth', starterShort: 'CB', depthShort: 'DB+' },
  s: { starterCount: 2, starterUnits: 18, depthCount: 4, depthUnits: 7, starterId: 's1', depthId: 'db-depth', starterShort: 'S', depthShort: 'DB+' },
  k: { starterCount: 4, starterUnits: 5, depthCount: 0, depthUnits: 5, starterId: 'st', depthId: 'st', starterShort: 'ST', depthShort: 'ST' },
  ath: { starterCount: 0, starterUnits: 2, depthCount: 13, depthUnits: 2, starterId: 'scout', depthId: 'scout', starterShort: 'DEV', depthShort: 'DEV' },
}

/** MBB families when a named basketball roster file exists (none on the desk today). */
export const MBB_FAMILY_SEATS = {
  wing: { starterCount: 1, starterUnits: 50, depthCount: 4, depthUnits: 10, starterId: 'mbb-star', depthId: 'mbb-rot', starterShort: 'WING1', depthShort: 'ROT' },
  pg: { starterCount: 1, starterUnits: 35, depthCount: 2, depthUnits: 10, starterId: 'mbb-pg', depthId: 'mbb-rot', starterShort: 'PG', depthShort: 'ROT' },
  big: { starterCount: 1, starterUnits: 30, depthCount: 2, depthUnits: 10, starterId: 'mbb-big', depthId: 'mbb-rot', starterShort: 'BIG', depthShort: 'ROT' },
  g: { starterCount: 2, starterUnits: 22, depthCount: 4, depthUnits: 4, starterId: 'mbb-starter', depthId: 'mbb-bench', starterShort: 'ST2', depthShort: 'BN' },
}

export function familyMidpointUnits(seat) {
  return (seat.starterUnits + seat.depthUnits) / 2
}

export const RATE_CARD_SHARE_NOTE =
  'Modeled share of the school pot from the desk rate card, not a contract.'

export function isFullNamedRoster(rosterEntry, target = FB_UNITS_TARGET) {
  const n = Number(rosterEntry?.playerCount) || rosterEntry?.players?.length || 0
  return n >= target
}

/**
 * Cited news-URL booked player NIL. Value + http(s) URL required — no invented cell.
 */
export function citedPlayerBooked(p) {
  if (!p) return null
  const field = p.booked && typeof p.booked === 'object' ? p.booked : p.bookedNil && typeof p.bookedNil === 'object' ? p.bookedNil : null
  const value = field?.value ?? (typeof p.booked === 'number' ? p.booked : null)
  const url = field?.url || field?.sourceUrl || p.newsUrl || p.nilUrl || p.url
  if (value == null || !Number.isFinite(Number(value))) return null
  if (!url || !/^https?:\/\//i.test(String(url))) return null
  return {
    value: Number(value),
    url: String(url),
    field: {
      value: Number(value),
      url: String(url),
      source: field?.source || p.source || 'public news cite',
      confidence: field?.confidence || 'reported',
      notes: field?.notes || '',
    },
  }
}

export function seatBand(seat, role) {
  if (role === 'starter') {
    return { id: seat.starterId || 'starter', short: seat.starterShort || 'ST', units: seat.starterUnits }
  }
  if (role === 'backup') {
    return { id: seat.depthId || 'depth', short: seat.depthShort || 'D', units: seat.depthUnits }
  }
  return { id: 'scout', short: 'DEV', units: DEV_UNITS }
}

function namedPlayerNote(roleNote, modeled) {
  if (modeled?.era === 'collective') {
    return `${roleNote} ${RATE_CARD_SHARE_NOTE} Collective-era model, year-scaled — not a filing.`
  }
  return `${roleNote} ${RATE_CARD_SHARE_NOTE}`
}

function namedRosterNotes(modeled, confLabel, confMid, { fullRoster = false } = {}) {
  const seatRule = fullRoster
    ? ' On a full roster, missing wiki depth still fills starter then backup then developmental seats in listed order — not one midpoint copied onto every name at the position.'
    : ' A thin roster with no depth rank still uses the position-band midpoint.'
  if (modeled?.era === 'collective') {
    const factor = modeled.yearFactor != null ? ` (year factor ${Number(modeled.yearFactor).toFixed(3)})` : ''
    return (
      'Named-player ranges are modeled shares of this school’s football slice of the 93% pot. ' +
      `Collective-era model: the same position-band units as every other ${confLabel} school, ` +
      `scaled by this school’s year-scaled third-party midpoint` +
      (confMid ? ` ($${(confMid / 1e6).toFixed(2)}M)` : '') +
      `${factor}.${seatRule} Not a filing. Not a reported deal.`
    )
  }
  return (
    'Named-player ranges are modeled shares of this school’s football slice of the 93% pot. ' +
    `Comparative: the same position-band units as every other ${confLabel} school, scaled by this school’s modeled midpoint versus the conference median` +
    (confMid ? ` ($${(confMid / 1e6).toFixed(2)}M)` : '') +
    `.${seatRule} Not a contract. Not a reported deal unless a news URL is attached.`
  )
}

function familyOf(p, seats, fallback) {
  return seats[p.family] ? p.family : fallback
}

function orderForSeats(playersIn) {
  return playersIn
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const ra = a.p.depthRank || 0
      const rb = b.p.depthRank || 0
      const aRanked = ra > 0
      const bRanked = rb > 0
      if (aRanked !== bRanked) return aRanked ? -1 : 1
      if (aRanked && ra !== rb) return ra - rb
      return a.i - b.i
    })
}

function takeSeat(used, seat, kind) {
  if (kind === 'starter') {
    used.s += 1
    return { units: seat.starterUnits, role: 'starter', via: 'seat' }
  }
  if (kind === 'depth') {
    used.d += 1
    return { units: seat.depthUnits, role: 'backup', via: 'seat' }
  }
  return { units: DEV_UNITS, role: 'depth', via: 'seat' }
}

function assignNamedSeat(p, seat, used, { fullRoster, modeled }) {
  const rank = p.depthRank
  const booked = citedPlayerBooked(p)
  let units
  let role
  let via
  let note

  if (rank === 1 && used.s < seat.starterCount) {
    ;({ units, role } = takeSeat(used, seat, 'starter'))
    via = 'depth-chart'
    note = namedPlayerNote('Verified two-deep starter — high end of the position band.', modeled)
  } else if (rank && rank <= 3 && used.d < seat.depthCount) {
    ;({ units, role } = takeSeat(used, seat, 'depth'))
    via = 'depth-chart'
    note = namedPlayerNote('Verified two-deep backup — low end of the position band.', modeled)
  } else if (!rank && fullRoster) {
    if (used.s < seat.starterCount) {
      ;({ units, role } = takeSeat(used, seat, 'starter'))
      via = 'listed-order'
      note = namedPlayerNote(
        'Full roster, no verified depth rank — listed-order starter seat on the rate card.',
        modeled
      )
    } else if (used.d < seat.depthCount) {
      ;({ units, role } = takeSeat(used, seat, 'depth'))
      via = 'listed-order'
      note = namedPlayerNote(
        'Full roster, no verified depth rank — listed-order backup seat on the rate card.',
        modeled
      )
    } else {
      ;({ units, role } = takeSeat(used, seat, 'dev'))
      via = 'listed-order'
      note = namedPlayerNote(
        'Full roster, beyond the two-deep seats on the rate card — developmental share.',
        modeled
      )
    }
  } else if (!rank) {
    units = familyMidpointUnits(seat)
    role = 'unknown'
    via = 'midpoint'
    note = namedPlayerNote(
      'Name and position only; no verified depth-chart rank on a thin roster — midpoint of the position band.',
      modeled
    )
  } else {
    ;({ units, role } = takeSeat(used, seat, 'dev'))
    via = 'depth-chart'
    note = namedPlayerNote('Beyond the two-deep seats on the rate card — developmental share.', modeled)
  }

  if (booked) {
    return {
      booked,
      units: 0,
      role: 'booked',
      via: 'booked',
      note: `Cited booked NIL (${booked.url}) — kept; not overwritten by the rate-card band.`,
    }
  }
  return { booked: null, units, role, via, note }
}

function allocateSportPlayers(playersIn, modeled, bands, { seats, cap, fullRoster, sport, fallbackFamily }) {
  const dollarPerUnit = bands.dollarPerUnit
  const lowScale = modeled.low / modeled.mid
  const highScale = modeled.high / modeled.mid
  const used = {}
  const rows = []

  for (const { p } of orderForSeats(playersIn)) {
    const family = familyOf(p, seats, fallbackFamily)
    const seat = seats[family]
    const u = (used[family] ||= { s: 0, d: 0 })
    const assigned = assignNamedSeat(p, seat, u, { fullRoster, modeled })
    const band = assigned.role === 'booked' ? { id: 'booked', short: 'booked', units: 0 } : seatBand(seat, assigned.role)
    rows.push({ p, family, sport, ...assigned, band })
  }

  const bookedSum = rows.reduce((s, r) => s + (r.booked ? r.booked.value : 0), 0)
  const raw = rows.reduce((s, r) => (r.booked ? s : s + r.units * dollarPerUnit), 0)
  const modeledCap = Math.max(0, cap - bookedSum)
  const scale = raw > modeledCap && raw > 0 ? modeledCap / raw : 1

  const players = rows.map((r) => {
    if (r.booked) {
      const mid = Math.max(0, Math.round(r.booked.value))
      return {
        name: r.p.name,
        pos: r.p.pos,
        family: r.family,
        sport: r.sport,
        class: r.p.class || '',
        className: r.p.className || '',
        jersey: r.p.jersey || '',
        depthRank: r.p.depthRank || null,
        role: 'booked',
        via: 'booked',
        band: r.band.id,
        bandShort: r.band.short,
        units: 0,
        mid,
        low: mid,
        high: mid,
        booked: mid,
        bookedField: r.booked.field,
        confidence: 'reported',
        note: r.note,
      }
    }
    const mid = Math.max(0, Math.round(r.units * dollarPerUnit * scale))
    return {
      name: r.p.name,
      pos: r.p.pos,
      family: r.family,
      sport: r.sport,
      class: r.p.class || '',
      className: r.p.className || '',
      jersey: r.p.jersey || '',
      depthRank: r.p.depthRank || null,
      role: r.role,
      via: r.via,
      band: r.band.id,
      bandShort: r.band.short,
      units: r.units,
      mid,
      low: Math.round(mid * lowScale),
      high: Math.round(mid * highScale),
      booked: null,
      bookedField: null,
      confidence: 'modeled',
      note: r.note,
    }
  })
  players.sort((a, b) => (b.high || 0) - (a.high || 0) || a.name.localeCompare(b.name))
  return { players, scale, bookedSum }
}

/**
 * Allocate a modeled low/high to each verified roster name.
 * Shares the football slice of the 93% school-modeled pot (and the MBB
 * slice when a named basketball roster exists).
 * Starters (verified two-deep) get starter-band units; backups get depth-band
 * units. On a full roster with no rank, listed/depth-chart order fills
 * starterCount then depthCount then the developmental 2-unit share — never
 * one family midpoint copied onto every name. A cited news-URL booked NIL
 * is kept and not overwritten. If the raw modeled sum exceeds the sport
 * slice, modeled mids scale down so the desk never overruns ~93%.
 */
export function allocateNamedPlayers(rosterEntry, modeled, bands) {
  const playersIn = rosterEntry?.players
  const mbbIn = rosterEntry?.mbb || rosterEntry?.mbbPlayers
  if ((!playersIn?.length && !mbbIn?.length) || !modeled?.mid || !bands) return null

  const poolCap = Math.round(modeled.mid * ROSTER_POOL_SHARE)
  const fbCap = Math.min(bands.rollup.fbMid, poolCap)
  const mbbCap = bands.rollup.mbbMid
  const fbFull = isFullNamedRoster({ playerCount: playersIn?.length, players: playersIn }, FB_UNITS_TARGET)
  const mbbFull = isFullNamedRoster({ playerCount: mbbIn?.length, players: mbbIn }, MBB_UNITS_TARGET)

  const fb = playersIn?.length
    ? allocateSportPlayers(playersIn, modeled, bands, {
        seats: FAMILY_SEATS,
        cap: fbCap,
        fullRoster: fbFull,
        sport: 'fb',
        fallbackFamily: 'ath',
      })
    : { players: [], scale: 1, bookedSum: 0 }
  const mbb = mbbIn?.length
    ? allocateSportPlayers(mbbIn, modeled, bands, {
        seats: MBB_FAMILY_SEATS,
        cap: mbbCap,
        fullRoster: mbbFull,
        sport: 'mbb',
        fallbackFamily: 'g',
      })
    : { players: [], scale: 1, bookedSum: 0 }

  const players = [...fb.players, ...mbb.players]
  players.sort((a, b) => (b.high || 0) - (a.high || 0) || a.name.localeCompare(b.name))

  const sumMid = players.reduce((s, x) => s + x.mid, 0)
  const cap = fbCap + (mbbIn?.length ? mbbCap : 0)
  const scale = Math.min(fb.scale, mbb.players.length ? mbb.scale : 1)
  const confLabel = modeled.conferenceKey || 'conference'
  const confMid = modeled.conferenceTotal
  const fullRoster = fbFull || mbbFull
  return {
    players,
    sumMid,
    cap,
    scale,
    fullRoster,
    sourceUrl: rosterEntry.sourceUrl,
    wikiUrl: rosterEntry.wikiUrl,
    wikiYear: rosterEntry.wikiYear,
    season: rosterEntry.season,
    depthMatched: rosterEntry.depthMatched || 0,
    conferenceKey: confLabel,
    conferenceTotal: confMid,
    notes: namedRosterNotes(modeled, confLabel, confMid, { fullRoster }),
  }
}


/** Public-roster names with no modeled dollar share (no school modeled midpoint). */
export function namedRosterOnly(rosterEntry) {
  const playersIn = [...(rosterEntry?.players || []), ...(rosterEntry?.mbb || rosterEntry?.mbbPlayers || [])]
  if (!playersIn.length) return null
  const players = playersIn
    .map((p) => {
      const booked = citedPlayerBooked(p)
      if (booked) {
        const mid = Math.round(booked.value)
        return {
          name: p.name,
          pos: p.pos,
          family: p.family,
          class: p.class || '',
          className: p.className || '',
          jersey: p.jersey || '',
          depthRank: p.depthRank || null,
          role: 'booked',
          via: 'booked',
          band: 'booked',
          bandShort: 'booked',
          mid,
          low: mid,
          high: mid,
          booked: mid,
          bookedField: booked.field,
          confidence: 'reported',
          note: `Cited booked NIL (${booked.url}) — kept; not overwritten by the rate-card band.`,
        }
      }
      return {
        name: p.name,
        pos: p.pos,
        family: p.family,
        class: p.class || '',
        className: p.className || '',
        jersey: p.jersey || '',
        depthRank: p.depthRank || null,
        role: p.depthRank === 1 ? 'starter' : p.depthRank ? 'backup' : 'unknown',
        via: null,
        band: null,
        bandShort: null,
        mid: null,
        low: null,
        high: null,
        booked: null,
        bookedField: null,
        confidence: 'reported',
        note: 'Public ESPN roster name. No modeled NIL share — this season has no school modeled midpoint.',
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
  return {
    players,
    sumMid: players.reduce((s, p) => s + (p.booked || 0), 0),
    cap: 0,
    scale: 1,
    namesOnly: true,
    fullRoster: isFullNamedRoster(rosterEntry),
    sourceUrl: rosterEntry.sourceUrl,
    wikiUrl: rosterEntry.wikiUrl,
    wikiYear: rosterEntry.wikiYear,
    season: rosterEntry.season,
    depthMatched: rosterEntry.depthMatched || 0,
    notes: 'Names only. Modeled player shares are not applied without a school modeled midpoint.',
  }
}
