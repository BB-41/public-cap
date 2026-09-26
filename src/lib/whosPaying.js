/**
 * Who's paying — company ties behind capacity, plus outside NIL.
 * Capacity already includes sponsorships/licensing. Company rows are not added again.
 */

export function schoolWhosPaying(book, id) {
  const entry = book?.schools?.[id]
  return entry || null
}

export function citeNodes(entry) {
  const nodes = []
  function take(node, path) {
    if (!node || typeof node !== 'object') return
    if (node.url || node.source || node.asOf) nodes.push({ path, node })
    if (Array.isArray(node.cites)) node.cites.forEach((c, i) => take(c, `${path}.cites[${i}]`))
    if (Array.isArray(node.prior)) node.prior.forEach((c, i) => take(c, `${path}.prior[${i}]`))
  }
  if (!entry) return nodes
  take(entry.sponsorshipFiling, 'sponsorshipFiling')
  for (const key of ['partners', 'naming', 'outside']) {
    const list = entry[key] || []
    list.forEach((item, i) => take(item, `${key}[${i}]`))
  }
  return nodes
}

/** Term text that is not already inside the published dollar label. */
export function publicTerm(valueLabel, term) {
  if (!term || term === 'not public') return null
  const label = (valueLabel || '').toLowerCase()
  if (label.includes(term.toLowerCase())) return null
  const rest = term
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && !label.includes(part.toLowerCase()))
  return rest.length ? rest.join(', ') : null
}

export function apparelShort(row) {
  if (!row?.company) return null
  const bits = [row.company]
  const published = row.valueStatus === 'published' && row.valueLabel
  if (published) bits.push(row.valueLabel)
  const term = publicTerm(published ? row.valueLabel : '', row.term)
  if (term) bits.push(term)
  return bits.join(', ')
}

export function mediaShort(row) {
  if (!row?.company) return null
  return row.company.split(' (')[0]
}

/** Headline outside figure, or the no-figure line. A side filing that is not a program budget stays in the details. */
export function outsideShort(rows) {
  const list = rows || []
  const headline =
    list.find((row) => row.combineWithCapacity && row.valueStatus === 'published' && row.valueLabel) ||
    list.find((row) => row.approximate && row.valueStatus === 'published' && row.valueLabel)
  if (headline) {
    return headline.organization ? `${headline.organization}, ${headline.valueLabel}` : headline.valueLabel
  }
  if (list.some((row) => row.valueStatus === 'no-reliable-figure')) return 'No reliable public figure'
  return null
}

/** Booked capacity plus one sourced outside figure. Null when the outside piece is missing, approximate, or not flagged. */
export function fullPicture(booked, outside) {
  if (!outside?.combineWithCapacity) return null
  if (outside.approximate) return null
  if (typeof outside.value !== 'number' || typeof booked !== 'number') return null
  return {
    booked,
    outside: outside.value,
    sum: booked + outside.value,
    outsideLabel: outside.line || outside.organization,
    yearNote: outside.yearNote || '',
  }
}
