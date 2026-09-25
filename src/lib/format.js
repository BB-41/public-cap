export function money(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(digits)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(digits)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}k`
  return `${sign}$${abs.toFixed(0)}`
}

/** Private-school contract, or a public chair whose contract was not released. Not a dollar. */
export const COACH_PAY_PRIVATE_LABEL = 'Contract not public'
export const COACH_PAY_UNDISCLOSED_LABEL = 'Contract not yet released'

export function coachPayBlankLabel(pay) {
  if (!pay || pay.value != null) return null
  if (pay.unavailable === 'private') return COACH_PAY_PRIVATE_LABEL
  if (pay.unavailable === 'undisclosed') return COACH_PAY_UNDISCLOSED_LABEL
  return null
}

/** "about $20.5M" when the cite is approximate. Exact cents stay exact. */
export function moneyCited(n, { approximate = false } = {}) {
  if (n == null || Number.isNaN(n)) return '—'
  if (approximate) return `about ${money(n)}`
  return moneyExact(n)
}

export function moneyExact(n) {
  if (n == null || Number.isNaN(n)) return '—'
  const rounded = Math.round((Number(n) + Number.EPSILON) * 100) / 100
  const hasCents = Math.abs(rounded - Math.round(rounded)) > 0.0005
  return rounded.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })
}

export function pct(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return `${(n * 100).toFixed(0)}%`
}

export function earn(n) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function moneyRange(low, high, digits = 1) {
  if (low == null || high == null) return '—'
  return `${money(low, digits)}–${money(high, digits)}`
}

/** Compact through-year for the rank list. */
export function throughShort(term) {
  if (!term || term.confidence === 'pending') return null
  if (term.through) return String(term.through).slice(-2)
  if (term.rolling && term.yearsRemaining) return `${term.yearsRemaining}yr`
  return null
}

/** School-page term line: "Through 2029 · 3 years left" */
export function coachTermLabel(term) {
  if (!term || term.confidence === 'pending') return null
  const bits = []
  if (term.through) bits.push(`Through ${term.through}`)
  if (term.rolling && term.yearsRemaining != null) {
    bits.push(`${term.yearsRemaining}-year rolling`)
  } else if (term.yearsRemaining != null && !term.through) {
    bits.push(`${term.yearsRemaining} year${term.yearsRemaining === 1 ? '' : 's'} left`)
  } else if (term.yearsRemaining != null && term.through) {
    bits.push(`${term.yearsRemaining} year${term.yearsRemaining === 1 ? '' : 's'} left`)
  }
  return bits.length ? bits.join(' · ') : null
}

/** Visible CTA when a coach card has a public employment-agreement file. */
export function contractLinkLabel(url, label = '') {
  if (!url) return null
  const lab = String(label || '')
  if (/amendment/i.test(lab)) return 'Contract amendment'
  if (/\.pdf($|[?#])/i.test(url) || /documentcloud\.org|diligentoneplatform\.com/i.test(url)) {
    return 'Contract PDF'
  }
  if (/\b(term sheet|letter of intent|\bLOI\b|docket|minutes|BOT packet|employment agreement)\b/i.test(lab)) {
    return 'Contract PDF'
  }
  return lab || 'Contract / source'
}

/** Compact efficiency: wins per $1 million. */
export function winsPerM(perM) {
  if (perM == null || Number.isNaN(perM)) return '—'
  return `${perM.toFixed(2)}`
}
