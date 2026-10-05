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
import { applyRouteMeta, loadSchoolSeoExtras, loadSchoolShells, routeShell } from './write-spa-html.mjs'

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
ok(!/NIL Go/i.test(nilGuide) && !/NIL Go/i.test(nil101), 'nil 101 does not name NIL Go')
ok(!/On3|Opendorse/i.test(nilGuide), 'nil 101 guide does not name On3 or Opendorse')
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
ok(nilArticle?.dateModified === '2026-10-05', 'article dateModified is the static-guide update')
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

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length) process.exit(1)
