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
  B12_IDS,
  B12_990,
  B12_BYLAWS,
  ND_HALE,
  PENDING_NOTES,
  SEC_IDS,
  SEC_NOTES,
  SEC_SOURCE,
  SEC_STAIRS,
  accStepLabel,
  b12ModeledFee,
  b12Record,
  ndRecord,
} from '../src/lib/conferenceExit.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const BLOCKER =
  'Conference exit is a school-page stock, not annual capacity, and not a coach-firing buyout. ACC football members: settlement year ladder (rights in tow) from The Post and Courier quote of the 68-page Clemson/FSU/ACC settlement. SEC: 2023–24 bylaws §3.2.1 $30 million with-notice (hosted PDF); $40M/$45M stairs footnoted. Big 12 current football members: modeled 2× last cited FY2025 Form 990 Schedule I distribution from hosted bylaws §3.4; paying the fee does not abrogate the grant of rights (§3.1). Half-share FY2025 schools (BYU/Houston/UCF/Cincinnati) use a modeled full-share peer range, not a silent 2× of the half-share. Notre Dame: modeled ~$100M Hale/247Sports non-football ACC membership estimate — not the FSU/Clemson football ladder. Big Ten stays pending. Do not stamp the old Big 12 $100M Texas/Oklahoma one-off on remaining members. Texas and Oklahoma stay SEC.'

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
  if (B12_IDS.includes(school.id)) return b12Record(school.id)
  if (school.id === 'notre-dame') return ndRecord()
  return pendingRecord(school.conference)
}

function indentJson(obj, spaces) {
  const pad = ' '.repeat(spaces)
  return JSON.stringify(obj, null, 2)
    .split('\n')
    .map((line) => pad + line)
    .join('\n')
}

function findBalancedObject(raw, from) {
  const brace = raw.indexOf('{', from)
  if (brace < 0) return null
  let depth = 0
  for (let i = brace; i < raw.length; i++) {
    const ch = raw[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return { start: brace, end: i + 1 }
    }
  }
  return null
}

function replaceConferenceExit(raw, school, record) {
  const idNeedle = `"id": "${school.id}"`
  const idIdx = raw.indexOf(idNeedle)
  if (idIdx < 0) throw new Error(`could not find id for ${school.id}`)
  const keyIdx = raw.indexOf('"conferenceExit":', idIdx)
  if (keyIdx < 0 || keyIdx - idIdx > 800) {
    throw new Error(`could not find conferenceExit near ${school.id}`)
  }
  const obj = findBalancedObject(raw, keyIdx)
  if (!obj) throw new Error(`unbalanced conferenceExit for ${school.id}`)
  const block = indentJson(record, 6).trimStart()
  return raw.slice(0, keyIdx) + `"conferenceExit": ${block}` + raw.slice(obj.end)
}

function stampSchoolsText(raw, schools) {
  let out = raw
  if (out.includes('Big Ten, Big 12, and Notre Dame football stay pending')) {
    out = out.replace(
      'Conference exit is a school-page stock, not annual capacity, and not a coach-firing buyout. ACC football members: settlement year ladder (rights in tow) from The Post and Courier quote of the 68-page Clemson/FSU/ACC settlement. SEC: 2023–24 bylaws §3.2.1 $30 million with-notice (hosted PDF); $40M/$45M stairs footnoted. Big Ten, Big 12, and Notre Dame football stay pending. Do not stamp the old Big 12 $100M Texas/Oklahoma one-off on remaining members.',
      BLOCKER,
    )
  } else if (!out.includes('modeled 2× last cited FY2025 Form 990')) {
    const marker = 'Privates and withheld chairs stay pending. No On3 / Opendorse / NIL Go."'
    if (!out.includes(marker)) throw new Error('could not find last blockers line')
    out = out.replace(marker, `${marker},\n      "${BLOCKER}"`)
  }
  const rewriteIds = new Set([...B12_IDS, 'notre-dame'])
  for (const school of schools) {
    const rec = recordFor(school)
    const hasExit = out.includes(`"id": "${school.id}"`) && /"conferenceExit"/.test(out)
    if (hasExit && !rewriteIds.has(school.id)) continue
    if (hasExit && rewriteIds.has(school.id)) {
      out = replaceConferenceExit(out, school, rec)
      continue
    }
    const lit = (s) => JSON.stringify(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const needle = new RegExp(
      `("id": "${school.id}",\\n\\s+"name": ${lit(school.name)},\\n\\s+"shortName": ${lit(school.shortName)},\\n\\s+"conference": ${lit(school.conference)},)`,
    )
    const block = indentJson(rec, 6)
    if (!needle.test(out)) throw new Error(`could not find header for ${school.id}`)
    out = out.replace(needle, (m) => `${m}\n      "conferenceExit": ${block.trimStart()},`)
  }
  return out
}

function tapeItem({ id, date, school, schoolName, headline, figure, source, confidence = 'reported' }) {
  return {
    id,
    date,
    school,
    schoolName,
    kind: 'conference-exit',
    headline,
    figure,
    confidence,
    source,
    field: 'conferenceExit',
  }
}

function newModeledTapeItems(schools) {
  const byId = Object.fromEntries(schools.map((s) => [s.id, s]))
  const b12 = B12_IDS.map((id) => {
    const fee = b12ModeledFee(id)
    const figure = fee.value != null ? fee.value : Math.round((fee.low + fee.high) / 2)
    const math = fee.value != null && fee.lastFiled != null
      ? `FY2025 990 ${fee.lastFiled.toLocaleString('en-US')} × 2 = ${fee.value.toLocaleString('en-US')} (modeled)`
      : fee.lastFiled != null
        ? `modeled range 2 × full-share peers $37,879,865–$43,009,550; last filed half-share ${fee.lastFiled.toLocaleString('en-US')} × 2 is a footnote only`
        : 'modeled range 2 × full-share peers $37,879,865–$43,009,550 (Houston Schedule I line not independently extracted)'
    return tapeItem({
      id: `${id}-conference-exit-big12-2x-990-fy2025`,
      date: '2026-05-14',
      school: id,
      schoolName: byId[id].name,
      headline: `Hosted Big 12 bylaws §3.4: Buyout Amount = sum of distributions for the final two years of membership. Modeled as 2× last cited FY2025 Form 990. ${math}. Paying the fee does not abrogate the grant of rights (§3.1) — cash formula only; media rights stay with the league.`,
      figure,
      confidence: 'modeled',
      source: { label: B12_990.source, url: B12_990.url },
    })
  })
  const nd = tapeItem({
    id: 'notre-dame-conference-exit-hale-100m',
    date: '2022-08-01',
    school: 'notre-dame',
    schoolName: byId['notre-dame'].name,
    headline:
      '247Sports quoting ESPN’s David Hale: Notre Dame ACC membership exit in the range of ~$100 million (3× then-recent ACC annual revenue / old 3× operating-budget style fee). Football independent — not the FSU/Clemson settlement ladder. Hale noted ND would be free of the football grant-of-rights charge. Reporter estimate, not a filing.',
    figure: 100_000_000,
    confidence: 'modeled',
    source: { label: ND_HALE.source, url: ND_HALE.url },
  })
  return [...b12, nd]
}

function stampTapeText(raw, schools) {
  const extras = newModeledTapeItems(schools).filter((it) => !raw.includes(`"id": "${it.id}"`))
  if (!extras.length) return raw
  const block = extras.map((it) => `${indentJson(it, 4)},`).join('\n')
  let out = raw.replace('"items": [\n', `"items": [\n${block}\n`)
  const countMatch = out.match(/"itemCount": (\d+)/)
  if (!countMatch) throw new Error('tape itemCount missing')
  const next = Number(countMatch[1]) + extras.length
  out = out.replace(/"itemCount": \d+/, `"itemCount": ${next}`)
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
const modeled = stamped.schools.filter((s) => s.conferenceExit?.confidence === 'modeled').length
console.log(`stamped conferenceExit on ${exits} schools (${modeled} modeled)`)
console.log(`bylaws ${B12_BYLAWS.url}`)
