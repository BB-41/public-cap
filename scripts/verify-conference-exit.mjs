/**
 * Conference-exit lane honesty.
 * Run: node scripts/verify-conference-exit.mjs
 */
import { readFileSync } from 'node:fs'
import {
  ACC_FOOTBALL_IDS,
  ACC_SOURCE,
  B12_FULL_SHARE_HIGH,
  B12_FULL_SHARE_LOW,
  B12_FY2025_990,
  B12_HALF_SHARE_IDS,
  B12_IDS,
  B12_MODELED_RANGE_HIGH,
  B12_MODELED_RANGE_LOW,
  B12_990,
  B12_BYLAWS,
  B12_FORMULA_QUOTE,
  B12_GOR_PLAIN,
  B12_GOR_QUOTE,
  B1G_IDS,
  B1G_GOR,
  B1G_NO_FEE,
  B1G_NO_FEE_PLAIN,
  ND_HALE,
  SEC_IDS,
  SEC_SOURCE,
  accStepForSeason,
  b12ModeledFee,
  conferenceExitHasValue,
  resolveConferenceExit,
} from '../src/lib/conferenceExit.js'
import { computeCapacity, val } from '../src/lib/compute.js'
import { SCHOOL_DRILLS } from '../src/lib/share.js'
import { DEFS } from '../src/lib/definitions.js'
import { applySeason } from '../src/lib/seasons.js'

const schools = JSON.parse(readFileSync(new URL('../data/schools.json', import.meta.url), 'utf8'))
const pubSchools = JSON.parse(readFileSync(new URL('../public/data/schools.json', import.meta.url), 'utf8'))
const buyoutPage = readFileSync(new URL('../src/pages/Buyout.jsx', import.meta.url), 'utf8')
const layersSrc = readFileSync(new URL('../src/components/Layers.jsx', import.meta.url), 'utf8')
const homeSrc = readFileSync(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8')
const methodsSrc = readFileSync(new URL('../src/pages/Methods.jsx', import.meta.url), 'utf8')

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
ok(DEFS.conferenceExit.text.includes('Four instruments') || DEFS.conferenceExit.text.includes('Big Ten'), 'definition names Big Ten as a fourth instrument')
ok(!buyoutPage.includes('conferenceExit') && !buyoutPage.includes('Conference exit'), 'Buyout page is unchanged')

ok(accStepForSeason(2025)?.value === 165_000_000, '2025 season / FY 2025-26 is $165M')
ok(accStepForSeason(2026)?.value === 147_000_000, '2026 season / FY 2026-27 is $147M')
ok(accStepForSeason(2024) == null, 'no ACC stair before FY 2025-26')

ok(B12_FORMULA_QUOTE.includes('sum of the amount of distributions'), 'formula quote is the hosted §3.4 sentence')
ok(B12_GOR_QUOTE.includes('does not abrogate'), 'GOR quote says payment does not abrogate')
ok(B12_GOR_PLAIN.includes('grant of rights still sits with the league'), 'plain GOR sentence is on the desk')
ok(layersSrc.includes('B12_GOR_PLAIN') && layersSrc.includes('Grant of rights still sits with the league'), 'school-page drill shows the GOR sentence')
ok(layersSrc.includes('B12_BYLAWS.url') && layersSrc.includes('§3.4'), 'drill cites hosted bylaws PDF')
ok(homeSrc.includes('modeled-cell'), 'homepage still uses modeled-cell class')
ok(/confExitModeled/.test(homeSrc), 'homepage tracks modeled conference-exit cells')
ok(/Four instruments|four instruments|Big 12 — modeled/.test(methodsSrc), 'Methods names the instruments')
ok(methodsSrc.includes('grant of rights still sits with the league'), 'Methods says GOR stays with the league')
ok(methodsSrc.includes('David Hale') || methodsSrc.includes('247Sports'), 'Methods cites Hale / 247Sports for ND')
ok(homeSrc.includes('none published') && homeSrc.includes('grant of rights'), 'homepage B1G cell is none published / grant of rights')
ok(!/confExitNonePublished[\s\S]{0,200}pending-cell">pending/.test(homeSrc) || homeSrc.includes('confExitNonePublished'), 'homepage tracks B1G none-published')
ok(layersSrc.includes('B1G_NO_FEE_PLAIN') && layersSrc.includes('None published'), 'B1G drill says none published')
ok(layersSrc.includes('B1G_GOR_PLAIN') && layersSrc.includes('B1G_FOIA_PLAIN'), 'B1G drill has GOR and FOIA sentences')
ok(methodsSrc.includes('The Big 10 does not have an exit fee') || methodsSrc.includes('does not have an exit fee'), 'Methods quotes Wake Forest Law Review')
ok(methodsSrc.includes(B1G_GOR.url), 'Methods cites ESPN GOR/PE story')
ok(B1G_NO_FEE_PLAIN.includes('no published cash exit fee'), 'B1G plain language refuses a cash fee')

const bookedAcc = []
const bookedSec = []
const modeledB12 = []
const modeledNd = []
const b1gNone = []
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
  } else if (B12_IDS.includes(s.id)) {
    modeledB12.push(s.id)
    ok(x.instrument === 'big12-bylaw-2x-distributions', `${s.id} is Big 12 modeled 2× 990`)
    ok(x.rightsInTow === false, `${s.id} is not treated as rights-in-tow`)
    ok(x.confidence === 'modeled', `${s.id} labeled modeled`)
    ok(x.fee.confidence === 'modeled', `${s.id} fee labeled modeled`)
    ok(x.url === B12_990.url, `${s.id} cites the FY2025 990 extract`)
    ok(x.bylawsUrl === B12_BYLAWS.url, `${s.id} cites hosted bylaws`)
    ok(x.grantOfRights?.plain.includes('grant of rights still sits with the league'), `${s.id} GOR sentence on the record`)
    ok(x.formula?.text.includes('final two years'), `${s.id} formula cites §3.4 two-year sum`)
    ok(!/rights in tow/i.test(x.notes) || /not the ACC/.test(x.notes), `${s.id} does not look like ACC rights-in-tow`)
    const y26 = resolveConferenceExit(s, 2026)
    const y24 = resolveConferenceExit(s, 2024)
    ok(y24.fee.value == null && y24.fee.low == null, `${s.id} 2024 resolve pending`)
    ok(conferenceExitHasValue(y26), `${s.id} 2026 has a modeled value or range`)
    ok(y26.fee.confidence === 'modeled', `${s.id} 2026 resolve labeled modeled`)
    ok(s.conference === 'Big 12', `${s.id} current conference is Big 12`)

    const math = b12ModeledFee(s.id)
    if (B12_HALF_SHARE_IDS.includes(s.id)) {
      ok(x.fee.value == null, `${s.id} half-share is not a silent 2× point`)
      ok(x.fee.low === B12_MODELED_RANGE_LOW, `${s.id} range low is 2 × Utah 990`)
      ok(x.fee.high === B12_MODELED_RANGE_HIGH, `${s.id} range high is 2 × ASU 990`)
      ok(/half-share/.test(x.fee.notes), `${s.id} notes FY2025 was a half-share`)
      ok(/full-share/.test(x.fee.notes), `${s.id} notes the full-share peer range`)
      if (s.id !== 'houston') {
        const filed = B12_FY2025_990[s.id].amount
        ok(x.distribution.amount === filed, `${s.id} stores the named half-share 990`)
        ok(x.fee.notes.includes(String(filed * 2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')) || x.fee.notes.includes(String(filed * 2)), `${s.id} footnotes 2× last filed`)
      } else {
        ok(x.distribution.amount == null, 'Houston has no invented Schedule I point')
        ok(/not independently extracted/.test(x.fee.notes), 'Houston notes the unnamed 990 line')
      }
    } else {
      const filed = B12_FY2025_990[s.id].amount
      ok(x.distribution.amount === filed, `${s.id} books the named Schedule I amount`)
      ok(x.fee.value === filed * 2, `${s.id} modeled fee is 2 × named 990`)
      ok(x.fee.low == null && x.fee.high == null, `${s.id} named full-share is a point, not a fake range`)
    }
    ok(math.named === !!B12_FY2025_990[s.id], `${s.id} named flag matches the 990 table`)
  } else if (s.id === 'notre-dame') {
    modeledNd.push(s.id)
    ok(x.instrument === 'nd-acc-membership-hale', 'ND is Hale modeled membership exit')
    ok(x.fee.value === 100_000_000, 'ND stores the ~$100 million Hale figure')
    ok(x.fee.approx === true, 'ND is marked approximate — not a more precise invented dollar')
    ok(x.confidence === 'modeled', 'ND labeled modeled')
    ok(x.url === ND_HALE.url, 'ND cites 247Sports quoting Hale')
    ok(/not the FSU|not the .*settlement football ladder/i.test(x.notes), 'ND footnote refuses the ACC football ladder')
    ok(/independent/i.test(x.notes), 'ND note says football is independent')
    ok(resolveConferenceExit(s, 2026).fee.value === 100_000_000, 'ND 2026 resolve is $100M modeled')
    ok(resolveConferenceExit(s, 2024).fee.value == null, 'ND 2024 resolve pending')
  } else if (B1G_IDS.includes(s.id)) {
    b1gNone.push(s.id)
    ok(x.instrument === 'bigten-gor-no-cash-fee', `${s.id} is Big Ten GOR / no-cash-fee`)
    ok(x.fee?.value == null, `${s.id} has no invented dollar`)
    ok(x.fee?.value !== 0, `${s.id} is not $0`)
    ok(x.status === 'none-published', `${s.id} status is none-published`)
    ok(x.rightsInTow === false, `${s.id} rights stay with the league`)
    ok(x.url === B1G_NO_FEE.url, `${s.id} cites Wake Forest Law Review`)
    ok(x.gorUrl === B1G_GOR.url, `${s.id} cites ESPN GOR story`)
    ok(/no published cash exit fee/i.test(x.notes), `${s.id} notes no published cash fee`)
    ok(/2036/.test(x.notes), `${s.id} notes GOR through 2036`)
    ok(s.conference === 'Big Ten', `${s.id} current conference is Big Ten`)
    const y26 = resolveConferenceExit(s, 2026)
    const y24 = resolveConferenceExit(s, 2024)
    ok(/does not have an exit fee/.test(y26.fee.notes), `${s.id} resolve quotes Wake Forest`)
    ok(/withheld/.test(y26.fee.notes), `${s.id} resolve notes Illinois FOIA withheld`)
    ok(/do not apply the Big 12/.test(y26.fee.notes), `${s.id} resolve refuses the Big 12 formula`)
    ok(y26.fee.value == null, `${s.id} 2026 resolve still has no dollar`)
    ok(y26.instrument === 'bigten-gor-no-cash-fee', `${s.id} 2026 keeps the B1G instrument`)
    ok(!conferenceExitHasValue(y26), `${s.id} 2026 is not treated as a dollar cell`)
    ok(y24.fee.value == null, `${s.id} 2024 resolve pending`)
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
ok(modeledB12.length === 16, `16 Big 12 modeled (got ${modeledB12.length})`)
ok(modeledNd.length === 1, `1 ND modeled (got ${modeledNd.length})`)
ok(b1gNone.length === 18, `18 Big Ten none-published (got ${b1gNone.length})`)
ok(pending.length === 0, `no leftover pending Power schools (got ${pending.length})`)
ok(!bookedAcc.includes('notre-dame'), 'Notre Dame is not on the ACC football ladder')
ok(!pending.includes('notre-dame'), 'Notre Dame is no longer pending')
ok(!b1gNone.includes('notre-dame'), 'Notre Dame is not on the Big Ten GOR cell')
ok(bookedSec.includes('texas') && bookedSec.includes('oklahoma'), 'Texas and Oklahoma get the SEC $30M cell')
ok(!modeledB12.includes('texas') && !modeledB12.includes('oklahoma'), 'Texas and Oklahoma are not stamped with Big 12 modeled 2×')
ok(!pending.includes('texas') && !pending.includes('oklahoma'), 'Texas and Oklahoma are not left on the old Big 12 figure')

ok(B12_FULL_SHARE_LOW === 37_879_865, 'Utah is the named full-share floor')
ok(B12_FULL_SHARE_HIGH === 43_009_550, 'ASU is the named full-share high')
ok(B12_MODELED_RANGE_LOW === 75_759_730, '2 × Utah')
ok(B12_MODELED_RANGE_HIGH === 86_019_100, '2 × ASU')

const isu = schools.schools.find((s) => s.id === 'iowa-state')
ok(isu.conferenceExit.fee.value === 41_194_426 * 2, 'Iowa State 2 × $41,194,426')
ok(isu.capacity.mediaConference.value === 41_194_426, 'Iowa State media cell unchanged')

const ndSeason = applySeason(schools.schools.find((s) => s.id === 'notre-dame'), 2026)
ok(ndSeason.conferenceExit.fee?.value === 100_000_000, 'ND 2026 overlay keeps the Hale cell')
ok(ndSeason.conferenceExit.instrument !== 'acc-settlement-ladder', 'ND overlay is not the ACC football ladder')

const clemsonCap = schools.schools.find((s) => s.id === 'clemson').capacity
ok(clemsonCap.mediaConference?.value != null, 'Clemson media cell unchanged presence')
ok(schools.schools.find((s) => s.id === 'clemson').conferenceExit.ladder[0].value === 165_000_000, 'Clemson ACC ladder untouched')
ok(schools.schools.find((s) => s.id === 'alabama').conferenceExit.fee.value === 30_000_000, 'Alabama SEC $30M untouched')

console.log(`ACC booked (${bookedAcc.length}): ${bookedAcc.sort().join(', ')}`)
console.log(`SEC booked (${bookedSec.length}): ${bookedSec.sort().join(', ')}`)
console.log(`Big 12 modeled (${modeledB12.length}): ${modeledB12.sort().join(', ')}`)
console.log(`ND modeled (${modeledNd.length}): ${modeledNd.join(', ')}`)
console.log(`Big Ten none-published (${b1gNone.length}): ${b1gNone.sort().join(', ')}`)
console.log(`pending (${pending.length}): ${pending.sort().join(', ')}`)

const failed = checks.filter((c) => !c.ok)
if (failed.length) {
  console.error(`${failed.length} failed`)
  process.exit(1)
}
console.log(`${checks.length} checks ok`)
