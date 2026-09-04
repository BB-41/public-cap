/**
 * Coach free-agent / offset lane honesty.
 * Run: node scripts/verify-coach-fa.mjs
 */
import { readFileSync } from 'node:fs'
import { DEFS } from '../src/lib/definitions.js'
import {
  DEFAULT_COACH,
  inheritStatus,
  listCoaches,
  netCostToA,
  normalizeOffsetFormula,
  offsetCredit,
  offsetLabel,
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
ok(Object.keys(book.coaches).length === 7, 'seven chairs on the desk')

const ids = [
  'jimbo-fisher',
  'brian-kelly',
  'jonathan-smith',
  'hugh-freeze',
  'mike-gundy',
  'justin-wilcox',
  'deshaun-foster',
]
for (const id of ids) {
  const c = book.coaches[id]
  ok(c?.status === 'free-agent', `${id} is free-agent`)
  ok(c?.defaultScenario?.annualSalary == null, `${id} B salary empty`)
  ok(c?.buyout?.confidence === 'booked' || c?.buyout?.confidence === 'reported', `${id} A residual cited`)
  ok(c?.buyout?.notes?.includes('not ledger-verified') || c?.buyout?.notes?.includes('do not invent'), `${id} refuses today’s principal`)
}

const fisher = book.coaches['jimbo-fisher']
ok(fisher.priorSchoolId === 'texas-am', 'Fisher prior texas-am')
ok(fisher.buyout?.grossRemaining === 77_562_500, 'Fisher $77,562,500')
ok(fisher.offset?.offsetFormula === 'none', 'Fisher offset none')

const kelly = book.coaches['brian-kelly']
ok(kelly.priorSchoolId === 'lsu', 'Kelly prior lsu')
ok(kelly.buyout?.firedOn === '2025-10-26', 'Kelly fired 2025-10-26')
ok(kelly.buyout?.grossRemaining === 53_200_000, 'Kelly Athletic $53.2M')
ok(kelly.buyout?.confidence === 'reported', 'Kelly residual reported')
ok(kelly.buyout?.rangeHigh === 54_000_000, 'Kelly range notes $54M')
ok(normalizeOffsetFormula(kelly.offset?.offsetFormula) === 'dollar-for-dollar', 'Kelly dollar-for-dollar')
ok(/unpaid Memphis/i.test(kelly.offset?.rule || ''), 'Kelly Memphis unpaid does not clear offset')

const smith = book.coaches['jonathan-smith']
ok(smith.priorSchoolId === 'michigan-state', 'Smith prior michigan-state')
ok(smith.buyout?.firedOn === '2025-11-30', 'Smith fired 2025-11-30')
ok(smith.buyout?.grossRemaining === 33_000_000, 'Smith Athletic $33M')
ok(smith.buyout?.rangeHigh === 33_500_000, 'Smith range ~$33.5M')
ok(normalizeOffsetFormula(smith.offset?.offsetFormula) === 'dollar-for-dollar', 'Smith offset')

const freeze = book.coaches['hugh-freeze']
ok(freeze.priorSchoolId === 'auburn', 'Freeze prior auburn')
ok(freeze.buyout?.firedOn === '2025-11-02', 'Freeze fired 2025-11-02')
ok(freeze.buyout?.grossRemaining === 15_800_000, 'Freeze $15.8M')
ok(freeze.offset?.offsetFormula === 'none', 'Freeze no offset')
ok(freeze.offset?.offsetApplies === false, 'Freeze offsetApplies false')
ok(freeze.buyout?.schedule?.[0]?.amount === 408_974, 'Freeze monthly from Advertiser')

const gundy = book.coaches['mike-gundy']
ok(gundy.priorSchoolId === 'oklahoma-state', 'Gundy prior oklahoma-state')
ok(gundy.buyout?.firedOn === '2025-09-23', 'Gundy parted 2025-09-23')
ok(gundy.buyout?.grossRemaining === 15_000_000, 'Gundy $15M flat')
ok(normalizeOffsetFormula(gundy.offset?.offsetFormula) === 'dollar-for-dollar', 'Gundy offset')

const wilcox = book.coaches['justin-wilcox']
ok(wilcox.priorSchoolId === 'california', 'Wilcox prior california')
ok(wilcox.buyout?.firedOn === '2025-11-23', 'Wilcox fired 2025-11-23')
ok(wilcox.buyout?.grossRemaining === 10_800_000, 'Wilcox Athletic $10.8M')
ok(wilcox.buyout?.rangeHigh === 10_879_167, 'Wilcox USAT $10,879,167 in range')
ok(normalizeOffsetFormula(wilcox.offset?.offsetFormula) === 'dollar-for-dollar', 'Wilcox likely offset')

const foster = book.coaches['deshaun-foster']
ok(foster.priorSchoolId === 'ucla', 'Foster prior ucla')
ok(foster.buyout?.firedOn === '2025-09-14', 'Foster fired 2025-09-14')
ok(foster.buyout?.grossRemaining === 7_400_000, 'Foster Athletic $7.4M')
ok(foster.buyout?.rangeLow === 5_000_000, 'Foster range notes $5M')
ok(/do not invent a reconciled total/i.test(foster.buyout?.notes || ''), 'Foster refuses a reconciled total')
ok(normalizeOffsetFormula(foster.offset?.offsetFormula) === 'dollar-for-dollar', 'Foster offset')

ok(!book.coaches['bryan-harsin'], 'Harsin skipped — remaining balance not cited')

const none = offsetCredit({ offset: fisher.offset, bAnnual: 8_000_000, termYears: 4 })
ok(none.value === 0, 'no-offset credit is 0 even with a B salary')
ok(none.confidence === 'booked', 'no-offset credit stays booked')

const freezeNone = offsetCredit({ offset: freeze.offset, bAnnual: 8_000_000 })
ok(freezeNone.value === 0, 'Freeze credit 0 with a modeled B salary')
ok(resolveScenario(freeze, { annualSalary: 8_000_000 }).netCostToA.value === 15_800_000, 'Freeze A residual unchanged')

const sitting = offsetCredit({
  offset: { offsetFormula: 'dollar_for_dollar', offsetApplies: true, confidence: 'reported' },
  bAnnual: 8_000_000,
  termYears: 2,
})
ok(sitting.value === 16_000_000, 'dollar_for_dollar alias uses B × years')
ok(sitting.confidence === 'modeled', 'sitting-HC offset credit is modeled')

const kellyEmpty = resolveScenario(kelly, { schoolBId: 'florida-state' })
ok(kellyEmpty.netCostToA.value == null, 'Kelly net pending without B salary')
ok(kellyEmpty.offsetCredit.value == null, 'Kelly offset credit pending without B')
const kellyTyped = resolveScenario(kelly, { annualSalary: 8_000_000 })
ok(kellyTyped.offsetCredit.value === 8_000_000, 'Kelly offset credit = modeled B annual')
ok(kellyTyped.netCostToA.value === 53_200_000 - 8_000_000, 'Kelly net = residual − credit')
ok(kellyTyped.netCostToA.confidence === 'modeled', 'Kelly net is modeled')

ok(totalCompCostToB({}).value == null, 'B cost empty without salary')
ok(inheritStatus('booked', 'booked') === 'booked', 'booked ∧ booked')
ok(inheritStatus('reported', 'reported') === 'reported', 'reported ∧ reported')
ok(inheritStatus('booked', 'modeled') === 'modeled', 'any modeled')
ok(inheritStatus('booked', 'pending') === 'pending', 'missing required → pending')

ok(parseMoneyInput('8M') === 8_000_000, 'parses 8M')
ok(sharePath(DEFAULT_COACH) === '/coach-fa/jimbo-fisher', 'share path')
ok(offsetLabel(freeze.offset) === 'None', 'Freeze label None')
ok(offsetLabel(kelly.offset) === 'Dollar-for-dollar', 'Kelly label Dollar-for-dollar')

ok(DEFS.coachFa && DEFS.offsetCredit && DEFS.netCostToA && DEFS.allInToFan && DEFS.compBand, 'definitions present')
ok(!/On3/i.test(page), 'no On3 on the page')
ok(!Object.values(book.cites || {}).some((c) => /on3/i.test(c.label || '')), 'no On3 in cite labels')
ok(!/on3\.com/i.test(JSON.stringify(book.cites)), 'no on3.com URLs (other outlets used)')
ok(app.includes('/coach-fa/:coachId'), 'App has detail route')
ok(html.includes('href="/coach-fa"'), 'nav has Offsets')
ok(/\/coach-fa\/\*\s+\/index\.html\s+200/.test(redirects), 'SPA rewrite for /coach-fa/*')
ok(listCoaches(book)[0].id === 'jimbo-fisher', 'Fisher first on the index')
ok(listCoaches(book).length === 7, 'index lists seven')
ok(book.compBand?.peers?.length === 5, 'shared comp band')
ok(!/On3/i.test(JSON.stringify(DEFS.coachFa)), 'no On3 in lane definition')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length) process.exit(1)
