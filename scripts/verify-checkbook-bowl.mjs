/**
 * Checkbook bowl: the bigger FY2025 football spender vs the score.
 * Season record through ESPN week 3 is 15-10 (60%) in 25 final games.
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
ok(book.asOf === '2026-09-26', 'book as-of is the week-4 board date')
ok(/EADA/.test(book.method) && /AP top 25/.test(book.method), 'method names the big-game rule')
ok(/TOTAL_EXPENSE_ALL_Football/.test(book.source) && /FY2025/.test(book.source), 'source names the EADA filing')
ok(/not final|upcoming/i.test(book.source), 'source says week 4 was not final')
ok(!/estimat/i.test(book.method), 'method does not estimate')

ok(schoolIds.size === 68, 'desk still has 68 schools')
ok(Object.keys(book.spendFy2025).length === 68, 'spend map has 68 schools')
for (const id of schoolIds) {
  ok(Number.isInteger(book.spendFy2025[id]) && book.spendFy2025[id] > 0, `${id} has a positive EADA football expense`)
}

ok(book.games.length === 39, 'book has 39 big games (25 final + 14 upcoming)')

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
ok(book.games.filter((g) => g.week <= 3).every(isFinal), 'weeks 1–3 are final')
ok(book.games.filter((g) => g.week === 4).every((g) => !isFinal(g)), 'week 4 is upcoming')

const weeks = weekRecords(book.games)
ok(weeks.find((w) => w.week === 1).wins === 3 && weeks.find((w) => w.week === 1).losses === 2, 'week 1 is 3-2')
ok(weeks.find((w) => w.week === 2).wins === 6 && weeks.find((w) => w.week === 2).losses === 4, 'week 2 is 6-4')
ok(weeks.find((w) => w.week === 3).wins === 6 && weeks.find((w) => w.week === 3).losses === 4, 'week 3 is 6-4')
ok(weeks.find((w) => w.week === 4).upcoming === 14 && weeks.find((w) => w.week === 4).games === 0, 'week 4 has 14 upcoming')

const upsets = upsetGames(book.games)
ok(upsets.length === 10, 'ten upsets')
ok(
  upsets.map((g) => g.gap).join(',') ===
    [37952337, 30398139, 28016855, 21953681, 16948229, 15960317, 14570462, 9521640, 1907982, 1765733].join(','),
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
for (const [away, home, awaySpend, homeSpend, gap, awayRank, homeRank] of saturday) {
  const game = find(away, home)
  ok(game && !isFinal(game), `${away} at ${home} is upcoming`)
  ok(game?.away.spend === awaySpend && game?.home.spend === homeSpend && game?.gap === gap, `${away} at ${home} spend and gap`)
  ok((game?.away.rank ?? null) === awayRank && (game?.home.rank ?? null) === homeRank, `${away} at ${home} AP ranks`)
  ok(compareHref(game) === `/compare?a=${awaySpend > homeSpend ? away : home}&b=${awaySpend > homeSpend ? home : away}`, `${away} at ${home} compare link leads with the checkbook favorite`)
}

const friday = find('northwestern', 'indiana')
ok(friday && !isFinal(friday) && friday.home.score == null && friday.away.score == null, 'Northwestern at Indiana stays upcoming with no partial score')
ok(friday.gap === 50207544 - 37901761, 'Indiana gap is the difference of the two filings')

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

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length) process.exit(1)
