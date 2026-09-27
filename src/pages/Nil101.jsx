import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadMeta } from '../lib/loadDesk.js'
import { nil101Model, syncNil101JsonLd } from '../lib/nil101Guide.js'
import { HOUSE_2025_26 } from '../lib/nilModel.js'
import { canonicalUrl, descriptionFromPath, ogImageFromPath, titleFromPath } from '../lib/share.js'

function readBootYear2() {
  if (typeof document === 'undefined') return null
  const raw = document.getElementById('root')?.getAttribute('data-nil-year2')
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function Parts({ parts }) {
  return parts.map((part, i) =>
    typeof part === 'string' ? <Fragment key={i}>{part}</Fragment> : <Link key={i} to={part.href}>{part.text}</Link>,
  )
}

function Paragraphs({ paragraphs }) {
  return paragraphs.map((parts, i) => (
    <p key={i}>
      <Parts parts={parts} />
    </p>
  ))
}

function GuideTable({ table }) {
  return (
    <div className="nil101-scroll">
      <table className="nil101-table">
        <caption className="visually-hidden">{table.caption}</caption>
        <thead>
          <tr>
            {table.headers.map((header, i) => (
              <th key={i} scope="col">{header || ' '}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) =>
                i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>,
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Mascot({ src, alt, caption, width, height }) {
  return (
    <figure className="nil101-mascot">
      <img src={src} alt={alt} width={width} height={height} decoding="async" />
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

function SectionBody({ section }) {
  if (section.mascot) {
    return (
      <div className="nil101-with-art">
        <div>
          <Paragraphs paragraphs={section.paragraphs} />
        </div>
        <Mascot {...section.mascot} />
      </div>
    )
  }
  return (
    <>
      <Paragraphs paragraphs={section.paragraphs} />
      {section.table ? <GuideTable table={section.table} /> : null}
    </>
  )
}

export default function Nil101() {
  const [year1, setYear1] = useState(HOUSE_2025_26)
  const [year2, setYear2] = useState(readBootYear2)

  useEffect(() => {
    let cancelled = false
    loadMeta()
      .then((meta) => {
        if (cancelled || !meta?.houseCap) return
        const y1 = meta.houseCap.y2025_26?.value
        const y2 = meta.houseCap.y2026_27?.value
        if (typeof y1 === 'number') setYear1(y1)
        if (typeof y2 === 'number') setYear2(y2)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    syncNil101JsonLd({
      year1,
      year2,
      title: titleFromPath('/nil-101'),
      description: descriptionFromPath('/nil-101'),
      url: canonicalUrl('/nil-101'),
      image: ogImageFromPath('/nil-101'),
    })
  }, [year1, year2])

  const model = nil101Model({ year1, year2 })
  return (
    <div className="page-wrap nil101-page">
      <h1 className="issue-hed">{model.h1}</h1>
      <p className="lede">{model.lede}</p>
      {model.sections.map((section) => (
        <article key={section.question} className="nil101-card">
          <h2>{section.question}</h2>
          <SectionBody section={section} />
        </article>
      ))}
      <section className="nil101-close">
        <p className="nil101-slogan">{model.close.slogan}</p>
        <p>
          <Link className="nil101-cta" to={model.close.href}>{model.close.text}</Link>
        </p>
      </section>
    </div>
  )
}
