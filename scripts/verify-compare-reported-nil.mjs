/**
 * /compare Reported NIL row: survey vs modeled, no invented midpoint.
 * LSU $40–50M survey vs Alabama’s labeled SEC band; difference uses published tops.
 * Run: node scripts/verify-compare-reported-nil.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  formatCompareDiff,
  formatReportedNilDiff,
  reportedNilDiffTone,
  schoolCompareName,
} from '../src/lib/compareDiff.js'
import { computeCapacity, leftoverWaterfall } from '../src/lib/compute.js'
import { enrichSchools } from '../src/lib/enrich.js'
import { money } from '../src/lib/format.js'
import {
  compareReportedNilRank,
  publishedReportedNilHigh,
  reportedNilBar,
  reportedNilBarForCompare,
  reportedNilCompareDisplay,
  reportedNilVisibleLabel,
} from '../src/lib/rosterStack.js'
import { applySeason } from '../src/lib/seasons.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')
const data = JSON.parse(read('data/schools.json'))

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

const y26 = enrichSchools({ data, season: 2026, includeAlumni: false })
const y25 = enrichSchools({ data, season: 2025, includeAlumni: false })
const by26 = Object.fromEntries(y26.map((s) => [s.id, s]))
const by25 = Object.fromEntries(y25.map((s) => [s.id, s]))

const lsu = by26.lsu
const ala = by26.alabama
const texas = by26.texas
const indiana = by26.indiana
const ohio = by26['ohio-state']
const auburn = by26.auburn
ok(lsu && ala && texas && indiana && ohio && auburn, '2026 desk has LSU, Alabama, Texas, Indiana, Ohio State, Auburn')

ok(lsu._ratios.nil == null, 'LSU booked NIL stays pending — survey is not booked')
ok(ala._ratios.nil == null, 'Alabama booked NIL stays pending')
ok(
  formatCompareDiff({
    va: lsu._ratios.nil,
    vb: ala._ratios.nil,
    nameA: schoolCompareName(lsu),
    nameB: schoolCompareName(ala),
  }) === 'pending',
  'booked NIL row LSU vs Alabama stays pending',
)

const lsuBar = reportedNilBarForCompare(lsu, 2026)
const alaBar = reportedNilBarForCompare(ala, 2026)
const txBar = reportedNilBarForCompare(texas, 2026)
const indBar = reportedNilBarForCompare(indiana, 2026)
const osuBar = reportedNilBarForCompare(ohio, 2026)
const aubBar = reportedNilBarForCompare(auburn, 2026)

ok(lsuBar?.lane === 'survey', 'LSU reported NIL is survey')
ok(lsuBar?.kind === 'range', 'LSU reported NIL is a published range')
ok(lsuBar.low === 40_000_000 && lsuBar.high === 50_000_000, 'LSU bar is $40–50M')
ok(reportedNilVisibleLabel(lsuBar) === '$40–50M', 'LSU visible label is the survey range, not a midpoint')
ok(reportedNilCompareDisplay(lsuBar) === '$40–50M survey', 'LSU compare cell is $40–50M survey')
ok(!/45/.test(reportedNilCompareDisplay(lsuBar)), 'LSU cell does not invent $45M')

ok(alaBar?.lane === 'modeled', 'Alabama reported NIL is modeled')
ok(alaBar?.kind === 'range', 'Alabama reported NIL is a conference band')
ok(alaBar.low === 25_000_000 && alaBar.high === 33_000_000, 'Alabama bar is the SI SEC $25–33M band')
ok(/25/.test(reportedNilVisibleLabel(alaBar)) && /33/.test(reportedNilVisibleLabel(alaBar)), 'Alabama label is the SEC band')
ok(reportedNilCompareDisplay(alaBar).endsWith(' modeled'), 'Alabama compare cell is labeled modeled')
ok(/SEC|25/.test(alaBar.stack?.modeled?.label + alaBar.display + alaBar.rangeDisplay), 'Alabama stack keeps the SEC band label')

ok(publishedReportedNilHigh(lsuBar) === 50_000_000, 'LSU published high is $50M')
ok(publishedReportedNilHigh(alaBar) === 33_000_000, 'Alabama published high is $33M')
ok(publishedReportedNilHigh(txBar) == null, 'Texas above-$40M has no published numeric high')
ok(txBar?.kind === 'tier', 'Texas is a survey tier')
ok(reportedNilVisibleLabel(txBar) === 'above $40M', 'Texas visible label stays the survey words')
ok(reportedNilCompareDisplay(txBar) === 'above $40M survey', 'Texas compare cell stays above $40M survey')
ok(!/\$45/.test(reportedNilCompareDisplay(txBar)), 'Texas cell does not invent $45M')
ok(txBar.high === 50_000_000, 'Texas still ranks on the $50M allocation envelope')

const lsuAla = formatReportedNilDiff({
  barA: lsuBar,
  barB: alaBar,
  nameA: schoolCompareName(lsu),
  nameB: schoolCompareName(ala),
})
ok(
  lsuAla === `LSU higher on the published top ${money(17_000_000)}`,
  `LSU vs Alabama compares published tops $50M − $33M (got ${lsuAla})`,
)
ok(/published top/.test(lsuAla), 'LSU vs Alabama difference names the published top')
ok(!/midpoint/i.test(lsuAla), 'LSU vs Alabama difference does not say midpoint')
ok(!/\$45/.test(lsuAla), 'LSU vs Alabama difference does not invent $45M')
ok(
  lsuAla !== formatCompareDiff({
    va: lsuBar.mid,
    vb: alaBar.mid,
    nameA: 'LSU',
    nameB: 'Alabama',
  }),
  'difference is not the allocation-envelope midpoint gap',
)
ok(reportedNilDiffTone(lsuBar, alaBar) === 'higher-a', 'LSU vs Alabama tone is A higher')

const alaLsu = formatReportedNilDiff({
  barA: alaBar,
  barB: lsuBar,
  nameA: schoolCompareName(ala),
  nameB: schoolCompareName(lsu),
})
ok(
  alaLsu === `LSU higher on the published top ${money(17_000_000)}`,
  `Alabama vs LSU still names LSU higher on the published top (got ${alaLsu})`,
)
ok(reportedNilDiffTone(alaBar, lsuBar) === 'higher-b', 'Alabama vs LSU tone is B higher')

const sameSec = formatReportedNilDiff({
  barA: alaBar,
  barB: aubBar,
  nameA: schoolCompareName(ala),
  nameB: schoolCompareName(auburn),
})
ok(
  sameSec === `same ${money(0)} on the published top`,
  `two modeled SEC bands are the same published top (got ${sameSec})`,
)
ok(reportedNilDiffTone(alaBar, aubBar) === 'same', 'same SEC band tone is same')

const indAla = formatReportedNilDiff({
  barA: indBar,
  barB: alaBar,
  nameA: schoolCompareName(indiana),
  nameB: schoolCompareName(ala),
})
ok(
  indAla === `Indiana higher on the published top ${money(2_000_000)}`,
  `Indiana $35M high vs Alabama $33M high (got ${indAla})`,
)

const txAla = formatReportedNilDiff({
  barA: txBar,
  barB: alaBar,
  nameA: schoolCompareName(texas),
  nameB: schoolCompareName(ala),
})
ok(/gap is not a point estimate/.test(txAla), `Texas vs Alabama is not a point estimate (got ${txAla})`)
ok(/above \$40M/.test(txAla), 'Texas vs Alabama shows the survey words')
ok(/25/.test(txAla) && /33/.test(txAla), 'Texas vs Alabama still shows Alabama’s published band')
ok(txAla.includes('Texas higher'), 'Texas ranks above Alabama without a fake dollar')
ok(!/\$45/.test(txAla), 'Texas vs Alabama does not invent $45M')
ok(!/on the published top/.test(txAla), 'Texas vs Alabama does not treat the envelope high as a published top')
ok(
  !txAla.includes(money(17_000_000)) && !txAla.includes(money(txBar.high - alaBar.high)),
  'Texas vs Alabama does not print the envelope-high gap',
)
ok(compareReportedNilRank(txBar, alaBar) < 0, 'board rank already places above-$40M above the SEC band')
ok(reportedNilDiffTone(txBar, alaBar) === 'higher-a', 'Texas vs Alabama tone reuses rank direction')

const lsuTx = formatReportedNilDiff({
  barA: lsuBar,
  barB: txBar,
  nameA: schoolCompareName(lsu),
  nameB: schoolCompareName(texas),
})
ok(/gap is not a point estimate/.test(lsuTx), `LSU vs Texas is not a point estimate (got ${lsuTx})`)
ok(/\$40–50M/.test(lsuTx) && /above \$40M/.test(lsuTx), 'LSU vs Texas shows both published labels')
ok(lsuTx.includes('LSU higher'), 'range ranks ahead of the same-envelope tier')
ok(!/\$45/.test(lsuTx), 'LSU vs Texas does not invent $45M')
ok(compareReportedNilRank(lsuBar, txBar) < 0, 'board rank places LSU ahead of Texas')

const txOsu = formatReportedNilDiff({
  barA: txBar,
  barB: osuBar,
  nameA: schoolCompareName(texas),
  nameB: schoolCompareName(ohio),
})
ok(/gap is not a point estimate/.test(txOsu), `two above-$40M tiers are not a point estimate (got ${txOsu})`)
ok(!txOsu.includes('higher'), 'two same-tier schools are not a fake ranking by name')
ok(compareReportedNilRank(txBar, osuBar) === 0, 'same-tier rank keys match before the name tie-break')
ok(reportedNilDiffTone(txBar, osuBar) === 'same', 'same-tier tone is same')

ok(formatReportedNilDiff({ barA: null, barB: alaBar, nameA: 'LSU', nameB: 'Alabama' }) === 'pending', 'missing A bar is pending')
ok(formatReportedNilDiff({ barA: lsuBar, barB: null, nameA: 'LSU', nameB: 'Alabama' }) === 'pending', 'missing B bar is pending')
ok(reportedNilDiffTone(null, alaBar) === 'pending', 'missing bar tone is pending')

ok(reportedNilBarForCompare(lsu, 2025) == null, '2025 LSU reported NIL is hidden')
ok(reportedNilBarForCompare(ala, 2025) == null, '2025 Alabama reported NIL is hidden — no leftover conference band')
ok(reportedNilCompareDisplay(reportedNilBarForCompare(by25.lsu, 2025)) === 'pending', '2025 compare cell is pending')
ok(
  formatReportedNilDiff({
    barA: reportedNilBarForCompare(by25.lsu, 2025),
    barB: reportedNilBarForCompare(by25.alabama, 2025),
    nameA: 'LSU',
    nameB: 'Alabama',
  }) === 'pending',
  '2025 LSU vs Alabama reported NIL difference stays pending',
)
ok(reportedNilBar(applySeason(data.schools.find((s) => s.id === 'alabama'), 2025)), 'raw 2025 overlay would still model a conference band — compare must season-gate')

const lsuFall = leftoverWaterfall(lsu, computeCapacity(lsu), false)
const txFall = leftoverWaterfall(texas, computeCapacity(texas), false)
ok(lsuFall.spent == null && lsuFall.leftover == null, 'LSU leftover stays empty — survey is not House spent')
ok(txFall.leftover === 7_000_000, 'Texas leftover stays $7M — survey is not booked')
ok(!lsuFall.steps.some((s) => s.key === 'reportedNil' || s.hash === 'nil-reported'), 'waterfall has no reported-NIL step')

const page = read('src/pages/Compare.jsx')
const share = read('src/lib/share.js')
const pkg = read('package.json')
ok(page.includes("key: 'reportedNil'"), 'Compare.jsx adds a Reported NIL metric')
ok(page.includes("label: 'Reported NIL'"), 'Compare.jsx labels the row Reported NIL')
ok(page.includes('formatReportedNilDiff'), 'Compare.jsx uses the reported-NIL difference helper')
ok(page.includes('reportedNilCompareDisplay'), 'Compare.jsx shows survey vs modeled labels')
ok(page.includes("label: 'NIL booked'"), 'Compare.jsx keeps the booked NIL row')
ok(page.includes("label: 'NIL modeled (mid)'"), 'Compare.jsx keeps the modeled NIL row')
ok(!/On3/.test(page), 'compare page does not pull On3')
ok(!/leftoverWaterfall|capacity − House|capacity - House/.test(page), 'compare page does not change leftover math')
ok(page.includes('dd:') && page.includes('formatReportedNilDiff'), 'PNG rows include the reported-NIL difference')
ok(share.includes("'reportedNil'"), 'compare view set includes reportedNil')
ok(share.includes("reportedNil: 'nil-reported'"), 'reported NIL drill deep-links to the school bar')
ok(pkg.includes('verify-compare-reported-nil.mjs'), 'npm verify runs this script')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} compare-reported-nil checks passed`)
if (failed.length) process.exit(1)
