/**
 * Private Power 4 (+ Notre Dame) EADA cells stay official, unsplit, and
 * out of the booked MFRS / 990 capacity stack.
 * Run: node scripts/verify-private-eada.mjs
 */
import { readFileSync } from 'node:fs'
import { applySeason } from '../src/lib/seasons.js'
import { computeCapacity, eadaLane, leftoverWaterfall, val } from '../src/lib/compute.js'

const data = JSON.parse(readFileSync(new URL('../data/schools.json', import.meta.url), 'utf8'))
const publicData = JSON.parse(readFileSync(new URL('../public/data/schools.json', import.meta.url), 'utf8'))
const extract = JSON.parse(readFileSync(new URL('./eada-2025-privates.json', import.meta.url), 'utf8'))

const PRIVATE_IDS = Object.keys(extract.schools)
const MFRS = ['tickets', 'sponsorships', 'contributions']

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

ok(JSON.stringify(data) === JSON.stringify(publicData), 'data/schools.json synced to public/data')
ok(PRIVATE_IDS.length === 14, 'extract lists 14 privates')
ok(extract.asOf === '2026-04', 'asOf is the official zip publish month')
ok(extract.file === 'EADA_2025.xlsx', 'extract names the official workbook')

const byId = Object.fromEntries(data.schools.map((s) => [s.id, s]))

for (const id of PRIVATE_IDS) {
  const school = byId[id]
  const row = extract.schools[id]
  ok(!!school, `${id} is on the desk`)
  if (!school) continue
  ok(school.private === true, `${id} marked private`)
  ok(school.revenueGap === true, `${id} marked revenueGap`)

  const total = school.capacity?.eadaTotal
  const football = school.capacity?.eadaFootball
  ok(total?.value != null, `${id} eadaTotal is non-null`)
  ok(total?.value === row.eadaTotal, `${id} eadaTotal matches official GRND_TOTAL_REVENUE ${row.eadaTotal}`)
  ok(total?.confidence === 'reported', `${id} eadaTotal confidence is reported`)
  ok(total?.fiscalYear === 'FY2025', `${id} eadaTotal is FY2025`)
  ok(total?.asOf === extract.asOf, `${id} eadaTotal asOf is ${extract.asOf}`)
  ok(/EADA/i.test(total?.source || ''), `${id} eadaTotal cites EADA`)
  ok(/ope\.ed\.gov\/athletics/i.test(total?.url || ''), `${id} eadaTotal cites ope.ed.gov`)
  ok(!/modeled/i.test(total?.confidence || ''), `${id} eadaTotal is not modeled`)
  ok(/not comparable|NOT comparable/i.test(total?.notes || ''), `${id} eadaTotal warns EADA ≠ MFRS`)
  ok(/do not unpack/i.test(total?.notes || ''), `${id} eadaTotal forbids unpacking`)

  if (row.eadaFootball != null) {
    ok(football?.value === row.eadaFootball, `${id} eadaFootball matches REV_MEN_Football ${row.eadaFootball}`)
    ok(football?.confidence === 'reported', `${id} eadaFootball confidence is reported`)
    ok(/REV_MEN_Football/i.test(football?.source || ''), `${id} eadaFootball cites REV_MEN_Football`)
    ok(/not a filing of NIL/i.test(football?.notes || ''), `${id} eadaFootball is not NIL / House`)
  } else {
    ok(football == null || football.value == null, `${id} omits null eadaFootball`)
  }

  for (const k of MFRS) {
    ok(school.capacity?.[k]?.value == null, `${id} did not invent ${k} from EADA`)
  }

  const cap = computeCapacity(school)
  ok(cap.booked === val(school.capacity.mediaConference), `${id} booked capacity is conference media only`)
  ok(cap.booked !== cap.eadaTotal, `${id} EADA is not the booked stack`)
  ok(!cap.components.some((c) => c.key === 'eada' || c.key === 'eadaFootball'), `${id} computeCapacity components omit EADA`)
  ok(cap.eadaTotal === row.eadaTotal, `${id} computeCapacity exposes eadaTotal separately`)

  const fall = leftoverWaterfall(school, cap, false)
  ok(fall.capacity === cap.booked, `${id} leftover waterfall capacity is media, not EADA`)
  ok(/conference media/i.test(fall.steps.find((s) => s.key === 'capacity')?.label || ''), `${id} waterfall labels conference media`)
  ok(!/EADA/i.test(fall.steps.find((s) => s.key === 'capacity')?.label || ''), `${id} waterfall does not label EADA as capacity`)

  const y24 = applySeason(school, 2024)
  ok(eadaLane(y24).total?.value === row.eadaTotal, `${id} 2024 overlay still carries FY2025 EADA`)
  ok(y24.capacity?.tickets?.value == null, `${id} 2024 overlay does not invent tickets`)
}

ok(byId.baylor.capacity.eadaTotal.value === 144126427, 'Baylor comes from the official Excel (was missing on a secondary list)')
ok(byId['notre-dame'].capacity.eadaTotal.value === 289616198, 'Notre Dame refreshed off the old CNBC ~$235M cell')
ok(byId.usc.capacity.eadaTotal.value === 234029848, 'USC refreshed off the old CNBC ~$242M cell')
ok(!/CNBC/i.test(byId['notre-dame'].capacity.eadaTotal.source || ''), 'Notre Dame EADA cite is the federal file')
ok(!/CNBC/i.test(byId.usc.capacity.eadaTotal.source || ''), 'USC EADA cite is the federal file')

const publics = data.schools.filter((s) => !s.private)
for (const s of publics) {
  const cap = computeCapacity(s)
  if (s.capacity?.eadaTotal?.value != null) {
    ok(cap.booked !== val(s.capacity.eadaTotal), `${s.id} public booked stack is not silent EADA`)
  }
}

const failed = checks.filter((c) => !c.ok)
if (failed.length) {
  console.error(`verify-private-eada: ${failed.length}/${checks.length} failed`)
  process.exit(1)
}
console.log(`verify-private-eada: ${checks.length} checks ok — 14 privates booked, no MFRS unpack, EADA off the stack`)
