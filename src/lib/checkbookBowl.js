/**
 * Checkbook bowl: did the bigger FY2025 football spender win the big game?
 * Dollars and scores stay on the book. This module only reads them.
 */

export const BOOK_PATH = '/data/checkbook-bowl.json'
export const PAGE_PATH = '/checkbook-bowl'

export function isFinal(game) {
  return typeof game?.biggerSpenderWon === 'boolean'
}

export function biggerSpenderId(game) {
  const home = game?.home
  const away = game?.away
  if (!home || !away || home.spend == null || away.spend == null) return null
  if (home.spend === away.spend) return null
  return home.spend > away.spend ? home.id : away.id
}

export function underdogId(game) {
  const fav = biggerSpenderId(game)
  if (!fav) return null
  return fav === game.home.id ? game.away.id : game.home.id
}

export function sideById(game, id) {
  if (game?.home?.id === id) return game.home
  if (game?.away?.id === id) return game.away
  return null
}

/** Compare opens with the checkbook favorite as A. */
export function compareHref(game) {
  const fav = biggerSpenderId(game)
  const dog = underdogId(game)
  if (!fav || !dog) return '/compare'
  return `/compare?a=${encodeURIComponent(fav)}&b=${encodeURIComponent(dog)}`
}

export function finalGames(games, throughWeek = null) {
  return (games || []).filter((game) => {
    if (!isFinal(game)) return false
    if (throughWeek != null && game.week > throughWeek) return false
    return true
  })
}

export function seasonRecord(games, throughWeek = null) {
  const rows = finalGames(games, throughWeek)
  const wins = rows.filter((game) => game.biggerSpenderWon).length
  const losses = rows.length - wins
  return {
    wins,
    losses,
    games: rows.length,
    rate: rows.length ? wins / rows.length : null,
  }
}

export function weekRecords(games) {
  const weeks = [...new Set((games || []).map((game) => game.week))].sort((a, b) => a - b)
  return weeks.map((week) => {
    const slice = (games || []).filter((game) => game.week === week)
    const record = seasonRecord(slice)
    const upcoming = slice.filter((game) => !isFinal(game)).length
    return { week, ...record, upcoming }
  })
}

/** Cheaper school won. Biggest spend gap first. */
export function upsetGames(games) {
  return finalGames(games)
    .filter((game) => !game.biggerSpenderWon)
    .sort((a, b) => b.gap - a.gap || a.date.localeCompare(b.date))
}

export function upcomingGames(games) {
  return (games || [])
    .filter((game) => !isFinal(game))
    .sort((a, b) => a.date.localeCompare(b.date) || a.away.id.localeCompare(b.away.id))
}

export function ctDateKey(iso) {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dt)
}

export function kickLabel(iso) {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return ''
  const when = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(dt)
  return `${when} CT`
}

export function ctDayLabel(iso) {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(dt)
}

const SORT_DEFAULT_DIR = {
  week: 'asc',
  matchup: 'asc',
  spend: 'desc',
  gap: 'desc',
  score: 'desc',
  result: 'asc',
}

export function defaultSortDir(key) {
  return SORT_DEFAULT_DIR[key] || 'asc'
}

export function sortGames(games, { key = 'week', dir = 'asc', nameOf } = {}) {
  const sign = dir === 'asc' ? 1 : -1
  const name = (id) => String(nameOf?.(id) || id).toLowerCase()
  const value = (game) => {
    if (key === 'week') return game.week
    if (key === 'gap') return game.gap
    if (key === 'spend') return Math.max(game.home.spend, game.away.spend)
    if (key === 'score') {
      if (!isFinal(game)) return -1
      return Math.abs(game.home.score - game.away.score)
    }
    if (key === 'result') {
      if (!isFinal(game)) return 2
      return game.biggerSpenderWon ? 0 : 1
    }
    const fav = biggerSpenderId(game)
    const dog = underdogId(game)
    return `${name(fav)} ${name(dog)}`
  }
  return [...(games || [])].sort((a, b) => {
    const va = value(a)
    const vb = value(b)
    if (va < vb) return -1 * sign
    if (va > vb) return 1 * sign
    if (a.date < b.date) return -1
    if (a.date > b.date) return 1
    if (a.week !== b.week) return a.week - b.week
    return a.away.id.localeCompare(b.away.id)
  })
}

function requireId(side, label) {
  if (!side || typeof side.id !== 'string' || !side.id) {
    throw new Error(`${label} is missing a school id`)
  }
  return side.id
}

function deriveSide(raw, spendMap, label) {
  const id = requireId(raw, label)
  if (!Object.prototype.hasOwnProperty.call(spendMap, id)) {
    throw new Error(`${id} is not in spendFy2025`)
  }
  const spend = spendMap[id]
  if (!Number.isInteger(spend) || spend <= 0) {
    throw new Error(`spendFy2025.${id} is not a positive integer`)
  }
  if (raw.spend != null && raw.spend !== spend) {
    throw new Error(`${id} spend ${raw.spend} does not match EADA ${spend}`)
  }
  const side = { id, spend }
  if (raw.rank != null) {
    if (!Number.isInteger(raw.rank) || raw.rank < 1 || raw.rank > 25) {
      throw new Error(`${id} AP rank must be an integer 1–25`)
    }
    side.rank = raw.rank
  }
  if (raw.score != null) {
    if (!Number.isInteger(raw.score) || raw.score < 0) {
      throw new Error(`${id} score must be a non-negative integer`)
    }
    side.score = raw.score
  }
  return side
}

/**
 * Fill spend, gap, winner, and biggerSpenderWon from the EADA map and scores.
 * Leave scores off both sides for an upcoming game. One score is an error.
 * A tie score is an error — this book does not invent a winner.
 */
export function deriveGame(raw, spendMap) {
  if (!raw || typeof raw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(raw.date)) {
    throw new Error('game date must be an ISO timestamp')
  }
  if (!Number.isInteger(raw.week) || raw.week < 1) {
    throw new Error(`bad week for ${raw.date}`)
  }
  const home = deriveSide(raw.home, spendMap, 'home')
  const away = deriveSide(raw.away, spendMap, 'away')
  if (home.id === away.id) throw new Error(`game lists ${home.id} twice`)
  if (home.rank == null && away.rank == null) {
    throw new Error(`${away.id} at ${home.id} is not a big game (no AP rank)`)
  }
  if (home.spend === away.spend) {
    throw new Error(`${away.id} at ${home.id} has equal spend`)
  }
  const scored = home.score != null || away.score != null
  if (scored && (home.score == null || away.score == null)) {
    throw new Error(`${away.id} at ${home.id} has only one score`)
  }
  if (scored && home.score === away.score) {
    throw new Error(`${away.id} at ${home.id} is a tie — no winner to book`)
  }
  const game = { date: raw.date, week: raw.week, home, away }
  if (scored) {
    const winner = home.score > away.score ? home.id : away.id
    const bigger = home.spend > away.spend ? home.id : away.id
    game.winner = winner
    game.biggerSpenderWon = winner === bigger
  }
  game.gap = Math.abs(home.spend - away.spend)
  if (raw.neutral === true) game.neutral = true
  if (raw.gap != null && raw.gap !== game.gap) {
    throw new Error(`${away.id} at ${home.id} gap ${raw.gap} does not match spend`)
  }
  if (raw.winner != null && raw.winner !== game.winner) {
    throw new Error(`${away.id} at ${home.id} winner does not match the score`)
  }
  if (typeof raw.biggerSpenderWon === 'boolean' && raw.biggerSpenderWon !== game.biggerSpenderWon) {
    throw new Error(`${away.id} at ${home.id} biggerSpenderWon does not match`)
  }
  return game
}

export function gameKey(game) {
  return `${game.date}|${game.home.id}|${game.away.id}`
}
