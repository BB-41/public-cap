/**
 * Surgically insert nil.industryRosterEstimate. Does not rewrite the rest of schools.json.
 * Run: node scripts/book-industry-roster-estimates.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cells = JSON.parse(readFileSync(join(root, 'scripts/industry-roster-estimates.json'), 'utf8'))

const BOOKED_MUST = {
  louisville: 32_900_000,
  kentucky: 18_000_000,
  ucla: 20_500_000,
  california: 20_500_000,
  texas: 13_500_000,
}

function findNilSpan(text, schoolId) {
  const marker = `"id": "${schoolId}"`
  const start = text.indexOf(marker)
  if (start < 0) throw new Error(`missing id ${schoolId}`)
  const nilAt = text.indexOf('\n      "nil": {', start)
  if (nilAt < 0 || nilAt - start > 80000) throw new Error(`nil not near ${schoolId}`)
  const i = text.indexOf('{', nilAt)
  let depth = 0
  for (let j = i; j < text.length; j++) {
    if (text[j] === '{') depth += 1
    else if (text[j] === '}') {
      depth -= 1
      if (depth === 0) return [i, j]
    }
  }
  throw new Error(`unclosed nil for ${schoolId}`)
}

function insertKey(objText, key, valueJson) {
  const inner = objText.trim()
  if (!inner.startsWith('{') || !inner.endsWith('}')) throw new Error('nil object parse')
  let body = inner.slice(1, -1).replace(/,?\s*$/, '')
  if (body.includes(`"${key}"`)) throw new Error(`${key} already present`)
  return `{\n${body},\n${valueJson}\n      }`
}

function upsertKey(objText, key, valueJson) {
  const marker = `"${key}":`
  const start = objText.indexOf(marker)
  if (start < 0) return insertKey(objText, key, valueJson)
  const brace = objText.indexOf('{', start)
  let depth = 0
  for (let j = brace; j < objText.length; j++) {
    if (objText[j] === '{') depth += 1
    else if (objText[j] === '}') {
      depth -= 1
      if (depth === 0) {
        return objText.slice(0, start) + valueJson.trimStart() + objText.slice(j + 1)
      }
    }
  }
  throw new Error(`unclosed ${key}`)
}

function stripNulls(obj) {
  if (Array.isArray(obj)) return obj.map(stripNulls)
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, stripNulls(v)]),
    )
  }
  return obj
}

const src = join(root, 'data/schools.json')
let text = readFileSync(src, 'utf8')
const data = JSON.parse(text)
const byId = Object.fromEntries(data.schools.map((s) => [s.id, s]))
for (const [sid, expected] of Object.entries(BOOKED_MUST)) {
  const got = byId[sid].nil.booked.value
  if (got !== expected) throw new Error(`refusing: ${sid} booked ${got} != ${expected}`)
}
if (byId.lsu.nil.booked.value != null) throw new Error('LSU booked must stay pending')
if (byId.lsu.nil.houseRemaining) throw new Error('refusing: LSU already has houseRemaining')

const ids = Object.keys(cells).sort((a, b) => findNilSpan(text, b)[0] - findNilSpan(text, a)[0])
const upserted = []
for (const sid of ids) {
  const [lo, hi] = findNilSpan(text, sid)
  const obj = text.slice(lo, hi + 1)
  const cleaned = stripNulls(cells[sid])
  const dumped = JSON.stringify(cleaned, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : `        ${line}`))
    .join('\n')
  const valueJson = `        "industryRosterEstimate": ${dumped}`
  const next = upsertKey(obj, 'industryRosterEstimate', valueJson)
  text = text.slice(0, lo) + next + text.slice(hi + 1)
  upserted.push(sid)
}

writeFileSync(src, text)
writeFileSync(join(root, 'public/data/schools.json'), text)

const check = JSON.parse(text)
const after = Object.fromEntries(check.schools.map((s) => [s.id, s]))
for (const [sid, expected] of Object.entries(BOOKED_MUST)) {
  if (after[sid].nil.booked.value !== expected) throw new Error(`post-write booked drifted ${sid}`)
}
if (after.lsu.nil.booked.value != null) throw new Error('post-write LSU booked drifted')
if (after.lsu.nil.houseRemaining) throw new Error('post-write invented LSU House remaining')
if (after.lsu.nil.industryRosterEstimate.low !== 40_000_000) throw new Error('LSU range missing')
if (after.lsu.nil.industryRosterEstimate.value != null) throw new Error('LSU estimate must not have a point value')
if (after.texas.nil.houseRemaining.value !== 7_000_000) throw new Error('Texas leftover drifted')
if (Object.keys(cells).length !== upserted.length) throw new Error('upsert count mismatch')
if (after.indiana.nil.industryRosterEstimate.low !== 30_000_000) throw new Error('Indiana range missing')
if (after.alabama.nil.industryRosterEstimate) throw new Error('Alabama must stay empty — not in the published survey')
console.log('upserted industryRosterEstimate for', upserted.sort().join(', '))
