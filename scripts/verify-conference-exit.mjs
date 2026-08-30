/**
 * Conference-exit lane honesty.
 * Run: node scripts/verify-conference-exit.mjs
 */
import { readFileSync } from 'node:fs'
import {
  ACC_FOOTBALL_IDS,
  ACC_SOURCE,
  SEC_IDS,
  SEC_SOURCE,
  accStepForSeason,
  resolveConferenceExit,
} from '../src/lib/conferenceExit.js'
import { computeCapacity, val } from '../src/lib/compute.js'
import { SCHOOL_DRILLS } from '../src/lib/share.js'
import { DEFS } from '../src/lib/definitions.js'
import { applySeason } from '../src/lib/seasons.js'

const schools = JSON.parse(readFileSync(new URL('../data/schools.json', import.meta.url), 'utf8'))
const pubSchools = JSON.parse(readFileSync(new URL('../public/data/schools.json', import.meta.url), 'utf8'))
const buyoutPage = readFileSync(new URL('../src/pages/Buyout.jsx', import.meta.url), 'utf8')

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

ok(JSON.stringify(schools) === JSON.stringify(pubSchools), 'schools.json copies still match')
ok(SCHOOL_DRILLS.has('conference-exit'), 'share hash #conference-exit is a school drill')
ok(DEFS.conferenceExit?.label === 'Conference exit', 'definition is named Conference exit')
ok(!/buyout/i.test(DEFS.conferenceExit.label), 'definition label is not Buyout')
ok(DEFS.conferenceExit.text.includes('not a coach-firing buyout'), 'definition refuses coach buyout')
ok(DEFS.conferenceExit.text.includes('Not part of annual capacity'), 'definition keeps exit out of capacity')
ok(!buyoutPage.includes('conferenceExit') && !buyoutPage.includes('Conference exit'), 'Buyout page is unchanged')

ok(accStepForSeason(2025)?.value === 165_000_000, '2025 season / FY 2025-26 is $165M')
ok(accStepForSeason(2026)?.value === 147_000_000, '2026 season / FY 2026-27 is $147M')
ok(accStepForSeason(2024) == null, 'no ACC stair before FY 2025-26')

const bookedAcc = []
const bookedSec = []
const pending = []

for (const s of schools.schools) {
  const x = s.conferenceExit
  ok(x, `${s.id} has conferenceExit`)
  if (!x) continue

  const cap = s.capacity
  ok(cap?.mediaConference != null, `${s.id} capacity.mediaConference still present`)
  ok(cap?.sponsorships != null, `${s.id} capacity.sponsorships still present`)
  ok(cap?.tickets != null, `${s.id} capacity.tickets still present`)
  ok(cap?.contributions != null, `${s.id} capacity.contributions still present`)

  const computed = computeCapacity(s)
  ok(computed.booked === val(cap.mediaConference) + val(cap.sponsorships) + val(cap.tickets) + val(cap.contributions), `${s.id} booked capacity is still the four-line stack`)
  ok(!Object.prototype.hasOwnProperty.call(computed, 'conferenceExit'), `${s.id} computeCapacity has no conferenceExit key`)

  if (ACC_FOOTBALL_IDS.includes(s.id)) {
    bookedAcc.push(s.id)
    ok(x.instrument === 'acc-settlement-ladder', `${s.id} is ACC settlement ladder`)
    ok(x.rightsInTow === true, `${s.id} rights in tow`)
    ok(x.url === ACC_SOURCE.url, `${s.id} cites Post and Courier settlement story`)
    ok(x.ladder?.[0]?.value === 165_000_000, `${s.id} first step $165M`)
    ok(x.ladder?.[1]?.value === 147_000_000, `${s.id} second step $147M`)
    ok(x.ladder?.[5]?.value === 75_000_000, `${s.id} floor $75M`)
    const y25 = resolveConferenceExit(s, 2025)
    const y26 = resolveConferenceExit(s, 2026)
    const y24 = resolveConferenceExit(s, 2024)
    ok(y25.fee.value === 165_000_000, `${s.id} 2025 headline $165M`)
    ok(y26.fee.value === 147_000_000, `${s.id} 2026 headline $147M`)
    ok(y24.fee.value == null, `${s.id} 2024 headline pending`)
    ok(/2026 season exit/.test(y25.fee.notes), `${s.id} 2025 notes name 2026 season exit`)
    ok(/2027 season exit/.test(y26.fee.notes), `${s.id} 2026 notes name 2027 season exit`)
  } else if (SEC_IDS.includes(s.id)) {
    bookedSec.push(s.id)
    ok(x.instrument === 'sec-bylaw-withdrawal', `${s.id} is SEC bylaw withdrawal`)
    ok(x.rightsInTow === false, `${s.id} is not treated as rights-in-tow`)
    ok(x.fee.value === 30_000_000, `${s.id} headline $30M`)
    ok(x.url === SEC_SOURCE.url, `${s.id} cites hosted SEC bylaws PDF`)
    ok(x.stairs?.some((st) => st.bylaw === '3.2.2' && st.value === 40_000_000 && !st.booked), `${s.id} footnotes $40M`)
    ok(x.stairs?.some((st) => st.bylaw === '3.2.3' && st.value === 45_000_000 && !st.booked), `${s.id} footnotes $45M`)
    ok(resolveConferenceExit(s, 2026).fee.value === 30_000_000, `${s.id} 2026 resolve $30M`)
    ok(resolveConferenceExit(s, 2024).fee.value == null, `${s.id} 2024 resolve pending`)
    ok(s.conference === 'SEC', `${s.id} current conference is SEC`)
  } else {
    pending.push(s.id)
    ok(x.instrument == null, `${s.id} instrument empty`)
    ok(x.fee?.value == null, `${s.id} fee empty`)
    ok(x.confidence === 'pending', `${s.id} pending`)
    ok(!x.url, `${s.id} pending has no invented URL`)
  }
}

ok(bookedAcc.length === 17, `17 ACC football schools booked (got ${bookedAcc.length})`)
ok(bookedSec.length === 16, `16 SEC schools booked (got ${bookedSec.length})`)
ok(pending.length === 35, `35 pending (B1G + Big 12 + ND) (got ${pending.length})`)
ok(!bookedAcc.includes('notre-dame'), 'Notre Dame is not on the ACC football ladder')
ok(pending.includes('notre-dame'), 'Notre Dame football stays pending')
ok(/independent/i.test(schools.schools.find((s) => s.id === 'notre-dame').conferenceExit.notes), 'ND note says football is independent')
ok(bookedSec.includes('texas') && bookedSec.includes('oklahoma'), 'Texas and Oklahoma get the SEC $30M cell')
ok(!pending.includes('texas') && !pending.includes('oklahoma'), 'Texas and Oklahoma are not left on the old Big 12 figure')

for (const id of ['kansas', 'iowa-state', 'baylor', 'oklahoma-state']) {
  const s = schools.schools.find((x) => x.id === id)
  ok(s.conferenceExit.fee?.value == null, `${id} is not stamped with $100M`)
  ok(/one-off|pending/i.test(s.conferenceExit.notes), `${id} notes the Big 12 one-off`)
}

const ndSeason = applySeason(schools.schools.find((s) => s.id === 'notre-dame'), 2026)
ok(ndSeason.conferenceExit.fee?.value == null, 'ND 2026 overlay stays empty')

const clemsonCap = schools.schools.find((s) => s.id === 'clemson').capacity
ok(clemsonCap.mediaConference?.value != null, 'Clemson media cell unchanged presence')

console.log(`ACC booked (${bookedAcc.length}): ${bookedAcc.sort().join(', ')}`)
console.log(`SEC booked (${bookedSec.length}): ${bookedSec.sort().join(', ')}`)
console.log(`pending (${pending.length}): ${pending.sort().join(', ')}`)

const failed = checks.filter((c) => !c.ok)
if (failed.length) {
  console.error(`${failed.length} failed`)
  process.exit(1)
}
console.log(`${checks.length} checks ok`)
