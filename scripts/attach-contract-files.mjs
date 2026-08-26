/**
 * Surgical attach of contract.files — does not rewrite the whole JSON book.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const FILES = {
  'florida-state': [
    { kind: 'employment-agreement', label: '2019 Employment Agreement (scan)', url: 'https://s3.documentcloud.org/documents/22082107/florida-state_mike-norvell.pdf' },
    { kind: 'amendment', n: 6, date: '2024-02-16', label: '6th Amendment (Feb. 16, 2024) — extension through Dec. 31, 2031', url: 'https://s3.documentcloud.org/documents/24442204/floridastate_norvell_contract_6thamendment-to-2019-ea.pdf' },
    { kind: 'amendment', n: 7, date: '2024-12-13', label: '7th Amendment (Dec. 13, 2024) — current 85% buyout', url: 'https://s3.documentcloud.org/documents/25460174/norvell-mike-7th-amendment-to-2019-ea-final-12.pdf' },
  ],
  clemson: [
    { kind: 'restated', label: '2019 restated employment agreement (USA TODAY packet, through 2028)', url: 'https://s3.documentcloud.org/documents/22080509/clemson_dabo-swinney.pdf' },
    { kind: 'term-sheet', date: '2022-09-08', label: 'Sept. 2022 BOT term sheet (current governing)', url: 'https://sportstalksc.com/wp-content/uploads/2022/09/Swinney-Term-Sheet-Sept-2022.pdf' },
  ],
  'north-carolina': [
    { kind: 'employment-agreement', label: 'Signed employment agreement (31 pages)', url: 'https://s3.documentcloud.org/documents/25502765/unc-coach-bill-belichick-contract.pdf' },
  ],
  'virginia-tech': [
    { kind: 'letter-of-intent', date: '2025-11-15', label: 'Letter of intent (Nov. 15, 2025)', url: 'https://augustafreepress.com/wp-content/uploads/2025/11/james-franklin-virginia-tech-contract.pdf' },
  ],
  virginia: [
    { kind: 'employment-agreement', date: '2022-10-31', label: '2022 original employment agreement (historical — not the 2026 extension)', url: 'https://augustafreepress.com/wp-content/uploads/2024/11/FB_-_Elliott__T_-_20221031_120821-053128.pdf' },
  ],
  kentucky: [
    { kind: 'employment-agreement', label: 'Current employment agreement (FY2025–26)', url: 'https://legal.uky.edu/sites/default/files/2026-02/stein-fy2526.pdf' },
  ],
  lsu: [
    { kind: 'term-sheet', date: '2025-11-29', label: 'Term sheet (Nov. 29, 2025)', url: 'https://www.louisianafirstnews.com/wp-content/uploads/sites/80/2025/12/2025.11.29-Term-Sheet-Lane-Kiffin.pdf' },
    { kind: 'employment-agreement', date: '2025-11-30', label: 'Signed employment agreement (Nov. 30, 2025)', url: 'https://ath-ems.lsu.edu/prr/contracts/Employment%20Contracts/Football/Lane%20Kiffin%20-%2011.30.25.pdf' },
  ],
  missouri: [
    { kind: 'restated', date: '2025-12-08', label: 'Second Restated and Amended employment agreement (Dec. 8, 2025)', url: 'https://mutigers.com/documents/2025/12/8/Eli_Drinkwitz_Second_Restated_and_Amended_Employment_Contract.pdf' },
  ],
  tennessee: [
    { kind: 'employment-agreement', label: 'Original employment agreement (tennessee.edu)', url: 'https://tennessee.edu/wp-content/uploads/2025/04/Heupel-Josh-2021-27_orig.pdf' },
    { kind: 'amendment', n: 1, label: 'Amendment 1', url: 'https://tennessee.edu/wp-content/uploads/2025/04/Heupel-Josh-Amendment1-2022-28-FC.pdf' },
    { kind: 'amendment', n: 2, label: 'Amendment 2', url: 'https://tennessee.edu/wp-content/uploads/2025/04/Heupel-Josh-1-2023-Amendment2.pdf' },
    { kind: 'amendment', n: 3, label: 'Amendment 3 (Aug. 2025) — current governing', url: 'https://tennessee.edu/wp-content/uploads/2025/08/Josh-Heupel-Amendment-3-2025-30-v2.docx.pdf' },
  ],
  colorado: [
    { kind: 'restated', date: '2025-03-28', label: 'Amended and Restated employment agreement (Mar. 28, 2025)', url: 'https://cu.community.diligentoneplatform.com/document/f62f1797-c88f-4707-bf61-73fa39f1059a/' },
  ],
  'iowa-state': [
    { kind: 'employment-agreement', label: 'Current employment agreement', url: 'https://htv-prod-media.s3.amazonaws.com/files/iowa-state-contract-with-football-coach-jimmy-rogers-69aa0e837691f.pdf' },
  ],
  illinois: [
    { kind: 'board-packet', date: '2025-05-22', label: 'BOT minutes / amendment item (May 22, 2025)', url: 'https://www.trustees.uillinois.edu/trustees/agenda/July-17-2025/A1-July-25-Minutes-May-22-2025-BOT.pdf' },
  ],
  minnesota: [
    { kind: 'board-packet', date: '2025-07-09', label: 'July 2025 Regents docket (70% quote)', url: 'https://regents.umn.edu/sites/regents.umn.edu/files/2025-07/docket-bor-july2025.pdf' },
    { kind: 'board-packet', label: 'Feb. 2026 finance docket (new EA packet)', url: 'https://regents.umn.edu/sites/regents.umn.edu/files/2026-02/docket-fin-feb2026-v2.pdf' },
  ],
  oregon: [
    { kind: 'board-packet', date: '2025-03-07', label: 'BOT Mar. 7, 2025 packet (Amendment #3)', url: 'https://trustees.uoregon.edu/sites/default/files/2025-03/final-bot-march-7-materials.pdf' },
  ],
  arizona: [
    { kind: 'board-packet', date: '2024-01-25', label: '2024 hire board packet (historical — not the 2026 / 2030 extension)', url: 'https://media.kjzz.org/s3fs-public/2024-1-25-Special-Board-Meeting-Board-Book-Second-Amendment.pdf' },
  ],
}

function filesBlock(files, indent) {
  const inner = JSON.stringify(files, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : indent + line))
    .join('\n')
  return inner
}

function injectBuyouts(text, id, files) {
  const data = JSON.parse(text)
  const coach = data.coaches[id]
  if (!coach) throw new Error(`buyouts missing ${id}`)
  if (coach.contract?.url) {
    const url = coach.contract.url
    const needle = `"contract": {\n        "label": ${JSON.stringify(coach.contract.label)},\n        "url": ${JSON.stringify(url)}\n      }`
    if (!text.includes(needle) && !text.includes(needle.replaceAll('\u2014', '\\u2014'))) {
      // try unicode-escaped form as stored on disk
      const esc = needle.replaceAll('\u2014', '\\u2014').replaceAll('\u2013', '\\u2013')
      if (text.includes(esc)) {
        const next = text.replace(esc, esc.replace(/\n      \}$/, `,\n        "files": ${filesBlock(files, '        ')}\n      }`))
        if (next === text) throw new Error(`buyouts ${id}: escaped replace failed`)
        return next
      }
      throw new Error(`buyouts ${id}: contract block not found`)
    }
    const hit = text.includes(needle) ? needle : needle.replaceAll('\u2014', '\\u2014').replaceAll('\u2013', '\\u2013')
    const next = text.replace(hit, hit.replace(/\n      \}$/, `,\n        "files": ${filesBlock(files, '        ')}\n      }`))
    if (next === text) throw new Error(`buyouts ${id}: replace failed`)
    return next
  }
  const marker = `"${id}": {`
  const idx = text.indexOf(marker)
  if (idx < 0) throw new Error(`buyouts ${id}: school block missing`)
  const nullNeedle = `"contract": null`
  const slice = text.slice(idx, idx + 2500)
  const rel = slice.indexOf(nullNeedle)
  if (rel < 0) throw new Error(`buyouts ${id}: expected contract null`)
  const abs = idx + rel
  const block = `"contract": {\n        "label": null,\n        "url": null,\n        "files": ${filesBlock(files, '        ')}\n      }`
  return text.slice(0, abs) + block + text.slice(abs + nullNeedle.length)
}

function injectSchools(text, id, files) {
  const data = JSON.parse(text)
  const school = data.schools.find((s) => s.id === id)
  if (!school) throw new Error(`schools missing ${id}`)
  const fb = school.coaches.football
  const contractJson = JSON.stringify(
    {
      label: fb.contractUrl ? fb.term?.source || null : null,
      url: fb.contractUrl || null,
      files,
    },
    null,
    2,
  )
    .split('\n')
    .map((line, i) => (i === 0 ? line : '          ' + line))
    .join('\n')

  if (fb.contractUrl) {
    const needle = `"contractUrl": ${JSON.stringify(fb.contractUrl)}`
    const idMark = `"id": "${id}"`
    const start = text.indexOf(idMark)
    if (start < 0) throw new Error(`schools ${id}: id not found`)
    const rel = text.slice(start).indexOf(needle)
    if (rel < 0) throw new Error(`schools ${id}: contractUrl not found in school block`)
    const abs = start + rel
    // only the football contractUrl — first match after id inside this school
    return `${text.slice(0, abs + needle.length)},\n          "contract": ${contractJson}${text.slice(abs + needle.length)}`
  }
  // No contractUrl (Arizona): insert as last football field, before the football object closes.
  const idMark = `"id": "${id}"`
  const start = text.indexOf(idMark)
  const fbName = `"name": ${JSON.stringify(fb.name)}`
  const fbAt = text.indexOf(fbName, start)
  const mbbAt = text.indexOf('\n        "mbb":', fbAt)
  if (mbbAt < 0) throw new Error(`schools ${id}: mbb block not found`)
  const closer = text.lastIndexOf('\n        },', mbbAt)
  if (closer < fbAt) throw new Error(`schools ${id}: football closer not found`)
  const insert = `,\n          "contract": ${contractJson}`
  return text.slice(0, closer) + insert + text.slice(closer)
}

let buyouts = readFileSync('data/buyouts.json', 'utf8')
let schools = readFileSync('data/schools.json', 'utf8')
for (const [id, files] of Object.entries(FILES)) {
  buyouts = injectBuyouts(buyouts, id, files)
  schools = injectSchools(schools, id, files)
}
JSON.parse(buyouts)
JSON.parse(schools)
writeFileSync('data/buyouts.json', buyouts)
writeFileSync('public/data/buyouts.json', buyouts)
writeFileSync('data/schools.json', schools)
writeFileSync('public/data/schools.json', schools)

const b = JSON.parse(buyouts)
if (b.coaches['florida-state'].contract.files.length !== 3) throw new Error('FSU files')
if (b.coaches['florida-state'].contract.url !== FILES['florida-state'][2].url) throw new Error('FSU url')
if (b.coaches.arizona.contract.url != null) throw new Error('AZ governing')
console.log('ok', Object.keys(FILES).length, 'coaches')
