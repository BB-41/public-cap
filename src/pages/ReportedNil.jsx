import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { money } from '../lib/format.js'
import Logo from '../components/Logo.jsx'
import NilReportedBar from '../components/NilReportedBar.jsx'
import { defTitle } from '../lib/definitions.js'
import { chipsForSeason } from '../lib/seasons.js'
import {
  REPORTED_BAR_HASH,
  reportedBarMax,
  reportedNilBoardRows,
} from '../lib/rosterStack.js'
import { schoolPath } from '../lib/share.js'

const CHIPS = chipsForSeason(2026)

function confShort(conference) {
  if (conference === 'Independent / ACC') return 'ND / ACC'
  if (conference === 'Big Ten') return 'B1G'
  if (conference === 'Independent') return 'Ind.'
  return conference
}

function citeLine(bar) {
  if (!bar) return null
  if (bar.sameBookedSpent && bar.booked) {
    return `Booked / House spent ${money(bar.booked.value)}`
  }
  const bits = []
  if (bar.booked) bits.push(`Booked ${money(bar.booked.value)}`)
  if (bar.spent) bits.push(`House spent ${money(bar.spent.value)}`)
  return bits.length ? bits.join(' · ') : null
}

export default function ReportedNil({ schools }) {
  const [q, setQ] = useState('')
  const [chip, setChip] = useState('all')
  const maxM = Math.round(reportedBarMax() / 1_000_000)
  const ticks = [0, maxM / 2, maxM]

  const allRows = useMemo(() => reportedNilBoardRows(schools || []), [schools])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return allRows.filter((r) => {
      const s = r.school
      if (chip === 'ND') {
        if (s.id !== 'notre-dame' && !String(s.conference).startsWith('Independent')) return false
      } else if (chip !== 'all' && s.conference !== chip) {
        return false
      }
      if (!needle) return true
      return (
        s.name.toLowerCase().includes(needle) ||
        (s.shortName || '').toLowerCase().includes(needle) ||
        (s.conference || '').toLowerCase().includes(needle) ||
        (s.city || '').toLowerCase().includes(needle) ||
        (s.abbr || '').toLowerCase().includes(needle)
      )
    })
  }, [allRows, q, chip])

  return (
    <div className="page-wrap reported-nil-board">
      <h1 className="issue-hed" title={defTitle('nilReportedBar')}>
        Reported NIL
      </h1>
      <p className="lede">
        Every Power 4 + Notre Dame football stack on one $0–${maxM}M scale.
        Gold is the industry survey range or the SI conference-median band — rev-share
        plus third-party NIL. Survey tiers keep the published words, not a midpoint.
        Booked NIL and House spent stay separate marks. Not leftover. Not the capacity
        waterfall. Not On3.
      </p>
      <div className="legend">
        <span title={defTitle('industryRosterEstimate')}>
          <i className="nil-reported-swatch band" /> gold band = survey or modeled stack
        </span>
        <span>
          <i className="nil-reported-swatch booked" /> booked NIL
        </span>
        <span>
          <i className="nil-reported-swatch spent" /> House spent
        </span>
        <span title={defTitle('modeled')}>
          <i className="dot modeled" /> modeled
        </span>
      </div>
      <div className="rank-tools">
        <input
          className="search"
          type="search"
          placeholder="Search school, city, or abbreviation…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search schools"
        />
        <div className="chips" role="tablist" aria-label="Conference filter">
          {CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip ${chip === c.id ? 'on' : ''}`}
              onClick={() => setChip(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="result-count">{schools ? `${rows.length} schools` : ''}</div>
      </div>

      {!schools ? (
        <>
          <div className="table-scroll table-pending" aria-busy="true" />
          <p className="fine board-pending-fine" aria-hidden="true" />
        </>
      ) : (
        <>
          <div className="table-scroll">
            <table className="rank reported-nil-rank">
              <colgroup>
                <col className="col-rk" />
                <col className="col-school" />
                <col className="col-conf" />
                <col className="col-range" />
                <col className="col-lane" />
                <col className="col-bar" />
              </colgroup>
              <thead>
                <tr>
                  <th className="rk" title="Rank by the top of the allocation range">#</th>
                  <th>School</th>
                  <th>Conf.</th>
                  <th>Reported NIL</th>
                  <th>Lane</th>
                  <th>
                    <span className="reported-nil-scale-lab">$0–${maxM}M</span>
                    <div className="nil-reported-ticks reported-nil-head-ticks" aria-hidden="true">
                      {ticks.map((t) => (
                        <span key={t}>${t}M</span>
                      ))}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const cite = citeLine(r.bar)
                  return (
                    <tr key={r.school.id}>
                      <td className="rk">{i + 1}</td>
                      <td>
                        <Link
                          className="school-link"
                          to={schoolPath(r.school.id, 2026, REPORTED_BAR_HASH)}
                        >
                          <Logo school={r.school} size={28} priority={i < 8} />
                          <span>{r.school.name}</span>
                        </Link>
                      </td>
                      <td className="conf">{confShort(r.school.conference)}</td>
                      <td>
                        <div className="reported-nil-label modeled-cell">{r.label}</div>
                      </td>
                      <td>
                        <span className="conf-label">{r.bar.lane}</span>
                      </td>
                      <td className="reported-nil-bar-cell">
                        <NilReportedBar bar={r.bar} compact />
                        {cite ? <div className="term-compact">{cite}</div> : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="fine">
            Sorted by the top of the allocation envelope (LSU $40–${maxM}M first).
            A survey tier without a numeric high still ranks on that envelope; the
            visible label stays the survey words. Modeled rows are the SI conference
            median — the same band for every school those pieces do not name.
            Booked NIL / House spent cites (Texas, Louisville, Kentucky, UCLA, Cal)
            are marks, not mixed into the gold band. Leftover is still House cap minus
            booked House spent when that cell exists. This board does not change
            capacity totals.
            {' '}
            <Link to="/methods">Methods</Link>.
          </p>
        </>
      )}
    </div>
  )
}
