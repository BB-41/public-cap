/**
 * NIL 101 copy, shared by the React page and the build-time HTML shell
 * so a non-JS crawler and the rendered page cannot drift.
 * Dollar figures are passed in (the booked House caps). This file does not
 * hardcode a year-2 amount.
 */
import { money, moneyExact } from './format.js'

export const NIL101_H1 = 'NIL 101'
export const NIL101_LEDE = 'How college athletes get paid. Plain words. You can read this in about three minutes.'
export const NIL101_HOME_LINK_TEXT = 'NIL 101: how college athletes get paid'
export const NIL101_SCHOOL_LINK_TEXT = 'How NIL works'
/** First commit of the guide. */
export const NIL101_DATE_PUBLISHED = '2026-09-25'
/** Static full-text shell published for crawlers. */
export const NIL101_DATE_MODIFIED = '2026-09-27'

const FAN = {
  src: '/nil101/fan.webp',
  alt: 'Cartoon piggy bank dressed as a fan, in a team jersey and cap, holding a pennant.',
  caption: 'Fans pool money too.',
  width: 420,
  height: 461,
}

const COACH = {
  src: '/nil101/coach.webp',
  alt: 'Cartoon piggy bank dressed as a coach, with a headset and a clipboard.',
  caption: 'Schools can pay players now.',
  width: 420,
  height: 618,
}

const REFEREE = {
  src: '/nil101/referee.webp',
  alt: 'Cartoon piggy bank dressed as a referee, in a striped shirt, with a whistle.',
  caption: 'Big deals get a look.',
  width: 354,
  height: 575,
}

/** Short label from a booked cap. Exact dollars stay in parentheses when rounding would hide them. */
export function capPhrase(value) {
  const millions = Number(value) / 1_000_000
  const oneDecimal = Math.round(millions * 10) / 10
  const useTwo = Math.abs(millions - oneDecimal) > 0.005
  const short = money(value, useTwo ? 2 : 1)
  const exact = moneyExact(value)
  const rounded = (useTwo ? Math.round(millions * 100) / 100 : oneDecimal) * 1_000_000
  if (Math.abs(rounded - value) > 1) return `${short} (${exact})`
  return short
}

function yearParagraph(year1, year2) {
  const line = `Year 1 (2025\u201326) is ${capPhrase(year1)}.`
  if (year2 == null) return line
  return `${line} Year 2 (2026\u201327) is ${capPhrase(year2)}.`
}

function partsText(parts) {
  return parts.map((part) => (typeof part === 'string' ? part : part.text)).join('')
}

/** Plain answer a reader sees for one section, in DOM order, with whitespace collapsed. */
export function sectionAnswer(section) {
  const bits = section.paragraphs.map(partsText)
  if (section.table) {
    for (const header of section.table.headers) {
      const cell = String(header || '').replace(/\s+/g, ' ').trim()
      if (cell) bits.push(cell)
    }
    for (const row of section.table.rows) bits.push(...row)
  }
  if (section.mascot) bits.push(section.mascot.caption)
  return bits.join(' ')
}

export function nil101Model({ year1, year2 }) {
  return {
    h1: NIL101_H1,
    lede: NIL101_LEDE,
    close: {
      slogan: 'What can your team actually afford?',
      href: '/',
      text: 'Look up your team',
    },
    sections: [
      {
        question: 'What is NIL?',
        paragraphs: [
          ['NIL means name, image, and likeness.'],
          ["That is a player's name, face, and fame."],
          ['Since July 2021, college athletes can get paid for those things.'],
          ['Businesses and fans pay for ads, social posts, appearances, and autographs.'],
        ],
      },
      {
        question: 'Who pays it?',
        mascot: FAN,
        paragraphs: [
          ['Brands pay.'],
          ['Local businesses pay.'],
          ['Collectives pay too.'],
          ['A collective is a group of boosters and fans tied to a school. They pool money for athletes.'],
        ],
      },
      {
        question: 'What changed in 2025?',
        mascot: COACH,
        paragraphs: [
          ['House v. NCAA is a court case about athlete pay.'],
          ['A judge approved the settlement in June 2025.'],
          ['For the first time, schools can pay their own athletes.'],
          ['That pay is called revenue sharing. The school shares some of its sports money with players.'],
          ['A cap is the most each school can pay. Every school that takes part gets the same cap.'],
          [yearParagraph(year1, year2)],
        ],
      },
      {
        question: 'NIL money vs. school money',
        paragraphs: [['These are two different checks.']],
        table: {
          caption: 'Outside NIL deals compared with school revenue sharing',
          headers: ['', 'Outside NIL deals', 'School money'],
          rows: [
            ['Who pays', 'Brands, local businesses, and collectives', 'The school'],
            ['Is there a limit?', 'Not the school cap. Deals over $600 get a review.', 'Yes. The yearly cap above.'],
            ['Count toward the school cap?', 'No. These deals sit beside the cap.', 'Yes. This is the money under the cap.'],
            ['Who checks it?', 'NIL Go, for deals over $600.', 'The school, against the cap.'],
          ],
        },
      },
      {
        question: 'Who checks the deals?',
        mascot: REFEREE,
        paragraphs: [
          ['Outside NIL deals over $600 are reviewed.'],
          ['The review desk is NIL Go. It is a clearinghouse, which just means a place that checks deals before they count.'],
          ['The College Sports Commission runs NIL Go, with help from Deloitte. That commission is the group set up to look at these deals.'],
          ['The check is meant to see that the deal is a real job at a fair price. It is a review, not a promise that every deal is perfect.'],
        ],
      },
      {
        question: 'Are players employees?',
        paragraphs: [
          ['Not right now.'],
          ['Courts and Congress are still arguing about it.'],
        ],
      },
      {
        question: 'Does every player get paid the same?',
        paragraphs: [
          ['No.'],
          ['Stars and key positions get more.'],
          ['Many players get little or nothing.'],
        ],
      },
      {
        question: 'How does this connect to our numbers?',
        paragraphs: [
          [
            'House spend is money a school has paid athletes under the cap, shown here only when a public filing is on the desk, and an empty cell means we do not have a number (',
            { href: '/methods', text: 'Methods' },
            ', ',
            { href: '/school/texas', text: 'Texas' },
            ', ',
            { href: '/school/ohio-state', text: 'Ohio State' },
            ').',
          ],
          [
            'Capacity is what a program can afford in a year from the public filing stack \u2014 media, sponsorships, tickets, and booked gifts \u2014 and it is not the House cap (',
            { href: '/compare', text: 'compare two schools' },
            ').',
          ],
          [
            'Reported NIL is a survey range or a labeled modeled band for the football roster, mixing school pay and outside deals, and it is not a filed total or leftover (',
            { href: '/reported-nil', text: 'see the board' },
            ').',
          ],
          [
            'The ',
            { href: '/checkbook-bowl', text: 'checkbook bowl' },
            ' asks whether the bigger football spender won the big game.',
          ],
        ],
      },
    ],
  }
}

function escHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escAttr(value) {
  return escHtml(value).replace(/"/g, '&quot;')
}

function renderParts(parts) {
  return parts
    .map((part) => (typeof part === 'string' ? escHtml(part) : `<a href="${escAttr(part.href)}">${escHtml(part.text)}</a>`))
    .join('')
}

function renderParagraphs(paragraphs) {
  return paragraphs.map((parts) => `          <p>${renderParts(parts)}</p>`).join('\n')
}

function renderTable(table) {
  const head = table.headers
    .map((header) => `                <th scope="col">${header ? escHtml(header) : ' '}</th>`)
    .join('\n')
  const rows = table.rows
    .map((row) => {
      const cells = row
        .map((cell, i) =>
          i === 0
            ? `                <th scope="row">${escHtml(cell)}</th>`
            : `                <td>${escHtml(cell)}</td>`,
        )
        .join('\n')
      return `              <tr>\n${cells}\n              </tr>`
    })
    .join('\n')
  return `        <div class="nil101-scroll">
          <table class="nil101-table">
            <caption class="visually-hidden">${escHtml(table.caption)}</caption>
            <thead>
              <tr>
${head}
              </tr>
            </thead>
            <tbody>
${rows}
            </tbody>
          </table>
        </div>`
}

function renderMascot(mascot) {
  return `        <figure class="nil101-mascot">
          <img src="${escAttr(mascot.src)}" alt="${escAttr(mascot.alt)}" width="${mascot.width}" height="${mascot.height}" decoding="async" />
          <figcaption>${escHtml(mascot.caption)}</figcaption>
        </figure>`
}

function renderSection(section) {
  let body
  if (section.mascot) {
    body = `        <div class="nil101-with-art">
          <div>
${renderParagraphs(section.paragraphs)}
          </div>
${renderMascot(section.mascot)}
        </div>`
  } else if (section.table) {
    body = `${renderParagraphs(section.paragraphs)}
${renderTable(section.table)}`
  } else {
    body = renderParagraphs(section.paragraphs)
  }
  return `      <article class="nil101-card">
        <h2>${escHtml(section.question)}</h2>
${body}
      </article>`
}

/** Full guide element. One h1. Question headings are h2. */
export function renderNil101Page({ year1, year2 }) {
  const model = nil101Model({ year1, year2 })
  const sections = model.sections.map(renderSection).join('\n')
  return `<div class="page-wrap nil101-page">
        <h1 class="issue-hed">${escHtml(model.h1)}</h1>
        <p class="lede">${escHtml(model.lede)}</p>
${sections}
        <section class="nil101-close">
          <p class="nil101-slogan">${escHtml(model.close.slogan)}</p>
          <p><a class="nil101-cta" href="${escAttr(model.close.href)}">${escHtml(model.close.text)}</a></p>
        </section>
      </div>`
}

export function nil101CueHtml(text) {
  return `<p class="fine nil-101-cue"><a href="/nil-101">${escHtml(text)}</a></p>`
}

function decodeHtml(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

/** Visible text of an HTML fragment. Skips image alt and visually-hidden nodes. */
export function visibleText(html) {
  let s = String(html)
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  s = s.replace(/<([a-z0-9]+)\b[^>]*\bvisually-hidden\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  s = s.replace(/<img\b[^>]*>/gi, '')
  // Drop tags without inserting spaces. Newlines between blocks still separate words.
  s = s.replace(/<[^>]+>/g, '')
  return decodeHtml(s).replace(/\s+/g, ' ').trim()
}

/** Question heading plus the visible answer inside each guide article. */
export function articleAnswersFromHtml(html) {
  const articles = String(html).match(/<article\b[^>]*>[\s\S]*?<\/article>/g) || []
  return articles.map((article) => {
    const heading = article.match(/<h2>([^<]*)<\/h2>/)
    if (!heading) throw new Error('NIL 101 article is missing an h2')
    const body = article.replace(/<h2>[^<]*<\/h2>/, ' ')
    return { question: heading[1], answer: visibleText(body) }
  })
}

export function nil101StructuredData({
  pageHtml,
  title,
  description,
  url,
  image,
  datePublished = NIL101_DATE_PUBLISHED,
  dateModified = NIL101_DATE_MODIFIED,
}) {
  const faqs = articleAnswersFromHtml(pageHtml)
  const org = { '@type': 'Organization', name: 'The Public Cap' }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        url,
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
      {
        '@type': 'Article',
        headline: title,
        description,
        author: org,
        publisher: org,
        datePublished,
        dateModified,
        url,
        image,
      },
    ],
  }
}

export function embedNil101JsonLd(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return `<script type="application/ld+json" id="public-cap-jsonld">\n      ${json}\n    </script>`
}

const JSON_LD_ID = 'public-cap-jsonld'

/** Keep the live document's JSON-LD aligned with the guide currently on screen. */
export function syncNil101JsonLd({ year1, year2, title, description, url, image }) {
  if (typeof document === 'undefined') return
  const pageHtml = renderNil101Page({ year1, year2 })
  const data = nil101StructuredData({ pageHtml, title, description, url, image })
  let el = document.getElementById(JSON_LD_ID)
  if (!el) {
    el = document.createElement('script')
    el.id = JSON_LD_ID
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}
