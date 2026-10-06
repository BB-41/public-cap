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
    sentences.push(`${name} has paid out ${moneyExact(spent.value)} of that so far${window}.`)
    if (spent.field?.partialYear) {
      sentences.push('That amount covers only part of the year, not a full season.')
    }
    if (booked != null && booked === spent.value) {
      sentences.push('That is also the NIL budget figure on this page.')
    }
    const extras = datedSpentSteps(bookedField).filter((step) => Number(step.value) !== spent.value)
    if (extras.length) {
      const bits = extras.map((step) => {
        const when = step.window ? ` (${step.window})` : ''
        return `${moneyExact(step.value)}${when}`
      })
      const label = extras.length > 1 ? 'Separate payment windows' : 'A separate payment window'
      sentences.push(`${label}: ${joinAnd(bits)}. Not included in the payout above.`)
    }
  } else {
    sentences.push(`${name} hasn't released how much of that it has actually paid out.`)
  }

  if (booked != null && booked !== spent?.value) {
    const window = bookedField.window ? ` (${bookedField.window})` : ''
    sentences.push(`The NIL budget figure reported here is ${moneyExact(booked)}${window}.`)
    if (bookedField.partialYear) {
      sentences.push('That amount covers only part of the year, not a full season.')
    }
    if (spent) sentences.push('The House payout and the NIL budget figure are listed separately.')
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
    sentences.push(`FY2025 football revenue for ${name} is ${moneyExact(rev)}.`)
  }
  if (spend != null) {
    sentences.push(`FY2025 football spending for ${name} is ${moneyExact(spend)}.`)
  }
  if (rev != null && spend != null) {
    sentences.push('Revenue is what the program brought in. Spending is what it paid out. They are not added together.')
  } else if (spend != null) {
    sentences.push(`That figure is spending, not football revenue. We don't have a reported football revenue figure for ${name} yet.`)
  } else {
    sentences.push(`We don't have a reported football spending figure for ${name} yet.`)
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
    const mark = pay.confidence === 'estimated' ? 'an estimated ' : ''
    sentences.push(`${who} at ${school.name} is ${mark}${moneyExact(payVal)}${asOfBit(pay.asOf)}.`)
  } else {
    sentences.push(`We haven't confirmed what ${school.name} pays its head coach yet.`)
  }
  if (buyVal != null) {
    const mark = buy.confidence === 'estimated' ? 'an estimated ' : ''
    const when = buy.firedLabel ? ` ${buy.firedLabel}` : asOfBit(buy.asOf)
    sentences.push(`The buyout is ${mark}${moneyExact(buyVal)}${when}.`)
  } else {
    sentences.push("We haven't confirmed the buyout figure yet.")
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
  const noun = rows.length === 1
    ? "That comes from the collective's tax return, not the school's House payments or football revenue."
    : "Those come from the collective's tax return, not the school's House payments or football revenue."
  return `${school.name}'s collective ${joinAnd(bits)} (Form 990). ${noun}`
}

export function schoolFaqIntro(name) {
  return `${name}: NIL budget, collective payout, football revenue, and head coach salary.`
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

export const SCHOOL_DESC_LIMIT = 155

function descriptionFigures(school, ctx) {
  const parts = []
  const rev = hasVal(school.capacity?.eadaFootball) ? school.capacity.eadaFootball.value : null
  const spend = ctx.spend != null && Number.isFinite(Number(ctx.spend)) ? Number(ctx.spend) : null
  if (rev != null) parts.push(`FY2025 football revenue ${moneyExact(rev)}`)
  if (spend != null) parts.push(rev != null ? `spending ${moneyExact(spend)}` : `FY2025 football spending ${moneyExact(spend)}`)
  const spent = bookedHouseSpend(school)
  if (parts.length < 2 && spent) parts.push(`House payout ${moneyExact(spent.value)}`)
  const pay = school.coaches?.football?.pay
  if (parts.length < 2 && pay?.value != null && Number.isFinite(Number(pay.value))) {
    parts.push(`head coach pay ${moneyExact(pay.value)}`)
  }
  if (parts.length < 2 && ctx.year1 != null) parts.push(`House revenue-share cap ${capPhrase(ctx.year1)}`)
  if (parts.length < 2 && ctx.year2 != null) parts.push(`2026–27 House cap ${capPhrase(ctx.year2)}`)
  return parts.slice(0, 2)
}

function coverageTail(figures) {
  const hasRevenue = figures.some((figure) => figure.includes('football revenue'))
  const hasPay = figures.some((figure) => figure.includes('coach pay'))
  const bits = ['NIL budget', 'collective payout']
  if (!hasRevenue) bits.push('football revenue')
  if (!hasPay) bits.push('coach salary')
  if (bits.length === 2) return 'NIL budget and collective payout.'
  return `${bits.slice(0, -1).join(', ')}, and ${bits[bits.length - 1]}.`
}

export function schoolSerpDescription(schoolOrName, ctx = {}) {
  const name = typeof schoolOrName === 'string' ? schoolOrName : schoolOrName?.name
  if (!name) return null
  const topic = `${name}: NIL budget, collective payout, football revenue, and head coach salary.`
  const school = schoolOrName && typeof schoolOrName === 'object' ? schoolOrName : null
  if (!school?.id) return topic
  const figures = descriptionFigures(school, ctx)
  if (!figures.length) return topic
  const figureText = `${name}: ${joinAnd(figures)}.`
  const full = `${figureText} ${coverageTail(figures)}`
  if (full.length <= SCHOOL_DESC_LIMIT) return full
  const short = `${figureText} NIL budget and collective payout.`
  if (short.length <= SCHOOL_DESC_LIMIT) return short
  return figureText
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
        <p class="fine"><a href="/buyout/${escHtml(school.id)}">${escHtml(school.coaches?.football?.name ? `${school.coaches.football.name} buyout` : 'Buyout')}</a></p>
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
