import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { ContractFiles } from '../components/ContractFiles.jsx'
import { BuyoutRuleLine, CoachPayField, IncentiveList } from '../components/CoachPay.jsx'
import { coachTermLabel, contractLinkLabel, money, moneyExact } from '../lib/format.js'
import {
  DEFAULT_SCHOOL,
  DESK_TODAY,
  afterLabel,
  classifyTape,
  coachOptions,
  currentStep,
  formatLongDate,
  formatThrough,
  gameLabel,
  mapGames,
  mergeSchoolSteps,
  sharePath,
} from '../lib/buyout.js'

function SourceLink({ source, className = 'ext' }) {
  if (!source?.url) return source?.label ? <span>{source.label}</span> : null
  return (
    <a className={className} href={source.url} target="_blank" rel="noreferrer">
      {source.label || 'source'} ↗
    </a>
  )
}

function StepAmount({ amount, confidence }) {
  if (amount == null) {
    return (
      <span className="pending-cell">
        pending <i className="dot pending" />
      </span>
    )
  }
  return (
    <>
      {moneyExact(amount)} <i className={`dot ${confidence || 'reported'}`} />
    </>
  )
}

export default function Buyout() {
  const [params, setParams] = useSearchParams()
  const schoolId = params.get('school') || DEFAULT_SCHOOL
  const [book, setBook] = useState(null)
  const [sched, setSched] = useState(null)
  const [schools, setSchools] = useState(null)
  const [err, setErr] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/data/buyouts.json').then((r) => {
        if (!r.ok) throw new Error(r.statusText)
        return r.json()
      }),
      fetch('/data/schedules-2026.json').then((r) => (r.ok ? r.json() : { schools: {} })),
      fetch('/data/schools.json').then((r) => (r.ok ? r.json() : { schools: [] })),
    ])
      .then(([b, sc, sk]) => {
        setBook(b)
        setSched(sc)
        setSchools(sk)
      })
      .catch((e) => setErr(String(e)))
  }, [])

  const options = useMemo(() => coachOptions(book, schools?.schools), [book, schools])
  const school = useMemo(
    () => (schools?.schools || []).find((s) => s.id === schoolId) || null,
    [schools, schoolId],
  )
  const bookCoach = book?.coaches?.[schoolId] || null
  const coach = useMemo(
    () => mergeSchoolSteps(bookCoach, school?.coaches?.football?.buyout),
    [bookCoach, school],
  )
  const slate = sched?.schools?.[schoolId] || null
  const tape = classifyTape(coach)
  const todayStep = currentStep(coach, DESK_TODAY)
  const rows = useMemo(
    () => mapGames(slate?.games || [], coach, DESK_TODAY),
    [slate, coach],
  )

  function pickSchool(id) {
    const next = new URLSearchParams(params)
    next.set('school', id)
    next.delete('sport')
    setParams(next, { replace: true })
  }

  function copyShare() {
    const url = `${window.location.origin}${sharePath(schoolId)}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }

  if (err) return <div className="page-wrap"><p className="lede">Failed to load buyout desk. {err}</p></div>
  if (!book || !schools) return <div className="page-wrap"><p className="lede">Setting type…</p></div>

  const share = sharePath(schoolId)

  return (
    <div className="page-wrap buyout-page">
      <p className="crumb">
        <Link to="/">Rank list</Link>
        {' · '}
        Buyout
        {school ? ` · ${school.name}` : ''}
      </p>
      <h1 className="issue-hed">If they fire him after this kickoff.</h1>
      <p className="lede">
        Most football head-coach contracts step the termination fee on a calendar date
        — Dec. 1, Jan. 1, the end of the season, Feb. 1 / signing day — or on remaining
        contract years. They do not renegotiate after each Saturday. This page maps the
        cited step onto the remaining 2026 slate. After Alabama and after Florida are
        often the same number, and that is the honest reading of the PDF.
      </p>

      <div className="pickers">
        <label>
          School / coach
          <select value={schoolId} onChange={(e) => pickSchool(e.target.value)} aria-label="Choose a football head coach">
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.schoolName} — {o.coach}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!coach ? (
        <p className="lede">No coach on the buyout book for that school.</p>
      ) : (
        <>
          <header className="school-hed buyout-hed">
            <div>
              <div className="eyebrow">{school?.conference} · football HC</div>
              <div className="buyout-names">
                {school && <Logo school={school} size={56} className="logo-lg" />}
                <div>
                  <h2 className="buyout-school">{school?.name || schoolId}</h2>
                  <div className="coach-name">{coach.name}</div>
                </div>
              </div>
              {coach.contract?.url && (
                <div>
                  <a
                    className="contract-link ext"
                    href={coach.contract.url}
                    title={coach.contract.label || undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {contractLinkLabel(coach.contract.url, coach.contract.label)} ↗
                  </a>
                  {coach.contract.label && (
                    <div className="field-meta">{coach.contract.label}</div>
                  )}
                  <ContractFiles files={coach.contract.files} />
                </div>
              )}
              {!coach.contract?.url && <ContractFiles files={coach.contract?.files} />}
              {school?.coaches?.football && (
                <div className="buyout-comp">
                  <div className="eyebrow">Annual pay</div>
                  <CoachPayField pay={school.coaches.football.pay} />
                  {coachTermLabel(school.coaches.football.term) && (
                    <div className="field-notes">
                      Term {coachTermLabel(school.coaches.football.term)}
                      {school.coaches.football.term?.notes ? ` — ${school.coaches.football.term.notes}` : ''}
                    </div>
                  )}
                  <BuyoutRuleLine
                    buyout={school.coaches.football.buyout}
                    fallback={coach.rule}
                  />
                  <IncentiveList items={school.coaches.football.pay?.incentives} />
                </div>
              )}
            </div>
            <div className="hero-num">
              <div className="eyebrow">In force today · {formatLongDate(DESK_TODAY)}</div>
              {todayStep?.amount != null ? (
                <>
                  <div className="display">{money(todayStep.amount)}</div>
                  <div className="field-meta">
                    {todayStep.through ? formatThrough(todayStep.through) : 'current if-fired overhang'}
                    {' · '}
                    <span className="conf-label">{todayStep.confidence}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="display sm pending-cell">Pending</div>
                  <div className="field-meta">No cited current-dollar step on the desk.</div>
                </>
              )}
            </div>
          </header>

          <div className="share-bar">
            <span className="share-lab">Share</span>
            <Link to={share}>{share}</Link>
            <button type="button" className={copied ? 'copied' : ''} onClick={copyShare}>
              {copied ? 'Copied' : 'Copy URL'}
            </button>
            {school && (
              <Link to={`/school/${school.id}`}>School page</Link>
            )}
          </div>

          <section>
            <h2>Buyout if fired after</h2>
            {tape === 'pending' && (
              <div className="field pending-box">
                <div className="field-val">Game-by-game tape pending</div>
                <div className="field-meta">
                  {coach.rule || 'No public step schedule and no current-chair overhang on this desk.'}
                </div>
                {coach.notes && <div className="field-notes">{coach.notes}</div>}
              </div>
            )}
            {tape === 'overhang' && (
              <p className="lede tight">
                One cited if-fired overhang — not a weekly staircase. Every remaining
                kickoff maps to the same number until a calendar step is on the desk.
              </p>
            )}
            {tape === 'steps' && (
              <p className="lede tight">
                Remaining 2026 games, with the contract step in force on the calendar
                day after kickoff.
              </p>
            )}

            <div className="table-scroll buyout-scroll">
              <table className="rank buyout-table">
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Date</th>
                    <th className="num">Buyout if fired after</th>
                    <th>Mark</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="pending-cell">No remaining 2026 games on the slate.</td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={`${row.game.date || 'tbd'}-${row.game.opponent}`}>
                        <td>
                          {gameLabel(row.game)}
                          {row.game.notes && <div className="term-compact">{row.game.notes}</div>}
                        </td>
                        <td>{row.game.date ? formatLongDate(row.game.date) : <span className="pending-cell">TBD</span>}</td>
                        <td className="num strong">
                          <div>{afterLabel(row)}</div>
                          <div>
                            <StepAmount amount={row.amount} confidence={row.confidence} />
                          </div>
                          {row.pendingTape && row.amount != null && (
                            <div className="term-compact">same overhang · step tape pending</div>
                          )}
                        </td>
                        <td><i className={`dot ${row.confidence || 'pending'}`} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="fine">
              Schedule: {slate?.wikiUrl ? (
                <a className="ext" href={slate.wikiUrl} target="_blank" rel="noreferrer">{slate.wikiTitle} ↗</a>
              ) : 'Wikipedia 2026 team page'}.
              Upcoming = kickoff on or after {formatLongDate(DESK_TODAY)} (America/Chicago).
              Bowl games stay off the tape until a date or opponent is public.
            </p>
          </section>

          <section>
            <h2>Contract steps (the PDF, not the Saturday)</h2>
            {coach.steps?.length ? (
              <ol className="sources buyout-steps">
                {coach.steps.map((s, i) => (
                  <li key={`${s.through || s.asOf || 'open'}-${i}`}>
                    <strong>
                      {s.through ? formatThrough(s.through) : s.asOf ? `as of ${s.asOf}` : 'Current overhang'}
                      {s.contractYear ? ` · ${s.contractYear}` : ''}:
                    </strong>
                    {' '}
                    <StepAmount amount={s.amount ?? s.remaining} confidence={s.confidence} />
                    <div className="field-notes">{s.rule || s.notes}</div>
                    <div className="field-meta">
                      <span className="conf-label">{s.confidence}</span>
                      {s.source && <> · <SourceLink source={s.source} /></>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : coach.overhang ? (
              <ol className="sources buyout-steps">
                <li>
                  <strong>If-fired overhang as of {coach.overhang.asOf || 'the as-of date'}: </strong>
                  <StepAmount amount={coach.overhang.amount} confidence={coach.overhang.confidence} />
                  <div className="field-notes">{coach.overhang.rule}</div>
                  <div className="field-meta">
                    <span className="conf-label">{coach.overhang.confidence}</span>
                    {coach.overhang.source && <> · <SourceLink source={coach.overhang.source} /></>}
                  </div>
                </li>
              </ol>
            ) : (
              <div className="field pending-box">
                <div className="field-val">No step tape</div>
                <div className="field-meta">{coach.rule || 'Pending a public contract schedule.'}</div>
              </div>
            )}
            {coach.notes && <p className="field-notes">{coach.notes}</p>}
          </section>

          {coach.mitigation && (
            <section>
              <h2>Mitigation / offset</h2>
              <p className="lede tight">{coach.mitigation.rule}</p>
              {coach.mitigation.source && (
                <p className="field-meta">
                  <SourceLink source={coach.mitigation.source} />
                </p>
              )}
            </section>
          )}

          <section>
            <h2>Methods</h2>
            <p>
              Public-school buyouts prefer the employment agreement, amendment, or board
              packet; articles are the fallback only when no current file is on the desk.
              When we have more than the latest PDF — an original EA plus amendments —
              the Contract files list shows every file on the desk. We do not invent a file.
              This is the contract schedule mapped onto remaining games, not a weekly
              renegotiation. For each upcoming kickoff we ask: if the school fires him
              without cause on the calendar day after that game, which cited step is in
              force? When the only public number is a USA TODAY or school if-fired
              overhang, we print that one number and mark the game-by-game tape pending.
              We do not invent Saturday steps, we do not mint remaining-pay dollars from
              a bare percent clause, and we do not invent a dollar offset for new
              employment. Paid buyouts — money already owed after a firing — live
              on the desk tape, not here. No On3, Opendorse, NIL Go, or social.
            </p>
          </section>
        </>
      )}
    </div>
  )
}
