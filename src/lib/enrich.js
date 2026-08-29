import { computeCapacity, confidenceRollup, hasVal, ratios, val } from './compute.js'
import { modeledNilForSeason } from './nilModel.js'
import { allocateNamedPlayers, namedRosterOnly, scaleRosterToModeled } from './nilRoster.js'
import { schoolNilPot } from './nilHistory.js'
import { applySeason, houseFieldForSeason, houseValueForSeason } from './seasons.js'
import { computeEfficiency, mergeSubsidy } from './layers.js'

/**
 * Same enrichment the desk has always run — capacity, House, booked/modeled NIL,
 * named roster, layers, efficiency. Input may be the slim desk book (no staff)
 * or a full school overlay; numbers for shared fields stay identical.
 */
export function enrichSchools({
  data,
  season,
  includeAlumni,
  layers = null,
  rosters = null,
  rosterYear = null,
} = {}) {
  if (!data?.schools) return null
  const houseVal = houseValueForSeason(data.meta, season)
  const houseField = houseFieldForSeason(data.meta, season)
  const seasonal = data.schools.map((s) => applySeason(s, season))
  const withCap = seasonal.map((s) => ({ ...s, _cap: computeCapacity(s) }))
  const capTotals = withCap.map((s) => s._cap.total)
  const book = rosterYear === season ? rosters : { schools: {} }
  return withCap.map((s) => {
    const modeled = s._season.modeledNil
      ? modeledNilForSeason(s, s._cap.total, capTotals, season, houseVal)
      : null
    const nil = { ...s.nil, modeled }
    const r = ratios({ ...s, nil }, data.meta, s._season.houseKey, includeAlumni)
    const bookedVal = hasVal(s.nil?.booked) ? val(s.nil.booked) : null
    const pot = schoolNilPot(modeled, bookedVal)
    const roster = pot?.mid ? scaleRosterToModeled(pot) : null
    const named = pot?.mid
      ? allocateNamedPlayers(book?.schools?.[s.id], pot, roster)
      : namedRosterOnly(book?.schools?.[s.id])
    const rawLayer = layers?.schools?.[s.id] || {}
    const layer = {
      ...rawLayer,
      record: season >= 2025 ? rawLayer.record : { football: null },
      portal: season >= 2026 ? rawLayer.portal : { additions: [], departures: [] },
      apparel: season >= 2025 ? rawLayer.apparel : null,
      subsidy: season >= 2025 ? mergeSubsidy(rawLayer.subsidy, s.capacity) : null,
      debt: season >= 2025 ? rawLayer.debt : null,
      buyoutsPaid: season >= 2025 ? rawLayer.buyoutsPaid : [],
    }
    const withNil = { ...s, nil, _cap: s._cap, _ratios: r }
    const eff = computeEfficiency(withNil, layer, includeAlumni)
    return {
      ...s,
      nil,
      layers: layer,
      _cap: s._cap,
      _ratios: r,
      _roster: roster,
      _named: named,
      _conf: confidenceRollup(s),
      _houseField: houseField,
      _eff: eff,
    }
  })
}
