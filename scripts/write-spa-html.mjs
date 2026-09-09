/**
 * Stamp route-specific title / description / canonical / og tags onto copies
 * of the built index.html so crawlers and unfurls do not see the homepage.
 *
 * Cloudflare pretty-URLs serve dist/reported-nil.html at /reported-nil and
 * dist/school/lsu.html at /school/lsu. Do not also 200-rewrite those paths
 * to /index.html — html_handling then 308s /index.html to /, and crawlers
 * would index the homepage title.
 *
 * Run from the Vite writeBundle hook, or: node scripts/write-spa-html.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SITE,
  descriptionFromPath,
  ogImageFromPath,
  schoolDescription,
  schoolTitle,
  titleFromPath,
} from '../src/lib/share.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

export const SPA_SHELL_PATHS = [
  '/reported-nil',
  '/compare',
  '/methods',
  '/tape',
  '/tv',
  '/buyout',
  '/coach-fa',
]

function escAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
}

function replaceAttr(html, attr, key, content) {
  const re = new RegExp(`<meta ${attr}="${key}" content="[^"]*"`)
  const tag = `<meta ${attr}="${key}" content="${escAttr(content)}"`
  if (re.test(html)) return html.replace(re, tag)
  return html.replace('</head>', `    ${tag} />\n  </head>`)
}

export function routeShell(path, extras = {}) {
  const title = extras.title || titleFromPath(path, extras)
  const description = extras.description || descriptionFromPath(path, extras)
  const url = `https://${SITE}${path}`
  const image = ogImageFromPath(path)
  const hed = extras.hed || (path === '/reported-nil' ? 'Reported NIL by school' : title.split(' — ')[0])
  return { path, title, description, url, image, hed }
}

export function schoolShells(schools) {
  return (schools || []).map((school) =>
    routeShell(`/school/${school.id}`, {
      title: schoolTitle(school.name),
      description: schoolDescription(school),
      schoolName: school.name,
      school,
      hed: school.name,
    }),
  )
}

export function loadSchoolShells() {
  const data = JSON.parse(readFileSync(join(root, 'public/data/schools.json'), 'utf8'))
  return schoolShells(data.schools)
}

export function applyRouteMeta(html, route) {
  const { title, description, url, image, path, hed } = route
  let out = html
  out = out.replace(/<html\s+lang="en">/, '<html lang="en" data-route="inner">')
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
  out = replaceAttr(out, 'name', 'description', description)
  out = replaceAttr(out, 'property', 'og:title', title)
  out = replaceAttr(out, 'property', 'og:description', description)
  out = replaceAttr(out, 'property', 'og:url', url)
  out = replaceAttr(out, 'property', 'og:image', image)
  out = replaceAttr(out, 'name', 'twitter:card', 'summary_large_image')
  out = replaceAttr(out, 'name', 'twitter:title', title)
  out = replaceAttr(out, 'name', 'twitter:description', description)
  out = replaceAttr(out, 'name', 'twitter:image', image)
  out = out.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`)

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    image,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Public Cap',
      url: `https://${SITE}/`,
    },
  })
  out = out.replace(
    /<script type="application\/ld\+json" id="public-cap-jsonld">[\s\S]*?<\/script>/,
    `<script type="application/ld+json" id="public-cap-jsonld">\n      ${jsonLd}\n    </script>`,
  )

  const heading = hed || (path === '/reported-nil' ? 'Reported NIL by school' : title.split(' — ')[0])
  out = out.replace(
    /<div id="home-dek" class="page-wrap home-dek">[\s\S]*?<\/div>\s*<div id="root">/,
    `<div id="home-dek" class="page-wrap home-dek">
        <section class="dek">
          <h1 class="issue-hed">${heading}</h1>
          <p class="lede">${description}</p>
        </section>
      </div>
      <div id="root">`,
  )
  return out
}

function fileForPath(path) {
  if (path.startsWith('/school/')) return `school/${path.split('/')[2]}.html`
  return `${path.slice(1)}.html`
}

export function writeSpaHtml({ distDir = join(root, 'dist'), indexHtml, schools } = {}) {
  const source = indexHtml ?? readFileSync(join(distDir, 'index.html'), 'utf8')
  const routes = [...SPA_SHELL_PATHS.map((path) => routeShell(path)), ...(schools || loadSchoolShells())]
  mkdirSync(join(distDir, 'school'), { recursive: true })
  const written = []
  for (const route of routes) {
    const file = fileForPath(route.path)
    writeFileSync(join(distDir, file), applyRouteMeta(source, route))
    written.push({ path: route.path, file, title: route.title, url: route.url })
  }
  return written
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const distDir = existsSync(join(root, 'dist', 'index.html'))
    ? join(root, 'dist')
    : join(root, 'public')
  if (!existsSync(join(distDir, 'index.html')) && distDir.endsWith('public')) {
    throw new Error('write-spa-html: need dist/index.html (run after vite build)')
  }
  const rows = writeSpaHtml({ distDir })
  for (const row of rows) console.log(`spa html: ${row.file}  ${row.title}`)
}
