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
