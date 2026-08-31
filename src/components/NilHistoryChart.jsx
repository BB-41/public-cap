import { money, moneyExact, moneyRange } from '../lib/format.js'
import ShareBar from './ShareBar.jsx'
import DrillNote, { DrillClose } from './DrillNote.jsx'
import {
  HISTORY_METHOD,
  HISTORY_NOTES,
} from '../lib/nilHistory.js'
import AllocationFootnote from './AllocationFootnote.jsx'
import {
  canonicalUrl,
  downloadNilHistoryPng,
  schoolPath,
  seasonTag,
} from '../lib/share.js'

function viaLabel(via) {
  if (via === 'named') return 'named roster'
  if (via === 'named-empty') return 'named roster — no one at this position'
  if (via === 'rate-card') return 'rate card (no named roster file)'
  if (via === 'names-only') return 'name only — no modeled share'
  return 'empty'
}

function YearBandChart({ points }) {
  const W = 640
  const H = 196
  const pad = { l: 54, r: 12, t: 12, b: 28 }
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b
  const max = Math.max(1, ...points.map((p) => Math.max(p.high || 0, p.booked || 0, p.mid || 0)))
  const n = points.length
  const xAt = (i) => pad.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const yAt = (v) => pad.t + innerH * (1 - (Number(v) || 0) / max)
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t))
  const modeled = points
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.mid != null)

  let band = ''
  let mid = ''
  if (modeled.length) {
    band = modeled.map(({ p, i }, k) => `${k === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(p.high).toFixed(1)}`).join(' ')
    band +=
      ' ' +
      [...modeled]
        .reverse()
        .map(({ p, i }) => `L ${xAt(i).toFixed(1)} ${yAt(p.low).toFixed(1)}`)
        .join(' ')
    band += ' Z'
    mid = modeled.map(({ p, i }, k) => `${k === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(p.mid).toFixed(1)}`).join(' ')
  }

  return (
    <svg className="nil-year-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="NIL by year, modeled roster-share allocation">
      {ticks.map((t) => (
        <g key={t}>
          <line className="nil-year-grid" x1={pad.l} x2={W - pad.r} y1={yAt(t)} y2={yAt(t)} />
          <text className="nil-year-ylab" x={pad.l - 8} y={yAt(t) + 4} textAnchor="end">
            {money(t)}
          </text>
        </g>
      ))}
      {band ? <path className="nil-year-band" d={band} /> : null}
      {mid ? <path className="nil-year-mid" d={mid} fill="none" /> : null}
      {points.map((p, i) => (
        <g key={p.year}>
          <text className="nil-year-xlab" x={xAt(i)} y={H - 6} textAnchor="middle">
            {p.year}
          </text>
          {p.booked != null ? <circle className="nil-year-booked" cx={xAt(i)} cy={yAt(p.booked)} r="4.5" /> : null}
          {p.booked == null && p.potSource === 'booked-school' && p.mid != null ? (
            <circle className="nil-year-pot" cx={xAt(i)} cy={yAt(p.mid)} r="3.5" />
          ) : null}
        </g>
      ))}
    </svg>
  )
}

export default function NilHistoryChart({
  school,
  season,
  includeAlumni,
  hash,
  label,
  kind = 'position',
  points,
  shareLabel,
  onClose,
}) {
  const url = canonicalUrl(schoolPath(school.id, season, hash || '', includeAlumni))
  const title = `${label} · ${school.name}${season ? ` · ${season}` : ''} — Public Cap`
  const caption =
    kind === 'player'
      ? `${school.name} ${label} — modeled NIL by year — Public Cap`
      : `${school.name} ${label} — position NIL, modeled allocation — Public Cap`
  const hasBookedPlayer = points.some((p) => p.booked != null)
  const bookedPotYears = points.filter((p) => p.potSource === 'booked-school')
  const latest = [...points].reverse().find((p) => p.mid != null) || points[points.length - 1]

  function png() {
    downloadNilHistoryPng({
      school,
      season,
      title: `${school.name} · ${label}`,
      subtitle: kind === 'player' ? 'Player modeled NIL' : 'Position NIL · modeled roster-share',
      points,
      openLabel: `${label} · ${seasonTag(season, school.capacity?.fiscalYearPrimary)}`,
    })
  }

  return (
    <div className="nil-hist">
      <div className="nil-hist-hed">
        <div className="eyebrow">{kind === 'player' ? 'Player NIL history' : 'Position NIL history'}</div>
        <div className="nil-hist-title">{label}</div>
      </div>
      <p className="lede tight">{HISTORY_NOTES}</p>
      <ShareBar url={url} title={title} caption={caption} onPng={png} />
      <div className="nil-year-legend" aria-hidden="true">
        <span>
          <i className="nil-swatch modeled" /> Modeled allocation
        </span>
        <span>
          <i className="nil-swatch booked" /> Booked school pot
          {bookedPotYears.length || hasBookedPlayer ? '' : ' — none on this span'}
        </span>
      </div>
      <YearBandChart points={points} />
      <AllocationFootnote
        points={points}
        shareLabel={shareLabel || (kind === 'player' ? label : label?.split('·')[0]?.trim())}
        kind={kind}
      />
      <DrillNote
        field={{
          value: latest?.mid,
          confidence: 'modeled',
          notes: HISTORY_METHOD,
        }}
        exact={latest?.mid != null ? `latest modeled mid ${moneyExact(latest.mid)}` : null}
        range={latest?.low != null ? moneyRange(latest.low, latest.high) : null}
        empty="No modeled position band on the desk for this span."
      />
      <ul className="drill-slices nil-year-list">
        {points.map((p) => (
          <li key={p.year}>
            <strong>{p.year}</strong>
            {': '}
            {p.mid == null ? (
              <span>no modeled band</span>
            ) : (
              <span className="modeled-cell">
                modeled {p.low === p.high ? moneyExact(p.mid) : `${moneyRange(p.low, p.high)} · mid ${moneyExact(p.mid)}`}
              </span>
            )}
            {' · '}
            {p.booked != null ? (
              <span>
                booked player {moneyExact(p.booked)}
                {p.bookedField?.confidence ? (
                  <>
                    {' '}
                    <span className="conf-label">{p.bookedField.confidence}</span>
                  </>
                ) : null}
              </span>
            ) : p.potSource === 'booked-school' && p.bookedSchool != null ? (
              <span>
                pot is booked school {moneyExact(p.bookedSchool)}
                {p.bookedField?.confidence ? (
                  <>
                    {' '}
                    <span className="conf-label">{p.bookedField.confidence}</span>
                  </>
                ) : null}
              </span>
            ) : (
              <span className="muted">pot is school modeled band</span>
            )}
            <span className="fine-inline"> · {viaLabel(p.via)}</span>
            {kind === 'position' && p.names?.length ? (
              <div className="fine-inline">
                {p.names.length} named: {p.names.slice(0, 8).join(', ')}
                {p.names.length > 8 ? ` +${p.names.length - 8}` : ''}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {kind === 'player' ? (
        <p className="fine">
          Each year is that player’s allocated modeled share of the school pot from the desk
          rate card (starter vs backup vs developmental), not a contract, not On3 / Opendorse /
          NIL Go. A cited news-URL booked player cell is kept and not overwritten.
        </p>
      ) : bookedPotYears.length ? (
        <p className="fine">
          Years whose pot is a booked school cell still plot a modeled position split — roster-share,
          not a reported player contract.
        </p>
      ) : (
        <p className="fine">No school booked NIL cell on this span — pot is the on-desk modeled band.</p>
      )}
      <DrillClose onClose={onClose} />
    </div>
  )
}
