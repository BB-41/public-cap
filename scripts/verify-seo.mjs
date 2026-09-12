/**
 * SERP titles, meta descriptions, and school hed/lede stay booked-only.
 * Templates carry query language. No invented House / NIL dollars. No On3.
 *
 * Run: node scripts/verify-seo.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_TITLE,
  OG_REPORTED_NIL_PATH,
  PAGE_DESCRIPTIONS,
  PAGE_TITLES,
  SCHOOL_TITLE_FRAME,
  coachFaTitle,
  compareTitle,
  descriptionFromPath,
  displayNameFromSlug,
  ogImageFromPath,
  schoolDescription,
  schoolTitle,
  titleFromPath,
} from '../src/lib/share.js'
import { applyRouteMeta, loadSchoolShells, routeShell } from './write-spa-html.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

const share = read('src/lib/share.js')
const app = read('src/App.jsx')
const schoolPage = read('src/pages/School.jsx')
const indexHtml = read('index.html')
const home = read('src/pages/Home.jsx')
const schools = JSON.parse(read('public/data/schools.json'))

ok(DEFAULT_TITLE === 'Public Cap — Capacity vs House cap vs booked NIL', 'home title names the three lanes')
ok(PAGE_TITLES.home === DEFAULT_TITLE, 'PAGE_TITLES.home matches DEFAULT_TITLE')
ok(PAGE_TITLES.coachFa === 'Coach buyout offsets / free agents — Public Cap', 'coach-fa index title is discoverable')
ok(PAGE_TITLES.guaranteeGames === 'Guarantee games — Public Cap', 'guarantee-games index title is discoverable')
ok(SCHOOL_TITLE_FRAME === 'Capacity vs House cap vs booked NIL', 'school title frame is the three-lane sentence')

ok(
  schoolTitle('Louisville') === 'Louisville — Capacity vs House cap vs booked NIL — reported football NIL — Public Cap',
  'Louisville title keeps the #36 frame and names reported football NIL',
)
ok(schoolTitle('Oklahoma State').includes('Capacity vs House cap vs booked NIL'), 'Oklahoma State title keeps the #36 frame')
ok(schoolTitle('Oklahoma State').includes('reported football NIL'), 'Oklahoma State title names reported football NIL')
ok(schoolTitle('Notre Dame') === 'Notre Dame — Capacity vs House cap vs booked NIL — reported football NIL — Public Cap', 'Notre Dame title')
ok(schoolTitle('Indiana') === 'Indiana — Capacity vs House cap vs booked NIL — reported football NIL — Public Cap', 'Indiana title')
ok(schoolTitle('Cincinnati') === 'Cincinnati — Capacity vs House cap vs booked NIL — reported football NIL — Public Cap', 'Cincinnati title')
ok(schoolTitle('Louisville', 2024).includes('· 2024'), 'non-current season still tags the year')
ok(!schoolTitle('Louisville').includes('$'), 'school title invents no dollars')

ok(titleFromPath('/') === DEFAULT_TITLE, 'titleFromPath home')
ok(titleFromPath('/school/louisville') === schoolTitle('Louisville'), 'slug title matches named title')
ok(titleFromPath('/school/oklahoma-state') === schoolTitle('Oklahoma State'), 'oklahoma-state slug title-cases')
ok(titleFromPath('/school/notre-dame') === schoolTitle('Notre Dame'), 'notre-dame slug title-cases')
ok(titleFromPath('/coach-fa') === PAGE_TITLES.coachFa, 'titleFromPath coach-fa index')
ok(titleFromPath('/guarantee-games') === PAGE_TITLES.guaranteeGames, 'titleFromPath guarantee-games')
ok(titleFromPath('/reported-nil') === PAGE_TITLES.reportedNil, 'titleFromPath reported-nil')
ok(
  PAGE_TITLES.reportedNil === 'Reported NIL by school — Power 4 football roster stack — Public Cap',
  'reported-nil title names the board',
)
ok(PAGE_DESCRIPTIONS.reportedNil.includes('$0–$50M scale'), 'reported-nil description names the published scale')
ok(PAGE_DESCRIPTIONS.reportedNil.includes('68 Power 4'), 'reported-nil description names the 68-school set')
ok(PAGE_DESCRIPTIONS.reportedNil.includes('Power 4 football roster stack'), 'reported-nil description names the roster stack query')
ok(PAGE_DESCRIPTIONS.reportedNil.includes('survey ranges versus labeled modeled conference bands'), 'reported-nil description splits survey vs modeled')
ok(PAGE_DESCRIPTIONS.reportedNil.includes('Not leftover'), 'reported-nil description keeps leftover out')
ok(PAGE_DESCRIPTIONS.reportedNil.includes('Booked NIL and House spent stay separate'), 'reported-nil description keeps booked cells separate')
ok(descriptionFromPath('/reported-nil') === PAGE_DESCRIPTIONS.reportedNil, 'descriptionFromPath reported-nil')
ok(ogImageFromPath('/reported-nil').endsWith(OG_REPORTED_NIL_PATH), 'reported-nil og image is the board card')
ok(ogImageFromPath('/').endsWith('/og-default.png'), 'home og image is the default card')
ok(coachFaTitle('Mark Stoops') === 'Mark Stoops — Coach buyout offsets — Public Cap', 'coach detail title')
ok(
  compareTitle('Louisville', 'Kentucky') === 'Louisville vs Kentucky — Capacity vs House vs NIL — Public Cap',
  'compare title keeps the three lanes',
)

const louDesc = schoolDescription('Louisville')
const nd = schools.schools.find((s) => s.id === 'notre-dame')
const ndDesc = schoolDescription(nd)
ok(/capacity/i.test(louDesc) && /House/i.test(louDesc) && /booked NIL/i.test(louDesc), 'Louisville description names the three lanes')
ok(/reported football NIL/i.test(louDesc), 'Louisville description names reported football NIL')
ok(/not a midpoint/i.test(louDesc), 'Louisville description refuses a fake midpoint')
ok(/Collective 990 payout/i.test(louDesc), 'Louisville description names collective payout')
ok(/Pending stays empty/i.test(louDesc), 'Louisville description keeps pending empty')
ok(!/\$/.test(louDesc), 'Louisville description invents no dollars')
ok(/football revenue/i.test(ndDesc), 'Notre Dame description answers football-revenue queries')
ok(/not a full athletic-revenue total/i.test(ndDesc), 'Notre Dame description refuses a full revenue number')
ok(/EADA/i.test(ndDesc) && /conference media/i.test(ndDesc), 'Notre Dame description names the two private lanes')
ok(/not unpacked|not summed/i.test(ndDesc), 'Notre Dame description refuses an EADA unpack / fake sum')
ok(/reported football NIL/i.test(ndDesc), 'Notre Dame description names reported football NIL as its own lane')
ok(!/\$/.test(ndDesc), 'Notre Dame description invents no dollars')
ok(descriptionFromPath('/school/indiana').includes('Indiana'), 'Indiana path description uses the name')
ok(descriptionFromPath('/').includes('Collective 990 payout'), 'home description names collective payout')
ok(PAGE_DESCRIPTIONS.coachFa.includes('do not invent remaining principal'), 'coach-fa description stays cite-only')
ok(PAGE_DESCRIPTIONS.guaranteeGames.includes('Football guarantee stays distinct from band fees'), 'guarantee-games description splits band')
ok(PAGE_DESCRIPTIONS.guaranteeGames.includes('Not House spent'), 'guarantee-games description splits House')
ok(PAGE_DESCRIPTIONS.guaranteeGames.includes('not booked NIL'), 'guarantee-games description splits booked NIL')
ok(descriptionFromPath('/guarantee-games') === PAGE_DESCRIPTIONS.guaranteeGames, 'descriptionFromPath guarantee-games')

const templateBlob = [
  DEFAULT_TITLE,
  SCHOOL_TITLE_FRAME,
  ...Object.values(PAGE_TITLES),
  ...Object.values(PAGE_DESCRIPTIONS),
  schoolTitle('Louisville'),
  schoolDescription('Louisville'),
  schoolDescription(nd),
  coachFaTitle('Jimbo Fisher'),
].join('\n')
ok(!/On3/i.test(templateBlob), 'title/description templates never name On3')
ok(
  !/\$\d/.test(templateBlob.replaceAll('$0–$50M', '')),
  'title/description templates have no invented dollar figures',
)

const reportedShell = applyRouteMeta(indexHtml, routeShell('/reported-nil'))
ok(reportedShell.includes('<title>Reported NIL by school — Power 4 football roster stack — Public Cap</title>'), 'reported-nil shell title is static')
ok(reportedShell.includes('content="https://thepubliccap.com/reported-nil"'), 'reported-nil shell canonical/og:url')
ok(reportedShell.includes('https://thepubliccap.com/og-reported-nil.png'), 'reported-nil shell og:image')
ok(reportedShell.includes('summary_large_image'), 'reported-nil shell twitter large image')
ok(reportedShell.includes('data-route="inner"'), 'reported-nil shell is an inner route')
ok(!reportedShell.includes('<title>Public Cap — Capacity vs House cap vs booked NIL</title>'), 'reported-nil shell dropped the homepage title')

ok(app.includes('descriptionFromPath'), 'App applies per-route descriptions')
ok(app.includes("jsonLd: 'school'"), 'App attaches school JSON-LD')
ok(app.includes('titleFromPath'), 'App uses the shared title helper')
ok(!app.includes('DEFAULT_TITLE'), 'App no longer falls back to the homepage title on school routes')

ok(schoolPage.includes('className="lede school-dek"'), 'school page has a first-screen lede')
ok(schoolPage.includes('Compare reported NIL by school'), 'school dek uses human board-link copy')
ok(!home.includes('to="/reported-nil">/reported-nil<'), 'homepage does not use a bare path as board-link text')
ok(home.includes('reported NIL by school'), 'homepage uses human board-link copy')
ok(schoolPage.includes('Collective 990 payout'), 'school page names collective payout')
ok(schoolPage.includes('Student fees on this desk are not tuition'), 'school lede separates fees from tuition')
ok(schoolPage.includes('the public stand-in for an NIL budget'), 'school page answers NIL-budget queries')
ok(schoolPage.includes('No public collective Form 990 on the desk'), 'empty collective lane stays pending')
ok(schoolPage.includes('leadBookedNil'), 'lane status uses lead booked NIL, not invented overlay dollars')
ok(!schoolPage.includes('NIL booked band'), 'old NIL booked band hed is gone')
ok(!/On3/i.test(schoolPage), 'school page has no On3')

ok(indexHtml.includes(DEFAULT_TITLE), 'index.html first title matches the home template')
ok(indexHtml.includes('Capacity vs House cap vs booked NIL — reported football NIL — Public Cap'), 'index.html first-paints school titles')
ok(indexHtml.includes('Coach buyout offsets / free agents — Public Cap'), 'index.html first-paints /coach-fa')
ok(indexHtml.includes('Guarantee games — Public Cap'), 'index.html first-paints /guarantee-games')
ok(indexHtml.includes('href="/guarantee-games"'), 'index.html nav links the guarantee board')
ok(indexHtml.includes('Reported NIL by school — Power 4 football roster stack — Public Cap'), 'index.html first-paints /reported-nil')
ok(indexHtml.includes('href="/reported-nil"'), 'index.html nav links the reported-NIL board')
ok(indexHtml.includes('twitter:card'), 'index.html has a Twitter card')
ok(indexHtml.includes('summary_large_image'), 'index.html uses a large Twitter card')
ok(indexHtml.includes('og-reported-nil.png'), 'index.html points reported-nil unfurls at the board card')
ok(indexHtml.includes('og:site_name'), 'index.html has og:site_name')
ok(indexHtml.includes('og:image'), 'index.html has og:image')
ok(indexHtml.includes('Collective 990 payout is a separate cited lane, not House.'), 'homepage LCP lede names collective payout')
ok(indexHtml.includes('Not total athletic revenue, and not a Group of 6 predictor'), 'homepage LCP lede kept')
ok(!/On3/i.test(indexHtml), 'index.html has no On3')
ok(!home.includes('className="issue-hed"'), 'React Home still does not remount the LCP hed')

ok(schools.schools.length === 68, 'desk still has 68 schools')
ok(!JSON.stringify(schools).includes('On3'), 'schools.json was not edited to name On3')
for (const s of schools.schools) {
  const title = schoolTitle(s.name)
  ok(title.startsWith(`${s.name} — `), `${s.id} title starts with the school name`)
  ok(title.includes(SCHOOL_TITLE_FRAME), `${s.id} title uses the shared frame`)
  ok(title.includes('reported football NIL'), `${s.id} title names reported football NIL`)
  ok(!title.includes('$'), `${s.id} title invents no dollars`)
}

const lsu = schools.schools.find((s) => s.id === 'lsu')
const lsuShell = applyRouteMeta(indexHtml, routeShell(`/school/${lsu.id}`, {
  title: schoolTitle(lsu.name),
  description: schoolDescription(lsu),
  schoolName: lsu.name,
  school: lsu,
  hed: lsu.name,
}))
ok(lsuShell.includes('<title>LSU — Capacity vs House cap vs booked NIL — reported football NIL — Public Cap</title>'), 'LSU shell uses the booked name, not Lsu')
ok(lsuShell.includes('content="https://thepubliccap.com/school/lsu"'), 'LSU shell canonical/og:url')
ok(!lsuShell.includes('<title>Public Cap — Capacity vs House cap vs booked NIL</title>'), 'LSU shell dropped the homepage title')
ok(loadSchoolShells().length === 68, 'writer emits 68 school shells')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length) process.exit(1)
