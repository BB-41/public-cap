import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { money, moneyExact } from '../lib/format.js'
import { houseValueForSeason } from '../lib/seasons.js'

/** $20.5M → "$20.5 million". Uses the desk formatter so the rounding stays the same. */
function plainMillions(n) {
  const label = money(n)
  if (!label.endsWith('M')) return label
  return `${label.slice(0, -1)} million`
}

function Art({ src, alt, width, height, say }) {
  return (
    <figure className="nil101-art-wrap">
      <img className="nil101-art" src={src} alt={alt} width={width} height={height} decoding="async" />
      {say ? <figcaption className="nil101-say">{say}</figcaption> : null}
    </figure>
  )
}

export default function Nil101() {
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/data/meta.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (!cancelled) setMeta(m)
      })
      .catch(() => {
        if (!cancelled) setMeta(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const y1 = meta ? houseValueForSeason(meta, 2025) : null
  const y2 = meta ? houseValueForSeason(meta, 2026) : null

  return (
    <div className="page-wrap nil101">
      <p className="kicker">A plain-English guide</p>
      <h1 className="issue-hed">NIL 101</h1>
      <p className="lede">
        College athletes can get paid.
        This is the short version.
        It takes about three minutes.
      </p>

      <section className="nil101-card">
        <h2>What is NIL?</h2>
        <p>NIL means name, image, and likeness.</p>
        <p>It is a player’s right to make money from their own fame.</p>
        <p>Since July 2021, college athletes can get paid by businesses and fans.</p>
        <p>That pay can be for ads, social posts, appearances, and autographs.</p>
      </section>

      <section className="nil101-card nil101-with-art">
        <Art
          src="/nil101/fan.webp"
          alt="Cartoon piggy bank dressed as a fan, with a foam finger and jersey"
          width={360}
          height={384}
          say="Fans pool money too."
        />
        <div>
          <h2>Who pays it?</h2>
          <p>Brands pay.</p>
          <p>Local businesses pay.</p>
          <p>Collectives pay.</p>
          <p>A collective is a group of fans and boosters tied to a school.</p>
          <p>A booster is a fan who gives money.</p>
          <p>They pool that money and use it to pay athletes.</p>
        </div>
      </section>

      <section className="nil101-card nil101-with-art">
        <Art
          src="/nil101/coach.webp"
          alt="Cartoon piggy bank dressed as a coach, in a cap and polo"
          width={358}
          height={420}
          say="Schools can pay players now."
        />
        <div>
          <h2>What changed in 2025?</h2>
          <p>The House v. NCAA settlement was approved in June 2025.</p>
          <p>A settlement is a court deal that changed the rules.</p>
          <p>For the first time, schools can pay their athletes directly.</p>
          <p>That pay is called revenue sharing.</p>
          <p>Revenue sharing means the school pays players from its own sports money.</p>
          <p>
            Each school can pay up to a cap.
            A cap is the most it is allowed to pay.
            {y1 != null ? <> Year 1 (2025–26) is {plainMillions(y1)}.</> : null}
            {y2 != null ? (
              <>
                {' '}
                Year 2 (2026–27) on this desk is {moneyExact(y2)}, which we show as {plainMillions(y2)}.
              </>
            ) : null}
          </p>
          <p className="fine">
            Those cap figures are the House numbers booked on this desk.
            {' '}
            <Link to="/methods">Methods</Link>
            {' '}
            has the definition.
          </p>
        </div>
      </section>

      <section className="nil101-card">
        <h2>NIL money vs. school money</h2>
        <p>There are two checks. They are not the same check.</p>
        <div className="nil101-scroll">
          <table className="nil101-table">
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col">Outside NIL</th>
                <th scope="col">School money</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Who pays</th>
                <td data-label="Outside NIL">Brands, local businesses, and collectives</td>
                <td data-label="School money">The school</td>
              </tr>
              <tr>
                <th scope="row">Is there a limit?</th>
                <td data-label="Outside NIL">Deals over $600 get a fair-price check.</td>
                <td data-label="School money">
                  {y1 != null
                    ? `Yes. ${plainMillions(y1)} in Year 1${y2 != null ? `, and ${plainMillions(y2)} in Year 2` : ''}.`
                    : 'Yes. Each school has a cap.'}
                </td>
              </tr>
              <tr>
                <th scope="row">Does it count toward the school’s cap?</th>
                <td data-label="Outside NIL">No. A real outside job is a separate check.</td>
                <td data-label="School money">Yes. This is the money under the cap.</td>
              </tr>
              <tr>
                <th scope="row">Who checks the deal?</th>
                <td data-label="Outside NIL">NIL Go, for deals over $600.</td>
                <td data-label="School money">The school has to stay under the cap.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="nil101-card nil101-with-art">
        <Art
          src="/nil101/referee.webp"
          alt="Cartoon piggy bank dressed as a referee, with a whistle and striped shirt"
          width={285}
          height={420}
          say="Big outside deals get a look."
        />
        <div>
          <h2>Who checks the deals?</h2>
          <p>Outside NIL deals over $600 are reviewed.</p>
          <p>The reviewer is NIL Go.</p>
          <p>NIL Go is a clearinghouse run by the College Sports Commission, with Deloitte.</p>
          <p>A clearinghouse is an outside checker.</p>
          <p>The check is there to see if the deal is a real job at a fair price.</p>
          <p>School pay is different. The school has to stay under its cap.</p>
        </div>
      </section>

      <section className="nil101-card">
        <h2>Are players employees?</h2>
        <p>Not right now.</p>
        <p>Courts and Congress are still arguing about it.</p>
      </section>

      <section className="nil101-card">
        <h2>Does every player get paid the same?</h2>
        <p>No.</p>
        <p>Stars get more.</p>
        <p>Players at key positions get more.</p>
        <p>Plenty of players get little, or nothing.</p>
      </section>

      <section className="nil101-card nil101-close">
        <h2>How does this connect to our numbers?</h2>
        <p>
          House spend is the school money a public filing shows as paid under the cap — empty means we looked and do not have a number, not that the school paid zero — see{' '}
          <Link to="/methods">Methods</Link>
          {' '}
          and{' '}
          <Link to="/school/alabama">Alabama</Link>.
        </p>
        <p>
          Capacity is the yearly filing stack of media, sponsorships, tickets, and booked gifts — what a program can actually afford — and you can{' '}
          <Link to="/compare">compare</Link>
          {' '}
          two schools.
        </p>
        <p>
          Reported NIL is a survey range or a labeled conference band for football pay (school money plus outside deals), not the official booked check and not House spend — see{' '}
          <Link to="/reported-nil">Reported NIL</Link>
          {' '}
          and{' '}
          <Link to="/school/ohio-state">Ohio State</Link>.
        </p>
        <p>
          The{' '}
          <Link to="/checkbook-bowl">checkbook bowl</Link>
          {' '}
          asks whether the bigger football spender won the big game.
        </p>
        <p className="nil101-slogan">What can your team actually afford?</p>
        <Link className="nil101-cta" to="/">Look up your team</Link>
      </section>
    </div>
  )
}
