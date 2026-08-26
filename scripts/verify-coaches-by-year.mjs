import { readFileSync } from 'fs'
import { applySeason } from '../src/lib/seasons.js'

const data = JSON.parse(readFileSync(new URL('../data/schools.json', import.meta.url), 'utf8'))
const byId = Object.fromEntries(data.schools.map((s) => [s.id, s]))

function chair(id, year) {
  return applySeason(byId[id], year).coaches.football
}
function staffNames(id, year) {
  return (applySeason(byId[id], year).staff?.assistants || []).map((a) => a.name)
}

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

const lsu21 = chair('lsu', 2021)
const lsu24 = chair('lsu', 2024)
const lsu26 = chair('lsu', 2026)
ok(lsu21.name === 'Ed Orgeron' && lsu21.pay.value == null, 'LSU 2021 Orgeron, no invented pay')
ok(lsu24.name === 'Brian Kelly' && lsu24.pay.value === 10_175_000, 'LSU 2024 Kelly USA TODAY $10.175M')
ok(lsu26.name === 'Lane Kiffin' && lsu26.pay.value === 13_000_000, 'LSU 2026 Kiffin PDF $13M')
ok(lsu24.pay.value !== 13_000_000, 'Kiffin $13M is not on 2024')

const fsu24 = chair('florida-state', 2024)
const fsu26 = chair('florida-state', 2026)
ok(fsu24.name === 'Mike Norvell' && fsu24.pay.value === 10_000_000, 'FSU 2024 Norvell CY5 TAC')
ok(fsu26.name === 'Mike Norvell' && fsu26.pay.value === 10_300_000, 'FSU 2026 Norvell CY7 TAC')
ok(staffNames('florida-state', 2024).join() === 'Adam Fuller,Alex Atkins', 'FSU 2024 Fuller/Atkins')
ok(staffNames('florida-state', 2026).join() === 'Tony White,Tim Harris Jr.', 'FSU 2026 White/Harris Jr.')
ok(!staffNames('florida-state', 2026).includes('Adam Fuller'), 'FSU 2024 assistants not on 2026')

ok(chair('florida', 2024).name === 'Billy Napier', 'Florida 2024 Napier')
ok(chair('florida', 2026).name === 'Jon Sumrall', 'Florida 2026 Sumrall')
ok(chair('ole-miss', 2024).name === 'Lane Kiffin', 'Ole Miss 2024 Kiffin')
ok(chair('ole-miss', 2026).name === 'Pete Golding', 'Ole Miss 2026 Golding')
ok(chair('clemson', 2024).name === 'Dabo Swinney' && chair('clemson', 2024).pay.value == null, 'Clemson 2024 name only — no 2026 file pay copied back')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} coachesByYear checks passed`)
if (failed.length) process.exit(1)
