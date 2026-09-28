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
  NIL101_DATE_MODIFIED,
  NIL101_DATE_PUBLISHED,
  NIL101_SCHOOL_LINK_TEXT,
  embedNil101JsonLd,
  nil101CueHtml,
  nil101StructuredData,
  renderNil101Page,
} from '../src/lib/nil101Guide.js'
import {
  renderSchoolStaticBody,
  schoolFaqItems,
  schoolFaqPageNode,
} from '../src/lib/schoolSeo.js'
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
  '/guarantee-games',
  '/checkbook-bowl',
  '/nil-101',
]

function escAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
}

function escText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
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
  const hed = extras.hed || (path === '/reported-nil' ? 'Reported NIL by school' : path === '/nil-101' ? 'NIL 101' : title.split(' | ')[0])
  return {
    path,
    title,
    description,
    url,
    image,
    hed,
    schoolName: extras.schoolName || null,
    school: extras.school || null,
    seo: extras.seo || null,
    faq: extras.faq || null,
  }
}

export function schoolShells(schools, extras = {}) {
  const { year1, year2, spendMap } = extras
  return (schools || []).map((school) => {
    const seo = { year1, year2, spend: spendMap?.[school.id] ?? null }
    const faq = schoolFaqItems(school, seo)
    return routeShell(`/school/${school.id}`, {
      title: schoolTitle(school.name),
      description: schoolDescription(school, seo),
      schoolName: school.name,
      school,
      seo,
      faq,
      hed: school.name,
    })
  })
}

export function loadSchoolSeoExtras() {
  const data = JSON.parse(readFileSync(join(root, 'public/data/schools.json'), 'utf8'))
  const bowl = JSON.parse(readFileSync(join(root, 'data/checkbook-bowl.json'), 'utf8'))
  const year1 = data.meta?.houseCap?.y2025_26?.value
  const year2 = data.meta?.houseCap?.y2026_27?.value
  if (typeof year1 !== 'number' || typeof year2 !== 'number') {
    throw new Error('school seo: booked house caps missing from schools.json')
  }
  if (!bowl?.spendFy2025) throw new Error('school seo: spendFy2025 map missing')
  return { data, year1, year2, spendMap: bowl.spendFy2025 }
}

export function loadSchoolShells() {
  const { data, year1, year2, spendMap } = loadSchoolSeoExtras()
  return schoolShells(data.schools, { year1, year2, spendMap })
}

function routeJsonLd(route) {
  const { title, description, url, image, path, schoolName, faq } = route
  const webpage = {
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
  }
  // School shells: CollegeOrUniversity with facts already on the page (name, url).
  // No capacity / House / NIL figures — those are not in this graph.
  if (path.startsWith('/school/') && schoolName) {
    const graph = [
      webpage,
      {
        '@type': 'CollegeOrUniversity',
        name: schoolName,
        url,
      },
    ]
    const faqNode = schoolFaqPageNode(faq, url)
    if (faqNode) graph.push(faqNode)
    return {
      '@context': 'https://schema.org',
      '@graph': graph,
    }
  }
  return { '@context': 'https://schema.org', ...webpage }
}

export function applyRouteMeta(html, route) {
  const { title, description, url, image, path, hed } = route
  let out = html
  const seoAttr = path.startsWith('/school/') ? ' data-seo="stamped"' : ''
  out = out.replace(/<html\s+lang="en">/, `<html lang="en" data-route="inner"${seoAttr}>`)
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${escText(title)}</title>`)
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

  if (path === '/nil-101') {
    const caps = route.nilCaps || loadNilCaps()
    const year2Attr = String(caps.year2)
    if (!/^\d+$/.test(year2Attr)) throw new Error('nil-101 year2 cap is not a whole number')
    const pageHtml = renderNil101Page(caps)
    const data = nil101StructuredData({
      pageHtml,
      title,
      description,
      url,
      image,
      datePublished: NIL101_DATE_PUBLISHED,
      dateModified: NIL101_DATE_MODIFIED,
    })
    out = out.replace(
      /<script type="application\/ld\+json" id="public-cap-jsonld">[\s\S]*?<\/script>/,
      embedNil101JsonLd(data),
    )
    // The guide in #root is the only h1. home-dek stays hidden on inner routes.
    out = replaceElementInner(out, '<div id="home-dek" class="page-wrap home-dek">', '')
    const rootOpen = `<div id="root" data-nil-year2="${year2Attr}">`
    out = out.replace('<div id="root">', rootOpen)
    out = replaceElementInner(out, rootOpen, `\n        ${pageHtml}\n      `)
    return out
  }

  const jsonLd = JSON.stringify(routeJsonLd(route)).replace(/</g, '\\u003c')
  out = out.replace(
    /<script type="application\/ld\+json" id="public-cap-jsonld">[\s\S]*?<\/script>/,
    `<script type="application/ld+json" id="public-cap-jsonld">\n      ${jsonLd}\n    </script>`,
  )

  if (path.startsWith('/school/') && route.school) {
    out = replaceElementInner(out, '<div id="home-dek" class="page-wrap home-dek">', '')
    out = replaceElementInner(
      out,
      '<div id="root">',
      `\n        ${renderSchoolStaticBody(route.school, route.seo)}\n      `,
    )
    return out
  }

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
  if (path.startsWith('/school/')) {
    out = out.replace(
      '<div id="root">',
      `<div id="root">\n        ${nil101CueHtml(NIL101_SCHOOL_LINK_TEXT)}`,
    )
  }
  return out
}

function loadNilCaps() {
  const data = JSON.parse(readFileSync(join(root, 'public/data/schools.json'), 'utf8'))
  const year1 = data.meta?.houseCap?.y2025_26?.value
  const year2 = data.meta?.houseCap?.y2026_27?.value
  if (typeof year1 !== 'number' || typeof year2 !== 'number') {
    throw new Error('nil-101: booked house caps missing from schools.json')
  }
  return { year1, year2 }
}

/** Replace the inner HTML of the first element whose opening tag is `openTag`. */
export function replaceElementInner(html, openTag, inner) {
  const start = html.indexOf(openTag)
  if (start < 0) throw new Error(`missing ${openTag}`)
  const contentStart = start + openTag.length
  const tagName = /^<([a-zA-Z0-9]+)/.exec(openTag)?.[1]
  if (!tagName) throw new Error(`bad open tag ${openTag}`)
  let depth = 1
  let i = contentStart
  while (i < html.length) {
    const nextOpen = html.indexOf(`<${tagName}`, i)
    const nextClose = html.indexOf(`</${tagName}>`, i)
    if (nextClose < 0) throw new Error(`unclosed <${tagName}>`)
    if (nextOpen !== -1 && nextOpen < nextClose) {
      const boundary = html[nextOpen + tagName.length + 1]
      if (boundary === '>' || boundary === ' ' || boundary === '/' || boundary === '\n' || boundary === '\t') {
        depth += 1
        i = nextOpen + tagName.length + 2
        continue
      }
      i = nextOpen + tagName.length + 1
      continue
    }
    depth -= 1
    if (depth === 0) return html.slice(0, contentStart) + inner + html.slice(nextClose)
    i = nextClose + tagName.length + 3
  }
  throw new Error(`unclosed <${tagName}>`)
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
