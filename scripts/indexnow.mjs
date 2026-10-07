/**
 * Ping IndexNow so Bing (and other IndexNow engines) recrawl buyout and school URLs.
 *
 * Cloudflare Pages has no in-repo deploy hook, so this is a manual post-deploy step.
 * It is not part of `npm run build` or `npm run verify`.
 *
 *   npm run indexnow
 *   INDEXNOW_DRY_RUN=1 npm run indexnow
 *
 * The owner, once, in Bing Webmaster Tools:
 *   1. Add https://thepubliccap.com and verify the site if it is not already verified.
 *   2. Deploy so https://thepubliccap.com/34af1a9e03fae2647e2d32b44b8a08a5.txt
 *      is publicly reachable and its body is the key
 *      34af1a9e03fae2647e2d32b44b8a08a5.
 *   3. IndexNow does not need a separate Bing API key. Bing reads the key from that
 *      file (keyLocation). No extra key paste is required.
 *   4. Submit https://thepubliccap.com/sitemap.xml in Bing Webmaster Tools if the
 *      sitemap is not already there. The sitemap lists every /school/<id> page,
 *      every /buyout/<id> page, and /buyout/hot-seat.
 *   5. After each production deploy that changes a buyout or school page, run
 *      `npm run indexnow` from a machine that can reach api.indexnow.org.
 *      A dry run prints the URL list and does not POST.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
export const INDEXNOW_HOST = 'thepubliccap.com'
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

export function indexNowKeyFile() {
  const publicDir = join(root, 'public')
  const names = readdirSync(publicDir).filter((name) => /^[a-f0-9]{8,128}\.txt$/.test(name))
  if (names.length !== 1) {
    throw new Error(`expected one IndexNow key file in public/, found ${names.join(', ') || 'none'}`)
  }
  const key = names[0].slice(0, -4)
  const body = readFileSync(join(publicDir, names[0]), 'utf8').trim()
  if (body !== key) throw new Error('IndexNow key file body does not match its filename')
  return { key, file: names[0] }
}

export function indexNowUrls(sitemapXml) {
  const locs = [...String(sitemapXml).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  return locs.filter((url) => /\/buyout(\/|$)/.test(url) || url.includes('/school/'))
}

export function indexNowPayload(sitemapXml) {
  const { key } = indexNowKeyFile()
  const urlList = indexNowUrls(sitemapXml)
  if (!urlList.length) throw new Error('IndexNow URL list is empty')
  return {
    host: INDEXNOW_HOST,
    key,
    keyLocation: `https://${INDEXNOW_HOST}/${key}.txt`,
    urlList,
  }
}

async function main() {
  const sitemap = readFileSync(join(root, 'public/sitemap.xml'), 'utf8')
  const payload = indexNowPayload(sitemap)
  const dry = process.env.INDEXNOW_DRY_RUN === '1'
  console.log(
    `indexnow: ${payload.urlList.length} URLs · key ${payload.key} · ${dry ? 'dry run' : 'POST ' + INDEXNOW_ENDPOINT}`,
  )
  if (!payload.urlList.some((url) => url.endsWith('/buyout/hot-seat'))) {
    throw new Error('IndexNow list is missing /buyout/hot-seat')
  }
  if (dry) {
    for (const url of payload.urlList) console.log(url)
    return
  }
  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  console.log(`indexnow: HTTP ${res.status} ${text.slice(0, 500)}`)
  if (!res.ok && res.status !== 202) process.exit(1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
