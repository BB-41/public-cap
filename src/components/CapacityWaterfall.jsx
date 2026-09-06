import { money, moneyExact, moneyRange } from '../lib/format.js'
import { leftoverWaterfall } from '../lib/compute.js'
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

const OP_MARK = {
  start: '',
  vs: 'vs',
  minus: '−',
  cited: '',
  equals: '=',
}

function stepTitle(step) {
  if (step.key === 'capacity') return defTitle('capacity')
  if (step.key === 'houseCap' || step.key === 'houseSpent') return defTitle('house')
  if (step.key === 'nil') return defTitle('nil')
  if (step.key === 'leftover') return defTitle('houseRemaining')
  return undefined
}

function WaterfallRow({ step, open, onToggle, children }) {
  const expanded = open === step.hash
  const mark = OP_MARK[step.op] || ''
  return (
    <div
      className={`waterfall-item${expanded ? ' open' : ''}${step.hero ? ' waterfall-hero' : ''}${step.op === 'cited' ? ' waterfall-cited' : ''}`}
      id={`slice-${step.hash}`}
    >
      <div
        className={`waterfall-row${expanded ? ' open' : ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => onToggle(step.hash)}
        onKeyDown={onActivate(() => onToggle(step.hash))}
      >
        <div className="waterfall-op" aria-hidden={mark ? undefined : true}>
          {mark}
        </div>
        <div className="waterfall-lab" title={stepTitle(step)}>
          {step.label}
          {step.field?.confidence ? <i className={`dot ${step.field.confidence}`} /> : null}
        </div>
        <div className={`waterfall-val${step.hero ? ' display' : ''}`}>
          {step.value == null ? '—' : step.hero ? money(step.value) : moneyExact(step.value)}
        </div>
      </div>
      {step.lines?.length ? (
        <ul className="waterfall-lines">
          {step.lines.map((line) => {
            const lineHash = `stack-${line.key}`
            const lineOpen = open === lineHash
            return (
              <li key={line.key} id={`slice-${lineHash}`} className={lineOpen ? 'open' : undefined}>
                <button
                  type="button"
                  className="waterfall-line-btn"
                  aria-expanded={lineOpen}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggle(lineHash)
                  }}
                >
                  <span>{line.label}</span>
                  <span>
                    {moneyExact(line.value)} <i className={`dot ${line.field?.confidence || 'reported'}`} />
                  </span>
                </button>
                {lineOpen ? (
                  <div className="drill" onClick={(e) => e.stopPropagation()}>
                    <DrillNote
                      field={line.field}
                      exact={moneyExact(line.value)}
                      range={
                        line.key === 'extra' && line.rangeLow != null
                          ? moneyRange(line.rangeLow, line.rangeHigh)
                          : null
                      }
                      empty={line.field?.notes || 'Pending — no cited dollar on the desk.'}
                    />
                    <DrillClose onClose={() => onToggle(null)} />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
      {expanded ? <div className="drill">{children}</div> : null}
    </div>
  )
}

export default function CapacityWaterfall({
  school,
  cap,
  house,
  houseField,
  nil,
  season,
  open,
  onToggle,
  includeAlumni,
}) {
  const story = leftoverWaterfall(school, cap, includeAlumni)
  const houseLabel = house == null ? 'House cap' : season >= 2026 ? 'House cap 2026–27' : 'House cap 2025–26'
  const url = canonicalUrl(schoolPath(school.id, season, open || '', includeAlumni))
  const title = schoolTitle(school.name, season)
  const caption = schoolCaption(school.name)
  const fy = school.capacity?.fiscalYearPrimary
  const leftoverField = story.leftoverField

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
              : open === 'leftover'
                ? 'Leftover'
                : open === 'nil-modeled'
                  ? 'NIL modeled'
                  : open === 'capacity'
                    ? 'Athletic capacity'
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
      includeAlumni,
    })
  }

  return (
    <section className="waterfall-sec">
      <h2 title={defTitle('houseRemaining')}>Capacity vs House vs booked NIL</h2>
      <p className="lede tight">
        Booked filing stack, then House Year-1 spent, then booked NIL.
        Leftover is House remaining when a spent cell exists — not capacity minus those
        lines, and not a cap-plan leftover. Click a row for the source.
      </p>
      <ShareBar url={url} title={title} caption={caption} onPng={png} />
      <div className="waterfall">
        {story.steps.map((step) => (
          <WaterfallRow key={step.key} step={step} open={open} onToggle={onToggle}>
            <DrillNote
              field={step.key === 'houseCap' && !step.field?.source ? houseField : step.field}
              exact={step.value == null ? null : moneyExact(step.value)}
              range={
                step.key === 'capacity' && includeAlumni && cap.extraLow != null
                  ? moneyRange(cap.totalLow, cap.totalHigh)
                  : null
              }
              empty={step.field?.notes || 'Pending — no cited dollar on the desk.'}
            />
            {step.key === 'capacity' && step.lines?.length ? (
              <ul className="drill-slices">
                {step.lines.map((c) => (
                  <li key={c.key}>
                    {c.label}: {moneyExact(c.value)}{' '}
                    <span className="conf-label">{c.field?.confidence || 'modeled'}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {step.key === 'leftover' && leftoverField?.footnote ? (
              <p className="drill-notes">{leftoverField.footnote}</p>
            ) : null}
            <DrillClose onClose={() => onToggle(null)} />
          </WaterfallRow>
        ))}
      </div>
      {leftoverField?.footnote ? <p className="fine">{leftoverField.footnote}</p> : null}
      <p className="fine">
        Primary FY: {school.capacity.fiscalYearPrimary}. {school.capacity.fiscalYearNote || school.capacity.gapNote || ''}
        {story.leftover != null
          ? ' Leftover is the existing House remaining cell — not capacity minus House minus NIL.'
          : ' No booked House spent cell, so leftover stays empty.'}
      </p>
    </section>
  )
}
