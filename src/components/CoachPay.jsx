import { moneyExact } from '../lib/format.js'

/** Annual pay from a current-chair file (or USA TODAY fallback), plus any schedule/incentives. */
export function CoachPayField({ pay, fallback = '—' }) {
  if (!pay || pay.value == null) {
    return (
      <div className="field pending-box">
        <div className="field-val">Pending</div>
        <div className="field-meta">{pay?.notes || fallback}</div>
      </div>
    )
  }
  const yearBit = pay.yearLabel || (pay.year != null ? String(pay.year) : null)
  return (
    <div className="field">
      <div className="field-val">
        {moneyExact(pay.value)}
        {yearBit ? <span className="pay-year"> · {yearBit}</span> : null}
        {' '}
        <i className={`dot ${pay.confidence}`} />
      </div>
      <div className="field-meta">
        {pay.fiscalYear && <span>{pay.fiscalYear} · </span>}
        {pay.asOf && <span>as of {pay.asOf} · </span>}
        <span className="conf-label">{pay.confidence}</span>
        {pay.source && <span> · {pay.source}</span>}
        {pay.url && (
          <>
            {' '}
            <a className="ext" href={pay.url} target="_blank" rel="noreferrer">file ↗</a>
          </>
        )}
      </div>
      {pay.notes && <div className="field-notes">{pay.notes}</div>}
      {pay.baseOnly && (
        <div className="field-notes">Base only as published — the file does not state supplemental / NIL / other pay.</div>
      )}
      {pay.breakdown?.length > 0 && (
        <ul className="pay-breakdown">
          {pay.breakdown.map((row) => (
            <li key={row.label}>
              {row.label}
              {row.value != null ? <> — {moneyExact(row.value)}</> : null}
              {row.notes ? ` (${row.notes})` : ''}
            </li>
          ))}
        </ul>
      )}
      {pay.schedule?.length > 0 && <PaySchedule rows={pay.schedule} />}
    </div>
  )
}

export function PaySchedule({ rows }) {
  if (!rows?.length) return null
  const showAdditional = rows.some((r) => r.additional != null)
  return (
    <div className="pay-schedule">
      <div className="eyebrow">Compensation schedule</div>
      <table className="roster pay-table">
        <thead>
          <tr>
            <th>Period</th>
            {showAdditional && <th className="num">Additional</th>}
            <th className="num">Annual</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.period}>
              <td>
                {r.period}
                {r.notes ? <div className="term-compact">{r.notes}</div> : null}
              </td>
              {showAdditional && (
                <td className="num">{r.additional != null ? moneyExact(r.additional) : '—'}</td>
              )}
              <td className="num">{r.value != null ? moneyExact(r.value) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function IncentiveList({ items }) {
  if (!items?.length) return null
  return (
    <>
      <div className="eyebrow">Incentives (not in annual pay)</div>
      <ul className="pay-breakdown">
        {items.map((row) => (
          <li key={row.label}>
            {row.label}
            {row.value != null ? <> — {moneyExact(row.value)}</> : null}
            {row.notes ? ` — ${row.notes}` : ''}
          </li>
        ))}
      </ul>
    </>
  )
}

export function BuyoutRuleLine({ buyout, fallback }) {
  const rule = buyout?.rule || fallback
  if (!rule) return null
  return (
    <div className="field">
      <div className="field-notes buyout-rule">{rule}</div>
      {buyout?.coachSide && <div className="field-notes">{buyout.coachSide}</div>}
    </div>
  )
}
