import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { money, moneyExact } from '../lib/format.js'
import { loadMeta } from '../lib/loadDesk.js'
import { HOUSE_2025_26 } from '../lib/nilModel.js'

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

function Mascot({ src, alt, caption, width, height }) {
  return (
    <figure className="nil101-mascot">
      <img src={src} alt={alt} width={width} height={height} decoding="async" />
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

export default function Nil101() {
  const [year1, setYear1] = useState(HOUSE_2025_26)
  const [year2, setYear2] = useState(null)

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

  return (
    <div className="page-wrap nil101-page">
      <h1 className="issue-hed">NIL 101</h1>
      <p className="lede">
        How college athletes get paid. Plain words. You can read this in about three minutes.
      </p>

      <article className="nil101-card">
        <h2>What is NIL?</h2>
        <p>NIL means name, image, and likeness.</p>
        <p>That is a player&apos;s name, face, and fame.</p>
        <p>Since July 2021, college athletes can get paid for those things.</p>
        <p>Businesses and fans pay for ads, social posts, appearances, and autographs.</p>
      </article>

      <article className="nil101-card">
        <h2>Who pays it?</h2>
        <div className="nil101-with-art">
          <div>
            <p>Brands pay.</p>
            <p>Local businesses pay.</p>
            <p>Collectives pay too.</p>
            <p>
              A collective is a group of boosters and fans tied to a school.
              They pool money for athletes.
            </p>
          </div>
          <Mascot
            src="/nil101/fan.webp"
            alt="Cartoon piggy bank dressed as a fan, in a team jersey and cap, holding a pennant."
            caption="Fans pool money too."
            width={420}
            height={461}
          />
        </div>
      </article>

      <article className="nil101-card">
        <h2>What changed in 2025?</h2>
        <div className="nil101-with-art">
          <div>
            <p>House v. NCAA is a court case about athlete pay.</p>
            <p>A judge approved the settlement in June 2025.</p>
            <p>For the first time, schools can pay their own athletes.</p>
            <p>
              That pay is called revenue sharing.
              The school shares some of its sports money with players.
            </p>
            <p>
              A cap is the most each school can pay.
              Every school that takes part gets the same cap.
            </p>
            <p>
              Year 1 (2025–26) is {capPhrase(year1)}.
              {year2 != null ? <> Year 2 (2026–27) is {capPhrase(year2)}.</> : null}
            </p>
          </div>
          <Mascot
            src="/nil101/coach.webp"
            alt="Cartoon piggy bank dressed as a coach, with a headset and a clipboard."
            caption="Schools can pay players now."
            width={420}
            height={618}
          />
        </div>
      </article>

      <article className="nil101-card">
        <h2>NIL money vs. school money</h2>
        <p>These are two different checks.</p>
        <div className="nil101-scroll">
          <table className="nil101-table">
            <caption className="visually-hidden">
              Outside NIL deals compared with school revenue sharing
            </caption>
            <thead>
              <tr>
                <th scope="col"> </th>
                <th scope="col">Outside NIL deals</th>
                <th scope="col">School money</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Who pays</th>
                <td>Brands, local businesses, and collectives</td>
                <td>The school</td>
              </tr>
              <tr>
                <th scope="row">Is there a limit?</th>
                <td>Not the school cap. Deals over $600 get a review.</td>
                <td>Yes. The yearly cap above.</td>
              </tr>
              <tr>
                <th scope="row">Count toward the school cap?</th>
                <td>No. These deals sit beside the cap.</td>
                <td>Yes. This is the money under the cap.</td>
              </tr>
              <tr>
                <th scope="row">Who checks it?</th>
                <td>NIL Go, for deals over $600.</td>
                <td>The school, against the cap.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article className="nil101-card">
        <h2>Who checks the deals?</h2>
        <div className="nil101-with-art">
          <div>
            <p>Outside NIL deals over $600 are reviewed.</p>
            <p>
              The review desk is NIL Go.
              It is a clearinghouse, which just means a place that checks deals before they count.
            </p>
            <p>
              The College Sports Commission runs NIL Go, with help from Deloitte.
              That commission is the group set up to look at these deals.
            </p>
            <p>
              The check is meant to see that the deal is a real job at a fair price.
              It is a review, not a promise that every deal is perfect.
            </p>
          </div>
          <Mascot
            src="/nil101/referee.webp"
            alt="Cartoon piggy bank dressed as a referee, in a striped shirt, with a whistle."
            caption="Big deals get a look."
            width={354}
            height={575}
          />
        </div>
      </article>

      <article className="nil101-card">
        <h2>Are players employees?</h2>
        <p>Not right now.</p>
        <p>Courts and Congress are still arguing about it.</p>
      </article>

      <article className="nil101-card">
        <h2>Does every player get paid the same?</h2>
        <p>No.</p>
        <p>Stars and key positions get more.</p>
        <p>Many players get little or nothing.</p>
      </article>

      <article className="nil101-card">
        <h2>How does this connect to our numbers?</h2>
        <p>
          House spend is money a school has paid athletes under the cap, shown here only when a public filing is on the desk, and an empty cell means we do not have a number
          {' '}(<Link to="/methods">Methods</Link>, <Link to="/school/texas">Texas</Link>, <Link to="/school/ohio-state">Ohio State</Link>).
        </p>
        <p>
          Capacity is what a program can afford in a year from the public filing stack — media, sponsorships, tickets, and booked gifts — and it is not the House cap
          {' '}(<Link to="/compare">compare two schools</Link>).
        </p>
        <p>
          Reported NIL is a survey range or a labeled modeled band for the football roster, mixing school pay and outside deals, and it is not a filed total or leftover
          {' '}(<Link to="/reported-nil">see the board</Link>).
        </p>
        <p>
          The <Link to="/checkbook-bowl">checkbook bowl</Link> asks whether the bigger football spender won the big game.
        </p>
      </article>

      <section className="nil101-close">
        <p className="nil101-slogan">What can your team actually afford?</p>
        <p>
          <Link className="nil101-cta" to="/">Look up your team</Link>
        </p>
      </section>
    </div>
  )
}
