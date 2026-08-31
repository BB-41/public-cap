/**
 * Position NIL history: school-pot allocation, modeled vs booked honesty.
 * Run: node scripts/verify-nil-history.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import {
  allocateBooked,
  allocationFootnote,
  buildAllNilHistory,
  emptyRosterBook,
  FAMILY_ORDER,
  nameSlug,
  posHash,
  schoolNilPot,
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
if (allocateBooked(0, 100, 1000) !== 0) throw new Error('$0 booked cell is a real cell')

const modeled = { low: 10, mid: 20, high: 30, era: 'house', conferenceKey: 'ACC' }
const fromBooked = schoolNilPot(modeled, 32_900_000)
if (fromBooked.potSource !== 'booked-school' || fromBooked.mid !== 32_900_000) {
  throw new Error('schoolNilPot must prefer the booked school cell')
}
if (fromBooked.low !== 32_900_000 || fromBooked.high !== 32_900_000) {
  throw new Error('booked pot is a point, not an invented range')
}
const fromModeled = schoolNilPot(modeled, null)
if (fromModeled.potSource !== 'modeled-school' || fromModeled.mid !== 20) {
  throw new Error('empty booked cell must fall back to the on-desk modeled band')
}
if (schoolNilPot(null, null) != null) throw new Error('no pot when both empty')
console.log('school pot preference ok')

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
    if (p.label !== 'modeled') throw new Error(`${id} ${p.year} position dollars must be labeled modeled`)
    if (p.booked != null) throw new Error(`${id} ${p.year} invented a booked player cell`)
    if (p.potSource === 'booked-school' && p.bookedSchool == null) {
      throw new Error(`${id} ${p.year} booked pot without a school cell`)
    }
    if (p.bookedSchool == null && p.potSource === 'booked-school') {
      throw new Error(`${id} ${p.year} booked pot with no school booked`)
    }
    if (p.potSource === 'booked-school' && p.bookedSchool > 0 && p.mid != null && p.mid >= p.bookedSchool) {
      throw new Error(`${id} ${p.year} position allocation must be a share of the school pot`)
    }
  }
}

const louQb = lou.familySeries.qb
const louBookedPot = louQb.filter((p) => p.potSource === 'booked-school').map((p) => p.year)
if (!louBookedPot.includes(2025) || !louBookedPot.includes(2024)) {
  throw new Error(`louisville QB booked-pot years ${louBookedPot} — expected 2024 and 2025`)
}
if (louBookedPot.includes(2021) || louBookedPot.includes(2022) || louBookedPot.includes(2023) || louBookedPot.includes(2026)) {
  throw new Error(`louisville QB used a booked pot on ${louBookedPot}`)
}
const lou25 = louQb.find((p) => p.year === 2025)
if (lou25.via !== 'rate-card') throw new Error('louisville 2025 should be rate-card (no roster file)')
if (lou25.bookedSchool !== 32_900_000) throw new Error(`louisville 2025 booked school ${lou25.bookedSchool}`)
if (lou25.mid == null || lou25.mid <= 0) throw new Error('louisville 2025 QB must still show an allocation')
if (lou25.label !== 'modeled') throw new Error('louisville 2025 position split must stay modeled')
const lou24 = louQb.find((p) => p.year === 2024)
if (lou24.via !== 'named') throw new Error('louisville 2024 QB should use named roster')
if (lou24.bookedSchool !== 12_700_000) throw new Error(`louisville 2024 pot ${lou24.bookedSchool}`)
if (lou24.label !== 'modeled') throw new Error('louisville 2024 allocation must be labeled modeled')
const lou26 = louQb.find((p) => p.year === 2026)
if (lou26.via !== 'named') throw new Error('louisville 2026 QB should use named roster')
if (!lou26.names.length) throw new Error('louisville 2026 QB named empty')
if (lou26.potSource !== 'modeled-school') throw new Error('louisville 2026 pot is the modeled band')
if (lou26.booked != null) throw new Error('louisville 2026 must not invent booked')

const kyPot = ky.familySeries.qb.filter((p) => p.potSource === 'booked-school').map((p) => p.year)
if (kyPot.join(',') !== '2025') throw new Error(`kentucky QB booked-pot years ${kyPot}`)
if (ky.familySeries.qb.find((p) => p.year === 2025).label !== 'modeled') {
  throw new Error('kentucky 2025 position split must stay modeled')
}
const lsuBooked = lsu.familySeries.qb.filter((p) => p.potSource === 'booked-school' || p.booked != null)
if (lsuBooked.length) throw new Error(`lsu invented booked: ${lsuBooked.map((p) => p.year)}`)

const zeroPot = schoolNilPot(modeled, 0)
if (zeroPot.potSource !== 'booked-school' || zeroPot.mid !== 0) {
  throw new Error('$0 booked cell must win over the modeled band')
}

const psu = assertSchool('penn-state')
const psu24 = psu.familySeries.qb.find((p) => p.year === 2024)
if (psu24.potSource !== 'booked-school' || psu24.bookedSchool !== 18_368_391) {
  throw new Error(`penn-state 2024 pot ${psu24.potSource}/${psu24.bookedSchool}`)
}
if (psu24.label !== 'modeled') throw new Error('penn-state 2024 split must stay modeled')
if (psu.familySeries.qb.find((p) => p.year === 2025).potSource === 'booked-school') {
  throw new Error('penn-state 2025 must not treat FY2025 Item 44 as House Year 1')
}

const tx = assertSchool('texas')
if (tx.familySeries.qb.find((p) => p.year === 2024).bookedSchool !== 3_200_000) {
  throw new Error(`texas 2024 pot ${tx.familySeries.qb.find((p) => p.year === 2024).bookedSchool}`)
}
if (tx.familySeries.qb.find((p) => p.year === 2025).bookedSchool !== 13_500_000) {
  throw new Error(`texas 2025 pot ${tx.familySeries.qb.find((p) => p.year === 2025).bookedSchool}`)
}
if (tx.familySeries.qb.find((p) => p.year === 2023).bookedSchool === 11_717_673) {
  throw new Error('texas 2023 pot must not silently spend the collective 990')
}
const ndHist = assertSchool('notre-dame')
for (const year of [2022, 2023, 2024]) {
  const row = ndHist.familySeries.qb.find((p) => p.year === year)
  if (row.potSource === 'booked-school') {
    throw new Error(`notre-dame ${year} pot must stay modeled — FUND 990 is not the allocation pot`)
  }
}

const oks = assertSchool('oklahoma-state')
if (oks.familySeries.qb.find((p) => p.year === 2024).bookedSchool !== 16_000_000) {
  throw new Error('oklahoma-state 2024 must use the $16M estimated preCap cell')
}

for (const id of ['georgia', 'tennessee', 'alabama', 'oregon', 'utah', 'north-carolina', 'ole-miss']) {
  const row = assertSchool(id).familySeries.qb.find((p) => p.year === 2024)
  if (row.potSource !== 'booked-school' || row.bookedSchool !== 0) {
    throw new Error(`${id} 2024 must keep the cited Item 44 $0 cell as the pot`)
  }
  if (row.mid != null && row.mid !== 0) {
    throw new Error(`${id} 2024 invented position dollars on a $0 pot`)
  }
  if (row.booked != null) throw new Error(`${id} 2024 invented a booked player cell`)
}

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

const fsuHist = assertSchool('florida-state')
const danielsHist = Object.values(fsuHist.playerSeries).find((p) => p.name === 'Ashton Daniels')
const denobileHist = Object.values(fsuHist.playerSeries).find((p) => /denobile/i.test(p.name))
if (!danielsHist || !denobileHist) throw new Error('FSU history missing Daniels / DeNobile player series')
const d26 = danielsHist.points.find((p) => p.year === 2026)
const b26 = denobileHist.points.find((p) => p.year === 2026)
if (!d26 || d26.label !== 'modeled' || d26.mid == null) throw new Error('Daniels 2026 must be a modeled player cell')
if (!b26 || b26.label !== 'modeled' || b26.mid == null) throw new Error('DeNobile 2026 must be a modeled player cell')
if (d26.mid === b26.mid) throw new Error('FSU QB player graphs must not share one family band')
if (d26.mid <= b26.mid) throw new Error('Daniels starter band must sit above the listed-order backup')
if (d26.booked != null || b26.booked != null) throw new Error('FSU QBs must not invent booked player cells')
console.log(`FSU 2026 player graphs: Daniels modeled ${d26.mid} vs DeNobile modeled ${b26.mid}`)

console.log(
  'louisville QB',
  louQb.map((p) => `${p.year}:${p.via}/${p.potSource}/m${p.mid}`).join(' ')
)
console.log(
  'kentucky QB booked pot',
  ky.familySeries.qb.filter((p) => p.potSource === 'booked-school').map((p) => `${p.year}:${p.bookedSchool}`).join(' ')
)
console.log('lsu QB booked pot (none)', lsuBooked.length)
const qbFoot = allocationFootnote({ points: louQb, shareLabel: 'QB' })
if (qbFoot.mode !== 'allocation' || !qbFoot.spread) {
  throw new Error('QB chart footnote should be an allocation note')
}
if (!/We spread that school pot across the named roster for this year and summed the QB share/.test(qbFoot.spread)) {
  throw new Error(`QB spread line: ${qbFoot.spread}`)
}
if (!/That is an allocation, not a contract/.test(qbFoot.spread)) {
  throw new Error('QB footnote missing allocation disclaimer')
}
if (!qbFoot.lines.some((l) => /FOIA/.test(l) && /2025/.test(l) && /courier-journal/.test(l))) {
  throw new Error(`QB footnote missing 2025 FOIA filing + URL: ${JSON.stringify(qbFoot.lines)}`)
}
if (!qbFoot.lines.some((l) => /2024/.test(l) && /MFRS/.test(l) && /courier-journal/.test(l))) {
  throw new Error(`QB footnote missing 2024 MFRS filing + URL: ${JSON.stringify(qbFoot.lines)}`)
}
const kyFoot = allocationFootnote({ points: ky.familySeries.qb, shareLabel: 'QB' })
if (!kyFoot.lines.some((l) => /2025/.test(l) && /counsel/.test(l) && /courier-journal/.test(l))) {
  throw new Error(`Kentucky footnote should name the 2025 counsel filing + URL: ${JSON.stringify(kyFoot.lines)}`)
}
if (!qbFoot.lines.some((l) => /labeled model/.test(l) && /conference heuristic/.test(l))) {
  throw new Error('QB footnote missing modeled-pot sentence')
}
if (!qbFoot.links.some((l) => l.year === 2025 && /courier-journal/.test(l.url))) {
  throw new Error('QB footnote missing 2025 URL link')
}
if (qbFoot.lines.some((l) => /On3|Opendorse/.test(l))) {
  throw new Error('footnote leaked a vendor scrape')
}

const lou26Foot = allocationFootnote({ point: lou26, shareLabel: 'QB' })
if (!lou26Foot.lines.some((l) => /labeled model/.test(l))) {
  throw new Error('2026 dollar footnote must say the pot is a labeled model')
}
if (!/summed the QB share/.test(lou26Foot.spread)) {
  throw new Error('2026 dollar footnote must name the QB share')
}

const bookedPlayerFoot = allocationFootnote({
  points: [
    {
      year: 2024,
      booked: 100,
      bookedField: { source: 'FOIA counsel letter', url: 'https://example.test/player', notes: 'FOIA' },
    },
  ],
  shareLabel: 'QB',
})
if (bookedPlayerFoot.mode !== 'player-booked') {
  throw new Error(`booked player footnote mode ${bookedPlayerFoot.mode}`)
}
if (bookedPlayerFoot.spread) {
  throw new Error('booked player footnote must not use allocation text')
}
if (!bookedPlayerFoot.lines.some((l) => /player cell/.test(l) && /FOIA/.test(l) && /example.test/.test(l))) {
  throw new Error(`booked player footnote: ${JSON.stringify(bookedPlayerFoot.lines)}`)
}

console.log('ok: visible footnote copy (filing + model + allocation)')
console.log('ok')
