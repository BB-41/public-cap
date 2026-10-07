/**
 * Checkbook bowl season log.
 *
 * Book: data/checkbook-bowl.json
 * Public copy: public/data/checkbook-bowl.json
 *
 * spendFy2025 is every desk school's FY2025 EADA TOTAL_EXPENSE_ALL_Football.
 * Game rows copy those integers. Do not type a new dollar.
 *
 * To log a weekend, append a game and recompute:
 *
 *   {
 *     "date": "2026-10-03T16:00Z",
 *     "week": 5,
 *     "home": { "id": "georgia", "rank": 2, "score": 24 },
 *     "away": { "id": "alabama", "rank": 6, "score": 17 }
 *   }
 *
 * Rank is the AP top-25 rank when the team has one. At least one side needs a rank.
 * Leave score off both sides when the game is not final. A partial score is not a result.
 * Optional "neutral": true when the site is neutral.
 *
 *   node scripts/checkbook-bowl.mjs                 validate and print the record
 *   node scripts/checkbook-bowl.mjs --write         recompute derived fields, write both copies
 *   node scripts/checkbook-bowl.mjs --append f.json merge games from a JSON file, then write
 *
 * --append accepts a bare array or { "games": [ ... ] }. A repeated date + home + away
 * replaces the earlier row, so a final score can fill an upcoming game.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  deriveGame,
  gameKey,
  seasonRecord,
  weekRecords,
} from '../src/lib/checkbookBowl.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bookPath = join(root, 'data/checkbook-bowl.json')
const publicPath = join(root, 'public/data/checkbook-bowl.json')
const schoolsPath = join(root, 'data/schools.json')

export function loadBook(path = bookPath) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function assertSpendMap(book, schoolIds) {
  const map = book?.spendFy2025
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    throw new Error('spendFy2025 map is missing')
  }
  const keys = Object.keys(map)
  if (schoolIds) {
    const missing = [...schoolIds].filter((id) => !Object.prototype.hasOwnProperty.call(map, id))
    const extra = keys.filter((id) => !schoolIds.has(id))
    if (missing.length || extra.length || keys.length !== schoolIds.size) {
      throw new Error(
        `spendFy2025 must be exactly the ${schoolIds.size} desk schools (missing ${missing.length}, extra ${extra.length})`,
      )
    }
  }
  for (const [id, spend] of Object.entries(map)) {
    if (!Number.isInteger(spend) || spend <= 0) {
      throw new Error(`spendFy2025.${id} is not a positive integer`)
    }
  }
  return map
}

export function normalizeGames(games, spendMap) {
  if (!Array.isArray(games)) throw new Error('games must be an array')
  const seen = new Set()
  const next = games.map((raw) => {
    const game = deriveGame(raw, spendMap)
    const key = gameKey(game)
    if (seen.has(key)) throw new Error(`duplicate game ${key}`)
    seen.add(key)
    return game
  })
  next.sort((a, b) => a.date.localeCompare(b.date) || a.away.id.localeCompare(b.away.id) || a.home.id.localeCompare(b.home.id))
  return next
}

export function mergeGames(existing, incoming) {
  const map = new Map(existing.map((game) => [gameKey(game), game]))
  for (const game of incoming) map.set(gameKey(game), game)
  return [...map.values()]
}

function readAppend(file) {
  const data = JSON.parse(readFileSync(file, 'utf8'))
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.games)) return data.games
  throw new Error('--append file must be a games array or { games: [] }')
}

export function buildBook(book, { append } = {}) {
  const schools = JSON.parse(readFileSync(schoolsPath, 'utf8'))
  const schoolIds = new Set((schools.schools || []).map((school) => school.id))
  const spendMap = assertSpendMap(book, schoolIds)
  let games = book.games
  if (append) games = mergeGames(games || [], readAppend(append))
  const next = {
    season: book.season,
    asOf: book.asOf,
    method: book.method,
    source: book.source,
    spendFy2025: Object.fromEntries(Object.entries(spendMap).sort(([a], [b]) => a.localeCompare(b))),
    games: normalizeGames(games, spendMap),
  }
  if (next.season !== 2026) throw new Error('season must be 2026')
  if (typeof next.method !== 'string' || !next.method.trim()) throw new Error('method text is missing')
  if (typeof next.source !== 'string' || !next.source.trim()) throw new Error('source note is missing')
  return next
}

export function recordLines(book) {
  const through = seasonRecord(book.games, 3)
  const all = seasonRecord(book.games)
  const weeks = weekRecords(book.games)
    .map((week) => {
      if (week.games) return `wk ${week.week} ${week.wins}-${week.losses} (${week.games})`
      return `wk ${week.week} upcoming ${week.upcoming}`
    })
    .join(' · ')
  const rate = through.games ? `${Math.round((through.rate || 0) * 100)}%` : '—'
  return [
    `through week 3: bigger spender ${through.wins}-${through.losses} (${rate}) in ${through.games} games`,
    `final games in book: ${all.wins}-${all.losses} in ${all.games}`,
    weeks,
  ]
}

function writeBoth(book) {
  const text = `${JSON.stringify(book, null, 2)}\n`
  writeFileSync(bookPath, text)
  writeFileSync(publicPath, text)
}

function argValue(flag) {
  const i = process.argv.indexOf(flag)
  if (i === -1) return null
  return process.argv[i + 1] || null
}

function main() {
  const write = process.argv.includes('--write') || process.argv.includes('--append')
  const append = argValue('--append')
  if (process.argv.includes('--append') && !append) {
    throw new Error('--append needs a JSON file')
  }
  const book = buildBook(loadBook(), { append })
  if (write) writeBoth(book)
  for (const line of recordLines(book)) console.log(line)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main()
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}
