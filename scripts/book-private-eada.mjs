/**
 * Book FY2025 EADA grand-total + football cells on the 14 private Power 4
 * (+ Notre Dame) schools. Surgical text edit — does not rewrite the whole
 * book. Does not unpack into tickets / sponsorships / contributions.
 *
 * Run: node scripts/book-private-eada.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'

const extract = JSON.parse(readFileSync(new URL('./eada-2025-privates.json', import.meta.url), 'utf8'))
const PATHS = [
  new URL('../data/schools.json', import.meta.url),
  new URL('../public/data/schools.json', import.meta.url),
]

const EADA_URL = extract.dataFileList
const AS_OF = extract.asOf
const FY = extract.fiscalYear

const GAP_NOTE =
  'Private institution. Knight-Newhouse does not publish MFRS categories. Tickets, sponsorships, and athletic contributions are a revenue gap. FY2025 EADA grand total is a separate federal lane — not unpacked into those MFRS categories, and not added to the booked capacity stack.'

const ND_GAP_NOTE =
  'Private. No Knight-Newhouse category stack. Media is NBC + ACC scheduling agreement. FY2025 EADA grand total is a separate federal lane — not unpacked into tickets/sponsorships/contributions, and not added to the booked capacity stack.'

function eadaBlock(total, football) {
  const footballJson =
    football == null
      ? ''
      : `,
        "eadaFootball": {
          "value": ${football},
          "confidence": "reported",
          "source": "EADA 2024–25 — men’s football team revenues (REV_MEN_Football)",
          "url": "${EADA_URL}",
          "asOf": "${AS_OF}",
          "fiscalYear": "${FY}",
          "notes": "Sport-attributed EADA football revenue. Not a filing of NIL or House spend."
        }`
  return `"eadaTotal": {
          "value": ${total},
          "confidence": "reported",
          "source": "U.S. Dept. of Education — Equity in Athletics Disclosure Act (EADA) 2024–25, grand total revenues",
          "url": "${EADA_URL}",
          "asOf": "${AS_OF}",
          "fiscalYear": "${FY}",
          "notes": "Federal EADA athletics revenue. Includes institutional support and other allocated items; NOT comparable 1:1 to a public school’s Knight-Newhouse / MFRS capacity stack. Do not unpack into tickets/sponsorships/contributions."
        }${footballJson}`
}

function matchingBrace(text, openIdx) {
  if (text[openIdx] !== '{') throw new Error(`expected { at ${openIdx}`)
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  throw new Error('unbalanced brace')
}

function keyOpen(block, key, from = 0) {
  const needle = `"${key}":`
  const idx = block.indexOf(needle, from)
  if (idx < 0) return -1
  let i = idx + needle.length
  while (block[i] === ' ' || block[i] === '\n') i += 1
  return block[i] === '{' ? i : -1
}

function schoolSpan(text, id) {
  const needle = `\n      "id": "${id}"`
  const idAt = text.indexOf(needle)
  if (idAt < 0) throw new Error(`school id ${id} not found`)
  const open = text.lastIndexOf('{', idAt)
  const close = matchingBrace(text, open)
  return { open, close }
}

function patchSchool(text, id, row) {
  const { open, close } = schoolSpan(text, id)
  let block = text.slice(open, close + 1)
  const parsed = JSON.parse(block)
  if (!parsed.private) throw new Error(`${id} is not marked private`)
  for (const k of ['tickets', 'sponsorships', 'contributions']) {
    if (parsed.capacity?.[k]?.value != null) {
      throw new Error(`${id}: refusing to book EADA beside a filled ${k} cell`)
    }
  }

  const capOpenRel = keyOpen(block, 'capacity')
  if (capOpenRel < 0) throw new Error(`${id}: no capacity object`)
  const capCloseRel = matchingBrace(block, capOpenRel)
  let cap = block.slice(capOpenRel, capCloseRel + 1)
  const next = eadaBlock(row.eadaTotal, row.eadaFootball)

  const eadaRel = cap.search(/"eadaTotal"\s*:/)
  if (eadaRel >= 0) {
    const objOpen = cap.indexOf('{', eadaRel)
    let end = matchingBrace(cap, objOpen)
    const fbRel = cap.search(/"eadaFootball"\s*:/)
    if (fbRel > eadaRel) {
      const fbOpen = cap.indexOf('{', fbRel)
      end = matchingBrace(cap, fbOpen)
    }
    let start = eadaRel
    while (start > 0 && /[,\s]/.test(cap[start - 1])) start -= 1
    cap = `${cap.slice(0, start)},\n        ${next}${cap.slice(end + 1)}`
  } else {
    const beforeClose = cap.slice(0, cap.lastIndexOf('}')).replace(/\s+$/, '')
    cap = `${beforeClose},\n        ${next}\n      }`
  }

  block = `${block.slice(0, capOpenRel)}${cap}${block.slice(capCloseRel + 1)}`

  const gap = id === 'notre-dame' ? ND_GAP_NOTE : GAP_NOTE
  if (/"gapNote"\s*:/.test(block)) {
    block = block.replace(/"gapNote":\s*"[^"]*"/, `"gapNote": ${JSON.stringify(gap)}`)
  } else {
    const capOpen2 = keyOpen(block, 'capacity')
    const afterBrace = capOpen2 + 1
    block = `${block.slice(0, afterBrace)}\n        "gapNote": ${JSON.stringify(gap)},${block.slice(afterBrace)}`
  }

  return text.slice(0, open) + block + text.slice(close + 1)
}

for (const path of PATHS) {
  let text = readFileSync(path, 'utf8')
  for (const [id, row] of Object.entries(extract.schools)) {
    text = patchSchool(text, id, row)
  }
  writeFileSync(path, text)
}

console.log(`book-private-eada: ${Object.keys(extract.schools).length} privates booked from ${extract.file}`)
