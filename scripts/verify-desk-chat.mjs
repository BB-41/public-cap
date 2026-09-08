/**
 * Desk chat stays a local lookup. Booked figures only. No invented leftover.
 * Run: node scripts/verify-desk-chat.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applySeason } from '../src/lib/seasons.js'
import { leadBookedNil, leadHouseRemaining } from '../src/lib/compute.js'
import {
  answerDeskQuestion,
  bookedHouseSpentSchools,
  matchSchools,
  SUGGESTED_PROMPTS,
} from '../src/lib/deskChat.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const desk = JSON.parse(readFileSync(join(root, 'data/schools.json'), 'utf8'))
const tv = JSON.parse(readFileSync(join(root, 'public/data/tv.json'), 'utf8'))
const rosters = JSON.parse(readFileSync(join(root, 'public/data/rosters-2026.json'), 'utf8'))
const coachFa = JSON.parse(readFileSync(join(root, 'public/data/coach-fa.json'), 'utf8'))
const app = readFileSync(join(root, 'src/App.jsx'), 'utf8')
const home = readFileSync(join(root, 'src/pages/Home.jsx'), 'utf8')
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8')
const chatUi = readFileSync(join(root, 'src/components/DeskChat.jsx'), 'utf8')
const chatLib = readFileSync(join(root, 'src/lib/deskChat.js'), 'utf8')

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

function ask(q, extra = {}) {
  return answerDeskQuestion(q, { desk, tv, rosters, coachFa, season: 2026, ...extra })
}

ok(desk.schools.length === 68, '68 schools in the book')
ok(SUGGESTED_PROMPTS.length >= 5, 'suggested prompts exist')

const ids = matchSchools("What's Louisville's leftover", desk.schools)
ok(ids[0] === 'louisville', 'matches Louisville possessive')
ok(matchSchools("What's SMU's conference media", desk.schools)[0] === 'smu', 'matches SMU possessive')
ok(matchSchools("Who is Washington's starting QB", desk.schools)[0] === 'washington', 'matches Washington possessive')
ok(!matchSchools('capacity leftover house cap', desk.schools).length, 'stop words are not schools')

const bookedIds = bookedHouseSpentSchools(desk, 2026)
ok(bookedIds.includes('louisville'), 'Louisville has booked House spent')
ok(bookedIds.includes('kentucky'), 'Kentucky has booked House spent')
ok(bookedIds.includes('texas'), 'Texas has booked House spent')
ok(bookedIds.includes('ucla'), 'UCLA has booked House spent')
ok(bookedIds.includes('california'), 'California has booked House spent')
ok(bookedIds.length === 5, `exactly five booked House spent schools (got ${bookedIds.length})`)
ok(!bookedIds.includes('alabama'), 'Alabama is not in the booked House spent list')

const lou = ask("What's Louisville's leftover / House spent / booked NIL?")
ok(/\$32[.,]?9\s*M|32,900,000|\$32\.9M/i.test(lou.text), `Louisville booked NIL in answer: ${lou.text}`)
ok(/\$20[.,]?2\s*M|20,200,000|\$20\.2M/i.test(lou.text), `Louisville House spent in answer: ${lou.text}`)
ok(/\$300,000|\$0\.3M|\$300k/i.test(lou.text), `Louisville leftover in answer: ${lou.text}`)
ok(/not capacity/i.test(lou.text), 'Louisville leftover refuses capacity − House − NIL')
ok(lou.links.some((l) => l.to.includes('/school/louisville')), 'Louisville answer links the school page')

const list = ask('Which schools have booked House spent?')
ok(/Louisville/.test(list.text) && /Kentucky/.test(list.text) && /Texas/.test(list.text), 'list names the booked schools')
ok(/UCLA/.test(list.text) && /California/.test(list.text), 'list includes UCLA and California')
ok(!/Alabama/.test(list.text), 'list does not invent Alabama House spent')
ok(/\$20\.2M/.test(list.facts?.join(' ') || ''), 'list cites Louisville $20.2M spent')
ok(/\$18\.0M/.test(list.facts?.join(' ') || ''), 'list cites Kentucky $18.0M spent')

const smu = ask("What's SMU's conference media line (and is it full TV)?")
ok(/\$17\.1M|\$17,070,000|17\.07/.test(smu.text), `SMU media dollar: ${smu.text}`)
ok(/not a full/i.test(smu.text), 'SMU is not full TV')
ok(smu.links.some((l) => l.to === '/tv' || l.to.includes('/school/smu')), 'SMU links TV or school')

const qb = ask("Who is Washington's starting QB on the roster?")
ok(/Demond Williams Jr/i.test(qb.text), `Washington QB name: ${qb.text}`)
ok(/not contracts/i.test(qb.text), 'QB answer refuses player-contract dollars')

const cmp = ask("Compare Louisville and Kentucky leftover")
ok(/\$300,000|\$0\.3M|\$300k/.test(cmp.text), `compare leftover Louisville: ${cmp.text}`)
ok(/\$2\.5M|\$2,500,000/.test(cmp.text), `compare leftover Kentucky: ${cmp.text}`)
ok(/Kentucky/.test(cmp.text) && /higher/.test(cmp.text), 'compare says who is higher')
ok(cmp.links.some((l) => l.to.startsWith('/compare')), 'compare links /compare')

const capCmp = ask('Compare Louisville and Kentucky capacity')
ok(/capacity/i.test(capCmp.text), 'capacity compare names the metric')
ok(!/pending/i.test(capCmp.text), 'both capacity cells exist')

const def = ask('What does leftover mean?')
ok(/House/.test(def.text) && /spent/i.test(def.text), `leftover definition: ${def.text}`)
ok(/not pre-cap|only computed|Year 1/i.test(def.text), 'definition stays Methods-accurate')
ok(def.links.some((l) => l.to === '/methods'), 'definition links Methods')

const ala = ask("What's Alabama's leftover?")
ok(/pending/i.test(ala.text), `Alabama leftover stays pending: ${ala.text}`)
ok(!/\$\d/.test(ala.text), 'Alabama leftover invents no leftover dollar')
ok(ala.links.some((l) => l.to.includes('/school/alabama')), 'Alabama leftover points at the school page')

const alaNil = ask("What's Alabama's booked NIL?")
ok(/pending/i.test(alaNil.text), 'Alabama booked NIL pending')
ok(!/modeled NIL is \$/.test(alaNil.text), 'pending booked NIL does not dump a modeled dollar')
ok(/modeled/i.test(alaNil.text), 'pending booked NIL still names the modeled lane as separate')

const modeled = ask("What's Alabama's modeled NIL?")
ok(/modeled/i.test(modeled.text), 'modeled question is labeled modeled')
ok(/not booked|not a filing|heuristic/i.test(modeled.text), 'modeled stays labeled')

const on3 = ask('What is the On3 NIL ranking for Texas?')
ok(on3.refuse, 'On3 is refused')
ok(/does not carry On3/i.test(on3.text), 'On3 refusal names the policy')
ok(!/franchise/i.test(ask('Give me Texas franchise valuation').text) || ask('Give me Texas franchise valuation').refuse, 'franchise valuation refused')

const franchise = ask('What is Texas franchise valuation?')
ok(franchise.refuse, 'franchise valuation is refused')

const psu = ask("What's Penn State's leftover?")
ok(/pending/i.test(psu.text), 'Penn State leftover pending — Item 44 is not House Year 1')

const marks = ask('What is booked vs modeled vs pending?')
ok(/pending/i.test(marks.text) && /modeled/i.test(marks.text) && /reported/i.test(marks.text), 'marks answer names reported / modeled / pending')
ok(/On3/i.test(marks.text) && /does not/i.test(marks.text), 'coverage says the desk does not carry On3')
ok(/House remaining|House cap minus|booked House spent/i.test(marks.text), 'coverage names leftover as House remaining')
ok(/overhang/i.test(marks.text) && /not yearly spend/i.test(marks.text), 'coverage says buyouts are overhang')
ok(!/\$13\.5/.test(marks.text), 'general coverage invents no school dollar')

const lanes = ask('What is leftover vs House spent vs booked NIL?')
ok(/House remaining|cap minus/i.test(lanes.text), 'lanes leftover is House remaining')
ok(/not capacity/i.test(lanes.text), 'lanes refuse capacity − House − NIL')

const txNil = ask('What NIL do you have for Texas?')
ok(/\$13\.5M|\$13,500,000/.test(txNil.text), `Texas booked NIL: ${txNil.text}`)
ok(/YTD|year-to-date|Year 1/i.test(txNil.text), 'Texas NIL coverage keeps the YTD / Year 1 label')
ok(/\$7\.0M|\$7,000,000/.test(txNil.text), 'Texas leftover stays $7.0M')
ok(/collective 990/i.test(txNil.text), 'Texas NIL coverage names the 990 lane as separate')
ok(/does not have On3/i.test(txNil.text), 'Texas NIL coverage refuses On3')
ok(/not booked contracts|not a substitute/i.test(txNil.text), 'Texas NIL coverage keeps modeled distinct')
ok(!/will spend \$18|on-track/i.test(txNil.text), 'Texas NIL coverage does not book the cap-plan projection')

const smuMiss = ask('What data is missing for SMU?')
ok(/pending/i.test(smuMiss.text) && /booked NIL/i.test(smuMiss.text), 'SMU missing names booked NIL pending')
ok(/private-school gap|Private institution/i.test(smuMiss.text), 'SMU missing uses the private-gap note')
ok(/tickets|sponsorships|contributions/i.test(smuMiss.text), 'SMU missing names the pending capacity lines')
ok(/\$17\.1M|\$17,070,000|17\.07/.test(smuMiss.text), 'SMU missing still cites the on-desk media 990')
ok(/buyout/i.test(smuMiss.text) && /pending/i.test(smuMiss.facts?.join(' ') || smuMiss.text), 'SMU buyout stays pending')
ok(smuMiss.links.some((l) => l.to.includes('/school/smu')), 'SMU missing links the school page')
ok(!/On3/.test(smuMiss.text) || /does not/.test(smuMiss.text), 'SMU missing does not promote On3')

const haveAla = ask('Do you have leftover for Alabama?')
ok(/not on the desk|pending/i.test(haveAla.text), 'Alabama leftover do-you-have is not on the desk')
ok(!/\$\d/.test(haveAla.text), 'Alabama leftover do-you-have invents no dollar')
ok(haveAla.links.some((l) => l.to.includes('/school/alabama')), 'do-you-have leftover links Alabama')

const lsuEst = ask("What's LSU's industry football roster estimate?")
ok(/\$40–50M|\$40-50M|40–50/.test(lsuEst.text), `LSU survey range: ${lsuEst.text}`)
ok(/closer to \$50M/i.test(lsuEst.text), 'LSU survey names the CBS closer-to-$50M qualifier')
ok(/not booked NIL|not House spent/i.test(lsuEst.text), 'LSU survey stays off booked NIL / House spent')
ok(/leftover only exists|do not have a booked/i.test(lsuEst.text), 'LSU survey does not invent leftover')
ok(!/seaton/i.test(lsuEst.text), 'LSU survey does not book Seaton')
ok(lsuEst.links.some((l) => l.to.includes('roster-estimate')), 'LSU survey links the school lane')

const lsuLeft = ask("What's LSU's leftover?")
ok(/pending/i.test(lsuLeft.text), 'LSU leftover stays pending')
ok(/industry football roster estimate/i.test(lsuLeft.text), 'LSU leftover names the separate survey')
ok(/\$40–50M|\$40-50M|40–50/.test(lsuLeft.text), 'LSU leftover answer still shows the survey range')
ok(/not House spent|does not create leftover|only exists when/i.test(lsuLeft.text), 'LSU leftover refuses to book the survey as leftover')

const lsuNil = ask('What NIL do you have for LSU?')
ok(/pending/i.test(lsuNil.text), 'LSU booked NIL pending')
ok(/industry football roster estimate/i.test(lsuNil.text), 'LSU NIL coverage names the survey lane')
ok(/leftover only exists|House spent/i.test(lsuNil.text), 'LSU NIL coverage keeps leftover pending')

const txEst = ask("What's Texas industry football roster estimate?")
ok(/above[-\s]?\$40M/i.test(txEst.text), 'Texas survey is a tier, not a point estimate')
ok(/not a point estimate/i.test(txEst.text), 'Texas survey refuses a fake precise dollar')
ok(/House cap minus booked House spent/i.test(txEst.text), 'Texas survey keeps leftover on the booked spent cell')

const listEst = ask('Which schools have an industry roster estimate?')
ok(/LSU/.test(listEst.text) && /Texas A&M/.test(listEst.text), 'list names LSU and Texas A&M')
ok(/Miami/.test(listEst.text) && /Oregon/.test(listEst.text), 'list names the other CBS/SI above-$40M schools')
ok(!/Georgia/.test(listEst.text) && !/Texas Tech/.test(listEst.text), 'list does not invent off-tier schools')
ok(!/On3/.test(listEst.text), 'list does not name On3')

ok(SUGGESTED_PROMPTS.some((p) => /LSU.*industry football roster estimate/i.test(p)), 'suggested prompt: LSU industry roster estimate')

const lsuMiss = ask('What data is missing for LSU?')
ok(/House spent/i.test(lsuMiss.text) && /pending/i.test(lsuMiss.text), 'LSU missing names House spent pending')
ok(/Industry football roster estimate/i.test(lsuMiss.text), 'LSU missing still lists the survey as on the desk')

const buy = ask('Is a buyout annual spend?')
ok(/overhang|liability/i.test(buy.text) && /not yearly spend/i.test(buy.text), 'buyout definition is overhang')

ok(SUGGESTED_PROMPTS.some((p) => /What NIL do you have for Texas/i.test(p)), 'suggested prompt: Texas NIL coverage')
ok(SUGGESTED_PROMPTS.some((p) => /missing for SMU/i.test(p)), 'suggested prompt: SMU missing')
ok(SUGGESTED_PROMPTS.some((p) => /booked vs modeled vs pending/i.test(p)), 'suggested prompt: marks')

const louRaw = desk.schools.find((s) => s.id === 'louisville')
const lou26 = applySeason(louRaw, 2026)
ok(leadBookedNil(lou26).value === 32_900_000, 'source Year 1 booked still $32.9M')
ok(leadHouseRemaining(lou26).value === 300_000, 'source leftover still $300k')
ok(leadHouseRemaining(lou26).field.spent === 20_200_000, 'source House spent still $20.2M')

ok(app.includes('IdleDeskChat'), 'App idle-mounts the chat after first paint')
ok(app.includes('requestIdleCallback'), 'chat JS waits for idle')
ok(app.includes("lazy(() => import('./components/DeskChat.jsx'))"), 'chat is a lazy chunk')
ok(!home.includes('DeskChat'), 'Home.jsx does not mount chat in the LCP board')
ok(!home.includes('className="issue-hed"'), 'Home still does not remount the LCP hed')
ok(!indexHtml.includes('Ask the desk'), 'index.html LCP dek does not include the chat')
ok(!indexHtml.includes('desk-chat'), 'index.html first paint has no chat markup')
ok(chatUi.includes('role="dialog"'), 'chat panel is a dialog')
ok(chatUi.includes('SUGGESTED_PROMPTS'), 'UI shows suggested prompts')
ok(!/On3/.test(chatLib) || /does not carry On3/.test(chatLib), 'engine copy does not promote On3')
ok(!chatLib.includes('openai') && !chatLib.includes('api.openai') && !chatLib.includes('ANTHROPIC'), 'no hosted LLM path')
ok(!chatUi.includes('openai'), 'UI has no LLM key field')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} desk-chat checks passed`)
if (failed.length) process.exit(1)
