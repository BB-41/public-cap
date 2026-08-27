/**
 * Stamp / step-tape / House-remaining honesty.
 * Run: node scripts/verify-desk-calcs.mjs
 */
import { readFileSync } from 'node:fs'
import { applySeason } from '../src/lib/seasons.js'
import { houseRemaining, val } from '../src/lib/compute.js'
import { mergeSchoolSteps, stepInForce } from '../src/lib/buyout.js'

const data = JSON.parse(readFileSync(new URL('../data/schools.json', import.meta.url), 'utf8'))
const publicData = JSON.parse(readFileSync(new URL('../public/data/schools.json', import.meta.url), 'utf8'))
const buyouts = JSON.parse(readFileSync(new URL('../data/buyouts.json', import.meta.url), 'utf8'))

function fold(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}
function samePerson(a, b) {
  return Boolean(a) && Boolean(b) && fold(a) === fold(b)
}
function isUsaToday(pay) {
  return String(pay?.source || '').toUpperCase().includes('USA TODAY')
}

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

ok(data.schools.length === 68, '68 schools')
ok(JSON.stringify(data) === JSON.stringify(publicData), 'data/schools.json synced to public/data')

const byId = Object.fromEntries(data.schools.map((s) => [s.id, s]))

// --- 1) 2026 stamps ---
ok(byId['ohio-state'].coachesByYear['2026'].football.pay.value === 12_500_000, 'Ryan Day 2026 is the May 2026 FOIA $12.5M cite')
ok(!isUsaToday(byId['ohio-state'].coachesByYear['2026'].football.pay), 'Day year cell is not USA TODAY')
ok(isUsaToday(byId['ohio-state'].coaches.football.pay), 'Ryan Day current is still the 2025 USA TODAY snapshot')
ok(byId.indiana.coachesByYear['2026'].football.pay.value === 12_025_000, 'Cignetti $12,025,000 kept')
ok(byId.alabama.coachesByYear['2026'].football.pay.value === 12_500_000, 'DeBoer $12.5M kept')
ok(byId.lsu.coachesByYear['2026'].football.pay.value === 13_000_000, 'Kiffin $13M')
ok(byId['penn-state'].coachesByYear['2026'].football.pay.value === 8_000_000, 'Campbell $8.0M')
ok(byId.auburn.coachesByYear['2026'].football.pay.value === 6_750_000, 'Golesh $6.75M')

let stamped = 0
for (const s of data.schools) {
  const cur = s.coaches.football
  const y26 = s.coachesByYear['2026'].football
  ok(cur.name === y26.name, `${s.id} 2026 chair name unchanged`)
  if (!samePerson(cur.name, y26.name)) continue
  if (cur.pay?.value != null && !isUsaToday(cur.pay)) {
    ok(y26.pay?.value === cur.pay.value, `${s.id} 2026 pay matches current-deal cite`)
    ok(!isUsaToday(y26.pay), `${s.id} 2026 stamp is not USA TODAY`)
    stamped += 1
  } else if (isUsaToday(cur.pay) && y26.pay?.value != null) {
    ok(!isUsaToday(y26.pay), `${s.id} 2026 dollar is not a cloned USA TODAY row`)
  }
  if (s.private && isUsaToday(cur.pay)) {
    ok(y26.pay?.value == null, `${s.id} private 2026 pending`)
  }
}
ok(stamped >= 22, `stamped current-deal cites ${stamped}`)

// --- 2) step tapes ---
const STEP_IDS = ['florida-state', 'penn-state', 'clemson', 'virginia-tech', 'north-carolina', 'iowa-state']
for (const s of data.schools) {
  const steps = s.coaches.football.buyout?.steps || []
  if (STEP_IDS.includes(s.id)) {
    ok(steps.length > 0, `${s.id} step tape present`)
    ok(steps.every((st) => st.asOf && st.contractYear && st.notes && /PDF:/.test(st.notes)), `${s.id} steps labeled from the PDF`)
  } else {
    ok(steps.length === 0, `${s.id} has no invented staircase`)
  }
}
ok(byId['florida-state'].coaches.football.buyout.steps[0].remaining === 58_192_500, 'Norvell CY7 remaining')
ok(byId['penn-state'].coaches.football.buyout.steps[0].remaining === 70_500_000, 'Campbell 2026 remaining')
ok((byId.kentucky.coaches.football.buyout.rule || '').includes('70%'), 'Kentucky keeps the percent rule')

const fsuMerged = mergeSchoolSteps(buyouts.coaches['florida-state'], byId['florida-state'].coaches.football.buyout)
ok(fsuMerged.tape === 'steps', 'calculator tape is steps when school steps exist')
ok(stepInForce(fsuMerged.steps, '2026-08-26').amount === 58_192_500, 'calculator consumes remaining as amount')
ok(stepInForce(fsuMerged.steps, '2027-06-01').amount === 48_687_500, 'calculator walks the CY8 step')

const remainingOnly = [{ asOf: '2026-01-01', remaining: 70_500_000, contractYear: '2026', notes: 'PDF: x' }]
ok(stepInForce(remainingOnly, '2026-09-01').amount === 70_500_000, 'remaining-only step normalizes')

// --- 3) House remaining ---
const HOUSE = 20_500_000
ok(byId.louisville.nil.booked.value === 32_900_000, 'Louisville booked untouched')
ok(byId.louisville.nil.preCap.value === 12_700_000, 'Louisville preCap untouched')
ok(byId.louisville.nil.houseRemaining.spent === 20_200_000, 'Louisville House spent is the split')
ok(byId.louisville.nil.houseRemaining.value === HOUSE - 20_200_000, 'Louisville remaining')
ok(byId.kentucky.nil.booked.value === 18_000_000, 'Kentucky booked untouched')
ok(byId.kentucky.nil.houseRemaining.value === HOUSE - 18_000_000, 'Kentucky remaining')
ok(byId.ucla.nil.booked.value === 20_500_000, 'UCLA booked untouched')
ok(byId.ucla.nil.houseRemaining.value === 0, 'UCLA $0 leftover')
ok(byId.california.nil.booked.value === 20_500_000, 'Cal booked untouched')
ok(byId.california.nil.houseRemaining.value === 0, 'Cal $0 leftover')
ok(byId.texas.nil.booked.value === 13_500_000, 'Texas booked untouched')
ok(byId.texas.nil.houseRemaining.value === HOUSE - 13_500_000, 'Texas YTD remaining')
ok(byId.texas.nil.houseRemaining.partialYear === true, 'Texas labeled YTD')
ok(byId.texas.nil.houseRemaining.overhang === false, 'Texas is under the cap')

let remainingCount = 0
for (const s of data.schools) {
  const hr = s.nil?.houseRemaining
  if (hr && hr.value != null) {
    remainingCount += 1
    ok(['louisville', 'kentucky', 'ucla', 'california', 'texas'].includes(s.id), `${s.id} is one of the five booked House schools`)
    const c990 = (s.nil.collective990 || []).reduce((n, r) => n + (Number(r.value) || 0), 0)
    if (c990) {
      ok(hr.spent !== (s.nil.booked.value || 0) + c990, `${s.id} remaining did not swallow a 990`)
    }
    ok(
      !String(hr.notes || hr.footnote || '').includes('990') || /not in this math|not a 990/i.test(`${hr.notes} ${hr.footnote}`),
      `${s.id} remaining footnote does not treat 990 as spent`
    )
  } else {
    ok(hr == null || hr.value == null, `${s.id} has no invented remaining`)
  }
}
ok(remainingCount === 5, `House remaining on exactly five schools (${remainingCount})`)
ok(houseRemaining(applySeason(byId.louisville, 2025)) === 300_000, '2025 overlay keeps remaining')
ok(houseRemaining(applySeason(byId.louisville, 2026)) === 300_000, '2026 overlay still shows the Year 1 residual')
ok(houseRemaining(applySeason(byId.louisville, 2024)) == null, '2024 overlay drops Year 1 remaining')
ok(val(byId['penn-state'].nil.preCap) === 18_368_391, 'Penn State preCap not used as remaining')
ok(byId['oklahoma-state'].nil.houseRemaining == null, 'OSU 990/preCap is not remaining')

const layers = JSON.parse(readFileSync(new URL('../public/data/layers.json', import.meta.url), 'utf8'))
ok(layers.schools.wisconsin.apparel?.annualValue?.value === 7_000_000, 'Wisconsin UA $7M kept')
ok(layers.schools.kentucky.apparel?.annualValue?.value === 7_000_000, 'Kentucky Nike $7M kept')
ok(layers.schools.kentucky.apparel?.naming?.[0]?.annualValue === 1_850_000, 'Kroger Field $1.85M kept')
let feeCells = 0
for (const s of data.schools) {
  if (s.capacity?.studentFees?.value != null) feeCells += 1
}
ok(feeCells === 53, `studentFees on 53 publics (${feeCells})`)
ok(byId['ohio-state'].capacity.studentFees?.value === 0, 'Ohio State studentFees $0 kept')
ok(byId['ohio-state'].capacity.institutionalSupport?.value === 0, 'Ohio State institutionalSupport $0 kept')
let adPaid = 0
for (const s of data.schools) {
  const pay = s.staff?.athleticDirector?.pay
  if (pay && pay.value != null) adPaid += 1
}
ok(adPaid === 16, `16 paid AD cells kept (${adPaid})`)
ok(byId['ohio-state'].staff.athleticDirector.pay.value === 2_000_000, 'Ross Bjork AD pay kept')
ok(byId.texas.staff.athleticDirector.pay.value === 2_900_000, 'Del Conte AD pay kept')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} desk-calc checks passed`)
if (failed.length) process.exit(1)
