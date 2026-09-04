/**
 * Homepage lead columns: Year 1 booked stays visible on 2026, not rebooked as 2026–27.
 * Run: node scripts/verify-home-lead.mjs
 */
import { readFileSync } from 'node:fs'
import { applySeason } from '../src/lib/seasons.js'
import { leadBookedNil, leadHouseRemaining, houseRemaining, nilBooked, ratios } from '../src/lib/compute.js'
import { enrichSchools } from '../src/lib/enrich.js'

const data = JSON.parse(readFileSync(new URL('../data/schools.json', import.meta.url), 'utf8'))

function ok(cond, msg) {
  if (!cond) throw new Error(msg)
}

const expectYear1 = {
  louisville: { booked: 32_900_000, leftover: 300_000 },
  kentucky: { booked: 18_000_000, leftover: 2_500_000 },
  texas: { booked: 13_500_000, leftover: 7_000_000 },
  ucla: { booked: 20_500_000, leftover: 0 },
  california: { booked: 20_500_000, leftover: 0 },
}

for (const [id, expect] of Object.entries(expectYear1)) {
  const raw = data.schools.find((s) => s.id === id)
  ok(raw.nil.booked.value === expect.booked, `${id} source booked unchanged`)
  ok(raw.nil.houseRemaining.value === expect.leftover, `${id} source leftover unchanged`)

  const y26 = applySeason(raw, 2026)
  ok(y26.nil.booked.value == null, `${id} 2026 overlay booked stays pending — no fake 2026–27 House spent`)
  ok(y26.nil.year1Lead?.booked?.value === expect.booked, `${id} 2026 year1Lead booked ${y26.nil.year1Lead?.booked?.value}`)
  ok(y26.nil.year1Lead?.label === '2025–26 filing / House Year 1', `${id} 2026 year1Lead label`)
  ok(leadBookedNil(y26).value === expect.booked, `${id} 2026 lead booked ${leadBookedNil(y26).value}`)
  ok(leadBookedNil(y26).carry === true, `${id} 2026 lead booked is a Year 1 carry`)
  ok(leadHouseRemaining(y26).value === expect.leftover, `${id} 2026 lead leftover ${leadHouseRemaining(y26).value}`)
  ok(nilBooked(y26) == null, `${id} 2026 nilBooked() stays pending so ratios / history do not rebook Year 1`)

  const y25 = applySeason(raw, 2025)
  ok(y25.nil.year1Lead == null, `${id} 2025 has no year1Lead`)
  ok(leadBookedNil(y25).value === expect.booked, `${id} 2025 lead booked is the overlay cell`)
  ok(leadBookedNil(y25).carry === false, `${id} 2025 lead booked is not a carry`)
  ok(leadHouseRemaining(y25).value === expect.leftover, `${id} 2025 leftover ${leadHouseRemaining(y25).value}`)
}

const psu26 = applySeason(data.schools.find((s) => s.id === 'penn-state'), 2026)
ok(leadBookedNil(psu26).value == null, 'penn-state 2026 lead booked stays pending — Item 44 is not House Year 1')
ok(leadHouseRemaining(psu26).value == null, 'penn-state 2026 leftover stays empty')
ok(psu26.nil.year1Lead == null, 'penn-state 2026 has no year1Lead')

const ala26 = applySeason(data.schools.find((s) => s.id === 'alabama'), 2026)
ok(leadBookedNil(ala26).value == null, 'alabama 2026 booked pending')
ok(leadHouseRemaining(ala26).value == null, 'alabama 2026 leftover empty — do not invent leftover from the cap')
ok(houseRemaining(ala26) == null, 'alabama overlay leftover empty')

const ky24 = applySeason(data.schools.find((s) => s.id === 'kentucky'), 2024)
ok(leadBookedNil(ky24).value == null, 'kentucky 2024 booked stays pending')
ok(leadHouseRemaining(ky24).value == null, 'kentucky 2024 leftover empty — Year 1 residual is not a 2024 cell')

const enriched26 = enrichSchools({ data, season: 2026, includeAlumni: false })
for (const [id, expect] of Object.entries(expectYear1)) {
  const row = enriched26.find((s) => s.id === id)
  ok(row._ratios.nil == null, `${id} 2026 ratios.nil stays pending — Year 1 is lead-column only`)
  ok(leadBookedNil(row).value === expect.booked, `${id} enriched 2026 lead booked`)
  const r = ratios(row, data.meta, row._season.houseKey, false)
  ok(r.nil == null, `${id} ratios() still uses overlay booked, not year1Lead`)
}

const texas26 = applySeason(data.schools.find((s) => s.id === 'texas'), 2026)
const texasRaw = data.schools.find((s) => s.id === 'texas')
ok(leadHouseRemaining(texas26).field.partialYear === true, 'texas leftover stays YTD')
ok(texas26.capacity.fiscalYearPrimary === texasRaw.capacity.fiscalYearPrimary, 'texas 2026 capacity keeps its source FY label')
ok(!String(texas26.capacity.fiscalYearPrimary || '').includes('2026'), 'texas 2026 capacity is not stamped as a 2026 filing')
ok((texas26.capacity.fiscalYearNote || '').includes('not invented 2026 dollars'), 'texas 2026 capacity note refuses a 2026 stamp')

const lou26cap = applySeason(data.schools.find((s) => s.id === 'louisville'), 2026)
ok(lou26cap.capacity.fiscalYearPrimary === 'FY2025', 'louisville 2026 capacity still labeled FY2025')

const homeSrc = readFileSync(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8')
const indexSrc = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
ok(indexSrc.includes('id="home-dek"'), 'homepage LCP dek is in first HTML')
ok(indexSrc.includes('id="home-lcp-lede"'), 'homepage lede is the named LCP element')
ok(indexSrc.indexOf('id="home-dek"') < indexSrc.indexOf('id="root"'), 'LCP dek paints outside the React root')
ok(indexSrc.includes('Two ceilings, then booked NIL.'), 'homepage hed is the two-ceilings sentence')
ok(indexSrc.includes('Not total athletic revenue, and not a Group of 6 predictor'), 'homepage lede is in first HTML')
ok(!indexSrc.includes('Who can actually write the check'), 'homepage dropped the scarcity hed')
ok(!homeSrc.includes('Who can actually write the check'), 'homepage dropped the scarcity hed')
ok(!homeSrc.includes('className="issue-hed"'), 'React Home does not remount the LCP hed')
ok(homeSrc.includes("label: 'Capacity'") && homeSrc.includes("label: 'House cap'"), 'lead columns start Capacity / House cap')
ok(homeSrc.includes("label: 'Booked NIL'") && homeSrc.includes("label: 'Leftover'"), 'lead columns include booked NIL and leftover')
ok(!homeSrc.includes("label: 'Conf. exit'"), 'conference exit is not a default rank column')
ok(!homeSrc.includes("label: 'FB W/$M NIL'"), 'wins-per-dollar is not a default rank column')
ok(!homeSrc.includes("label: 'FB pay'") && !homeSrc.includes("label: 'FB buyout'"), 'coach pay / buyout are not default rank columns')

console.log('homepage lead Year 1 carry ok')
