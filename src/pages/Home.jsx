import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { money, moneyRange, pct, throughShort, winsPerM } from '../lib/format.js'
import { val } from '../lib/compute.js'
import Logo from '../components/Logo.jsx'
import { defTitle } from '../lib/definitions.js'
import SeasonPicker from '../components/SeasonPicker.jsx'
import { chipsForSeason } from '../lib/seasons.js'

const COLS = [
  { key: 'name', label: 'School', type: 'text' },
  { key: 'conference', label: 'Conf.', type: 'text' },
  { key: 'capacity', label: 'Capacity', type: 'num', def: 'capacity' },
  { key: 'house', label: 'House cap', type: 'num', def: 'house' },
  { key: 'nil', label: 'NIL booked', type: 'num', def: 'nil' },
  { key: 'nilModeled', label: 'NIL modeled', type: 'num', def: 'nilModeled' },
  { key: 'nilCap', label: 'NIL / cap.', type: 'num', def: 'nilCap' },
  { key: 'nilHouse', label: 'NIL / House', type: 'num', def: 'nilHouse' },
  { key: 'fbPay', label: 'FB pay', type: 'num', def: 'coachPay' },
  { key: 'fbBuy', label: 'FB buyout', type: 'num', def: 'buyout' },
  { key: 'winsPerNil', label: 'FB W/$M NIL', type: 'num', def: 'winsPerDollar' },
]

export default function Home({ schools, house, houseField, season, setSeason }) {
  const CHIPS = chipsForSeason(season)

  const [sort, setSort] = useState({ key: 'capacity', dir: 'desc' })
  const [q, setQ] = useState('')
  const [chip, setChip] = useState(() => new URLSearchParams(window.location.search).get('conf') || 'all')
  useEffect(() => {
    if (!CHIPS.some((c) => c.id === chip)) setChip('all')
  }, [season])

  const rows = useMemo(() => {
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
      .map((s) => ({
        school: s,
        name: s.name,
        conference: s.conference,
        capacity: s._cap.total,
        house,
        nil: s._ratios.nil,
        nilModeled: s.nil.modeled?.mid ?? null,
        nilModeledLow: s.nil.modeled?.low ?? null,
        nilModeledHigh: s.nil.modeled?.high ?? null,
        nilCap: s._ratios.nilOverCapacity,
        nilHouse: s._ratios.nilOverHouse,
        fbPay: val(s.coaches.football.pay),
        fbBuy: val(s.coaches.football.buyout) || null,
        fbThru: throughShort(s.coaches.football.term),
        winsPerNil: s._eff?.winsPerNilPerM ?? null,
        winsPerNilModeled: s._eff?.pot?.confidence === 'modeled',
        fbRecord: s._eff?.wins != null ? `${s._eff.wins}–${s._eff.losses}` : null,
        conf: s._conf,
      }))
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
  }, [schools, house, sort, q, chip, season])

  function toggle(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'conference' ? 'asc' : 'desc' }))
  }

  return (
    <div className="page-wrap">
      <section className="dek">
        <h1 className="issue-hed">Who can actually write the check.</h1>
        <p className="lede">
          Two ceilings sit on every Power program now: the official House benefits cap
          (only 2025–26 and 2026–27) and the school’s own annual economic
          capacity. This table ranks all 68 Power 4 plus Notre Dame names on our desk —
          real cited public numbers where we have them, clearly tagged estimates otherwise.
          Seasons are football years 2021–2026, from the start of the NIL era.
        </p>
        <div className="legend">
          <span title={defTitle('reported')}><i className="dot reported" /> reported</span>
          <span title={defTitle('estimated')}><i className="dot estimated" /> estimated</span>
          <span title={defTitle('modeled')}><i className="dot modeled" /> modeled</span>
          <span title={defTitle('pending')}><i className="dot pending" /> pending</span>
        </div>
        <div className="rank-tools">
          <SeasonPicker season={season} onChange={setSeason} id="rank-season" />
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
          <div className="result-count">{rows.length} schools</div>
        </div>
      </section>

      <div className="table-scroll">
        <table className="rank">
          <thead>
            <tr>
              <th className="rk" title="Rank in the current sort">#</th>
              {COLS.map((c) => (
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
                  <Link className="school-link" to={season === 2026 ? `/school/${r.school.id}` : `/school/${r.school.id}?season=${season}`}>
                    <Logo school={r.school} size={28} />
                    <span>{r.school.name}</span>
                  </Link>
                  {r.school.private && <span className="pill">private</span>}
                  {r.school.revenueGap && <span className="pill gap">rev. gap</span>}
                </td>
                <td className="conf">{r.conference === 'Independent / ACC' ? 'ND / ACC' : r.conference === 'Big Ten' ? 'B1G' : r.conference === 'Independent' ? 'Ind.' : r.conference}</td>
                <td className="num strong">{money(r.capacity)}</td>
                <td className="num muted">{house == null ? <span className="pending-cell" title={houseField?.notes}>no House cap</span> : money(house)}</td>
                <td className="num">{r.nil == null ? <span className="pending-cell">pending</span> : money(r.nil)}</td>
                <td className="num modeled-cell" title={defTitle('nilModeled')}>{moneyRange(r.nilModeledLow, r.nilModeledHigh)}</td>
                <td className="num">{pct(r.nilCap)}</td>
                <td className="num">{pct(r.nilHouse)}</td>
                <td className="num">
                  {r.fbPay ? money(r.fbPay) : '—'}
                  {r.fbThru && (
                    <div className="term-compact" title={defTitle('coachTerm')}>
                      {r.fbThru.length === 2 ? `thru ’${r.fbThru}` : r.fbThru}
                    </div>
                  )}
                </td>
                <td className="num">{r.fbBuy ? money(r.fbBuy) : '—'}</td>
                <td className={`num ${r.winsPerNilModeled ? 'modeled-cell' : ''}`} title={r.winsPerNilModeled ? 'Uses modeled NIL mid' : 'Uses booked NIL'}>
                  {r.winsPerNil == null ? <span className="pending-cell">pending</span> : winsPerM(r.winsPerNil)}
                  {r.fbRecord && <div className="term-compact">{r.fbRecord}{r.winsPerNilModeled ? ' · modeled' : ''}</div>}
                </td>
                <td><i className={`dot ${r.conf.primary}`} title={r.conf.primary} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine">
        {house == null
          ? 'No House cap (pre-settlement). Modeled NIL is hidden before 2025–26. Capacity for 2021–2024 is conference-media floor plus modeled alumni flow; tickets / sponsorships / contributions stay pending.'
          : `House cap shown is ${season === 2026 ? '2026–27 (~$21.3M, estimated)' : '2025–26 ($20.5M, reported)'}. Capacity includes a modeled extra-alumni giving midpoint and will move when Category 15 / tickets land.`}
        {' '}Click a school.
      </p>
    </div>
  )
}
