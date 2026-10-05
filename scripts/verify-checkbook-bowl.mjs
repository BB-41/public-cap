/**
 * Checkbook bowl: the bigger FY2025 football spender vs the score.
 * Season record through week 3 is 15-10 (60%) in 25 final games.
 * Week 4 is final: bigger spender 7-7.
 * Week 5 is final: bigger spender 8-6, season 30-23 in 53 games.
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
ok(book.asOf === '2026-10-05', 'book as-of is the day Week 5 finals were logged')
ok(/EADA/.test(book.method) && /AP top 25/.test(book.method), 'method names the big-game rule')
ok(/Weeks 1–5 are final/.test(book.method), 'method says weeks 1–5 are final')
ok(/TOTAL_EXPENSE_ALL_Football/.test(book.source) && /FY2025/.test(book.source), 'source names the EADA filing')
ok(/Weeks 1–5 are final/.test(book.source), 'source says weeks 1–5 are final')
ok(!/Weeks 1–4 are final/.test(book.source), 'source no longer stops at weeks 1–4')
ok(!/Week 4 was not final/.test(book.source), 'source no longer says week 4 was not final')
ok(!/estimat/i.test(book.method), 'method does not estimate')

ok(schoolIds.size === 68, 'desk still has 68 schools')
ok(Object.keys(book.spendFy2025).length === 68, 'spend map has 68 schools')
for (const id of schoolIds) {
  ok(Number.isInteger(book.spendFy2025[id]) && book.spendFy2025[id] > 0, `${id} has a positive EADA football expense`)
}

ok(book.games.length === 53, 'book has 53 big games, all final through week 5')

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
ok(book.games.filter((g) => g.week <= 5).every(isFinal), 'weeks 1–5 are final')
ok(book.games.filter((g) => !isFinal(g)).length === 0, 'no upcoming games remain on the book')

const weeks = weekRecords(book.games)
ok(weeks.find((w) => w.week === 1).wins === 3 && weeks.find((w) => w.week === 1).losses === 2, 'week 1 is 3-2')
ok(weeks.find((w) => w.week === 2).wins === 6 && weeks.find((w) => w.week === 2).losses === 4, 'week 2 is 6-4')
ok(weeks.find((w) => w.week === 3).wins === 6 && weeks.find((w) => w.week === 3).losses === 4, 'week 3 is 6-4')
ok(weeks.find((w) => w.week === 4).wins === 7 && weeks.find((w) => w.week === 4).losses === 7, 'week 4 is 7-7')
ok(weeks.find((w) => w.week === 4).upcoming === 0 && weeks.find((w) => w.week === 4).games === 14, 'week 4 has 14 finals')
ok(weeks.find((w) => w.week === 5).wins === 8 && weeks.find((w) => w.week === 5).losses === 6, 'week 5 is 8-6')
ok(weeks.find((w) => w.week === 5).upcoming === 0 && weeks.find((w) => w.week === 5).games === 14, 'week 5 has 14 finals')
const season = seasonRecord(book.games)
ok(season.games === 53 && season.wins === 30 && season.losses === 23, 'season record is 30-23')
ok(seasonRecord(book.games, 4).wins === 22 && seasonRecord(book.games, 4).losses === 17, 'through week 4 the bigger spender is still 22-17')

const upsets = upsetGames(book.games)
ok(upsets.length === 23, 'twenty-three upsets')
ok(
  upsets.map((g) => g.gap).join(',') ===
    [37952337, 36482649, 30398139, 28016855, 25715410, 21953681, 16948229, 15960317, 15423774, 15007307, 14570462, 13167500, 12577584, 11740564, 10768772, 10080023, 9521640, 9491559, 3059357, 2449874, 1907982, 1765733, 77122].join(','),
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

// Saturday 10/3 board. Scores are the ESPN scoreboard finals for 2026-10-03.
// Kickoff times are the desk slate. Spend is spendFy2025, not a typed estimate.
const week5 = [
  ['notre-dame', 'north-carolina', 93255797, 49145749, 44110048, 3, null],
  ['alabama', 'mississippi-state', 81502191, 37575575, 43926616, 7, 16],
  ['ucf', 'houston', 38695138, 23271364, 15423774, null, 20],
  ['boston-college', 'smu', 41224780, 45315587, 4090807, null, 21],
  ['vanderbilt', 'georgia', 44124525, 71107704, 26983179, null, 2],
  ['ohio-state', 'iowa', 92359309, 50894414, 41464895, 5, 14],
  ['florida', 'missouri', 51766013, 49316139, 2449874, 8, 25],
  ['auburn', 'tennessee', 58724402, 61240437, 2516035, null, 17],
  ['kentucky', 'south-carolina', 43281917, 55859501, 12577584, 24, null],
  ['byu', 'tcu', 44561032, 59568339, 15007307, 10, null],
  ['miami', 'clemson', 88117956, 81136726, 6981230, 4, null],
  ['texas-tech', 'colorado', 39745662, 42805019, 3059357, 12, null],
  ['washington', 'usc', 68921774, 74014972, 5093198, null, 18],
  ['indiana', 'rutgers', 50207544, 75922954, 25715410, 6, null],
]
const week5Scores = {
  'notre-dame|north-carolina': [37, 26, true],
  'alabama|mississippi-state': [56, 23, true],
  'ucf|houston': [17, 27, false],
  'boston-college|smu': [16, 25, true],
  'vanderbilt|georgia': [14, 38, true],
  'ohio-state|iowa': [31, 14, true],
  'florida|missouri': [17, 45, false],
  'auburn|tennessee': [14, 24, true],
  'kentucky|south-carolina': [35, 34, false],
  'byu|tcu': [17, 10, false],
  'miami|clemson': [41, 13, true],
  'texas-tech|colorado': [29, 7, false],
  'washington|usc': [21, 25, true],
  'indiana|rutgers': [47, 15, false],
}
for (const [away, home, awaySpend, homeSpend, gap, awayRank, homeRank] of week5) {
  const game = find(away, home)
  const scored = week5Scores[`${away}|${home}`]
  ok(game && game.week === 5 && isFinal(game), `${away} at ${home} is a week-5 final`)
  ok(game?.away.score === scored?.[0] && game?.home.score === scored?.[1], `${away} at ${home} final score`)
  ok(game?.biggerSpenderWon === scored?.[2], `${away} at ${home} biggerSpenderWon`)
  ok(game?.away.spend === awaySpend && game?.home.spend === homeSpend && game?.gap === gap, `${away} at ${home} spend and gap`)
  ok((game?.away.rank ?? null) === awayRank && (game?.home.rank ?? null) === homeRank, `${away} at ${home} AP ranks`)
  ok(compareHref(game) === `/compare?a=${awaySpend > homeSpend ? away : home}&b=${awaySpend > homeSpend ? home : away}`, `${away} at ${home} compare link leads with the checkbook favorite`)
}

const indiana = find('indiana', 'rutgers')
ok(indiana.away.score === 47 && indiana.home.score === 15 && indiana.winner === 'indiana', 'Indiana 47, Rutgers 15')
ok(indiana.biggerSpenderWon === false && indiana.gap === 75922954 - 50207544, 'Indiana is the week-5 spending upset at Rutgers')
ok(indiana.away.spend === 50207544 && indiana.home.spend === 75922954, 'Indiana and Rutgers keep the filed expenses')
const week5Upsets = upsetGames(book.games.filter((g) => g.week === 5))
ok(week5Upsets.length === 6, 'week 5 has six upsets')
ok(week5Upsets[0]?.winner === 'indiana' && week5Upsets[0]?.away.id === 'indiana' && week5Upsets[0]?.home.id === 'rutgers', 'biggest week-5 upset is Indiana over Rutgers')
ok(
  week5Upsets.map((g) => g.winner).join(',') === 'indiana,houston,byu,kentucky,texas-tech,missouri',
  'week-5 upsets are the cheaper teams, largest gap first',
)

ok(compareHref(upsets[0]) === '/compare?a=florida-state&b=smu', 'upset row links compare with the checkbook favorite first')

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
