import { readFileSync } from 'fs'
import { applySeason } from '../src/lib/seasons.js'

const data = JSON.parse(readFileSync(new URL('../data/schools.json', import.meta.url), 'utf8'))
const tape = JSON.parse(readFileSync(new URL('./hc-history.json', import.meta.url), 'utf8'))
const coachUsat = {
  2021: JSON.parse(readFileSync(new URL('./coach-usat/2021.json', import.meta.url), 'utf8')),
  2022: JSON.parse(readFileSync(new URL('./coach-usat/2022.json', import.meta.url), 'utf8')),
  2023: JSON.parse(readFileSync(new URL('./coach-usat/2023.json', import.meta.url), 'utf8')),
  2024: JSON.parse(readFileSync(new URL('./coach-usat/2024.json', import.meta.url), 'utf8')),
  2025: JSON.parse(readFileSync(new URL('./coach-usat/2025.json', import.meta.url), 'utf8')),
}
const staffTape = {
  ...JSON.parse(readFileSync(new URL('./staff-2026-acc-sec.json', import.meta.url), 'utf8')),
  ...JSON.parse(readFileSync(new URL('./staff-2026-b12.json', import.meta.url), 'utf8')),
  ...JSON.parse(readFileSync(new URL('./staff-2026-b1g.json', import.meta.url), 'utf8')),
}
const byId = Object.fromEntries(data.schools.map((s) => [s.id, s]))

const NAME_ALIASES = { elidrinkwitz: 'eliahdrinkwitz' }
function foldName(name) {
  const s = String(name || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  return NAME_ALIASES[s] || s
}
function samePerson(a, b) {
  return Boolean(a) && Boolean(b) && foldName(a) === foldName(b)
}
function usatCoach(sid, year) {
  const rows = coachUsat[year]?.schools?.[sid]?.coaches || []
  const chair = byId[sid]?.coachesByYear?.[year]?.football?.name
  return rows.find((c) => samePerson(chair, c.name)) || null
}
function isUsaToday(pay) {
  return String(pay?.source || '').toUpperCase().includes('USA TODAY')
}
function isProtectedDollar(pay) {
  return pay?.value != null && !isUsaToday(pay)
}

function chair(id, year) {
  return applySeason(byId[id], year).coaches.football
}
function staffNames(id, year) {
  return (applySeason(byId[id], year).staff?.assistants || []).map((a) => a.name)
}
function blob(fb) {
  return [fb?.term?.notes, fb?.pay?.notes].filter(Boolean).join(' ')
}

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

ok(Object.keys(tape).length === 68, 'tape has 68 schools')

for (const [sid, years] of Object.entries(tape)) {
  ok(!!byId[sid], `${sid} exists on the desk`)
  for (const year of [2021, 2022, 2023, 2024, 2025, 2026]) {
    const row = years[String(year)]
    ok(!!row, `${sid} ${year} on tape`)
    const fb = chair(sid, year)
    const want = row.name === 'Eli Drinkwitz' ? 'Eliah Drinkwitz' : row.name
    ok(fb.name === want, `${sid} ${year} chair is ${want}`)
    if (row.notes) {
      ok(blob(fb).includes(row.notes), `${sid} ${year} keeps tape notes`)
    }
    if (row.pay != null) {
      ok(fb.pay?.value === row.pay, `${sid} ${year} tape pay ${row.pay}`)
      ok(
        (fb.pay?.source || '').includes('USA TODAY'),
        `${sid} ${year} pay source is USA TODAY`
      )
    } else if (fb.pay?.value != null && isUsaToday(fb.pay)) {
      const pinned = usatCoach(sid, year)
      ok(
        pinned?.pay === fb.pay.value && String(fb.pay.source || '').includes(String(year)),
        `${sid} ${year} USA TODAY cell is year-pinned, not copied`
      )
    }
    ok(
      (fb.term?.url || '').includes(String(year)),
      `${sid} ${year} Wikipedia season-page URL`
    )
  }
}

const lsu21 = chair('lsu', 2021)
const lsu24 = chair('lsu', 2024)
const lsu25 = chair('lsu', 2025)
const lsu26 = chair('lsu', 2026)
ok(lsu21.name === 'Ed Orgeron' && lsu21.pay.value === 9_012_917, 'LSU 2021 Orgeron USA TODAY 2021 $9,012,917')
ok((lsu21.pay?.source || '').includes('USA TODAY 2021'), 'LSU 2021 source is year-pinned')
ok(lsu24.name === 'Brian Kelly' && lsu24.pay.value === 9_975_000, 'LSU 2024 Kelly USA TODAY 2024 $9,975,000')
ok((lsu24.pay?.source || '').includes('USA TODAY 2024'), 'LSU 2024 source is year-pinned')
ok(lsu24.pay.value !== 10_175_000, 'LSU 2024 is not the 2025 Kelly cell')
ok(lsu25.name === 'Brian Kelly' && lsu25.pay.value === 10_175_000, 'LSU 2025 Kelly USA TODAY $10.175M')
ok(lsu26.name === 'Lane Kiffin' && lsu26.pay.value === 13_000_000, 'LSU 2026 Kiffin PDF $13M')
ok(lsu24.pay.value !== 13_000_000, 'Kiffin $13M is not on 2024')
ok((lsu26.pay?.source || '').includes('term sheet'), 'LSU 2026 stays on the term sheet')

const fsu24 = chair('florida-state', 2024)
const fsu25 = chair('florida-state', 2025)
const fsu26 = chair('florida-state', 2026)
ok(chair('florida-state', 2021).pay.value === 3_000_000, 'FSU 2021 Norvell CY2 TAC PDF')
ok(chair('florida-state', 2022).pay.value === 3_250_000, 'FSU 2022 Norvell CY3 TAC PDF')
ok(chair('florida-state', 2023).pay.value === 5_550_000, 'FSU 2023 Norvell CY4 TAC PDF')
ok(!(chair('florida-state', 2021).pay?.source || '').includes('USA TODAY'), 'FSU 2021 PDF wins over USA TODAY')
ok(fsu24.name === 'Mike Norvell' && fsu24.pay.value === 10_000_000, 'FSU 2024 Norvell CY5 TAC')
ok(!(fsu24.pay?.source || '').includes('USA TODAY'), 'FSU 2024 PDF wins over USA TODAY')
ok(fsu25.name === 'Mike Norvell' && fsu25.pay.value === 5_650_000, 'FSU 2025 Norvell USA TODAY $5.65M')
ok(fsu26.name === 'Mike Norvell' && fsu26.pay.value === 10_300_000, 'FSU 2026 Norvell CY7 TAC')
ok(staffNames('florida-state', 2024).includes('Adam Fuller'), 'FSU 2024 Fuller')
ok(staffNames('florida-state', 2024).includes('Alex Atkins'), 'FSU 2024 Atkins')
ok(staffNames('florida-state', 2026).includes('Tony White'), 'FSU 2026 White')
ok(staffNames('florida-state', 2026).includes('Tim Harris Jr.'), 'FSU 2026 Harris Jr.')
ok(!staffNames('florida-state', 2025).includes('Adam Fuller'), 'FSU 2025 no Fuller')
ok(!staffNames('florida-state', 2026).includes('Adam Fuller'), 'FSU 2026 no Fuller')
ok(!staffNames('florida-state', 2026).includes('Alex Atkins'), 'FSU 2026 no Atkins')
ok(staffNames('missouri', 2026).includes('Alex Atkins'), 'Missouri 2026 Atkins TE is correct')

ok(chair('illinois', 2025).pay.value === 8_200_000, 'Illinois 2025 Bielema USA TODAY $8.2M')
ok(chair('illinois', 2026).pay.value === 7_700_000, 'Illinois 2026 Bielema FY26 file $7.7M')
ok(chair('oregon', 2025).pay.value === 10_400_000, 'Oregon 2025 Lanning USA TODAY $10.4M')
ok(chair('oregon', 2026).pay.value === 9_600_000, 'Oregon 2026 Lanning CY5 file $9.6M')
ok(chair('clemson', 2025).pay.value === 11_447_025, 'Clemson 2025 USA TODAY')
ok(chair('clemson', 2026).pay.value === 11_500_000, 'Clemson 2026 BOT term sheet $11.5M')
ok(chair('north-carolina', 2025).pay.value === 10_100_000, 'UNC 2025 USA TODAY $10.1M')
ok(chair('north-carolina', 2026).pay.value === 10_000_000, 'UNC 2026 file $10M')
ok(chair('colorado', 2025).pay.value === 8_975_000, 'Colorado 2025 USA TODAY')
ok(chair('colorado', 2026).pay.value === 10_000_000, 'Colorado 2026 Sanders file $10M')
ok(chair('florida', 2026).pay.value === 7_450_000, 'Florida 2026 Sumrall file $7.45M')
ok(chair('kentucky', 2026).pay.value === 5_500_000, 'Kentucky 2026 Stein file $5.5M')
ok(chair('virginia-tech', 2026).pay.value === 6_000_000, 'VT 2026 Franklin LOI $6M')
ok(chair('iowa-state', 2026).pay.value === 3_000_000, 'ISU 2026 Rogers base-only $3M')
ok(chair('minnesota', 2025).pay.value === 7_000_000, 'Minnesota 2025 Fleck USA TODAY 2025 $7M')
ok((chair('minnesota', 2025).pay?.source || '').includes('USA TODAY 2025'), 'Minnesota 2025 is year-pinned')
ok(chair('minnesota', 2026).pay.value === 7_900_000, 'Minnesota 2026 Fleck docket $7.9M')
ok(chair('penn-state', 2026).pay.value === 8_000_000, 'Penn State 2026 Campbell term sheet $8M')
ok(chair('michigan-state', 2026).pay.value === 5_000_000, 'MSU 2026 Fitzgerald terms sheet $5M')
ok(chair('arkansas', 2026).pay.value === 6_500_000, 'Arkansas 2026 Silverfield term sheet $6.5M')
ok(chair('ole-miss', 2026).pay.value === 6_800_000, 'Ole Miss 2026 Golding term sheet $6.8M')
ok(chair('michigan', 2026).pay.value === 8_000_000, 'Michigan 2026 Whittingham MOU $8M')
ok(chair('ucla', 2026).pay.value === 5_400_000, 'UCLA 2026 Chesney EA $5.4M')
ok(chair('kansas-state', 2026).pay.value === 4_100_000, 'K-State 2026 Klein EA $4.1M')
ok(chair('oklahoma-state', 2026).pay.value === 3_800_000, 'Oklahoma State 2026 Morris EA $3.8M')
ok(chair('utah', 2026).pay.value === 5_100_000, 'Utah 2026 Scalley EA $5.1M')
ok(chair('indiana', 2026).pay.value === 12_025_000, 'Indiana 2026 Cignetti FOIA MOU $12.025M')
ok(chair('alabama', 2026).pay.value === 12_500_000, 'Alabama 2026 DeBoer trustee $12.5M')
ok(chair('ohio-state', 2026).pay.value === 12_500_000, 'Ohio State 2026 Day FOIA EA $12.5M')
ok(chair('california', 2026).pay.value == null, 'Cal 2026 Lupoi — no EA dollar')
ok(chair('missouri', 2021).name === 'Eliah Drinkwitz', 'Missouri Eliah')
ok(chair('washington', 2021).name === 'Jimmy Lake', 'UW 2021 Lake')
ok(chair('georgia-tech', 2022).name === 'Geoff Collins', 'GT 2022 Collins (started the year)')
ok(chair('northwestern', 2023).name === 'David Braun', 'NU 2023 Braun')
ok(chair('west-virginia', 2024).name === 'Neal Brown', 'WVU 2024 Neal Brown')
ok(chair('west-virginia', 2025).name === 'Rich Rodriguez', 'WVU 2025 Rodriguez')
ok(staffNames('lsu', 2026).includes('Charlie Weis Jr.'), 'LSU 2026 Weis Jr.')
ok(staffNames('lsu', 2026).includes('Blake Baker'), 'LSU 2026 Baker')
ok(staffNames('lsu', 2024).includes('Blake Baker'), 'LSU 2024 Baker is the USA TODAY name')
ok(staffNames('lsu', 2024).includes('Bo Davis'), 'LSU 2024 Bo Davis')
ok(!staffNames('lsu', 2024).includes('Charlie Weis Jr.'), 'LSU 2024 is not the 2026 Kiffin directory')
ok(staffNames('lsu', 2025).length === 0, 'LSU 2025 has no cloned 2026 directory')

ok(Object.keys(staffTape).length === 68, 'staff tape covers 68 schools')
for (const [sid, payload] of Object.entries(staffTape)) {
  const names = staffNames(sid, 2026)
  const want = (payload.assistants || []).map((a) => a.name)
  ok(names.join('|') === want.join('|'), `${sid} 2026 staff names match official directory`)
  const ad = applySeason(byId[sid], 2026).staff?.athleticDirector?.name
  if (payload.ad) {
    ok(ad === payload.ad, `${sid} 2026 AD is ${payload.ad}`)
    ok(!names.includes(payload.ad), `${sid} AD is not a football assistant`)
  }
  ok(chair(sid, 2026).name === payload.hc, `${sid} 2026 HC matches directory chair`)
}
ok(!staffNames('florida-state', 2025).includes('Adam Fuller'), 'FSU 2025 no Fuller')
ok(!staffNames('florida-state', 2025).includes('Alex Atkins'), 'FSU 2025 no Atkins')
ok(!staffNames('florida-state', 2025).includes('Tony White'), 'FSU 2025 is not the 2026 directory')
ok(staffNames('missouri', 2026).includes('Alex Atkins'), 'Missouri 2026 Atkins TE')
const baker26 = (applySeason(byId.lsu, 2026).staff?.assistants || []).find((a) => a.name === 'Blake Baker')
ok(baker26?.pay?.value == null, 'LSU 2026 Baker has no 2024 USA TODAY dollar')
const baker24 = (applySeason(byId.lsu, 2024).staff?.assistants || []).find((a) => a.name === 'Blake Baker')
ok(baker24?.pay?.value === 2_500_000, 'LSU 2024 Baker USA TODAY $2.5M')
ok(baker24?.pay?.asOf === '2024-12-18', 'LSU 2024 Baker asOf is Dec 18, 2024')

for (const year of [2021, 2022, 2023, 2024, 2025]) {
  ok(coachUsat[year]?.contractYear === year, `${year} HC tape exists`)
  ok(Object.keys(coachUsat[year]?.schools || {}).length === 68, `${year} HC tape has 68 schools`)
}

let publicPinned = { 2021: 0, 2022: 0, 2023: 0, 2024: 0 }
let publicPendingOk = { 2021: 0, 2022: 0, 2023: 0, 2024: 0 }
let cloned2024onto2026 = 0
for (const s of data.schools) {
  for (const year of [2021, 2022, 2023, 2024]) {
    const fb = chair(s.id, year)
    const row = usatCoach(s.id, year)
    const src = fb.pay?.source || ''
    if (isProtectedDollar(fb.pay)) {
      ok(fb.pay.value != null && !src.includes('USA TODAY'), `${s.id} ${year} keeps file dollar`)
      continue
    }
    if (row?.pay != null) {
      ok(fb.pay?.value === row.pay, `${s.id} ${year} pay is USA TODAY ${year} ${row.pay}`)
      ok(src.includes(`USA TODAY ${year} Total Pay`), `${s.id} ${year} source is year-pinned`)
      ok((fb.pay?.url || '').includes('/coach/team/'), `${s.id} ${year} cites the team page`)
      ok(fb.pay?.year === year, `${s.id} ${year} pay.year is ${year}`)
      ok((fb.pay?.asOf || '').startsWith(String(year)), `${s.id} ${year} asOf is that snapshot year`)
      if (!s.private) publicPinned[year] += 1
    } else {
      ok(fb.pay?.value == null, `${s.id} ${year} withheld / name-miss stays pending`)
      if (!s.private) publicPendingOk[year] += 1
    }
  }
  const y24 = usatCoach(s.id, 2024)
  const y26 = chair(s.id, 2026)
  if (
    y24?.pay != null &&
    y26.pay?.value === y24.pay &&
    isUsaToday(y26.pay) &&
    String(y26.pay.source || '').includes('2024')
  ) {
    cloned2024onto2026 += 1
    ok(false, `${s.id} 2026 still carries the 2024 USA TODAY dollar`)
  }
}
ok(publicPinned[2021] >= 52, `2021 public year-pinned ${publicPinned[2021]}`)
ok(publicPinned[2022] >= 53, `2022 public year-pinned ${publicPinned[2022]}`)
ok(publicPinned[2023] >= 53, `2023 public year-pinned ${publicPinned[2023]}`)
ok(publicPinned[2024] >= 53, `2024 public year-pinned ${publicPinned[2024]}`)
ok(cloned2024onto2026 === 0, 'no 2024 USA TODAY dollars on 2026 chairs')
ok(chair('penn-state', 2021).pay.value == null, 'Penn State 2021 Franklin Total Pay withheld')
ok(chair('notre-dame', 2022).pay.value == null, 'ND 2022 Freeman withheld')
ok(chair('miami', 2023).pay.value == null, 'Miami 2023 Cristobal withheld')
ok(chair('duke', 2024).pay.value == null, 'Duke 2024 Diaz withheld')
ok(chair('byu', 2024).pay.value == null, 'BYU 2024 Sitake withheld')

ok(byId['penn-state'].nil?.preCap?.value === 18_368_391, 'Penn State booked preCap untouched')
ok(byId['oklahoma-state'].nil?.preCap?.value === 16_000_000, 'OSU estimated preCap untouched')
ok(byId.texas.nil?.booked?.value === 13_500_000, 'Texas booked NIL untouched')
ok(byId.texas.nil?.preCap?.value === 3_200_000, 'Texas preCap untouched')
ok(byId.louisville.nil?.booked?.value != null, 'Louisville booked NIL untouched')
ok(byId.kentucky.nil?.booked?.value != null, 'Kentucky booked NIL untouched')
ok(byId.ucla.nil?.booked?.value != null, 'UCLA booked NIL untouched')
ok(byId.california.nil?.booked?.value != null, 'Cal booked NIL untouched')
for (const sid of ['georgia', 'tennessee', 'alabama', 'oregon', 'utah', 'north-carolina', 'ole-miss']) {
  ok(byId[sid].nil?.preCap?.value === 0, `${sid} Item 44 $0 untouched`)
}
ok(chair('auburn', 2026).pay.value === 6_750_000, 'Auburn 2026 Golesh file $6.75M')
ok(!(chair('auburn', 2026).pay?.source || '').includes('USA TODAY'), 'Auburn 2026 is not USA TODAY')
ok(chair('ohio-state', 2026).pay.value === 12_500_000, 'Ryan Day 2026 is the May 2026 FOIA cite, not a USA TODAY leftover')
ok(!(chair('ohio-state', 2026).pay?.source || '').includes('USA TODAY'), 'Ohio State 2026 source is not USA TODAY')
ok(byId['ohio-state'].coaches.football.pay.value === 12_500_000, 'Ryan Day current is stamped from the 2026 FOIA cite')
ok(byId.alabama.coaches.football.pay.value === 12_500_000, 'DeBoer current is stamped from the 2026 trustee cite')
ok(byId.indiana.coaches.football.pay.value === 12_025_000, 'Cignetti current is stamped from the 2026 MOU cite')
ok(chair('lsu', 2026).pay.value === 13_000_000, 'Kiffin $13M untouched')
ok(chair('penn-state', 2026).pay.value === 8_000_000, 'Campbell $8.0M untouched')

function sameChair(a, b) {
  return samePerson(a, b)
}
let stamped2026 = 0
for (const s of data.schools) {
  const cur = s.coaches?.football || {}
  const y26 = s.coachesByYear?.['2026']?.football || {}
  if (!sameChair(cur.name, y26.name)) continue
  const src = cur.pay?.source || ''
  const usat = src.toUpperCase().includes('USA TODAY')
  if (cur.pay?.value != null && !usat) {
    ok(y26.pay?.value === cur.pay.value, `${s.id} same-chair 2026 pay is stamped from the current-deal cite`)
    stamped2026 += 1
  } else if (usat) {
    ok(y26.pay?.value == null || !String(y26.pay?.source || '').toUpperCase().includes('USA TODAY'), `${s.id} 2026 did not take a USA TODAY snapshot`)
  }
  if (s.private && usat) {
    ok(y26.pay?.value == null, `${s.id} private 2026 stays pending without an independent cite`)
  }
}
ok(stamped2026 >= 22, `same-chair 2026 stamps ${stamped2026}`)

const stepIds = ['florida-state', 'penn-state', 'clemson', 'virginia-tech', 'north-carolina', 'iowa-state']
for (const sid of stepIds) {
  const steps = byId[sid].coaches.football.buyout?.steps || []
  ok(steps.length > 0, `${sid} has a PDF step tape`)
  ok(steps.every((st) => st.asOf && st.contractYear && st.notes), `${sid} steps carry asOf / contractYear / notes`)
  ok(steps.some((st) => st.remaining != null), `${sid} steps have remaining dollars`)
}
ok((byId.kentucky.coaches.football.buyout?.steps || []).length > 0, 'Kentucky 70% × Regular Comp table is now a derived step tape')
ok(byId.kentucky.coaches.football.buyout.steps[0].remaining === 19_950_000, 'Stein start-of-term remaining is $19.95M')
ok((byId['michigan-state'].coaches.football.buyout?.steps || []).length > 0, 'MSU 72.5% × YR1–5 is now a derived step tape')
ok(byId['michigan-state'].coaches.football.buyout.steps[0].remaining === 21_750_000, 'Fitzgerald YR1 remaining is $21.75M')
ok(byId['florida-state'].coaches.football.buyout.steps[0].remaining === 58_192_500, 'Norvell start-of-2026 remaining is $58,192,500')
ok(byId['penn-state'].coaches.football.buyout.steps[0].remaining === 70_500_000, 'Campbell start-of-2026 remaining is $70.5M')

ok(byId.louisville.nil.houseRemaining?.spent === 20_200_000, 'Louisville House spent is the Y1 portion, not $32.9M')
ok(byId.louisville.nil.houseRemaining?.value === 300_000, 'Louisville remaining $300k')
ok(byId.kentucky.nil.houseRemaining?.value === 2_500_000, 'Kentucky remaining $2.5M')
ok(byId.ucla.nil.houseRemaining?.value === 0, 'UCLA remaining $0 is a real cell')
ok(byId.california.nil.houseRemaining?.value === 0, 'Cal remaining $0 is a real cell')
ok(byId.texas.nil.houseRemaining?.value === 7_000_000, 'Texas remaining $7M YTD')
ok(byId.texas.nil.houseRemaining?.partialYear === true, 'Texas remaining is labeled YTD')
ok(byId['penn-state'].nil.houseRemaining == null, 'Penn State preCap is not a House remaining cell')
ok(byId.alabama.nil.houseRemaining == null, 'no invented remaining on a pending House cell')
ok(applySeason(byId.louisville, 2024).nil.houseRemaining == null, '2024 season does not show Year 1 remaining')
ok(applySeason(byId.louisville, 2025).nil.houseRemaining?.value === 300_000, '2025 season keeps Louisville remaining')
ok(applySeason(byId.louisville, 2026).nil.houseRemaining?.value === 300_000, '2026 season still shows the Year 1 residual')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} coachesByYear checks passed`)
if (failed.length) process.exit(1)
