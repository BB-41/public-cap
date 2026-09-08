import { money } from '../lib/format.js'

function Mark({ mark, kind, label }) {
  if (!mark || mark.pct == null) return null
  return (
    <span
      className={`nil-reported-mark ${kind}`}
      style={{ left: `${mark.pct}%` }}
      title={`${label} ${money(mark.value)}`}
    >
      <span className="nil-reported-pip" />
    </span>
  )
}

export default function NilReportedBar({ bar }) {
  if (!bar) return null
  const maxM = Math.round(bar.max / 1_000_000)
  const ticks = [0, maxM / 2, maxM]
  const aria = [
    `Reported NIL range ${bar.rangeDisplay} on a shared $0 to $${maxM} million scale`,
    bar.lane === 'survey' ? `labeled survey ${bar.display}` : `labeled modeled ${bar.display}`,
    bar.booked ? `booked NIL mark ${money(bar.booked.value)}` : null,
    bar.spent && !bar.sameBookedSpent ? `House spent mark ${money(bar.spent.value)}` : null,
    bar.sameBookedSpent ? 'booked NIL and House spent share one mark' : null,
  ]
    .filter(Boolean)
    .join('. ')

  return (
    <div className="nil-reported">
      <div
        className="nil-reported-track"
        role="img"
        aria-label={aria}
      >
        <div
          className="nil-reported-band"
          style={{ left: `${bar.leftPct}%`, width: `${bar.widthPct}%` }}
        />
        {bar.sameBookedSpent ? (
          <Mark mark={bar.booked} kind="both" label="Booked NIL / House spent" />
        ) : (
          <>
            <Mark mark={bar.booked} kind="booked" label="Booked NIL" />
            <Mark mark={bar.spent} kind="spent" label="House spent" />
          </>
        )}
      </div>
      {(bar.booked || bar.spent) && (
        <div className="nil-reported-cite-track" aria-hidden="true">
          {bar.sameBookedSpent ? (
            <Mark mark={bar.booked} kind="both thin" label="Booked NIL / House spent" />
          ) : (
            <>
              <Mark mark={bar.booked} kind="booked thin" label="Booked NIL" />
              <Mark mark={bar.spent} kind="spent thin" label="House spent" />
            </>
          )}
        </div>
      )}
      <div className="nil-reported-ticks">
        {ticks.map((t) => (
          <span key={t}>${t}M</span>
        ))}
      </div>
      <ul className="nil-reported-legend">
        <li>
          <i className="nil-reported-swatch band" />
          Gold band = industry / survey or modeled football-stack range (rev-share + third-party NIL). Not booked NIL. Not House spent.
        </li>
        {bar.sameBookedSpent && bar.booked ? (
          <li>
            <i className="nil-reported-swatch both" />
            Booked NIL / House spent cite {money(bar.booked.value)} — one mark, not mixed into the band.
          </li>
        ) : (
          <>
            {bar.booked ? (
              <li>
                <i className="nil-reported-swatch booked" />
                Booked NIL {money(bar.booked.value)} — separate mark.
              </li>
            ) : null}
            {bar.spent ? (
              <li>
                <i className="nil-reported-swatch spent" />
                House spent {money(bar.spent.value)} — separate mark.
              </li>
            ) : null}
          </>
        )}
      </ul>
    </div>
  )
}
