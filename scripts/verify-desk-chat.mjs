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
const layers = JSON.parse(readFileSync(join(root, 'public/data/layers.json'), 'utf8'))
const guarantees = JSON.parse(readFileSync(join(root, 'public/data/guarantee-games.json'), 'utf8'))
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
  return answerDeskQuestion(q, { desk, tv, rosters, coachFa, layers, guarantees, season: 2026, ...extra })
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
ok(!/leftover is \$/.test(ala.text), 'Alabama leftover invents no leftover dollar')
ok(ala.links.some((l) => l.to.includes('/school/alabama')), 'Alabama leftover points at the school page')

const alaNil = ask("What's Alabama's booked NIL?")
ok(/pending/i.test(alaNil.text), 'Alabama booked NIL pending')
ok(!/modeled NIL is \$/.test(alaNil.text), 'pending booked NIL does not dump a modeled dollar')
ok(/modeled/i.test(alaNil.text), 'pending booked NIL still names the modeled lane as separate')

const cuNil = ask('What NIL do you have for Colorado?')
ok(/pending/i.test(cuNil.text), 'Colorado House booked NIL stays pending')
ok(/Item 44/i.test(cuNil.text), 'Colorado NIL coverage names FY2025 Item 44')
ok(/institutional/i.test(cuNil.text) && /pre-House/i.test(cuNil.text), 'Colorado Item 44 is institutional / pre-House')
ok(/not House Year 1 spent/i.test(cuNil.text), 'Colorado NIL coverage refuses House Year 1 spent')
ok(/not collective or total NIL/i.test(cuNil.text), 'Colorado NIL coverage refuses collective/total NIL')
ok(!/booked NIL is \$0/i.test(cuNil.text), 'Colorado coverage does not say booked NIL is $0')
ok(!/On3/.test(cuNil.text) || /does not/.test(cuNil.text), 'Colorado NIL coverage does not promote On3')

const cuBooked = ask("What's Colorado's booked NIL?")
ok(/pending/i.test(cuBooked.text), 'Colorado booked NIL question stays pending')
ok(/Item 44/i.test(cuBooked.text), 'Colorado booked NIL still names the Item 44 companion')
ok(/not House Year 1 spent/i.test(cuBooked.text), 'Colorado booked NIL refuses House spent')

const cu24 = ask("What's Colorado's booked NIL?", { season: 2024 })
ok(/Item 44/i.test(cu24.text), 'Colorado 2024 names Item 44 instead of bare booked $0')
ok(/not House Year 1 spent/i.test(cu24.text), 'Colorado 2024 refuses House spent')
ok(/not collective or total NIL/i.test(cu24.text), 'Colorado 2024 refuses collective/total NIL')
ok(!/booked NIL is \$0/i.test(cu24.text), 'Colorado 2024 does not print booked NIL is $0')

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
ok(/EADA/i.test(smuMiss.text) && /\$150\.2M|150,225,313/.test(smuMiss.text), 'SMU missing cites FY2025 EADA as on the desk')
ok(/buyout/i.test(smuMiss.text) && /pending/i.test(smuMiss.facts?.join(' ') || smuMiss.text), 'SMU buyout stays pending')
ok(smuMiss.links.some((l) => l.to.includes('/school/smu')), 'SMU missing links the school page')
ok(!/On3/.test(smuMiss.text) || /does not/.test(smuMiss.text), 'SMU missing does not promote On3')

const smuEada = ask("What's SMU's EADA athletics revenue?")
ok(/\$150\.2M|150,225,313/.test(smuEada.text), `SMU EADA dollar: ${smuEada.text}`)
ok(/not added|not unpacked|not an MFRS/i.test(smuEada.text), 'SMU EADA stays off the booked stack')
ok(!/ticket|sponsorship|contribution/.test(smuEada.text) || /not unpacked/i.test(smuEada.text), 'SMU EADA is not an MFRS unpack')

const ndEada = ask("What's Notre Dame's EADA?")
ok(/\$289\.6M|289,616,198/.test(ndEada.text), `Notre Dame EADA is the official FY2025 file: ${ndEada.text}`)
ok(!/235/.test(ndEada.text), 'Notre Dame EADA is not the old CNBC ~$235M cell')

const haveAla = ask('Do you have leftover for Alabama?')
ok(/not on the desk|pending/i.test(haveAla.text), 'Alabama leftover do-you-have is not on the desk')
ok(!/leftover is \$/.test(haveAla.text), 'Alabama leftover do-you-have invents no leftover dollar')
ok(haveAla.links.some((l) => l.to.includes('/school/alabama')), 'do-you-have leftover links Alabama')

const lsuEst = ask("What's LSU's industry football roster estimate?")
ok(/\$40–50M|\$40-50M|40–50/.test(lsuEst.text), `LSU survey range: ${lsuEst.text}`)
ok(/labeled survey/i.test(lsuEst.text), 'LSU answer says survey, not modeled')
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
ok(!/\$45M/.test(txEst.text), 'Texas survey is not turned into a $45M midpoint')
ok(/House cap minus booked House spent/i.test(txEst.text), 'Texas survey keeps leftover on the booked spent cell')

const listEst = ask('Which schools have an industry roster estimate?')
ok(/LSU/.test(listEst.text) && /Texas A&M/.test(listEst.text), 'list names LSU and Texas A&M')
ok(/Miami/.test(listEst.text) && /Oregon/.test(listEst.text), 'list names the other CBS/SI above-$40M schools')
ok(/Georgia/.test(listEst.text) && /Texas Tech/.test(listEst.text), 'list includes CBS right-off-$40M and SI Tech')
ok(/Indiana/.test(listEst.text), 'list includes Indiana $30–35M')
ok(/Alabama/.test(listEst.text) && /Clemson/.test(listEst.text), 'list includes modeled conference-median schools')
ok(/modeled/i.test(listEst.text) && /survey/i.test(listEst.text), 'list separates modeled vs survey')
ok(!/On3/.test(listEst.text), 'list does not name On3')

const alaEst = ask("What's the industry roster estimate for Alabama?")
ok(/modeled/i.test(alaEst.text), `Alabama is modeled: ${alaEst.text}`)
ok(/\$25M–\$33M|\$25–33M|\$25-33M|25–33/.test(alaEst.text), 'Alabama uses the SI SEC median range')
ok(/–|to/.test(alaEst.text), 'Alabama modeled figure is a range')
ok(/not a survey cell/i.test(alaEst.text), 'Alabama is not labeled survey')
ok(/SI SEC median|formula|same band/i.test(alaEst.text), 'Alabama answer shows the formula')

const clemEst = ask("What's the industry roster estimate for Clemson?")
ok(/modeled/i.test(clemEst.text), 'Clemson is modeled')
ok(/\$17M–\$24M|\$17–24M|\$17-24M|17–24/.test(clemEst.text), 'Clemson uses the SI ACC median range')

const indEst = ask("What's the industry roster estimate for Indiana?")
ok(/\$30–35M|\$30-35M|30–35/.test(indEst.text), `Indiana range: ${indEst.text}`)
ok(/not House spent/i.test(indEst.text), 'Indiana survey stays off House spent')

const gaEst = ask("What's the industry roster estimate for Georgia?")
ok(/upper \$30M/i.test(gaEst.text), `Georgia tier: ${gaEst.text}`)
ok(/not a point estimate/i.test(gaEst.text), 'Georgia refuses a fake precise dollar')

ok(SUGGESTED_PROMPTS.some((p) => /LSU.*industry football roster estimate/i.test(p)), 'suggested prompt: LSU industry roster estimate')
ok(SUGGESTED_PROMPTS.some((p) => /industry estimate for Miami/i.test(p)), 'suggested prompt: Miami QB position estimate')
ok(SUGGESTED_PROMPTS.some((p) => /compare on reported NIL/i.test(p)), 'suggested prompt: reported NIL compare')

const alaBarChat = ask('How does Alabama compare on reported NIL?')
ok(/\$25M–\$33M|\$25–33M|\$25-33M|25–33/.test(alaBarChat.text), `Alabama reported bar range: ${alaBarChat.text}`)
ok(/modeled/i.test(alaBarChat.text), 'Alabama reported bar is modeled')
ok(/\$0–\$50M|\$0-\$50M|0–\$50M/.test(alaBarChat.text), 'Alabama reported bar names the shared $0–$50M scale')
ok(/not booked NIL/i.test(alaBarChat.text) && /not House spent/i.test(alaBarChat.text), 'Alabama reported bar stays off booked / House spent')
ok(/does not create leftover|House cap minus booked House spent/i.test(alaBarChat.text), 'Alabama reported bar does not invent leftover')
ok(alaBarChat.links.some((l) => l.to.includes('nil-reported')), 'Alabama reported bar links the school hash')
ok(!/On3/.test(alaBarChat.text), 'Alabama reported bar does not name On3')

const lsuBarChat = ask('How does LSU compare on reported NIL?')
ok(/\$40M–\$50M|\$40–50M|\$40-50M|40–50/.test(lsuBarChat.text), `LSU reported bar range: ${lsuBarChat.text}`)
ok(/labeled survey/i.test(lsuBarChat.text), 'LSU reported bar is survey')
ok(!/seaton/i.test(lsuBarChat.text), 'LSU reported bar does not book Seaton')

const cmpBar = ask('Compare LSU and Alabama on reported NIL')
ok(/LSU/.test(cmpBar.text) && /Alabama/.test(cmpBar.text), 'compare names both schools')
ok(/higher/.test(cmpBar.text) && /LSU/.test(cmpBar.text), 'compare says LSU sits higher')
ok(/not booked NIL/i.test(cmpBar.text), 'compare keeps the bar off booked NIL')
ok(!/leftover is \$/.test(cmpBar.text), 'reported-NIL compare does not fall through to leftover dollars')

const txBarChat = ask('How does Texas compare on reported NIL?')
ok(/above[-\s]?\$40M|\$40M–\$50M|\$40–50M/.test(txBarChat.text), 'Texas reported bar uses the survey allocation')
ok(/\$13\.5M|\$13,500,000/.test(txBarChat.text), 'Texas reported bar still names the booked/spent mark')
ok(/same separate mark|same mark|Booked NIL and House spent/i.test(txBarChat.text), 'Texas booked and spent share one mark')
ok(/\$7\.0M|\$7,000,000|House cap minus booked House spent/i.test(txBarChat.text), 'Texas leftover stays on the booked spent cell')

const louBarChat = ask('How does Louisville compare on reported NIL?')
ok(/\$32\.9M|\$32,900,000/.test(louBarChat.text), 'Louisville reported bar names booked $32.9M as a separate mark')
ok(/\$20\.2M|\$20,200,000/.test(louBarChat.text), 'Louisville reported bar names House spent $20.2M as a separate mark')

const leftoverStill = ask("Compare Louisville and Kentucky leftover")
ok(/\$300,000|\$0\.3M|\$300k/.test(leftoverStill.text), 'leftover compare still answers leftover')
ok(!/reported NIL band/i.test(leftoverStill.text), 'leftover compare is not stolen by the reported bar')

const defBar = ask('What is the NIL reported bar?')
ok(/\$0–\$50M|\$50M/.test(defBar.text), 'definition names the $50M scale')
ok(/not booked NIL/i.test(defBar.text), 'definition says the bar is not booked NIL')
ok(defBar.links.some((l) => l.to === '/methods'), 'definition links Methods')
ok(defBar.links.some((l) => l.to === '/reported-nil'), 'definition links the reported-NIL board')
ok(alaBarChat.links.some((l) => l.to === '/reported-nil'), 'Alabama reported bar links the board')
ok(cmpBar.links.some((l) => l.to === '/reported-nil'), 'LSU vs Alabama compare links the board')

const miaQb = ask("What's the industry estimate for Miami's QB?")
ok(/more than \$6M/i.test(miaQb.text), `Miami QB band: ${miaQb.text}`)
ok(/reported-estimate/i.test(miaQb.text), 'Miami QB is reported-estimate')
ok(/not a (player )?contract/i.test(miaQb.text), 'Miami QB is not a contract')
ok(!/mensah/i.test(miaQb.text), 'Miami QB prefers the position band over a named player')

const alaQb = ask("What's Alabama's QB salary?")
ok(/modeled/i.test(alaQb.text), `Alabama QB is modeled: ${alaQb.text}`)
ok(/starter/i.test(alaQb.text), 'Alabama QB shows a modeled starter range')
ok(/not a contract/i.test(alaQb.text), 'Alabama QB is not a contract')

const lsuOt = ask("What's the industry estimate for LSU's OT?")
ok(/modeled/i.test(lsuOt.text), 'LSU OT is a modeled seat share')
ok(!/seaton/i.test(lsuOt.text), 'LSU OT does not book Seaton')

const washQb = ask("Who is Washington's starting QB on the roster?")
ok(/Demond Williams Jr/i.test(washQb.text), 'Washington starter question still returns the name')

const posList = ask('Which positions have an industry salary band?')
ok(/Miami/.test(posList.text) && /Texas A&M/.test(posList.text), 'position list names cited schools')
ok(/QB/.test(posList.text) && /WR/.test(posList.text) && /EDGE/.test(posList.text), 'position list names cited families')
ok(/modeled/i.test(posList.text), 'position list names the modeled seat-share method')
ok(!/On3/.test(posList.text), 'position list does not name On3')

const lsuMiss = ask('What data is missing for LSU?')
ok(/House spent/i.test(lsuMiss.text) && /pending/i.test(lsuMiss.text), 'LSU missing names House spent pending')
ok(/Industry football roster estimate/i.test(lsuMiss.text), 'LSU missing still lists the survey as on the desk')

const buy = ask('Is a buyout annual spend?')
ok(/overhang|liability/i.test(buy.text) && /not yearly spend/i.test(buy.text), 'buyout definition is overhang')

ok(SUGGESTED_PROMPTS.some((p) => /What NIL do you have for Texas/i.test(p)), 'suggested prompt: Texas NIL coverage')
ok(SUGGESTED_PROMPTS.some((p) => /missing for SMU/i.test(p)), 'suggested prompt: SMU missing')
ok(SUGGESTED_PROMPTS.some((p) => /booked vs modeled vs pending/i.test(p)), 'suggested prompt: marks')
ok(SUGGESTED_PROMPTS.some((p) => /jersey|naming|patch/i.test(p)), 'suggested prompt: jersey / naming')
ok(SUGGESTED_PROMPTS.some((p) => /difference between Louisville and Kentucky/i.test(p)), 'suggested prompt: two-school difference')

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
ok(chatUi.includes('loadLayers') || chatUi.includes('layers:'), 'chat loads layers.json for apparel')
ok(chatUi.includes('guarantee-games.json') || chatUi.includes('guarantees:'), 'chat loads guarantee-games.json')

const fuzzyGa = ask('Tell me about Georgia')
ok(/capacity/i.test(fuzzyGa.text), `fuzzy Georgia names capacity: ${fuzzyGa.text}`)
ok(/pending/i.test(fuzzyGa.text), 'fuzzy Georgia keeps pending holes')
ok(/booked NIL/i.test(fuzzyGa.text), 'fuzzy Georgia names booked NIL')
ok(/survey|modeled/i.test(fuzzyGa.text), 'fuzzy Georgia labels reported NIL lane')
ok(!/I can look up booked cells/i.test(fuzzyGa.text), 'fuzzy Georgia is not the miss wall')
ok(fuzzyGa.links.some((l) => l.to.includes('/school/georgia')), 'fuzzy Georgia links the school page')
ok(!/leftover is only computed when a booked House spent cell exists\. We do not invent leftover from a cap plan/i.test(fuzzyGa.text), 'fuzzy Georgia is not the leftover lecture')

const jerseyGa = ask("What's Georgia's jersey patch deal?")
ok(/Nike/i.test(jerseyGa.text), `Georgia jersey names Nike: ${jerseyGa.text}`)
ok(/pending/i.test(jerseyGa.text), 'Georgia jersey dollar pending')
ok(/jersey|logo|patch/i.test(jerseyGa.text), 'Georgia jersey mentions the cite')
ok(!/40\.8|\$40/.test(jerseyGa.text), 'Georgia jersey does not book the expired FOIA')
ok(/not leftover/i.test(jerseyGa.text) && /not reported NIL/i.test(jerseyGa.text), 'Georgia jersey stays off leftover / reported NIL')
ok(!/leftover is \$/.test(jerseyGa.text), 'Georgia jersey invents no leftover dollar')

const tnNike = ask("What's Tennessee's Nike deal?")
ok(/Adidas/i.test(tnNike.text), `Tennessee names Adidas: ${tnNike.text}`)
ok(/pending/i.test(tnNike.text), 'Tennessee apparel dollar pending')
ok(/not disclosed|pending/i.test(tnNike.text), 'Tennessee says terms were not disclosed or pending')
ok(!/100/.test(tnNike.text), 'Tennessee does not print $100M chatter')
ok(/not leftover/i.test(tnNike.text), 'Tennessee apparel is not leftover')
ok(!/House spent is \$|leftover is \$/.test(tnNike.text), 'Tennessee apparel invents no leftover / spent dollar')

const kyName = ask("What's Kentucky's stadium naming rights?")
ok(/Kroger/i.test(kyName.text), `Kentucky naming names Kroger: ${kyName.text}`)
ok(/\$1\.85M|\$1,850,000|1,850,000/.test(kyName.text), `Kentucky naming prints the cited annual: ${kyName.text}`)
ok(/not leftover/i.test(kyName.text), 'Kentucky naming stays off leftover')

const txAla = ask("What's the difference between Texas and Alabama?")
ok(/capacity/i.test(txAla.text), `difference names capacity: ${txAla.text}`)
ok(/higher/i.test(txAla.text), 'difference says who is higher')
ok(/pending/i.test(txAla.text), 'difference pending where a cell is empty')
ok(!/leftover cell is pending, so the desk will not compare/i.test(txAla.text), 'difference is not leftover-only refuse')
ok(/survey|modeled/i.test(txAla.text), 'difference labels reported NIL')
ok(!/I can look up booked cells/i.test(txAla.text), 'difference is not the miss wall')
ok(txAla.links.some((l) => l.to.startsWith('/compare')), 'difference links /compare')

const louKyDiff = ask("What's the difference between Louisville and Kentucky?")
ok(/capacity/i.test(louKyDiff.text), 'Louisville / Kentucky difference names capacity')
ok(/leftover|booked NIL/i.test(louKyDiff.text), 'Louisville / Kentucky difference names leftover or booked NIL')
ok(/Kentucky/.test(louKyDiff.text) && /higher/.test(louKyDiff.text), 'Louisville / Kentucky difference says who is higher')

const jerseyMiss = ask('jersey patch')
ok(!/I can look up booked cells/i.test(jerseyMiss.text), 'jersey miss is not the lecture wall')
ok(jerseyMiss.text.split(/[.!?]/).filter(Boolean).length <= 2, `jersey miss is one sentence: ${jerseyMiss.text}`)
ok(jerseyMiss.suggested.some((p) => /jersey|naming|patch/i.test(p)), 'jersey miss suggests a jersey/naming prompt')
ok(jerseyMiss.suggested.some((p) => /Louisville/i.test(p)), 'jersey miss includes a working example')

const blankMiss = ask('asdfasdf')
ok(!/I can look up booked cells/i.test(blankMiss.text), 'total miss is not the lecture wall')
ok(blankMiss.suggested.some((p) => /jersey|naming|patch/i.test(p)), 'total miss offers jersey/naming')
ok(blankMiss.suggested.some((p) => /difference/i.test(p)), 'total miss offers a two-school difference')
ok(blankMiss.suggested.some((p) => /reported NIL/i.test(p)), 'total miss offers reported NIL')
ok(blankMiss.suggested.some((p) => /Louisville/i.test(p)), 'total miss includes a working example')

ok(matchSchools('Bama leftover', desk.schools)[0] === 'alabama', 'Bama is Alabama')
ok(matchSchools('the Tide leftover', desk.schools)[0] === 'alabama', 'Tide is Alabama')
ok(matchSchools('Texas vs Bama', desk.schools).join(',') === 'texas,alabama', 'Texas vs Bama keeps question order')

const juxta = ask('Texas Alabama')
ok(/capacity/i.test(juxta.text) && /higher/i.test(juxta.text), `juxtaposed schools compare: ${juxta.text}`)
ok(!/Ask a Power 4 school/i.test(juxta.text), 'Texas Alabama is not the miss wall')
ok(/Texas/.test(juxta.text) && /Alabama/.test(juxta.text), 'Texas Alabama names both')

const stack = ask('how does Texas stack up against Alabama')
ok(/capacity/i.test(stack.text) && /higher/i.test(stack.text), `stack-up compare: ${stack.text}`)
ok(!/Ask a Power 4 school/i.test(stack.text), 'stack-up is not the miss wall')

const orMore = ask('which is higher Texas or Alabama')
ok(/higher/i.test(orMore.text) && /capacity|leftover|reported NIL/i.test(orMore.text), `or-higher compare: ${orMore.text}`)
ok(!/Ask a Power 4 school/i.test(orMore.text), 'which-is-higher is not the miss wall')

const vsBama = ask('Texas vs Bama')
ok(/Texas/.test(vsBama.text) && /Alabama/.test(vsBama.text), `Texas vs Bama names both: ${vsBama.text}`)
ok(/higher|pending/i.test(vsBama.text), 'Texas vs Bama prints a gap or pending')
ok(!/Ask a Power 4 school/i.test(vsBama.text), 'Texas vs Bama is not the miss wall')

const bamaLeft = ask("What's Bama leftover?")
ok(/pending/i.test(bamaLeft.text), `Bama leftover stays pending: ${bamaLeft.text}`)
ok(!/leftover is \$/.test(bamaLeft.text), 'Bama leftover invents no leftover dollar')
ok(bamaLeft.links.some((l) => l.to.includes('/school/alabama')), 'Bama leftover links Alabama')

const kroger = ask('Kroger Field')
ok(/Kentucky/i.test(kroger.text) && /Kroger/i.test(kroger.text), `Kroger Field names Kentucky: ${kroger.text}`)
ok(/\$1,850,000|1,850,000/.test(kroger.text), 'Kroger Field prints the cited annual')
ok(/not leftover/i.test(kroger.text), 'Kroger Field stays on apparel/naming')
ok(!/Ask a Power 4 school/i.test(kroger.text), 'Kroger Field is not the miss wall')

const alaPay = ask("What's Alabama's coach pay?")
ok(/Kalen DeBoer/i.test(alaPay.text), `Alabama coach names DeBoer: ${alaPay.text}`)
ok(/\$12\.5M|12,500,000/.test(alaPay.text), 'Alabama coach pay is $12.5M')
ok(/not lifetime/i.test(alaPay.text), 'Alabama coach pay is this year’s check')
ok(alaPay.links.some((l) => l.to.includes('/school/alabama')), 'Alabama coach pay links the school page')

const payCoach = ask('How much does Alabama pay their coach?')
ok(/Kalen DeBoer/i.test(payCoach.text) && /\$12\.5M|12,500,000/.test(payCoach.text), `pay-their-coach: ${payCoach.text}`)
ok(!/Ask a Power 4 school/i.test(payCoach.text), 'pay-their-coach is not the miss wall')
ok(!/leftover is only computed when a booked House spent cell exists\. We do not invent leftover from a cap plan/i.test(payCoach.text), 'pay-their-coach is not the leftover lecture')

const deboer = ask("What's Kalen DeBoer's salary?")
ok(/Alabama/i.test(deboer.text) && /\$12\.5M|12,500,000/.test(deboer.text), `DeBoer salary: ${deboer.text}`)
ok(!/Washington/i.test(deboer.text) || /Alabama/i.test(deboer.text), 'DeBoer prefers the current Alabama chair')
ok(!/Ask a Power 4 school/i.test(deboer.text), 'DeBoer salary is not the miss wall')

const smart = ask("What's Kirby Smart's salary?")
ok(/Georgia/i.test(smart.text) && /\$13\.0M|13,003,000|13,000,000/.test(smart.text), `Smart salary: ${smart.text}`)

const saban = ask("What's Saban's buyout?")
ok(/2023/i.test(saban.text) && /Saban/i.test(saban.text), `Saban is labeled a prior chair: ${saban.text}`)
ok(/\$11\.4M|11,407,000/.test(saban.text), 'Saban 2023 pay is the USA TODAY cell')
ok(/pending/i.test(saban.text), 'Saban buyout stays pending')
ok(!/leftover is \$/.test(saban.text), 'Saban answer invents no leftover')

const cmpPay = ask('Compare Alabama and Georgia coach pay')
ok(/DeBoer/i.test(cmpPay.text) && /Smart/i.test(cmpPay.text), 'coach-pay compare names both chairs')
ok(/higher/i.test(cmpPay.text) && /Georgia/i.test(cmpPay.text), 'coach-pay compare says Georgia is higher')
ok(cmpPay.links.some((l) => l.to.startsWith('/compare')), 'coach-pay compare links /compare')

const louSpent = ask('How much has Louisville spent on the House cap?')
ok(/\$20\.2M|20,200,000/.test(louSpent.text), `House-spent phrasing: ${louSpent.text}`)
ok(/House spent/i.test(louSpent.text), 'House-spent phrasing names the spent cell')
ok(!/Ask a Power 4 school/i.test(louSpent.text), 'House-spent phrasing is not the miss wall')

const txLeft = ask('How much House cap does Texas have left?')
ok(/\$7\.0M|7,000,000/.test(txLeft.text), `House remaining phrasing: ${txLeft.text}`)
ok(/leftover/i.test(txLeft.text), 'House remaining phrasing answers leftover')
ok(/year-to-date|YTD/i.test(txLeft.text), 'Texas leftover stays YTD')

const txSpent = ask('How much has Texas spent this year?')
ok(/\$13\.5M|13,500,000/.test(txSpent.text), `spent-this-year: ${txSpent.text}`)
ok(/House spent/i.test(txSpent.text), 'spent-this-year names House spent')

const room = ask('How much room does Louisville have under the cap?')
ok(/\$300,000|\$0\.3M|\$300k/.test(room.text), `room-under-cap leftover: ${room.text}`)

const mostNil = ask('Who has the most booked NIL?')
ok(/Louisville/.test(mostNil.text) && /\$32\.9M/.test(mostNil.text), `most booked NIL: ${mostNil.text}`)
ok(/Kentucky/.test(mostNil.text) && /Texas/.test(mostNil.text), 'most booked NIL lists the five booked cells')
ok(!/Colorado/.test(mostNil.text) || /not/.test(mostNil.text), 'most booked NIL does not lead with Colorado Item 44')
ok(!/booked NIL is \$0/i.test(mostNil.text), 'most booked NIL does not print a $0 Item 44 lead')

const moreNil = ask('Who has more booked NIL Texas or Louisville?')
ok(/Louisville/.test(moreNil.text) && /higher/.test(moreNil.text), 'who-has-more booked NIL names the higher school')
ok(/\$32\.9M/.test(moreNil.text) && /\$13\.5M/.test(moreNil.text), 'who-has-more booked NIL prints both cells')

const affordLou = ask('Can Louisville afford a $5M QB?')
ok(/\$300,000|\$0\.3M|\$300k/.test(affordLou.text), `afford leftover: ${affordLou.text}`)
ok(/larger than/i.test(affordLou.text), 'afford says the ask is larger than leftover')
ok(/do not invent/i.test(affordLou.text), 'afford refuses to invent another pot')
ok(!/Lincoln Kienholz/i.test(affordLou.text), 'afford is not stolen by the roster name')

const affordAla = ask('Can Alabama afford a $10M buyout?')
ok(/pending/i.test(affordAla.text), `afford Alabama leftover pending: ${affordAla.text}`)
ok(/not a \$20\.5M leftover/i.test(affordAla.text), 'afford Alabama invents no cap-plan leftover')
ok(!/leftover is \$/.test(affordAla.text), 'afford Alabama invents no leftover dollar')

const affordTx = ask('Can Texas afford another $5 million in NIL?')
ok(/\$7\.0M/.test(affordTx.text), 'afford Texas leftover is $7.0M')
ok(/covers/i.test(affordTx.text), 'afford Texas leftover covers a $5M ask')
ok(/Year-to-date/i.test(affordTx.text), 'afford Texas leftover stays YTD')

const secLeft = ask('Which SEC school has booked leftover?')
ok(/Kentucky/.test(secLeft.text) && /Texas/.test(secLeft.text), `SEC leftover list: ${secLeft.text}`)
ok(!/Louisville/.test(secLeft.text), 'SEC leftover list does not include ACC Louisville')
ok(/2 SEC/.test(secLeft.text), 'SEC leftover list is conference-scoped')

const accSpent = ask('Which ACC schools have booked House spent?')
ok(/Louisville/.test(accSpent.text) && /California/.test(accSpent.text), 'ACC House spent is Louisville and Cal')
ok(!/Texas/.test(accSpent.text), 'ACC House spent list does not include Texas')
ok(!/Kentucky/.test(accSpent.text), 'ACC House spent list does not include Kentucky')

const b12Spent = ask('Which Big 12 schools have booked House spent?')
ok(/No Big 12/i.test(b12Spent.text), `Big 12 House spent empty: ${b12Spent.text}`)
ok(/empty until that cell exists/i.test(b12Spent.text), 'Big 12 House spent stays empty')

const secPay = ask('Who has the highest coach pay in the SEC?')
ok(/Kirby Smart/i.test(secPay.text) && /Georgia/i.test(secPay.text), `SEC coach pay: ${secPay.text}`)
ok(/\$13\.0M/.test(secPay.text), 'SEC coach pay names the $13.0M cell')
ok(/DeBoer/i.test(secPay.text), 'SEC coach pay still lists Alabama')
ok(!/pending chairs stay off the list/i.test(secPay.text) || /Pending chairs stay off/i.test(secPay.text), 'SEC coach pay does not invent pending dollars')

const bigTenTv = ask("What's the Big Ten media check?")
ok(/\$1\.1B|1,150,000,000/.test(bigTenTv.text), `Big Ten pot: ${bigTenTv.text}`)
ok(/\$63\.9M|63,888,889/.test(bigTenTv.text), 'Big Ten equal-share is labeled')
ok(/estimated/i.test(bigTenTv.text), 'Big Ten equal-share stays estimated')
ok(/not a school contract/i.test(bigTenTv.text), 'Big Ten TV is not a school contract')
ok(bigTenTv.links.some((l) => l.to === '/tv'), 'Big Ten TV links /tv')

const confTv = ask('Compare SEC and Big Ten TV')
ok(/SEC/.test(confTv.text) && /Big Ten/.test(confTv.text), 'conference TV compare names both')
ok(/higher/i.test(confTv.text) && /Big Ten/.test(confTv.text), 'conference TV compare says Big Ten pot is higher')
ok(/estimated/i.test(confTv.text), 'conference TV compare keeps equal-share estimated')
ok(!/leftover is \$/.test(confTv.text), 'conference TV compare invents no leftover')

ok(matchSchools("What's UF leftover?", desk.schools)[0] === 'florida', 'UF is Florida')
ok(matchSchools("What's the Ducks leftover?", desk.schools)[0] === 'oregon', 'Ducks are Oregon')
ok(matchSchools("What's the Gators leftover?", desk.schools)[0] === 'florida', 'Gators are Florida')
ok(matchSchools("What's the Buckeyes leftover?", desk.schools)[0] === 'ohio-state', 'Buckeyes are Ohio State')
ok(matchSchools("What's the Sooners leftover?", desk.schools)[0] === 'oklahoma', 'Sooners are Oklahoma')
ok(matchSchools("What's Vandy leftover?", desk.schools)[0] === 'vanderbilt', 'Vandy is Vanderbilt')
ok(matchSchools("What's the Canes leftover?", desk.schools)[0] === 'miami', 'Canes are Miami')
ok(matchSchools("What's Mizzou leftover?", desk.schools)[0] === 'missouri', 'Mizzou is Missouri')
ok(matchSchools("What's the Aggies leftover?", desk.schools)[0] === 'texas-am', 'Aggies are Texas A&M')
ok(matchSchools("What's the Huskers leftover?", desk.schools)[0] === 'nebraska', 'Huskers are Nebraska')
ok(matchSchools("What's the Noles leftover?", desk.schools)[0] === 'florida-state', 'Noles are Florida State')
ok(matchSchools("What's Cuse leftover?", desk.schools)[0] === 'syracuse', 'Cuse is Syracuse')
ok(matchSchools("What's the Wolverines leftover?", desk.schools)[0] === 'michigan', 'Wolverines are Michigan')

const ufLeft = ask("What's UF leftover?")
ok(/pending/i.test(ufLeft.text), 'UF leftover stays pending')
ok(ufLeft.links.some((l) => l.to.includes('/school/florida')), 'UF leftover links Florida')
ok(!/leftover is \$/.test(ufLeft.text), 'UF leftover invents no leftover dollar')

const bobby = ask("What's Bobby Dodd Stadium naming?")
ok(/Georgia Tech/i.test(bobby.text) && /Hyundai/i.test(bobby.text), `Bobby Dodd: ${bobby.text}`)
ok(/\$2,750,000|2,750,000/.test(bobby.text), 'Bobby Dodd prints the cited Hyundai annual')
ok(/not leftover/i.test(bobby.text), 'Bobby Dodd stays on apparel/naming')
ok(!/Ask a Power 4 school/i.test(bobby.text), 'Bobby Dodd is not the miss wall')

const miaBuy = ask("What's Miami's buy game?")
ok(/Florida A&M|FAMU/i.test(miaBuy.text), `Miami buy game opponent: ${miaBuy.text}`)
ok(/\$720,000|720,000/.test(miaBuy.text), 'Miami football guarantee is $720,000')
ok(/\$40,000|40,000/.test(miaBuy.text), 'Miami band fee stays a separate cell')
ok(/not the football guarantee/i.test(miaBuy.text), 'Miami band is not the football guarantee')
ok(/House spent/i.test(miaBuy.text) && /booked NIL/i.test(miaBuy.text), 'Miami buy game names House spent and booked NIL as not this lane')
ok(/≠|not /i.test(miaBuy.text), 'Miami buy game refuses House spent / booked NIL')
ok(miaBuy.links.some((l) => l.to === '/guarantee-games' || l.to.includes('guarantee')), 'Miami buy game links the board')

const osuBall = ask('How much did Ohio State pay Ball State?')
ok(/\$1,900,000|1,900,000/.test(osuBall.text), `OSU Ball State: ${osuBall.text}`)
ok(/Ball State/i.test(osuBall.text), 'OSU Ball State names the opponent')
ok(!/Ask a Power 4 school/i.test(osuBall.text), 'OSU Ball State is not the miss wall')
ok(!/leftover is only House cap minus booked House spent, and that spent cell is empty/i.test(osuBall.text), 'OSU Ball State is not a leftover dump')

const tamuG = ask("What's Texas A&M's guarantee?")
ok(/Missouri State/i.test(tamuG.text) && /\$1,200,000|1,200,000/.test(tamuG.text), `A&M Missouri State: ${tamuG.text}`)
ok(/Citadel/i.test(tamuG.text) && /\$600,000|600,000/.test(tamuG.text), 'A&M Citadel is $600k')
ok(/Arizona State/i.test(tamuG.text) && /\$0/.test(tamuG.text), 'A&M Arizona State $0 is the cited home-and-home')
ok(/cited contract cell/i.test(tamuG.text), 'A&M $0 is cited, not pending')

const famu = ask("What's the FAMU guarantee?")
ok(/Miami/i.test(famu.text) && /\$720,000|720,000/.test(famu.text), `FAMU guarantee: ${famu.text}`)
ok(!/Ask a Power 4 school/i.test(famu.text), 'FAMU guarantee is not the miss wall')

const dukeRev = ask("What's Duke's athletics revenue?")
ok(/\$181\.6M|181,607,802/.test(dukeRev.text), `Duke EADA: ${dukeRev.text}`)
ok(/not added to the booked stack/i.test(dukeRev.text), 'Duke athletics revenue stays off the booked stack')
ok(!/House leftover and spent are pending — leftover is only House cap minus booked House spent/i.test(dukeRev.text), 'Duke athletics revenue is not the leftover snapshot')

const stanEada = ask("What's Stanford's EADA?")
ok(/\$192\.8M|192,802,320/.test(stanEada.text), `Stanford EADA: ${stanEada.text}`)
ok(/not unpacked/i.test(stanEada.text), 'Stanford EADA is not an MFRS unpack')

const tcuRev = ask("What's TCU's athletics revenue?")
ok(/\$156\.0M|155,989,500/.test(tcuRev.text), `TCU EADA: ${tcuRev.text}`)

ok(SUGGESTED_PROMPTS.some((p) => /Alabama's coach pay/i.test(p)), 'suggested prompt: Alabama coach pay')
ok(SUGGESTED_PROMPTS.some((p) => /buy-game guarantee/i.test(p)), 'suggested prompt: Miami buy-game')

const coachMiss = ask('coach salary')
ok(coachMiss.suggested.some((p) => /coach pay/i.test(p)), 'coach miss suggests coach pay')
ok(coachMiss.suggested.some((p) => /Louisville/i.test(p)), 'coach miss includes a working example')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} desk-chat checks passed`)
if (failed.length) process.exit(1)
