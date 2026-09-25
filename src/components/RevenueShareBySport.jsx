import { useEffect, useState } from 'react'
import { defTitle } from '../lib/definitions.js'
import {
  formatShareLine,
  formatSourceDate,
  statementsFor,
} from '../lib/revenueShareBySport.js'

function useRevenueShareBook() {
  const [book, setBook] = useState(null)
  useEffect(() => {
    let cancelled = false
    fetch('/data/revenue-share-by-sport.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled) setBook(j)
      })
      .catch(() => {
        if (!cancelled) setBook(null)
      })
    return () => {
      cancelled = true
    }
  }, [])
  return book
}

function ShareRow({ row }) {
  const share = formatShareLine(row)
  if (!share) return null
  return (
    <tr className={row.total ? 'total' : row.nested ? 'nested' : undefined}>
      <td>
        {row.sport}
        {row.note ? <div className="field-notes">{row.note}</div> : null}
      </td>
      <td className="num">{share}</td>
    </tr>
  )
}

function Statement({ statement }) {
  return (
    <div className="rev-share-statement">
      <div className="eyebrow">
        {statement.fiscalYear}
        {statement.yearNote ? ` · ${statement.yearNote}` : ''}
      </div>
      <p className="rev-share-status">{statement.status}</p>
      {statement.official ? <p className="field-notes">{statement.official}</p> : null}
      <div className="rev-share-scroll">
        <table className="roster rev-share-table">
          <thead>
            <tr>
              <th>Sport</th>
              <th className="num">{statement.shareHeading || 'Stated share'}</th>
            </tr>
          </thead>
          <tbody>
            {statement.rows.map((row) => (
              <ShareRow key={`${statement.id}-${row.sport}`} row={row} />
            ))}
          </tbody>
        </table>
      </div>
      {statement.caveats?.length ? (
        <ul className="rev-share-caveats">
          {statement.caveats.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {statement.sources?.length ? (
        <div className="rev-share-sources">
          {statement.sources.map((src) => (
            <div key={src.url} className="field-meta">
              {src.date ? <span>{formatSourceDate(src.date)} — </span> : null}
              <a className="ext" href={src.url} target="_blank" rel="noreferrer">
                {src.name} ↗
              </a>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function RevenueShareBySport({ schoolId }) {
  const book = useRevenueShareBook()
  const statements = statementsFor(book, schoolId)
  if (!statements) return null
  return (
    <section className="rev-share" id="revenue-share-by-sport">
      <h2 title={defTitle('revenueShareBySport')}>Revenue share by sport</h2>
      <p className="lede tight">
        Stated split or filed figure for the year named on each line. This is not money shown as spent in that year.
        It is not added to House spent, leftover, capacity, or rankings. The season picker does not change these lines.
      </p>
      {statements.map((statement) => (
        <Statement key={statement.id} statement={statement} />
      ))}
    </section>
  )
}
