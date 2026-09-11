import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { defTitle } from '../lib/definitions.js'
import { moneyExact } from '../lib/format.js'
import {
  BOARD_PATH,
  DEFAULT_SEASON,
  DESK_AS_OF,
  SCHOOL_HASH,
  SORT_KEYS,
  formatGameDate,
  gameCites,
  gamesForSchool,
  hasDollar,
  kindLabel,
  listGames,
  party,
  schoolHref,
  sortGames,
  sumAmounts,
} from '../lib/guaranteeGames.js'

function useGuaranteeBook() {
  const [book, setBook] = useState(null)
  const [schools, setSchools] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/data/guarantee-games.json').then((r) => {
        if (!r.ok) throw new Error(r.statusText)
        return r.json()
      }),
      fetch('/data/desk.json').then((r) => (r.ok ? r.json() : null)),
      fetch('/data/schools.json').then((r) => (r.ok ? r.json() : { schools: [] })),
    ])
      .then(([b, desk, sk]) => {
        setBook(b)
        setSchools(desk?.schools || sk?.schools || [])
      })
      .catch((e) => setErr(String(e)))
  }, [])

  return { book, schools, err }
}

function SourceLink({ source, className = 'ext' }) {
  if (!source?.url) return source?.label ? <span>{source.label}</span> : null
  return (
    <a className={className} href={source.url} target="_blank" rel="noreferrer">
      {source.label || 'source'} ↗
    </a>
  )
}

function PartyCell({ game, side, schools, season }) {
  const row = party(game, side, schools)
  const href = schoolHref(row, season)
  return (
    <span className="guarantee-party">
      {row.school ? <Logo school={row.school} size={28} /> : null}
      {href ? <Link to={href}>{row.label}</Link> : <span>{row.label}</span>}
    </span>
  )
}

function AmountCell({ amount, confidence, empty = 'pending' }) {
  if (!hasDollar(amount)) {
    return (
      <span className="pending-cell">
        {empty} <i className="dot pending" />
      </span>
    )
  }
  return (
    <>
      {moneyExact(amount)} <i className={`dot ${confidence || 'reported'}`} />
    </>
  )
}

function GameNotes({ game, book, extraCites = false }) {
  const cites = extraCites ? gameCites(book, game).slice(1) : []
  return (
    <>
      {game.notes ? <div className="term-compact">{game.notes}</div> : null}
      {cites.length ? (
        <div className="guarantee-cites">
          {cites.map((c) => (
            <SourceLink key={c.id} source={c} />
          ))}
        </div>
      ) : null}
    </>
  )
}

function GuaranteeTable({ rows, book, schools, season, sort, onSort, compact }) {
  return (
    <div className="table-scroll buyout-scroll">
      <table className="rank buyout-table guarantee-table">
        <thead>
          <tr>
            {SORT_KEYS.map((col) => (
              <th
                key={col.id}
                className={col.type === 'num' ? 'num' : ''}
                onClick={() => onSort?.(col.id)}
              >
                {col.label}
                {sort?.key === col.id ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
              </th>
            ))}
            <th>Home</th>
            {!compact ? <th>Kind</th> : null}
            <th>Cite</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => {
            const cite = gameCites(book, g)[0]
            const band = hasDollar(g.bandAmount) ? g.bandAmount : null
            return (
              <tr key={g.id}>
                <td className="num strong">
                  <AmountCell amount={g.amount} confidence={g.confidence} />
                  {band != null ? (
                    <div className="term-compact">band {moneyExact(band)} · not the football guarantee</div>
                  ) : null}
                </td>
                <td>
                  <PartyCell game={g} side="payer" schools={schools} season={season} />
                </td>
                <td>
                  <PartyCell game={g} side="payee" schools={schools} season={season} />
                </td>
                <td>{formatGameDate(g.date)}</td>
                <td>
                  <PartyCell game={g} side="home" schools={schools} season={season} />
                </td>
                {!compact ? <td>{kindLabel(g.kind)}</td> : null}
                <td>
                  <SourceLink source={cite} />
                  {!compact ? <GameNotes game={g} book={book} extraCites /> : g.notes ? <div className="term-compact">{g.notes}</div> : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function GuaranteeSchoolSection({ schoolId, season = DEFAULT_SEASON }) {
  const { book, schools, err } = useGuaranteeBook()
  if (err || !book) return null
  const { paid, received } = gamesForSchool(book, schoolId, season)
  if (!paid.length && !received.length) return null
  const paidSum = sumAmounts(paid)
  const receivedSum = sumAmounts(received)

  return (
    <section id={`slice-${SCHOOL_HASH}`} className="guarantee-school">
      <h2 title={defTitle('guaranteeGames')}>Guarantee games</h2>
      <p className="lede tight">
        How much this school paid — or was paid — to play a {season} football game.
        Football guarantee is not band money, not House spent, and not booked NIL.
        $0 means the contract says $0. Empty stays off this card.
      </p>
      {paid.length ? (
        <>
          <div className="eyebrow">Paid out{hasDollar(paidSum) ? ` · ${moneyExact(paidSum)} football` : ''}</div>
          <GuaranteeTable
            rows={sortGames(paid, { key: 'amount', dir: 'desc', schools })}
            book={book}
            schools={schools}
            season={season}
            compact
          />
        </>
      ) : null}
      {received.length ? (
        <>
          <div className="eyebrow">Received{hasDollar(receivedSum) ? ` · ${moneyExact(receivedSum)} football` : ''}</div>
          <GuaranteeTable
            rows={sortGames(received, { key: 'amount', dir: 'desc', schools })}
            book={book}
            schools={schools}
            season={season}
            compact
          />
        </>
      ) : null}
      <p className="fine">
        Full 2026 board on <Link to={BOARD_PATH}>/guarantee-games</Link>.
      </p>
    </section>
  )
}

export default function GuaranteeGames() {
  const { book, schools, err } = useGuaranteeBook()
  const [sort, setSort] = useState({ key: 'amount', dir: 'desc' })

  const rows = useMemo(() => {
    if (!book) return []
    return sortGames(listGames(book, { season: DEFAULT_SEASON }), {
      key: sort.key,
      dir: sort.dir,
      schools,
    })
  }, [book, schools, sort])

  function toggle(key) {
    const col = SORT_KEYS.find((c) => c.id === key)
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: col?.defaultDir || 'desc' },
    )
  }

  if (err) {
    return (
      <div className="page-wrap guarantee-page">
        <p className="lede">Failed to load guarantee desk. {err}</p>
      </div>
    )
  }
  if (!book || !schools) {
    return (
      <div className="page-wrap guarantee-page">
        <p className="lede">Setting type…</p>
      </div>
    )
  }

  return (
    <div className="page-wrap guarantee-page">
      <p className="crumb">
        <Link to="/">Rank list</Link>
        {' · '}
        Guarantee games
      </p>
      <h1 className="issue-hed" title={defTitle('guaranteeGames')}>
        How much they paid the visitor to show up.
      </h1>
      <p className="lede">
        A buy game is a check from a larger school — usually Power 4 — so a smaller
        opponent will play them on the {DEFAULT_SEASON} football schedule. The
        football guarantee is the game check. Band money (FAMU Marching 100) is a
        separate cell. This is not House spent, not booked NIL, and not a coach
        buyout. $0 only when the contract says $0. Empty means pending — we do
        not invent dollars.
      </p>

      <p className="result-count">
        {rows.length} cited {DEFAULT_SEASON} game{rows.length === 1 ? '' : 's'}
      </p>

      {rows.length === 0 ? (
        <div className="field pending-box">
          <div className="field-val">No guarantee games on the desk</div>
          <div className="field-meta">
            Rows stay empty until a FOIA or named newsroom contract is cited.
          </div>
        </div>
      ) : (
        <GuaranteeTable
          rows={rows}
          book={book}
          schools={schools}
          season={DEFAULT_SEASON}
          sort={sort}
          onSort={toggle}
        />
      )}

      <p className="fine">
        Football guarantee ≠ band. ≠ House spent. ≠ booked NIL. Power 4 schools
        on the desk link through; FCS / G5 visitors stay a labeled external name.
        As of {book.meta?.asOf || DESK_AS_OF}.
      </p>
    </div>
  )
}
