/**
 * Verify collective-era fill + House-era number stability.
 * Run: node scripts/verify-nil-model.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import { computeCapacity } from '../src/lib/compute.js'
import {
  computeModeledNil,
  modeledNilForSeason,
  nilYearFactor,
  conferenceNilBand,
  pac12ThirdPartyProxy,
  CONFERENCE_NIL,
  HALF_SHARE_IDS,
  HOUSE_2025_26,
} from '../src/lib/nilModel.js'
import { applySeason, conferenceInSeason, houseValueForSeason } from '../src/lib/seasons.js'
import { allocateNamedPlayers, scaleRosterToModeled } from '../src/lib/nilRoster.js'
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
const expect25 = {
  louisville: 32_900_000,
  kentucky: 18_000_000,
  ucla: 20_500_000,
  california: 20_500_000,
  texas: 13_500_000,
}
for (const [id, n] of Object.entries(expect25)) {
  const row = y25.find((r) => r.school.id === id)
  if (row?.booked !== n) throw new Error(`2025 ${id} booked ${row?.booked} != ${n}`)
}
if (y25.find((r) => r.school.id === 'penn-state')?.booked != null) {
  throw new Error('2025 penn-state must stay pending — FY2025 Item 44 is preCap, not House Year 1')
}
const y24 = pack(2024)
const booked24 = y24.filter((r) => r.booked != null).map((r) => `${r.school.id}=${r.booked}`)
console.log('2024 booked still present:', booked24.join(', ') || '(none)')
const expect24 = {
  louisville: 12_700_000,
  'penn-state': 18_368_391,
  'oklahoma-state': 16_000_000,
  texas: 3_200_000,
  georgia: 0,
  oregon: 0,
  tennessee: 0,
  alabama: 0,
  utah: 0,
  'north-carolina': 0,
  'ole-miss': 0,
}
for (const [id, n] of Object.entries(expect24)) {
  const row = y24.find((r) => r.school.id === id)
  if (row?.booked !== n) throw new Error(`2024 ${id} booked ${row?.booked} != ${n}`)
}
if (y24.find((r) => r.school.id === 'kentucky')?.booked != null) {
  throw new Error('2024 kentucky must stay pending — do not overwrite the House-window $18M cell with an invented FY2025 $0')
}

const rawById = Object.fromEntries(data.schools.map((s) => [s.id, s]))
const expect990 = {
  texas: [423157, 11717673, 14540650],
  'notre-dame': [1176862, 5129490, 10823302],
  georgia: [2214518],
  louisville: [545833],
  alabama: [10000],
  washington: [2803276],
}
for (const [id, values] of Object.entries(expect990)) {
  const rows = rawById[id]?.nil?.collective990 || []
  const got = rows.map((c) => c.value)
  if (JSON.stringify(got) !== JSON.stringify(values)) {
    throw new Error(`${id} collective990 ${JSON.stringify(got)} != ${JSON.stringify(values)}`)
  }
  if (rows.some((c) => c.confidence !== 'reported' || !c.url || !c.ein || !c.organization)) {
    throw new Error(`${id} collective990 missing reported/url/ein/organization`)
  }
}
if (rawById.louisville.nil.booked.value !== 32_900_000) throw new Error('louisville booked overwritten')
if (rawById.texas.nil.booked.value !== 13_500_000) throw new Error('texas booked overwritten')
if (rawById.texas.nil.preCap.value !== 3_200_000) throw new Error('texas preCap overwritten')
if (y25.find((r) => r.school.id === 'texas')?.booked !== 13_500_000) {
  throw new Error('2025 texas booked must stay $13.5M — collective 990 is not House')
}
if (y25.find((r) => r.school.id === 'notre-dame')?.booked != null) {
  throw new Error('2025 ND booked must stay pending — FUND 990 is collective990 only')
}
const texas25 = y25.find((r) => r.school.id === 'texas')
const nd990sum = (rawById['notre-dame'].nil.collective990 || []).reduce((s, c) => s + (c.value || 0), 0)
if (texas25.booked === nd990sum) throw new Error('collective 990 leaked into booked compare')
console.log('collective990 lane present; booked House / Item 44 cells unchanged')

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

const pac12Tp = pac12ThirdPartyProxy()
const expectPac12 = Math.round((CONFERENCE_NIL['Big 12'].thirdParty + CONFERENCE_NIL.ACC.thirdParty) / 2)
if (pac12Tp !== expectPac12) throw new Error(`Pac-12 proxy ${pac12Tp} != ${expectPac12}`)
const pac12Band = conferenceNilBand('Pac-12')
if (pac12Band.thirdParty !== expectPac12) throw new Error('Pac-12 band not using documented proxy')
if (pac12Band.revShare != null || pac12Band.total != null) {
  throw new Error('Pac-12 House rev-share / total-roster invented')
}
const oregon = data.schools.find((s) => s.id === 'oregon')
if (conferenceInSeason(oregon, 2021) !== 'Pac-12') throw new Error('oregon 2021 should be Pac-12')
if (conferenceInSeason(oregon, 2024) === 'Pac-12') throw new Error('oregon 2024 should not stay Pac-12')
const oregon21 = pack(2021).find((r) => r.school.id === 'oregon')
if (oregon21.school.conference !== 'Pac-12') throw new Error('applySeason oregon 2021 conference')
if (oregon21.modeled.conferenceThirdParty !== expectPac12) {
  throw new Error(`oregon 2021 third-party ${oregon21.modeled.conferenceThirdParty} != Pac-12 proxy ${expectPac12}`)
}
if (oregon21.modeled.era !== 'collective') throw new Error('oregon 2021 not collective-era')
console.log('Pac-12 proxy', expectPac12, 'oregon 2021 mid', oregon21.modeled.mid)

function loadRoster(year) {
  const path = `public/data/rosters-${year}.json`
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

for (const year of [2021, 2022, 2023, 2024, 2025, 2026]) {
  const book = loadRoster(year)
  if (!book) {
    console.log(`${year}: no roster file — empty roster (no invented names)`)
    continue
  }
  const rows = pack(year)
  const lsu = rows.find((r) => r.school.id === 'lsu')
  const entry = book.schools?.lsu
  if (!lsu.modeled?.mid) throw new Error(`${year} lsu missing modeled mid`)
  if (!entry?.players?.length) {
    const named = allocateNamedPlayers(entry, lsu.modeled, scaleRosterToModeled(lsu.modeled))
    if (named) throw new Error(`${year} invented LSU players from an empty roster`)
    console.log(`${year}: LSU roster empty — left empty`)
    continue
  }
  const bands = scaleRosterToModeled(lsu.modeled)
  const named = allocateNamedPlayers(entry, lsu.modeled, bands)
  if (!named?.players?.length) throw new Error(`${year} LSU names not allocated despite roster + modeled mid`)
  if (named.namesOnly) throw new Error(`${year} used names-only path despite modeled mid`)
  const bad = named.players.filter((p) => p.confidence !== 'modeled' || p.low == null || p.high == null)
  if (bad.length) throw new Error(`${year} ${bad.length} LSU player cells not modeled`)
  if (year <= 2024) {
    if (!/collective-era/i.test(named.players[0].note)) {
      throw new Error(`${year} LSU player note missing collective-era language`)
    }
    if (!/not a filing/i.test(named.players[0].note)) {
      throw new Error(`${year} LSU player note missing not-a-filing language`)
    }
  } else if (/collective-era/i.test(named.players[0].note)) {
    throw new Error(`${year} House-era player note should not say collective-era`)
  }
  console.log(
    `${year}: LSU ${named.players.length} named · modeled ${named.players[0].low}–${named.players[0].high} · ${named.players[0].name}`
  )
}

console.log('named-roster allocation ok')
