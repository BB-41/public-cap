/**
 * Stamp conference-exit cells on every school record without rewriting
 * existing dollars or JSON number formatting.
 *
 * Run: node scripts/book-conference-exit.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ACC_FOOTBALL_IDS,
  ACC_LADDER,
  ACC_NOTES,
  ACC_SOURCE,
  PENDING_NOTES,
  SEC_IDS,
  SEC_NOTES,
  SEC_SOURCE,
  SEC_STAIRS,
  accStepLabel,
} from '../src/lib/conferenceExit.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const BLOCKER =
  'Conference exit is a school-page stock, not annual capacity, and not a coach-firing buyout. ACC football members: settlement year ladder (rights in tow) from The Post and Courier quote of the 68-page Clemson/FSU/ACC settlement. SEC: 2023–24 bylaws §3.2.1 $30 million with-notice (hosted PDF); $40M/$45M stairs footnoted. Big Ten, Big 12, and Notre Dame football stay pending. Do not stamp the old Big 12 $100M Texas/Oklahoma one-off on remaining members.'

function accRecord() {
  return {
    instrument: 'acc-settlement-ladder',
    conference: 'ACC',
    rightsInTow: true,
    label: 'Conference exit',
    source: ACC_SOURCE.source,
    url: ACC_SOURCE.url,
    asOf: ACC_SOURCE.asOf,
    confidence: ACC_SOURCE.confidence,
    ladder: ACC_LADDER.map((row) => ({
      fiscalYear: row.fiscalYear,
      throughFiscalYear: row.throughFiscalYear || null,
      exitSeason: row.exitSeason,
      value: row.value,
      label: accStepLabel(row),
      confidence: ACC_SOURCE.confidence,
      source: ACC_SOURCE.source,
      url: ACC_SOURCE.url,
      asOf: ACC_SOURCE.asOf,
      notes: row.notes || null,
    })),
    notes: ACC_NOTES,
  }
}

function secRecord() {
  return {
    instrument: 'sec-bylaw-withdrawal',
    conference: 'SEC',
    rightsInTow: false,
    label: 'Conference exit',
    source: SEC_SOURCE.source,
    url: SEC_SOURCE.url,
    asOf: SEC_SOURCE.asOf,
    confidence: SEC_SOURCE.confidence,
    fee: {
      value: 30_000_000,
      confidence: SEC_SOURCE.confidence,
      source: SEC_SOURCE.source,
      url: SEC_SOURCE.url,
      asOf: SEC_SOURCE.asOf,
      fiscalYear: '2023-24',
      bylaw: '3.2.1',
      notes: 'With required notice. Headline cell.',
    },
    stairs: SEC_STAIRS.map((row) => ({
      ...row,
      confidence: SEC_SOURCE.confidence,
      source: SEC_SOURCE.source,
      url: SEC_SOURCE.url,
      asOf: SEC_SOURCE.asOf,
    })),
    notes: SEC_NOTES,
  }
}

function pendingRecord(conference) {
  return {
    instrument: null,
    conference,
    rightsInTow: null,
    label: 'Conference exit',
    source: null,
    url: null,
    asOf: null,
    confidence: 'pending',
    fee: {
      value: null,
      confidence: 'pending',
      source: null,
      url: null,
      asOf: null,
      notes: PENDING_NOTES[conference] || 'No hosted exit schedule on the desk.',
    },
    notes: PENDING_NOTES[conference] || 'No hosted exit schedule on the desk.',
  }
}

function recordFor(school) {
  if (ACC_FOOTBALL_IDS.includes(school.id)) return accRecord()
  if (SEC_IDS.includes(school.id)) return secRecord()
  return pendingRecord(school.conference)
}

function indentJson(obj, spaces) {
  const pad = ' '.repeat(spaces)
  return JSON.stringify(obj, null, 2)
    .split('\n')
    .map((line) => pad + line)
    .join('\n')
}

function stampSchoolsText(raw, schools) {
  let out = raw
  if (!out.includes('Conference exit is a school-page stock')) {
    const marker = 'Privates and withheld chairs stay pending. No On3 / Opendorse / NIL Go."'
    if (!out.includes(marker)) throw new Error('could not find last blockers line')
    out = out.replace(marker, `${marker},\n      "${BLOCKER}"`)
  }
  for (const school of schools) {
    if (out.includes(`"id": "${school.id}"`) && out.includes(`"conferenceExit"`) && new RegExp(`"id": "${school.id}"[\\s\\S]{0,400}"conferenceExit"`).test(out)) {
      continue
    }
    const lit = (s) => JSON.stringify(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const needle = new RegExp(
      `("id": "${school.id}",\\n\\s+"name": ${lit(school.name)},\\n\\s+"shortName": ${lit(school.shortName)},\\n\\s+"conference": ${lit(school.conference)},)`,
    )
    const block = indentJson(recordFor(school), 6)
    if (!needle.test(out)) throw new Error(`could not find header for ${school.id}`)
    out = out.replace(needle, (m) => `${m}\n      "conferenceExit": ${block.trimStart()},`)
  }
  return out
}

function tapeItem({ id, date, school, schoolName, headline, figure, source, field }) {
  return {
    id,
    date,
    school,
    schoolName,
    kind: 'conference-exit',
    headline,
    figure,
    confidence: 'reported',
    source,
    field,
  }
}

function stampTapeText(raw, schools) {
  if (raw.includes('"kind": "conference-exit"')) return raw
  const byId = Object.fromEntries(schools.map((s) => [s.id, s]))
  const items = [
    ...ACC_FOOTBALL_IDS.map((id) =>
      tapeItem({
        id: `${id}-conference-exit-acc-settlement-2025-07`,
        date: '2025-07-03',
        school: id,
        schoolName: byId[id].name,
        headline:
          'Post and Courier quote of the 68-page ACC/Clemson/FSU settlement: year ladder $165M (FY 2025–26 / 2026 exit) stepping down $18M a year to a $75M floor (2030–31 through 2036), rights in tow.',
        figure: 165_000_000,
        source: { label: ACC_SOURCE.source, url: ACC_SOURCE.url },
        field: 'conferenceExit',
      }),
    ),
    ...SEC_IDS.map((id) =>
      tapeItem({
        id: `${id}-conference-exit-sec-bylaws-3-2-1`,
        date: '2024-06-14',
        school: id,
        schoolName: byId[id].name,
        headline:
          'Hosted 2023–24 SEC Bylaws §3.2.1: $30 million withdrawal fee with required notice. §3.2.2 $40M without notice and §3.2.3 $45M deemed withdrawn are footnoted. Cash fee — not an ACC-style rights-in-tow ladder.',
        figure: 30_000_000,
        source: { label: SEC_SOURCE.source, url: SEC_SOURCE.url },
        field: 'conferenceExit',
      }),
    ),
  ]
  const block = items.map((it) => `${indentJson(it, 4)},`).join('\n')
  let out = raw.replace('"items": [\n', `"items": [\n${block}\n`)
  out = out.replace(/"itemCount": 309/, `"itemCount": ${309 + items.length}`)
  return out
}

function writeBoth(rel, transform) {
  const path = join(root, rel)
  const raw = readFileSync(path, 'utf8')
  const next = transform(raw)
  JSON.parse(next) // refuse to write invalid JSON
  writeFileSync(path, next)
}

const book = JSON.parse(readFileSync(join(root, 'data/schools.json'), 'utf8'))
writeBoth('data/schools.json', (raw) => stampSchoolsText(raw, book.schools))
writeBoth('public/data/schools.json', (raw) => stampSchoolsText(raw, book.schools))
writeBoth('data/tape.json', (raw) => stampTapeText(raw, book.schools))
writeBoth('public/data/tape.json', (raw) => stampTapeText(raw, book.schools))

const stamped = JSON.parse(readFileSync(join(root, 'data/schools.json'), 'utf8'))
const exits = stamped.schools.filter((s) => s.conferenceExit).length
console.log(`stamped conferenceExit on ${exits} schools`)
