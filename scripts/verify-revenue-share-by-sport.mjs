/**
 * By-sport revenue share is a display-only lane.
 * Eight sourced schools. No estimates, no anonymous figures, no zeros.
 * Run: node scripts/verify-revenue-share-by-sport.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFS } from '../src/lib/definitions.js'
import {
  formatShareLine,
  statementsFor,
} from '../src/lib/revenueShareBySport.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')

const book = JSON.parse(read('data/revenue-share-by-sport.json'))
const pub = JSON.parse(read('public/data/revenue-share-by-sport.json'))
const schools = JSON.parse(read('data/schools.json'))
const schoolPage = read('src/pages/School.jsx')
const methods = read('src/pages/Methods.jsx')
const home = read('src/pages/Home.jsx')
const compare = read('src/pages/Compare.jsx')
const compute = read('src/lib/compute.js')
const enrich = read('src/lib/enrich.js')

const EXPECTED = [
  'north-carolina',
  'nc-state',
  'texas-tech',
  'tennessee',
  'lsu',
  'penn-state',
  'boston-college',
  'texas',
]

const EXCLUDED = [
  'alabama',
  'clemson',
  'virginia-tech',
  'kansas',
  'notre-dame',
  'purdue',
  'ohio-state',
  'louisville',
]

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

ok(JSON.stringify(book) === JSON.stringify(pub), 'data file synced to public/data')
ok(book.meta?.displayOnly === true, 'lane is marked display only')
ok(JSON.stringify(Object.keys(book.schools).sort()) === JSON.stringify([...EXPECTED].sort()), 'exactly the eight schools')

const deskIds = new Set(schools.schools.map((s) => s.id))
for (const id of EXPECTED) ok(deskIds.has(id), `${id} is a real school slug`)
for (const id of EXCLUDED) ok(!book.schools[id], `${id} is not booked`)

ok(!JSON.stringify(schools).includes('revenueShareBySport'), 'schools.json was not given this lane')
ok(!JSON.stringify(schools).includes('revenue-share-by-sport'), 'schools.json does not name this file')

ok(schoolPage.includes('RevenueShareBySport'), 'school page mounts the block')
ok(!/On3/i.test(schoolPage), 'school page source still has no On3')
ok(!home.includes('revenueShareBySport') && !home.includes('revenue-share-by-sport'), 'home rank does not read the lane')
ok(!compare.includes('revenueShareBySport') && !compare.includes('revenue-share-by-sport'), 'compare does not read the lane')
ok(!compute.includes('revenueShare') && !enrich.includes('revenueShare'), 'capacity math does not read the lane')
ok(/not House spent/i.test(DEFS.revenueShareBySport?.text || ''), 'definition says this is not House spent')
ok(methods.includes('Revenue share by sport'), 'methods names the lane')
ok(methods.includes('not the 2025-26 House cap year') || methods.includes('Not the 2025–26 House cap year') || methods.includes('not the 2025–26 House cap year'), 'methods carries the Penn State year caveat')

const unc = statementsFor(book, 'north-carolina')
ok(unc?.length === 1, 'UNC has one statement')
ok(unc?.[0].rows.map((r) => formatShareLine(r)).join('|') === 'about $13.0M|about $7.0M|$250,000|$250,000', 'UNC dollars')
ok(unc?.[0].caveats.some((c) => c.includes('65%')), 'UNC carries the rough 65/35 caveat')
ok(unc?.[0].sources.some((s) => s.url.includes('si.com')), 'UNC SI link')
ok(unc?.[0].sources.some((s) => s.url.includes('theassemblync.com')), 'UNC Assembly link')

const ncsu = statementsFor(book, 'nc-state')
ok(ncsu?.length === 2, 'NC State has two separately labeled statements')
ok(ncsu?.[0].status === 'Stated plan (AD, on record)', 'NC State direct status')
ok(ncsu?.[1].status === 'Records release', 'NC State records status')
ok(formatShareLine(ncsu?.[0].rows[0]) === '$13,000,000', 'NC State direct football')
ok(ncsu?.[0].rows.some((r) => r.sport === "Men's basketball" && r.amount === 4000000), 'NC State direct MBB')
ok(ncsu?.[0].rows.some((r) => r.amount === 1000000), 'NC State direct WBB')
ok(ncsu?.[0].rows.some((r) => r.amount === 18000000), 'NC State direct total')
ok(ncsu?.[0].rows.some((r) => r.amount === 2500000), 'NC State scholarships')
ok(ncsu?.[1].rows.map((r) => r.amount).join(',') === '13500000,4000000,1000000,792000', 'NC State records lines')
ok(ncsu?.[1].caveats.join(' ').includes('Not revenue share alone'), 'records caveat')
ok(ncsu?.[1].caveats.join(' ').toLowerCase().includes('alston'), 'records names Alston')
ok(ncsu?.[1].caveats.join(' ').toLowerCase().includes('scholarship'), 'records names scholarships')

const tt = statementsFor(book, 'texas-tech')
ok(tt?.[0].yearNote === 'Announced plan', 'Texas Tech labeled as the announced plan')
ok(formatShareLine(tt?.[0].rows[0]) === '~74% · about $15.1M', 'Texas Tech football')
ok(formatShareLine(tt?.[0].rows[1]) === '17–18% · about $3.6M', 'Texas Tech MBB')
ok(formatShareLine(tt?.[0].rows[2]) === '2%', 'Texas Tech WBB percent only')
ok(formatShareLine(tt?.[0].rows[3]) === '1.9% · about $390k', 'Texas Tech baseball')
ok(tt?.[0].caveats.join(' ').includes('did not load'), 'Texas Tech unloaded 2026-27 caveat')

const ut = statementsFor(book, 'tennessee')
ok(ut?.[0].rows.filter((r) => !r.nested).map((r) => formatShareLine(r)).join('|') === '75%|15%|5%|5% · $900,000', 'Tennessee percents')
ok(ut?.[0].rows.some((r) => r.nested && r.amount === 750000), 'Tennessee baseball is inside the other bucket')
ok(!ut?.[0].rows.some((r) => r.sport === 'Football' && r.amount != null), 'Tennessee football has no invented dollar')

const lsu = statementsFor(book, 'lsu')
ok(lsu?.[0].fiscalYear === '2026-27', 'LSU year')
ok(lsu?.[0].rows.map((r) => formatShareLine(r)).join('|') === '75%|15%|~5%', 'LSU shares')
ok(lsu?.[0].rows[2].note.toLowerCase().includes("women's basketball"), 'LSU baseball note')
ok(lsu?.[0].caveats.join(' ').includes('2025-26'), 'LSU prior-year caveat')

const psu = statementsFor(book, 'penn-state')
ok(psu?.[0].status === 'Filed NCAA report', 'Penn State status')
ok(psu?.[0].fiscalYear === 'FY2025', 'Penn State fiscal year')
ok(psu?.[0].yearNote.includes('Jul 2024'), 'Penn State window')
const psuSportSum = psu[0].rows.filter((r) => !r.total).reduce((sum, r) => sum + r.amount, 0)
ok(psuSportSum === 18368391, `Penn State sport lines sum to the filed total (${psuSportSum})`)
ok(psu?.[0].rows.some((r) => r.total && r.amount === 18368391), 'Penn State total row')
ok(psu?.[0].caveats.join(' ').includes('before House payments began'), 'Penn State pre-House caveat')
ok(psu?.[0].caveats.join(' ').includes('Not the 2025-26 House cap year'), 'Penn State cap-year caveat')

const bc = statementsFor(book, 'boston-college')
ok(bc?.[0].rows.map((r) => formatShareLine(r)).join('|') === '75%|15%|5%|5%', 'Boston College 75/15/5/5')
ok(!bc?.[0].rows.some((r) => r.amount != null), 'Boston College has no invented dollars')

const texas = statementsFor(book, 'texas')
ok(texas?.[0].rows.map((r) => formatShareLine(r)).join('|') === '75%|15%|5%|5%', 'Texas 75/15/5/5')
ok(texas?.[0].caveats.join(' ').includes('On3 paraphrase, not a direct quote'), 'Texas labeled as an On3 paraphrase')
ok(texas?.[0].yearNote.includes('before final approval'), 'Texas before-approval label')
ok(texas?.[0].sources[0].name === 'On3', 'Texas source name is On3')
ok(!texas?.[0].rows.some((r) => r.amount != null), 'Texas has no invented dollars')

ok(statementsFor(book, 'alabama') == null, 'Alabama has no block')
ok(statementsFor(null, 'texas') == null, 'missing book hides the block')
ok(statementsFor({ schools: { texas: [{ fiscalYear: '2025-26', status: 'x', rows: [{ sport: 'Football' }] }] } }, 'texas') == null, 'a row with no figure is dropped')

for (const id of EXPECTED) {
  for (const statement of book.schools[id]) {
    ok(statement.sources?.every((s) => /^https:\/\//.test(s.url) && s.name), `${statement.id} sources have a name and https link`)
    ok(!JSON.stringify(statement).includes('"$0"') && !statement.rows.some((r) => r.amount === 0), `${statement.id} has no zero`)
  }
}

const failed = checks.filter((c) => !c.ok)
if (failed.length) {
  console.error(`${failed.length} failed / ${checks.length}`)
  process.exit(1)
}
console.log(`ok revenue share by sport (${checks.length})`)
