import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { money, moneyExact, moneyRange, earn, pct, coachTermLabel, contractLinkLabel } from '../lib/format.js'
import {
  collectSources,
  collective990Cells,
  hasVal,
  isItem44Field,
  ITEM44_COMPANION_EYEBROW,
  ITEM44_COMPANION_LEDE,
  leadBookedNil,
  leadHouseRemaining,
} from '../lib/compute.js'
import {
  rosterEstimateCites,
  rosterEstimateDisplay,
  ROSTER_ESTIMATE_HASH,
} from '../lib/rosterEstimate.js'
import {
  industryPositionEstimates,
  positionEstimateCites,
  POSITION_ESTIMATE_HASH,
} from '../lib/positionEstimate.js'
import {
  footballRosterStack,
  reportedBarBreakdown,
  reportedNilBar,
  REPORTED_BAR_HASH,
  stackFormula,
  stackPositionRows,
} from '../lib/rosterStack.js'
import NilReportedBar from '../components/NilReportedBar.jsx'
import Logo from '../components/Logo.jsx'
import { defTitle } from '../lib/definitions.js'
import { earningsBack } from '../lib/earningsBack.js'
import Layers from '../components/Layers.jsx'
import SeasonPicker from '../components/SeasonPicker.jsx'
import CapacityWaterfall from '../components/CapacityWaterfall.jsx'
import HidePendingToggle, { readHidePending, writeHidePending } from '../components/HidePendingToggle.jsx'
import { houseValueForSeason } from '../lib/seasons.js'
import { EMPTY_TAPE, tapeForSchool } from '../lib/tape.js'
import TapeItems from '../components/TapeItems.jsx'
import TvContracts from '../components/TvContracts.jsx'
import { GuaranteeSchoolSection } from './GuaranteeGames.jsx'
import { hashKey, homePath, isSchoolDrill } from '../lib/share.js'
import NamedRoster from '../components/NamedRoster.jsx'
import { buildSchoolNilHistory, fetchRosterBooks } from '../lib/nilHistory.js'
import AlumniToggle from '../components/AlumniToggle.jsx'
import { ContractFiles } from '../components/ContractFiles.jsx'
import { BuyoutRuleLine, BuyoutStepTape, CoachPayField, IncentiveList } from '../components/CoachPay.jsx'

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

function staffLede(year, staff) {
  if (year >= 2021 && year <= 2024) {
    const asOf =
      staff?.footballAssistantPool?.asOf ||
      staff?.assistants?.find((a) => a.pay?.asOf)?.pay?.asOf
    const asOfBit = asOf ? ` (as of ${asOf})` : ''
    return `Football assistant dollars are the USA TODAY ${year} contract year${asOfBit}, not a current 2026 salary. Named assistants are that year’s team-page table. Titles are not invented.`
  }
  if (year === 2025) {
    return 'No year-accurate 2025 football staff tape on the desk. We do not show the 2026 official directory or 2024 USA TODAY dollars as 2025.'
  }
  if (year === 2026) {
    return 'Official 2026 athletics directory (names and roles). Assistant pay is pending unless a cited 2026 dollar exists. USA TODAY 2021–2024 assistant pay lives on those years only.'
  }
  return `No year-accurate football staff tape on the desk for ${year}.`
}

function staffEmptyAssistants(year) {
  if (year >= 2021 && year <= 2024) {
    return `USA TODAY ${year} assistant table listed no names, or every Total Pay cell was withheld (private / exempt schools stay pending).`
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
      <p className="lede tight">{staffLede(year, staff)}</p>
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
          {ad?.name && <div className="coach-name">{ad.name}</div>}
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
        <p className="fine desk-empty">No cited WBB / Olympic-sport head-coach pay on the desk for this school.</p>
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
        <p className="fine desk-empty">{staffEmptyAssistants(year)}</p>
      )}
      {pool?.value != null && (
        <p className="fine">
          {year >= 2021 && year <= 2024 ? `${year} USA TODAY football assistant staff total` : 'Football assistant staff total'}{' '}
          {moneyExact(pool.value)}
          {' '}({pool.confidence}, as of {pool.asOf}
          {year >= 2021 && year <= 2024 ? ` · ${year} contract year` : ''}).{' '}
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

function Collective990Lane({ cells }) {
  const newestFirst = [...cells].sort((a, b) => (b.taxYear || 0) - (a.taxYear || 0))
  return (
    <div className="collective-990">
      <div className="eyebrow" title={defTitle('nilCollective990')}>Collective 990 payout (third-party filing)</div>
      {!cells.length ? (
        <div className="field pending-box desk-empty">
          <div className="field-val">Pending</div>
          <div className="field-meta">
            No public collective Form 990 on the desk. Empty means we looked — not that payout is zero.
          </div>
        </div>
      ) : null}
      {newestFirst.map((cell) => (
        <div className="field" key={`${cell.ein || cell.organization}-${cell.taxYear}-${cell.value}`}>
          <div className="field-val">
            {cell.value == null ? 'Pending' : moneyExact(cell.value)} <i className={`dot ${cell.confidence || 'reported'}`} />
          </div>
          <div className="field-meta">
            {cell.taxYear && <span>tax year {cell.taxYear} · </span>}
            {cell.taxPeriodEnd && <span>period ended {cell.taxPeriodEnd} · </span>}
            {cell.organization && <span>{cell.organization}</span>}
            {cell.ein && <span> · EIN {cell.ein}</span>}
            {cell.asOf && <span> · as of {cell.asOf}</span>}
            {cell.confidence && <span> · <span className="conf-label">{cell.confidence}</span></span>}
          </div>
          {cell.line && <div className="field-notes">{cell.line}</div>}
          {cell.source && <div className="field-notes">{cell.source}</div>}
          {cell.url && (
            <div className="field-meta">
              <a className="ext" href={cell.url} target="_blank" rel="noreferrer">ProPublica / 990 ↗</a>
            </div>
          )}
          {cell.notes && <div className="field-notes">{cell.notes}</div>}
        </div>
      ))}
      <p className="collective-990-foot">
        {!cells.length
          ? 'Collective 990 payout is a third-party Form 990 lane — lagged, not a House spent total, not Item 44, and not a player contract. Empty means pending.'
          : cells.some((c) => /501\(c\)\(6\)/i.test(`${c.notes || ''} ${c.source || ''}`))
            ? 'This is a third-party Form 990 (a 501(c)(6) business-league return, not a 501(c)(3)). The return is lagged. It is not a House spent total, not Item 44, and not a player contract.'
            : 'This is a third-party 501(c)(3) Form 990. The return is lagged. It is not a House spent total, not Item 44, and not a player contract.'}
        {' '}These dollars are not added to booked NIL, pre-cap, capacity, or the booked-only rank.
        Position allocation stays on booked-then-modeled only.
      </p>
    </div>
  )
}

function IndustryRosterEstimateLane({ school, leftoverPending, schoolName, season }) {
  const offYear = season != null && season !== 2026
  const stack = offYear ? null : footballRosterStack(school)
  const survey = stack?.survey
  const modeled = stack?.modeled
  const display = survey ? rosterEstimateDisplay(survey) : modeled?.display
  const cites = rosterEstimateCites(survey)
  if (!stack || !display) {
    return (
      <section id={`slice-${ROSTER_ESTIMATE_HASH}`} className="desk-may-empty">
        <h2 title={defTitle('industryRosterEstimate')}>
          Industry football roster estimate
        </h2>
        <p className="lede tight">
          Labeled modeled / survey — not booked NIL and not House spent.
          Leftover still only exists when House spent is booked.
        </p>
        <div className="field pending-box desk-empty">
          <div className="field-val">{offYear ? '2026 survey only' : 'No defensible public input'}</div>
          <div className="field-meta">
            {offYear
              ? `The CBS / SI industry football roster stack is a 2026 cell. Switch to 2026 to see the survey or the SI conference-median model.`
              : `No CBS / SI survey cell and no cited conference median for ${schoolName}. Empty is not zero.`}
          </div>
        </div>
      </section>
    )
  }
  const laneLabel = stack.lane === 'survey'
    ? (survey.kind === 'range' ? 'Survey range (not a filing)' : 'Survey tier (not a filing)')
    : 'Modeled range (not a filing)'
  return (
    <section id={`slice-${ROSTER_ESTIMATE_HASH}`}>
      <h2 title={defTitle('industryRosterEstimate')}>
        Industry football roster estimate <i className="dot modeled" />
      </h2>
      <p className="lede tight">
        {stack.lane === 'survey' ? 'Labeled survey' : 'Labeled modeled'} — not booked NIL and not House spent.
        Combines football’s share of institutional revenue-share plus third-party NIL.
        Not a school filing. Do not subtract from capacity or leftover.
        {leftoverPending
          ? ` The desk does not have a booked ${schoolName} House spent total. Leftover still only exists when House spent is booked.`
          : ' Leftover on this page is still House cap minus booked House spent, not this stack.'}
      </p>
      <div className="range-box">
        <div>
          <div className="eyebrow">{laneLabel}</div>
          <div className="display sm modeled-cell">{display}</div>
        </div>
        {survey?.qualifier ? (
          <div>
            <div className="eyebrow">Survey qualifier</div>
            <div className="display sm modeled-cell">{survey.qualifier}</div>
          </div>
        ) : null}
        {stack.lane === 'survey' && survey?.kind === 'tier' && stack.allocation ? (
          <div>
            <div className="eyebrow">Modeled allocation range (positions)</div>
            <div className="display sm modeled-cell">{stack.allocation.display}</div>
          </div>
        ) : null}
      </div>
      <p className="field-notes">{survey?.notes}</p>
      <p className="fine">
        <strong>Formula.</strong> {stackFormula(stack)}
      </p>
      {cites.length ? (
        <p className="fine">
          {cites.map((c, i) => (
            <span key={c.url || i}>
              {i > 0 ? ' · ' : 'Sources: '}
              {c.url ? (
                <a className="ext" href={c.url} target="_blank" rel="noreferrer">{c.source} ↗</a>
              ) : (
                c.source
              )}
            </span>
          ))}
        </p>
      ) : modeled?.url ? (
        <p className="fine">
          Source:{' '}
          <a className="ext" href={modeled.url} target="_blank" rel="noreferrer">{modeled.source} ↗</a>
        </p>
      ) : null}
    </section>
  )
}

function NilReportedBarLane({ school, leftoverPending, schoolName, season }) {
  const offYear = season != null && season !== 2026
  const bar = offYear ? null : reportedNilBar(school)
  const breakdown = offYear ? [] : reportedBarBreakdown(school)
  if (!bar) {
    return (
      <section id={`slice-${REPORTED_BAR_HASH}`} className="desk-may-empty">
        <h2 title={defTitle('nilReportedBar')}>NIL reported bar</h2>
        <p className="lede tight">
          Comparable industry / survey or modeled football-stack range — not booked NIL and not House spent.
        </p>
        <div className="field pending-box desk-empty">
          <div className="field-val">{offYear ? '2026 bar only' : 'No defensible public input'}</div>
          <div className="field-meta">
            {offYear
              ? `The comparable NIL reported bar is a 2026 cell. Switch to 2026 to see every Power 4 + Notre Dame school on the same $0–$50M scale.`
              : `${schoolName} has no football stack to plot. Empty is not zero.`}
          </div>
        </div>
      </section>
    )
  }
  return (
    <section id={`slice-${REPORTED_BAR_HASH}`}>
      <h2 title={defTitle('nilReportedBar')}>
        NIL reported bar <i className="dot modeled" />
      </h2>
      <p className="lede tight">
        {bar.lane === 'survey' ? 'Labeled survey' : 'Labeled modeled'} band
        {' '}({bar.rangeDisplay}
        {bar.lane === 'survey' && bar.kind === 'tier' ? ` allocation of ${bar.display}` : ''})
        {' '}— rev-share + third-party NIL. Not booked NIL and not House spent.
        Same $0–${Math.round(bar.max / 1_000_000)}M scale on every Power 4 + Notre Dame page.
        {leftoverPending
          ? ` Leftover still only exists when House spent is booked — this bar does not create leftover.`
          : ' Leftover on this page is still House cap minus booked House spent, not this bar.'}
      </p>
      <NilReportedBar bar={bar} />
      <p className="fine">
        <strong>Scale.</strong> {bar.scaleNote}
        {' '}
        <Link to="/reported-nil">Compare reported NIL by school on the Power 4 board</Link>.
      </p>
      {breakdown.length ? (
        <>
          <div className="eyebrow">Position salary ranges under the bar (modeled / range)</div>
          <table className="nil-reported-breakdown">
            <thead>
              <tr>
                <th>Position</th>
                <th className="num">Starter range</th>
                <th>Mark</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((r) => (
                <tr key={r.family}>
                  <td>{r.label}</td>
                  <td className="num modeled-cell">{r.starterDisplay}</td>
                  <td>
                    {r.surveyDisplay
                      ? `${r.surveyDisplay}${r.surveyMark === 'reported-estimate' ? ' · reported-estimate' : ' · survey'}`
                      : 'modeled / range'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  )
}

function IndustryPositionEstimatesLane({ school, leftoverPending, schoolName, season }) {
  const offYear = season != null && season !== 2026
  const stack = offYear ? null : footballRosterStack(school)
  const rows = offYear ? [] : stackPositionRows(school)
  const citedField = industryPositionEstimates(school)
  if (!rows.length) {
    return (
      <section id={`slice-${POSITION_ESTIMATE_HASH}`} className="desk-may-empty">
        <h2 title={defTitle('industryPositionEstimate')}>
          Industry estimate by position
        </h2>
        <p className="lede tight">
          Labeled modeled / survey — industry estimate, not a contract.
          Not booked NIL and not House spent.
        </p>
        <div className="field pending-box desk-empty">
          <div className="field-val">{offYear ? '2026 stack only' : 'No defensible public input'}</div>
          <div className="field-meta">
            {offYear
              ? `Position approximates are a 2026 cell. Switch to 2026 to see modeled seat shares of the football stack.`
              : `${schoolName} has no football stack to split. Empty is not zero.`}
          </div>
        </div>
      </section>
    )
  }
  return (
    <section id={`slice-${POSITION_ESTIMATE_HASH}`}>
      <h2 title={defTitle('industryPositionEstimate')}>
        Industry estimate by position <i className="dot modeled" />
      </h2>
      <p className="lede tight">
        Modeled starter / backup ranges split this school’s football stack
        ({stack.lane === 'survey' ? `survey ${stack.display}` : `modeled ${stack.display}`})
        by the existing rate-card seat weights (QB1 = 100). Industry estimate, not a contract.
        A CBS / SI position band, when one exists, is preferred and labeled survey or reported-estimate.
        Named-player deals are not booked as contracts.
        {leftoverPending
          ? ` Leftover still only exists when House spent is booked.`
          : ' Leftover on this page is still House cap minus booked House spent, not this stack.'}
      </p>
      <p className="fine">
        <strong>Formula.</strong> {stack.allocation?.formula} Starter and backup are ranges, not a point estimate.
      </p>
      <table className="roster">
        <thead>
          <tr>
            <th>Position</th>
            <th className="num">Starter (modeled)</th>
            <th className="num">Backup (modeled)</th>
            <th>Survey / reported-estimate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.family}>
              <td>{r.label}</td>
              <td className="num modeled-cell">{r.starterDisplay}</td>
              <td className="num modeled-cell">{r.backupDisplay}</td>
              <td>
                {r.surveyDisplay
                  ? `${r.surveyDisplay}${r.surveyMark === 'reported-estimate' ? ' · reported-estimate' : ' · survey'}`
                  : 'no survey band'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {citedField?.notes ? <p className="field-notes">{citedField.notes}</p> : null}
      {citedField
        ? (
          <p className="fine">
            {citedField.positions.flatMap((r) => positionEstimateCites(r)).map((c, i) => (
              <span key={`${c.url || c.source}-${i}`}>
                {i > 0 ? ' · ' : 'Survey sources: '}
                {c.url ? (
                  <a className="ext" href={c.url} target="_blank" rel="noreferrer">{c.source} ↗</a>
                ) : (
                  c.source
                )}
              </span>
            ))}
          </p>
        )
        : null}
    </section>
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
        {field.url && (
          <span>
            {' '}
            ·{' '}
            <a className="ext" href={field.url} target="_blank" rel="noreferrer">
              filing ↗
            </a>
          </span>
        )}
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

export default function School({ schools, meta, season, setSeason, includeAlumni, setIncludeAlumni, tape, rawSchools }) {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const didScroll = useRef(false)
  const [rosterBooks, setRosterBooks] = useState(null)
  const [hidePending, setHidePending] = useState(readHidePending)
  const s = schools.find((x) => x.id === id)
  const openRaw = hashKey(location.hash)
  const open = isSchoolDrill(openRaw) ? openRaw : ''

  useEffect(() => {
    let cancelled = false
    fetchRosterBooks().then((books) => {
      if (!cancelled) setRosterBooks(books)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const history = useMemo(() => {
    if (!rawSchools || !rosterBooks || !id) return null
    return buildSchoolNilHistory(rawSchools, meta, id, rosterBooks)
  }, [rawSchools, meta, id, rosterBooks])

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

  function setHidePendingPref(on) {
    setHidePending(on)
    writeHidePending(on)
  }

  if (!s) return <div className="page-wrap"><p>School not on the desk.</p></div>
  const cap = s._cap
  const house = houseValueForSeason(meta, season)
  const houseField = s._houseField
  const spec = s._season
  const nil = s._ratios.nil
  const leftoverLead = leadHouseRemaining(s)
  const rosterStack = season === 2026 ? footballRosterStack(s) : null
  const sources = collectSources(s, meta)
  const deskTape = tapeForSchool(tape, s.id)

  return (
    <div className={`page-wrap school${hidePending ? ' hide-pending' : ''}`}>
      <p className="crumb"><Link to={homePath({ season, includeAlumni })}>Rank list</Link> / {s.name}</p>
      <div className="school-tools">
        <SeasonPicker season={season} onChange={setSeason} id="school-season" />
        <AlumniToggle on={includeAlumni} onChange={setIncludeAlumni} id="school-alumni" />
        <HidePendingToggle on={hidePending} onChange={setHidePendingPref} id="school-hide-pending" />
        <span className="season-note">{spec?.academic} · football {season}</span>
      </div>
      <header className="school-hed">
        <Logo school={s} size={72} className="logo-lg" />
        <div>
          <div className="kicker">{s.conference} · {s.city}{s.private ? ' · private' : ''}</div>
          <h1>{s.name}</h1>
          <p className="lede school-dek">
            {s.revenueGap || s.private
              ? `${s.name} football revenue on this desk is the booked capacity stack from public filings — not a full athletic-revenue total. Private tickets, sponsorships, and contributions stay pending.`
              : `Two ceilings, then booked NIL: the House benefits cap versus what ${s.name} can actually write this year from public filings (annual capacity — not total athletic revenue).`}
            {' '}Booked NIL is the official institutional number when a filing exists — the public stand-in for an NIL budget.
            {' '}Collective 990 payout is a separate cited lane, not House.
            {' '}An industry football roster estimate is a labeled modeled / survey lane — not booked NIL, not House spent, and not leftover. A named CBS/SI cell is survey; otherwise the SI conference-median range is modeled.
            {' '}The NIL reported bar plots that same range on one $0–$50M scale so schools can be compared. Booked NIL and House spent stay separate marks.
            {' '}<Link to="/reported-nil">Compare reported NIL by school</Link> for every Power 4 football roster stack.
            {' '}Student fees on this desk are not tuition.
            {' '}Pending stays empty.
          </p>
          <p className="lane-status">
            <span>Capacity <b>booked stack</b></span>
            <span>House cap <b>{house == null ? 'none (pre-settlement)' : season >= 2026 ? '2026–27' : '2025–26'}</b></span>
            <span>Booked NIL <b>{leadBookedNil(s).value != null ? 'cited' : 'pending'}</b></span>
            <span>Collective payout <b>{collective990Cells(s).some((c) => c.value != null) ? 'cited' : 'pending'}</b></span>
            <span>Industry roster estimate <b>{rosterStack ? rosterStack.lane : 'pending'}</b></span>
            <span>NIL reported bar <b>{rosterStack ? rosterStack.lane : 'pending'}</b></span>
          </p>
          {s.revenueGap && <p className="gap-banner">Revenue gap: private-school tickets, sponsorships, and contributions are not on the public MFRS tape.</p>}
        </div>
        <div className="hero-num">
          {leftoverLead.value != null ? (
            <>
              <div className="eyebrow" title={defTitle('houseRemaining')}>
                Leftover{leftoverLead.label ? ` · ${leftoverLead.label}` : leftoverLead.field?.partialYear ? ' · YTD' : ''}
              </div>
              <div className="display">{money(leftoverLead.value)}</div>
              <div className="eyebrow">House remaining · booked</div>
            </>
          ) : (
            <>
              <div className="eyebrow">{includeAlumni ? 'Annual capacity' : 'Annual capacity · booked only'}</div>
              <div className="display">{money(includeAlumni ? cap.total : cap.booked)}</div>
              {includeAlumni ? (
                <div className="eyebrow">range {money(cap.totalLow)}–{money(cap.totalHigh)}</div>
              ) : (
                <div className="eyebrow">extra alumni excluded</div>
              )}
            </>
          )}
        </div>
      </header>

      <CapacityWaterfall
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
        <h2 title={defTitle('nil')}>Booked NIL</h2>
        <p className="lede tight">
          Official institutional NIL when a FOIA, MFRS, or counsel filing exists — the public stand-in for an NIL budget.
          Collective 990 payout is a separate cited lane below. Empty means pending, not zero.
        </p>
        {isItem44Field(s.nil.booked) && (
          <>
            <div className="eyebrow">{ITEM44_COMPANION_EYEBROW}</div>
            <p className="lede tight">{ITEM44_COMPANION_LEDE}</p>
          </>
        )}
        <Field field={s.nil.booked} fallback="Empty / pending. FOIA, MFRS institutional NIL, or counsel spent totals only. Official House / Item 44 number when it exists. Collective 990 is a separate lane below." />
        {hasVal(s.nil.preCap) && (
          <div className="subfield">
            <div className="eyebrow">{ITEM44_COMPANION_EYEBROW}</div>
            <p className="lede tight">{ITEM44_COMPANION_LEDE}</p>
            <Field field={s.nil.preCap} />
          </div>
        )}
        {s.nil.houseRemaining && s.nil.houseRemaining.value != null && (
          <div className="subfield house-remaining">
            <div className="eyebrow" title={defTitle('houseRemaining')}>
              {s.nil.houseRemaining.overhang
                ? 'House Year 1 overhang'
                : s.nil.houseRemaining.partialYear
                  ? 'House Year 1 remaining (YTD)'
                  : 'House Year 1 remaining'}
            </div>
            <Field field={s.nil.houseRemaining} />
            {s.nil.houseRemaining.footnote && (
              <p className="fine">{s.nil.houseRemaining.footnote}</p>
            )}
          </div>
        )}
        <Collective990Lane cells={collective990Cells(s)} />
        <div className="ratio-row">
          <div><span className="eyebrow">NIL ÷ capacity</span><strong>{pct(s._ratios.nilOverCapacity)}</strong></div>
          <div><span className="eyebrow">{house == null ? 'NIL ÷ House' : (season >= 2026 ? 'NIL ÷ House 2026–27' : 'NIL ÷ House 2025–26')}</span><strong>{house == null ? '—' : pct(s._ratios.nilOverHouse)}</strong></div>
          {houseField?.notes && (
            <div><span className="eyebrow">House note</span><strong className="house-note">{house == null ? 'No House cap (pre-settlement)' : houseField.confidence}</strong></div>
          )}
        </div>
        {isItem44Field(s.nil.booked) && (
          <p className="fine">
            NIL ratios on this season use the FY2025 MFRS Item 44 institutional line — not House Year 1 spent and not total/collective NIL.
          </p>
        )}
      </section>

      <IndustryRosterEstimateLane
        school={s}
        leftoverPending={leftoverLead.value == null}
        schoolName={s.name}
        season={season}
      />

      <NilReportedBarLane
        school={s}
        leftoverPending={leftoverLead.value == null}
        schoolName={s.name}
        season={season}
      />

      <IndustryPositionEstimatesLane
        school={s}
        leftoverPending={leftoverLead.value == null}
        schoolName={s.name}
        season={season}
      />

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
      <section className="desk-may-empty">
        <h2 title={defTitle('nilModeled')}>NIL modeled range</h2>
        <p className="lede tight desk-empty">
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
          Position rate card, not player contracts. Slots are labeled QB1 / WR1 / EDGE — starter vs backup units on the existing seat card, labeled modeled. We do not replace these bands with invented industry salaries. Cited CBS / SI position bands, when they exist, sit in the industry-estimate-by-position lane above. Named football players below are a second cut of the same card — not extra money. Football 85 + MBB 13 scale into 93% of this school’s modeled midpoint.
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

      <NamedRoster
        school={s}
        season={season}
        open={open}
        onToggle={setOpen}
        includeAlumni={includeAlumni}
        history={history}
      />

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
          <BuyoutStepTape steps={s.coaches.football.buyout?.steps} />
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

      <Layers school={s} open={open} onToggle={setOpen} />

      <TvContracts school={s} season={season} />

      <GuaranteeSchoolSection schoolId={s.id} season={season} />

      <section className={deskTape.length ? undefined : 'desk-may-empty'}>
        <h2 title={defTitle('tape')}>Desk tape</h2>
        <p className="lede tight">
          Filings that moved a Public Cap figure for this school. Not a news feed.
        </p>
        {deskTape.length ? (
          <TapeItems items={deskTape} season={season} showSchool={false} />
        ) : (
          <p className="lede tight desk-empty">{EMPTY_TAPE}</p>
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
