import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import ShareBar from '../components/ShareBar.jsx'
import { defTitle } from '../lib/definitions.js'
import { money, moneyExact } from '../lib/format.js'
import { formatLongDate } from '../lib/buyout.js'
import { canonicalUrl, downloadCoachFaPng } from '../lib/share.js'
import {
  INDEX_FILTERS,
  JOB_TYPES,
  bandRange,
  coachCites,
  coachMatchesFilter,
  getCoach,
  hasDollar,
  jobTypeLabel,
  coachCompBand,
  listCoaches,
  offsetLabel,
  parseMoneyInput,
  parseScenarioParams,
  parseYearsInput,
  power4Schools,
  residualPayerLabel,
  resolveScenario,
  schoolById,
  shareCaption,
  sharePath,
  statusLabel,
  vsBand,
} from '../lib/coachFa.js'

function SourceLink({ source, className = 'ext' }) {
  if (!source?.url) return source?.label ? <span>{source.label}</span> : null
  return (
    <a className={className} href={source.url} target="_blank" rel="noreferrer">
      {source.label || 'source'} ↗
    </a>
  )
}

function Mark({ confidence }) {
  const c = confidence || 'pending'
  return (
    <>
      <i className={`dot ${c}`} />
      <span className="conf-label">{c}</span>
    </>
  )
}

function DollarCell({ figure, empty = 'pending' }) {
  if (!figure || !hasDollar(figure.value)) {
    return (
      <span className="pending-cell">
        {empty} <i className="dot pending" />
      </span>
    )
  }
  return (
    <>
      {moneyExact(figure.value)} <Mark confidence={figure.confidence} />
    </>
  )
}

function useCoachFaBook() {
  const [book, setBook] = useState(null)
  const [schools, setSchools] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/data/coach-fa.json').then((r) => {
        if (!r.ok) throw new Error(r.statusText)
        return r.json()
      }),
      fetch('/data/desk.json').then((r) => (r.ok ? r.json() : null)),
      fetch('/data/schools.json').then((r) => (r.ok ? r.json() : { schools: [] })),
    ])
      .then(([b, desk, sk]) => {
        setBook(b)
        setSchools(desk?.schools || sk?.schools || [])
      })
      .catch((e) => setErr(String(e)))
  }, [])

  return { book, schools, err }
}

function CoachFaIndex({ book, schools }) {
  const [filter, setFilter] = useState('all')
  const allRows = listCoaches(book)
  const rows = allRows.filter((c) => coachMatchesFilter(c, filter))
  return (
    <div className="page-wrap coach-fa-page">
      <p className="crumb">
        <Link to="/">Rank list</Link>
        {' · '}
        Offsets / free agents
      </p>
      <h1 className="issue-hed" title={defTitle('coachFa')}>
        After they fire him, what still moves.
      </h1>
      <p className="lede">
        Residual School A buyout after a firing, plus a labeled modeled School B
        salary if you type one. A-side dollars and offset rules stay booked or
        reported / cite-only — empty without a cite. We do not invent today’s
        remaining principal. Optional all-in is two payers, off by default.
        Employed elsewhere means a new job at B/C while School A still owes.
      </p>

      <div className="chips coach-fa-filters" role="group" aria-label="Filter chairs">
        {INDEX_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={filter === f.id ? 'chip on' : 'chip'}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="result-count">
        {rows.length} of {allRows.length} chair{allRows.length === 1 ? '' : 's'}
      </p>

      {allRows.length === 0 ? (
        <div className="field pending-box">
          <div className="field-val">No free-agent chairs on the desk</div>
          <div className="field-meta">
            Other chairs stay empty until a booked residual is cited. We do not invent a dollar.
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="field pending-box">
          <div className="field-val">No chairs on that chip</div>
          <div className="field-meta">
            The filter is empty — not a missing dollar. Switch chips or open All.
          </div>
        </div>
      ) : (
        <>
          <div className="table-scroll buyout-scroll">
            <table className="rank buyout-table">
              <thead>
                <tr>
                  <th>Coach</th>
                  <th>Prior school</th>
                  <th>Status</th>
                  <th className="num">A residual</th>
                  <th>Offset</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const prior = schoolById(schools, c.priorSchoolId)
                  const current = schoolById(schools, c.currentEmployerSchoolId)
                  const payer = residualPayerLabel(c, prior)
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/coach-fa/${c.id}`}>{c.name}</Link>
                      </td>
                      <td>
                        {prior ? (
                          <span className="buyout-names" style={{ margin: 0, gap: 8 }}>
                            <Logo school={prior} size={28} />
                            {prior.shortName || prior.name}
                          </span>
                        ) : (
                          c.priorSchoolId
                        )}
                      </td>
                      <td>
                        <div>{statusLabel(c.status)}</div>
                        {payer ? <div className="term-compact">{payer}</div> : null}
                        {current ? (
                          <div className="term-compact">Now: {current.shortName || current.name}</div>
                        ) : null}
                      </td>
                      <td className="num strong">
                        {hasDollar(c.buyout?.grossRemaining) ? (
                          <>
                            {money(c.buyout.grossRemaining)}
                            <div className="term-compact">{c.buyout.grossRemainingKind || c.buyout.confidence}</div>
                          </>
                        ) : (
                          <span className="pending-cell">pending</span>
                        )}
                      </td>
                      <td>
                        {offsetLabel(c.offset) === 'pending' ? (
                          <span className="pending-cell">pending</span>
                        ) : (
                          offsetLabel(c.offset)
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <section>
        <h2>Methods</h2>
        <p>
          School A residual and the offset / mitigation clause are booked or
          reported — a cited employment-agreement paragraph or a newsroom story
          that quotes one. Empty means pending, not zero. Gross remaining on a
          fired chair is the termination-date figure unless a later ledger is
          cited; we do not mint today’s unpaid principal from the original
          schedule. School B annual salary is a labeled modeled input. When
          offset is none, typing a modeled B salary does not reduce A.
          Employed-elsewhere chairs (Stoops-style) keep School A’s residual on
          the prior school and treat the new employer as a separate payer.
          Optional all-in adds A residual to B salary and footnotes two payers.
          Comp band is a USA TODAY Total Pay snapshot, labeled modeled /
          reported database — not a FOIA PDF.
        </p>
      </section>
    </div>
  )
}

function CoachFaDetail({ book, schools, coachId }) {
  const [params, setParams] = useSearchParams()
  const [payDraft, setPayDraft] = useState(() => params.get('pay') || '')
  const [yearsDraft, setYearsDraft] = useState(() => params.get('years') || '')

  const coach = getCoach(book, coachId)
  const prior = schoolById(schools, coach?.priorSchoolId)
  const current = schoolById(schools, coach?.currentEmployerSchoolId)
  const options = useMemo(() => power4Schools(schools), [schools])
  const scenarioIn = useMemo(() => parseScenarioParams(params, coach), [params, coach])
  const scenario = useMemo(() => resolveScenario(coach, scenarioIn), [coach, scenarioIn])
  const schoolB = schoolById(schools, scenario.schoolBId)
  const cites = useMemo(() => (coach ? coachCites(book, coach) : []), [book, coach])
  const band = coachCompBand(book, coach)
  const range = bandRange(band)
  const vs = vsBand(scenario.annualSalary, band)
  const payer = residualPayerLabel(coach, prior)

  useEffect(() => {
    setPayDraft(params.get('pay') || '')
    setYearsDraft(params.get('years') || '')
  }, [coachId, params])

  function patch(next) {
    const merged = { ...scenarioIn, ...next }
    const p = new URLSearchParams()
    if (merged.schoolBId) p.set('b', merged.schoolBId)
    if (hasDollar(merged.annualSalary)) p.set('pay', String(Math.round(merged.annualSalary)))
    if (hasDollar(merged.termYears)) p.set('years', String(merged.termYears))
    if (merged.jobType && merged.jobType !== 'head-coach') p.set('job', merged.jobType)
    if (merged.allIn) p.set('allin', '1')
    setParams(p, { replace: true })
  }

  function onPayBlur() {
    const n = parseMoneyInput(payDraft)
    setPayDraft(hasDollar(n) ? String(Math.round(n)) : '')
    patch({ annualSalary: n })
  }

  function onYearsBlur() {
    const n = parseYearsInput(yearsDraft)
    setYearsDraft(hasDollar(n) ? String(n) : '')
    patch({ termYears: n })
  }

  if (!coach) {
    return (
      <div className="page-wrap coach-fa-page">
        <p className="crumb">
          <Link to="/">Rank list</Link>
          {' · '}
          <Link to="/coach-fa">Offsets / free agents</Link>
        </p>
        <p className="lede">No free-agent chair on the desk for that id.</p>
      </div>
    )
  }

  const share = sharePath(coachId, scenarioIn)
  const buyout = coach.buyout || {}
  const offset = coach.offset || {}

  return (
    <div className="page-wrap coach-fa-page">
      <p className="crumb">
        <Link to="/">Rank list</Link>
        {' · '}
        <Link to="/coach-fa">Offsets / free agents</Link>
        {` · ${coach.name}`}
      </p>
      <h1 className="issue-hed" title={defTitle('coachFa')}>
        School A still owes. School B is modeled.
      </h1>
      <p className="lede">
        Cited residual and offset language from the prior contract. Type a
        School B annual as a labeled model — A residual does not move when the
        formula is none. A dollar-for-dollar offset only subtracts when you
        type a modeled B salary. We do not invent today’s remaining principal.
      </p>

      <header className="school-hed buyout-hed">
        <div>
          <div className="eyebrow">
            {statusLabel(coach.status)}
            {payer ? ` · ${payer}` : ''}
            {prior?.conference ? ` · ${prior.conference}` : ''}
            {' · football HC (former)'}
          </div>
          <div className="buyout-names">
            {prior && <Logo school={prior} size={56} className="logo-lg" />}
            {current && <Logo school={current} size={56} className="logo-lg" />}
            <div>
              <h2 className="buyout-school">{coach.name}</h2>
              <div className="coach-name">
                Prior: {prior?.name || coach.priorSchoolId}
                {current ? (
                  <>
                    {' · Now: '}
                    {current.name}
                    {coach.currentJobTitle ? ` — ${coach.currentJobTitle}` : ''}
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className="chips coach-fa-status-chips" aria-label="Status">
            <span className="chip mark on">{statusLabel(coach.status)}</span>
            {payer ? <span className="chip mark">{payer}</span> : null}
            {offsetLabel(offset) === 'None' ? <span className="chip mark">No offset</span> : (
              <span className="chip mark">{offsetLabel(offset)}</span>
            )}
          </div>
          <div className="field-meta">
            Fired {buyout.cause === 'without-cause' ? 'without cause' : buyout.cause || '—'}
            {buyout.firedOn ? ` · ${formatLongDate(buyout.firedOn)}` : ''}
            {coach.tapeId ? (
              <>
                {' · '}
                <Link to="/tape">tape {coach.tapeId}</Link>
              </>
            ) : null}
          </div>
        </div>
        <div className="hero-num">
          <div className="eyebrow" title={defTitle('netCostToA')}>Still owe at A</div>
          {hasDollar(buyout.grossRemaining) ? (
            <>
              <div className="display">{money(hasDollar(scenario.netCostToA.value) ? scenario.netCostToA.value : buyout.grossRemaining)}</div>
              <div className="field-meta">
                {hasDollar(scenario.netCostToA.value)
                  ? (buyout.grossRemainingKind || 'cited residual')
                  : 'residual cited · net after offset pending'}
                {' · '}
                <span className="conf-label">
                  {hasDollar(scenario.netCostToA.value) ? scenario.netCostToA.confidence : buyout.confidence}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="display sm pending-cell">Pending</div>
              <div className="field-meta">No cited School A residual on the desk.</div>
            </>
          )}
        </div>
      </header>

      <ShareBar
        url={canonicalUrl(share)}
        title={`${coach.name} — Offsets / free agents — Public Cap`}
        caption={shareCaption({
          coach,
          prior,
          current: schoolB || current,
          scenario,
          cites,
        })}
        onPng={() => downloadCoachFaPng({
          coach,
          prior,
          current: schoolB || current,
          scenario,
          cites,
          statusLine: [statusLabel(coach.status), payer].filter(Boolean).join(' · '),
        })}
      />
      <p className="share-extra">
        <Link to={share}>{share}</Link>
        {prior ? (
          <>
            {' · '}
            <Link to={`/school/${prior.id}`}>{prior.shortName || prior.name} page</Link>
          </>
        ) : null}
        {current ? (
          <>
            {' · '}
            <Link to={`/school/${current.id}`}>{current.shortName || current.name} page</Link>
          </>
        ) : null}
        {' · '}
        <Link to="/buyout">Buyout desk</Link>
      </p>

      <section>
        <h2>School A residual</h2>
        <p className="lede tight">
          Cited remaining buyout at termination — not a 2026 ledger balance.
        </p>
        <div className="field">
          <div className="eyebrow">Gross remaining</div>
          <div className="field-val">
            {hasDollar(buyout.grossRemaining) ? moneyExact(buyout.grossRemaining) : (
              <span className="pending-cell">pending</span>
            )}
            {' '}
            <Mark confidence={buyout.confidence} />
          </div>
          <div className="field-meta">
            {buyout.grossRemainingKind || 'booked'}
            {buyout.asOf ? ` · as of ${formatLongDate(buyout.asOf)}` : ''}
          </div>
          {buyout.notes && <div className="field-notes">{buyout.notes}</div>}
        </div>
        {buyout.schedule?.length ? (
          <ol className="sources buyout-steps">
            {buyout.schedule.map((s, i) => (
              <li key={`${s.kind}-${i}`}>
                <strong>{s.label || s.kind}:</strong>
                {' '}
                {hasDollar(s.amount) ? moneyExact(s.amount) : <span className="pending-cell">pending</span>}
                {s.count ? ` × ${s.count}` : ''}
                {s.through ? ` through ${formatLongDate(s.through)}` : ''}
                {s.due ? ` · ${s.due}` : ''}
                <div className="field-meta">
                  <Mark confidence={s.confidence || buyout.confidence} />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="field pending-box">
            <div className="field-val">Schedule pending</div>
            <div className="field-meta">No cited payment calendar on the desk.</div>
          </div>
        )}
        <p className="field-meta">
          {citesForBlock(book, buyout.citeIds).map((c, i) => (
            <span key={c.id}>
              {i ? ' · ' : ''}
              <SourceLink source={c} />
            </span>
          ))}
        </p>
      </section>

      <section>
        <h2 title={defTitle('offsetCredit')}>Offset / mitigation</h2>
        {offset.rule ? (
          <>
            <blockquote className="exit-quote">{offset.rule}</blockquote>
            <p className="field-meta">
              {offset.paragraph ? `¶${offset.paragraph}` : 'clause'}
              {offset.asOf ? ` · ${formatLongDate(offset.asOf)}` : ''}
              {' · '}
              formula {offsetLabel(offset)}
              {' · '}
              {offset.offsetApplies === false ? 'does not apply' : 'applies if new pay is modeled'}
              {' · '}
              <Mark confidence={offset.confidence} />
            </p>
            <p className="field-notes">
              Offset credit on this chair is {hasDollar(scenario.offsetCredit.value)
                ? moneyExact(scenario.offsetCredit.value)
                : 'pending'}
              {scenario.offsetCredit.formula === 'none'
                ? ' — the file says none. Typing a School B salary does not reduce A.'
                : ' — dollar-for-dollar overlap with a modeled B salary; pending until you type one.'}
            </p>
          </>
        ) : (
          <div className="field pending-box">
            <div className="field-val">Offset rule pending</div>
            <div className="field-meta">Empty without a cited mitigation paragraph.</div>
          </div>
        )}
        <p className="field-meta">
          {citesForBlock(book, offset.citeIds).map((c, i) => (
            <span key={c.id}>
              {i ? ' · ' : ''}
              <SourceLink source={c} />
            </span>
          ))}
        </p>
      </section>

      <section>
        <h2>Scenario calculator</h2>
        <p className="lede tight">
          School B is a picker. The annual is a labeled modeled input — not a filing.
        </p>
        <div className="pickers coach-fa-pickers">
          <label>
            School B
            <select
              value={scenario.schoolBId || ''}
              onChange={(e) => patch({ schoolBId: e.target.value })}
              aria-label="Choose School B"
            >
              {options.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.conference})
                </option>
              ))}
            </select>
          </label>
          <label title={defTitle('coachFa')}>
            Modeled B annual salary
            <input
              type="text"
              inputMode="decimal"
              value={payDraft}
              onChange={(e) => setPayDraft(e.target.value)}
              onBlur={onPayBlur}
              placeholder="empty until you type"
              aria-label="Modeled School B annual salary"
            />
          </label>
          <label>
            Term years (optional)
            <input
              type="text"
              inputMode="decimal"
              value={yearsDraft}
              onChange={(e) => setYearsDraft(e.target.value)}
              onBlur={onYearsBlur}
              placeholder="annual only"
              aria-label="Optional term years"
            />
          </label>
          <label>
            Job type
            <select
              value={scenario.jobType}
              onChange={(e) => patch({ jobType: e.target.value })}
              aria-label="Job type"
            >
              {JOB_TYPES.map((j) => (
                <option key={j.id} value={j.id}>{j.label}</option>
              ))}
            </select>
          </label>
          <div className="alumni-toggle" title={defTitle('allInToFan')}>
            <span className="alumni-toggle-lab" id="allin-lab">All-in to fan</span>
            <div className="alumni-switch" role="group" aria-labelledby="allin-lab">
              <button
                type="button"
                className={!scenario.allIn ? 'on' : ''}
                aria-pressed={!scenario.allIn}
                onClick={() => patch({ allIn: false })}
              >
                Off
              </button>
              <button
                type="button"
                className={scenario.allIn ? 'on' : ''}
                aria-pressed={scenario.allIn}
                onClick={() => patch({ allIn: true })}
              >
                Two payers
              </button>
            </div>
          </div>
        </div>
        <p className="fine">
          School B default is {schoolB?.name || scenario.schoolBId || 'pending'}.
          {' '}Salary stays empty until you type a modeled dollar.
          {' '}Accepts 8000000 or 8M.
        </p>
        {!hasDollar(scenario.annualSalary) && (
          <div className="field pending-box">
            <div className="field-val">School B salary empty</div>
            <div className="field-meta">
              Empty until a cite or a modeled figure is typed. Modeled dollars are labeled modeled.
              {scenario.offsetCredit.formula === 'none'
                ? ' Typing a figure does not reduce School A when offset is none.'
                : ' Offset credit stays empty until you type a modeled annual — empty, not zero.'}
            </div>
          </div>
        )}
        {scenario.offsetCredit.formula !== 'none' && !hasDollar(scenario.offsetCredit.value) && (
          <div className="field pending-box">
            <div className="field-val">Offset credit pending</div>
            <div className="field-meta">
              The clause applies, but there is no cited or modeled School B salary to subtract. Empty, not zero.
            </div>
          </div>
        )}
      </section>

      <section>
        <h2>The stack</h2>
        <div className="coach-fa-cards">
          <article className="tv-card" title={defTitle('netCostToA')}>
            <div className="eyebrow">Still owe at A?</div>
            <div className="field-val">
              <DollarCell figure={scenario.netCostToA} />
            </div>
            <div className="field-meta">
              Gross remaining − offset credit.
              {scenario.offsetCredit.formula === 'none'
                ? ' Offset is none, so this equals the cited residual.'
                : ' Offset applies: type a modeled B annual to compute the credit. Residual above does not change until then.'}
            </div>
          </article>
          <article className="tv-card" title={defTitle('coachFa')}>
            <div className="eyebrow">B pays on top?</div>
            <div className="field-val">
              <DollarCell figure={scenario.totalCompCostToB} empty="empty — type a modeled annual" />
            </div>
            <div className="field-meta">
              {jobTypeLabel(scenario.jobType)}
              {schoolB ? ` at ${schoolB.shortName || schoolB.name}` : ''}
              {scenario.totalCompCostToB.basis === 'term-total' ? ' · term total' : ' · annual'}
              {' · '}
              <span className="conf-label">modeled</span>
              {scenario.allIn && scenario.allInToFan.shown && (
                <>
                  <div className="field-notes" title={defTitle('allInToFan')}>
                    All-in to fan:{' '}
                    <DollarCell figure={scenario.allInToFan} />
                    {' — two payers, not one check.'}
                  </div>
                </>
              )}
            </div>
          </article>
          <article className="tv-card" title={defTitle('compBand')}>
            <div className="eyebrow">vs comps band</div>
            {range ? (
              <>
                <div className="field-val">
                  {money(range.low)}–{money(range.high)}
                  {' '}
                  <Mark confidence={band.confidence} />
                </div>
                <div className="field-meta">
                  {band.label || 'Comp band'}
                  {hasDollar(scenario.annualSalary) ? (
                    <>
                      {' · modeled B is '}
                      {vs === 'below' ? 'below' : vs === 'above' ? 'above' : 'inside'} the band
                    </>
                  ) : (
                    ' · type a B annual to place it'
                  )}
                </div>
                <ul className="coach-fa-peers">
                  {(band.peers || []).map((p) => {
                    const sch = schoolById(schools, p.schoolId)
                    return (
                      <li key={`${p.schoolId}-${p.coach}`}>
                        {sch?.shortName || p.schoolId} {p.coach} {money(p.totalPay)}
                        {p.starred ? '*' : ''}
                      </li>
                    )
                  })}
                </ul>
                <div className="field-notes">{band.notes}</div>
              </>
            ) : (
              <div className="pending-cell">Comp band pending</div>
            )}
          </article>
        </div>
      </section>

      <section>
        <h2>Cites</h2>
        <ol className="sources buyout-steps">
          {cites.map((c) => (
            <li key={c.id}>
              <SourceLink source={c} />
              {c.asOf ? <span className="field-meta"> · {c.asOf}</span> : null}
              {' '}
              <Mark confidence={c.confidence} />
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2>Methods</h2>
        <p>
          Public-school A-side figures prefer the employment agreement or a
          newsroom story that quotes the clause. Fisher’s residual is the
          cited termination-date remaining buyout ($77,562,500), booked as
          booked-at-termination — the unpaid balance as of {formatLongDate('2026-09-04')}
          {' '}is not ledger-verified, and the schedule continues through 2031.
          Offset ¶5.3 (Dec. 4, 2017) says the university is not entitled to any
          offset whatsoever; offset credit is therefore $0 and A does not move
          when you type a B salary. Stoops is employed elsewhere: Kentucky still
          owes the Athletic-census $37.6 million residual (Courier Journal
          $37,687,500 in notes); Texas salary is empty until announced; offset
          is none, so a modeled Texas figure does not reduce A. School B annual
          is a labeled modeled input. Optional all-in is A residual + B salary,
          footnoted as two payers, and stays off until you flip it. Comp peers
          are USA TODAY 2025 Total Pay — a reported database, labeled modeled,
          not FOIA PDFs. We do not invent today’s remaining principal, and we
          do not invent an offset dollar.
        </p>
      </section>
    </div>
  )
}

function citesForBlock(book, ids) {
  return (ids || []).map((id) => book?.cites?.[id]).filter(Boolean)
}

export default function CoachFa() {
  const { coachId } = useParams()
  const { book, schools, err } = useCoachFaBook()

  if (err) {
    return (
      <div className="page-wrap">
        <p className="lede">Failed to load offset desk. {err}</p>
      </div>
    )
  }
  if (!book || !schools) {
    return (
      <div className="page-wrap">
        <p className="lede">Setting type…</p>
      </div>
    )
  }
  if (coachId) {
    return <CoachFaDetail book={book} schools={schools} coachId={coachId} />
  }
  return <CoachFaIndex book={book} schools={schools} />
}
