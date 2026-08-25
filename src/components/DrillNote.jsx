import { moneyExact, moneyRange } from '../lib/format.js'

/** Honest source / confidence / FY block. Does not invent a dollar. */
export default function DrillNote({ field, exact, range, empty }) {
  const hasVal = field && field.value != null
  const show = exact != null ? exact : hasVal ? moneyExact(field.value) : null
  const conf = field?.confidence
  return (
    <div className="drill-body">
      <div className="drill-val">
        {show == null ? (empty || 'Pending — no cited dollar on the desk.') : show}
        {range ? <span className="drill-range"> {range}</span> : null}
        {conf ? <i className={`dot ${conf}`} /> : null}
      </div>
      <div className="drill-meta">
        {field?.fiscalYear ? <span>{field.fiscalYear}</span> : null}
        {field?.asOf ? <span>as of {field.asOf}</span> : null}
        {field?.window ? <span>{field.window}</span> : null}
        {conf ? <span className="conf-label">{conf}</span> : null}
      </div>
      {field?.notes ? <p className="drill-notes">{field.notes}</p> : null}
      {field?.url ? (
        <p className="drill-src">
          <a className="ext" href={field.url} target="_blank" rel="noreferrer">
            {field.source || 'source'} ↗
          </a>
        </p>
      ) : (
        <p className="drill-src muted">
          {conf === 'modeled'
            ? field?.source
              ? `${field.source} — modeled desk construct, not a filing URL.`
              : 'Modeled desk construct — no filing URL on this slice.'
            : field?.source
              ? field.source
              : 'No source link on the desk for this slice.'}
        </p>
      )}
    </div>
  )
}

export function DrillClose({ onClose }) {
  return (
    <button type="button" className="drill-close" onClick={onClose}>
      Close
    </button>
  )
}

export function moneyOrPending(n) {
  return n == null ? 'pending' : moneyExact(n)
}

export function rangeLine(low, high) {
  if (low == null || high == null) return null
  return moneyRange(low, high)
}
