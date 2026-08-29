/**
 * Mechanical split of the desk book for faster first paint.
 * Does not change any dollar, school record, or methodology value.
 *
 * Writes (gitignored, generated on dev/build):
 *   public/data/meta.json          — book meta only
 *   public/data/desk.json          — all 68 schools minus staff / staffByYear
 *   public/data/school-full/<id>.json — complete school objects
 *   public/data/layers-lite.json   — football records only (home / compare wins)
 *
 * Source of truth stays data/schools.json + public/data/schools.json (kept in sync).
 *
 * Run: node scripts/split-desk-payload.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

export const DESK_DROP_KEYS = ['staff', 'staffByYear']

export function slimSchool(school) {
  const out = { ...school }
  for (const k of DESK_DROP_KEYS) delete out[k]
  return out
}

export function splitDeskPayload({
  schoolsPath = join(root, 'public/data/schools.json'),
  layersPath = join(root, 'public/data/layers.json'),
  outDir = join(root, 'public/data'),
} = {}) {
  const data = JSON.parse(readFileSync(schoolsPath, 'utf8'))
  if (!data?.meta || !Array.isArray(data.schools) || data.schools.length !== 68) {
    throw new Error('schools.json must have meta + 68 schools')
  }

  const desk = {
    meta: data.meta,
    schools: data.schools.map(slimSchool),
  }

  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'meta.json'), JSON.stringify(data.meta))
  writeFileSync(join(outDir, 'desk.json'), JSON.stringify(desk))

  const fullDir = join(outDir, 'school-full')
  mkdirSync(fullDir, { recursive: true })
  for (const school of data.schools) {
    writeFileSync(join(fullDir, `${school.id}.json`), JSON.stringify(school))
  }

  try {
    const layers = JSON.parse(readFileSync(layersPath, 'utf8'))
    const lite = {
      meta: layers.meta || {},
      schools: Object.fromEntries(
        Object.entries(layers.schools || {}).map(([id, row]) => [id, { record: row?.record ?? null }]),
      ),
    }
    writeFileSync(join(outDir, 'layers-lite.json'), JSON.stringify(lite))
  } catch (err) {
    if (err && err.code !== 'ENOENT') throw err
  }

  return {
    schoolCount: data.schools.length,
    deskBytes: Buffer.byteLength(JSON.stringify(desk)),
    fullBytes: Buffer.byteLength(JSON.stringify(data)),
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const info = splitDeskPayload()
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`
  console.log(
    `desk split: ${info.schoolCount} schools · full ${kb(info.fullBytes)} → desk ${kb(info.deskBytes)}`,
  )
}
