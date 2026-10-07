import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HOT_SEAT_DESCRIPTION,
  HOT_SEAT_PATH,
  HOT_SEAT_TITLE,
  buyoutPath,
  buyoutSourceLabel,
  citeTimingPhrase,
  hotSeatEntries,
} from '../lib/buyout.js'
import { moneyExact } from '../lib/format.js'
import { applyDocumentMeta } from '../lib/share.js'

function SourceLink({ source }) {
  if (!source?.url) return source?.label || null
  return (
    <a className="ext" href={source.url} target="_blank" rel="noreferrer">
      {source.label || 'source'} ↗
    </a>
  )
}

export default function HotSeat() {
  const [book, setBook] = useState(null)
  const [schools, setSchools] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    applyDocumentMeta({
      title: HOT_SEAT_TITLE,
      description: HOT_SEAT_DESCRIPTION,
      path: HOT_SEAT_PATH,
      jsonLd: 'webpage',
    })
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/data/buyouts.json').then((r) => {
        if (!r.ok) throw new Error(r.statusText)
        return r.json()
      }),
      fetch('/data/desk.json').then((r) => (r.ok ? r.json() : { schools: [] })),
    ])
      .then(([b, sk]) => {
        setBook(b)
        setSchools(sk)
      })
      .catch((e) => setErr(String(e)))
  }, [])

  if (err) return <div className="page-wrap"><p className="lede">Failed to load the hot-seat desk. {err}</p></div>
  if (!book || !schools) return <div className="page-wrap"><p className="lede">Setting type…</p></div>

  const rows = hotSeatEntries(book, schools.schools)

  return (
    <div className="page-wrap buyout-page hot-seat">
      <p className="crumb">
        <Link to="/">Rank list</Link>
        {' · '}
        <Link to="/buyout">Buyout</Link>
        {' · '}
        Hot seat
      </p>
      <h1 className="issue-hed">Hot-seat coach buyouts</h1>
      <p className="lede">{HOT_SEAT_DESCRIPTION}</p>
      <div className="table-scroll">
        <table className="rank hot-seat-table">
          <thead>
            <tr>
              <th>Coach</th>
              <th>School</th>
              <th>Buyout</th>
              <th>As of</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const pending = row.cite?.amount == null
              const sourceLabel = buyoutSourceLabel(row.cite)
              return (
                <tr key={row.id} data-school={row.id} data-buyout-staleness={row.staleness?.kind || undefined}>
                  <td>
                    <Link to={buyoutPath(row.id)}>{row.coachName || 'Coach'}</Link>
                  </td>
                  <td>
                    <Link to={`/school/${row.id}`}>{row.schoolName}</Link>
                  </td>
                  <td className="num">
                    {pending ? <span className="pending-cell">Pending</span> : (
                      <>
                        {row.cite.confidence === 'estimated' ? 'estimated ' : ''}
                        {moneyExact(row.cite.amount)}
                      </>
                    )}
                  </td>
                  <td>
                    {pending ? 'Pending' : citeTimingPhrase(row.cite)}
                    {row.staleness && (
                      <div className="buyout-staleness" data-buyout-staleness={row.staleness.kind}>
                        {row.staleness.label}
                      </div>
                    )}
                  </td>
                  <td>
                    {pending ? 'Pending' : row.cite?.source?.url ? <SourceLink source={{ ...row.cite.source, label: sourceLabel }} /> : sourceLabel}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="fine">
        Figures are the cited dollars already on each coach’s buyout page. A prior-contract badge means a newer deal exists and the updated buyout is pending. We do not invent a dollar.
      </p>
    </div>
  )
}
