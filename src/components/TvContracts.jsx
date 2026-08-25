import { Link } from 'react-router-dom'
import { money, moneyRange } from '../lib/format.js'
import { defTitle } from '../lib/definitions.js'
import {
  collectTvSources,
  conferenceList,
  conferenceOf,
  deskMedia,
  remainingSeasons,
  schoolCheck,
  schoolRecord,
  useTvBook,
} from '../lib/tv.js'

function ConfTag({ confidence }) {
  if (!confidence) return null
  return <span className={`conf-label ${confidence}`}>{confidence}</span>
}

function SourceLinks({ sources }) {
  if (!sources?.length) return null
  return (
    <div className="tv-sources">
      {sources.map((s) => (
        <a key={s.url} className="ext" href={s.url} target="_blank" rel="noreferrer">
          {s.label}{s.asOf ? ` · ${s.asOf}` : ''} ↗
        </a>
      ))}
    </div>
  )
}

function Dollar({ value, high, fallback = 'pending' }) {
  if (value == null) return <span className="pending-cell">{fallback}</span>
  if (high != null && high !== value) return <>{moneyRange(value, high)}</>
  return <>{money(value)}</>
}

function TermLine({ start, end, label, season }) {
  const left = remainingSeasons(end, season)
  const bits = []
  if (label) bits.push(label)
  else {
    if (start) bits.push(`From ${start}`)
    if (end) bits.push(`through ${end}`)
  }
  if (left != null && end) bits.push(`${left} season${left === 1 ? '' : 's'} left`)
  return bits.join(' · ') || 'Term pending'
}

export function ConferenceStrip({ book }) {
  const rows = conferenceList(book)
  if (!rows.length) return null
  return (
    <table className="roster methods-table tv-strip">
      <thead>
        <tr>
          <th>Conference</th>
          <th>Holders</th>
          <th>Term</th>
          <th className="num">Annual pot</th>
          <th>Split</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id}>
            <td>{c.name}</td>
            <td>{c.holders.join(', ')}{c.sublicense ? `; ${c.sublicense}` : ''}</td>
            <td>{c.termLabel || `${c.termStart}–${c.termEnd}`}</td>
            <td className="num">
              <Dollar value={c.annual} high={c.annualHigh} />{' '}
              <i className={`dot ${c.confidence}`} />
            </td>
            <td>{c.split}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function TvContracts({ school, season }) {
  const book = useTvBook()
  if (!book) {
    return (
      <section className="tv-sec">
        <h2 title={defTitle('tv')}>TV / media rights</h2>
        <p className="lede tight">Setting type…</p>
      </section>
    )
  }
  const conf = conferenceOf(school, book)
  const rec = schoolRecord(school, book)
  const checks = schoolCheck(school, book)
  const media = deskMedia(school)
  const sources = collectTvSources(conf, rec, book.national)
  const yr = season || book.season

  return (
    <section className="tv-sec">
      <h2 title={defTitle('tv')}>TV / media rights</h2>
      <p className="lede tight">
        {book.deskNote}{' '}
        <Link to="/tv">Conference book ↗</Link>
      </p>

      {conf ? (
        <>
          <div className="eyebrow">Conference deal · {conf.name}</div>
          <div className="tv-grid">
            <div className="tv-card">
              <div className="eyebrow">Rights holders</div>
              <div className="field-val">{conf.holders.join(', ')}</div>
              {conf.sublicense && <div className="field-meta">{conf.sublicense}</div>}
            </div>
            <div className="tv-card">
              <div className="eyebrow">Term</div>
              <div className="field-val">
                <TermLine start={conf.termStart} end={conf.termEnd} label={conf.termLabel} season={yr} />
              </div>
            </div>
            <div className="tv-card">
              <div className="eyebrow">Annual conference pot</div>
              <div className="field-val">
                <Dollar value={conf.annual} high={conf.annualHigh} />{' '}
                <i className={`dot ${conf.confidence}`} />
              </div>
              <div className="field-meta">
                <ConfTag confidence={conf.confidence} />
                {conf.total != null && <> · total {money(conf.total)}</>}
                {conf.annualLabel ? ` · ${conf.annualLabel}` : ''}
              </div>
            </div>
            <div className="tv-card">
              <div className="eyebrow">How the share is split</div>
              <div className="field-val">{conf.split}</div>
              <div className="field-notes">{conf.splitLabel}</div>
            </div>
          </div>
          {conf.notes && <p className="field-notes">{conf.notes}</p>}
        </>
      ) : (
        <div className="field pending-box">
          <div className="field-val">No conference deal on the desk.</div>
        </div>
      )}

      {rec.deals.map((d) => (
        <div key={d.name} className="tv-deal">
          <div className="eyebrow">School-level exception · {d.name}</div>
          <div className="tv-grid">
            <div className="tv-card">
              <div className="eyebrow">Holders</div>
              <div className="field-val">{(d.holders || []).join(', ')}</div>
            </div>
            <div className="tv-card">
              <div className="eyebrow">Term</div>
              <div className="field-val">
                <TermLine start={d.termStart} end={d.termEnd} label={d.termLabel} season={yr} />
              </div>
            </div>
            <div className="tv-card">
              <div className="eyebrow">Annual</div>
              <div className="field-val">
                <Dollar value={d.annual} high={d.annualHigh} />{' '}
                <i className={`dot ${d.confidence}`} />
              </div>
              <div className="field-meta"><ConfTag confidence={d.confidence} /></div>
            </div>
          </div>
          {d.notes && <p className="field-notes">{d.notes}</p>}
          <SourceLinks sources={d.sources} />
        </div>
      ))}

      <div className="eyebrow">This school’s media check</div>
      {checks.map((c) => (
        <div key={c.name} className={c.value == null ? 'field pending-box' : 'field'}>
          <div className="field-val">
            {c.value == null ? 'Pending' : <Dollar value={c.value} high={c.valueHigh} />}{' '}
            <i className={`dot ${c.confidence}`} />
          </div>
          <div className="field-meta">
            {c.name}
            {c.formula ? ` · ${c.formula}` : ''}
            {' · '}
            <ConfTag confidence={c.confidence} />
          </div>
          {c.notes && <div className="field-notes">{c.notes}</div>}
        </div>
      ))}

      {media && (
        <p className="fine">
          Desk capacity media/conference line {money(media.value)}
          {media.fiscalYear ? ` · ${media.fiscalYear}` : ''}
          {' '}
          <span className={`conf-label ${media.confidence}`}>{media.confidence}</span>
          {media.source ? ` · ${media.source}` : ''}.
          That is the stack input — a 990 / MFRS conference flow — not a second TV contract.
          {media.url && (
            <>
              {' '}
              <a className="ext" href={media.url} target="_blank" rel="noreferrer">desk source ↗</a>
            </>
          )}
        </p>
      )}

      {book.national?.cfp && (
        <p className="fine tv-cfp">
          <span className="eyebrow">CFP / national package</span>{' '}
          {book.national.cfp.holders.join('/')} · {book.national.cfp.termLabel}.{' '}
          {book.national.cfp.annual != null && (
            <>
              {money(book.national.cfp.annual)} a year
              {book.national.cfp.total != null ? ` · ${money(book.national.cfp.total)} total` : ''}{' '}
              <span className={`conf-label ${book.national.cfp.confidence}`}>{book.national.cfp.confidence}</span>
              {' '}
            </>
          )}
          — one national deal, not copied onto this school.{' '}
          <a className="ext" href={book.national.cfp.sources[0].url} target="_blank" rel="noreferrer">
            {book.national.cfp.sources[0].label} ↗
          </a>
        </p>
      )}

      <SourceLinks sources={sources} />
    </section>
  )
}

export function TvPage() {
  const book = useTvBook()
  if (!book) {
    return (
      <div className="page-wrap">
        <p className="lede">Setting type…</p>
      </div>
    )
  }
  const nd = book.schools['notre-dame']
  return (
    <div className="page-wrap tv-page">
      <h1 className="issue-hed" title={defTitle('tv')}>TV / media rights</h1>
      <p className="lede">{book.deskNote}</p>
      <ConferenceStrip book={book} />
      {conferenceList(book).map((c) => (
        <section key={c.id}>
          <h2>{c.name}</h2>
          <p className="lede tight">
            {(c.holders || []).join(', ')}
            {c.sublicense ? ` · ${c.sublicense}` : ''}
            {' · '}
            {c.termLabel}
            {' · '}
            {c.members} members
          </p>
          <div className="tv-grid">
            <div className="tv-card">
              <div className="eyebrow">Annual pot</div>
              <div className="field-val">
                <Dollar value={c.annual} high={c.annualHigh} /> <i className={`dot ${c.confidence}`} />
              </div>
              <div className="field-meta">
                <ConfTag confidence={c.confidence} />
                {c.total != null && <> · total {money(c.total)}</>}
              </div>
            </div>
            <div className="tv-card">
              <div className="eyebrow">Split</div>
              <div className="field-val">{c.split}</div>
              <div className="field-notes">{c.splitLabel}</div>
            </div>
          </div>
          {c.notes && <p className="field-notes">{c.notes}</p>}
          <SourceLinks sources={c.sources} />
        </section>
      ))}

      {nd?.deals?.[0] && (
        <section>
          <h2>Independent · Notre Dame</h2>
          <p className="lede tight">
            The NBC football deal is a real school-level exception. ACC media for the rest of the
            sports is a conference distribution, not a second football contract.
          </p>
          {nd.deals.map((d) => (
            <div key={d.name}>
              <div className="eyebrow">{d.name}</div>
              <div className="field-val">
                {(d.holders || []).join(', ')} · {d.termLabel} · <Dollar value={d.annual} high={d.annualHigh} />{' '}
                <i className={`dot ${d.confidence}`} />
              </div>
              <p className="field-notes">{d.notes}</p>
              <SourceLinks sources={d.sources} />
            </div>
          ))}
          {nd.exceptions?.map((ex) => (
            <div key={ex.name}>
              <div className="eyebrow">{ex.name}</div>
              <div className="field-val">
                <Dollar value={ex.value} /> <i className={`dot ${ex.confidence}`} />
              </div>
              <p className="field-notes">{ex.notes}</p>
              <SourceLinks sources={ex.sources} />
            </div>
          ))}
        </section>
      )}

      {book.national?.cfp && (
        <section>
          <h2>College Football Playoff</h2>
          <p className="lede tight">{book.national.cfp.notes}</p>
          <div className="field-val">
            {book.national.cfp.holders.join(', ')} · {book.national.cfp.termLabel} ·{' '}
            <Dollar value={book.national.cfp.annual} />{' '}
            <i className={`dot ${book.national.cfp.confidence}`} />
          </div>
          <SourceLinks sources={book.national.cfp.sources} />
        </section>
      )}

      {book.notes?.length ? (
        <section>
          <h2>What we skipped</h2>
          <ul>
            {book.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
