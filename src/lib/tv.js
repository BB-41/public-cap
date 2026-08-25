/** TV / media-rights overlay. Conference deals, not 68 school contracts. */

import { useEffect, useState } from 'react'
import { CURRENT_SEASON } from './seasons.js'

export const CONF_KEY = {
  SEC: 'SEC',
  'Big Ten': 'Big Ten',
  ACC: 'ACC',
  'Big 12': 'Big 12',
  'Independent / ACC': 'ACC',
}

export function useTvBook() {
  const [book, setBook] = useState(null)
  useEffect(() => {
    let cancelled = false
    fetch('/data/tv.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled) setBook(j)
      })
      .catch(() => {
        if (!cancelled) setBook(null)
      })
    return () => {
      cancelled = true
    }
  }, [])
  return book
}

export function remainingSeasons(termEnd, season = CURRENT_SEASON) {
  if (termEnd == null || season == null) return null
  const n = Number(termEnd) - Number(season) + 1
  if (Number.isNaN(n)) return null
  return n > 0 ? n : 0
}

export function conferenceOf(school, book) {
  if (!school || !book?.conferences) return null
  const key = CONF_KEY[school.conference]
  return key ? book.conferences[key] || null : null
}

export function schoolRecord(school, book) {
  if (!school || !book?.schools) return { deals: [], exceptions: [] }
  const row = book.schools[school.id] || {}
  return {
    deals: row.deals || [],
    exceptions: row.exceptions || [],
  }
}

/** Equal-share of the cited conference pot. Big 12 uses dealMembers (12), not 16. */
export function equalShareEstimate(conf) {
  if (!conf || conf.split !== 'equal' || !conf.annual) return null
  const denom = conf.dealMembers || conf.members
  if (!denom) return null
  return {
    value: Math.round(conf.annual / denom),
    members: denom,
    pot: conf.annual,
    formula: `cited pot / ${denom} members`,
  }
}

export function schoolCheck(school, book) {
  const conf = conferenceOf(school, book)
  const rec = schoolRecord(school, book)
  if (rec.exceptions.length) {
    return rec.exceptions.map((ex) => ({
      kind: ex.kind || 'reported-exception',
      name: ex.name,
      value: ex.value ?? null,
      valueHigh: ex.valueHigh ?? null,
      confidence: ex.confidence || 'reported',
      notes: ex.notes || '',
      sources: ex.sources || [],
      formula: null,
    }))
  }
  if (conf?.split === 'equal') {
    const est = equalShareEstimate(conf)
    if (!est) {
      return [{
        kind: 'pending',
        name: 'Conference media check',
        value: null,
        confidence: 'pending',
        notes: 'No cited pot and member count for an equal-share estimate.',
        sources: [],
        formula: null,
      }]
    }
    return [{
      kind: 'equal-share-estimate',
      name: 'Implied conference media check',
      value: est.value,
      confidence: 'estimated',
      notes: `Equal-share estimate: ${est.formula}. This is the conference rights fee divided by the cited member count — not a school contract, and not the full 990 distribution (CFP / bowls / NCAA sit on top).`,
      sources: conf.sources || [],
      formula: est.formula,
    }]
  }
  return [{
    kind: 'pending',
    name: 'Conference media check',
    value: null,
    confidence: 'pending',
    notes: conf?.splitLabel || 'This conference does not publish an equal per-school media check. We do not invent one.',
    sources: [],
    formula: null,
  }]
}

export function deskMedia(school) {
  const field = school?.capacity?.mediaConference
  if (!field || field.value == null) return null
  return field
}

export function conferenceList(book) {
  if (!book?.conferences) return []
  return ['SEC', 'Big Ten', 'ACC', 'Big 12'].map((id) => book.conferences[id]).filter(Boolean)
}

export function collectTvSources(conf, rec, national) {
  const out = []
  const seen = new Set()
  const push = (src) => {
    if (!src?.url || seen.has(src.url)) return
    seen.add(src.url)
    out.push(src)
  }
  for (const s of conf?.sources || []) push(s)
  for (const d of rec?.deals || []) for (const s of d.sources || []) push(s)
  for (const e of rec?.exceptions || []) for (const s of e.sources || []) push(s)
  for (const s of national?.cfp?.sources || []) push(s)
  return out
}
