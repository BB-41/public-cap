import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { defTitle } from '../lib/definitions.js'
import {
  biggerSpenderId,
  compareHref,
  ctDateKey,
  ctDayLabel,
  defaultSortDir,
  isFinal,
  kickLabel,
  PAGE_PATH,
  seasonRecord,
  sideById,
  sortGames,
  underdogId,
  upcomingGames,
  upsetGames,
  weekRecords,
} from '../lib/checkbookBowl.js'
import { money, moneyExact, pct } from '../lib/format.js'

const COLUMNS = [
  { id: 'week', label: 'Week', type: 'num' },
  { id: 'matchup', label: 'Matchup', type: 'text' },
  { id: 'spend', label: 'Spend', type: 'num' },
  { id: 'gap', label: 'Gap', type: 'num' },
  { id: 'score', label: 'Score', type: 'num' },
  { id: 'result', label: 'Result', type: 'text' },
]

function useCheckbook() {
  const [book, setBook] = useState(null)
  const [schools, setSchools] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/data/checkbook-bowl.json').then((r) => {
        if (!r.ok) throw new Error(r.statusText)
        return r.json()
      }),
      loadSchools(),
    ])
      .then(([nextBook, nextSchools]) => {
        if (cancelled) return
        setBook(nextBook)
        setSchools(nextSchools)
      })
      .catch((e) => {
        if (!cancelled) setErr(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { book, schools, err }
}

async function loadSchools() {
  const desk = await fetch('/data/desk.json')
  if (desk.ok) {
    try {
      const data = JSON.parse(await desk.text())
      if (data?.schools?.length) return data.schools
    } catch {
      /* desk.json is generated at dev/build; fall through to schools.json */
    }
  }
  const sk = await fetch('/data/schools.json')
  if (!sk.ok) throw new Error('schools missing')
  const data = await sk.json()
  return data.schools || []
}

function schoolName(schools, id) {
  return schools.get(id)?.shortName || schools.get(id)?.name || id
}

function TeamLink({ game, id, schools, gold }) {
  const school = schools.get(id)
  const side = sideById(game, id)
  const label = school?.shortName || school?.name || id
  return (
    <Link className={gold ? 'school-link checkbook-fav' : 'school-link checkbook-dog'} to={`/school/${id}`}>
      {school ? <Logo school={school} size={22} /> : null}
      <span>
        {side?.rank ? `#${side.rank} ` : ''}
        {label}
      </span>
    </Link>
  )
}

function ResultLink({ game }) {
  const href = compareHref(game)
  if (!isFinal(game)) {
    return (
      <Link className="checkbook-badge upcoming" to={href}>
        UPCOMING
      </Link>
    )
  }
  if (game.biggerSpenderWon) {
    return (
      <Link className="checkbook-badge win" to={href}>
        CHECKBOOK WINS
      </Link>
    )
  }
  return (
    <Link className="checkbook-badge upset" to={href}>
      UPSET
    </Link>
  )
}

function ScoreCell({ game, schools }) {
  if (!isFinal(game)) return <span className="muted">—</span>
  const away = schoolName(schools, game.away.id)
  const home = schoolName(schools, game.home.id)
  return (
    <span title={`${away} ${game.away.score}, ${home} ${game.home.score}`}>
      {game.away.score}–{game.home.score}
    </span>
  )
}

export default function CheckbookBowl() {
  const { book, schools: schoolList, err } = useCheckbook()
  const [sort, setSort] = useState({ key: 'week', dir: 'asc' })

  const schools = useMemo(() => {
    const map = new Map()
    for (const school of schoolList || []) map.set(school.id, school)
    return map
  }, [schoolList])

  const nameOf = (id) => schoolName(schools, id)

  const games = book?.games || []
  const record = seasonRecord(games)
  const weeks = weekRecords(games)
  const upsets = upsetGames(games)
  const upcoming = upcomingGames(games)
  const rows = useMemo(
    () => sortGames(games, { key: sort.key, dir: sort.dir, nameOf }),
    [games, sort, schools],
  )

  const upcomingDays = useMemo(() => {
    const groups = []
    for (const game of upcoming) {
      const key = ctDateKey(game.date)
      const last = groups[groups.length - 1]
      if (!last || last.key !== key) groups.push({ key, label: ctDayLabel(game.date), games: [game] })
      else last.games.push(game)
    }
    return groups
  }, [upcoming])

  function toggle(key) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: defaultSortDir(key) },
    )
  }

  if (err) {
    return (
      <div className="page-wrap checkbook-page">
        <p className="lede">Failed to load the checkbook bowl. {err}</p>
      </div>
    )
  }
  if (!book || !schoolList) {
    return (
      <div className="page-wrap checkbook-page">
        <p className="lede">Setting type…</p>
      </div>
    )
  }

  return (
    <div className="page-wrap checkbook-page">
      <p className="crumb">
        <Link to="/">Rank list</Link>
        {' · '}
        <Link to={PAGE_PATH}>Checkbook bowl</Link>
      </p>
      <p className="kicker">Season {book.season} · big games only</p>
      <h1 className="issue-hed" title={defTitle('checkbookBowl')}>
        Does the bigger spender win?
      </h1>

      <div className="checkbook-hero">
        <div className="checkbook-hero-record">
          <div className="eyebrow">Bigger spender</div>
          <p className="visually-hidden">
            Bigger spender: {record.wins}-{record.losses}
          </p>
          <p className="display checkbook-record" aria-hidden="true">
            {record.wins}-{record.losses}
          </p>
          <p className="checkbook-rate">
            {pct(record.rate)} win rate · {record.games} final game{record.games === 1 ? '' : 's'}
          </p>
        </div>
        <ol className="checkbook-weeks">
          {weeks.map((week) => (
            <li key={week.week}>
              <div className="eyebrow">Week {week.week}</div>
              {week.games ? (
                <div className="checkbook-week-rec">
                  {week.wins}-{week.losses}
                </div>
              ) : null}
              {week.upcoming ? (
                <div className="term-compact">
                  {week.upcoming} upcoming
                </div>
              ) : (
                <div className="term-compact">{week.games} final</div>
              )}
            </li>
          ))}
        </ol>
      </div>

      <p className="lede">
        Gold is the checkbook favorite: the school with the higher FY2025 football expense.
        Checkbook wins means that school won. Upset means the smaller filing won anyway.
        Both teams have to be on this desk — Power 4 plus Notre Dame — and at least one has to be AP-ranked.
        Anything not final stays off the record.
      </p>

      <h2 id="upsets">Biggest upsets</h2>
      <p className="lede tight">
        The school that spent less won. Sorted by the gap, largest first.
      </p>
      {upsets.length ? (
        <ol className="checkbook-upsets">
          {upsets.map((game) => {
            const dog = underdogId(game)
            const fav = biggerSpenderId(game)
            const dogSide = sideById(game, dog)
            const favSide = sideById(game, fav)
            return (
              <li key={`${game.date}-${game.away.id}`}>
                <div className="checkbook-upset-gap" title={moneyExact(game.gap)}>
                  {money(game.gap)}
                </div>
                <div>
                  <TeamLink game={game} id={dog} schools={schools} />
                  <span className="checkbook-score"> {dogSide.score}</span>
                  <span className="checkbook-at"> beat </span>
                  <TeamLink game={game} id={fav} schools={schools} gold />
                  <span className="checkbook-score"> {favSide.score}</span>
                  <div className="term-compact">
                    Week {game.week} · {kickLabel(game.date)}
                  </div>
                </div>
                <ResultLink game={game} />
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="lede tight">No upsets on the book yet. The checkbook is undefeated.</p>
      )}

      <h2 id="upcoming">Upcoming</h2>
      <p className="lede tight">
        On the board, not final. These games do not move the {record.wins}-{record.losses}.
        Kick times are Central.
      </p>
      {upcomingDays.length === 0 ? (
        <p className="lede tight">No upcoming big games on the book.</p>
      ) : (
        upcomingDays.map((day) => (
          <section key={day.key} className="checkbook-day">
            <h3 className="eyebrow">{day.label}</h3>
            <div className="checkbook-cards">
              {day.games.map((game) => {
                const fav = biggerSpenderId(game)
                const dog = underdogId(game)
                return (
                  <article key={`${game.date}-${game.away.id}`} className="checkbook-card">
                    <div className="checkbook-kick">{kickLabel(game.date)}</div>
                    <div className="checkbook-card-line">
                      <TeamLink game={game} id={fav} schools={schools} gold />
                      <span className="checkbook-card-spend" title={moneyExact(sideById(game, fav).spend)}>
                        {money(sideById(game, fav).spend)}
                      </span>
                    </div>
                    <div className="checkbook-card-line">
                      <TeamLink game={game} id={dog} schools={schools} />
                      <span className="checkbook-card-spend" title={moneyExact(sideById(game, dog).spend)}>
                        {money(sideById(game, dog).spend)}
                      </span>
                    </div>
                    <div className="checkbook-card-foot">
                      <span className="checkbook-card-gap" title={moneyExact(game.gap)}>
                        +{money(game.gap)}
                      </span>
                      <ResultLink game={game} />
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))
      )}

      <h2 id="games">Every big game</h2>
      <p className="result-count">
        {rows.length} game{rows.length === 1 ? '' : 's'} · {record.games} final · {upcoming.length} upcoming.
        Each result links to the compare desk. School names link to the school page.
      </p>
      <div className="table-scroll buyout-scroll">
        <table className="rank buyout-table checkbook-table">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.id}
                  className={col.type === 'num' ? 'num' : ''}
                  aria-sort={sort.key === col.id ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onClick={() => toggle(col.id)}
                >
                  {col.label}
                  {sort.key === col.id ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((game) => {
              const fav = biggerSpenderId(game)
              const dog = underdogId(game)
              const favSide = sideById(game, fav)
              const dogSide = sideById(game, dog)
              return (
                <tr key={`${game.date}-${game.away.id}-${game.home.id}`} className={isFinal(game) ? (game.biggerSpenderWon ? 'checkbook-win' : 'checkbook-loss') : 'checkbook-later'}>
                  <td className="num">
                    {game.week}
                    <div className="term-compact">{kickLabel(game.date)}</div>
                  </td>
                  <td>
                    <span className="checkbook-matchup">
                      <TeamLink game={game} id={game.away.id} schools={schools} gold={game.away.id === fav} />
                      <span className="checkbook-at">{game.neutral ? 'vs' : 'at'}</span>
                      <TeamLink game={game} id={game.home.id} schools={schools} gold={game.home.id === fav} />
                    </span>
                    {game.neutral ? <div className="term-compact">neutral site</div> : null}
                  </td>
                  <td className="num">
                    <div className="checkbook-fav">
                      {schoolName(schools, fav)} {moneyExact(favSide.spend)}
                    </div>
                    <div className="checkbook-dog-num">
                      {schoolName(schools, dog)} {moneyExact(dogSide.spend)}
                    </div>
                  </td>
                  <td className="num strong" title={money(game.gap)}>
                    {moneyExact(game.gap)}
                  </td>
                  <td className="num">
                    <ScoreCell game={game} schools={schools} />
                  </td>
                  <td>
                    <ResultLink game={game} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="fine">
        {book.method} {book.source} As of {book.asOf}. Not House spent, not booked NIL, not a coach buyout.
      </p>
    </div>
  )
}
