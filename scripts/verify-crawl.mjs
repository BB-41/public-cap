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
ok(generated.urlCount === 7 + 68, `sitemap has ${7 + 68} URLs (static + schools)`)

const robots = readFileSync(join(publicDir, 'robots.txt'), 'utf8')
ok(!/^\s*<!doctype html/i.test(robots), 'robots.txt is not HTML')
ok(!/<html[\s>]/i.test(robots), 'robots.txt has no <html>')
ok(/User-agent:\s*\*/i.test(robots), 'robots.txt has User-agent: *')
ok(/Allow:\s*\/\s*$/m.test(robots), 'robots.txt allows the site')
ok(/Sitemap:\s*https:\/\/thepubliccap\.com\/sitemap\.xml/i.test(robots), 'robots.txt points at the sitemap')
ok(/Disallow:\s*\/data\//i.test(robots), 'robots.txt Disallow /data/')
for (const path of [...STATIC_PATHS.filter((p) => p !== '/'), '/school']) {
  ok(!new RegExp(`Disallow:\\s*${path}(/|\\s|$)`, 'i').test(robots), `robots.txt does not Disallow ${path}`)
}

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
ok(!locs.some((u) => u.includes('/data/')), 'sitemap does not list /data/ JSON')

if (generated.lastmod) {
  ok(xml.includes(`<lastmod>${generated.lastmod}</lastmod>`), `sitemap lastmod is ${generated.lastmod}`)
}

const headers = readFileSync(join(root, 'public/_headers'), 'utf8')
ok(/\/robots\.txt[\s\S]*Content-Type:\s*text\/plain/i.test(headers), '_headers sets robots.txt text/plain')
ok(/\/sitemap\.xml[\s\S]*Content-Type:\s*application\/xml/i.test(headers), '_headers sets sitemap.xml application/xml')

const redirects = readFileSync(join(root, 'public/_redirects'), 'utf8')
ok(!/^\s*\/\*\s+\/index\.html/m.test(redirects), '_redirects has no catch-all /* → index.html')
ok(/\/robots\.txt\s+\/robots\.txt\s+200/.test(redirects), '_redirects identity-proxies robots.txt')
ok(/\/sitemap\.xml\s+\/sitemap\.xml\s+200/.test(redirects), '_redirects identity-proxies sitemap.xml')
ok(!/\/school\/\*\s+\/index\.html/.test(redirects), '_redirects does not rewrite /school/* to /index.html (crawlers would get homepage title)')
ok(/\/coach-fa\/\*\s+\/index\.html\s+200/.test(redirects), '_redirects keeps /coach-fa/* splat')
ok(!/Disallow:\s*\/reported-nil/i.test(robots), 'robots.txt does not Disallow /reported-nil')
for (const path of ['/reported-nil', '/compare', '/methods', '/tape', '/tv', '/buyout', '/coach-fa']) {
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
}

const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length) process.exit(1)
