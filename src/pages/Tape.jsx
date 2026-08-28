import { useMemo, useState } from 'react'
import { defTitle } from '../lib/definitions.js'
import { KIND_LABELS, sortTapeNewest } from '../lib/tape.js'
import TapeItems from '../components/TapeItems.jsx'

const FILTERS = [
  { id: 'all', label: 'All' },
  ...Object.entries(KIND_LABELS)
    .filter(([k]) => k !== '990' && k !== 'foia')
    .map(([id, label]) => ({ id, label })),
]

export default function Tape({ items, season }) {
  const [kind, setKind] = useState('all')
  const rows = useMemo(() => {
    const sorted = sortTapeNewest(items)
    if (kind === 'all') return sorted
    return sorted.filter((it) => it.kind === kind)
  }, [items, kind])

  return (
    <div className="page-wrap tape-page">
      <h1 className="issue-hed" title={defTitle('tape')}>Desk tape</h1>
      <p className="lede">
        A dated log of filings that moved a Public Cap figure — booked NIL, collective 990s, contract PDFs,
        paid buyouts, apparel and naming, student-fee subsidies, athletics-debt filings, House-cap Q&amp;As.
        This is not a news feed. No portal rumor, no On3, no social.
      </p>
      <div className="chips" role="tablist" aria-label="Tape kind filter">
        {FILTERS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip ${kind === c.id ? 'on' : ''}`}
            onClick={() => setKind(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="result-count">{rows.length} filing{rows.length === 1 ? '' : 's'}</p>
      <TapeItems items={rows} season={season} showSchool />
    </div>
  )
}
