/**
 * Verify collective-era fill + House-era number stability.
 * Run: node scripts/verify-nil-model.mjs
 */
import { readFileSync } from 'node:fs'
import { computeCapacity } from '../src/lib/compute.js'
import {
  computeModeledNil,
  modeledNilForSeason,
  nilYearFactor,
  conferenceNilBand,
  HALF_SHARE_IDS,
  HOUSE_2025_26,
} from '../src/lib/nilModel.js'
import { applySeason, houseValueForSeason } from '../src/lib/seasons.js'
import { feeRateTermsPerYear, impliedFeePerStudent, publishedFeeTimesEnrollment } from '../src/lib/layers.js'

const data = JSON.parse(readFileSync('public/data/schools.json', 'utf8'))
const house2025 = houseValueForSeason(data.meta, 2025)
const house2026 = houseValueForSeason(data.meta, 2026)

function pack(year) {
  const seasonal = data.schools.map((s) => applySeason(s, year))
  const withCap = seasonal.map((s) => ({ ...s, _cap: computeCapacity(s) }))
  const totals = withCap.map((s) => s._cap.total)
  const house = houseValueForSeason(data.meta, year)
  return withCap.map((s) => ({
    school: s,
    modeled: modeledNilForSeason(s, s._cap.total, totals, year, house),
    house,
    booked: s.nil?.booked?.value ?? null,
  }))
}

const factors = {
  2021: nilYearFactor(2021),
  2022: nilYearFactor(2022),
  2023: nilYearFactor(2023),
  2024: nilYearFactor(2024),
}
const expected = { 2021: 917e6 / 1.67e9, 2022: 1.14e9 / 1.67e9, 2023: 1.17e9 / 1.67e9, 2024: 1 }
for (const y of [2021, 2022, 2023, 2024]) {
  if (Math.abs(factors[y] - expected[y]) > 1e-12) {
    throw new Error(`yearFactor ${y} ${factors[y]} != ${expected[y]}`)
  }
}
console.log('year factors', Object.fromEntries(Object.entries(factors).map(([k, v]) => [k, v.toFixed(3)])))

if (data.schools.length !== 68) throw new Error(`expected 68 schools, got ${data.schools.length}`)

for (const year of [2021, 2022, 2023, 2024]) {
  const rows = pack(year)
  const missing = rows.filter((r) => !r.modeled || r.modeled.confidence !== 'modeled' || r.modeled.era !== 'collective')
  if (missing.length) throw new Error(`${year}: ${missing.length} schools missing collective modeled NIL`)
  const badFloor = rows.filter((r) => HALF_SHARE_IDS.has(r.school.id) && r.modeled.low === Math.round(0.5 * HOUSE_2025_26))
  if (badFloor.length) throw new Error(`${year}: half-share House floor leaked into collective era`)
  if (rows.some((r) => r.house != null)) throw new Error(`${year}: House should be blank`)
  const texas = rows.find((r) => r.school.id === 'texas')
  const conf = conferenceNilBand(texas.school.conference)
  const medianY = conf.thirdParty * factors[year]
  const expectLow = Math.round(0.7 * medianY)
  if (texas.modeled.low !== expectLow) {
    throw new Error(`${year} texas low ${texas.modeled.low} != ${expectLow} (conf ${texas.school.conference})`)
  }
  console.log(`${year}: 68/68 modeled · texas ${texas.school.conference} ${texas.modeled.low}–${texas.modeled.high} mid ${texas.modeled.mid}`)
}

for (const year of [2025, 2026]) {
  const house = year === 2025 ? house2025 : house2026
  const seasonal = data.schools.map((s) => applySeason(s, year))
  const withCap = seasonal.map((s) => ({ ...s, _cap: computeCapacity(s) }))
  const totals = withCap.map((s) => s._cap.total)
  for (const s of withCap) {
    const viaDispatch = modeledNilForSeason(s, s._cap.total, totals, year, house)
    const viaHouse = computeModeledNil(s, s._cap.total, totals, house)
    if (viaDispatch.low !== viaHouse.low || viaDispatch.high !== viaHouse.high || viaDispatch.mid !== viaHouse.mid) {
      throw new Error(`${year} ${s.id}: dispatch drifted from computeModeledNil`)
    }
    if (viaHouse.era !== 'house' || viaHouse.confidence !== 'modeled') {
      throw new Error(`${year} ${s.id}: missing house/modeled tags`)
    }
  }
  const alabama = withCap.find((s) => s.id === 'alabama')
  const sample = computeModeledNil(alabama, alabama._cap.total, totals, house)
  console.log(`${year}: 68/68 house-era match · alabama ${sample.low}–${sample.high} mid ${sample.mid}`)
}

const y25 = pack(2025)
const booked = y25.filter((r) => r.booked != null).map((r) => `${r.school.id}=${r.booked}`)
console.log('2025 booked still present:', booked.join(', ') || '(none)')
const y24 = pack(2024)
const booked24 = y24.filter((r) => r.booked != null).map((r) => `${r.school.id}=${r.booked}`)
console.log('2024 booked still present:', booked24.join(', ') || '(none)')

const nd21 = pack(2021).find((r) => r.school.id === 'notre-dame')
const accTp = conferenceNilBand('ACC').thirdParty
const ndTp = conferenceNilBand('Independent / ACC').thirdParty
if (Math.round(accTp * 1.08) !== ndTp) throw new Error('ND premium missing')
if (nd21.modeled.conferenceThirdParty !== ndTp) throw new Error('ND 2021 not using ACC×1.08 third-party')
console.log('ND 2021 third-party', ndTp, 'yearFactor', nd21.modeled.yearFactor.toFixed(3), 'mid', nd21.modeled.mid)

console.log('ok')

if (feeRateTermsPerYear({ unit: 'USD per semester' }) !== 2) throw new Error('semester terms')
if (feeRateTermsPerYear({ unit: 'USD per year' }) !== 1) throw new Error('annual terms')
const louFees = { value: 903695 }
const impliedLou = impliedFeePerStudent(louFees, 16000)
if (Math.round(impliedLou) !== 56) throw new Error(`louisville implied ${impliedLou}`)
const product = publishedFeeTimesEnrollment({ value: 200, unit: 'USD per semester' }, 16000)
if (product.impliedAnnual !== 6_400_000) throw new Error(`louisville product ${product.impliedAnnual}`)
if (impliedFeePerStudent({ value: 0 }, 50000) !== 0) throw new Error('zero fees should imply $0')
if (impliedFeePerStudent({ value: null }, 16000) != null) throw new Error('pending fees stay empty')
console.log('student-fee math ok')
