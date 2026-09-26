/**
 * Who's paying: every entry has a source URL and an as-of date.
 * Reported sponsorship dollars must match the desk. Company money is not a second capacity.
 * Run: node scripts/verify-whos-paying.mjs
 */
import { readFileSync } from 'node:fs'
import { citeNodes, fullPicture, schoolWhosPaying } from '../src/lib/whosPaying.js'

const book = JSON.parse(readFileSync(new URL('../data/whos-paying.json', import.meta.url), 'utf8'))
const pub = JSON.parse(readFileSync(new URL('../public/data/whos-paying.json', import.meta.url), 'utf8'))
const schools = JSON.parse(readFileSync(new URL('../data/schools.json', import.meta.url), 'utf8'))
const page = readFileSync(new URL('../src/components/WhosPaying.jsx', import.meta.url), 'utf8')
const schoolPage = readFileSync(new URL('../src/pages/School.jsx', import.meta.url), 'utf8')
const methods = readFileSync(new URL('../src/pages/Methods.jsx', import.meta.url), 'utf8')
const defs = readFileSync(new URL('../src/lib/definitions.js', import.meta.url), 'utf8')
const pkg = readFileSync(new URL('../package.json', import.meta.url), 'utf8')

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

const URL_RE = /^https?:\/\/\S+$/
const SAMPLE = ['texas', 'ohio-state', 'alabama', 'oregon']
const deskIds = new Set((schools.schools || []).map((s) => s.id))

ok(JSON.stringify(book) === JSON.stringify(pub), 'data/whos-paying.json synced to public/data')
ok(book.meta?.capacityTreatment === 'already-inside', 'company list is marked already inside capacity')
ok(
  book.meta?.insideExplainer === "These companies' money is already counted in capacity.",
  'inside explainer is the plain sentence',
)
ok(
  book.meta?.outsideExplainer === "Outside money never touches the school's books.",
  'outside explainer is the plain sentence',
)

for (const id of SAMPLE) ok(book.schools?.[id], `${id} is in the sample`)
for (const id of Object.keys(book.schools || {})) {
  ok(deskIds.has(id), `${id} is a real school id`)
}

for (const [id, entry] of Object.entries(book.schools || {})) {
  ok(entry.partners?.some((p) => p.kind === 'apparel'), `${id} has an apparel row`)
  ok(entry.partners?.some((p) => p.kind === 'multimedia'), `${id} has a multimedia row`)
  ok(entry.naming?.length, `${id} has a stadium or arena row`)
  ok(entry.outside?.length, `${id} has an outside-money row`)

  const school = schools.schools.find((s) => s.id === id)
  const filing = entry.sponsorshipFiling
  const deskSpon = school?.capacity?.sponsorships
  if (filing?.status === 'reported') {
    ok(filing.value === deskSpon?.value, `${id} reported sponsorship matches the desk`)
    ok(deskSpon?.confidence === 'reported', `${id} desk sponsorship is reported, not an estimate`)
    ok(filing.url === deskSpon?.url, `${id} sponsorship source URL matches the desk`)
  } else {
    ok(filing?.value == null, `${id} hides a sponsorship dollar when the desk line is not reported`)
    ok(deskSpon?.confidence !== 'reported', `${id} not-reported filing matches a non-reported desk cell`)
  }

  for (const { path, node } of citeNodes(entry)) {
    ok(typeof node.source === 'string' && node.source.length > 0, `${id} ${path} has a source`)
    ok(typeof node.url === 'string' && URL_RE.test(node.url), `${id} ${path} has a source URL`)
    ok(typeof node.asOf === 'string' && node.asOf.length > 0, `${id} ${path} has an as-of date`)
    if (node.valueStatus === 'not-public' || node.valueStatus === 'none' || node.valueStatus === 'no-reliable-figure') {
      ok(node.value == null, `${id} ${path} does not hide a number behind “not public”`)
    }
    if (typeof node.value === 'number') {
      ok(node.valueStatus === 'published', `${id} ${path} numeric value is marked published`)
    }
    if (node.approximate) {
      ok(node.combineWithCapacity !== true, `${id} ${path} approximate outside money is not summed into capacity`)
    }
  }
}

ok(schoolWhosPaying(book, 'georgia') == null, 'a school with no row renders nothing')
ok(page.includes('if (!entry) return null'), 'component renders nothing when the school has no data')
ok(page.includes('insideExplainer'), 'component shows the inside explainer')
ok(page.includes('outsideExplainer'), 'component shows the outside explainer')
ok(page.includes('Outside the school'), 'component has an outside-money block')
ok(schoolPage.includes('WhosPaying'), 'school page mounts the block')
ok(methods.includes('already counted in capacity'), 'methods says company money is already in capacity')
ok(methods.includes('never touches the school'), 'methods says outside money is off the books')
ok(defs.includes('whosPaying'), 'definition exists')
ok(pkg.includes('verify-whos-paying.mjs'), 'npm run verify runs this script')

const texas = book.schools.texas
const osu = book.schools['ohio-state']
const alabama = book.schools.alabama
const oregon = book.schools.oregon

ok(texas.partners.find((p) => p.kind === 'apparel')?.valueLabel?.includes('$250 million'), 'Texas Nike total is the published $250 million')
ok(osu.partners.find((p) => p.kind === 'apparel')?.valueLabel?.includes('$252 million'), 'Ohio State Nike total is the published $252 million')
ok(oregon.partners.find((p) => p.kind === 'apparel')?.valueLabel?.includes('$88 million'), 'Oregon Nike total is the published $88 million')
ok(alabama.partners.find((p) => p.kind === 'apparel')?.valueStatus === 'not-public', 'Alabama’s current Nike dollar is not public')
ok(osu.naming.some((n) => n.facility === 'Ohio Stadium' && n.status === 'none'), 'Ohio Stadium has no corporate naming sponsor')
ok(texas.outside[0]?.value === 14540650, 'Texas One Fund 2024 athlete line is the filed $14,540,650')
ok(texas.outside[0]?.combineWithCapacity === true, 'Texas full picture is allowed only for the filed collective line')
ok(oregon.outside[0]?.valueStatus === 'no-reliable-figure', 'Oregon outside money has no reliable public figure')
ok(alabama.outside.some((row) => row.valueStatus === 'no-reliable-figure'), 'Yea Alabama has no reliable public figure')

const texasSchool = schools.schools.find((s) => s.id === 'texas')
const media = texasSchool.capacity.mediaConference.value
const spon = texasSchool.capacity.sponsorships.value
const tix = texasSchool.capacity.tickets.value
const give = texasSchool.capacity.contributions.value
const booked = media + spon + tix + give
const picture = fullPicture(booked, texas.outside[0])
ok(picture?.outside === 14540650, 'full picture keeps the collective figure visible')
ok(picture?.sum === booked + 14540650, 'full picture is capacity plus the sourced figure')
ok(fullPicture(booked, osu.outside[0]) == null, 'Ohio State’s football estimate is not summed into department capacity')

const failed = checks.filter((c) => !c.ok)
if (failed.length) {
  console.error(`${failed.length} failed`)
  process.exit(1)
}
console.log(`whos-paying ok (${checks.length} checks)`)
