/**
 * Position NIL history: modeled vs booked honesty.
 * Run: node scripts/verify-nil-history.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import {
  allocateBooked,
  buildAllNilHistory,
  emptyRosterBook,
  FAMILY_ORDER,
  nameSlug,
  posHash,
} from '../src/lib/nilHistory.js'

const data = JSON.parse(readFileSync('public/data/schools.json', 'utf8'))

function loadRoster(year) {
  const path = `public/data/rosters-${year}.json`
  if (!existsSync(path)) return emptyRosterBook()
  return JSON.parse(readFileSync(path, 'utf8'))
}

const rosterBooks = {}
for (const year of [2021, 2022, 2023, 2024, 2025, 2026]) {
  rosterBooks[year] = loadRoster(year)
}

if (allocateBooked(null, 100, 1000) != null) throw new Error('null booked must stay null')
if (allocateBooked(10_000_000, 100, 1000) !== 1_000_000) throw new Error('booked share math')
if (allocateBooked(10_000_000, null, 1000) != null) throw new Error('no share mid → no booked')
if (allocateBooked(0, 100, 1000) !== 0) throw new Error('$0 booked cell is a real cell')
console.log('allocateBooked honesty ok')

const hist = buildAllNilHistory(data.schools, data.meta, rosterBooks)
if (Object.keys(hist).length !== 68) throw new Error(`expected 68 histories, got ${Object.keys(hist).length}`)

function assertSchool(id) {
  const h = hist[id]
  if (!h) throw new Error(`missing history for ${id}`)
  const qb = h.familySeries.qb
  if (!qb || qb.length !== 6) throw new Error(`${id} QB series should span 6 years`)
  const years = qb.map((p) => p.year)
  if (years.join(',') !== '2021,2022,2023,2024,2025,2026') {
    throw new Error(`${id} QB years ${years.join(',')}`)
  }
  return h
}

const lou = assertSchool('louisville')
const ky = assertSchool('kentucky')
const lsu = assertSchool('lsu')

for (const [id, h] of [
  ['louisville', lou],
  ['kentucky', ky],
  ['lsu', lsu],
]) {
  const qb = h.familySeries.qb
  const modeledYears = qb.filter((p) => p.mid != null && p.mid > 0)
  if (modeledYears.length < 4) throw new Error(`${id} QB expected modeled bands on roster/rate-card years`)
  for (const p of qb) {
    if (p.booked != null && p.bookedSchool == null) {
      throw new Error(`${id} ${p.year} invented booked without a school cell`)
    }
    if (p.bookedSchool == null && p.booked != null) {
      throw new Error(`${id} ${p.year} booked point with no school booked`)
    }
  }
}

const louQb = lou.familySeries.qb
const louBooked = louQb.filter((p) => p.booked != null).map((p) => p.year)
if (!louBooked.includes(2025) || !louBooked.includes(2024)) {
  throw new Error(`louisville QB booked years ${louBooked} — expected 2024 (pre-cap) and 2025`)
}
if (louBooked.includes(2021) || louBooked.includes(2022) || louBooked.includes(2023) || louBooked.includes(2026)) {
  throw new Error(`louisville QB invented booked on ${louBooked}`)
}
const lou25 = louQb.find((p) => p.year === 2025)
if (lou25.via !== 'rate-card') throw new Error('louisville 2025 should be rate-card (no roster file)')
if (lou25.booked == null || lou25.bookedSchool !== 32_900_000) {
  throw new Error(`louisville 2025 booked school ${lou25.bookedSchool}`)
}
if (lou25.booked >= lou25.bookedSchool) throw new Error('position booked must be a share, not the whole school cell')
const lou26 = louQb.find((p) => p.year === 2026)
if (lou26.via !== 'named') throw new Error('louisville 2026 QB should use named roster')
if (!lou26.names.length) throw new Error('louisville 2026 QB named empty')
if (lou26.booked != null) throw new Error('louisville 2026 must not invent booked')

const kyBooked = ky.familySeries.qb.filter((p) => p.booked != null).map((p) => p.year)
if (kyBooked.join(',') !== '2025') throw new Error(`kentucky QB booked years ${kyBooked}`)
const lsuBooked = lsu.familySeries.qb.filter((p) => p.booked != null)
if (lsuBooked.length) throw new Error(`lsu invented booked: ${lsuBooked.map((p) => p.year)}`)

for (const fam of FAMILY_ORDER) {
  if (!lou.familySeries[fam] || lou.familySeries[fam].length !== 6) {
    throw new Error(`louisville missing ${fam} series`)
  }
}
if (posHash('qb') !== 'pos-qb') throw new Error('pos hash')

const moss = Object.values(lou.playerSeries).find((p) => /moss/i.test(p.name))
if (moss && moss.points.some((p) => p.booked != null)) {
  throw new Error('player series must not invent booked dollars')
}
if (!nameSlug('Miller Moss')) throw new Error('slug')

console.log(
  'louisville QB',
  louQb.map((p) => `${p.year}:${p.via}/m${p.mid}${p.booked != null ? `/b${p.booked}` : ''}`).join(' ')
)
console.log(
  'kentucky QB booked',
  ky.familySeries.qb.filter((p) => p.booked != null).map((p) => `${p.year}:${p.booked}`).join(' ') || '(none)'
)
console.log('lsu QB booked (none)', lsuBooked.length)
console.log('ok')
