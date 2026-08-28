import { money, moneyExact, winsPerM } from '../lib/format.js'
import { defTitle } from '../lib/definitions.js'
import DrillNote, { DrillClose } from './DrillNote.jsx'
import { debtHeadline, enrollmentHeadcount, impliedFeePerStudent, publishedFeeTimesEnrollment } from '../lib/layers.js'

function Meta({ field }) {
  if (!field) return null
  return (
    <div className="field-meta">
      {field.fiscalYear && <span>{field.fiscalYear} · </span>}
      {field.asOf && <span>as of {field.asOf} · </span>}
      {field.confidence && <span className="conf-label">{field.confidence}</span>}
      {field.source && <span> · {field.source}</span>}
      {field.url && (
        <>
          {' '}
          <a className="ext" href={field.url} target="_blank" rel="noreferrer">source ↗</a>
        </>
      )}
    </div>
  )
}

function MoneyField({ field, fallback = 'Pending' }) {
  if (!field || field.value == null) {
    return (
      <div className="field pending-box">
        <div className="field-val">{fallback}</div>
        <div className="field-meta">{field?.notes || 'No cited number on the desk.'}</div>
      </div>
    )
  }
  return (
    <div className="field">
      <div className="field-val">
        {moneyExact(field.value)} <i className={`dot ${field.confidence}`} />
      </div>
      <Meta field={field} />
      {field.notes && <div className="field-notes">{field.notes}</div>}
    </div>
  )
}

function PortalTable({ rows, dir }) {
  if (!rows?.length) return null
  return (
    <table className="roster staff-table">
      <thead>
        <tr>
          <th>Player</th>
          <th>Pos</th>
          <th>{dir === 'in' ? 'From' : 'To'}</th>
          <th>Dollars</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={`${dir}-${p.name}-${p.pos}`}>
            <td>
              {p.name} <i className={`dot ${p.confidence || 'reported'}`} title={p.notes} />
            </td>
            <td>{p.pos || '—'}</td>
            <td>{(dir === 'in' ? p.from : p.to) || '—'}</td>
            <td>
              {p.dollars != null ? (
                moneyExact(p.dollars)
              ) : (
                <span className="pending-cell" title="No cited deal dollar">modeled / none</span>
              )}
              {p.url && (
                <div className="field-meta">
                  <a className="ext" href={p.url} target="_blank" rel="noreferrer">{p.source ? 'source ↗' : 'source ↗'}</a>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PortalSection({ layer }) {
  const p = layer?.portal
  if (!p) return null
  const adds = p.additions || []
  const deps = p.departures || []
  return (
    <section>
      <h2 title={defTitle('portal')}>Transfer portal · 2026 cycle</h2>
      <p className="lede tight">
        Notable football additions and departures for the NCAA’s single window
        (Jan 2–16, 2026). Names from public Wikipedia / NCAA.com / FOX / CBS / school pages.
        Dollars only if a cited news number exists — otherwise name + position, no dollar.
        We do not scrape On3.
      </p>
      <div className="ratio-row">
        <div>
          <span className="eyebrow">In (cited count)</span>
          <strong>{p.inCount?.value != null ? p.inCount.value : '—'}</strong>
          <Meta field={p.inCount} />
        </div>
        <div>
          <span className="eyebrow">Out (cited count)</span>
          <strong>{p.outCount?.value != null ? p.outCount.value : '—'}</strong>
          <Meta field={p.outCount} />
        </div>
      </div>
      <div className="roster-split">
        <div>
          <h3 className="roster-hed">Additions</h3>
          {adds.length ? <PortalTable rows={adds} dir="in" /> : <p className="fine">No notable incoming names extracted on this desk.</p>}
        </div>
        <div>
          <h3 className="roster-hed">Departures</h3>
          {deps.length ? <PortalTable rows={deps} dir="out" /> : <p className="fine">No notable outgoing names extracted on this desk.</p>}
        </div>
      </div>
      {p.notes && <p className="fine">{p.notes}</p>}
    </section>
  )
}

function ApparelSection({ layer }) {
  const a = layer?.apparel
  if (!a) return null
  const naming = a.naming || []
  return (
    <section>
      <h2 title={defTitle('apparel')}>Apparel + naming rights</h2>
      <p className="lede tight">
        Outfitter and stadium / facility names. Annual dollars only when a Sportico,
        Athletic, FOIA, or local-paper story cites one.
      </p>
      <div className="short-stack">
        <div>
          <div className="eyebrow">Apparel</div>
          {a.brand?.value ? (
            <div className="field">
              <div className="field-val">
                {a.brand.value} <i className={`dot ${a.brand.confidence}`} />
              </div>
              <Meta field={a.brand} />
            </div>
          ) : (
            <div className="field pending-box">
              <div className="field-val">Outfitter pending</div>
              <div className="field-meta">{a.brand?.notes || 'No cited current brand on the desk.'}</div>
            </div>
          )}
        </div>
        <div>
          <div className="eyebrow">Apparel annual value</div>
          <MoneyField field={a.annualValue} fallback="Pending" />
        </div>
      </div>
      <h3 className="roster-hed">Naming deals</h3>
      {naming.length ? (
        <table className="roster staff-table">
          <thead>
            <tr>
              <th>Facility</th>
              <th>Sponsor</th>
              <th className="num">Annual</th>
              <th>Term</th>
            </tr>
          </thead>
          <tbody>
            {naming.map((n) => (
              <tr key={`${n.facility}-${n.sponsor}`}>
                <td>{n.facility}</td>
                <td>{n.sponsor}</td>
                <td className="num">
                  {n.annualValue != null ? (
                    <>
                      {money(n.annualValue)} <i className={`dot ${n.confidence}`} />
                    </>
                  ) : (
                    <span className="pending-cell">pending</span>
                  )}
                  {n.url && (
                    <div className="field-meta">
                      <a className="ext" href={n.url} target="_blank" rel="noreferrer">source ↗</a>
                    </div>
                  )}
                </td>
                <td>{n.term || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="fine">No cited stadium or facility naming deal on the desk.</p>
      )}
      {a.notes && <p className="fine">{a.notes}</p>}
    </section>
  )
}

function SubsidySection({ school }) {
  const s = school?.layers?.subsidy
  if (!s) return null
  const enrollField = school.alumni?.undergradEnrollment
  const n = enrollmentHeadcount(school)
  const implied = impliedFeePerStudent(s.studentFees, n)
  const published = publishedFeeTimesEnrollment(s.feeRate, n)
  return (
    <section>
      <h2 title={defTitle('subsidy')}>Student fees + institutional subsidy</h2>
      <p className="lede tight">
        Student fees on this desk are the dollars athletics booked from student
        fees in that fiscal year — usually a dedicated athletic fee, or a slice
        of a student activity fee, assessed on top of tuition. Not tuition. Not
        the whole bursar bill. Institutional support is the university writing
        a check or booking indirect support. Government support is the tax or
        state slice when a source splits it; Knight-Newhouse usually rolls that
        into institutional/government. $0 means the filing says self-funded or
        $0 on that line. Empty means pending.
      </p>
      <div className="short-stack">
        <div>
          <div className="eyebrow">Student fees</div>
          <MoneyField field={s.studentFees} />
        </div>
        <div>
          <div className="eyebrow">Institutional support</div>
          <MoneyField field={s.institutionalSupport} />
        </div>
        <div>
          <div className="eyebrow">Government support</div>
          <MoneyField field={s.governmentSupport} />
        </div>
      </div>
      {s.studentFees?.value != null && n != null && (
        <p className="fine">
          {s.studentFees.value === 0
            ? 'The department booked $0 from student fees (self-funded on this line), so implied per-student is $0. We do not invent a fee.'
            : `About ${moneyExact(Math.round(implied))} per undergrad per year — booked student-fee total ÷ enrollment proxy (${n.toLocaleString()}). This is not a published fee schedule; it is the athletics slice of a student fee, not tuition, spread across the student body.`}
          {' '}
          <span className="conf-label">estimated</span>
          {enrollField?.confidence ? ` · enrollment ${enrollField.confidence}` : ''}
        </p>
      )}
      {s.feeRate && (
        <p className="fine">
          Published fee rate {moneyExact(s.feeRate.value)} {s.feeRate.unit}
          {s.feeRate.asOf ? ` · as of ${s.feeRate.asOf}` : ''}.{' '}
          {s.feeRate.url && (
            <a className="ext" href={s.feeRate.url} target="_blank" rel="noreferrer">
              {s.feeRate.source || 'source'} ↗
            </a>
          )}
        </p>
      )}
      {published && (
        <p className="fine">
          {moneyExact(published.rate)} × {published.terms} {published.terms === 2 ? 'semesters' : 'year'} × {published.enrollment.toLocaleString()} undergrads ≈ {moneyExact(published.impliedAnnual)}{' '}
          <span className="conf-label">estimated</span>.
          This is the published athletic fee, not tuition. It is calculated
          (rate × terms × cited enrollment) and does not replace the booked
          student-fee total
          {s.studentFees?.fiscalYear ? ` (${s.studentFees.fiscalYear} still used the prior fee)` : ''}
          {s.studentFees?.notes?.includes('2025–26') || s.studentFees?.notes?.includes('2025-26')
            ? ' — the $200 rate starts 2025–26 / FY2026.'
            : '.'}
        </p>
      )}
      {s.notes && <p className="field-notes">{s.notes}</p>}
    </section>
  )
}

function DebtSection({ school, open, onToggle }) {
  const d = school?.layers?.debt
  if (!d) return null
  const expanded = open === 'debt'
  const head = debtHeadline(d)
  const projects = d.projects || []
  const cited = head.field?.value != null || projects.length > 0
  function toggle() {
    onToggle?.('debt')
  }
  return (
    <section id="slice-debt" className={expanded ? 'debt-sec open' : 'debt-sec'}>
      <h2 title={defTitle('debt')}>Athletics debt</h2>
      <p className="lede tight">
        Athletics facility debt from the NCAA filing or a cited bond/board story —
        not the university’s entire balance sheet, and not part of annual capacity.
        Outstanding is a stock. Annual debt service is this year’s check.
        Click the headline for the breakdown.
      </p>
      <div className="short-stack">
        <div>
          <div className="eyebrow">{head.kind === 'debtService' ? 'Annual debt service' : 'Outstanding athletics-related debt'}</div>
          {head.field?.value != null ? (
            <div
              className={`field debt-head${expanded ? ' open' : ''}`}
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
              onClick={toggle}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggle()
                }
              }}
            >
              <div className="field-val">
                {moneyExact(head.field.value)} <i className={`dot ${head.field.confidence}`} />
              </div>
              <Meta field={head.field} />
              {head.field.notes && <div className="field-notes">{head.field.notes}</div>}
            </div>
          ) : (
            <div
              className={`field pending-box debt-head${expanded ? ' open' : ''}`}
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
              onClick={toggle}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggle()
                }
              }}
            >
              <div className="field-val">Pending</div>
              <div className="field-meta">{d.outstanding?.notes || d.debtService?.notes || 'No cited athletics-related debt figure on the desk.'}</div>
            </div>
          )}
        </div>
      </div>
      {expanded && (
        <div className="drill">
          <p className="drill-kicker">Breakdown</p>
          <div className="eyebrow">Outstanding (stock)</div>
          <DrillNote
            field={d.outstanding}
            empty={d.outstanding?.notes || 'Pending — no cited Category 52 / athletics-related debt stock on the desk.'}
          />
          <div className="eyebrow">Annual debt service (flow)</div>
          <DrillNote
            field={d.debtService}
            empty={d.debtService?.notes || 'Pending — no cited Category 34 / annual facilities debt service on the desk.'}
          />
          <div className="eyebrow">Named stadium / building projects</div>
          {projects.length ? (
            <table className="roster staff-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Kind</th>
                  <th className="num">Announced cost</th>
                  <th className="num">Remaining</th>
                  <th>Through</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={`${p.name}-${p.through || p.source || ''}`}>
                    <td>
                      {p.name} {p.confidence && <i className={`dot ${p.confidence}`} />}
                    </td>
                    <td>{p.kind || '—'}</td>
                    <td className="num">{p.cost != null ? moneyExact(p.cost) : <span className="pending-cell">pending</span>}</td>
                    <td className="num">{p.remaining != null ? moneyExact(p.remaining) : <span className="pending-cell">pending</span>}</td>
                    <td>{p.through || '—'}</td>
                    <td>
                      {p.url ? (
                        <a className="ext" href={p.url} target="_blank" rel="noreferrer">{p.source || 'source'} ↗</a>
                      ) : (
                        p.source || '—'
                      )}
                      {p.notes && <div className="field-notes">{p.notes}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="fine">No named stadium or building project on the desk. We do not invent a project or an amortization schedule.</p>
          )}
          {!cited && (
            <div className="field pending-box">
              <div className="field-val">Pending</div>
              <div className="field-meta">Empty means we looked and do not have a cited athletics-debt figure. $0 would appear only if a filing says $0.</div>
            </div>
          )}
          {d.notes && <p className="field-notes">{d.notes}</p>}
          <DrillClose onClose={() => onToggle?.(null)} />
        </div>
      )}
    </section>
  )
}

function EfficiencySection({ school }) {
  const e = school._eff
  if (!e) return null
  const rec = e.recordSource
  return (
    <section>
      <h2 title={defTitle('winsPerDollar')}>Wins per dollar</h2>
      <p className="lede tight">
        2025 football wins over booked NIL if we have one, else the modeled
        midpoint (labeled modeled), and over annual capacity (booked-only unless
        the alumni toggle is on). Not a coach grade.
      </p>
      <div className="ratio-row">
        <div>
          <span className="eyebrow">2025 football</span>
          <strong>
            {e.wins != null ? `${e.wins}–${e.losses}` : '—'}{' '}
            {rec?.confidence && <i className={`dot ${rec.confidence}`} />}
          </strong>
          <Meta field={rec} />
        </div>
        <div>
          <span className="eyebrow" title={defTitle('winsPerDollar')}>
            Wins / {e.pot?.label || 'NIL'}
          </span>
          <strong className={e.pot?.confidence === 'modeled' ? 'modeled-cell' : ''}>
            {winsPerM(e.winsPerNilPerM)} <span className="fine-inline">W/$M</span>
          </strong>
          <div className="field-meta">
            {e.wins != null && e.pot?.value != null
              ? `${e.wins} wins on ${money(e.pot.value)} ${e.pot.label}`
              : 'Pending NIL denominator.'}
            {e.pot?.confidence === 'modeled' ? ' · modeled' : ''}
          </div>
        </div>
        <div>
          <span className="eyebrow">Wins / capacity</span>
          <strong>
            {winsPerM(e.winsPerCapPerM)} <span className="fine-inline">W/$M</span>
          </strong>
          <div className="field-meta">
            {e.wins != null && e.capacity != null
              ? `${e.wins} wins on ${money(e.capacity)} annual capacity`
              : '—'}
          </div>
        </div>
      </div>
    </section>
  )
}

function BuyoutsPaidSection({ layer }) {
  const rows = layer?.buyoutsPaid || []
  return (
    <section>
      <h2 title={defTitle('buyoutPaid')}>Buyouts actually paid</h2>
      <p className="lede tight">
        Not the if-fired overhang on the current coach. Money the school actually
        owes or has settled with a former FB/MBB chair when a USA TODAY, Athletic,
        990, or FOIA figure exists.
      </p>
      {rows.length ? (
        <table className="roster staff-table">
          <thead>
            <tr>
              <th>Coach</th>
              <th>Year</th>
              <th className="num">Amount</th>
              <th>Who paid</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={`${b.coach}-${b.year}-${b.sport}`}>
                <td>
                  {b.coach} <span className="fine-inline">{b.sport}</span>{' '}
                  <i className={`dot ${b.confidence}`} />
                </td>
                <td>{b.year}</td>
                <td className="num">{b.amount != null ? moneyExact(b.amount) : <span className="pending-cell">pending</span>}</td>
                <td>{b.whoPaid || '—'}</td>
                <td>
                  {b.url ? (
                    <a className="ext" href={b.url} target="_blank" rel="noreferrer">{b.source || 'source'} ↗</a>
                  ) : (
                    b.source || '—'
                  )}
                  {b.notes && <div className="field-notes">{b.notes}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="field pending-box">
          <div className="field-val">Pending</div>
          <div className="field-meta">No cited former-coach payout on the desk for this school.</div>
        </div>
      )}
    </section>
  )
}

export default function Layers({ school, open, onToggle }) {
  const layer = school.layers
  if (!layer) return null
  return (
    <>
      <PortalSection layer={layer} />
      <ApparelSection layer={layer} />
      <SubsidySection school={school} />
      <DebtSection school={school} open={open} onToggle={onToggle} />
      <EfficiencySection school={school} />
      <BuyoutsPaidSection layer={layer} />
    </>
  )
}
