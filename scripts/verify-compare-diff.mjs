/**
 * /compare difference column: A minus B, pending stays pending, $0 House is real.
 * Run: node scripts/verify-compare-diff.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  compareDelta,
  compareDiffTone,
  formatCompareDiff,
  formatUnitAmount,
  isCompareNumber,
  metricUnit,
  schoolCompareName,
} from '../src/lib/compareDiff.js'
import { enrichSchools } from '../src/lib/enrich.js'
import { houseValueForSeason } from '../src/lib/seasons.js'
import { money, winsPerM } from '../src/lib/format.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')
const data = JSON.parse(read('data/schools.json'))

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

ok(!isCompareNumber(null), 'null is not a compare number')
ok(!isCompareNumber(undefined), 'undefined is not a compare number')
ok(!isCompareNumber(''), 'empty string is not a compare number')
ok(!isCompareNumber(Number.NaN), 'NaN is not a compare number')
ok(isCompareNumber(0), '$0 / 0 is a real compare number')
ok(isCompareNumber(32_900_000), 'booked dollars are a compare number')

ok(compareDelta(null, 5_000_000) == null, 'pending vs number is pending — blank is not zero')
ok(compareDelta(5_000_000, null) == null, 'number vs pending is pending')
ok(compareDelta(null, null) == null, 'both pending is pending')
ok(compareDelta(undefined, 0) == null, 'missing vs $0 is pending, not a $0−$0')
ok(compareDelta(32_900_000, 18_000_000) === 14_900_000, 'two real numbers: A − B')
ok(compareDelta(18_000_000, 32_900_000) === -14_900_000, 'two real numbers: B higher is negative A − B')
ok(compareDelta(20_500_000, 20_500_000) === 0, 'identical House caps are a $0 difference')
ok(compareDelta(0, 0) === 0, 'two real zeros are $0, not pending')

ok(
  formatCompareDiff({ va: null, vb: 18_000_000, nameA: 'Alabama', nameB: 'Kentucky' }) === 'pending',
  'pending vs number labels pending',
)
ok(
  formatCompareDiff({ va: 32_900_000, vb: null, nameA: 'Louisville', nameB: 'Alabama' }) === 'pending',
  'number vs pending labels pending',
)
ok(
  formatCompareDiff({ va: 32_900_000, vb: 18_000_000, nameA: 'Louisville', nameB: 'Kentucky' }) ===
    `Louisville higher ${money(14_900_000)}`,
  'two real dollars name who is higher and by how much',
)
ok(
  formatCompareDiff({ va: 18_000_000, vb: 32_900_000, nameA: 'Louisville', nameB: 'Kentucky' }) ===
    `Kentucky higher ${money(14_900_000)}`,
  'B-higher dollars use B’s name, not a raw signed number',
)
ok(
  formatCompareDiff({ va: 20_500_000, vb: 20_500_000, nameA: 'Louisville', nameB: 'Kentucky' }) ===
    `same ${money(0)}`,
  'House $0 difference is a real same-$0 result',
)
ok(
  formatCompareDiff({ va: 20_500_000, vb: null, nameA: 'Louisville', nameB: 'Notre Dame' }) === 'pending',
  'House on one side only stays pending',
)

ok(metricUnit('winsPerNil') === 'wins', 'wins / $M NIL stays a rate')
ok(metricUnit('winsPerCap') === 'wins', 'wins / $M capacity stays a rate')
ok(metricUnit('nil') === 'money', 'booked NIL is dollars')
ok(metricUnit('capacity') === 'money', 'capacity is dollars')
ok(metricUnit('house') === 'money', 'House cap is dollars')
ok(metricUnit('winsPerNil', 'wins') === 'wins', 'explicit wins unit wins')
ok(formatUnitAmount(0.4, 'wins') === `${winsPerM(0.4)} W/$M`, 'rate amount keeps W/$M')
ok(formatUnitAmount(14_900_000, 'money') === money(14_900_000), 'dollar amount uses money()')
ok(
  formatCompareDiff({ va: 1.25, vb: 0.8, unit: 'wins', nameA: 'Ohio St.', nameB: 'Indiana' }) ===
    `Ohio St. higher ${winsPerM(0.45)} W/$M`,
  'wins difference stays W/$M, not dollars',
)
ok(
  formatCompareDiff({ va: 0.8, vb: 0.8, unit: 'wins', nameA: 'A', nameB: 'B' }) === `same ${winsPerM(0)} W/$M`,
  'equal rates are same 0.00 W/$M',
)
ok(compareDiffTone(null, 1) === 'pending', 'tone pending')
ok(compareDiffTone(1, 1) === 'same', 'tone same')
ok(compareDiffTone(2, 1) === 'higher-a', 'tone A')
ok(compareDiffTone(1, 2) === 'higher-b', 'tone B')

const y25 = enrichSchools({ data, season: 2025, includeAlumni: false })
const byId25 = Object.fromEntries(y25.map((s) => [s.id, s]))
const lou = byId25.louisville
const ken = byId25.kentucky
const ala = byId25.alabama
ok(lou && ken && ala, '2025 desk has Louisville, Kentucky, Alabama')
ok(schoolCompareName(lou) === 'Louisville', 'short name Louisville')
ok(lou._ratios.nil === 32_900_000, 'Louisville 2025 booked NIL is the cited $32.9M')
ok(ken._ratios.nil === 18_000_000, 'Kentucky 2025 booked NIL is the cited $18.0M')
ok(ala._ratios.nil == null, 'Alabama 2025 booked NIL stays pending — no invented dollar')

const twoReal = formatCompareDiff({
  va: lou._ratios.nil,
  vb: ken._ratios.nil,
  nameA: schoolCompareName(lou),
  nameB: schoolCompareName(ken),
})
ok(twoReal === `Louisville higher ${money(14_900_000)}`, `desk pair Louisville/Kentucky NIL → ${twoReal}`)
ok(compareDelta(lou._ratios.nil, ken._ratios.nil) === 14_900_000, 'desk pair A − B is $14.9M')

const pendingVsNumber = formatCompareDiff({
  va: ala._ratios.nil,
  vb: lou._ratios.nil,
  nameA: schoolCompareName(ala),
  nameB: schoolCompareName(lou),
})
ok(pendingVsNumber === 'pending', `Alabama pending vs Louisville $32.9M stays pending (got ${pendingVsNumber})`)
ok(compareDelta(ala._ratios.nil, lou._ratios.nil) == null, 'pending vs number delta is null, not −$32.9M')

const house25 = houseValueForSeason(data.meta, 2025)
const house26 = houseValueForSeason(data.meta, 2026)
const house24 = houseValueForSeason(data.meta, 2024)
ok(house25 === 20_500_000, '2025 House cap is the cited $20.5M')
ok(house26 === 21_300_000, '2026 House cap is the cited $21.3M')
ok(house24 == null, '2024 has no House cap')
ok(
  formatCompareDiff({ va: house25, vb: house25, nameA: 'Louisville', nameB: 'Kentucky' }) === `same ${money(0)}`,
  'participating schools: House A − House B is $0',
)
ok(
  formatCompareDiff({ va: house24, vb: house24, nameA: 'Louisville', nameB: 'Kentucky' }) === 'pending',
  'no House cap on the season: difference stays pending',
)
ok(
  formatCompareDiff({ va: house25, vb: house24, nameA: 'Louisville', nameB: 'Kentucky' }) === 'pending',
  'House vs no House cap stays pending',
)

const capA = lou._cap.booked
const capB = ken._cap.booked
ok(isCompareNumber(capA) && isCompareNumber(capB), 'both publics have booked capacity on 2025')
ok(compareDelta(capA, capB) != null, 'capacity difference is a real number')
ok(
  !formatCompareDiff({ va: capA, vb: capB, nameA: 'Louisville', nameB: 'Kentucky' }).includes('pending'),
  'two booked capacity cells are not pending',
)

const y26 = enrichSchools({ data, season: 2026, includeAlumni: false })
const lou26 = y26.find((s) => s.id === 'louisville')
ok(lou26._ratios.nil == null, '2026 overlay booked NIL stays pending — Year 1 is not rebooked')
ok(
  formatCompareDiff({
    va: lou26._ratios.nil,
    vb: y26.find((s) => s.id === 'kentucky')._ratios.nil,
    nameA: 'Louisville',
    nameB: 'Kentucky',
  }) === 'pending',
  '2026 booked NIL vs booked NIL stays pending when both overlays are empty',
)

const page = read('src/pages/Compare.jsx')
const share = read('src/lib/share.js')
const css = read('src/styles.css')
const pkg = read('package.json')
ok(page.includes('formatCompareDiff'), 'Compare.jsx uses the shared difference helper')
ok(page.includes('compare-diff'), 'Compare.jsx renders a difference cell')
ok(page.includes('compare-diff-lab'), 'Compare.jsx labels the Difference column')
ok(page.includes('School A minus school B'), 'column title states A minus B')
ok(/dd:[\s\S]*formatCompareDiff/.test(page), 'PNG rows get the same difference label')
ok(!page.includes('On3'), 'compare page does not pull On3')
ok(!/leftoverWaterfall|capacity − House|capacity - House/.test(page), 'compare page does not change leftover math')
ok(!/naming rights|jersey naming/i.test(page), 'compare page does not fold apparel / naming rights')
ok(share.includes('m.dd'), 'compare PNG paints the difference when the card lists both schools')
ok(share.includes('difference is A − B'), 'compare PNG names the A − B convention')
ok(css.includes('.compare-diff'), 'difference column has desk styles')
ok(pkg.includes('verify-compare-diff.mjs'), 'npm verify runs this script')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} compare-diff checks passed`)
if (failed.length) process.exit(1)
