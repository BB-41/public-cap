import { readFileSync } from 'fs'
import { applySeason } from '../src/lib/seasons.js'

const data = JSON.parse(readFileSync(new URL('../data/schools.json', import.meta.url), 'utf8'))
const tape = JSON.parse(readFileSync(new URL('./hc-history.json', import.meta.url), 'utf8'))
const staffTape = {
  ...JSON.parse(readFileSync(new URL('./staff-2026-acc-sec.json', import.meta.url), 'utf8')),
  ...JSON.parse(readFileSync(new URL('./staff-2026-b12.json', import.meta.url), 'utf8')),
  ...JSON.parse(readFileSync(new URL('./staff-2026-b1g.json', import.meta.url), 'utf8')),
}
const byId = Object.fromEntries(data.schools.map((s) => [s.id, s]))

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
    } else {
      const src = fb.pay?.source || ''
      ok(
        fb.pay?.value == null || !src.includes('USA TODAY'),
        `${sid} ${year} has no copied USA TODAY cell`
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
ok(lsu21.name === 'Ed Orgeron' && lsu21.pay.value == null, 'LSU 2021 Orgeron, no invented pay')
ok(lsu24.name === 'Brian Kelly' && lsu24.pay.value == null, 'LSU 2024 Kelly — name only, no copied 2025 cell')
ok(lsu25.name === 'Brian Kelly' && lsu25.pay.value === 10_175_000, 'LSU 2025 Kelly USA TODAY $10.175M')
ok(lsu26.name === 'Lane Kiffin' && lsu26.pay.value === 13_000_000, 'LSU 2026 Kiffin PDF $13M')
ok(lsu24.pay.value !== 13_000_000, 'Kiffin $13M is not on 2024')

const fsu24 = chair('florida-state', 2024)
const fsu25 = chair('florida-state', 2025)
const fsu26 = chair('florida-state', 2026)
ok(fsu24.name === 'Mike Norvell' && fsu24.pay.value === 10_000_000, 'FSU 2024 Norvell CY5 TAC')
ok(fsu25.name === 'Mike Norvell' && fsu25.pay.value === 5_650_000, 'FSU 2025 Norvell USA TODAY $5.65M')
ok(fsu26.name === 'Mike Norvell' && fsu26.pay.value === 10_300_000, 'FSU 2026 Norvell CY7 TAC')
ok(staffNames('florida-state', 2024).join() === 'Adam Fuller,Alex Atkins', 'FSU 2024 Fuller/Atkins')
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
ok(chair('minnesota', 2025).pay.value == null, 'Minnesota 2025 Fleck — no tape pay cell')
ok(chair('missouri', 2021).name === 'Eliah Drinkwitz', 'Missouri Eliah')
ok(chair('washington', 2021).name === 'Jimmy Lake', 'UW 2021 Lake')
ok(chair('georgia-tech', 2022).name === 'Geoff Collins', 'GT 2022 Collins (started the year)')
ok(chair('northwestern', 2023).name === 'David Braun', 'NU 2023 Braun')
ok(chair('west-virginia', 2024).name === 'Neal Brown', 'WVU 2024 Neal Brown')
ok(chair('west-virginia', 2025).name === 'Rich Rodriguez', 'WVU 2025 Rodriguez')
ok(staffNames('lsu', 2026).includes('Charlie Weis Jr.'), 'LSU 2026 Weis Jr.')
ok(staffNames('lsu', 2026).includes('Blake Baker'), 'LSU 2026 Baker')

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
ok(staffNames('missouri', 2026).includes('Alex Atkins'), 'Missouri 2026 Atkins TE')
const baker = (applySeason(byId.lsu, 2026).staff?.assistants || []).find((a) => a.name === 'Blake Baker')
ok(baker?.pay?.value === 2_500_000, 'LSU 2026 Baker keeps cited $2.5M')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} coachesByYear checks passed`)
if (failed.length) process.exit(1)
