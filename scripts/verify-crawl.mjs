/**
 * Prove robots.txt and sitemap.xml are real crawl files, not the SPA shell,
 * and that the sitemap lists exactly the 68 school pages plus the public HTML routes.
 *
 * Run: node scripts/verify-crawl.mjs
 * Optional: PUBLIC_DIR=dist node scripts/verify-crawl.mjs  (after npm run build)
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITE_ORIGIN, STATIC_PATHS, sitemapPaths, writeSitemap } from './write-sitemap.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = process.env.PUBLIC_DIR
  ? join(root, process.env.PUBLIC_DIR)
  : join(root, 'public')

const checks = []
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg })
  if (!cond) console.error('FAIL', msg)
}

const schools = JSON.parse(readFileSync(join(root, 'public/data/schools.json'), 'utf8'))
ok(schools.schools.length === 68, '68 schools in the book')

const generated = writeSitemap()
ok(generated.schoolCount === 68, 'sitemap writer saw 68 schools')
ok(generated.urlCount === STATIC_PATHS.length + 68, `sitemap has ${STATIC_PATHS.length + 68} URLs (static + schools)`)
ok(STATIC_PATHS.includes('/tv'), 'STATIC_PATHS lists /tv')
ok(!STATIC_PATHS.includes('/llms.txt'), 'sitemap does not treat llms.txt as an HTML route')

const robots = readFileSync(join(publicDir, 'robots.txt'), 'utf8')
ok(!/^\s*<!doctype html/i.test(robots), 'robots.txt is not HTML')
ok(!/<html[\s>]/i.test(robots), 'robots.txt has no <html>')
ok(/User-agent:\s*\*/i.test(robots), 'robots.txt has User-agent: *')
ok(/Allow:\s*\/\s*$/m.test(robots), 'robots.txt allows the site')
ok(/Sitemap:\s*https:\/\/thepubliccap\.com\/sitemap\.xml/i.test(robots), 'robots.txt points at the sitemap')
ok(/Disallow:\s*\/data\//i.test(robots), 'robots.txt Disallow /data/')
ok(!/Disallow:\s*\/tv\b/i.test(robots), 'robots.txt does not Disallow /tv')
ok(!/Disallow:\s*\/llms\.txt/i.test(robots), 'robots.txt does not Disallow /llms.txt')
for (const path of [...STATIC_PATHS.filter((p) => p !== '/'), '/school']) {
  ok(!new RegExp(`Disallow:\\s*${path}(/|\\s|$)`, 'i').test(robots), `robots.txt does not Disallow ${path}`)
}

const llms = readFileSync(join(publicDir, 'llms.txt'), 'utf8')
ok(!/^\s*<!doctype html/i.test(llms), 'llms.txt is not HTML')
ok(!/<html[\s>]/i.test(llms), 'llms.txt has no <html>')
ok(/^# Public Cap/m.test(llms), 'llms.txt names Public Cap')
ok(/NCAA Power 4 money desk/i.test(llms), 'llms.txt names the Power 4 money desk')
ok(/capacity/i.test(llms) && /House/i.test(llms) && /NIL/i.test(llms), 'llms.txt names capacity vs House vs NIL')
ok(/\/school\/<slug>/.test(llms), 'llms.txt points at /school/<slug>')
ok(/https:\/\/thepubliccap\.com\/methods/.test(llms), 'llms.txt points at /methods')
ok(!/\$\d/.test(llms), 'llms.txt invents no dollar figures')
ok(!/On3/i.test(llms), 'llms.txt has no On3')

const xml = readFileSync(join(publicDir, 'sitemap.xml'), 'utf8')
ok(xml.startsWith('<?xml'), 'sitemap.xml starts with XML declaration')
ok(!/^\s*<!doctype html/i.test(xml), 'sitemap.xml is not HTML')
ok(!/<html[\s>]/i.test(xml), 'sitemap.xml has no <html>')
ok(xml.includes('http://www.sitemaps.org/schemas/sitemap/0.9'), 'sitemap.xml uses the sitemap schema')

const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
const expected = sitemapPaths(schools.schools).map((p) => (p === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${p}`))
ok(locs.length === expected.length, `sitemap has ${expected.length} loc entries (got ${locs.length})`)
ok(JSON.stringify(locs) === JSON.stringify(expected), 'sitemap locs match the school list + public HTML routes')

const schoolLocs = locs.filter((u) => u.includes('/school/'))
ok(schoolLocs.length === 68, 'sitemap lists 68 school URLs')
ok(!locs.includes(`${SITE_ORIGIN}/about`), 'sitemap does not invent /about')
ok(locs.includes(`${SITE_ORIGIN}/tv`), 'sitemap lists /tv')
ok(!locs.includes(`${SITE_ORIGIN}/llms.txt`), 'sitemap does not list llms.txt')
ok(!locs.some((u) => u.includes('/data/')), 'sitemap does not list /data/ JSON')

if (generated.lastmod) {
  ok(xml.includes(`<lastmod>${generated.lastmod}</lastmod>`), `sitemap lastmod is ${generated.lastmod}`)
}

const headers = readFileSync(join(root, 'public/_headers'), 'utf8')
ok(/\/robots\.txt[\s\S]*Content-Type:\s*text\/plain/i.test(headers), '_headers sets robots.txt text/plain')
ok(/\/llms\.txt[\s\S]*Content-Type:\s*text\/plain/i.test(headers), '_headers sets llms.txt text/plain')
ok(/\/sitemap\.xml[\s\S]*Content-Type:\s*application\/xml/i.test(headers), '_headers sets sitemap.xml application/xml')

const redirects = readFileSync(join(root, 'public/_redirects'), 'utf8')
ok(!/^\s*\/\*\s+\/index\.html/m.test(redirects), '_redirects has no catch-all /* → index.html')
ok(!/^\s*\/\*\s+https:\/\/thepubliccap\.com/m.test(redirects), '_redirects has no /* → apex (would break the site)')
ok(/\/robots\.txt\s+\/robots\.txt\s+200/.test(redirects), '_redirects identity-proxies robots.txt')
ok(/\/sitemap\.xml\s+\/sitemap\.xml\s+200/.test(redirects), '_redirects identity-proxies sitemap.xml')
ok(/\/llms\.txt\s+\/llms\.txt\s+200/.test(redirects), '_redirects identity-proxies llms.txt')
ok(/Bulk Redirect/i.test(redirects), '_redirects documents www → apex Bulk Redirect (DNS outside repo)')
ok(
  /functions\/_middleware\.js/.test(redirects) && /ignores this file/i.test(redirects),
  '_redirects records why www is not Functions middleware (would drop this file)',
)
ok(!existsSync(join(root, 'functions/_middleware.js')), 'no functions/_middleware.js (would disable _redirects)')
ok(!/\/school\/\*\s+\/index\.html/.test(redirects), '_redirects does not rewrite /school/* to /index.html (crawlers would get homepage title)')
ok(/\/coach-fa\/\*\s+\/index\.html\s+200/.test(redirects), '_redirects keeps /coach-fa/* splat')
ok(!/Disallow:\s*\/reported-nil/i.test(robots), 'robots.txt does not Disallow /reported-nil')
for (const path of ['/reported-nil', '/compare', '/methods', '/tape', '/tv', '/buyout', '/coach-fa', '/guarantee-games', '/checkbook-bowl']) {
  ok(
    !new RegExp(`${path}\\s+/index\\.html`).test(redirects),
    `_redirects does not rewrite ${path} to /index.html (that 308s home)`,
  )
}

ok(existsSync(join(root, 'public', 'og-reported-nil.png')), 'og-reported-nil.png is in public/')
ok(existsSync(join(root, 'public', 'og-default.png')), 'og-default.png is in public/')

if (process.env.PUBLIC_DIR) {
  const reported = readFileSync(join(publicDir, 'reported-nil.html'), 'utf8')
  ok(/<title>Reported NIL by school — Power 4 football roster stack — Public Cap<\/title>/.test(reported), 'dist reported-nil.html has the board title')
  ok(reported.includes('https://thepubliccap.com/reported-nil'), 'dist reported-nil.html points canonical at the board')
  ok(!reported.includes('<title>Public Cap — Capacity vs House cap vs booked NIL</title>'), 'dist reported-nil.html is not the homepage title')
  const lsuHtml = readFileSync(join(publicDir, 'school/lsu.html'), 'utf8')
  ok(/<title>LSU — Capacity vs House cap vs booked NIL — reported football NIL — Public Cap<\/title>/.test(lsuHtml), 'dist school/lsu.html has the LSU title')
  ok(lsuHtml.includes('https://thepubliccap.com/school/lsu'), 'dist school/lsu.html points canonical at LSU')
  ok(lsuHtml.includes('"@type":"CollegeOrUniversity"'), 'dist school/lsu.html has CollegeOrUniversity JSON-LD')
  const distLlms = readFileSync(join(publicDir, 'llms.txt'), 'utf8')
  ok(/^# Public Cap/m.test(distLlms) && !/<html[\s>]/i.test(distLlms), 'dist llms.txt is plain text, not SPA HTML')
}

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length) process.exit(1)
