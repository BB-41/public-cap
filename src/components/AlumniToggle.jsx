import { defTitle } from '../lib/definitions.js'

export default function AlumniToggle({ on, onChange, id = 'alumni-toggle' }) {
  return (
    <div className="alumni-toggle" title={defTitle('capacity')}>
      <span className="alumni-toggle-lab" id={`${id}-lab`}>
        Capacity
      </span>
      <div className="alumni-switch" role="group" aria-labelledby={`${id}-lab`}>
        <button
          type="button"
          id={id}
          className={!on ? 'on' : ''}
          aria-pressed={!on}
          onClick={() => onChange(false)}
        >
          Booked only
        </button>
        <button
          type="button"
          className={on ? 'on' : ''}
          aria-pressed={on}
          onClick={() => onChange(true)}
        >
          + alumni model
        </button>
      </div>
    </div>
  )
}
