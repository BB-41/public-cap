import { useState } from 'react'
import { Link } from 'react-router-dom'
import { money, moneyRange, pct, winsPerM } from '../lib/format.js'
import { val } from '../lib/compute.js'
import Logo from '../components/Logo.jsx'
import { defTitle } from '../lib/definitions.js'
import SeasonPicker from '../components/SeasonPicker.jsx'

export default function Compare({ schools, meta, house, season, setSeason }) {
  const [a, setA] = useState(() => new URLSearchParams(window.location.search).get('a') || schools[0]?.id || '')
  const [b, setB] = useState(() => new URLSearchParams(window.location.search).get('b') || schools[1]?.id || '')
  const A = schools.find((s) => s.id === a)
  const B = schools.find((s) => s.id === b)
  const metrics = [
    { key: 'capacity', label: 'Annual capacity', def: 'capacity', get: (s) => s._cap.total },
    { key: 'house', label: house == null ? 'House cap' : (season >= 2026 ? 'House cap 2026-27' : 'House cap 2025-26'), def: 'house', get: () => house },
    { key: 'nil', label: 'NIL booked', def: 'nil', get: (s) => s._ratios.nil },
    { key: 'nilModeled', label: 'NIL modeled (mid)', def: 'nilModeled', get: (s) => s.nil.modeled?.mid ?? null, show: (s) => s.nil.modeled ? moneyRange(s.nil.modeled.low, s.nil.modeled.high) : '—' },
    { key: 'media', label: 'Media / conference', get: (s) => s._cap.media },
    { key: 'tix', label: 'Tickets', get: (s) => s._cap.tickets },
    { key: 'give', label: 'Booked contributions', get: (s) => s._cap.contributions },
    { key: 'extra', label: 'Extra alumni giving (modeled)', get: (s) => s._cap.extraAlumni },
    { key: 'fb', label: 'FB coach pay', def: 'coachPay', get: (s) => val(s.coaches.football.pay) || null },
    { key: 'buy', label: 'FB buyout overhang', def: 'buyout', get: (s) => val(s.coaches.football.buyout) || null },
    { key: 'winsPerNil', label: 'FB wins / $M NIL', def: 'winsPerDollar', get: (s) => s._eff?.winsPerNilPerM ?? null, show: (s) => s._eff?.winsPerNilPerM == null ? '—' : winsPerM(s._eff.winsPerNilPerM) + ' W/$M' },
    { key: 'winsPerCap', label: 'FB wins / $M capacity', def: 'winsPerDollar', get: (s) => s._eff?.winsPerCapPerM ?? null, show: (s) => s._eff?.winsPerCapPerM == null ? '—' : winsPerM(s._eff.winsPerCapPerM) + ' W/$M' },
  ]
  const max = Math.max(
    ...metrics.flatMap((m) => [A, B].map((s) => m.get(s) || 0)),
    1
  )

  return (
    <div className="page-wrap">
      <h1 className="issue-hed">Compare two programs.</h1>
      <p className="lede">Capacity vs House vs booked NIL vs modeled NIL vs coach spend. Same FY tags as the school pages. Football seasons 2021-2026.</p>
      <div className="pickers">
        <SeasonPicker season={season} onChange={setSeason} id="compare-season" />
        <label>
          School A
          <div className="picker-row">
            {A && <Logo school={A} size={36} />}
            <select value={a} onChange={(e) => setA(e.target.value)}>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </label>
        <label>
          School B
          <div className="picker-row">
            {B && <Logo school={B} size={36} />}
            <select value={b} onChange={(e) => setB(e.target.value)}>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </label>
      </div>
      {A && B && (
        <>
          <div className="compare-hed">
            <Link className="compare-name" to={season === 2026 ? `/school/${A.id}` : `/school/${A.id}?season=${season}`}><Logo school={A} size={40} />{A.name}</Link>
            <span className="vs">vs</span>
            <Link className="compare-name" to={season === 2026 ? `/school/${B.id}` : `/school/${B.id}?season=${season}`}><Logo school={B} size={40} />{B.name}</Link>
          </div>
          <div className="compare-grid">
            {metrics.map((m) => {
              const va = m.get(A)
              const vb = m.get(B)
              return (
                <div key={m.key} className="compare-row">
                  <div className="compare-lab" title={m.def ? defTitle(m.def) : undefined}>{m.label}{m.def ? <i className="info-mark" aria-hidden="true">i</i> : null}</div>
                  <div className="compare-side">
                    <div className="bar a" style={{ width: va ? `${(va / max) * 100}%` : '0' }} />
                    <span>{m.show ? m.show(A) : (va == null ? (m.key === 'house' && house == null ? 'no House cap' : 'pending') : money(va))}</span>
                  </div>
                  <div className="compare-side right">
                    <span>{m.show ? m.show(B) : (vb == null ? (m.key === 'house' && house == null ? 'no House cap' : 'pending') : money(vb))}</span>
                    <div className="bar b" style={{ width: vb ? `${(vb / max) * 100}%` : '0' }} />
                  </div>
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
