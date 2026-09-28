/**
 * Checkbook bowl: the bigger FY2025 football spender vs the score.
 * Season record through week 3 is 15-10 (60%) in 25 final games.
 * Week 4 is final: bigger spender 7-7, season 22-17 in 39 final games.
 * Week 5 (Oct 3–4) is upcoming: 14 big games, no scores.
 * Dollars are the EADA integers on the book — nothing estimated.
 *
 * Run: node scripts/verify-checkbook-bowl.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  biggerSpenderId,
  compareHref,
  deriveGame,
  FOOTBALL_REVENUE_LABEL,
  FOOTBALL_SPEND_LABEL,
  footballSpendField,
  isFinal,
  seasonRecord,
  upsetGames,
  weekRecords,
} from '../src/lib/checkbookBowl.js'
import { buildBook, loadBook } from './checkbook-bowl.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

const book = loadBook()
const pub = JSON.parse(read('public/data/checkbook-bowl.json'))
const schools = JSON.parse(read('data/schools.json'))
const schoolIds = new Set(schools.schools.map((s) => s.id))

ok(JSON.stringify(book) === JSON.stringify(pub), 'data/checkbook-bowl.json synced to public/data')
ok(JSON.stringify(buildBook(book)) === JSON.stringify(book), 'book matches what --write would emit')
ok(book.season === 2026, 'season is 2026')
ok(book.asOf === '2026-09-28', 'book as-of is the day Week 4 finals were logged')
ok(/EADA/.test(book.method) && /AP top 25/.test(book.method), 'method names the big-game rule')
ok(/TOTAL_EXPENSE_ALL_Football/.test(book.source) && /FY2025/.test(book.source), 'source names the EADA filing')
ok(/Weeks 1–4 are final/.test(book.source), 'source says weeks 1–4 are final')
ok(!/Week 4 was not final/.test(book.source), 'source no longer says week 4 was not final')
ok(!/estimat/i.test(book.method), 'method does not estimate')

ok(schoolIds.size === 68, 'desk still has 68 schools')
ok(Object.keys(book.spendFy2025).length === 68, 'spend map has 68 schools')
for (const id of schoolIds) {
  ok(Number.isInteger(book.spendFy2025[id]) && book.spendFy2025[id] > 0, `${id} has a positive EADA football expense`)
}

ok(book.games.length === 53, 'book has 39 finals through week 4 plus 14 week-5 upcoming games')

for (const game of book.games) {
  const label = `${game.away.id} at ${game.home.id} wk${game.week}`
  ok(schoolIds.has(game.home.id) && schoolIds.has(game.away.id), `${label} is two desk schools`)
  ok(game.home.spend === book.spendFy2025[game.home.id], `${label} home spend is the EADA map`)
  ok(game.away.spend === book.spendFy2025[game.away.id], `${label} away spend is the EADA map`)
  ok(game.gap === Math.abs(game.home.spend - game.away.spend), `${label} gap is the spend difference`)
  ok(game.home.spend !== game.away.spend, `${label} has a bigger spender`)
  ok(game.home.rank != null || game.away.rank != null, `${label} has an AP rank`)
  for (const side of [game.home, game.away]) {
    if (side.rank != null) ok(Number.isInteger(side.rank) && side.rank >= 1 && side.rank <= 25, `${side.id} rank is AP top 25`)
  }
  if (isFinal(game)) {
    ok(Number.isInteger(game.home.score) && Number.isInteger(game.away.score), `${label} has integer scores`)
    ok(game.home.score !== game.away.score, `${label} is not a tie`)
    const winner = game.home.score > game.away.score ? game.home.id : game.away.id
    ok(game.winner === winner, `${label} winner matches the score`)
    ok(game.biggerSpenderWon === (winner === biggerSpenderId(game)), `${label} biggerSpenderWon matches spend and score`)
  } else {
    ok(game.winner == null && game.biggerSpenderWon == null, `${label} upcoming has no result`)
    ok(game.home.score == null && game.away.score == null, `${label} upcoming has no score`)
  }
}

const through = seasonRecord(book.games, 3)
ok(through.games === 25 && through.wins === 15 && through.losses === 10, 'through week 3 the bigger spender is 15-10')
ok(Math.round(through.rate * 100) === 60, 'through week 3 win rate is 60%')
ok(book.games.filter((g) => g.week <= 4).every(isFinal), 'weeks 1–4 are final')
ok(book.games.filter((g) => !isFinal(g)).length === 14, 'week 5 upcoming games are on the book')
ok(book.games.filter((g) => g.week === 5 && !isFinal(g)).length === 14, 'all 14 week-5 games are upcoming')
ok(book.games.filter((g) => g.week === 5 && isFinal(g)).length === 0, 'week 5 has no final score')

const weeks = weekRecords(book.games)
ok(weeks.find((w) => w.week === 1).wins === 3 && weeks.find((w) => w.week === 1).losses === 2, 'week 1 is 3-2')
ok(weeks.find((w) => w.week === 2).wins === 6 && weeks.find((w) => w.week === 2).losses === 4, 'week 2 is 6-4')
ok(weeks.find((w) => w.week === 3).wins === 6 && weeks.find((w) => w.week === 3).losses === 4, 'week 3 is 6-4')
ok(weeks.find((w) => w.week === 4).wins === 7 && weeks.find((w) => w.week === 4).losses === 7, 'week 4 is 7-7')
ok(weeks.find((w) => w.week === 4).upcoming === 0 && weeks.find((w) => w.week === 4).games === 14, 'week 4 has 14 finals')
const season = seasonRecord(book.games)
ok(season.games === 39 && season.wins === 22 && season.losses === 17, 'season record is 22-17')

const upsets = upsetGames(book.games)
ok(upsets.length === 17, 'seventeen upsets')
ok(
  upsets.map((g) => g.gap).join(',') ===
    [37952337, 36482649, 30398139, 28016855, 21953681, 16948229, 15960317, 14570462, 13167500, 11740564, 10768772, 10080023, 9521640, 9491559, 1907982, 1765733, 77122].join(','),
  'upsets sort by the logged gaps, largest first',
)
ok(upsets[0].winner === 'smu' && upsets[0].away.id === 'smu' && upsets[0].home.id === 'florida-state', 'biggest upset is SMU over Florida State')
ok(upsets[0].away.score === 27 && upsets[0].home.score === 24, 'SMU 27, Florida State 24')
ok(upsets[0].away.spend === 45315587 && upsets[0].home.spend === 83267924, 'SMU and Florida State keep the filed expenses')

function find(away, home) {
  return book.games.find((g) => g.away.id === away && g.home.id === home)
}

const miami = find('miami', 'stanford')
ok(miami.biggerSpenderWon === true && miami.gap === 52125937, 'Miami checkbook win at Stanford, gap 52125937')
ok(miami.away.score === 45 && miami.home.score === 6 && miami.away.spend === 88117956, 'Miami 45, Stanford 6, Miami spend 88117956')

const clemson = find('clemson', 'lsu')
ok(clemson.biggerSpenderWon === false && clemson.winner === 'lsu' && clemson.gap === 30398139, 'LSU upset Clemson')

const nd = find('wisconsin', 'notre-dame')
ok(nd.neutral === true && nd.biggerSpenderWon === true && nd.gap === 52352349, 'Wisconsin at Notre Dame was neutral and a checkbook win')

// Saturday 9/26 board. Exact EADA integers, not the rounded millions on the graphic.
const saturday = [
  ['texas', 'tennessee', 70405628, 61240437, 9165191, 1, 14],
  ['illinois', 'ohio-state', 48001399, 92359309, 44357910, null, 7],
  ['wake-forest', 'louisville', 39399925, 30745125, 8654800, null, 16],
  ['notre-dame', 'purdue', 93255797, 37193229, 56062568, 3, null],
  ['oklahoma', 'georgia', 71184826, 71107704, 77122, null, 2],
  ['ole-miss', 'florida', 61846036, 51766013, 10080023, 4, 21],
  ['utah', 'iowa-state', 41410554, 32337385, 9073169, 15, null],
  ['iowa', 'michigan', 50894414, 61663186, 10768772, 17, 18],
  ['wisconsin', 'penn-state', 40903448, 77386097, 36482649, null, 13],
  ['south-carolina', 'alabama', 55859501, 81502191, 25642690, null, 8],
  ['texas-am', 'lsu', 60230146, 50738587, 9491559, 23, 10],
  ['oregon', 'usc', 60847472, 74014972, 13167500, 20, 12],
  ['missouri', 'mississippi-state', 49316139, 37575575, 11740564, 19, 24],
]
const saturdayScores = {
  'texas|tennessee': [20, 17, true],
  'illinois|ohio-state': [19, 42, true],
  'wake-forest|louisville': [30, 27, true],
  'notre-dame|purdue': [49, 10, true],
  'oklahoma|georgia': [13, 41, false],
  'ole-miss|florida': [28, 52, false],
  'utah|iowa-state': [31, 17, true],
  'iowa|michigan': [20, 19, false],
  'wisconsin|penn-state': [24, 20, false],
  'south-carolina|alabama': [18, 49, true],
  'texas-am|lsu': [6, 35, false],
  'oregon|usc': [41, 27, false],
  'missouri|mississippi-state': [24, 31, false],
}
for (const [away, home, awaySpend, homeSpend, gap, awayRank, homeRank] of saturday) {
  const game = find(away, home)
  const scored = saturdayScores[`${away}|${home}`]
  ok(game && isFinal(game), `${away} at ${home} is final`)
  ok(game?.away.score === scored?.[0] && game?.home.score === scored?.[1], `${away} at ${home} final score`)
  ok(game?.biggerSpenderWon === scored?.[2], `${away} at ${home} biggerSpenderWon`)
  ok(game?.away.spend === awaySpend && game?.home.spend === homeSpend && game?.gap === gap, `${away} at ${home} spend and gap`)
  ok((game?.away.rank ?? null) === awayRank && (game?.home.rank ?? null) === homeRank, `${away} at ${home} AP ranks`)
  ok(compareHref(game) === `/compare?a=${awaySpend > homeSpend ? away : home}&b=${awaySpend > homeSpend ? home : away}`, `${away} at ${home} compare link leads with the checkbook favorite`)
}

const friday = find('northwestern', 'indiana')
ok(friday && isFinal(friday) && friday.away.score === 23 && friday.home.score === 29, 'Northwestern 23, Indiana 29')
ok(friday.winner === 'indiana' && friday.biggerSpenderWon === true, 'Indiana checkbook win over Northwestern')
ok(friday.gap === 50207544 - 37901761, 'Indiana gap is the difference of the two filings')

const wisconsin = find('wisconsin', 'penn-state')
ok(
  wisconsin.biggerSpenderWon === false && wisconsin.winner === 'wisconsin' && wisconsin.gap === 36482649,
  'Wisconsin over Penn State is the week-4 spending upset',
)
const week4Upsets = upsetGames(book.games.filter((g) => g.week === 4))
ok(week4Upsets[0]?.winner === 'wisconsin' && week4Upsets[0]?.away.id === 'wisconsin' && week4Upsets[0]?.home.id === 'penn-state', 'biggest week-4 upset is Wisconsin over Penn State')

ok(compareHref(upsets[0]) === '/compare?a=florida-state&b=smu', 'upset row links compare with the checkbook favorite first')

const week5 = [
  ['alabama', 'mississippi-state', 7, 16, '2026-10-03T16:00:00.000Z'],
  ['boston-college', 'smu', null, 21, '2026-10-03T16:00:00.000Z'],
  ['notre-dame', 'north-carolina', 3, null, '2026-10-03T16:00:00.000Z'],
  ['ucf', 'houston', null, 20, '2026-10-03T16:00:00.000Z'],
  ['vanderbilt', 'georgia', null, 2, '2026-10-03T16:45:00.000Z'],
  ['auburn', 'tennessee', null, 17, '2026-10-03T19:30:00.000Z'],
  ['florida', 'missouri', 8, 25, '2026-10-03T19:30:00.000Z'],
  ['ohio-state', 'iowa', 5, 14, '2026-10-03T19:30:00.000Z'],
  ['kentucky', 'south-carolina', 24, null, '2026-10-03T20:15:00.000Z'],
  ['byu', 'tcu', 10, null, '2026-10-03T23:00:00.000Z'],
  ['miami', 'clemson', 4, null, '2026-10-03T23:30:00.000Z'],
  ['texas-tech', 'colorado', 12, null, '2026-10-03T23:30:00.000Z'],
  ['washington', 'usc', null, 18, '2026-10-03T23:30:00.000Z'],
  ['indiana', 'rutgers', 6, null, '2026-10-04T00:00:00.000Z'],
]
ok(/Sep 27, 2026/.test(book.source) && /cfbtrack.com\/schedule\/2026\/week-5/.test(book.source), 'week 5 source cites the Sep 27 AP poll and CFBTrack')
for (const [away, home, awayRank, homeRank, date] of week5) {
  const game = find(away, home)
  ok(game && game.week === 5 && !isFinal(game), `${away} at ${home} is a week-5 upcoming game`)
  ok(game?.date === date, `${away} at ${home} kickoff`)
  ok((game?.away.rank ?? null) === awayRank && (game?.home.rank ?? null) === homeRank, `${away} at ${home} Sep 27 AP ranks`)
  ok(game?.away.spend === book.spendFy2025[away] && game?.home.spend === book.spendFy2025[home], `${away} at ${home} uses spendFy2025`)
  ok(game?.winner == null && game?.biggerSpenderWon == null, `${away} at ${home} has no result`)
}

let threw = false
try {
  deriveGame({ date: '2026-10-03T16:00Z', week: 5, home: { id: 'georgia', rank: 1, spend: 1 }, away: { id: 'alabama', rank: 2 } }, book.spendFy2025)
} catch {
  threw = true
}
ok(threw, 'a typed spend that disagrees with EADA is refused')

threw = false
try {
  deriveGame({ date: '2026-10-03T16:00Z', week: 5, home: { id: 'georgia', score: 7 }, away: { id: 'alabama' } }, book.spendFy2025)
} catch {
  threw = true
}
ok(threw, 'a one-score game is refused')

const page = read('src/pages/CheckbookBowl.jsx')
const app = read('src/App.jsx')
const html = read('index.html')
const share = read('src/lib/share.js')
const methods = read('src/pages/Methods.jsx')
const sitemap = read('scripts/write-sitemap.mjs')
ok(page.includes('CHECKBOOK WINS') && page.includes('UPSET'), 'badges say CHECKBOOK WINS and UPSET')
ok(page.includes('Biggest upsets'), 'page has the biggest-upsets list')
ok(page.includes('Upcoming'), 'page has the upcoming section')
ok(page.includes('/school/'), 'matchups link to /school/:id')
ok(page.includes('compareHref'), 'rows link through compareHref')
ok(!page.includes('15-10'), 'the 15-10 record is computed, not hardcoded')
ok(app.includes('/checkbook-bowl'), 'App has the board route')
ok(html.includes('href="/checkbook-bowl"'), 'nav has Checkbook')
ok(html.includes('The checkbook bowl asks whether the bigger football spender won'), 'footer names the checkbook bowl')
ok(html.includes('Does the bigger spender win? — Public Cap'), 'index.html first-paints the title')
ok(share.includes("'/checkbook-bowl'"), 'titleFromPath / descriptionFromPath handle /checkbook-bowl')
ok(methods.includes('/checkbook-bowl'), 'Methods names the board')
ok(sitemap.includes("'/checkbook-bowl'"), 'sitemap static paths include /checkbook-bowl')
ok(read('public/llms.txt').includes('https://thepubliccap.com/checkbook-bowl'), 'llms.txt lists the board')
ok(read('public/sitemap.xml').includes('https://thepubliccap.com/checkbook-bowl'), 'sitemap.xml lists the board')

const schoolPage = read('src/pages/School.jsx')
const chat = read('src/lib/deskChat.js')
ok(schoolPage.includes('{FOOTBALL_SPEND_LABEL}'), 'school page renders the FY2025 football spending label')
ok(schoolPage.includes('{FOOTBALL_REVENUE_LABEL}'), 'school page renders the EADA football revenue label')
ok(read('src/lib/checkbookBowl.js').includes(`'${FOOTBALL_SPEND_LABEL}'`), 'spend label constant is the federal EADA filing line')
ok(FOOTBALL_SPEND_LABEL === 'FY2025 football spending (federal EADA filing)', 'label is the federal EADA filing line')
ok(FOOTBALL_REVENUE_LABEL === 'EADA reported football revenue', 'revenue label names football revenue')
ok(schoolPage.includes('footballSpendField'), 'school page resolves football spending through footballSpendField')
ok(schoolPage.includes('id="slice-eada-football"'), 'private football revenue keeps the eada-football drill target')
ok(schoolPage.includes('id="slice-football-spend"'), 'spending card is its own block')
ok(!schoolPage.includes('EADA football (sport-attributed)'), 'school page does not use the old football eyebrow')
ok(!chat.includes("factLine('EADA football',"), 'desk chat does not label REV_MEN_Football as bare EADA football')
ok(chat.includes("factLine('EADA football revenue'"), 'desk chat labels REV_MEN_Football as football revenue')

let spendShown = 0
for (const school of schools.schools) {
  const field = footballSpendField(school, book.spendFy2025)
  const expense = book.spendFy2025[school.id]
  const revenue = school.capacity?.eadaFootball
  ok(field?.value === expense, `${school.id} spending is spendFy2025`)
  ok(field !== revenue, `${school.id} spending is not the revenue cell`)
  ok(field?.confidence === 'reported', `${school.id} spending is reported`)
  ok(field?.fiscalYear === 'FY2025', `${school.id} spending is FY2025`)
  ok(/TOTAL_EXPENSE_ALL_Football/.test(field?.source || ''), `${school.id} spending cites TOTAL_EXPENSE_ALL_Football`)
  ok(/ope\.ed\.gov\/athletics/.test(field?.url || ''), `${school.id} spending cites the EADA file`)
  ok(!/estimat/i.test(field?.source || '') && !/estimat/i.test(field?.notes || ''), `${school.id} spending is not an estimate`)
  if (revenue?.value != null) {
    ok(revenue.value !== field.value || revenue.value === expense, `${school.id} revenue stays a separate cell`)
  }
  spendShown += 1
}
ok(spendShown === 68, 'all 68 school pages get a spendFy2025 dollar')
ok(footballSpendField({ id: 'not-a-school', capacity: { eadaFootball: { value: 1 } } }, book.spendFy2025) == null, 'revenue without a spend map stays blank')
ok(
  footballSpendField({ id: 'notre-dame', capacity: { eadaFootball: { value: 195723436 } } }, book.spendFy2025).value === 93255797,
  'Notre Dame spending is the expense filing, not REV_MEN_Football',
)
ok(
  footballSpendField({ id: 'alabama', capacity: { eadaFootball: { value: 1 } } }, book.spendFy2025).value === book.spendFy2025.alabama,
  'a revenue cell cannot replace spendFy2025',
)
ok(footballSpendField({ id: 'alabama' }, { alabama: 0 }) == null, 'a non-positive spend map is not shown')
ok(footballSpendField({ id: 'alabama' }, {}) == null, 'a missing spend map is not shown')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length) process.exit(1)
