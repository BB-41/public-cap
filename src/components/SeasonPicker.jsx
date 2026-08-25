import { SEASONS } from '../lib/seasons.js'

export default function SeasonPicker({ season, onChange, id = 'season' }) {
  return (
    <label className="season-picker">
      Season
      <select
        id={id}
        value={season}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Football season"
      >
        {SEASONS.map((s) => (
          <option key={s.year} value={s.year}>
            {s.year === 2026 ? '2026 season' : String(s.year)}
          </option>
        ))}
      </select>
    </label>
  )
}
