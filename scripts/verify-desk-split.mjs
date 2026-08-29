/**
 * Prove the slim desk book keeps every rank / compare / buyout number.
 * Run: node scripts/verify-desk-split.mjs
 */
import { readFileSync } from 'node:fs'
import { enrichSchools } from '../src/lib/enrich.js'
import { DESK_DROP_KEYS, slimSchool, splitDeskPayload } from './split-desk-payload.mjs'

const full = JSON.parse(readFileSync(new URL('../data/schools.json', import.meta.url), 'utf8'))
const publicFull = JSON.parse(readFileSync(new URL('../public/data/schools.json', import.meta.url), 'utf8'))
const layers = JSON.parse(readFileSync(new URL('../public/data/layers.json', import.meta.url), 'utf8'))

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

ok(JSON.stringify(full) === JSON.stringify(publicFull), 'data/schools.json synced to public/data')
ok(full.schools.length === 68, '68 schools')

const info = splitDeskPayload()
ok(info.schoolCount === 68, 'split wrote 68 schools')
ok(info.deskBytes < info.fullBytes * 0.4, `desk is under 40% of full (${info.deskBytes} vs ${info.fullBytes})`)

const desk = {
  meta: full.meta,
  schools: full.schools.map(slimSchool),
}

ok(JSON.stringify(desk.meta) === JSON.stringify(full.meta), 'meta unchanged')

for (const school of full.schools) {
  const slim = slimSchool(school)
  for (const k of DESK_DROP_KEYS) {
    ok(!(k in slim), `${school.id} desk omits ${k}`)
  }
  for (const [k, v] of Object.entries(school)) {
    if (DESK_DROP_KEYS.includes(k)) {
      ok(!(k in slim), `${school.id} desk omits ${k}`)
      continue
    }
    ok(JSON.stringify(slim[k]) === JSON.stringify(v), `${school.id} ${k} unchanged`)
  }
}

const seasons = [2021, 2022, 2023, 2024, 2025, 2026]
for (const includeAlumni of [false, true]) {
  for (const season of seasons) {
    const a = enrichSchools({ data: full, season, includeAlumni, layers })
    const b = enrichSchools({ data: desk, season, includeAlumni, layers })
    ok(a.length === 68 && b.length === 68, `enrich ${season} alumni=${includeAlumni} count`)
    for (let i = 0; i < a.length; i++) {
      const A = a[i]
      const B = b[i]
      const label = `${A.id} ${season} alumni=${includeAlumni}`
      ok(A.id === B.id, `${label} id`)
      ok(A._cap.booked === B._cap.booked, `${label} booked cap ${A._cap.booked} vs ${B._cap.booked}`)
      ok(A._cap.total === B._cap.total, `${label} total cap`)
      ok(A._ratios.nil === B._ratios.nil, `${label} booked NIL`)
      ok(A._ratios.nilOverCapacity === B._ratios.nilOverCapacity, `${label} NIL/cap`)
      ok(A._ratios.nilOverHouse === B._ratios.nilOverHouse, `${label} NIL/House`)
      ok(A.nil.modeled?.mid === B.nil.modeled?.mid, `${label} modeled mid`)
      ok(A.nil.modeled?.low === B.nil.modeled?.low, `${label} modeled low`)
      ok(A.nil.modeled?.high === B.nil.modeled?.high, `${label} modeled high`)
      ok(A.coaches.football.pay?.value === B.coaches.football.pay?.value, `${label} FB pay`)
      ok(A.coaches.football.buyout?.value === B.coaches.football.buyout?.value, `${label} FB buyout`)
      ok(A._eff?.wins === B._eff?.wins, `${label} wins`)
      ok(A._eff?.winsPerNilPerM === B._eff?.winsPerNilPerM, `${label} W/$M NIL`)
      ok(A._conf.primary === B._conf.primary, `${label} mark`)
    }
  }
}

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length) process.exit(1)
