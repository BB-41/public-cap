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
  SCHOOL_TITLE_LIMIT,
  coachFaTitle,
  compareTitle,
  descriptionFromPath,
  displayNameFromSlug,
  ogImageFromPath,
  schoolDescription,
  schoolSerpTitle,
  schoolTitle,
  titleFromPath,
} from '../src/lib/share.js'
import { moneyExact } from '../src/lib/format.js'
import { datedSpentSteps, hasVal } from '../src/lib/compute.js'
import {
  bookedHouseSpend,
  schoolFaqFromHtml,
  schoolFaqIntro,
  schoolFaqItems,
} from '../src/lib/schoolSeo.js'
import {
  NIL101_FAQ_SKIP,
  NIL101_HOME_LINK_TEXT,
  NIL101_SCHOOL_LINK_TEXT,
  articleAnswersFromHtml,
  capPhrase,
  nil101Model,
  sectionAnswer,
} from '../src/lib/nil101Guide.js'
import {
  HOT_SEAT_DESCRIPTION,
  HOT_SEAT_IDS,
  HOT_SEAT_TITLE,
  buyoutCite,
  buyoutDescription,
  buyoutLead,
  buyoutStaleness,
  buyoutTitle,
  priorContractFootnote,
  relatedBuyoutSchools,
  renderHotSeatStaticBody,
  usatBuyoutSourceText,
} from '../src/lib/buyout.js'
import { applyRouteMeta, loadBuyoutShells, loadHotSeatShell, loadSchoolSeoExtras, loadSchoolShells, routeShell } from './write-spa-html.mjs'

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
ok(PAGE_TITLES.checkbookBowl === 'Does the bigger spender win? — Public Cap', 'checkbook-bowl index title is discoverable')
ok(SCHOOL_TITLE_FRAME === 'Capacity vs House cap vs booked NIL', 'legacy school frame constant stays available for share cards')
ok(SCHOOL_TITLE_LIMIT === 65, 'school SERP titles aim at 65 characters')

ok(
  schoolTitle('Louisville') === 'Louisville NIL, Collective & Football Revenue | The Public Cap',
  'Louisville title matches collective and football-revenue queries',
)
ok(schoolTitle('Oklahoma State') === 'Oklahoma State NIL Budget & Collective Payout | The Public Cap', 'Oklahoma State title names NIL budget and collective payout')
ok(schoolTitle('Notre Dame') === 'Notre Dame NIL, Collective & Football Revenue | The Public Cap', 'Notre Dame title names collective and football revenue')
ok(schoolTitle('Indiana') === 'Indiana NIL Budget, Collective Payout & Revenue | The Public Cap', 'Indiana title names NIL budget and collective payout')
ok(schoolTitle('Cincinnati') === 'Cincinnati NIL, Collective & Football Revenue | The Public Cap', 'Cincinnati title')
ok(schoolSerpTitle('Iowa') === 'Iowa NIL Budget, Collective Payout & Revenue | The Public Cap', 'short names keep NIL budget, collective payout, and revenue')
ok(schoolTitle('Louisville', 2024).includes('· 2024'), 'non-current season still tags the year')
ok(!schoolTitle('Louisville').includes('$'), 'school title invents no dollars')
ok(schoolTitle('Louisville').length <= SCHOOL_TITLE_LIMIT, 'Louisville title stays within the SERP limit')
ok(schoolTitle('Mississippi State').length <= SCHOOL_TITLE_LIMIT, 'longest school name stays within the SERP limit')

ok(titleFromPath('/') === DEFAULT_TITLE, 'titleFromPath home')
ok(titleFromPath('/school/louisville') === schoolTitle('Louisville'), 'slug title matches named title')
ok(titleFromPath('/school/oklahoma-state') === schoolTitle('Oklahoma State'), 'oklahoma-state slug title-cases')
ok(titleFromPath('/school/notre-dame') === schoolTitle('Notre Dame'), 'notre-dame slug title-cases')
ok(titleFromPath('/coach-fa') === PAGE_TITLES.coachFa, 'titleFromPath coach-fa index')
ok(titleFromPath('/guarantee-games') === PAGE_TITLES.guaranteeGames, 'titleFromPath guarantee-games')
ok(titleFromPath('/checkbook-bowl') === PAGE_TITLES.checkbookBowl, 'titleFromPath checkbook-bowl')
ok(PAGE_TITLES.nil101 === 'NIL 101: College Athlete Pay Explained in Plain English | The Public Cap', 'nil-101 title is the plain-English guide')
ok(titleFromPath('/nil-101') === PAGE_TITLES.nil101, 'titleFromPath nil-101')
ok(descriptionFromPath('/nil-101') === PAGE_DESCRIPTIONS.nil101, 'descriptionFromPath nil-101')
ok(PAGE_TITLES.about === 'About — Public Cap', 'about title is discoverable')
ok(titleFromPath('/about') === PAGE_TITLES.about, 'titleFromPath about')
ok(descriptionFromPath('/about') === PAGE_DESCRIPTIONS.about, 'descriptionFromPath about')
ok(PAGE_DESCRIPTIONS.about.includes('What can your team actually afford?'), 'about description keeps the slogan')
ok(PAGE_DESCRIPTIONS.about.includes('68 schools'), 'about description names the 68-school desk')
ok(!PAGE_DESCRIPTIONS.about.includes('$'), 'about description invents no dollars')
ok(PAGE_DESCRIPTIONS.nil101.includes('What can your team actually afford?'), 'nil-101 description keeps the slogan')
ok(!PAGE_DESCRIPTIONS.nil101.includes('$'), 'nil-101 description invents no dollars')
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

const seoExtras = loadSchoolSeoExtras()
function seoFor(school) {
  return {
    year1: seoExtras.year1,
    year2: seoExtras.year2,
    spend: seoExtras.spendMap[school.id],
  }
}
const lou = schools.schools.find((s) => s.id === 'louisville')
const louDesc = schoolDescription('Louisville')
const louBooked = schoolDescription(lou, seoFor(lou))
const nd = schools.schools.find((s) => s.id === 'notre-dame')
const ndDesc = schoolDescription(nd, seoFor(nd))
ok(/NIL budget/i.test(louDesc) && /collective payout/i.test(louDesc), 'name-only Louisville description names NIL budget and collective payout')
ok(/football revenue/i.test(louDesc) && /salary/i.test(louDesc), 'name-only Louisville description names revenue and salary')
ok(!/Pending stays empty/i.test(louDesc), 'name-only Louisville description drops the desk slogan')
ok(!/\$/.test(louDesc), 'name-only Louisville description invents no dollars')
ok(louBooked.includes('$30,745,125'), 'Louisville description uses FY2025 football spending')
ok(louBooked.includes('$20,200,000'), 'Louisville description uses the booked House payout')
ok(!/Pending stays empty/i.test(louBooked), 'Louisville description drops the desk slogan')
ok(louBooked.length <= 155, `Louisville description is ${louBooked.length} characters`)
ok(/football revenue/i.test(ndDesc), 'Notre Dame description answers football-revenue queries')
ok(ndDesc.includes('$195,723,436'), 'Notre Dame description uses football revenue')
ok(ndDesc.includes('$93,255,797'), 'Notre Dame description uses football spending')
ok(!/Pending stays empty/i.test(ndDesc), 'Notre Dame description drops the desk slogan')
ok(ndDesc.length <= 155, `Notre Dame description is ${ndDesc.length} characters`)
ok(!/tuition/i.test(ndDesc) && !/tuition/i.test(louBooked), 'school descriptions skip tuition')
ok(descriptionFromPath('/school/indiana').includes('Indiana'), 'Indiana path description uses the name')
ok(
  PAGE_DESCRIPTIONS.home === 'What can your team actually afford? Power 4 money desk: House share, capacity, and booked NIL. Pending stays empty.',
  'home description leads with the locked slogan',
)
ok(descriptionFromPath('/') === PAGE_DESCRIPTIONS.home, 'descriptionFromPath home uses the locked slogan')
ok(indexHtml.includes(`content="${PAGE_DESCRIPTIONS.home}"`), 'index.html home meta/og/twitter description matches')
ok(indexHtml.includes(`"description":"${PAGE_DESCRIPTIONS.home}"`), 'index.html JSON-LD home description matches')
ok(indexHtml.includes(`desc = '${PAGE_DESCRIPTIONS.home}'`), 'index.html head script home desc matches')
ok(indexHtml.includes('<p class="slogan">What can your team actually afford?</p>'), 'homepage mast slogan is the locked line')
ok(
  indexHtml.includes('Power 4 only · House share · capacity · booked NIL. Pending stays empty.'),
  'homepage mast subline is the short clarifying line',
)
ok(PAGE_DESCRIPTIONS.coachFa.includes('do not invent remaining principal'), 'coach-fa description stays cite-only')
ok(PAGE_DESCRIPTIONS.guaranteeGames.includes('Football guarantee stays distinct from band fees'), 'guarantee-games description splits band')
ok(PAGE_DESCRIPTIONS.guaranteeGames.includes('Not House spent'), 'guarantee-games description splits House')
ok(PAGE_DESCRIPTIONS.guaranteeGames.includes('not booked NIL'), 'guarantee-games description splits booked NIL')
ok(descriptionFromPath('/guarantee-games') === PAGE_DESCRIPTIONS.guaranteeGames, 'descriptionFromPath guarantee-games')
ok(PAGE_DESCRIPTIONS.checkbookBowl.includes('FY2025 EADA'), 'checkbook-bowl description names the EADA filing')
ok(PAGE_DESCRIPTIONS.checkbookBowl.includes('68-school'), 'checkbook-bowl description names the 68-school desk')
ok(PAGE_DESCRIPTIONS.checkbookBowl.includes('AP-ranked'), 'checkbook-bowl description names the big-game rule')
ok(PAGE_DESCRIPTIONS.checkbookBowl.includes('do not invent dollars'), 'checkbook-bowl description stays cite-only')
ok(descriptionFromPath('/checkbook-bowl') === PAGE_DESCRIPTIONS.checkbookBowl, 'descriptionFromPath checkbook-bowl')

const nil101 = read('src/pages/Nil101.jsx')
const nilGuide = read('src/lib/nil101Guide.js')
ok(nil101.includes('HOUSE_2025_26'), 'nil 101 reuses the year-1 house constant')
ok(nil101.includes('y2026_27'), 'nil 101 reads the booked year-2 cap')
ok(nil101.includes('nil101Model'), 'nil 101 renders the shared guide')
ok(!nil101.includes('21583913') && !nil101.includes('21.58'), 'nil 101 does not hardcode the year-2 cap')
ok(!nilGuide.includes('21583913') && !nilGuide.includes('21.58'), 'nil 101 guide does not hardcode the year-2 cap')
ok(!/for dummies/i.test(nil101) && !/for dummies/i.test(nilGuide), 'nil 101 page avoids the trademark phrase')
ok(nilGuide.includes("href: '/'"), 'nil 101 has an in-app call to action')
for (const path of ['/methods', '/reported-nil', '/school/texas', '/school/ohio-state', '/compare', '/checkbook-bowl']) {
  ok(nilGuide.includes(`href: '${path}'`), `nil 101 links ${path}`)
}
ok(nil101.includes('alt='), 'nil 101 mascots have alt text')
ok(indexHtml.includes(`<a href="/nil-101">${NIL101_HOME_LINK_TEXT}</a>`), 'homepage body links NIL 101 with a descriptive anchor')
ok((indexHtml.match(/NIL 101: how college athletes get paid/g) || []).length === 1, 'homepage has one descriptive NIL 101 link')
ok(schoolPage.includes(`to="/nil-101">${NIL101_SCHOOL_LINK_TEXT}<`), 'school page links How NIL works')
ok((schoolPage.match(/to="\/nil-101"/g) || []).length === 1, 'school page has one NIL 101 link')
ok(read('src/pages/ReportedNil.jsx').includes('New to NIL? Start with NIL 101'), 'reported-nil links NIL 101')
ok(!/for dummies/i.test(indexHtml), 'index.html avoids the trademark phrase')
ok(!/noindex/i.test(indexHtml), 'index.html does not noindex')

const templateBlob = [
  DEFAULT_TITLE,
  SCHOOL_TITLE_FRAME,
  ...Object.values(PAGE_TITLES),
  ...Object.values(PAGE_DESCRIPTIONS),
  schoolTitle('Louisville'),
  schoolDescription('Louisville'),
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
ok(app.includes('schoolName: school?.name'), 'App passes booked school name into school JSON-LD')
ok(share.includes('CollegeOrUniversity'), 'share.js can emit CollegeOrUniversity for school routes')
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
ok(indexHtml.includes('NIL Budget, Collective Payout & Football Revenue'), 'index.html first-paints the full school title pattern')
ok(indexHtml.includes('NIL Budget & Collective Payout'), 'index.html first-paints the shortened school title')
ok(indexHtml.includes("var brand = ' | The Public Cap'"), 'index.html school titles use The Public Cap brand')
ok(indexHtml.includes("getAttribute('data-seo') === 'stamped'"), 'index.html does not overwrite a stamped school title')
ok(indexHtml.includes('Coach buyout offsets / free agents — Public Cap'), 'index.html first-paints /coach-fa')
ok(indexHtml.includes('Guarantee games — Public Cap'), 'index.html first-paints /guarantee-games')
ok(indexHtml.includes('href="/guarantee-games"'), 'index.html nav links the guarantee board')
ok(indexHtml.includes('Does the bigger spender win? — Public Cap'), 'index.html first-paints /checkbook-bowl')
ok(indexHtml.includes(PAGE_DESCRIPTIONS.checkbookBowl), 'index.html first-paints the checkbook-bowl description')
ok(indexHtml.includes('href="/checkbook-bowl"'), 'index.html nav links the checkbook bowl')
ok(indexHtml.includes(PAGE_TITLES.nil101), 'index.html first-paints /nil-101')
ok(indexHtml.includes(PAGE_DESCRIPTIONS.nil101), 'index.html first-paints the nil-101 description')
ok(indexHtml.includes('href="/nil-101"'), 'index.html nav links NIL 101')
ok(indexHtml.includes(PAGE_TITLES.about), 'index.html first-paints /about')
ok(indexHtml.includes(PAGE_DESCRIPTIONS.about), 'index.html first-paints the about description')
ok(indexHtml.includes('href="/about">About</a>'), 'index.html nav links About')
ok(indexHtml.includes('href="/about">About the desk</a>'), 'index.html footer links About')
ok(indexHtml.includes('Reported NIL by school — Power 4 football roster stack — Public Cap'), 'index.html first-paints /reported-nil')
ok(indexHtml.includes('href="/reported-nil"'), 'index.html nav links the reported-NIL board')
ok(indexHtml.includes('twitter:card'), 'index.html has a Twitter card')
ok(indexHtml.includes('summary_large_image'), 'index.html uses a large Twitter card')
ok(indexHtml.includes('og-reported-nil.png'), 'index.html points reported-nil unfurls at the board card')
ok(indexHtml.includes('og:site_name'), 'index.html has og:site_name')
ok(indexHtml.includes('og:image'), 'index.html has og:image')
ok(indexHtml.includes('<h1 class="issue-hed">What can your team actually afford?</h1>'), 'homepage LCP hed is the locked slogan')
ok(indexHtml.includes('What a Power 4 program can actually afford is annual capacity from public filings'), 'homepage LCP lede leads with capacity vs House vs booked NIL')
ok(!indexHtml.includes('Two ceilings, then booked NIL.'), 'homepage LCP hed dropped the two-ceilings sentence')
ok(indexHtml.includes('Collective 990 payout is a separate cited lane, not House.'), 'homepage LCP lede names collective payout')
ok(indexHtml.includes('Not total athletic revenue, and not a Group of 6 predictor'), 'homepage LCP lede kept')
ok(!/On3/i.test(indexHtml), 'index.html has no On3')
ok(!home.includes('className="issue-hed"'), 'React Home still does not remount the LCP hed')

ok(schools.schools.length === 68, 'desk still has 68 schools')
ok(!JSON.stringify(schools).includes('On3'), 'schools.json was not edited to name On3')
for (const s of schools.schools) {
  const title = schoolTitle(s.name)
  ok(title.startsWith(`${s.name} `), `${s.id} title starts with the school name`)
  ok(title.endsWith('| The Public Cap'), `${s.id} title ends with the brand`)
  ok(title.length <= SCHOOL_TITLE_LIMIT, `${s.id} title is ${title.length} characters`)
  ok(/NIL/i.test(title) && /collective/i.test(title), `${s.id} title names NIL and collective`)
  ok(!title.includes('$'), `${s.id} title invents no dollars`)
  ok(!/tuition/i.test(title), `${s.id} title skips tuition`)
}

const shells = loadSchoolShells()
ok(shells.length === 68, 'writer emits 68 school shells')
const lsu = schools.schools.find((s) => s.id === 'lsu')
const lsuRoute = shells.find((route) => route.path === '/school/lsu')
const lsuShell = applyRouteMeta(indexHtml, lsuRoute)
ok(
  lsuShell.includes(`<title>${schoolTitle(lsu.name).replace(/&/g, '&amp;')}</title>`),
  'LSU shell uses the booked name, not Lsu',
)
ok(lsuShell.includes('content="https://thepubliccap.com/school/lsu"'), 'LSU shell canonical/og:url')
ok(!lsuShell.includes('<title>Public Cap — Capacity vs House cap vs booked NIL</title>'), 'LSU shell dropped the homepage title')
ok(lsuShell.includes('data-seo="stamped"'), 'LSU shell is stamped so the head script keeps the title')

function jsonLdFrom(html) {
  const m = html.match(/<script type="application\/ld\+json" id="public-cap-jsonld">\s*([\s\S]*?)\s*<\/script>/)
  return m ? JSON.parse(m[1]) : null
}

const lsuLd = jsonLdFrom(lsuShell)
const lsuCollege = (lsuLd?.['@graph'] || []).find((n) => n['@type'] === 'CollegeOrUniversity')
ok(lsuCollege, 'LSU shell has CollegeOrUniversity JSON-LD')
ok(lsuCollege?.name === 'LSU', 'LSU CollegeOrUniversity name is the booked school name')
ok(lsuCollege?.url === 'https://thepubliccap.com/school/lsu', 'LSU CollegeOrUniversity url is the page url')
ok(
  JSON.stringify(lsuCollege) ===
    JSON.stringify({ '@type': 'CollegeOrUniversity', name: 'LSU', url: 'https://thepubliccap.com/school/lsu' }),
  'LSU CollegeOrUniversity has only name and url — no invented NIL/capacity',
)
ok(!/\$/.test(JSON.stringify(lsuCollege || {})), 'LSU CollegeOrUniversity invents no dollars')

const reportedLd = jsonLdFrom(reportedShell)
ok(reportedLd?.['@type'] === 'WebPage', 'reported-nil shell stays WebPage JSON-LD')
ok(!(reportedLd?.['@graph'] || []).some((n) => n['@type'] === 'CollegeOrUniversity'), 'reported-nil shell is not a college')

ok(lsuShell.includes(`>${NIL101_SCHOOL_LINK_TEXT}<`), 'LSU shell links How NIL works in the static HTML')
ok((lsuShell.match(/How NIL works/g) || []).length === 1, 'LSU shell has one How NIL works link')
ok((lsuShell.match(/<h1\b/g) || []).length === 1, 'LSU shell has one h1')
ok(lsuShell.includes('<h1 class="issue-hed">LSU</h1>'), 'LSU shell h1 is the school name')
ok(lsuShell.includes('<h2>Common questions</h2>'), 'LSU shell has a Common questions heading')

const schoolSeo = read('src/lib/schoolSeo.js')
ok(!schoolSeo.includes('21583913') && !schoolSeo.includes('20.5'), 'school FAQ does not hardcode the house caps')
ok(!/tuition/i.test(schoolSeo), 'school FAQ copy does not mention tuition')
ok(read('src/components/SchoolFaq.jsx').includes('Common questions'), 'React school page has the Common questions block')
ok(schoolPage.includes('<SchoolFaq'), 'school page renders SchoolFaq')

function dollarTokens(text) {
  return String(text).match(/\$\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\$\d+\.\d+[MB]/g) || []
}

function allowedDollars(school, ctx) {
  const nums = [ctx.year1, ctx.year2, ctx.spend]
  const pushField = (field) => {
    if (hasVal(field)) nums.push(field.value)
  }
  pushField(school.capacity?.eadaFootball)
  pushField(school.coaches?.football?.pay)
  pushField(school.coaches?.football?.buyout)
  pushField(school.nil?.booked)
  const spent = bookedHouseSpend(school)
  if (spent) nums.push(spent.value)
  for (const step of datedSpentSteps(school.nil?.booked)) nums.push(step.value)
  for (const row of school.nil?.collective990 || []) {
    if (row?.value != null) nums.push(row.value)
  }
  const allowed = new Set()
  for (const n of nums) {
    if (n == null || !Number.isFinite(Number(n))) continue
    allowed.add(moneyExact(n))
  }
  allowed.add(capPhrase(ctx.year1).match(/\$[\d,.]+M/)[0])
  for (const token of capPhrase(ctx.year2).match(/\$[\d,.]+(?:M)?/g) || []) allowed.add(token)
  return allowed
}

function assertFaqPage(node, label) {
  ok(node?.['@type'] === 'FAQPage', `${label} JSON-LD has FAQPage`)
  ok(Array.isArray(node?.mainEntity) && node.mainEntity.length > 0, `${label} FAQPage has questions`)
  for (const q of node?.mainEntity || []) {
    ok(q['@type'] === 'Question', `${label} entity is a Question`)
    ok(typeof q.name === 'string' && q.name.length > 0, `${label} question has a name`)
    ok(q.acceptedAnswer?.['@type'] === 'Answer', `${label} answer is an Answer`)
    ok(typeof q.acceptedAnswer?.text === 'string' && q.acceptedAnswer.text.length > 0, `${label} answer has text`)
    ok(!/tuition/i.test(q.name) && !/tuition/i.test(q.acceptedAnswer?.text || ''), `${label} FAQ skips tuition`)
  }
}

for (const route of shells) {
  const shell = applyRouteMeta(indexHtml, route)
  const school = route.school
  const ctx = route.seo
  const visible = schoolFaqFromHtml(shell)
  const expected = schoolFaqItems(school, ctx)
  ok(visible.length === expected.length, `${school.id} static FAQ count matches the model`)
  ok(shell.includes(schoolFaqIntro(school.name).replace(/&/g, '&amp;')), `${school.id} static intro is visible`)
  ok(shell.includes('NIL budget') && shell.includes('collective') && shell.includes('revenue'), `${school.id} static HTML has NIL budget, collective, and revenue`)
  ok(/salar(?:y|ies)/.test(shell), `${school.id} static HTML has salary or salaries`)
  ok(shell.includes(`<h1 class="issue-hed">${school.name.replace(/&/g, '&amp;')}</h1>`), `${school.id} static h1 is the school name`)
  ok(shell.includes(`href="/buyout/${school.id}"`), `${school.id} shell links its buyout page`)
  const ld = jsonLdFrom(shell)
  const faqLd = (ld?.['@graph'] || []).find((n) => n['@type'] === 'FAQPage')
  assertFaqPage(faqLd, school.id)
  ok(faqLd.mainEntity.length === expected.length, `${school.id} FAQPage question count`)
  const allowed = allowedDollars(school, ctx)
  const blob = [route.description, ...visible.map((item) => `${item.question} ${item.answer}`)].join('\n')
  ok(!/tuition/i.test(blob), `${school.id} shell copy skips tuition`)
  ok(!/Pending stays empty/.test(route.description), `${school.id} description drops the desk slogan`)
  ok(!/Pending stays empty/.test(schoolFaqIntro(school.name)), `${school.id} intro drops the desk slogan`)
  ok(!/cited pay lines/.test(schoolFaqIntro(school.name)), `${school.id} intro drops the salary caveat`)
  ok(route.description.length <= 155, `${school.id} description is ${route.description.length} characters`)
  ok(!/not booked on this page|not public on this desk/i.test(blob), `${school.id} FAQ uses plain missing-data language`)
  for (const token of dollarTokens(blob)) {
    ok(allowed.has(token), `${school.id} dollar ${token} is already on the desk`)
  }
  for (let i = 0; i < expected.length; i++) {
    ok(visible[i].question === expected[i].question, `${school.id} visible question ${i}`)
    ok(visible[i].answer === expected[i].answer, `${school.id} visible answer matches JSON source ${i}`)
    ok(faqLd.mainEntity[i].name === expected[i].question, `${school.id} FAQPage name ${i}`)
    ok(faqLd.mainEntity[i].acceptedAnswer.text === expected[i].answer, `${school.id} FAQPage text matches visible answer ${i}`)
  }
  if (school.id === 'syracuse') {
    ok(!expected.some((item) => item.question.includes('buyout')), 'Syracuse skips the coach question without a public pay or buyout')
  }
  if (school.id === 'notre-dame') {
    ok(expected.some((item) => item.question === "What has Notre Dame's collective paid?"), 'Notre Dame answers collective payout')
    ok(route.description.includes('$195,723,436') && route.description.includes('$93,255,797'), 'Notre Dame shell description has both EADA lines')
  }
  if (school.id === 'oklahoma-state') {
    ok(!expected.some((item) => item.question.includes('collective paid')), 'Oklahoma State skips collective payout with no 990 dollar')
    ok(route.title === schoolTitle('Oklahoma State'), 'Oklahoma State shell title is the SERP title')
    const spendA = expected.find((item) => item.question.includes('make and spend'))
    const payA = expected.find((item) => item.question.includes('pay players'))
    ok(spendA.answer.includes("We don't have a reported football revenue figure for Oklahoma State yet."), 'Oklahoma State says football revenue is not reported yet')
    ok(payA.answer.includes("Oklahoma State hasn't released how much of that it has actually paid out."), 'Oklahoma State says House payout is unreleased')
  }
  if (school.id === 'louisville') {
    const coachA = expected.find((item) => item.question.includes('buyout'))
    ok(coachA.answer.includes("We haven't confirmed the buyout figure yet."), 'Louisville says the buyout is not confirmed yet')
  }
}

const y1 = schools.meta.houseCap.y2025_26.value
const y2 = schools.meta.houseCap.y2026_27.value
const nilModel = nil101Model({ year1: y1, year2: y2 })
const nilShell = applyRouteMeta(indexHtml, routeShell('/nil-101'))
ok((nilShell.match(/<h1\b/g) || []).length === 1, 'nil-101 shell has one h1')
ok(nilShell.includes('<h1 class="issue-hed">NIL 101</h1>'), 'nil-101 h1 is NIL 101')
ok(!/noindex/i.test(nilShell), 'nil-101 shell is not noindex')
ok(nilShell.includes('https://thepubliccap.com/nil-101'), 'nil-101 shell canonical is /nil-101')
ok(nilShell.includes(`data-nil-year2="${y2}"`), 'nil-101 shell boots the booked year-2 cap')
for (const section of nilModel.sections) {
  ok(nilShell.includes(`<h2>${section.question}</h2>`), `nil-101 shell heading ${section.question}`)
}
const nilLd = jsonLdFrom(nilShell)
const nilFaq = (nilLd?.['@graph'] || []).find((n) => n['@type'] === 'FAQPage')
const nilArticle = (nilLd?.['@graph'] || []).find((n) => n['@type'] === 'Article')
ok(nilFaq, 'nil-101 shell has FAQPage JSON-LD')
ok(nilArticle, 'nil-101 shell has Article JSON-LD')
ok(nilArticle?.headline === PAGE_TITLES.nil101, 'article headline is the nil-101 title')
ok(nilArticle?.description === PAGE_DESCRIPTIONS.nil101, 'article description is the nil-101 description')
ok(nilArticle?.author?.name === 'The Public Cap', 'article author is The Public Cap')
ok(nilArticle?.publisher?.name === 'The Public Cap', 'article publisher is The Public Cap')
ok(nilArticle?.datePublished === '2026-09-25', 'article datePublished is the guide publish date')
ok(nilArticle?.dateModified === '2026-09-29', 'article dateModified is the static-guide update')
ok(nilArticle?.url === 'https://thepubliccap.com/nil-101', 'article url is the canonical')
ok(nilArticle?.image === 'https://thepubliccap.com/og-default.png', 'article image is the default share image')
const extracted = articleAnswersFromHtml(nilShell)
ok(extracted.length === nilModel.sections.length, 'nil-101 shell has one article per question')
const faqSections = nilModel.sections.filter((section) => !NIL101_FAQ_SKIP.has(section.question))
ok(nilFaq.mainEntity.length === faqSections.length, 'FAQPage skips the flattened comparison table')
ok(faqSections.length === 8, 'FAQPage keeps the other 8 questions')
ok(!nilFaq.mainEntity.some((q) => q.name === 'NIL money vs. school money'), 'FAQPage omits NIL money vs. school money')
ok(nilShell.includes('<h2>NIL money vs. school money</h2>'), 'the comparison table stays on the page')
for (let i = 0; i < nilModel.sections.length; i++) {
  const section = nilModel.sections[i]
  const expected = sectionAnswer(section)
  ok(extracted[i].question === section.question, `visible heading ${section.question}`)
  ok(extracted[i].answer === expected, `visible answer matches the guide for ${section.question}`)
  ok(!/Cartoon piggy/.test(expected), `answer omits image alt for ${section.question}`)
}
for (let i = 0; i < faqSections.length; i++) {
  const section = faqSections[i]
  ok(nilFaq.mainEntity[i].name === section.question, `FAQ question ${section.question}`)
  ok(nilFaq.mainEntity[i].acceptedAnswer.text === sectionAnswer(section), `FAQ answer matches visible text for ${section.question}`)
}
const employees = nilFaq.mainEntity.find((q) => q.name === 'Are players employees?')
ok(
  employees?.acceptedAnswer.text === 'Not right now. Courts and Congress are still arguing about it.',
  'employees answer is the guide wording',
)
const what = nilFaq.mainEntity.find((q) => q.name === 'What is NIL?')
ok(
  what?.acceptedAnswer.text === 'NIL means name, image, and likeness. That is a player\'s name, face, and fame. Since July 2021, college athletes can get paid for those things. Businesses and fans pay for ads, social posts, appearances, and autographs.',
  'What is NIL answer is the guide wording',
)
const changed = nilFaq.mainEntity.find((q) => q.name === 'What changed in 2025?')
ok(changed.acceptedAnswer.text.includes(capPhrase(y1)), 'year-1 cap phrase is the booked cap')
ok(changed.acceptedAnswer.text.includes(capPhrase(y2)), 'year-2 cap phrase is the booked cap')
ok(changed.acceptedAnswer.text.includes('Schools can pay players now.'), '2025 answer keeps the caption')
ok(nilShell.includes('href="/methods"') && nilShell.includes('href="/school/texas"'), 'nil-101 shell keeps the methods and Texas links')

ok(schoolPage.includes('to={`/buyout/${s.id}`}'), 'school page links the school buyout view')
ok(indexHtml.includes("p === '/buyout' || p.indexOf('/buyout/') === 0"), 'index.html first-paints /buyout/<id> without the homepage title')

const buyouts = JSON.parse(read('data/buyouts.json'))
const buyoutShells = loadBuyoutShells()
ok(buyoutShells.length === 68, 'writer emits 68 buyout shells')
const usatBuyouts = {
  alabama: 60843750,
  georgia: 105107583,
  'mississippi-state': 11006250,
  texas: 60307500,
  'texas-am': 21875000,
  illinois: 49491667,
  indiana: 56700000,
  iowa: 25729167,
  maryland: 13395417,
  minnesota: 26600000,
  nebraska: 49612500,
  'ohio-state': 70916667,
  washington: 33686666,
  'georgia-tech': 11123333,
  louisville: 33633333,
  'nc-state': 13129456,
  virginia: 11175000,
  arizona: 10650000,
  'arizona-state': 24683333,
  cincinnati: 12008333,
  kansas: 22930000,
  'texas-tech': 9940761,
  ucf: 13793750,
  'west-virginia': 7645833,
}
const priorLabels = {
  nebraska: 'October 30, 2025',
  'georgia-tech': 'December 2025',
  'texas-am': 'February 2026',
  'arizona-state': 'February 2026',
  minnesota: 'February 2026',
  louisville: 'August 10, 2026',
  arizona: 'February 2026',
  'texas-tech': 'December 2025',
  'mississippi-state': 'December 2025',
  georgia: null,
  texas: null,
  kansas: null,
  ucf: null,
}
ok(Object.keys(usatBuyouts).length === 24, '24 USA TODAY football buyout overhangs remain after Purdue and Colorado were rebooked')
for (const [id, amount] of Object.entries(usatBuyouts)) {
  const coach = buyouts.coaches[id]
  const cite = buyoutCite(coach)
  ok(cite.amount === amount, `${id} USA TODAY dollar stays ${amount}`)
  ok(cite.asOf === '2025-12-01', `${id} buyout as-of is Dec. 1, 2025`)
  ok(cite.freshness === 'stale', `${id} Dec. 1, 2025 as-of is not treated as current`)
  ok(buyoutDescription(coach).includes(usatBuyoutSourceText()), `${id} description cites the USA TODAY buyout column`)
  ok(!/October 8, 2025/.test(buyoutTitle(coach)), `${id} title does not keep the database update date`)
  ok(!/in force today/i.test(buyoutDescription(coach)), `${id} description does not say in force today`)
  if (id in priorLabels) {
    const when = priorLabels[id]
    const footnote = priorContractFootnote(coach)
    ok(cite.priorContract, `${id} is marked prior-contract`)
    ok(footnote === `${coach.name} signed a newer contract${when ? ` (${when})` : ''}. The updated buyout figure is pending; the figure above reflects the prior contract.`, `${id} footnote`)
    ok(buyoutDescription(coach).includes(footnote), `${id} description includes the footnote`)
    ok(buyoutDescription(coach).includes('Prior-contract figure, new deal pending.'), `${id} description uses the pending note`)
    ok(!buyoutDescription(coach).includes('That as-of date is not current.'), `${id} description drops the old stale sentence`)
    ok(buyoutTitle(coach) === `${coach.name} buyout: ${moneyExact(amount)} as of December 1, 2025 — prior-contract figure, new deal pending | The Public Cap`, `${id} title`)
    ok(buyoutLead(coach).includes('Prior-contract figure, new deal pending.'), `${id} lead uses the pending note`)
  } else {
    ok(!coach.priorContract, `${id} is not given a newer-contract footnote`)
    ok(buyoutDescription(coach).includes('That as-of date is not current.'), `${id} description still says the date is not current`)
    ok(buyoutTitle(coach) === `${coach.name} buyout: ${moneyExact(amount)} as of December 1, 2025 | The Public Cap`, `${id} title uses Dec. 1, 2025`)
  }
}
ok(!buyouts.coaches.purdue.priorContract, 'Purdue is Barry Odom and is not footnoted as a Brohm contract')
ok(buyouts.coaches.purdue.name === 'Barry Odom', 'Purdue row remains Barry Odom')
ok(buyouts.coaches.purdue.overhang.amount === 20625000, 'Purdue headline is $20,625,000')
ok(buyouts.coaches.purdue.overhang.firedLabel === 'if fired Dec. 1, 2026', 'Purdue figure is if fired Dec. 1, 2026')
ok(buyouts.coaches.purdue.overhang.asOf === '2026-12-01', 'Purdue firing date is Dec. 1, 2026')
ok(buyouts.coaches.purdue.overhang.source.url === 'https://sports.yahoo.com/much-purdue-paying-football-coach-132324182.html', 'Purdue source is the Yahoo syndication of the IndyStar')
ok(buyoutCite(buyouts.coaches.purdue).freshness === 'later', 'Purdue Dec. 1, 2026 figure is later than the desk date')
ok(buyoutTitle(buyouts.coaches.purdue) === 'Barry Odom buyout: $20,625,000 if fired Dec. 1, 2026 | The Public Cap', 'Purdue title uses the firing condition')
ok(buyoutDescription(buyouts.coaches.purdue).includes('Indianapolis Star (Nathan Baird, Dec. 10, 2024)'), 'Purdue description names the IndyStar date')
ok(buyoutStaleness(buyouts.coaches.purdue) == null, 'Purdue Dec. 1, 2026 figure is not an age badge')
ok(buyouts.coaches.colorado.tape === 'steps', 'Colorado tape is the Denver Post year steps')
ok(buyouts.coaches.colorado.steps[0].amount === 33000000, 'Colorado 2026 step is $33,000,000')
ok(buyouts.coaches.colorado.steps[0].firedLabel === 'if fired in 2026', 'Colorado 2026 step is if fired in 2026')
ok(buyouts.coaches.colorado.steps[1].amount === 25500000, 'Colorado 2027 step is $25,500,000')
ok(buyouts.coaches.colorado.steps[1].firedLabel === 'if fired in 2027', 'Colorado 2027 step is if fired in 2027')
ok(buyoutCite(buyouts.coaches.colorado).amount === 33000000, 'Colorado headline is the 2026 Denver Post figure')
ok(buyouts.coaches.colorado.steps[0].source.url === 'https://www.denverpost.com/2026/02/28/deion-sanders-cu-buffs-football-contract-buyout-coach-prime/', 'Colorado source is the Denver Post')
ok(buyoutTitle(buyouts.coaches.colorado) === 'Deion Sanders buyout: $33,000,000 if fired in 2026 | The Public Cap', 'Colorado title uses if fired in 2026')
ok(buyoutDescription(buyouts.coaches.colorado).includes('$25,500,000 if fired in 2027'), 'Colorado description includes the 2027 step')
ok(!buyoutDescription(buyouts.coaches.colorado).includes('33,625,000'), 'Colorado description drops the USA TODAY dollar')
ok(buyoutStaleness(buyouts.coaches.colorado) == null, 'Colorado Feb. 28, 2026 cite is inside 9 months')
ok(buyouts.coaches.nebraska.overhang.amount === 49612500, 'Nebraska dollar stays $49,612,500')
ok(buyouts.coaches.nebraska.contract.url.includes('docs.nebraska.edu/unop/docs/transparency/Coach%20Matt%20Rhule'), 'Nebraska contract link is the university PDF')
const samples = {
  'south-carolina': {
    amount: 22550000,
    asOf: 'December 1, 2026',
    title: 'Shane Beamer buyout: $22,550,000 as of December 1, 2026 | The Public Cap',
  },
  'florida-state': {
    amount: 49353349,
    asOf: 'September 16, 2026',
    title: 'Mike Norvell buyout: $49,353,349 as of September 16, 2026 | The Public Cap',
  },
  rutgers: {
    amount: 18000000,
    asOf: 'October 4, 2026',
    title: 'Greg Schiano buyout: $18,000,000 as of October 4, 2026 | The Public Cap',
  },
}
for (const [id, sample] of Object.entries(samples)) {
  const coach = buyouts.coaches[id]
  const cite = buyoutCite(coach)
  ok(cite.amount === sample.amount, `${id} headline dollar is the stored buyouts.json amount`)
  ok(buyoutTitle(coach) === sample.title, `${id} title`)
  ok(buyoutDescription(coach).includes(moneyExact(sample.amount)), `${id} description includes the stored dollar`)
  ok(buyoutDescription(coach).includes(sample.asOf), `${id} description includes the as-of date`)
  const route = buyoutShells.find((item) => item.path === `/buyout/${id}`)
  const shell = applyRouteMeta(indexHtml, route)
  ok(shell.includes(`<title>${sample.title}</title>`), `${id} shell title`)
  ok(shell.includes(`https://thepubliccap.com/buyout/${id}`), `${id} shell canonical`)
  ok(shell.includes('data-seo="stamped"'), `${id} shell is stamped`)
  ok((shell.match(/<h1\b/g) || []).length === 1, `${id} shell has one h1`)
  ok(shell.includes(`<h1 class="issue-hed">${coach.name} buyout</h1>`), `${id} shell h1 is the coach buyout`)
  ok(shell.includes(moneyExact(sample.amount)), `${id} shell body prints the stored dollar`)
  ok(!/noindex/i.test(shell), `${id} shell is indexable`)
}
const rhule = buyouts.coaches.nebraska
const rhuleRoute = buyoutShells.find((item) => item.path === '/buyout/nebraska')
const rhuleShell = applyRouteMeta(indexHtml, rhuleRoute)
const rhuleFootnote = priorContractFootnote(rhule)
ok(rhuleShell.includes(`<title>${buyoutTitle(rhule)}</title>`), 'Nebraska shell title carries the pending note')
ok(rhuleShell.includes(rhuleFootnote), 'Nebraska shell body shows the footnote')
ok(rhuleShell.includes('USA TODAY coaches salary database'), 'Nebraska shell names the USA TODAY database')
ok(rhuleShell.includes('buyout as of Dec. 1, 2025'), 'Nebraska shell states the buyout as-of')
ok(rhuleShell.includes('$49,612,500'), 'Nebraska shell keeps the stored dollar')
ok(rhuleShell.includes('prior-contract figure, new deal pending'), 'Nebraska JSON-LD description carries the pending note')
ok(!rhuleShell.includes('October 8, 2025'), 'Nebraska shell drops October 8, 2025')
ok(!rhuleShell.includes('That as-of date is not current'), 'Nebraska shell drops the old stale sentence')
ok(buyoutTitle(buyouts.coaches.vanderbilt) === 'Clark Lea buyout | The Public Cap', 'pending buyout title invents no dollar')
ok(!/\$/.test(buyoutDescription(buyouts.coaches.vanderbilt)), 'pending buyout description invents no dollar')
ok(buyoutDescription(buyouts.coaches['south-carolina']).includes('not the buyout if fired on the desk date'), 'Beamer December 1 figure is not presented as today')
ok(buyoutDescription(buyouts.coaches.rutgers).includes('not the buyout if fired on the desk date'), 'Schiano October 4 figure is not presented as the desk date')
ok(buyoutCite(buyouts.coaches.rutgers).freshness === 'later', 'Schiano October 4 as-of is later than the desk date')
ok(buyoutStaleness(buyouts.coaches.nebraska)?.kind === 'prior-contract', 'Nebraska staleness is the prior-contract badge')
ok(buyoutStaleness(buyouts.coaches.nebraska)?.label === 'Prior-contract figure, new deal pending', 'Nebraska badge matches the pending footnote')
ok(buyoutStaleness(buyouts.coaches.maryland)?.kind === 'older-than-9-months', 'Maryland Dec. 1, 2025 figure is older than 9 months')
ok(buyoutStaleness(buyouts.coaches['florida-state']) == null, 'Norvell desk-date figure has no staleness badge')
ok(rhuleShell.includes('data-buyout-staleness="prior-contract"'), 'Nebraska shell exposes prior-contract staleness')
ok(rhuleShell.includes('Prior-contract figure, new deal pending'), 'Nebraska shell shows the staleness badge')
ok(rhuleShell.includes('docs.nebraska.edu'), 'Nebraska shell links the university employment agreement')
ok(rhuleShell.includes('href="/buyout/hot-seat"'), 'Nebraska shell links the hot-seat hub')
ok(rhuleShell.includes('href="/school/nebraska"'), 'Nebraska shell links the school page')
const schoolsForLinks = JSON.parse(read('public/data/schools.json')).schools
for (const coach of buyoutShells) {
  const id = coach.path.split('/')[2]
  const shell = applyRouteMeta(indexHtml, coach)
  ok(shell.includes('href="/buyout/hot-seat"'), `${id} shell links the hot-seat hub`)
  ok(shell.includes(`href="/school/${id}"`), `${id} shell links its school page`)
  const peers = relatedBuyoutSchools(id, schoolsForLinks)
  ok(peers.length >= 4 && peers.length <= 5, `${id} has 4–5 related buyout peers`)
  ok(shell.includes(`href="/buyout/${peers[0].id}"`), `${id} shell links a related buyout`)
}
const hub = loadHotSeatShell()
const hubShell = applyRouteMeta(indexHtml, hub)
ok(hub.title === HOT_SEAT_TITLE, 'hot-seat title')
ok(hub.description === HOT_SEAT_DESCRIPTION, 'hot-seat description')
ok(hubShell.includes(`<title>${HOT_SEAT_TITLE}</title>`), 'hot-seat shell title')
ok(hubShell.includes(HOT_SEAT_DESCRIPTION), 'hot-seat shell description')
ok(hubShell.includes('https://thepubliccap.com/buyout/hot-seat'), 'hot-seat shell canonical')
ok((hubShell.match(/<h1\b/g) || []).length === 1, 'hot-seat shell has one h1')
ok(!/noindex/i.test(hubShell), 'hot-seat shell is indexable')
ok(hubShell.includes('data-seo="stamped"'), 'hot-seat shell is stamped')
for (const id of HOT_SEAT_IDS) {
  ok(hubShell.includes(`href="/buyout/${id}"`), `hot-seat shell links /buyout/${id}`)
  ok(hubShell.includes(`href="/school/${id}"`), `hot-seat shell links /school/${id}`)
}
ok(hubShell.includes('$20,625,000'), 'hot-seat shell prints the Purdue dollar')
ok(hubShell.includes('if fired Dec. 1, 2026'), 'hot-seat shell prints the Purdue firing condition')
ok(hubShell.includes('$33,000,000'), 'hot-seat shell prints the Colorado 2026 dollar')
ok(hubShell.includes('$25,500,000') === false, 'hot-seat hub headline row is the in-force Colorado step')
ok(hubShell.includes('if fired in 2026'), 'hot-seat shell prints if fired in 2026')
ok(hubShell.includes('$60,307,500'), 'hot-seat shell keeps the stored Sarkisian dollar')
ok(!hubShell.includes('$36,500,000') && !hubShell.includes('$36.5'), 'hot-seat shell does not book a fan-site Sarkisian dollar')
ok(hubShell.includes('data-buyout-staleness="prior-contract"'), 'hot-seat shell marks the prior-contract row')
ok(hubShell.includes('data-buyout-staleness="older-than-9-months"'), 'hot-seat shell marks the age-stale row')
ok(renderHotSeatStaticBody({ coaches: {} }, []).includes('>Pending<'), 'hot-seat says pending when a coach has no cited dollar')
const purdueSchool = schoolsForLinks.find((s) => s.id === 'purdue')
const coloSchool = schoolsForLinks.find((s) => s.id === 'colorado')
ok(purdueSchool.coaches.football.buyout.value === 20625000, 'Purdue school card books $20,625,000')
ok(purdueSchool.coachesByYear['2026'].football.buyout.value === 20625000, 'Purdue 2026 card books $20,625,000')
ok(coloSchool.coaches.football.buyout.value === 33000000, 'Colorado school card books $33,000,000')
ok(coloSchool.coachesByYear['2026'].football.buyout.value === 33000000, 'Colorado 2026 card books $33,000,000')
ok(coloSchool.coaches.football.buyout.steps[1].remaining === 25500000, 'Colorado school tape keeps the 2027 step')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length) process.exit(1)
