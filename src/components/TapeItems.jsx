import { Link } from 'react-router-dom'
import { moneyExact } from '../lib/format.js'
import { KIND_LABELS, formatTapeDate } from '../lib/tape.js'
import { defTitle } from '../lib/definitions.js'

function Figure({ item }) {
  if (item.figure == null) return null
  return (
    <div className="tape-fig">
      {moneyExact(item.figure)}
      {item.figureNote ? <span className="tape-fig-note"> {item.figureNote}</span> : null}
    </div>
  )
}

export default function TapeItems({ items, season, showSchool = true }) {
  return (
    <ol className="tape-list">
      {items.map((it) => (
        <li key={it.id} className="tape-item">
          <div className="tape-meta">
            <time dateTime={it.date}>{formatTapeDate(it.date)}</time>
            <span className="tape-kind" title={defTitle('tape')}>{KIND_LABELS[it.kind] || it.kind}</span>
            <i className={`dot ${it.confidence}`} />
            <span className="conf-label">{it.confidence}</span>
          </div>
          {showSchool && (
            <div className="tape-school">
              {it.school ? (
                <Link to={season === 2026 || !season ? `/school/${it.school}` : `/school/${it.school}?season=${season}`}>
                  {it.schoolName}
                </Link>
              ) : (
                <span className="tape-desk">House settlement</span>
              )}
            </div>
          )}
          <p className="tape-hed">{it.headline}</p>
          <Figure item={it} />
          {it.source?.url && (
            <div className="tape-src">
              <a className="ext" href={it.source.url} target="_blank" rel="noreferrer">
                {it.source.label || 'source'} ↗
              </a>
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}
