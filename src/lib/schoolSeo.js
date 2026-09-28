/**
 * Per-school SERP description and Common questions.
 * Shared by the React school page and the static HTML shell so a crawler
 * and the rendered page use the same sentences.
 *
 * Every dollar comes from the school record, the booked House caps passed
 * in, or the FY2025 EADA football-spending figure passed in. This file
 * does not hardcode a cap or a school dollar.
 */
import { formatLongDate } from './buyout.js'
import { datedSpentSteps, hasVal, leadHouseRemaining } from './compute.js'
import { moneyExact } from './format.js'
import { capPhrase, visibleText } from './nil101Guide.js'

function joinAnd(parts) {
  if (parts.length <= 1) return parts[0] || ''
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

function asOfBit(iso) {
  if (!iso) return ''
  return ` as of ${formatLongDate(iso)}`
}

/** Booked House spent cell only. Never a cap plan and never a sum of windows. */
export function bookedHouseSpend(school) {
  const lead = leadHouseRemaining(school)
  const spent = lead?.field?.spent
  if (spent == null || spent === '' || !Number.isFinite(Number(spent))) return null
  return { value: Number(spent), field: lead.field }
}

function payPlayersAnswer(school, ctx) {
  const name = school.name
  const year1 = ctx.year1
  const year2 = ctx.year2
  const spent = bookedHouseSpend(school)
  const bookedField = school.nil?.booked
  const booked = hasVal(bookedField) ? Number(bookedField.value) : null
  if (year1 == null && year2 == null && !spent && booked == null) return null

  const sentences = []
  if (year1 != null && year2 != null) {
    sentences.push(
      `The House revenue-share cap is ${capPhrase(year1)} in 2025–26 and ${capPhrase(year2)} in 2026–27.`,
    )
  } else if (year1 != null) {
    sentences.push(`The House revenue-share cap is ${capPhrase(year1)} in 2025–26.`)
  } else if (year2 != null) {
    sentences.push(`The House revenue-share cap is ${capPhrase(year2)} in 2026–27.`)
  }

  if (spent) {
    const window = spent.field?.window ? ` (${spent.field.window})` : ''
    sentences.push(`Booked House spend for ${name} is ${moneyExact(spent.value)}${window}.`)
    if (spent.field?.partialYear) {
      sentences.push('That House spend is a partial window, not a full-year total.')
    }
    if (booked != null && booked === spent.value) {
      sentences.push('That booked line is also the NIL budget stand-in on this page.')
    }
    const extras = datedSpentSteps(bookedField).filter((step) => Number(step.value) !== spent.value)
    if (extras.length) {
      const bits = extras.map((step) => {
        const when = step.window ? ` (${step.window})` : ''
        return `${moneyExact(step.value)}${when}`
      })
      sentences.push(
        `Separate dated window${extras.length > 1 ? 's' : ''} on this page: ${joinAnd(bits)}. Not added to House spend.`,
      )
    }
  } else {
    sentences.push(`${name}'s own House spend is not public on this desk yet.`)
  }

  if (booked != null && booked !== spent?.value) {
    const window = bookedField.window ? ` (${bookedField.window})` : ''
    sentences.push(
      `Booked NIL on this page, the public stand-in for an NIL budget, is ${moneyExact(booked)}${window}.`,
    )
    if (bookedField.partialYear) {
      sentences.push('That NIL figure is a partial window, not a full-year total.')
    }
    if (spent) sentences.push('House spend and booked NIL are separate lines on this page.')
  }
  return sentences.join(' ')
}

function footballAnswer(school, ctx) {
  const name = school.name
  const revField = school.capacity?.eadaFootball
  const rev = hasVal(revField) ? revField.value : null
  const spend = ctx.spend != null && Number.isFinite(Number(ctx.spend)) ? Number(ctx.spend) : null
  if (rev == null && spend == null) return null
  const sentences = []
  if (rev != null) {
    sentences.push(`FY2025 EADA football revenue for ${name} is ${moneyExact(rev)}.`)
  }
  if (spend != null) {
    sentences.push(`FY2025 EADA football spending for ${name} is ${moneyExact(spend)}.`)
  }
  if (rev != null && spend != null) {
    sentences.push('Revenue and spending are separate EADA lines, not a combined total.')
  } else if (spend != null) {
    sentences.push('That figure is spending, not football revenue. Football revenue is not booked on this page.')
  } else {
    sentences.push('Football spending is not booked on this page.')
  }
  return sentences.join(' ')
}

function coachAnswer(school) {
  const coach = school.coaches?.football
  if (!coach) return null
  const pay = coach.pay
  const buy = coach.buyout
  const payVal = pay?.value != null && Number.isFinite(Number(pay.value)) ? Number(pay.value) : null
  const buyVal = buy?.value != null && Number.isFinite(Number(buy.value)) ? Number(buy.value) : null
  if (payVal == null && buyVal == null) return null
  const who = coach.name ? `${coach.name}'s pay` : 'Head coach pay'
  const sentences = []
  if (payVal != null) {
    const mark = pay.confidence === 'estimated' ? ' (estimated)' : ''
    sentences.push(`${who} at ${school.name} is ${moneyExact(payVal)}${asOfBit(pay.asOf)}${mark}.`)
  } else {
    sentences.push(`${school.name}'s head coach pay is not public on this desk yet.`)
  }
  if (buyVal != null) {
    const mark = buy.confidence === 'estimated' ? ' (estimated)' : ''
    sentences.push(`The buyout is ${moneyExact(buyVal)}${asOfBit(buy.asOf)}${mark}.`)
  } else {
    sentences.push('The buyout is not public on this desk yet.')
  }
  return sentences.join(' ')
}

function collectiveAnswer(school) {
  const rows = (school.nil?.collective990 || []).filter((row) => row && row.value != null && Number.isFinite(Number(row.value)))
  if (!rows.length) return null
  const sorted = [...rows].sort(
    (a, b) => (b.taxYear || 0) - (a.taxYear || 0) || String(a.organization || '').localeCompare(String(b.organization || '')),
  )
  const groups = []
  for (const row of sorted) {
    const org = row.organization || ''
    const last = groups[groups.length - 1]
    if (last && last.org === org) last.rows.push(row)
    else groups.push({ org, rows: [row] })
  }
  const bits = groups.map((group) => {
    const pays = group.rows.map((row) => {
      const year = row.taxYear ? ` in tax year ${row.taxYear}` : ''
      return `${moneyExact(row.value)}${year}`
    })
    return `${group.org ? `${group.org} paid` : 'paid'} ${joinAnd(pays)}`
  })
  const noun = rows.length === 1 ? 'That payout is a lagged third-party filing' : 'Those payouts are lagged third-party filings'
  return `${school.name}'s collective ${joinAnd(bits)} (Form 990). ${noun}, not House spend and not football revenue.`
}

export function schoolFaqIntro(name) {
  return `${name} NIL budget, collective payout, football revenue, and head coach salary. Salaries on this page are the cited pay lines only. Pending stays empty.`
}

/** Questions with an answer from this school's booked data. */
export function schoolFaqItems(school, ctx = {}) {
  if (!school?.name) return []
  const name = school.name
  const specs = [
    [`How much does ${name} pay players (revenue share / NIL budget)?`, payPlayersAnswer(school, ctx)],
    [`How much does ${name} football make and spend?`, footballAnswer(school, ctx)],
    [`What does ${name} pay its coach, and what's the buyout?`, coachAnswer(school)],
    [`What has ${name}'s collective paid?`, collectiveAnswer(school)],
  ]
  return specs.filter(([, answer]) => answer).map(([question, answer]) => ({ question, answer }))
}

function descriptionFigures(school, ctx) {
  const parts = []
  const rev = hasVal(school.capacity?.eadaFootball) ? school.capacity.eadaFootball.value : null
  const spend = ctx.spend != null && Number.isFinite(Number(ctx.spend)) ? Number(ctx.spend) : null
  if (rev != null) parts.push(`FY2025 EADA football revenue ${moneyExact(rev)}`)
  if (spend != null) parts.push(`FY2025 EADA football spending ${moneyExact(spend)}`)
  const spent = bookedHouseSpend(school)
  if (parts.length < 2 && spent) parts.push(`booked House spend ${moneyExact(spent.value)}`)
  const pay = school.coaches?.football?.pay
  if (parts.length < 2 && pay?.value != null && Number.isFinite(Number(pay.value))) {
    parts.push(`head coach pay ${moneyExact(pay.value)}`)
  }
  if (parts.length < 2 && ctx.year1 != null) parts.push(`House revenue-share cap ${capPhrase(ctx.year1)}`)
  if (parts.length < 2 && ctx.year2 != null) parts.push(`2026–27 House cap ${capPhrase(ctx.year2)}`)
  return parts.slice(0, 2)
}

export function schoolSerpDescription(schoolOrName, ctx = {}) {
  const name = typeof schoolOrName === 'string' ? schoolOrName : schoolOrName?.name
  if (!name) return null
  const school = schoolOrName && typeof schoolOrName === 'object' ? schoolOrName : null
  const tail = 'Covers the NIL budget, collective payout, football revenue, and head coach salary. Pending stays empty.'
  if (!school?.id) {
    return `${name} NIL budget, collective payout, football revenue, and head coach salary. House revenue-share cap and FY2025 football figures appear when a filing is booked. Pending stays empty.`
  }
  const figures = descriptionFigures(school, ctx)
  if (!figures.length) return `${name}. ${tail}`
  const labeled = figures.map((figure, i) => {
    if (i === 0 && figure.startsWith('FY2025 EADA football revenue')) {
      return `${figure} (not total athletics revenue)`
    }
    return figure
  })
  return `${name}: ${joinAnd(labeled)}. ${tail}`
}

function escHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function renderSchoolStaticBody(school, ctx = {}) {
  const items = schoolFaqItems(school, ctx)
  const articles = items
    .map(
      (item) => `        <article>
          <h3>${escHtml(item.question)}</h3>
          <p>${escHtml(item.answer)}</p>
        </article>`,
    )
    .join('\n')
  return `<div class="page-wrap school-static">
        <h1 class="issue-hed">${escHtml(school.name)}</h1>
        <section class="school-faq" id="common-questions">
          <h2>Common questions</h2>
          <p class="lede">${escHtml(schoolFaqIntro(school.name))}</p>
${articles}
        </section>
        <p class="fine nil-101-cue"><a href="/nil-101">How NIL works</a></p>
      </div>`
}

/** Questions and answers as they appear in the static school shell. */
export function schoolFaqFromHtml(html) {
  const section = String(html).match(/<section class="school-faq"[\s\S]*?<\/section>/)
  if (!section) return []
  const articles = section[0].match(/<article>[\s\S]*?<\/article>/g) || []
  return articles.map((article) => {
    const heading = article.match(/<h3>([\s\S]*?)<\/h3>/)
    if (!heading) throw new Error('school FAQ article is missing an h3')
    const body = article.replace(/<h3>[\s\S]*?<\/h3>/, ' ')
    return { question: visibleText(heading[1]), answer: visibleText(body) }
  })
}

export function schoolFaqPageNode(items, url) {
  if (!items?.length) return null
  return {
    '@type': 'FAQPage',
    url,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}
