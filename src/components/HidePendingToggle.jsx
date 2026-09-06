const STORAGE_KEY = 'public-cap:hide-pending'

export function readHidePending() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === '0') return false
    if (raw === '1') return true
  } catch {
    /* session-only fallback */
  }
  return true
}

export function writeHidePending(on) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
  } catch {
    /* session-only fallback */
  }
}

/** Default ON so first paint is booked cells, not a wall of pending holes. */
export default function HidePendingToggle({ on, onChange, id = 'hide-pending' }) {
  return (
    <div className="alumni-toggle" title="Hide empty and pending desk cells. Off shows the full FOIA grid.">
      <span className="alumni-toggle-lab" id={`${id}-lab`}>
        Empty cells
      </span>
      <div className="alumni-switch" role="group" aria-labelledby={`${id}-lab`}>
        <button
          type="button"
          id={id}
          className={on ? 'on' : ''}
          aria-pressed={on}
          onClick={() => onChange(true)}
        >
          Hide pending
        </button>
        <button
          type="button"
          className={!on ? 'on' : ''}
          aria-pressed={!on}
          onClick={() => onChange(false)}
        >
          Show all
        </button>
      </div>
    </div>
  )
}
