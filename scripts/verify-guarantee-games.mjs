/**
 * Guarantee / buy-game lane honesty.
 * Run: node scripts/verify-guarantee-games.mjs
 */
import { readFileSync } from 'node:fs'
import { DEFS } from '../src/lib/definitions.js'
import {
  footballGuarantee,
  gamesForSchool,
  hasDollar,
  listGames,
  party,
  partyLabel,
  primaryCite,
  schoolHasGames,
  sortGames,
} from '../src/lib/guaranteeGames.js'

const book = JSON.parse(readFileSync(new URL('../data/guarantee-games.json', import.meta.url), 'utf8'))
const pub = JSON.parse(readFileSync(new URL('../public/data/guarantee-games.json', import.meta.url), 'utf8'))
const schools = JSON.parse(readFileSync(new URL('../public/data/schools.json', import.meta.url), 'utf8'))
const tape = JSON.parse(readFileSync(new URL('../data/tape.json', import.meta.url), 'utf8'))
const page = readFileSync(new URL('../src/pages/GuaranteeGames.jsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const schoolPage = readFileSync(new URL('../src/pages/School.jsx', import.meta.url), 'utf8')
const methods = readFileSync(new URL('../src/pages/Methods.jsx', import.meta.url), 'utf8')
const shareLib = readFileSync(new URL('../src/lib/share.js', import.meta.url), 'utf8')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const seo = readFileSync(new URL('../scripts/verify-seo.mjs', import.meta.url), 'utf8')

const deskIds = new Set((schools.schools || []).map((s) => s.id))
const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

ok(JSON.stringify(book) === JSON.stringify(pub), 'data/guarantee-games.json synced to public/data')
ok(book.meta?.season === 2026, 'book is the 2026 season')
ok(book.games?.length >= 14, `at least the solid FOIA seed (${book.games?.length} rows)`)

const byId = Object.fromEntries((book.games || []).map((g) => [g.id, g]))
function game(id) {
  return byId[id]
}

const miami = game('2026-miami-famu')
ok(miami?.payerSchoolId === 'miami', 'Miami is the payer')
ok(miami?.payeeSlug === 'famu' && /florida a&m/i.test(miami.payeeLabel), 'FAMU is the external payee')
ok(miami?.amount === 720_000, 'Miami–FAMU football guarantee is $720,000')
ok(miami?.bandAmount === 40_000, 'FAMU Marching 100 band is $40,000')
ok(miami.amount !== 740_000 && miami.amount !== 760_000, 'social $740k / rolled $760k is not the football cell')
ok(/not the social \$740k/i.test(miami.notes || ''), 'notes refuse the social $740k figure')
ok(primaryCite(book, miami)?.url?.includes('tallahassee.com'), 'Miami–FAMU primary cite is the Democrat')

ok(game('2026-texas-am-missouri-state')?.amount === 1_200_000, 'Texas A&M → Missouri State $1.2M')
ok(game('2026-texas-am-citadel')?.amount === 600_000, 'Texas A&M → The Citadel $600k')
ok(game('2026-texas-am-arizona-state')?.amount === 0, 'Texas A&M ↔ Arizona State $0')
ok(game('2026-texas-am-arizona-state')?.payeeSchoolId === 'arizona-state', 'ASU is on the desk as payee')

ok(game('2026-utah-idaho')?.amount === 600_000, 'Utah → Idaho $600k')
ok(game('2026-utah-utah-state')?.amount === 600_000, 'Utah → Utah State $600k')
ok(game('2026-utah-arkansas')?.amount === 250_000, 'Utah → Arkansas $250k')
ok(game('2026-utah-arkansas')?.payeeSchoolId === 'arkansas', 'Arkansas is the 2026 payee')
ok(/2028/i.test(game('2026-utah-arkansas')?.notes || ''), 'Arkansas return $250k stays in notes, not a fake 2026 reverse row')

ok(game('2026-kansas-state-nicholls')?.amount === 500_000, 'Kansas State → Nicholls $500k')
ok(game('2026-nc-state-richmond')?.amount === 400_000, 'NC State → Richmond $400k')
ok(game('2026-vanderbilt-nc-state')?.amount === 400_000, 'Vanderbilt → NC State $400k')
ok(game('2026-nc-state-app-state')?.amount === 0, 'NC State / App State $0')
ok(game('2026-duke-william-mary')?.amount === 400_000, 'Duke → William & Mary $400k')
ok(game('2026-illinois-duke')?.amount === 250_000, 'Illinois → Duke $250k')
ok(game('2026-illinois-duke')?.homeSchoolId === 'illinois', 'Duke at Illinois')
ok(game('2026-rutgers-umass')?.amount === 1_550_000, 'Rutgers → UMass $1.55M')
ok(game('2026-ohio-state-ball-state')?.amount === 1_900_000, 'Ohio State → Ball State $1.9M')
ok(game('2026-arizona-nau')?.amount === 550_000, 'Arizona → NAU $550k')

const iuHoward = game('2026-indiana-howard')
ok(iuHoward?.amount === 525_000, 'Indiana → Howard $525,000')
ok(iuHoward?.date === '2026-09-12', 'Indiana–Howard date is Sept. 12, 2026')
ok(iuHoward?.payerSchoolId === 'indiana' && iuHoward?.payeeSlug === 'howard', 'Indiana pays Howard')
ok(iuHoward?.citeIds?.includes('fbschedules-indiana-howard-2026'), 'Indiana–Howard cites FBSchedules')
ok(iuHoward?.citeIds?.includes('indystar-indiana-howard-2026'), 'Indiana–Howard cites IndyStar')
ok(book.cites['fbschedules-indiana-howard-2026']?.asOf === '2025-08-18', 'FBSchedules Indiana cite is Aug. 18, 2025')
ok(book.cites['indystar-indiana-howard-2026']?.url?.includes('indystar.com'), 'IndyStar URL is indystar.com')

const ruHoward = game('2026-rutgers-howard')
ok(ruHoward?.amount === 475_000, 'Rutgers → Howard $475,000')
ok(ruHoward?.date === '2026-09-25', 'Rutgers–Howard date is the moved Sept. 25, 2026')
ok(/Sept\. 19, 2026/.test(ruHoward?.dateNote || ''), 'Rutgers–Howard dateNote keeps the original contract date')
ok(/original contract amount/.test(ruHoward?.dateNote || ''), 'Rutgers–Howard dateNote says the dollar is the original contract')
ok(ruHoward?.citeIds?.includes('fbschedules-rutgers-howard-2026'), 'Rutgers–Howard cites FBSchedules')
ok(ruHoward?.citeIds?.includes('onthebanks-rutgers-howard-2026'), 'Rutgers–Howard cites On the Banks')
ok(book.cites['fbschedules-rutgers-howard-2026']?.asOf === '2024-08-03', 'FBSchedules Rutgers cite is Aug. 3, 2024')
ok(!/yahoo\.com/i.test(JSON.stringify(ruHoward) + JSON.stringify(book.cites['onthebanks-rutgers-howard-2026'] || {})), 'Yahoo syndication URL is not linked')
ok(gamesForSchool(book, 'indiana').paid.some((g) => g.id === '2026-indiana-howard'), 'Indiana school card shows Howard')
ok(gamesForSchool(book, 'rutgers').paid.some((g) => g.id === '2026-rutgers-howard'), 'Rutgers school card shows Howard')

ok(game('2026-texas-tech-sam-houston')?.amount === 1_000_000, 'Texas Tech → Sam Houston $1,000,000')
ok(game('2026-texas-tech-sam-houston')?.date === '2026-09-26', 'Sam Houston date is Sept. 26, 2026')
ok(game('2026-texas-tech-kent-state')?.amount === 1_500_000, 'Texas Tech → Kent State $1,500,000')
ok(game('2026-lsu-mcneese')?.amount === 750_000 && game('2026-lsu-mcneese')?.date === '2026-10-03', 'LSU → McNeese $750,000 on the moved Oct. 3 date')
ok(/Sept\. 12, 2026/.test(game('2026-lsu-mcneese')?.dateNote || ''), 'LSU–McNeese dateNote keeps the contract date')
ok(game('2026-kansas-middle-tennessee')?.amount === 925_000 && game('2026-kansas-middle-tennessee')?.date === '2026-10-03', 'Kansas → Middle Tennessee $925,000 on Oct. 3')
ok(/Sept\. 19, 2026/.test(game('2026-kansas-middle-tennessee')?.dateNote || ''), 'Kansas–MTSU dateNote keeps the contract date')
ok(game('2026-georgia-western-kentucky')?.amount === 1_900_000, 'Georgia → Western Kentucky $1,900,000')
ok(game('2026-georgia-tennessee-state')?.amount === 600_000, 'Georgia → Tennessee State $600,000')
ok(game('2026-wisconsin-western-illinois')?.amount === 575_000, 'Wisconsin → Western Illinois $575,000')
ok(game('2026-iowa-northern-iowa')?.amount === 700_000, 'Iowa → Northern Iowa $700,000')
ok(game('2026-indiana-western-kentucky')?.amount === 1_100_000, 'Indiana → Western Kentucky $1,100,000')

ok(game('2026-florida-state-central-arkansas')?.amount === 450_000, 'Florida State → Central Arkansas $450,000')
ok(game('2026-florida-state-central-arkansas')?.date === '2026-09-26', 'FSU–Central Arkansas is Sept. 26, 2026')
ok(game('2026-florida-state-central-arkansas')?.kind === 'buy-game', 'FSU–Central Arkansas is a buy game')
ok(book.cites['fbschedules-fsu-central-arkansas-2026']?.asOf === '2025-05-01', 'FSU cite is May 1, 2025')
ok(game('2026-texas-utsa')?.amount === 1_700_000 && game('2026-texas-utsa')?.date === '2026-09-19', 'Texas → UTSA $1,700,000 on Sept. 19')
ok(game('2026-texas-utsa')?.citeIds?.includes('tpr-texas-utsa-2026'), 'UTSA cites Texas Public Radio')
ok(game('2026-texas-texas-state')?.amount === 1_400_000 && game('2026-texas-texas-state')?.date === '2026-09-05', 'Texas → Texas State $1,400,000 on Sept. 5')
ok(/whether the game is played or not/i.test(game('2026-texas-texas-state')?.notes || ''), 'Texas State notes keep the play-or-not obligation')
ok(game('2026-texas-ohio-state')?.amount === 500_000 && game('2026-texas-ohio-state')?.kind === 'home-and-home', 'Texas → Ohio State $500,000 is home-and-home travel')
ok(game('2026-texas-ohio-state')?.payeeSchoolId === 'ohio-state' && game('2026-texas-ohio-state')?.homeSchoolId === 'texas', 'Ohio State travels to Texas')
ok(/2025/.test(game('2026-texas-ohio-state')?.notes || ''), '2025 Ohio State return payment stays in notes')
ok(game('2026-illinois-southern-illinois')?.amount === 525_000 && game('2026-illinois-southern-illinois')?.date === '2026-09-19', 'Illinois → Southern Illinois $525,000')
ok(game('2026-clemson-georgia-southern')?.amount === 1_500_000 && game('2026-clemson-georgia-southern')?.date === '2026-09-12', 'Clemson → Georgia Southern $1,500,000 on Sept. 12')
ok(/not a separate band fee/i.test(game('2026-clemson-georgia-southern')?.notes || ''), 'Clemson notes split complimentary band admission from the guarantee')
ok(game('2026-ohio-state-kent-state')?.amount === 1_900_000 && game('2026-ohio-state-kent-state')?.date === '2026-09-19', 'Ohio State → Kent State $1,900,000 on Sept. 19')
ok(game('2026-ohio-state-kent-state')?.id !== '2026-ohio-state-ball-state', 'Kent State is not a duplicate of Ball State')
ok(!book.games.some((g) => /youngstown/i.test(JSON.stringify(g))), 'Youngstown State is not booked')
ok(book.meta?.asOf === '2026-09-25', 'guarantee desk asOf is 2026-09-25')
ok(!book.games.some((g) => /herosports\.com/i.test(JSON.stringify(g))), 'HERO Sports compilation URL is not booked')
ok(gamesForSchool(book, 'georgia').paid.some((g) => g.amount === 1_900_000), 'Georgia school card shows Western Kentucky')

const zeroIds = new Set(['2026-texas-am-arizona-state', '2026-nc-state-app-state'])
for (const g of book.games) {
  ok(g.season === 2026, `${g.id} is season 2026`)
  ok(g.confidence === 'reported', `${g.id} confidence is reported`)
  ok(hasDollar(g.amount), `${g.id} has a cited football amount (including $0)`)
  ok(g.citeIds?.length, `${g.id} has a cite`)
  const cite = primaryCite(book, g)
  ok(cite?.url, `${g.id} primary cite has a URL`)
  ok(!/on3/i.test(cite?.label || ''), `${g.id} cite is not On3`)
  ok(!/on3\.com/i.test(cite?.url || ''), `${g.id} cite URL is not on3.com`)
  if (g.amount === 0) {
    ok(zeroIds.has(g.id), `${g.id} $0 is a named contract-says-zero row`)
    ok(/\$0|no guarantee/i.test(g.notes || ''), `${g.id} notes say the contract is $0`)
  }
  if (g.payerSchoolId) ok(deskIds.has(g.payerSchoolId), `${g.id} payer ${g.payerSchoolId} is on the 68-school desk`)
  if (g.payeeSchoolId) ok(deskIds.has(g.payeeSchoolId), `${g.id} payee ${g.payeeSchoolId} is on the 68-school desk`)
  if (!g.payeeSchoolId) {
    ok(g.payeeLabel && g.payeeSlug, `${g.id} external payee has a label + slug`)
  }
  ok(g.bandAmount == null || g.id === '2026-miami-famu', `${g.id} does not invent a band fee`)
}

ok(!book.games.some((g) => /on3/i.test(JSON.stringify(g))), 'no On3 on game rows')
ok(!Object.values(book.cites || {}).some((c) => /on3/i.test(`${c.label} ${c.url}`)), 'no On3 in cites')

const miamiSchool = gamesForSchool(book, 'miami')
ok(miamiSchool.paid.length === 1 && miamiSchool.paid[0].amount === 720_000, 'Miami school card paid $720k')
ok(miamiSchool.received.length === 0, 'Miami has no received row')
ok(schoolHasGames(book, 'duke'), 'Duke has guarantee rows')
ok(gamesForSchool(book, 'duke').paid.some((g) => g.amount === 400_000), 'Duke paid W&M')
ok(gamesForSchool(book, 'duke').received.some((g) => g.amount === 250_000), 'Duke received Illinois $250k')
ok(gamesForSchool(book, 'nc-state').received.some((g) => g.payerSchoolId === 'vanderbilt'), 'NC State received Vanderbilt')
ok(!schoolHasGames(book, 'alabama'), 'Alabama has no invented row')

const sorted = sortGames(listGames(book), { key: 'amount', dir: 'desc' })
ok(sorted[0]?.amount === 1_900_000, 'amount desc puts OSU $1.9M first')
ok(partyLabel(miami, 'payee') === 'Florida A&M', 'external FAMU label')
ok(party(game('2026-illinois-duke'), 'payee', schools.schools).onDesk, 'Duke payee is on the desk')
ok(footballGuarantee(miami) === 720_000, 'footballGuarantee ignores band')

const tapeKinds = (tape.items || []).filter((it) => it.kind === 'guarantee-game')
ok(tapeKinds.length >= book.games.length, `tape has a guarantee-game item per game (got ${tapeKinds.length})`)
ok(tapeKinds.some((it) => it.school === 'miami' && it.figure === 720_000), 'tape books Miami $720k football')
ok(tapeKinds.some((it) => it.id === 'indiana-guarantee-2026-indiana-howard' && it.figure === 525_000 && it.date === '2025-08-18'), 'tape books Indiana–Howard $525k')
ok(tapeKinds.some((it) => it.id === 'rutgers-guarantee-2026-rutgers-howard' && it.figure === 475_000 && it.date === '2024-08-03'), 'tape books Rutgers–Howard $475k from the original contract date')
ok(tapeKinds.some((it) => it.id === 'florida-state-guarantee-2026-florida-state-central-arkansas' && it.figure === 450_000), 'tape books FSU–Central Arkansas')
ok(tapeKinds.some((it) => it.id === 'ohio-state-guarantee-2026-ohio-state-kent-state' && it.figure === 1_900_000), 'tape books Ohio State–Kent State')
ok(tapeKinds.some((it) => it.id === 'texas-guarantee-2026-texas-ohio-state' && it.figure === 500_000), 'tape books Texas–Ohio State travel payment')
ok(!tapeKinds.some((it) => it.figure === 740_000), 'tape does not book social $740k')
ok(tape.meta?.itemCount === tape.items.length, 'tape itemCount matches items')

ok(DEFS.guaranteeGames, 'definition present')
ok(/not House spent/i.test(DEFS.guaranteeGames.text), 'definition separates House spent')
ok(/not booked NIL/i.test(DEFS.guaranteeGames.text), 'definition separates booked NIL')
ok(/band/i.test(DEFS.guaranteeGames.text), 'definition separates band')
ok(!/On3/i.test(DEFS.guaranteeGames.text), 'definition has no On3')

ok(app.includes('/guarantee-games'), 'App has the board route')
ok(html.includes('href="/guarantee-games"'), 'nav has Guarantees')
ok(html.includes('Guarantee games — Public Cap'), 'index.html first-paints /guarantee-games')
ok(schoolPage.includes('GuaranteeSchoolSection'), 'school page surfaces the lane')
ok(methods.includes('/guarantee-games'), 'Methods names the board')
ok(/Football guarantee/i.test(page) && /band/i.test(page), 'board copy splits football vs band')
ok(/not House spent/i.test(page) && /not booked NIL/i.test(page), 'board copy splits House / NIL')
ok(!/On3/i.test(page), 'no On3 on the page')
ok(shareLib.includes('guaranteeGames'), 'share.js has the route title')
ok(seo.includes("PAGE_TITLES.guaranteeGames"), 'verify-seo covers the new title')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length) process.exit(1)
