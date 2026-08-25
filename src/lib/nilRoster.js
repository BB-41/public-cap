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
 * No On3 / Opendorse / NIL Go / social scrape.
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


/** Position family → starter / depth units (same card as FB_RATE_CARD). */
export const FAMILY_SEATS = {
  qb: { starterCount: 1, starterUnits: 100, depthCount: 2, depthUnits: 15 },
  rb: { starterCount: 2, starterUnits: 30, depthCount: 3, depthUnits: 8 },
  wr: { starterCount: 3, starterUnits: 45, depthCount: 6, depthUnits: 8 },
  te: { starterCount: 2, starterUnits: 20, depthCount: 2, depthUnits: 6 },
  ol: { starterCount: 5, starterUnits: 22, depthCount: 10, depthUnits: 8 },
  edge: { starterCount: 2, starterUnits: 40, depthCount: 4, depthUnits: 10 },
  dl: { starterCount: 2, starterUnits: 18, depthCount: 4, depthUnits: 6 },
  lb: { starterCount: 3, starterUnits: 16, depthCount: 5, depthUnits: 6 },
  cb: { starterCount: 2, starterUnits: 22, depthCount: 4, depthUnits: 7 },
  s: { starterCount: 2, starterUnits: 18, depthCount: 4, depthUnits: 7 },
  k: { starterCount: 4, starterUnits: 5, depthCount: 0, depthUnits: 5 },
  ath: { starterCount: 0, starterUnits: 2, depthCount: 13, depthUnits: 2 },
}

export function familyMidpointUnits(seat) {
  return (seat.starterUnits + seat.depthUnits) / 2
}

/**
 * Allocate a modeled low/high to each verified roster name.
 * Shares the football slice of the 93% school-modeled pot.
 * Starters (verified two-deep) get starter-band units; backups get depth-band
 * units; no rank → midpoint of the two. If the raw sum exceeds the football
 * slice, every mid is scaled down so the desk never overruns ~93%.
 */
export function allocateNamedPlayers(rosterEntry, modeled, bands) {
  const playersIn = rosterEntry?.players
  if (!playersIn?.length || !modeled?.mid || !bands) return null

  const dollarPerUnit = bands.dollarPerUnit
  const fbCap = bands.rollup.fbMid
  const poolCap = Math.round(modeled.mid * ROSTER_POOL_SHARE)
  const cap = Math.min(fbCap, poolCap)
  const lowScale = modeled.low / modeled.mid
  const highScale = modeled.high / modeled.mid

  const used = {}
  const rows = []
  const sorted = [...playersIn].sort((a, b) => {
    const ra = a.depthRank || 99
    const rb = b.depthRank || 99
    if (ra !== rb) return ra - rb
    return (b.years || 0) - (a.years || 0) || String(a.name).localeCompare(String(b.name))
  })

  for (const p of sorted) {
    const family = FAMILY_SEATS[p.family] ? p.family : 'ath'
    const seat = FAMILY_SEATS[family]
    const u = (used[family] ||= { s: 0, d: 0 })
    let units
    let role
    let note
    const rank = p.depthRank

    if (rank === 1 && u.s < seat.starterCount) {
      units = seat.starterUnits
      u.s += 1
      role = 'starter'
      note = 'Verified two-deep starter — high end of the position band.'
    } else if (rank && rank <= 3 && u.d < seat.depthCount) {
      units = seat.depthUnits
      u.d += 1
      role = 'backup'
      note = 'Verified two-deep backup — low end of the position band.'
    } else if (!rank) {
      units = familyMidpointUnits(seat)
      role = 'unknown'
      note = 'Name and position only; no verified depth-chart rank — midpoint of the position band.'
    } else {
      units = 2
      role = 'depth'
      note = 'Beyond the two-deep seats on the rate card — developmental share.'
    }

    rows.push({ p, family, units, role, note })
  }

  const raw = rows.reduce((s, r) => s + r.units * dollarPerUnit, 0)
  const scale = raw > cap && raw > 0 ? cap / raw : 1

  const players = rows.map((r) => {
    const mid = Math.max(0, Math.round(r.units * dollarPerUnit * scale))
    return {
      name: r.p.name,
      pos: r.p.pos,
      family: r.family,
      class: r.p.class || '',
      className: r.p.className || '',
      jersey: r.p.jersey || '',
      depthRank: r.p.depthRank || null,
      role: r.role,
      mid,
      low: Math.round(mid * lowScale),
      high: Math.round(mid * highScale),
      confidence: 'modeled',
      note: r.note,
    }
  })
  players.sort((a, b) => b.high - a.high || a.name.localeCompare(b.name))

  const sumMid = players.reduce((s, x) => s + x.mid, 0)
  const confLabel = modeled.conferenceKey || 'conference'
  const confMid = modeled.conferenceTotal
  return {
    players,
    sumMid,
    cap,
    scale,
    sourceUrl: rosterEntry.sourceUrl,
    wikiUrl: rosterEntry.wikiUrl,
    wikiYear: rosterEntry.wikiYear,
    season: rosterEntry.season,
    depthMatched: rosterEntry.depthMatched || 0,
    conferenceKey: confLabel,
    conferenceTotal: confMid,
    notes:
      'Named-player ranges are modeled shares of this school’s football slice of the 93% pot. ' +
      `Comparative: the same position-band units as every other ${confLabel} school, scaled by this school’s modeled midpoint versus the conference median` +
      (confMid ? ` ($${(confMid / 1e6).toFixed(2)}M)` : '') +
      '. Not a contract. Not a reported deal unless a news URL is attached.',
  }
}
