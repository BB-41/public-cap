import { money, moneyExact, moneyRange } from '../lib/format.js'
import { defTitle } from '../lib/definitions.js'
import ShareBar from './ShareBar.jsx'
import DrillNote, { DrillClose } from './DrillNote.jsx'
import {
  canonicalUrl,
  downloadStackPng,
  schoolCaption,
  schoolPath,
  schoolTitle,
  seasonTag,
} from '../lib/share.js'

function onActivate(fn) {
  return (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  }
}

function Row({ hash, label, title, barClass, rowClass, width, valueText, open, onToggle, children }) {
  const expanded = open === hash
  return (
    <div className={`stack-item${expanded ? ' open' : ''}`} id={`slice-${hash}`}>
      <div
        className={`stack-row${rowClass ? ` ${rowClass}` : ''}${expanded ? ' open' : ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => onToggle(hash)}
        onKeyDown={onActivate(() => onToggle(hash))}
      >
        <div className="stack-lab" title={title}>
          {label}
        </div>
        <div className="stack-bar-wrap">
          <div className={`stack-bar ${barClass}`} style={{ width }} />
        </div>
        <div className="stack-val">{valueText}</div>
      </div>
      {expanded ? <div className="drill">{children}</div> : null}
    </div>
  )
}

export default function StackChart({
  school,
  cap,
  house,
  houseField,
  nil,
  season,
  open,
  onToggle,
}) {
  const maxBar = Math.max(cap.total, house || 0, nil || 0, school.nil.modeled?.high || 0, 1)
  const houseLabel = house == null ? 'House cap' : season >= 2026 ? 'House cap 2026–27' : 'House cap 2025–26'
  const url = canonicalUrl(schoolPath(school.id, season, open || ''))
  const title = schoolTitle(school.name, season)
  const caption = schoolCaption(school.name)
  const fy = school.capacity?.fiscalYearPrimary

  function widthOf(n) {
    if (!n) return '0'
    return `${Math.max(2, (n / maxBar) * 100)}%`
  }

  function png() {
    const openRow = open
      ? [...cap.components, { key: 'capacity', label: 'Annual capacity' }].find(
          (c) => `stack-${c.key}` === open || c.key === open || (open === 'capacity' && c.key === 'capacity')
        )
      : null
    const openLabel = open
      ? `Open: ${
          open === 'house'
            ? houseLabel
            : open === 'nil'
              ? 'NIL booked'
              : open === 'nil-modeled'
                ? 'NIL modeled'
                : open === 'capacity'
                  ? 'Annual capacity'
                  : openRow?.label || cap.components.find((c) => `stack-${c.key}` === open)?.label || open
        } · ${seasonTag(season, fy)}`
      : ''
    downloadStackPng({
      school,
      season,
      cap,
      house,
      nil,
      houseLabel,
      openLabel,
    })
  }

  return (
    <section className="stack-sec">
      <h2>Capacity stack</h2>
      <p className="lede tight">
        Annual, not lifetime. Extra alumni giving is modeled and net of booked contributions when both exist.
        Click a row for the exact dollar and the source.
      </p>
      <ShareBar url={url} title={title} caption={caption} onPng={png} />
      <div className="stack">
        {cap.components.map((c) => {
          const hash = `stack-${c.key}`
          return (
            <Row
              key={c.key}
              hash={hash}
              label={
                <>
                  {c.label}
                  <i className={`dot ${c.field?.confidence || 'modeled'}`} />
                </>
              }
              barClass={c.key}
              width={widthOf(c.value)}
              valueText={c.value ? money(c.value) : '—'}
              open={open}
              onToggle={onToggle}
            >
              <DrillNote
                field={c.field}
                exact={c.value ? moneyExact(c.value) : null}
                range={c.key === 'extra' && cap.extraLow != null ? moneyRange(cap.extraLow, cap.extraHigh) : null}
                empty={c.field?.notes || 'Pending — no cited dollar on the desk.'}
              />
              <DrillClose onClose={() => onToggle(null)} />
            </Row>
          )
        })}
        <Row
          hash="capacity"
          label={<span title={defTitle('capacity')}>Annual capacity</span>}
          barClass="total"
          rowClass="total"
          width={`${(cap.total / maxBar) * 100}%`}
          valueText={money(cap.total)}
          open={open}
          onToggle={onToggle}
        >
          <DrillNote
            field={{
              value: cap.total,
              confidence: school._conf?.primary || 'estimated',
              fiscalYear: fy,
              notes: school.capacity?.fiscalYearNote || school.capacity?.gapNote,
            }}
            exact={moneyExact(cap.total)}
          />
          <ul className="drill-slices">
            {cap.components.map((c) => (
              <li key={c.key}>
                {c.label}: {c.value ? moneyExact(c.value) : 'pending'}{' '}
                <span className="conf-label">{c.field?.confidence || 'modeled'}</span>
              </li>
            ))}
          </ul>
          <DrillClose onClose={() => onToggle(null)} />
        </Row>
        <Row
          hash="house"
          label={
            <span title={defTitle('house')}>{houseLabel}</span>
          }
          barClass="house"
          width={house ? `${(house / maxBar) * 100}%` : '0'}
          valueText={house == null ? 'no House cap (pre-settlement)' : money(house)}
          open={open}
          onToggle={onToggle}
        >
          <DrillNote
            field={houseField}
            exact={house == null ? null : moneyExact(house)}
            empty={houseField?.notes || 'No House cap (pre-settlement).'}
          />
          <DrillClose onClose={() => onToggle(null)} />
        </Row>
        <Row
          hash="nil"
          label={<span title={defTitle('nil')}>NIL booked</span>}
          barClass="nil"
          width={nil ? `${(nil / maxBar) * 100}%` : '0'}
          valueText={nil == null ? 'pending' : money(nil)}
          open={open}
          onToggle={onToggle}
        >
          <DrillNote
            field={school.nil?.booked}
            exact={nil == null ? null : moneyExact(nil)}
            empty={school.nil?.booked?.notes || 'Empty / pending. FOIA, MFRS, or collective 990 only.'}
          />
          <DrillClose onClose={() => onToggle(null)} />
        </Row>
        {school.nil.modeled ? (
          <Row
            hash="nil-modeled"
            label={
              <span title={defTitle('nilModeled')}>
                NIL modeled <i className="dot modeled" />
              </span>
            }
            barClass="nil-modeled"
            width={`${(school.nil.modeled.mid / maxBar) * 100}%`}
            valueText={<span className="modeled-cell">{moneyRange(school.nil.modeled.low, school.nil.modeled.high)}</span>}
            open={open}
            onToggle={onToggle}
          >
            <DrillNote
              field={{
                value: school.nil.modeled.mid,
                confidence: 'modeled',
                source: school.nil.modeled.source,
                url: school.nil.modeled.url,
                notes: school.nil.modeled.notes,
              }}
              exact={`mid ${moneyExact(school.nil.modeled.mid)}`}
              range={moneyRange(school.nil.modeled.low, school.nil.modeled.high)}
            />
            {school.nil.modeled.method ? <p className="drill-notes">{school.nil.modeled.method}</p> : null}
            <DrillClose onClose={() => onToggle(null)} />
          </Row>
        ) : (
          <Row
            hash="nil-modeled"
            label={<span title={defTitle('nilModeled')}>NIL modeled</span>}
            barClass="nil-modeled"
            width="0"
            valueText={<span className="pending-cell">hidden (pre-House)</span>}
            open={open}
            onToggle={onToggle}
          >
            <DrillNote
              field={{
                confidence: 'pending',
                notes:
                  'The current conference heuristic is only applied for 2025–26 and 2026–27. Pre-House seasons stay pending rather than a fake precise collective-era model.',
              }}
              empty="Hidden (pre-House) — no modeled NIL range on the desk for this season."
            />
            <DrillClose onClose={() => onToggle(null)} />
          </Row>
        )}
      </div>
      <p className="fine">
        Primary FY: {school.capacity.fiscalYearPrimary}. {school.capacity.fiscalYearNote || school.capacity.gapNote || ''}
      </p>
    </section>
  )
}
