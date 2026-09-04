import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { money, moneyRange } from '../lib/format.js'
import { leadBookedNil, leadHouseRemaining } from '../lib/compute.js'
import Logo from '../components/Logo.jsx'
import { defTitle } from '../lib/definitions.js'
import SeasonPicker from '../components/SeasonPicker.jsx'
import { chipsForSeason, SEASON_BY_YEAR } from '../lib/seasons.js'
import AlumniToggle from '../components/AlumniToggle.jsx'
import { schoolPath } from '../lib/share.js'

const LEAD_COLS = [
  { key: 'name', label: 'School', type: 'text' },
  { key: 'conference', label: 'Conf.', type: 'text' },
  { key: 'capacity', label: 'Capacity', type: 'num', def: 'capacity' },
  { key: 'house', label: 'House cap', type: 'num', def: 'house' },
  { key: 'nil', label: 'Booked NIL', type: 'num', def: 'nil' },
  { key: 'leftover', label: 'Leftover', type: 'num', def: 'houseRemaining' },
]

const MODELED_COL = { key: 'nilModeled', label: 'NIL modeled', type: 'num', def: 'nilModeled' }

function yearCompact(field, carryLabel) {
  if (!field && !carryLabel) return null
  const bits = []
  if (field?.overhang) bits.push('overhang')
  else if (field?.partialYear) bits.push('YTD')
  if (carryLabel) bits.push(carryLabel)
  else if (field) bits.push('House Year 1')
  return bits.join(' · ')
}

function ModeledToggle({ on, onChange, id = 'modeled-toggle' }) {
  return (
    <div className="alumni-toggle" title={defTitle('nilModeled')}>
      <span className="alumni-toggle-lab" id={`${id}-lab`}>
        Modeled NIL
      </span>
      <div className="alumni-switch" role="group" aria-labelledby={`${id}-lab`}>
        <button
          type="button"
          id={id}
          className={!on ? 'on' : ''}
          aria-pressed={!on}
          onClick={() => onChange(false)}
        >
          Hidden
        </button>
        <button
          type="button"
          className={on ? 'on' : ''}
          aria-pressed={on}
          onClick={() => onChange(true)}
        >
          Show labeled
        </button>
      </div>
    </div>
  )
}

export default function Home({ schools, house, houseField, season, setSeason, includeAlumni, setIncludeAlumni }) {
  const CHIPS = chipsForSeason(season)
  const [showModeled, setShowModeled] = useState(false)
  const [sort, setSort] = useState({ key: 'capacity', dir: 'desc' })
  const cols = showModeled ? [...LEAD_COLS, MODELED_COL] : LEAD_COLS
  const [q, setQ] = useState('')
  const [chip, setChip] = useState(() => new URLSearchParams(window.location.search).get('conf') || 'all')
  useEffect(() => {
    if (!CHIPS.some((c) => c.id === chip)) setChip('all')
  }, [season])
  useEffect(() => {
    if (!showModeled && sort.key === 'nilModeled') setSort({ key: 'capacity', dir: 'desc' })
  }, [showModeled, sort.key])

  const houseYear = SEASON_BY_YEAR[season]?.academic?.replace('-', '–') || null
  const houseMark = houseField?.confidence || null
  const latestExtract = schools?.[0]?._season?.capacityMode === 'latest-extract'

  const rows = useMemo(() => {
    if (!schools) return []
    const needle = q.trim().toLowerCase()
    const mapped = schools
      .filter((s) => {
        if (chip === 'ND') return s.id === 'notre-dame' || String(s.conference).startsWith('Independent')
        if (chip !== 'all' && s.conference !== chip) return false
        if (!needle) return true
        return (
          s.name.toLowerCase().includes(needle) ||
          s.shortName.toLowerCase().includes(needle) ||
          s.conference.toLowerCase().includes(needle) ||
          (s.city || '').toLowerCase().includes(needle) ||
          (s.abbr || '').toLowerCase().includes(needle)
        )
      })
      .map((s) => {
        const booked = leadBookedNil(s)
        const leftover = leadHouseRemaining(s)
        return {
          school: s,
          name: s.name,
          conference: s.conference,
          capacity: includeAlumni ? s._cap.total : s._cap.booked,
          capacityFy: latestExtract ? s.capacity?.fiscalYearPrimary || 'FY2025' : null,
          house,
          nil: booked.value,
          nilCarry: booked.carry,
          nilLabel: booked.label,
          leftover: leftover.value,
          leftoverField: leftover.field,
          leftoverLabel: leftover.label,
          nilModeled: s.nil.modeled?.mid ?? null,
          nilModeledLow: s.nil.modeled?.low ?? null,
          nilModeledHigh: s.nil.modeled?.high ?? null,
          conf: s._conf,
        }
      })
    const { key, dir } = sort
    mapped.sort((a, b) => {
      const av = a[key]
      const bv = b[key]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return dir === 'asc' ? av - bv : bv - av
    })
    return mapped
  }, [schools, house, sort, q, chip, season, includeAlumni, latestExtract])

  function toggle(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'conference' ? 'asc' : 'desc' }))
  }

  // Hed + lede live in index.html #home-dek so LCP does not wait on JS.
  return (
    <div className="page-wrap home-board">
      <section className="dek">
        <div className="legend">
          <span title={defTitle('reported')}><i className="dot reported" /> reported</span>
          <span title={defTitle('estimated')}><i className="dot estimated" /> estimated</span>
          <span title={defTitle('modeled')}><i className="dot modeled" /> modeled</span>
          <span title={defTitle('pending')}><i className="dot pending" /> pending</span>
        </div>
        <div className="rank-tools">
          <SeasonPicker season={season} onChange={setSeason} id="rank-season" />
          <AlumniToggle on={includeAlumni} onChange={setIncludeAlumni} id="rank-alumni" />
          <ModeledToggle on={showModeled} onChange={setShowModeled} id="rank-modeled" />
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
      </section>

      {!schools ? (
        <>
          <div className="table-scroll table-pending" aria-busy="true" />
          <p className="fine board-pending-fine" aria-hidden="true" />
        </>
      ) : (
      <>
      <div className="table-scroll">
        <table className="rank home-rank">
          <colgroup>
            <col className="col-rk" />
            <col className="col-school" />
            <col className="col-conf" />
            <col className="col-num" />
            <col className="col-num" />
            <col className="col-num" />
            <col className="col-num" />
            {showModeled ? <col className="col-num" /> : null}
            <col className="col-mark" />
          </colgroup>
          <thead>
            <tr>
              <th className="rk" title="Rank in the current sort">#</th>
              {cols.map((c) => (
                <th key={c.key} className={c.type === 'num' ? 'num' : ''} onClick={() => toggle(c.key)} title={c.def ? defTitle(c.def) : undefined}>
                  {c.label}
                  {c.def ? <i className="info-mark" aria-hidden="true">i</i> : null}
                  {sort.key === c.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
              <th>Mark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.school.id}>
                <td className="rk">{i + 1}</td>
                <td>
                  <Link className="school-link" to={schoolPath(r.school.id, season, '', includeAlumni)}>
                    <Logo school={r.school} size={28} priority={i < 8} />
                    <span>{r.school.name}</span>
                  </Link>
                  {r.school.private && <span className="pill">private</span>}
                  {r.school.revenueGap && <span className="pill gap">rev. gap</span>}
                </td>
                <td className="conf">{r.conference === 'Independent / ACC' ? 'ND / ACC' : r.conference === 'Big Ten' ? 'B1G' : r.conference === 'Independent' ? 'Ind.' : r.conference}</td>
                <td className="num strong">
                  {money(r.capacity)}
                  {r.capacityFy && <div className="term-compact">{r.capacityFy}</div>}
                </td>
                <td className="num muted">
                  {house == null ? (
                    <span className="pending-cell" title={houseField?.notes}>no House cap</span>
                  ) : (
                    <>
                      {money(house)}
                      <div className="term-compact">
                        {houseYear}
                        {houseMark ? ` · ${houseMark}` : ''}
                      </div>
                    </>
                  )}
                </td>
                <td className="num">
                  {r.nil == null ? (
                    <span className="pending-cell">pending</span>
                  ) : (
                    <>
                      {money(r.nil)}
                      {yearCompact(r.leftoverField, r.nilLabel) ? (
                        <div className="term-compact">{yearCompact(r.leftoverField, r.nilLabel)}</div>
                      ) : null}
                    </>
                  )}
                </td>
                <td className="num">
                  {r.leftover == null ? (
                    <span className="pending-cell">pending</span>
                  ) : (
                    <>
                      {money(r.leftover)}
                      <div className="term-compact">{yearCompact(r.leftoverField, r.leftoverLabel)}</div>
                    </>
                  )}
                </td>
                {showModeled ? (
                  <td className="num modeled-cell" title={defTitle('nilModeled')}>
                    {moneyRange(r.nilModeledLow, r.nilModeledHigh)}
                    <div className="term-compact">modeled</div>
                  </td>
                ) : null}
                <td><i className={`dot ${r.conf.primary}`} title={r.conf.primary} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine">
        {house == null
          ? 'No House cap (pre-settlement). Modeled NIL for 2021–2024 is a collective-era third-party-only backcast (labeled modeled) — no House rev-share. Capacity is the conference-media floor (plus modeled extra alumni only when that toggle is on); tickets / sponsorships / contributions stay pending.'
          : `House cap shown is ${season === 2026 ? '2026–27 (~$21.3M, estimated)' : '2025–26 ($20.5M, reported)'}. Capacity is the FY2025 filing stack, still labeled FY2025 — not a ${season === 2026 ? '2026' : '2025'} filing. Booked NIL on this list is the House Year 1 / 2025–26 filing when 2026–27 has not been extracted; those cells carry a year label. Leftover is House remaining only when a booked House spent cell exists — we do not invent leftover from a $20.5M cap plan. Capacity default is booked-only. Flip on + alumni model to add the Scorecard-based extra-alumni midpoint, net of booked gifts.`}
        {' '}FB pay, buyouts, conference exit, and wins-per-dollar live on the school page and on /buyout, /tape, and the school #conference-exit / #debt drills — not on this first-screen rank.
        {' '}Click a school.
      </p>
      </>
      )}
    </div>
  )
}
