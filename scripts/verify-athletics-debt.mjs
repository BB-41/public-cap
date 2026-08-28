/**
 * Athletics-debt lane honesty.
 * Run: node scripts/verify-athletics-debt.mjs
 */
import { readFileSync } from 'node:fs'
import { debtHeadline, layerHasDebt } from '../src/lib/layers.js'
import { SCHOOL_DRILLS } from '../src/lib/share.js'
import { DEFS } from '../src/lib/definitions.js'

const layers = JSON.parse(readFileSync(new URL('../public/data/layers.json', import.meta.url), 'utf8'))
const schools = JSON.parse(readFileSync(new URL('../data/schools.json', import.meta.url), 'utf8'))
const pubSchools = JSON.parse(readFileSync(new URL('../public/data/schools.json', import.meta.url), 'utf8'))

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

ok(JSON.stringify(schools) === JSON.stringify(pubSchools), 'schools.json copies still match — debt did not stamp schools.json')
ok(SCHOOL_DRILLS.has('debt'), 'share hash #debt is a school drill')
ok(DEFS.debt?.text?.includes('not the university'), 'definitions.js has the athletics-debt line')

const ids = Object.keys(layers.schools)
ok(ids.length === 68, '68 layer schools')

const booked = []
const pending = []
for (const [id, layer] of Object.entries(layers.schools)) {
  const d = layer.debt
  ok(d, `${id} has a debt object`)
  if (!d) continue
  const cells = [d.outstanding, d.debtService, ...(d.projects || [])]
  for (const cell of cells) {
    if (!cell) continue
    const val = cell.value != null ? cell.value : cell.cost
    if (val != null) {
      ok(!!cell.url, `${id} booked cell has a URL`)
      ok(cell.confidence === 'reported' || cell.confidence === 'estimated', `${id} booked cell is reported/estimated`)
      ok(!/on3|opendorse|nil go|linkedin|glassdoor|instagram|tiktok/i.test(`${cell.source || ''} ${cell.url || ''}`), `${id} source is allowed`)
    }
  }
  if (d.outstanding?.value != null || d.debtService?.value != null || (d.projects || []).length) {
    booked.push(id)
    ok(layerHasDebt(layer), `${id} layerHasDebt`)
    const head = debtHeadline(d)
    if (d.outstanding?.value != null) ok(head.kind === 'outstanding', `${id} headline is outstanding`)
    else if (d.debtService?.value != null) ok(head.kind === 'debtService', `${id} headline is debt service`)
  } else {
    pending.push(id)
  }
}

const capKeys = ['mediaConference', 'sponsorships', 'tickets', 'contributions']
for (const s of schools.schools) {
  for (const k of capKeys) {
    ok(s.capacity?.[k] != null, `${s.id} capacity.${k} still present`)
  }
}

ok(booked.length >= 18, `booked at least 18 schools with a cited cell (got ${booked.length})`)
console.log(`booked ${booked.length}: ${booked.sort().join(', ')}`)
console.log(`pending ${pending.length}: ${pending.sort().join(', ')}`)
const failed = checks.filter((c) => !c.ok)
if (failed.length) {
  console.error(`${failed.length} failed`)
  process.exit(1)
}
console.log(`${checks.length} checks ok`)
