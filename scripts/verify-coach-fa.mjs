/**
 * Coach free-agent / offset lane honesty.
 * Run: node scripts/verify-coach-fa.mjs
 */
import { readFileSync } from 'node:fs'
import { DEFS } from '../src/lib/definitions.js'
import {
  DEFAULT_COACH,
  allInToFan,
  inheritStatus,
  listCoaches,
  netCostToA,
  offsetCredit,
  parseMoneyInput,
  resolveScenario,
  sharePath,
  totalCompCostToB,
} from '../src/lib/coachFa.js'

const book = JSON.parse(readFileSync(new URL('../data/coach-fa.json', import.meta.url), 'utf8'))
const pub = JSON.parse(readFileSync(new URL('../public/data/coach-fa.json', import.meta.url), 'utf8'))
const page = readFileSync(new URL('../src/pages/CoachFa.jsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const redirects = readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8')

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

ok(JSON.stringify(book) === JSON.stringify(pub), 'data/coach-fa.json synced to public/data')
ok(book.meta?.defaultCoach === 'jimbo-fisher', 'default coach is jimbo-fisher')
ok(Object.keys(book.coaches).length === 1, 'only Fisher is seeded')

const fisher = book.coaches['jimbo-fisher']
ok(fisher?.name === 'Jimbo Fisher', 'Fisher name')
ok(fisher.status === 'free-agent', 'Fisher is free-agent')
ok(fisher.priorSchoolId === 'texas-am', 'prior school is texas-am')
ok(fisher.tapeId === 'texas-am-paid-buyout-fisher-2026-03-03', 'tape pointer')
ok(fisher.buyout?.grossRemaining === 77_562_500, 'gross remaining $77,562,500')
ok(fisher.buyout?.grossRemainingKind === 'booked-at-termination', 'labeled booked-at-termination')
ok(fisher.buyout?.firedOn === '2023-11-12', 'fired 2023-11-12')
ok(fisher.buyout?.confidence === 'booked', 'A residual is booked')
ok(fisher.buyout?.schedule?.[0]?.amount === 19_390_625, '25% lump')
ok(fisher.buyout?.schedule?.[1]?.amount === 7_271_484, 'annual installment')
ok(fisher.buyout?.schedule?.[1]?.count === 8, 'eight annuals')
ok(fisher.offset?.offsetFormula === 'none', 'offset formula none')
ok(fisher.offset?.offsetApplies === false, 'offset does not apply')
ok(/offset whatsoever/i.test(fisher.offset?.rule || ''), 'quotes no-offset clause')
ok(fisher.defaultScenario?.schoolBId === 'florida-state', 'default School B is florida-state')
ok(fisher.defaultScenario?.annualSalary == null, 'B salary empty until typed')

const citeUrls = Object.values(book.cites || {}).map((c) => c.url)
ok(citeUrls.includes('https://law.marquette.edu/assets/sports-law/pdf/gcc-Mitigation-Clauses-in-College-Football.pdf'), 'Marquette cite')
ok(citeUrls.some((u) => u.includes('jimbo-fishers-75-m-deal')), 'USA TODAY 2018 cite')
ok(citeUrls.some((u) => u.includes('cbssports.com') && u.includes('jimbo-fisher-buyout')), 'CBS cite')
ok(citeUrls.some((u) => u.includes('espn.com') && u.includes('38886070')), 'ESPN cite')

const none = offsetCredit({ offset: fisher.offset, bAnnual: 8_000_000, termYears: 4 })
ok(none.value === 0, 'no-offset credit is 0 even with a B salary')
ok(none.confidence === 'booked', 'no-offset credit stays booked')

const sitting = offsetCredit({
  offset: { offsetFormula: 'dollar-for-dollar', offsetApplies: true, confidence: 'booked' },
  bAnnual: 8_000_000,
  termYears: 2,
})
ok(sitting.value === 16_000_000, 'dollar-for-dollar overlap uses B × years')
ok(sitting.confidence === 'modeled', 'sitting-HC offset credit is modeled')

const net = netCostToA({
  grossRemaining: fisher.buyout.grossRemaining,
  offsetCredit: none,
  aConfidence: 'booked',
})
ok(net.value === 77_562_500, 'net cost to A equals residual when offset is none')
ok(net.confidence === 'booked', 'net cost stays booked')

ok(totalCompCostToB({}).confidence === 'pending', 'B cost pending without salary')
ok(totalCompCostToB({}).value == null, 'B cost empty without salary')
ok(totalCompCostToB({ annual: 8_000_000 }).value === 8_000_000, 'B annual')
ok(totalCompCostToB({ annual: 8_000_000, termYears: 5 }).value === 40_000_000, 'B term total')

const empty = resolveScenario(fisher, { schoolBId: 'florida-state' })
ok(empty.netCostToA.value === 77_562_500, 'typed-empty scenario leaves A residual')
ok(empty.totalCompCostToB.value == null, 'B stays pending until typed')
ok(empty.allInToFan.shown === false, 'all-in off by default')

const typed = resolveScenario(fisher, {
  schoolBId: 'florida-state',
  annualSalary: 8_000_000,
  termYears: 4,
  allIn: true,
})
ok(typed.netCostToA.value === 77_562_500, 'A residual unchanged after modeled B salary')
ok(typed.offsetCredit.value === 0, 'offset credit still 0')
ok(typed.totalCompCostToB.value === 32_000_000, 'B term total modeled')
ok(typed.allInToFan.value === 77_562_500 + 32_000_000, 'all-in is A + B')
ok(typed.allInToFan.confidence === 'modeled', 'all-in is modeled (two payers, one modeled)')

ok(inheritStatus('booked', 'booked') === 'booked', 'booked ∧ booked')
ok(inheritStatus('booked', 'modeled') === 'modeled', 'any modeled')
ok(inheritStatus('booked', 'pending') === 'pending', 'missing required → pending')

ok(parseMoneyInput('8M') === 8_000_000, 'parses 8M')
ok(parseMoneyInput('$7,271,484') === 7_271_484, 'parses $7,271,484')
ok(sharePath(DEFAULT_COACH) === '/coach-fa/jimbo-fisher', 'share path')

ok(DEFS.coachFa && DEFS.offsetCredit && DEFS.netCostToA && DEFS.allInToFan && DEFS.compBand, 'definitions present')
ok(!/On3/i.test(page) && !/On3/i.test(JSON.stringify(book)), 'no On3 mention')
ok(app.includes('/coach-fa/:coachId'), 'App has detail route')
ok(html.includes('href="/coach-fa"'), 'nav has Offsets')
ok(/\/coach-fa\/\*\s+\/index\.html\s+200/.test(redirects), 'SPA rewrite for /coach-fa/*')
ok(listCoaches(book)[0].id === 'jimbo-fisher', 'Fisher first on the index')
ok(fisher.compBand?.peers?.length === 5, 'five comp peers')
ok(fisher.compBand?.confidence === 'modeled', 'comp band is modeled')
ok(!/on3/i.test(page + JSON.stringify(book) + JSON.stringify(DEFS.coachFa)), 'no On3 in lane copy')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length) process.exit(1)
