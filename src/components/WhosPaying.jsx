import { useEffect, useState } from 'react'
import { moneyExact } from '../lib/format.js'
import { defTitle } from '../lib/definitions.js'
import { apparelShort, fullPicture, mediaShort, outsideShort, schoolWhosPaying } from '../lib/whosPaying.js'

const KIND_LABEL = {
  apparel: 'Shoe and apparel',
  multimedia: 'Multimedia rights',
  licensing: 'Licensing',
  partner: 'Official partners',
}

function SourceLink({ url }) {
  if (!url) return null
  return (
    <a className="ext" href={url} target="_blank" rel="noreferrer">
      source ↗
    </a>
  )
}

function Meta({ entry }) {
  return (
    <div className="whos-meta">
      {entry.asOf ? <span>as of {entry.asOf}</span> : null}
      {entry.asOf ? ' · ' : null}
      <SourceLink url={entry.url} />
      {(entry.cites || []).map((cite) => (
        <span key={cite.url}>
          {' · '}
          <SourceLink url={cite.url} />
        </span>
      ))}
    </div>
  )
}

function Row({ label, value, entry, note }) {
  return (
    <div className="whos-row">
      <div className="whos-main">
        <div>{label}</div>
        {entry?.detail ? <div className="whos-meta">{entry.detail}</div> : null}
        {note ? <div className="whos-meta">{note}</div> : null}
        <Meta entry={entry} />
      </div>
      {value ? <div className="whos-val">{value}</div> : null}
    </div>
  )
}

function ShortLine({ label, text }) {
  if (!text) return null
  return (
    <div className="whos-line">
      <div className="lab">{label}</div>
      <div>{text}</div>
    </div>
  )
}

export default function WhosPaying({ school, cap }) {
  const [book, setBook] = useState(null)

  useEffect(() => {
    let cancel = false
    fetch('/data/whos-paying.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancel) setBook(data)
      })
      .catch(() => {
        if (!cancel) setBook(null)
      })
    return () => {
      cancel = true
    }
  }, [])

  const entry = schoolWhosPaying(book, school?.id)
  if (!entry) return null

  const filing = entry.sponsorshipFiling
  const partners = entry.partners || []
  const naming = entry.naming || []
  const outside = entry.outside || []
  const apparel = partners.find((row) => row.kind === 'apparel')
  const media = partners.find((row) => row.kind === 'multimedia')
  const picture = fullPicture(cap?.booked, outside.find((row) => row.combineWithCapacity))
  const insideExplainer = book?.meta?.insideExplainer
  const outsideExplainer = book?.meta?.outsideExplainer
  const filed =
    filing?.status === 'reported' && filing.value != null
      ? `${moneyExact(filing.value)}${filing.fiscalYear ? `, ${filing.fiscalYear}` : ''}`
      : null

  const kinds = ['apparel', 'multimedia', 'licensing', 'partner']

  return (
    <section className="whos-paying">
      <h2 title={defTitle('whosPaying')}>Who's paying</h2>
      <p className="lede tight">This company money is already inside capacity and is not added again.</p>

      <ShortLine label="Apparel" text={apparelShort(apparel)} />
      <ShortLine label="Media rights" text={mediaShort(media)} />
      <ShortLine label="Sponsorships and licensing" text={filed} />
      <ShortLine label="Outside NIL" text={outsideShort(outside)} />

      {picture && (
        <div className="whos-full">
          <div className="eyebrow">Full picture</div>
          <div className="whos-val">
            {moneyExact(picture.sum)} = {moneyExact(picture.booked)} booked capacity + {moneyExact(picture.outside)}
          </div>
          <p className="whos-meta">
            {picture.outsideLabel}. {picture.yearNote} Not the capacity rank.
          </p>
        </div>
      )}

      <details>
        <summary>Deals, names, and sources</summary>
        <p className="lede tight">{insideExplainer}</p>

        {filing && (
          <div className="whos-block">
            <div className="eyebrow">Sponsorships and licensing on the filing</div>
            <Row
              label={filing.label}
              value={filed ? moneyExact(filing.value) : null}
              entry={filing}
              note={[filing.fiscalYear, filing.notes].filter(Boolean).join(' · ')}
            />
          </div>
        )}

        {kinds.map((kind) => {
          const rows = partners.filter((row) => row.kind === kind)
          if (!rows.length) return null
          return (
            <div className="whos-block" key={kind}>
              <div className="eyebrow">{KIND_LABEL[kind]}</div>
              {rows.map((row) => (
                <Row
                  key={`${row.company}-${row.term}`}
                  label={[row.company, row.term].filter(Boolean).join(' · ')}
                  value={row.valueLabel}
                  entry={row}
                  note={row.notes}
                />
              ))}
            </div>
          )
        })}

        {naming.length > 0 && (
          <div className="whos-block">
            <div className="eyebrow">Stadium and arena</div>
            {naming.map((row) => (
              <Row
                key={row.facility}
                label={[row.facility, row.company, row.term].filter(Boolean).join(' · ')}
                value={row.valueLabel}
                entry={row}
                note={row.notes}
              />
            ))}
          </div>
        )}

        {outside.length > 0 && (
          <div className="whos-block">
            <div className="eyebrow">Outside the school's books</div>
            <p className="lede tight">{outsideExplainer}</p>
            {outside.map((row) => (
              <div key={row.organization}>
                <Row
                  label={[row.organization, row.line].filter(Boolean).join(' · ')}
                  value={row.valueLabel}
                  entry={row}
                  note={row.notes}
                />
                {(row.prior || []).map((prior) => (
                  <Row
                    key={prior.url}
                    label={prior.line}
                    value={prior.valueLabel}
                    entry={prior}
                    note="Earlier filing. Not added to the latest figure."
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </details>
    </section>
  )
}
