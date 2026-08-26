import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { money, moneyExact, moneyRange, earn, pct, coachTermLabel, contractLinkLabel } from '../lib/format.js'
import { collectSources, hasVal } from '../lib/compute.js'
import Logo from '../components/Logo.jsx'
import { defTitle } from '../lib/definitions.js'
import { earningsBack } from '../lib/earningsBack.js'
import Layers from '../components/Layers.jsx'
import SeasonPicker from '../components/SeasonPicker.jsx'
import StackChart from '../components/StackChart.jsx'
import { houseValueForSeason } from '../lib/seasons.js'
import { EMPTY_TAPE, tapeForSchool } from '../lib/tape.js'
import TapeItems from '../components/TapeItems.jsx'
import TvContracts from '../components/TvContracts.jsx'
import { DEFAULT_TITLE, SCHOOL_DRILLS, hashKey, homePath, schoolTitle } from '../lib/share.js'
import AlumniToggle from '../components/AlumniToggle.jsx'
import { ContractFiles } from '../components/ContractFiles.jsx'
import { BuyoutRuleLine, CoachPayField, IncentiveList } from '../components/CoachPay.jsx'

function TermBlock({ term }) {
  const label = coachTermLabel(term)
  if (!term || term.confidence === 'pending' || !label) {
    return (
      <div className="field pending-box">
        <div className="field-val">Term pending</div>
        <div className="field-meta">{term?.notes || 'No public through-year on the desk.'}</div>
      </div>
    )
  }
  return (
    <div className="field">
      <div className="field-val">
        {label} <i className={`dot ${term.confidence}`} />
      </div>
      <div className="field-meta">
        {term.asOf && <span>as of {term.asOf} · </span>}
        <span className="conf-label">{term.confidence}</span>
        {term.source && <span> · {term.source}</span>}
        {term.url && (
          <>
            {' '}
            <a className="ext" href={term.url} target="_blank" rel="noreferrer">
              {contractLinkLabel(term.url, term.source)} ↗
            </a>
          </>
        )}
      </div>
      {term.notes && <div className="field-notes">{term.notes}</div>}
    </div>
  )
}

function StaffPayCell({ field }) {
  if (!field || field.value == null) return <span className="pending-cell">pending</span>
  return (
    <>
      {moneyExact(field.value)} <i className={`dot ${field.confidence || 'reported'}`} />
    </>
  )
}

function staffLede(year) {
  if (year === 2024) {
    return 'Football assistant dollars are the USA TODAY 2024 contract year (as of Dec 18, 2024), not a current 2026 salary. Named assistants are that 2024 table.'
  }
  if (year === 2025) {
    return 'No year-accurate 2025 football staff tape on the desk. We do not show the 2026 official directory or 2024 USA TODAY dollars as 2025.'
  }
  if (year === 2026) {
    return 'Official 2026 athletics directory (names and roles). Assistant pay is pending unless a cited 2026 dollar exists. USA TODAY Dec 18, 2024 assistant pay lives on 2024.'
  }
  return `No year-accurate football staff tape on the desk for ${year}. 2021–2023 USA TODAY assistant tables are not ingested yet.`
}

function staffEmptyAssistants(year) {
  if (year === 2024) {
    return 'No cited 2024 football-assistant pay on the desk (USA TODAY assistant table blanks private / exempt schools).'
  }
  if (year === 2025) {
    return 'No year-accurate 2025 football staff directory on the desk.'
  }
  if (year === 2026) {
    return 'Official 2026 directory has no named football assistants on this card, or pay is still pending. USA TODAY 2024 dollars are not shown as 2026 contract pay.'
  }
  return `No ${year} USA TODAY assistant table on the desk yet.`
}

function StaffSection({ school, season }) {
  const staff = school.staff || {}
  const ad = staff.athleticDirector
  const office = staff.office || []
  const others = staff.otherHeadCoaches || []
  const assts = staff.assistants || []
  const pool = staff.footballAssistantPool
  const year = school._seasonYear || season
  return (
    <section>
      <h2 title={defTitle('staffPay')}>Athletics staff pay</h2>
      <p className="lede tight">{staffLede(year)}</p>
      <div className="eyebrow">Athletic director</div>
      {ad?.pay?.value != null ? (
        <div className="field">
          <div className="coach-name">{ad.name}</div>
          <div className="field-val">
            {moneyExact(ad.pay.value)} <i className={`dot ${ad.pay.confidence}`} />
          </div>
          <div className="field-meta">
            {ad.pay.asOf && <span>as of {ad.pay.asOf} · </span>}
            <span className="conf-label">{ad.pay.confidence}</span>
            {ad.pay.source && <span> · {ad.pay.source}</span>}
            {ad.pay.url && (
              <>
                {' '}
                <a className="ext" href={ad.pay.url} target="_blank" rel="noreferrer">source ↗</a>
              </>
            )}
          </div>
          {ad.pay.notes && <div className="field-notes">{ad.pay.notes}</div>}
        </div>
      ) : (
        <div className="field pending-box">
          <div className="field-val">Pending</div>
          <div className="field-meta">{ad?.notes || 'No current public AD pay on the desk.'}</div>
        </div>
      )}
      {office.length > 0 && (
        <>
          <h3 className="roster-hed">Athletics office</h3>
          <table className="roster staff-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th className="num">Pay</th>
              </tr>
            </thead>
            <tbody>
              {office.map((r) => (
                <tr key={`${r.role}-${r.name}`}>
                  <td>{r.name}</td>
                  <td>{r.role}</td>
                  <td className="num">
                    <StaffPayCell field={r.pay} />
                    {r.pay?.url && (
                      <div className="field-meta">
                        <a className="ext" href={r.pay.url} target="_blank" rel="noreferrer">{r.pay.source || 'source'} ↗</a>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <h3 className="roster-hed">Other head coaches</h3>
      {others.length ? (
        <table className="roster staff-table">
          <thead>
            <tr>
              <th>Sport</th>
              <th>Coach</th>
              <th className="num">Pay</th>
            </tr>
          </thead>
          <tbody>
            {others.map((r) => (
              <tr key={`${r.sport}-${r.name}`}>
                <td>{r.sport}</td>
                <td>{r.name}</td>
                <td className="num">
                  <StaffPayCell field={r.pay} />
                  {r.pay?.url && (
                    <div className="field-meta">
                      <a className="ext" href={r.pay.url} target="_blank" rel="noreferrer">{r.pay.source || 'source'} ↗</a>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="fine">No cited WBB / Olympic-sport head-coach pay on the desk for this school.</p>
      )}
      <h3 className="roster-hed">Football assistants</h3>
      {staff.notes && <p className="fine">{staff.notes}</p>}
      {assts.length ? (
        <table className="roster staff-table">
          <thead>
            <tr>
              <th>Coach</th>
              <th>Role</th>
              <th className="num">Pay</th>
            </tr>
          </thead>
          <tbody>
            {assts.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.role}</td>
                <td className="num">
                  <StaffPayCell field={r.pay} />
                  {r.pay?.url && (
                    <div className="field-meta">
                      <a className="ext" href={r.pay.url} target="_blank" rel="noreferrer">{r.pay.source || 'source'} ↗</a>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="fine">{staffEmptyAssistants(year)}</p>
      )}
      {pool?.value != null && (
        <p className="fine">
          {year === 2024 ? '2024 USA TODAY football assistant staff total' : 'Football assistant staff total'}{' '}
          {moneyExact(pool.value)}
          {' '}({pool.confidence}, as of {pool.asOf}
          {pool.asOf === '2024-12-18' ? ' · 2024 contract year' : ''}).{' '}
          <a className="ext" href={pool.url} target="_blank" rel="noreferrer">{pool.source} ↗</a>
          {pool.notes ? ` ${pool.notes}` : ''}
        </p>
      )}
    </section>
  )
}

function ContractLink({ url, label }) {
  if (url) {
    return (
      <a className="ext contract-link" href={url} title={label || undefined} target="_blank" rel="noreferrer">
        {contractLinkLabel(url, label)} ↗
      </a>
    )
  }
  return <span className="no-contract">no public contract</span>
}

function BacksThis({ school }) {
  const back = earningsBack(school)
  const official = school.alumni?.officialEarnings
  return (
    <aside className="backs-this" title={defTitle('earningsBack')}>
      <div className="eyebrow">What backs this</div>
      <p className="backs-lede">
        Corroboration of the official average — not a second alumni net-worth engine.
      </p>
      <ul className="backs-list">
        <li>
          <span className="conf-label reported">reported</span>{' '}
          College Scorecard median, 10 years after entry
          {official?.value != null ? <> ({moneyExact(official.value)})</> : null}
          {official?.asOf ? ` · as of ${official.asOf}` : ''}.{' '}
          <a className="ext" href={back.scorecardUrl} target="_blank" rel="noreferrer">Scorecard school page ↗</a>
        </li>
        <li>
          <span className="conf-label estimated">estimated</span>{' '}
          Career mix for a {back.mix.label} campus, checked against BLS Occupational
          Employment and Wage Statistics (national {back.oewsAsOf};{' '}
          <span className="conf-label reported">reported</span> wages, not this school’s alumni):
          <ul className="backs-occ">
            {back.mix.occupations.map((o) => (
              <li key={o.soc}>
                <a href={o.url} target="_blank" rel="noreferrer">{o.title}</a>
                {o.annual != null && (
                  <span>
                    {' '}— {o.stat} {moneyExact(o.annual)}
                  </span>
                )}
                <span className="backs-soc"> SOC {o.soc}</span>
              </li>
            ))}
          </ul>
          {back.oewsState && (
            <div className="backs-sub">
              State OEWS overview:{' '}
              <a href={back.oewsState.url} target="_blank" rel="noreferrer">{back.oewsState.abbr} ↗</a>
              {' '}·{' '}
              <a href={back.oewsTableUrl} target="_blank" rel="noreferrer">national table ↗</a>
            </div>
          )}
        </li>
        {back.statePayroll && (
          <li>
            <span className="conf-label reported">reported</span>{' '}
            State employee salary databases exist for public-university alumni on the {back.statePayroll.state} payroll.{' '}
            <a className="ext" href={back.statePayroll.url} target="_blank" rel="noreferrer">{back.statePayroll.name} ↗</a>
            <div className="backs-sub">{back.statePayroll.notes}</div>
          </li>
        )}
        {back.filings && (
          <li>
            Notable public filings
            <ul className="backs-occ">
              {back.filings.map((f) => (
                <li key={f.url}>
                  <span className={`conf-label ${f.confidence}`}>{f.confidence}</span>{' '}
                  {f.name} — {f.role}.{' '}
                  <a href={f.url} target="_blank" rel="noreferrer">{f.source} ↗</a>
                  <div className="backs-sub">{f.note}</div>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
      <p className="backs-foot">Glassdoor and LinkedIn are not ingested.</p>
    </aside>
  )
}

function Field({ field, fallback = '—' }) {
  if (!field || field.value == null) {
    return (
      <div className="field pending-box">
        <div className="field-val">Pending</div>
        <div className="field-meta">{field?.notes || fallback}</div>
      </div>
    )
  }
  return (
    <div className="field">
      <div className="field-val">
        {moneyExact(field.value)} <i className={`dot ${field.confidence}`} />
      </div>
      <div className="field-meta">
        {field.fiscalYear && <span>{field.fiscalYear} · </span>}
        {field.window && <span>{field.window} · </span>}
        {field.asOf && <span>as of {field.asOf} · </span>}
        <span className="conf-label">{field.confidence}</span>
        {field.source && <span> · {field.source}</span>}
      </div>
      {field.notes && <div className="field-notes">{field.notes}</div>}
      {field.had?.value != null && (
        <div className="field-notes">
          What we had: {moneyExact(field.had.value)}
          {field.had.window ? ` · ${field.had.window}` : ''}
          {field.had.notes ? ` — ${field.had.notes}` : ''}
        </div>
      )}
    </div>
  )
}

export default function School({ schools, meta, season, setSeason, includeAlumni, setIncludeAlumni, tape }) {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const didScroll = useRef(false)
  const s = schools.find((x) => x.id === id)
  const openRaw = hashKey(location.hash)
  const open = SCHOOL_DRILLS.has(openRaw) ? openRaw : ''

  useEffect(() => {
    const prev = document.title
    document.title = s ? schoolTitle(s.name, season) : DEFAULT_TITLE
    return () => { document.title = prev || DEFAULT_TITLE }
  }, [s, season])

  useEffect(() => {
    didScroll.current = false
  }, [id])

  useEffect(() => {
    if (!s || !open || didScroll.current) return
    const el = document.getElementById(`slice-${open}`)
    if (el) {
      didScroll.current = true
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [s, open])

  function setOpen(hash) {
    const next = hash && hash !== open ? hash : ''
    navigate({ pathname: location.pathname, search: location.search, hash: next ? `#${next}` : '' }, { replace: true })
  }

  if (!s) return <div className="page-wrap"><p>School not on the desk.</p></div>
  const cap = s._cap
  const house = houseValueForSeason(meta, season)
  const houseField = s._houseField
  const spec = s._season
  const nil = s._ratios.nil
  const sources = collectSources(s, meta)
  const deskTape = tapeForSchool(tape, s.id)

  return (
    <div className="page-wrap school">
      <p className="crumb"><Link to={homePath({ season, includeAlumni })}>Rank list</Link> / {s.name}</p>
      <div className="school-tools">
        <SeasonPicker season={season} onChange={setSeason} id="school-season" />
        <AlumniToggle on={includeAlumni} onChange={setIncludeAlumni} id="school-alumni" />
        <span className="season-note">{spec?.academic} · football {season}</span>
      </div>
      <header className="school-hed">
        <Logo school={s} size={72} className="logo-lg" />
        <div>
          <div className="kicker">{s.conference} · {s.city}{s.private ? ' · private' : ''}</div>
          <h1>{s.name}</h1>
          {s.revenueGap && <p className="gap-banner">Revenue gap: private-school tickets, sponsorships, and contributions are not on the public MFRS tape.</p>}
        </div>
        <div className="hero-num">
          <div className="eyebrow">{includeAlumni ? 'Annual capacity' : 'Annual capacity · booked only'}</div>
          <div className="display">{money(includeAlumni ? cap.total : cap.booked)}</div>
          {includeAlumni ? (
            <div className="eyebrow">range {money(cap.totalLow)}–{money(cap.totalHigh)}</div>
          ) : (
            <div className="eyebrow">extra alumni excluded</div>
          )}
        </div>
      </header>

      <StackChart
        school={s}
        cap={cap}
        house={house}
        houseField={houseField}
        nil={nil}
        season={season}
        open={open}
        onToggle={setOpen}
        includeAlumni={includeAlumni}
      />

      <div className="two-col">
        <section>
          <h2 title={defTitle('earnings')}>Alumni — official earnings</h2>
          <p className="lede tight">College Scorecard median, 10 years after entry. This is the official line. It is not net worth.</p>
          <Field field={s.alumni.officialEarnings} />
          <p className="fine">
            Enrollment proxy {s.alumni.undergradEnrollment.value?.toLocaleString()} ({s.alumni.undergradEnrollment.confidence}).
            Opportunity Insights (Chetty) mid-career earnings are the other official lane; v1 does not ingest OI microdata.
          </p>
          <BacksThis school={s} />
        </section>
        <section>
          <h2 title={defTitle('wealth')}>Alumni — modeled wealth <i className="dot modeled" /></h2>
          <p className="lede tight">Range only. Low = median W/I path. High = mean + top-1% bump. Not a silent total.</p>
          <div className="range-box">
            <div>
              <div className="eyebrow">Modeled stock</div>
              <div className="display sm">{money(cap.alumni.wealthLow, 1)} – {money(cap.alumni.wealthHigh, 1)}</div>
            </div>
            <div>
              <div className="eyebrow">All-cause giving flow (0.5-2% of wealth)</div>
              <div className="display sm">{money(cap.alumni.giveLow)} – {money(cap.alumni.giveHigh)}</div>
            </div>
            <div>
              <div className="eyebrow">Athletics-directed slice (4% of flow)</div>
              <div className="display sm">{money(cap.alumni.athLow)} – {money(cap.alumni.athHigh)}</div>
            </div>
            <div>
              <div className="eyebrow">{includeAlumni ? 'Added to capacity (net)' : 'Extra alumni (excluded from total)'}</div>
              <div className={`display sm${includeAlumni ? '' : ' excluded-num'}`}>{money(cap.extraLow)} – {money(cap.extraHigh)}</div>
            </div>
          </div>
          <p className="fine">
            Cohort sketch: {Math.round(cap.alumni.proxy).toLocaleString()} living-alumni proxy
             (enroll × 35 × 0.72 × 0.88). A modeled 4% athletics-directed slice of the 0.5-2% wealth flow is what enters capacity when + alumni model is on.
            {cap.alumni.subtractedBooked
              ? ` Booked athletic contributions of ${money(cap.alumni.bookedContributions)} were subtracted from the giving flow.`
              : ' No booked contributions to subtract.'}
          </p>
        </section>
      </div>

      <section>
        <h2 title={defTitle('nil')}>NIL booked band</h2>
        <Field field={s.nil.booked} fallback="Empty / pending. FOIA, MFRS institutional NIL, or collective 990 only. Official number when it exists." />
        {hasVal(s.nil.preCap) && (
          <div className="subfield">
            <div className="eyebrow">Pre-cap institutional NIL (does not count against House)</div>
            <Field field={s.nil.preCap} />
          </div>
        )}
        <div className="ratio-row">
          <div><span className="eyebrow">NIL ÷ capacity</span><strong>{pct(s._ratios.nilOverCapacity)}</strong></div>
          <div><span className="eyebrow">{house == null ? 'NIL ÷ House' : (season >= 2026 ? 'NIL ÷ House 2026–27' : 'NIL ÷ House 2025–26')}</span><strong>{house == null ? '—' : pct(s._ratios.nilOverHouse)}</strong></div>
          {houseField?.notes && (
            <div><span className="eyebrow">House note</span><strong className="house-note">{house == null ? 'No House cap (pre-settlement)' : houseField.confidence}</strong></div>
          )}
        </div>
      </section>

      {s.nil.modeled ? (
      <section>
        <h2 title={defTitle('nilModeled')}>NIL modeled range <i className="dot modeled" /></h2>
        <div className="range-box">
          <div>
            <div className="eyebrow">{s.nil.modeled.era === 'collective' ? 'Collective-era third-party (not a filing)' : 'Conference heuristic (not a filing)'}</div>
            <div className="display sm modeled-cell">{moneyRange(s.nil.modeled.low, s.nil.modeled.high)}</div>
          </div>
          <div>
            <div className="eyebrow">Midpoint</div>
            <div className="display sm modeled-cell">{money(s.nil.modeled.mid)}</div>
          </div>
        </div>
        <p className="fine">{s.nil.modeled.method}</p>
        <p className="field-notes">{s.nil.modeled.notes}</p>
        <p className="fine">
          Source: <a href={s.nil.modeled.url} target="_blank" rel="noreferrer">{s.nil.modeled.source}</a>
          {nil != null ? ` · Booked filing on this desk: ${money(nil)}. The model is shown so you can compare it to the filing — it does not replace booked.` : ' · No booked filing on this desk yet.'}
        </p>
      </section>
      ) : (
      <section>
        <h2 title={defTitle('nilModeled')}>NIL modeled range</h2>
        <p className="lede tight">
          No modeled NIL range on the desk for this season. 2021–24 should show a
          collective-era third-party-only model; 2025–26 and 2026–27 use the House-era
          conference heuristic.
        </p>
      </section>
      )}

      {s._roster ? (
      <section>
        <h2>Roster bands (modeled)</h2>
        <p className="lede tight">
          Position rate card, not player contracts. Slots are labeled QB1 / WR1 / EDGE. Named football players below are a second cut of the same card — not extra money. Football 85 + MBB 13 scale into 93% of this school’s modeled midpoint.
        </p>
        <div className="roster-split">
          <div>
            <h3 className="roster-hed">Football</h3>
            <table className="roster">
              <thead>
                <tr>
                  <th>Slot</th>
                  <th className="num">Roster spots</th>
                  <th className="num">Band / spot</th>
                  <th className="num">Row total</th>
                </tr>
              </thead>
              <tbody>
                {s._roster.fb.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td className="num">{r.count}</td>
                    <td className="num modeled-cell">{moneyRange(r.low, r.high)}</td>
                    <td className="num modeled-cell">{money(r.lineMid)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>Football rollup</td>
                  <td className="num">{s._roster.footballSeats}</td>
                  <td />
                  <td className="num modeled-cell">{money(s._roster.rollup.fbMid)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="roster-hed">Men’s basketball</h3>
            <table className="roster">
              <thead>
                <tr>
                  <th>Slot</th>
                  <th className="num">Roster spots</th>
                  <th className="num">Band / spot</th>
                  <th className="num">Row total</th>
                </tr>
              </thead>
              <tbody>
                {s._roster.mbb.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td className="num">{r.count}</td>
                    <td className="num modeled-cell">{moneyRange(r.low, r.high)}</td>
                    <td className="num modeled-cell">{money(r.lineMid)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>MBB rollup</td>
                  <td className="num">{s._roster.mbbSeats}</td>
                  <td />
                  <td className="num modeled-cell">{money(s._roster.rollup.mbbMid)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <p className="fine">
          {s._roster.notes} Other / unallocated midpoint {money(s._roster.rollup.otherMid)}.
          FB+MBB rollup {moneyRange(s._roster.rollup.low, s._roster.rollup.high)} (mid {money(s._roster.rollup.mid)}).
        </p>
      </section>
      ) : null}

      {s._named?.players?.length ? (
        <section>
          <h2 title={defTitle('rosterNamed')}>Roster {s._named.namesOnly ? null : <i className="dot modeled" />}</h2>
          <p className="lede tight">
            {s._named.namesOnly
              ? `Public ${season} football names from the ESPN team roster. No modeled NIL share — this season has names but no school modeled midpoint.`
              : s.nil.modeled?.era === 'collective'
                ? `Public ${season} football names, each a modeled share of this school’s collective-era football slice (third-party × Opendorse year factor). Player cells are modeled, year-scaled, not a filing. Starters on a verified Wikipedia two-deep sit at the high end of the position band; backups at the low end; everyone else is the midpoint. Sorted by modeled high. Booked school NIL stays official — no named booked dollars unless a public file names the athlete.`
                : `Public ${season} football names, each a modeled share of this school’s football slice of the 93% pot. Starters on a verified Wikipedia two-deep sit at the high end of the position band; backups at the low end; everyone else is the midpoint. Sorted by modeled high. Booked school NIL is unchanged.`}
          </p>
          <div className="table-scroll named-scroll">
            <table className="roster named">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>Class</th>
                  <th className="num">Modeled</th>
                </tr>
              </thead>
              <tbody>
                {s._named.players.map((p) => (
                  <tr key={`${p.name}-${p.jersey}-${p.pos}`}>
                    <td>
                      {p.name}{' '}
                      <i className={`dot ${p.confidence}`} title={p.note} />
                    </td>
                    <td>{p.pos || '—'}</td>
                    <td>{p.className || p.class || '—'}</td>
                    <td className="num modeled-cell">{p.low == null ? '—' : moneyRange(p.low, p.high)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine">
            {s._named.notes}
            {s._named.namesOnly ? '' : ` Player-mid sum ${money(s._named.sumMid)} of football slice ${money(s._named.cap)}${s._named.scale < 1 ? ` (scaled ×${s._named.scale.toFixed(2)} to stay inside the pot)` : ''}.`}
            {s._named.depthMatched
              ? ` ${s._named.depthMatched} names matched a ${s._named.wikiYear} Wikipedia two-deep.`
              : (s._named.namesOnly ? '' : ' No verified two-deep for this school — every listed range is a position-band midpoint.')}
          </p>
          <p className="fine">
            Roster source:{' '}
            <a href={s._named.sourceUrl} target="_blank" rel="noreferrer">ESPN {season} football roster ↗</a>
            {s._named.wikiUrl && (
              <>
                {' '}· Depth:{' '}
                <a href={s._named.wikiUrl} target="_blank" rel="noreferrer">
                  Wikipedia {s._named.wikiYear} team page ↗
                </a>
              </>
            )}
          </p>
        </section>
      ) : (
        <section>
          <h2>Roster</h2>
          <p className="lede tight">No verified public football roster names on the desk for this school.</p>
        </section>
      )}

      <div className="two-col">
        <section>
          <h2>Football coach</h2>
          <div className="coach-name">{s.coaches.football.name}</div>
          <ContractLink url={s.coaches.football.contractUrl} label={s.coaches.football.term?.source} />
          <div className="eyebrow" title={defTitle('coachPay')}>Annual pay</div>
          <CoachPayField pay={s.coaches.football.pay} />
          <div className="eyebrow" title={defTitle('coachTerm')}>Contract term</div>
          <TermBlock term={s.coaches.football.term} />
          {s.coaches.football.buyout?.rule && (
            <>
              <div className="eyebrow" title={defTitle('buyout')}>Buyout rule</div>
              <BuyoutRuleLine buyout={s.coaches.football.buyout} />
            </>
          )}
          <div className="eyebrow" title={defTitle('buyout')}>Buyout overhang (not yearly spend)</div>
          <Field field={s.coaches.football.buyout} />
          <IncentiveList items={s.coaches.football.pay?.incentives} />
          <ContractFiles files={s.coaches.football.contract?.files} />
        </section>
        <section>
          <h2>Men’s basketball coach</h2>
          <div className="coach-name">{s.coaches.mbb.name}</div>
          <ContractLink url={s.coaches.mbb.contractUrl} label={s.coaches.mbb.term?.source} />
          <div className="eyebrow" title={defTitle('coachTerm')}>Contract term</div>
          <TermBlock term={s.coaches.mbb.term} />
          <div className="eyebrow" title={defTitle('coachPay')}>Annual pay</div>
          <Field field={s.coaches.mbb.pay} />
          <div className="eyebrow" title={defTitle('buyout')}>Buyout overhang</div>
          <Field field={s.coaches.mbb.buyout} />
        </section>
      </div>

      <StaffSection school={s} season={season} />

      <Layers school={s} />

      <TvContracts school={s} season={season} />

      <section>
        <h2 title={defTitle('tape')}>Desk tape</h2>
        <p className="lede tight">
          Filings that moved a Public Cap figure for this school. Not a news feed.
        </p>
        {deskTape.length ? (
          <TapeItems items={deskTape} season={season} showSchool={false} />
        ) : (
          <p className="lede tight">{EMPTY_TAPE}</p>
        )}
      </section>

      <section>
        <h2>Sources</h2>
        <ol className="sources">
          {sources.map((src, i) => (
            <li key={i}>
              <span className={`conf-label ${src.confidence}`}>{src.confidence}</span>{' '}
              {src.asOf && <span>{src.asOf}{src.fiscalYear ? ` · ${src.fiscalYear}` : ''} — </span>}
              <a href={src.url} target="_blank" rel="noreferrer">{src.source}</a>
              {src.notes && <div className="field-notes">{src.notes}</div>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
