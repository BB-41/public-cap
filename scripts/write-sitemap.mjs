/**
 * Write public/sitemap.xml from the desk school list so the crawl map
 * cannot drift from the 68-school book.
 *
 * Run: node scripts/write-sitemap.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

export const SITE_ORIGIN = 'https://thepubliccap.com'

/** Public HTML routes listed for the sitemap. /about does not exist. */
export const STATIC_PATHS = ['/', '/tape', '/methods', '/buyout', '/compare']

export function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function sitemapPaths(schools) {
  if (!Array.isArray(schools) || schools.length !== 68) {
    throw new Error('schools.json must have 68 schools')
  }
  const ids = schools.map((s) => s.id).filter(Boolean)
  if (ids.length !== 68 || new Set(ids).size !== 68) {
    throw new Error('schools.json must have 68 unique school ids')
  }
  return [...STATIC_PATHS, ...ids.map((id) => `/school/${id}`)]
}

export function renderSitemapXml({ paths, lastmod }) {
  const loc = (path) => (path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`)
  const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
  const urls = paths
    .map(
      (path) => `  <url>
    <loc>${loc(path)}</loc>${lastmodLine}
  </url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

export function writeSitemap({
  schoolsPath = join(root, 'public/data/schools.json'),
  outPath = join(root, 'public/sitemap.xml'),
} = {}) {
  const data = JSON.parse(readFileSync(schoolsPath, 'utf8'))
  const paths = sitemapPaths(data.schools)
  const lastmod = isIsoDate(data.meta?.asOf) ? data.meta.asOf : null
  writeFileSync(outPath, renderSitemapXml({ paths, lastmod }))
  return { path: outPath, urlCount: paths.length, schoolCount: data.schools.length, lastmod }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const info = writeSitemap()
  console.log(
    `sitemap: ${info.urlCount} URLs · ${info.schoolCount} schools${info.lastmod ? ` · lastmod ${info.lastmod}` : ''}`,
  )
}
