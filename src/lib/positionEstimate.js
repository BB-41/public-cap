/**
 * Industry estimate by position — sparse cited bands from CBS / SI.
 *
 * Not booked NIL. Not House spent. Never enters capacity, leftover,
 * or the capacity waterfall. Prefer a position band over a named player.
 * A named-article dollar, when kept, is labeled reported-estimate.
 * Positions with no public band stay empty. The desk rate card
 * (starter vs backup) stays the modeled seat machinery and is not replaced.
 */

export const POSITION_ESTIMATE_LABEL = 'Industry estimate by position'
export const POSITION_ESTIMATE_HASH = 'position-estimate'
export const POSITION_ESTIMATE_SEASON = 2026

/** Football families the desk will answer for. Empty unless a cite exists. */
export const FOOTBALL_POSITIONS = [
  { family: 'qb', label: 'QB', aliases: ['qb', 'qb1', 'quarterback', 'quarterbacks'] },
  { family: 'rb', label: 'RB', aliases: ['rb', 'running back', 'running backs', 'tailback'] },
  { family: 'wr', label: 'WR', aliases: ['wr', 'wr1', 'receiver', 'receivers', 'wideout', 'wide receiver'] },
  { family: 'te', label: 'TE', aliases: ['te', 'tight end', 'tight ends'] },
  { family: 'ol', label: 'OT / OL', aliases: ['ol', 'ot', 'offensive tackle', 'offensive tackles', 'offensive line', 'o-line', 'oline'] },
  { family: 'edge', label: 'EDGE', aliases: ['edge', 'defensive end', 'pass rusher'] },
  { family: 'dl', label: 'IDL', aliases: ['idl', 'dt', 'defensive tackle', 'interior dl', 'defensive line'] },
  { family: 'lb', label: 'LB', aliases: ['lb', 'linebacker', 'linebackers'] },
  { family: 'cb', label: 'CB', aliases: ['cb', 'corner', 'cornerback', 'cornerbacks'] },
  { family: 's', label: 'S', aliases: ['safety', 'safeties', 'free safety', 'strong safety'] },
  { family: 'k', label: 'ST', aliases: ['kicker', 'punter', 'specialist', 'special teams'] },
]

export const CITED_POSITION_FAMILIES = ['qb', 'rb', 'wr', 'ol', 'edge']
export const UNCITED_POSITION_FAMILIES = FOOTBALL_POSITIONS
  .map((p) => p.family)
  .filter((f) => !CITED_POSITION_FAMILIES.includes(f))

export function industryPositionEstimates(school) {
  const field = school?.nil?.industryPositionEstimates
  if (!field || field.confidence === 'pending') return null
  const positions = (field.positions || []).filter((p) => p && p.family && (p.display || p.tier))
  if (!positions.length) return null
  return { ...field, positions }
}

export function positionEstimateFor(school, family) {
  const field = industryPositionEstimates(school)
  if (!field || !family) return null
  return field.positions.find((p) => p.family === family) || null
}

export function positionEstimateDisplay(row) {
  if (!row) return null
  if (row.display) return row.display
  if (row.tier) return row.tier
  return null
}

export function positionEstimateCites(rowOrField) {
  const rows = rowOrField?.cites || rowOrField?.positions?.flatMap((p) => p.cites || [])
  if (!Array.isArray(rows)) return []
  return rows.filter((c) => c && (c.url || c.source))
}

export function detectPositionFamily(text) {
  const t = String(text || '').toLowerCase()
  const ranked = [...FOOTBALL_POSITIONS].sort((a, b) => {
    const la = Math.max(...a.aliases.map((x) => x.length))
    const lb = Math.max(...b.aliases.map((x) => x.length))
    return lb - la
  })
  for (const row of ranked) {
    for (const alias of row.aliases) {
      const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (re.test(t)) return row
    }
  }
  return null
}

export function positionLabel(family) {
  return FOOTBALL_POSITIONS.find((p) => p.family === family)?.label || family
}
