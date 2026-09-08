import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { answerDeskQuestion, CHAT_VOICE, SUGGESTED_PROMPTS } from '../lib/deskChat.js'
import { jsonOr, loadDesk, loadRosters } from '../lib/loadDesk.js'
import { CURRENT_SEASON } from '../lib/seasons.js'

function loadTv() {
  return jsonOr('/data/tv.json', null)
}

function loadCoachFa() {
  return jsonOr('/data/coach-fa.json', null)
}

function Welcome() {
  return (
    <div className="desk-chat-msg bot">
      <p>
        Ask the desk in plain language. Lookups against the public JSON — leftover, House spent,
        booked NIL, capacity, TV, buyouts, roster names — and what is included vs pending. Empty
        stays empty. Booked and modeled stay distinct. No On3. No invented player deals.
      </p>
    </div>
  )
}

function BotBody({ answer }) {
  if (!answer) return null
  return (
    <div className="desk-chat-msg bot">
      <p>{answer.text}</p>
      {answer.facts?.length ? (
        <ul className="desk-chat-facts">
          {answer.facts.map((f) => (
            <li key={typeof f === 'string' ? f : f}>{typeof f === 'string' ? f : f}</li>
          ))}
        </ul>
      ) : null}
      {answer.links?.length ? (
        <p className="desk-chat-links">
          {answer.links.map((l) => (
            <Link key={`${l.to}:${l.label}`} to={l.to}>
              {l.label}
            </Link>
          ))}
        </p>
      ) : null}
    </div>
  )
}

export default function DeskChat({ desk: deskProp, season = CURRENT_SEASON, includeAlumni = false }) {
  const titleId = useId()
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [rows, setRows] = useState([])
  const [books, setBooks] = useState({
    desk: deskProp || null,
    tv: null,
    rosters: null,
    coachFa: null,
  })
  const [ready, setReady] = useState(!!deskProp)
  const inputRef = useRef(null)
  const logRef = useRef(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (deskProp) setBooks((b) => ({ ...b, desk: deskProp }))
  }, [deskProp])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(t)
  }, [open])

  useEffect(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [rows, open])

  useEffect(() => {
    if (!open || loaded.current) return undefined
    loaded.current = true
    let cancelled = false
    Promise.all([
      books.desk ? Promise.resolve(books.desk) : loadDesk(),
      loadTv(),
      loadRosters(season),
      loadCoachFa(),
    ])
      .then(([desk, tv, rosters, coachFa]) => {
        if (cancelled) return
        setBooks({ desk, tv, rosters, coachFa })
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [open, season, books.desk])

  function ask(raw) {
    const q = String(raw || draft).trim()
    if (!q) return
    const answer = answerDeskQuestion(q, {
      desk: books.desk,
      tv: books.tv,
      rosters: books.rosters,
      coachFa: books.coachFa,
      season,
      includeAlumni,
    })
    setRows((prev) => [...prev, { q, answer }])
    setDraft('')
  }

  function onSubmit(e) {
    e.preventDefault()
    ask(draft)
  }

  const lastSuggested = rows.length ? rows[rows.length - 1].answer?.suggested : SUGGESTED_PROMPTS

  return (
    <div className="desk-chat">
      <button
        type="button"
        className="desk-chat-launch"
        aria-expanded={open}
        aria-controls="desk-chat-panel"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Close desk' : 'Ask the desk'}
      </button>
      {open ? (
        <div
          className="desk-chat-panel"
          id="desk-chat-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
        >
          <header className="desk-chat-head">
            <div>
              <div className="kicker">Public Cap · lookup</div>
              <h2 id={titleId} className="desk-chat-hed">
                Ask the desk
              </h2>
            </div>
            <button type="button" className="desk-chat-x" onClick={() => setOpen(false)} aria-label="Close desk chat">
              Close
            </button>
          </header>
          <p className="desk-chat-dek">{CHAT_VOICE}</p>
          <div className="desk-chat-log" ref={logRef} aria-live="polite">
            <Welcome />
            {rows.map((row, i) => (
              <div key={`${row.q}:${i}`}>
                <div className="desk-chat-msg you">
                  <p>{row.q}</p>
                </div>
                <BotBody answer={row.answer} />
              </div>
            ))}
          </div>
          {lastSuggested?.length ? (
            <div className="desk-chat-suggest" role="group" aria-label="Suggested questions">
              {lastSuggested.map((p) => (
                <button key={p} type="button" className="chip" onClick={() => ask(p)} disabled={!ready}>
                  {p}
                </button>
              ))}
            </div>
          ) : null}
          <form className="desk-chat-form" onSubmit={onSubmit}>
            <label className="visually-hidden" htmlFor={inputId}>
              Ask about a school or cell
            </label>
            <input
              id={inputId}
              ref={inputRef}
              className="search desk-chat-input"
              type="search"
              placeholder="Louisville leftover, SMU TV, Washington QB…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="desk-chat-go" disabled={!draft.trim()}>
              Ask
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
