import { allocationFootnote } from '../lib/nilHistory.js'

/** Visible how-we-got-this-number note. Not a hover tip. */
export default function AllocationFootnote({
  points,
  point,
  shareLabel,
  kind = 'position',
  className = '',
}) {
  const note = allocationFootnote({ points, point, shareLabel, kind })
  if (!note?.lines?.length && !note?.spread) return null
  return (
    <aside className={`nil-fn ${className}`.trim()} aria-label="How this dollar was produced">
      {note.lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {note.links.map((link) => (
        <p key={link.url} className="nil-fn-src">
          {link.year ? `${link.year} ${link.kind || 'filing'}: ` : null}
          <a className="ext" href={link.url} target="_blank" rel="noreferrer">
            {link.source || 'source'} ↗
          </a>
        </p>
      ))}
      {note.spread ? <p className="nil-fn-spread">{note.spread}</p> : null}
    </aside>
  )
}
