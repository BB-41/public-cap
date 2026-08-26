import { readFileSync } from 'fs'
import { applySeason, CURRENT_SEASON, emptyStaffForSeason, staffRowsAreClone } from '../src/lib/seasons.js'

const data = JSON.parse(readFileSync(new URL('../data/schools.json', import.meta.url), 'utf8'))
const tape2024 = JSON.parse(readFileSync(new URL('./staff-usat/2024.json', import.meta.url), 'utf8'))
const staff2026 = {
  ...JSON.parse(readFileSync(new URL('./staff-2026-acc-sec.json', import.meta.url), 'utf8')),
  ...JSON.parse(readFileSync(new URL('./staff-2026-b12.json', import.meta.url), 'utf8')),
  ...JSON.parse(readFileSync(new URL('./staff-2026-b1g.json', import.meta.url), 'utf8')),
}
const byId = Object.fromEntries(data.schools.map((s) => [s.id, s]))

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

function names(id, year) {
  return (applySeason(byId[id], year).staff?.assistants || []).map((a) => a.name)
}
function paid(id, year) {
  return (applySeason(byId[id], year).staff?.assistants || []).filter((a) => a.pay?.value != null)
}
function pool(id, year) {
  return applySeason(byId[id], year).staff?.footballAssistantPool
}
function rawKey(id, year) {
  return byId[id].staffByYear?.[year] || byId[id].staffByYear?.[String(year)] || null
}

ok(data.schools.length === 68, '68 schools on the desk')
ok(Object.keys(staff2026).length === 68, '2026 directory covers 68')
ok(tape2024.contractYear === 2024 && tape2024.asOf === '2024-12-18', '2024 tape is USA TODAY Dec 18, 2024')

const auburn26 = applySeason(byId.auburn, 2026)
ok(auburn26.coaches.football.name === 'Alex Golesh', 'Auburn 2026 HC is Golesh')
ok(auburn26.coaches.football.pay?.value === 6_750_000, 'Auburn Golesh $6.75M HC pay is untouched')

const lsu = {
  2024: applySeason(byId.lsu, 2024),
  2025: applySeason(byId.lsu, 2025),
  2026: applySeason(byId.lsu, 2026),
}
ok(lsu[2024].coaches.football.name === 'Brian Kelly', 'LSU 2024 HC tape is Kelly')
ok(lsu[2026].coaches.football.name === 'Lane Kiffin', 'LSU 2026 HC tape is Kiffin')
ok(names('lsu', 2024).join() === 'Blake Baker,Bo Davis', 'LSU 2024 USA TODAY names')
ok(pool('lsu', 2024)?.value === 9_300_000, 'LSU 2024 Kelly-era pool $9.3M')
ok(pool('lsu', 2026) == null || pool('lsu', 2026).value == null, 'LSU 2026 has no 2024 pool')
ok(names('lsu', 2026).includes('Charlie Weis Jr.'), 'LSU 2026 keeps Kiffin-staff names')
ok(paid('lsu', 2026).length === 0, 'LSU 2026 assistants have no 2024 dollars')
ok(names('lsu', 2025).length === 0, 'LSU 2025 is empty, not a 2026 clone')
ok(!rawKey('lsu', 2025), 'LSU has no staffByYear.2025 key')

ok(names('florida-state', 2024).join() === 'Adam Fuller,Alex Atkins', 'FSU 2024 Fuller/Atkins kept')
ok(paid('florida-state', 2024).map((a) => a.pay.value).join() === '2015000,1265000', 'FSU 2024 dollars kept')
ok(names('florida-state', 2026).includes('Tony White'), 'FSU 2026 White')
ok(names('florida-state', 2026).includes('Tim Harris Jr.'), 'FSU 2026 Harris')
ok(!names('florida-state', 2026).includes('Adam Fuller'), 'FSU 2026 no Fuller')
ok(names('florida-state', 2025).length === 0, 'FSU 2025 empty')

ok(names('auburn', 2024).join() === 'DJ Durkin,Charles Kelly', 'Auburn 2024 Freeze-era USA TODAY names')
ok(pool('auburn', 2024)?.value === 6_475_000, 'Auburn 2024 Freeze pool')
ok(pool('auburn', 2026) == null || pool('auburn', 2026).value == null, 'Auburn 2026 has no Freeze pool')
ok(names('auburn', 2026).includes('DJ Durkin'), 'Auburn 2026 directory still lists Durkin as DC')
ok(
  (applySeason(byId.auburn, 2026).staff?.assistants || []).find((a) => a.name === 'DJ Durkin')?.pay?.value == null,
  'Auburn 2026 Durkin has no 2024 Freeze-era dollar'
)

ok(names('ohio-state', 2024).join() === 'Jim Knowles,Chip Kelly', 'Ohio State 2024 USA TODAY names')
ok(pool('ohio-state', 2024)?.value === 11_425_000, 'Ohio State 2024 $11.425M pool')
ok(pool('ohio-state', 2026) == null || pool('ohio-state', 2026).value == null, 'Ohio State 2026 has no 2024 pool')

let usat2024Schools = 0
let clone2025 = 0
let dollarsOn2026 = 0
let poolOn2026 = 0
let staffMismatch = 0
for (const s of data.schools) {
  const y24 = applySeason(s, 2024).staff
  const y25 = applySeason(s, 2025).staff
  const y26 = applySeason(s, 2026).staff
  const tape = tape2024.schools[s.id]
  if (tape) {
    usat2024Schools += 1
    const want = (tape.assistants || []).map((a) => a.name)
    ok(names(s.id, 2024).join('|') === want.join('|'), `${s.id} 2024 names match USA TODAY tape`)
    for (const a of y24.assistants || []) {
      ok(a.pay?.asOf === '2024-12-18', `${s.id} 2024 ${a.name} asOf 2024-12-18`)
      ok(a.pay?.value != null, `${s.id} 2024 ${a.name} has a cited dollar`)
    }
    if (tape.pool != null) {
      ok(y24.footballAssistantPool?.value === tape.pool, `${s.id} 2024 pool ${tape.pool}`)
    }
  }
  const raw25 = rawKey(s.id, 2025)
  if (raw25 && staffRowsAreClone(raw25, rawKey(s.id, 2026) || s.staff)) {
    clone2025 += 1
    ok(false, `${s.id} still has a 2025 clone of 2026`)
  }
  ok((y25.assistants || []).length === 0, `${s.id} 2025 assistants empty`)
  ok(!y25.footballAssistantPool?.value, `${s.id} 2025 has no 2024 pool`)

  const want26 = (staff2026[s.id]?.assistants || []).map((a) => a.name)
  ok(names(s.id, 2026).join('|') === want26.join('|'), `${s.id} 2026 names match official directory`)
  ok(names(s.id, CURRENT_SEASON).join('|') === (s.staff?.assistants || []).map((a) => a.name).join('|'), `${s.id} current staff matches 2026`)
  for (const a of y26.assistants || []) {
    if (a.pay?.asOf === '2024-12-18' || (a.pay?.value != null && (a.pay.source || '').includes('football assistant salary database'))) {
      dollarsOn2026 += 1
      ok(false, `${s.id} 2026 ${a.name} still has 2024 USA TODAY pay`)
    }
  }
  if (y26.footballAssistantPool?.asOf === '2024-12-18' || (y26.footballAssistantPool?.source || '').includes('assistant salary database')) {
    poolOn2026 += 1
    ok(false, `${s.id} 2026 still carries a 2024 staff-total pool`)
  }
  if (s.staff?.footballAssistantPool?.asOf === '2024-12-18') {
    staffMismatch += 1
    ok(false, `${s.id} current staff still has 2024 pool`)
  }
}

ok(usat2024Schools === Object.keys(tape2024.schools).length, 'every tape school applied')
ok(clone2025 === 0, 'no 2025 directory clones remain')
ok(dollarsOn2026 === 0, 'no 2024 assistant dollars on 2026')
ok(poolOn2026 === 0, 'no 2024 pools on 2026')
ok(staffMismatch === 0, 'current staff has no 2024 pools')

const empty21 = emptyStaffForSeason(2021)
ok((empty21.notes || '').includes('staffByYear.2021'), '2021 empty notes leave an ingest slot')
ok(names('notre-dame', 2024).length === 0, 'ND 2024 has no invented USA TODAY assistants')
ok(names('notre-dame', 2021).length === 0, 'ND 2021 empty')

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} staffByYear checks passed`)
if (failed.length) process.exit(1)
