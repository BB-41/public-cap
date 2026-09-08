/**
 * Stamp / step-tape / House-remaining honesty.
 * Run: node scripts/verify-desk-calcs.mjs
 */
import { readFileSync } from 'node:fs'
import { applySeason } from '../src/lib/seasons.js'
import { computeCapacity, houseRemaining, leftoverWaterfall, val } from '../src/lib/compute.js'
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
ok(byId['ohio-state'].coaches.football.pay.value === 12_500_000, 'Ryan Day current is stamped from the 2026 FOIA $12.5M cite')
ok(!isUsaToday(byId['ohio-state'].coaches.football.pay), 'Ryan Day current is no longer the 2025 USA TODAY snapshot')
ok(byId.alabama.coaches.football.pay.value === 12_500_000, 'DeBoer current is stamped from the 2026 trustee $12.5M cite')
ok(!isUsaToday(byId.alabama.coaches.football.pay), 'DeBoer current is not USA TODAY')
ok(byId.indiana.coaches.football.pay.value === 12_025_000, 'Cignetti current is stamped from the 2026 MOU $12,025,000 cite')
ok(!isUsaToday(byId.indiana.coaches.football.pay), 'Cignetti current is not USA TODAY')
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
const PDF_STEP_IDS = ['florida-state', 'penn-state', 'clemson', 'virginia-tech', 'north-carolina', 'iowa-state']
const DERIVED_STEP_IDS = [
  'kentucky', 'arkansas', 'auburn', 'michigan', 'michigan-state', 'ucla',
  'ole-miss', 'kansas-state', 'utah', 'oregon', 'florida', 'oklahoma-state',
  'missouri',
]
const COPIED_STEP_IDS = ['tennessee', 'lsu']
for (const s of data.schools) {
  const steps = s.coaches.football.buyout?.steps || []
  if (PDF_STEP_IDS.includes(s.id)) {
    ok(steps.length > 0, `${s.id} step tape present`)
    ok(steps.every((st) => st.asOf && st.contractYear && st.notes && /PDF:/.test(st.notes)), `${s.id} steps labeled from the PDF`)
  } else if (DERIVED_STEP_IDS.includes(s.id)) {
    ok(steps.length > 0, `${s.id} derived step tape present`)
    ok(steps.every((st) => st.asOf && st.contractYear && st.notes && st.remaining != null), `${s.id} derived steps carry asOf / contractYear / remaining / notes`)
    ok(steps.every((st) => /Derived from|Labeled derived/i.test(st.notes)), `${s.id} steps labeled derived`)
  } else if (COPIED_STEP_IDS.includes(s.id)) {
    ok(steps.length > 0, `${s.id} copied existing buyouts.json steps`)
  } else {
    ok(steps.length === 0, `${s.id} has no invented staircase`)
  }
}
ok(byId['florida-state'].coaches.football.buyout.steps[0].remaining === 58_192_500, 'Norvell CY7 remaining')
ok(byId['penn-state'].coaches.football.buyout.steps[0].remaining === 70_500_000, 'Campbell 2026 remaining')
ok((byId.kentucky.coaches.football.buyout.rule || '').includes('70%'), 'Kentucky keeps the percent rule')
ok(byId.kentucky.coaches.football.buyout.steps[0].remaining === 19_950_000, 'Stein derived remaining $19.95M')
ok(byId.oregon.coaches.football.buyout.steps[0].remaining === 55_000_000, 'Lanning CY5 remaining guaranteed + deferred $55M')
ok(byId.oregon.coaches.football.buyout.value === 55_000_000, 'Oregon USAT overhang replaced by file-derived $55M')
ok(byId['oklahoma-state'].coaches.football.buyout.steps.length === 3, 'Morris stops before the unknown post-Feb 2029 percent')
ok(byId['oklahoma-state'].coaches.football.buyout.steps[0].remaining === 15_000_000, 'Morris 75% remaining includes later years')
ok(byId['ole-miss'].nil.preCap.value === 0, 'Ole Miss Item 44 $0')
ok(byId['ole-miss'].nil.booked.value == null, 'Ole Miss House booked stays pending')

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

const ESTIMATE_IDS = ['lsu', 'miami', 'notre-dame', 'ohio-state', 'oregon', 'texas', 'texas-am']
for (const sid of ESTIMATE_IDS) {
  const est = byId[sid].nil.industryRosterEstimate
  ok(est && est.confidence === 'modeled', `${sid} industry roster estimate is modeled`)
  ok(est.value == null, `${sid} estimate has no fake point value`)
  ok(!/on3/i.test(JSON.stringify(est)), `${sid} estimate does not name On3`)
  ok(!/seaton/i.test(JSON.stringify(est)), `${sid} estimate does not book a named player deal`)
}
const lsuEst = byId.lsu.nil.industryRosterEstimate
ok(lsuEst.kind === 'range' && lsuEst.low === 40_000_000 && lsuEst.high === 50_000_000, 'LSU estimate is $40–50M')
ok(/closer to \$50M/i.test(lsuEst.qualifier), 'LSU qualifier is closer to $50M per CBS')
ok(lsuEst.cites.length === 3, 'LSU cites CBS, SI, and TigerRag')
ok(lsuEst.cites.some((c) => /tigerrag\.com/.test(c.url)), 'LSU cites TigerRag URL')
ok(byId.lsu.nil.houseRemaining == null, 'LSU estimate did not invent House remaining')
ok(byId.lsu.nil.booked.value == null, 'LSU booked NIL stays pending')
for (const sid of ['texas', 'texas-am', 'miami', 'notre-dame', 'ohio-state', 'oregon']) {
  ok(byId[sid].nil.industryRosterEstimate.kind === 'tier', `${sid} is a survey tier`)
  ok(byId[sid].nil.industryRosterEstimate.tier === 'above $40M', `${sid} tier is above $40M`)
}
ok(!byId['texas-tech']?.nil?.industryRosterEstimate, 'Texas Tech is not in the above-$40M tier')
ok(!byId.georgia?.nil?.industryRosterEstimate, 'Georgia is not invented into the above-$40M tier')
ok(byId.texas.nil.houseRemaining.value === 7_000_000, 'Texas leftover unchanged by the survey')

const lsu26 = applySeason(byId.lsu, 2026)
ok(lsu26.nil.industryRosterEstimate?.display === '$40–50M', '2026 overlay keeps the LSU survey')
ok(applySeason(byId.lsu, 2025).nil.industryRosterEstimate == null, '2025 overlay strips the 2026 survey')
ok(houseRemaining(lsu26) == null, 'LSU 2026 leftover stays empty')
const lsuCap = computeCapacity(lsu26)
ok(
  !lsuCap.components.some((c) => /industry|roster estimate/i.test(c.label || '')),
  'LSU capacity stack does not include the survey',
)
const fallLsu = leftoverWaterfall(lsu26, lsuCap, false)
ok(fallLsu.spent == null && fallLsu.leftover == null, 'LSU waterfall has no leftover from the survey')
ok(!fallLsu.steps.some((s) => s.key === 'rosterEstimate' || s.hash === 'roster-estimate'), 'LSU waterfall has no survey step')
ok(
  !fallLsu.steps.some((s) => s.value === 40_000_000 || s.value === 50_000_000),
  'LSU waterfall does not book the survey dollars',
)
const tx26 = applySeason(byId.texas, 2026)
const txFall = leftoverWaterfall(tx26, computeCapacity(tx26), false)
ok(txFall.leftover === 7_000_000, 'Texas waterfall leftover stays $7M')
ok(!txFall.steps.some((s) => s.value === 40_000_000), 'Texas waterfall does not subtract the survey')

const layers = JSON.parse(readFileSync(new URL('../public/data/layers.json', import.meta.url), 'utf8'))
ok(layers.schools.wisconsin.apparel?.annualValue?.value === 7_000_000, 'Wisconsin UA $7M kept')
ok(layers.schools.kentucky.apparel?.annualValue?.value === 7_000_000, 'Kentucky Nike $7M kept')
ok(layers.schools.kentucky.apparel?.naming?.[0]?.annualValue === 1_850_000, 'Kroger Field $1.85M kept')
ok(layers.schools['texas-am'].apparel?.annualValue?.value === 9_000_000, 'Texas A&M Adidas cash+product $9M')
ok(layers.schools.lsu.apparel?.annualValue?.value == null, 'LSU Nike AAV stays pending')
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
ok(adPaid === 49, `49 paid AD cells kept (${adPaid})`)
ok(byId.minnesota.staff.athleticDirector.name === 'Mark Coyle', 'Minnesota current AD is Mark Coyle')
ok(byId.minnesota.staff.athleticDirector.pay.value === 2_000_000, 'Coyle CY7 base $2.0M')
ok(byId.minnesota.staff.athleticDirector.pay.year === 2026, 'Coyle pay is year-pinned 2026')
ok(/not the .*2\.76|not .*average/i.test(byId.minnesota.staff.athleticDirector.pay.notes || ''), 'Coyle notes refuse the $2.76M AAV')
ok(byId['ohio-state'].staff.athleticDirector.pay.value === 2_000_000, 'Ross Bjork AD pay kept')
ok(byId.texas.staff.athleticDirector.pay.value === 2_900_000, 'Del Conte AD pay kept')
ok(byId.kentucky.staff.athleticDirector.name === 'J Batt', 'Kentucky current AD is J Batt')
ok(byId.kentucky.staff.athleticDirector.pay.value === 2_600_000, 'J Batt Year 1 $2.6M')
ok(byId.lsu.staff.athleticDirector.pay.value === 1_500_000, 'Ausberry first-year $1.5M')
ok(byId.oklahoma.staff.athleticDirector.pay.value === 1_250_000, 'Denny board $1.25M')
ok(byId.oklahoma.staff.athleticDirector.name === 'Roger Denny', 'Oklahoma chair stays Denny')
ok(byId.clemson.staff.athleticDirector.name === 'Graham Neff', 'Clemson current AD is Graham Neff')
ok(byId.clemson.staff.athleticDirector.pay.value === 1_350_000, 'Neff July 1 2026 $1.35M')
ok(byId['nc-state'].staff.athleticDirector.name === 'Boo Corrigan', 'NC State current AD is Boo Corrigan')
ok(byId['nc-state'].staff.athleticDirector.pay.value === 1_563_125, 'Corrigan 2026-27 $1,563,125')
ok(byId.louisville.staff.athleticDirector.name === 'Josh Heird', 'Louisville current AD is Josh Heird')
ok(byId.louisville.staff.athleticDirector.pay.value === 925_000, 'Heird $850k + $75k')
ok(byId.arizona.staff.athleticDirector.pay.value === 1_350_000, 'Reed-Francois 2026-27 $1.35M')
ok(byId['virginia-tech'].staff.athleticDirector.name === 'Brian White', 'Virginia Tech current AD is Brian White')
ok(byId['virginia-tech'].staff.athleticDirector.pay.value === 1_600_000, 'White first-year $1.6M')
ok(byId['georgia-tech'].staff.athleticDirector.name === 'Ryan Alpert', 'Georgia Tech current AD is Ryan Alpert')
ok(byId['georgia-tech'].staff.athleticDirector.pay.value === 800_000, 'Alpert 2026-27 $800k')
ok(byId.purdue.staff.athleticDirector.pay.value === 1_000_000, 'McClelland 2026-27 base $1M')
ok(byId.rutgers.staff.athleticDirector.pay.value === 1_350_000, 'Zinn Year 1 $1.35M')
ok(byId['florida-state'].staff.athleticDirector.pay.value === 1_750_000, 'Alford 2026-27 $1.75M')
ok(byId.colorado.staff.athleticDirector.pay.value === 1_200_000, 'Lovo 2026 guaranteed $1.2M')
ok(byId.kansas.staff.athleticDirector.pay.value === 1_380_000, 'Goff 2026-27 $1.38M')
ok(byId['oklahoma-state'].staff.athleticDirector.pay.value === 750_000, 'Weiberg $750k')
ok(byId.pittsburgh.staff.athleticDirector.name === 'Allen Greene', 'Pitt current AD is Allen Greene')
ok(byId.pittsburgh.staff.athleticDirector.pay?.value == null, 'Greene pay stays pending')
ok(byId['arizona-state'].staff.athleticDirector.name === 'Graham Rossini', 'ASU current AD is Graham Rossini')
ok(byId['arizona-state'].staff.athleticDirector.pay.value === 950_000, 'Rossini July 1 2025 base $950k')
ok(byId['arizona-state'].staff.athleticDirector.pay.year === 2025, 'Rossini pay is year-pinned 2025')
ok(byId['west-virginia'].staff.athleticDirector.name === 'Wren Baker', 'WVU current AD is Wren Baker')
ok(byId['west-virginia'].staff.athleticDirector.pay.value === 1_400_000, 'Baker 2026 step $1.4M')
ok(byId.ucf.staff.athleticDirector.name === 'Terry Mohajir', 'UCF current AD is Terry Mohajir')
ok(byId.ucf.staff.athleticDirector.pay.value === 1_000_000, 'Mohajir 2026 SID $1M')
ok(byId.cincinnati.staff.athleticDirector.name === 'John Cunningham', 'Cincinnati current AD is John Cunningham')
ok(byId.cincinnati.staff.athleticDirector.pay.value === 725_000, 'Cunningham 2026-27 $725k')
ok(byId.houston.staff.athleticDirector.name === 'Eddie Nunez', 'Houston current AD is Eddie Nunez')
ok(byId.houston.staff.athleticDirector.pay.value === 1_000_000, 'Nunez 2026 step $1M')
ok(byId.maryland.staff.athleticDirector.pay.value === 1_500_000, 'Smith obtained-EA $1.5M')
ok(byId.virginia.staff.athleticDirector.name === 'Carla Williams', 'UVA current AD is Carla Williams')
ok(byId.virginia.staff.athleticDirector.pay.value === 1_405_470, 'Williams FOIA $1,405,470')
ok(byId.california.staff.athleticDirector.name === 'Jay Larson and Jenny Simon-O\'Neill', 'Cal co-ADs named')
ok(byId.california.staff.athleticDirector.pay?.value == null, 'Cal AD pay stays pending')
ok(byId['north-carolina'].staff.athleticDirector.name === 'Steve Newmark', 'UNC current AD is Steve Newmark')
ok(byId['north-carolina'].staff.athleticDirector.pay?.value === 1_200_000, 'Newmark 2026 is $1.0M base + $200k deferred')
ok(byId['north-carolina'].staff.athleticDirector.pay?.year === 2026, 'Newmark pay is year-pinned 2026')
ok(!(byId['north-carolina'].staff.athleticDirector.pay?.notes || '').includes('Cunningham') || (byId['north-carolina'].staff.athleticDirector.pay?.notes || '').includes('Not Bubba'), 'Newmark notes refuse the prior AD dollar')
ok(byId['ole-miss'].nil.preCap.value === 0, 'Ole Miss Item 44 $0')
ok(byId.arkansas.nil.preCap.value === 0, 'Arkansas Item 44 $0')
ok(byId['florida-state'].nil.preCap.value === 0, 'Florida State Item 44 $0')
ok(byId.kansas.nil.preCap.value === 0, 'Kansas Item 44 $0')
ok(byId.missouri.nil.preCap.value === 0, 'Missouri Item 44 $0')
ok(byId['mississippi-state'].nil.preCap.value === 0, 'Mississippi State Item 44 $0')
ok(byId.kentucky.nil.preCap?.value == null, 'Kentucky Item 44 stays empty so 2024 overlay does not mint House $0')
ok(byId.georgia.coachesByYear['2026'].football.pay.value === 13_003_000, 'Smart 2026 FOIA $13.003M')
ok(!isUsaToday(byId.georgia.coachesByYear['2026'].football.pay), 'Smart 2026 is not USA TODAY 2025-10-08')
ok(byId.tennessee.coachesByYear['2026'].football.pay.value === 9_000_000, 'Heupel 2026 file $9M')
ok(byId['mississippi-state'].coachesByYear['2026'].football.pay.value === 4_365_000, 'Lebby 2026 $4.365M')
ok(byId.missouri.coachesByYear['2026'].football.pay.value === 10_250_000, 'Drinkwitz 2026 file $10.25M')
ok(!isUsaToday(byId.missouri.coachesByYear['2026'].football.pay), 'Drinkwitz 2026 is not USA TODAY 2025-10-08')
ok(byId['georgia-tech'].coachesByYear['2026'].football.pay.value === 6_500_000, 'Key 2026 AJC $6.5M')
ok(!isUsaToday(byId['georgia-tech'].coachesByYear['2026'].football.pay), 'Key 2026 is not USA TODAY 2025-10-08')
ok(byId.texas.coachesByYear['2026'].football.pay.value === 11_050_000, 'Sarkisian 2026 board $11.05M')
ok(byId['texas-am'].coachesByYear['2026'].football.pay.value === 10_750_000, 'Elko 2026 EA $10.75M')
ok(byId.nebraska.coachesByYear['2026'].football.pay.value === 8_500_000, 'Rhule 2026 file $8.5M')
ok(byId.purdue.coachesByYear['2026'].football.pay.value === 6_000_000, 'Odom 2026 MOU $6M')
ok(byId.louisville.coachesByYear['2026'].football.pay.value === 6_550_000, 'Brohm 2026 amendment $6.55M')
ok(byId.kansas.coachesByYear['2026'].football.pay.value === 6_300_000, 'Leipold 2026 amendment $6.3M')
ok(byId['texas-tech'].coachesByYear['2026'].football.pay.value === 6_500_000, 'McGuire 2026 PIA $6.5M')
ok(byId.ucf.coachesByYear['2026'].football.pay.value === 4_150_000, 'Frost 2026 summary $4.15M')
ok(byId.arizona.coachesByYear['2026'].football.pay.value === 4_700_000, 'Brennan 2026 ABOR $4.7M')
ok(byId['arizona-state'].coachesByYear['2026'].football.pay.value === 6_400_000, 'Dillingham 2026 ABOR $6.4M')
ok(byId.houston.coachesByYear['2026'].football.pay.value === 4_500_000, 'Fritz 2026 term sheet $4.5M')
ok(byId['south-carolina'].coachesByYear['2026'].football.pay.value === 8_250_000, 'Beamer 2026 is the term-sheet $8,250,000')
ok(!isUsaToday(byId['south-carolina'].coachesByYear['2026'].football.pay), 'Beamer 2026 is not USA TODAY 2025 $8.15M')
ok(byId['south-carolina'].coaches.football.pay.value === 8_150_000, 'Beamer current-deal line stays the USA TODAY 2025 snapshot')
ok(isUsaToday(byId['south-carolina'].coaches.football.pay), 'Beamer current-deal line is still USA TODAY')
ok(byId.virginia.coachesByYear['2026'].football.pay.value === 5_400_000, 'Elliott 2026 MOU $5.4M')
ok(!isUsaToday(byId.virginia.coachesByYear['2026'].football.pay), 'Elliott 2026 is not USA TODAY')
ok(byId.virginia.coaches.football.pay.value === 5_400_000, 'Elliott current is stamped from the 2026 MOU')
ok(byId.missouri.coaches.football.buyout.steps[0].remaining === 51_600_000, 'Drinkwitz start-of-2026 remaining is $51.6M')
ok(byId.missouri.coaches.football.buyout.steps.length === 6, 'Drinkwitz derived steps cover 2026–31 only')
ok(byId.missouri.coaches.football.buyout.value === 51_600_000, 'Drinkwitz USAT overhang replaced by file-derived $51.6M')
ok(layers.schools.auburn.buyoutsPaid.some((b) => b.coach === 'Hugh Freeze' && b.amount === 15_800_000 && b.through === '2029-01-31'), 'Freeze $15.8M lump through Jan 2029 kept')
const freezeYears = layers.schools.auburn.buyoutsPaid.filter((b) => b.coach === 'Hugh Freeze' && b.year >= 2026)
ok(freezeYears.length === 3 && freezeYears.every((b) => b.amount === 4_907_688 && b.year <= 2028), 'Freeze year-cash rows 2026–28 only')
ok(byId.oklahoma.coachesByYear['2026'].football.pay.value == null, 'Venables 2026 not booked from AAV')
ok(byId['nc-state'].coachesByYear['2026'].football.pay.value === 5_750_000, 'Doeren 2026 FOIA $5.75M')
ok(!isUsaToday(byId['nc-state'].coachesByYear['2026'].football.pay), 'Doeren 2026 is not USA TODAY')
ok(byId['nc-state'].coaches.football.pay.value === 6_215_377, 'Doeren current-deal line stays the USA TODAY 2025 snapshot')
ok(byId['west-virginia'].coachesByYear['2026'].football.pay.value === 3_600_000, 'Rodriguez 2026 MOU step $3.6M')
ok(!isUsaToday(byId['west-virginia'].coachesByYear['2026'].football.pay), 'Rodriguez 2026 is not USA TODAY')
ok(byId['west-virginia'].coaches.football.pay.value === 3_600_000, 'Rodriguez current-deal line stays the USA TODAY 2025 snapshot')
ok(layers.schools.lsu.buyoutsPaid.some((b) => b.coach === 'Ed Orgeron' && b.amount === 16_900_000 && b.through === '2025-12'), 'Orgeron lump through Dec 2025')
const kellyYears = layers.schools.lsu.buyoutsPaid.filter((b) => b.coach === 'Brian Kelly')
ok(kellyYears.length === 6 && kellyYears.every((b) => b.amount === 8_866_667), 'Kelly paid-buyout year rows 2026–31')
ok(layers.schools.arkansas.buyoutsPaid.filter((b) => b.coach === 'Sam Pittman').length === 2, 'Pittman year rows')
ok(layers.schools.florida.buyoutsPaid.filter((b) => b.coach === 'Billy Napier').length === 4, 'Napier year rows')
ok(layers.schools.kentucky.buyoutsPaid.filter((b) => b.coach === 'Mark Stoops').length === 5, 'Stoops year rows')
ok(layers.schools['penn-state'].buyoutsPaid.filter((b) => b.coach === 'James Franklin').length === 3, 'Franklin year rows')
ok(layers.schools['virginia-tech'].buyoutsPaid.filter((b) => b.coach === 'Brent Pry').length === 2, 'Pry year rows')
ok(layers.schools['oklahoma-state'].buyoutsPaid.filter((b) => b.coach === 'Mike Gundy').length === 3, 'Gundy year rows')
ok(byId.pittsburgh.capacity?.studentFees?.value == null, 'Pitt student fees stay empty')

const smuMedia = byId.smu.capacity.mediaConference
ok(smuMedia.value === 17_070_000, 'SMU media keeps the cited $17.07M FY2025 990')
ok(/not ACC TV|not a television/i.test(`${smuMedia.source || ''} ${smuMedia.notes || ''}`), 'SMU media is labeled not-TV / not equal share')
ok(/9 years|nine years/i.test(smuMedia.notes || ''), 'SMU media notes cite the ~9-year TV deferral')
ok(/early-membership/i.test(smuMedia.stackLabel || ''), 'SMU stack label is early-membership 990, not full ACC TV')

const rosters2026 = JSON.parse(readFileSync(new URL('../public/data/rosters-2026.json', import.meta.url), 'utf8'))
const rostersData = JSON.parse(readFileSync(new URL('../data/rosters.json', import.meta.url), 'utf8'))
const rostersPublic = JSON.parse(readFileSync(new URL('../public/data/rosters.json', import.meta.url), 'utf8'))
ok(JSON.stringify(rosters2026) === JSON.stringify(rostersPublic), 'public/data/rosters.json matches rosters-2026.json')
ok(JSON.stringify(rostersData) === JSON.stringify(rosters2026), 'data/rosters.json synced to public/data')
const smuPlayers = rosters2026.schools?.smu?.players || []
const jennings = smuPlayers.find((p) => p.name === 'Kevin Jennings')
ok(jennings?.depthRank === 1, 'Kevin Jennings is SMU QB depthRank 1')
ok(/^https:\/\/en\.wikipedia\.org\//i.test(jennings?.depthUrl || ''), 'Jennings starter cite is the 2026 Wikipedia team page')
const otherSmuQbRanked = smuPlayers.filter((p) => p.family === 'qb' && p.name !== 'Kevin Jennings' && p.depthRank)
ok(otherSmuQbRanked.length === 0, 'other SMU QBs stay unranked without a cite')

function citedQb1(sid, name, gameId) {
  const players = rosters2026.schools?.[sid]?.players || []
  const p = players.find((row) => row.name === name)
  ok(p, `${name} is on the ${sid} roster`)
  ok(p?.depthRank === 1, `${name} is ${sid} QB depthRank 1`)
  ok((p?.depthUrl || '').includes(`gameId/${gameId}`), `${name} cite is ESPN box ${gameId}`)
  const otherRanked = players.filter((row) => row.family === 'qb' && row.name !== name && row.depthRank === 1)
  ok(otherRanked.length === 0, `no other ${sid} QB is depthRank 1`)
  return p
}
const williams = citedQb1('washington', 'Demond Williams Jr.', '401858437')
ok(williams?.id === '5079653' && williams?.jersey === '1' && williams?.pos === 'QB', 'Demond Williams Jr. is ESPN 5079653 / #1 / QB')
citedQb1('wisconsin', 'Colton Joseph', '401858438')
citedQb1('louisville', 'Lincoln Kienholz', '401856661')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} desk-calc checks passed`)
if (failed.length) process.exit(1)
