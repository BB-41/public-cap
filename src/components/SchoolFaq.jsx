import { schoolFaqIntro, schoolFaqItems } from '../lib/schoolSeo.js'

export default function SchoolFaq({ school, year1, year2, spend }) {
  const items = schoolFaqItems(school, { year1, year2, spend })
  if (!items.length) return null
  return (
    <section className="school-faq" id="common-questions">
      <h2>Common questions</h2>
      <p className="lede">{schoolFaqIntro(school.name)}</p>
      {items.map((item) => (
        <article key={item.question}>
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
        </article>
      ))}
    </section>
  )
}
