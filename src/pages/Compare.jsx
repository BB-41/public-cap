import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { money, moneyExact, moneyRange, pct, winsPerM } from '../lib/format.js'
import { val } from '../lib/compute.js'
import {
  compareDiffTone,
  formatCompareDiff,
  formatReportedNilDiff,
  metricUnit,
  reportedNilDiffTone,
  schoolCompareName,
} from '../lib/compareDiff.js'
import {
  footballRosterStack,
  reportedNilBarForCompare,
  reportedNilCompareDisplay,
  stackFormula,
} from '../lib/rosterStack.js'
import { rosterEstimateCites } from '../lib/rosterEstimate.js'
import Logo from '../components/Logo.jsx'
import { defTitle } from '../lib/definitions.js'
import SeasonPicker from '../components/SeasonPicker.jsx'
import AlumniToggle from '../components/AlumniToggle.jsx'
import ShareBar from '../components/ShareBar.jsx'
import DrillNote, { DrillClose } from '../components/DrillNote.jsx'
import {
  COMPARE_TO_SCHOOL_HASH,
  COMPARE_VIEWS,
  canonicalUrl,
  compareCaption,
  comparePath,
  compareSearch,
  compareTitle,
  downloadComparePng,
  hashKey,
  schoolPath,
} from '../lib/share.js'

function onActivate(fn) {
  return (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  }
}

function metricDisplay(m, school, house) {
  if (m.show) return m.show(school)
  const v = m.get(school)
  if (v == null) return m.key === 'house' && house == null ? 'no House cap' : 'pending'
  return money(v)
}

function CapSlices({ school, includeAlumni }) {
  return (
    <ul className="drill-slices">
      {school._cap.components.map((c) => (
        <li key={c.key} className={c.key === 'extra' && !includeAlumni ? 'excluded' : undefined}>
          {c.label}: {c.value ? moneyExact(c.value) : 'pending'}{' '}
          <span className="conf-label">{c.field?.confidence || 'modeled'}</span>
          {c.key === 'extra' && !includeAlumni ? ' · excluded from total' : ''}
          {c.field?.fiscalYear ? ` · ${c.field.fiscalYear}` : ''}
          {c.field?.url ? (
            <>
              {' '}
              ·{' '}
              <a className="ext" href={c.field.url} target="_blank" rel="noreferrer">
                source ↗
              </a>
            </>
          ) : c.field?.confidence === 'modeled' ? (
            ' · modeled, no filing'
          ) : !c.field?.source ? (
            ' · no source on the desk'
          ) : (
            ` · ${c.field.source}`
          )}
        </li>
      ))}
    </ul>
  )
}

function WinsDrill({ school }) {
  const eff = school._eff
  const rec = eff?.recordSource
  if (!eff || eff.wins == null) {
    return (
      <p className="drill-notes">
        No football win total on the desk for this season. Wins / $ is last completed FBS season only.
      </p>
    )
  }
  return (
    <div className="drill-body">
      <div className="drill-val">
        {eff.wins}–{eff.losses} <i className={`dot ${rec?.confidence || 'reported'}`} />
      </div>
      <div className="drill-meta">
        {rec?.season ? <span>football {rec.season}</span> : null}
        {rec?.asOf ? <span>as of {rec.asOf}</span> : null}
        {rec?.confidence ? <span className="conf-label">{rec.confidence}</span> : null}
      </div>
      {rec?.notes ? <p className="drill-notes">{rec.notes}</p> : null}
      <ul className="drill-slices">
        <li>
          NIL denominator: {eff.pot?.value != null ? moneyExact(eff.pot.value) : 'pending'}{' '}
          <span className="conf-label">{eff.pot?.confidence}</span>
          {eff.pot?.label ? ` · ${eff.pot.label}` : ''}
        </li>
        <li>
          Capacity denominator: {eff.capacity != null ? moneyExact(eff.capacity) : 'pending'}
        </li>
        <li>
          Wins / $M NIL: {eff.winsPerNilPerM == null ? '—' : `${winsPerM(eff.winsPerNilPerM)} W/$M`}
        </li>
        <li>
          Wins / $M capacity: {eff.winsPerCapPerM == null ? '—' : `${winsPerM(eff.winsPerCapPerM)} W/$M`}
        </li>
      </ul>
      {rec?.url ? (
        <p className="drill-src">
          <a className="ext" href={rec.url} target="_blank" rel="noreferrer">
            {rec.source || 'source'} ↗
          </a>
        </p>
      ) : (
        <p className="drill-src muted">No record source link on the desk.</p>
      )}
    </div>
  )
}

function fieldFor(school, key, houseField, season) {
  if (key === 'media') return school.capacity?.mediaConference
  if (key === 'tix') return school.capacity?.tickets
  if (key === 'give') return school.capacity?.contributions
  if (key === 'extra') {
    return {
      value: school._cap.extraAlumni,
      confidence: 'modeled',
      notes: 'Midpoint of 0.5–2% wealth flow minus booked contributions.',
    }
  }
  if (key === 'nil') return school.nil?.booked
  if (key === 'house') return houseField
  if (key === 'fb') return school.coaches?.football?.pay
  if (key === 'buy') return school.coaches?.football?.buyout
  if (key === 'nilModeled' && school.nil?.modeled) {
    const m = school.nil.modeled
    return {
      value: m.mid,
      confidence: 'modeled',
      source: m.source,
      url: m.url,
      notes: m.notes,
    }
  }
  if (key === 'reportedNil') {
    const stack = season === 2026 ? footballRosterStack(school) : null
    if (!stack) return null
    const survey = stack.survey
    const modeled = stack.modeled
    return {
      confidence: 'modeled',
      source: survey?.cites?.[0]?.source || modeled?.source,
      url: survey?.cites?.[0]?.url || modeled?.url,
      notes: survey?.notes || modeled?.formula || stackFormula(stack),
    }
  }
  return null
}

function ReportedNilDrill({ school, season }) {
  const offYear = season != null && season !== 2026
  const bar = reportedNilBarForCompare(school, season)
  const stack = offYear ? null : footballRosterStack(school)
  if (!bar || !stack) {
    return (
      <p className="drill-notes">
        {offYear
          ? 'Reported NIL is a 2026 survey / modeled football-stack cell. Switch to 2026. Empty is not zero.'
          : 'No football stack on the desk for this school. Empty is not zero.'}
      </p>
    )
  }
  const survey = stack.survey
  const cites = rosterEstimateCites(survey)
  const laneLabel =
    stack.lane === 'survey'
      ? survey?.kind === 'range'
        ? 'Survey range (not a filing)'
        : 'Survey tier (not a filing)'
      : 'Modeled range (not a filing)'
  return (
    <div className="drill-body">
      <p className="drill-kicker">{laneLabel}</p>
      <div className="drill-val modeled-cell">{reportedNilCompareDisplay(bar)}</div>
      {survey?.qualifier ? <p className="drill-notes">{survey.qualifier}</p> : null}
      <p className="drill-notes">
        Industry football roster stack — rev-share plus third-party NIL. Not booked NIL, not House spent, not leftover, and not a capacity waterfall step.
        {stack.lane === 'survey' && stack.kind === 'tier'
          ? ' The published words stay the survey tier. The allocation envelope is ranking-only — not a midpoint.'
          : ''}
      </p>
      <p className="fine">
        <strong>Formula.</strong> {stackFormula(stack)}
      </p>
      {cites.length ? (
        <p className="drill-src">
          {cites.map((c, i) => (
            <span key={c.url || i}>
              {i > 0 ? ' · ' : 'Sources: '}
              {c.url ? (
                <a className="ext" href={c.url} target="_blank" rel="noreferrer">
                  {c.source} ↗
                </a>
              ) : (
                c.source
              )}
            </span>
          ))}
        </p>
      ) : stack.modeled?.url ? (
        <p className="drill-src">
          <a className="ext" href={stack.modeled.url} target="_blank" rel="noreferrer">
            {stack.modeled.source} ↗
          </a>
        </p>
      ) : (
        <p className="drill-src muted">No source link on the desk for this slice.</p>
      )}
    </div>
  )
}

function SchoolDrill({ school, metric, house, houseField, season, view, includeAlumni }) {
  const hash = COMPARE_TO_SCHOOL_HASH[view] || ''
  const href = schoolPath(school.id, season, hash, includeAlumni)
  const field = fieldFor(school, metric.key, houseField, season)
  const shown = includeAlumni ? school._cap.total : school._cap.booked
  return (
    <div className="compare-drill-school">
      <Link className="drill-school" to={href}>
        {school.name}
      </Link>
      {metric.key === 'capacity' ? (
        <>
          <DrillNote
            field={{
              value: shown,
              confidence: school._conf?.primary,
              fiscalYear: school.capacity?.fiscalYearPrimary,
              notes: includeAlumni ? undefined : 'Booked-only filing stack. Modeled extra alumni is shown in the extra row and excluded from this total.',
            }}
            exact={moneyExact(shown)}
          />
          <CapSlices school={school} includeAlumni={includeAlumni} />
        </>
      ) : metric.key === 'nil' ? (
        <>
          <p className="drill-kicker">Booked</p>
          <DrillNote field={school.nil?.booked} exact={school._ratios.nil == null ? null : moneyExact(school._ratios.nil)} empty={school.nil?.booked?.notes || 'No booked FOIA / MFRS / counsel figure. Collective 990 is a separate lane.'} />
          <p className="drill-kicker">Modeled range</p>
          {school.nil?.modeled ? (
            <DrillNote
              field={{ value: school.nil.modeled.mid, confidence: 'modeled', source: school.nil.modeled.source, url: school.nil.modeled.url, notes: school.nil.modeled.notes }}
              exact={`mid ${moneyExact(school.nil.modeled.mid)}`}
              range={moneyRange(school.nil.modeled.low, school.nil.modeled.high)}
            />
          ) : (
            <p className="drill-notes">No modeled NIL range on the desk for this season. 2021–24 should show a collective-era third-party-only model.</p>
          )}
        </>
      ) : metric.key === 'nilModeled' ? (
        school.nil?.modeled ? (
          <DrillNote
            field={field}
            exact={`mid ${moneyExact(school.nil.modeled.mid)}`}
            range={moneyRange(school.nil.modeled.low, school.nil.modeled.high)}
          />
        ) : (
          <p className="drill-notes">No modeled NIL range on the desk. 2021–24 is a collective-era third-party-only model, not a hidden cell.</p>
        )
      ) : metric.key === 'reportedNil' ? (
        <ReportedNilDrill school={school} season={season} />
      ) : metric.key === 'winsPerNil' || metric.key === 'winsPerCap' ? (
        <WinsDrill school={school} />
      ) : metric.key === 'extra' ? (
        <DrillNote
          field={field}
          exact={school._cap.extraAlumni ? moneyExact(school._cap.extraAlumni) : null}
          range={school._cap.extraLow != null ? moneyRange(school._cap.extraLow, school._cap.extraHigh) : null}
        />
      ) : (
        <DrillNote
          field={field}
          exact={metric.key === 'house' ? (house == null ? null : moneyExact(house)) : field?.value != null ? moneyExact(field.value) : null}
          empty={field?.notes || 'Pending — no cited dollar on the desk.'}
        />
      )}
    </div>
  )
}

export default function Compare({ schools, meta, house, houseField, season, setSeason, includeAlumni, setIncludeAlumni }) {
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const didScroll = useRef(false)

  const a = params.get('a') || schools[0]?.id || ''
  const b = params.get('b') || schools[1]?.id || ''
  const viewQ = params.get('view') || ''
  const viewH = hashKey(location.hash)
  const view = COMPARE_VIEWS.has(viewQ) ? viewQ : COMPARE_VIEWS.has(viewH) ? viewH : ''

  const A = schools.find((s) => s.id === a)
  const B = schools.find((s) => s.id === b)

  function write({ nextA = a, nextB = b, nextView = view }) {
    navigate(
      {
        pathname: '/compare',
        search: compareSearch({ a: nextA, b: nextB, season, view: nextView, includeAlumni }),
        hash: nextView && COMPARE_VIEWS.has(nextView) ? `#${nextView}` : '',
      },
      { replace: true }
    )
  }

  useEffect(() => {
    const needA = !params.get('a') && schools[0]
    const needB = !params.get('b') && schools[1]
    const hashView = hashKey(location.hash)
    const needView = !params.get('view') && COMPARE_VIEWS.has(hashView)
    if (needA || needB || needView) {
      write({
        nextA: params.get('a') || schools[0]?.id || '',
        nextB: params.get('b') || schools[1]?.id || '',
        nextView: params.get('view') || (needView ? hashView : view),
      })
    }
    // first sync only when the URL is incomplete
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, schools, location.hash])

  useEffect(() => {
    if (didScroll.current || !view) return
    const el = document.getElementById(`compare-${view}`)
    if (el) {
      didScroll.current = true
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [view])

  const metrics = [
    { key: 'capacity', label: includeAlumni ? 'Annual capacity' : 'Annual capacity (booked only)', def: 'capacity', get: (s) => includeAlumni ? s._cap.total : s._cap.booked },
    { key: 'house', label: house == null ? 'House cap' : (season >= 2026 ? 'House cap 2026-27' : 'House cap 2025-26'), def: 'house', get: () => house },
    { key: 'nil', label: 'NIL booked', def: 'nil', get: (s) => s._ratios.nil },
    { key: 'nilModeled', label: 'NIL modeled (mid)', def: 'nilModeled', get: (s) => s.nil.modeled?.mid ?? null, show: (s) => s.nil.modeled ? moneyRange(s.nil.modeled.low, s.nil.modeled.high) : '—' },
    {
      key: 'reportedNil',
      label: 'Reported NIL',
      def: 'nilReportedBar',
      get: (s) => reportedNilBarForCompare(s, season)?.high ?? null,
      show: (s) => reportedNilCompareDisplay(reportedNilBarForCompare(s, season)),
    },
    { key: 'media', label: 'Media / conference', get: (s) => s._cap.media },
    { key: 'tix', label: 'Tickets', get: (s) => s._cap.tickets },
    { key: 'give', label: 'Booked contributions', get: (s) => s._cap.contributions },
    { key: 'extra', label: 'Extra alumni giving (modeled)', get: (s) => s._cap.extraAlumni },
    { key: 'fb', label: 'FB coach pay', def: 'coachPay', get: (s) => val(s.coaches.football.pay) || null },
    { key: 'buy', label: 'FB buyout overhang', def: 'buyout', get: (s) => val(s.coaches.football.buyout) || null },
    { key: 'winsPerNil', label: 'FB wins / $M NIL', def: 'winsPerDollar', unit: 'wins', get: (s) => s._eff?.winsPerNilPerM ?? null, show: (s) => s._eff?.winsPerNilPerM == null ? '—' : winsPerM(s._eff.winsPerNilPerM) + ' W/$M' },
    { key: 'winsPerCap', label: 'FB wins / $M capacity', def: 'winsPerDollar', unit: 'wins', get: (s) => s._eff?.winsPerCapPerM ?? null, show: (s) => s._eff?.winsPerCapPerM == null ? '—' : winsPerM(s._eff.winsPerCapPerM) + ' W/$M' },
  ]
  const max = Math.max(
    ...metrics.flatMap((m) => [A, B].filter(Boolean).map((s) => m.get(s) || 0)),
    1
  )

  const shareUrl = A && B ? canonicalUrl(comparePath({ a: A.id, b: B.id, season, view, includeAlumni })) : ''
  const title = A && B ? compareTitle(A.name, B.name, season) : 'Compare — Public Cap'
  const caption = A && B ? compareCaption(A.name, B.name) : 'Compare — Public Cap'

  function png() {
    if (!A || !B) return
    const rows = metrics.map((m) => {
      const va = m.get(A)
      const vb = m.get(B)
      const barA = m.key === 'reportedNil' ? reportedNilBarForCompare(A, season) : null
      const barB = m.key === 'reportedNil' ? reportedNilBarForCompare(B, season) : null
      return {
        label: m.label,
        va: va || 0,
        vb: vb || 0,
        da: metricDisplay(m, A, house),
        db: metricDisplay(m, B, house),
        dd: m.key === 'reportedNil'
          ? formatReportedNilDiff({
              barA,
              barB,
              nameA: schoolCompareName(A),
              nameB: schoolCompareName(B),
            })
          : formatCompareDiff({
              va,
              vb,
              unit: metricUnit(m.key, m.unit),
              nameA: schoolCompareName(A),
              nameB: schoolCompareName(B),
            }),
      }
    })
    downloadComparePng({
      A,
      B,
      season,
      house,
      metrics: rows,
      values: rows.flatMap((r) => [r.va, r.vb]),
      openLabel: view ? `Open: ${metrics.find((m) => m.key === view)?.label || view}` : '',
    })
  }

  function toggle(key) {
    write({ nextView: view === key ? '' : key })
  }

  return (
    <div className="page-wrap">
      <h1 className="issue-hed">Compare two programs.</h1>
      <p className="lede">Capacity vs House vs booked NIL vs modeled NIL vs reported NIL vs coach spend. Reported NIL is the industry football roster stack — named survey words or a labeled conference band, not booked NIL. Same FY tags as the school pages. Football seasons 2021-2026; reported NIL is 2026 only. Difference is school A minus school B — who is higher, and by how much. A survey tier is not a midpoint. Pending stays pending. Click a row for both schools’ figures and the source.</p>
      <div className="pickers">
        <SeasonPicker season={season} onChange={setSeason} id="compare-season" />
        <AlumniToggle on={includeAlumni} onChange={setIncludeAlumni} id="compare-alumni" />
        <label>
          School A
          <div className="picker-row">
            {A && <Logo school={A} size={36} />}
            <select value={a} onChange={(e) => write({ nextA: e.target.value })}>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </label>
        <label>
          School B
          <div className="picker-row">
            {B && <Logo school={B} size={36} />}
            <select value={b} onChange={(e) => write({ nextB: e.target.value })}>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </label>
      </div>
      {A && B && (
        <>
          <div className="compare-hed">
            <div className="compare-lab"><span className="vs">vs</span></div>
            <Link className="compare-name" to={schoolPath(A.id, season, '', includeAlumni)}><Logo school={A} size={40} />{A.name}</Link>
            <Link className="compare-name b" to={schoolPath(B.id, season, '', includeAlumni)}><Logo school={B} size={40} />{B.name}</Link>
            <div className="compare-diff-lab" title="School A minus school B">Difference</div>
          </div>
          <ShareBar url={shareUrl} title={title} caption={caption} onPng={png} />
          <div className="compare-grid">
            {metrics.map((m) => {
              const va = m.get(A)
              const vb = m.get(B)
              const unit = metricUnit(m.key, m.unit)
              const barA = m.key === 'reportedNil' ? reportedNilBarForCompare(A, season) : null
              const barB = m.key === 'reportedNil' ? reportedNilBarForCompare(B, season) : null
              const diff = m.key === 'reportedNil'
                ? formatReportedNilDiff({
                    barA,
                    barB,
                    nameA: schoolCompareName(A),
                    nameB: schoolCompareName(B),
                  })
                : formatCompareDiff({
                    va,
                    vb,
                    unit,
                    nameA: schoolCompareName(A),
                    nameB: schoolCompareName(B),
                  })
              const tone = m.key === 'reportedNil' ? reportedNilDiffTone(barA, barB) : compareDiffTone(va, vb)
              const open = view === m.key
              return (
                <div key={m.key} className={`compare-block${open ? ' open' : ''}${m.key === 'extra' && !includeAlumni ? ' excluded' : ''}`} id={`compare-${m.key}`}>
                  <div
                    className={`compare-row${open ? ' open' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-expanded={open}
                    onClick={() => toggle(m.key)}
                    onKeyDown={onActivate(() => toggle(m.key))}
                  >
                    <div className="compare-lab" title={m.def ? defTitle(m.def) : undefined}>{m.label}{m.def ? <i className="info-mark" aria-hidden="true">i</i> : null}</div>
                    <div className="compare-side">
                      <div className="bar a" style={{ width: va ? `${(va / max) * 100}%` : '0' }} />
                      <span>{metricDisplay(m, A, house)}</span>
                    </div>
                    <div className="compare-side right">
                      <span>{metricDisplay(m, B, house)}</span>
                      <div className="bar b" style={{ width: vb ? `${(vb / max) * 100}%` : '0' }} />
                    </div>
                    <div className={`compare-diff ${tone}`}>{diff}</div>
                  </div>
                  {open ? (
                    <div className="compare-drill">
                      <SchoolDrill school={A} metric={m} house={house} houseField={houseField} season={season} view={m.key} includeAlumni={includeAlumni} />
                      <SchoolDrill school={B} metric={m} house={house} houseField={houseField} season={season} view={m.key} includeAlumni={includeAlumni} />
                      <DrillClose onClose={() => toggle(m.key)} />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
          <p className="fine">
            {A.name} NIL/capacity {pct(A._ratios.nilOverCapacity)} · NIL/House {pct(A._ratios.nilOverHouse)}
            {' · '}
            {B.name} NIL/capacity {pct(B._ratios.nilOverCapacity)} · NIL/House {pct(B._ratios.nilOverHouse)}
          </p>
        </>
      )}
    </div>
  )
}
