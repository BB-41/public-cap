import { money, moneyRange } from '../lib/format.js'
import { CONFERENCE_NIL, HALF_SHARE_IDS, HOUSE_2025_26 } from '../lib/nilModel.js'
import { FB_RATE_CARD, MBB_RATE_CARD, ROSTER_POOL_SHARE, rateCardForMethods } from '../lib/nilRoster.js'

const EXAMPLE_MID = CONFERENCE_NIL.SEC.total // published example at the SEC median

export default function Methods({ meta }) {
  const example = rateCardForMethods(EXAMPLE_MID)
  return (
    <div className="page-wrap methods">
      <h1 className="issue-hed">How the desk is built. · 68 schools</h1>
      <p className="lede">
        Public Cap is a media-grade capacity book, not a recruiting-service NIL ranking.
        We would rather leave a cell empty than mint a fake source.
      </p>


      <h2>Definitions</h2>
      <p className="lede tight">The same language that sits on the rank list and school pages. Hover a header there and you get this copy.</p>
      <dl className="defs">
        <dt>House cap</dt>
        <dd>Official settlement benefits pool. $20.5 million in 2025–26 — the same number for every participating school. The 2026–27 ~$21.3 million figure is labeled estimated until the NCAA publishes year two the same way it published $20.5M.</dd>
        <dt>Annual capacity / public cap</dt>
        <dd>Our stack: media + sponsorships + tickets + booked contributions + modeled extra alumni giving (booked contributions subtracted so we do not double-count). Annual, not lifetime. We never add lifetime wealth into the ranking.</dd>
        <dt>Booked NIL</dt>
        <dd>FOIA ledgers, MFRS “Institutional NIL Revenue Share,” or collective Form 990s we can cite. Empty means pending — we do not have a number, not that spend is zero. Booked remains the official number when it exists (today: Louisville and Kentucky). No On3 / Opendorse / NIL Go.</dd>
        <dt>Modeled NIL</dt>
        <dd>
          A conference-heuristic <em>range</em> for every school, including those with a filing, so you can compare the model to the books.
          Built from the <a href="https://nil-ncaa.com/" target="_blank" rel="noreferrer">nil-ncaa.com</a> 2026–27 P4 roster-cost table
          (school revenue share vs third-party NIL). Those numbers are estimates, not filings. The model never overwrites booked NIL.
        </dd>
        <dt>Coach pay vs buyout overhang</dt>
        <dd>Pay is an annual flow from the USA TODAY Sports salary desk. A buyout is overhang — a liability if the school fires without cause on the as-of date — not yearly spend. Private-school blanks stay blank.</dd>
        <dt>Contract term</dt>
        <dd>Through-year or years remaining on the current head-coach deal, cited from the employment agreement or a newsroom/school release that quotes one. Not a guess. Pending if we do not have a public through-year.</dd>
        <dt>Staff pay</dt>
        <dd>Cited public pay for the athletic director, other head coaches, and football assistants. USA TODAY assistant and WBB tables, school releases, 990s, or state payrolls. Empty means pending — we do not invent a title or a dollar.</dd>
        <dt>Official alumni earnings vs modeled wealth</dt>
        <dd>Official line = College Scorecard median, 10 years after entry. It is not net worth. The second line is a modeled range (living-alumni proxy × earnings × 5–12× wealth-to-income). We do not invent a silent net-worth total.</dd>
        <dt>What backs this (earnings corroboration)</dt>
        <dd>A quiet check on the official average, not a second alumni net-worth engine. Scorecard stays the earnings number. Under it we cite BLS Occupational Employment and Wage Statistics for 2–4 occupations that match a simple career mix (flagship public, tech/engineering, or private elite) — national May 2025 medians/means, plus the state OEWS page. Those wages are reported BLS figures and estimated as a mix for that school type; they are not this school’s alumni. Where a state open-payroll site is obvious (Texas, Ohio, California, Florida) we link it so reporters know public-university alumni on the state payroll can be looked up. A handful of schools get one notable public-company alum with an EDGAR/DEF 14A or IR link (fat tail, not a cohort). Glassdoor and LinkedIn are not ingested.</dd>
        <dt>Confidence tags</dt>
        <dd><strong>reported</strong> — a primary public document, or a newsroom story that quotes one. <strong>estimated</strong> — desk estimate, residual, or unofficial deal term; source still named. <strong>modeled</strong> — alumni cohort / wealth / giving, the conference NIL range, or the position rate card. <strong>pending</strong> — we looked, we do not have a number, cell stays empty.</dd>
      </dl>

      <h2>Two caps</h2>
      <p>
        Every school is read against two ceilings. The <em>official House cap</em> is the
        settlement benefits pool: $20.5 million for 2025–26 (NCAA Q&amp;A; 22% of the average
        of eight MFRS revenue categories across the defendant conferences plus Notre Dame).
        For 2026–27 the desk shows ~$21.3 million, the ~4% escalation cited by the College
        Sports Commission and legal writeups. That second figure is labeled estimated until
        the NCAA publishes the year-two number the same way it published $20.5M.
      </p>
      <p>
        The <em>capacity cap</em> is our annual-flow construct — what the athletic economy
        can actually support in a year, which is almost always larger than the House number
        at a Power program:
      </p>
      <blockquote>
        Capacity (annual) = media/conference distributions + sponsorships/licensing
        + tickets/premium + athletic contributions booked + modeled extra alumni giving
        (booked contributions subtracted so we do not double-count). The 0.5-2% wealth flow is all-cause philanthropy; capacity uses a modeled 4% athletics-directed slice of that flow.
      </blockquote>
      <p>
        Capacity is annual. Alumni wealth is lifetime. We show both on the school page and
        never add the stock into the ranking.
      </p>

      <h2>What “booked NIL” means</h2>
      <p>
        NIL on this desk is a booked band only: FOIA ledgers, MFRS “Institutional NIL
        Revenue Share,” or collective Form 990s. If we do not have one of those, the cell
        is pending. We do not scrape On3, Opendorse, or NIL Go, and we do not hit
        api.on3.com. A public news article may be cited once when it is itself a FOIA or
        counsel-statement story (Courier-Journal, August 2026: Louisville $20.27M from
        July 2025–July 2026; Kentucky $18M from March 2025–July 2026 as reported by
        counsel — different windows, labeled as such).
      </p>
      <p>
        Ratios: NIL ÷ House cap, and NIL ÷ our capacity. A school can sit near 100% of
        House and still be a small slice of capacity. Booked is never replaced by the model.
      </p>

      <h2>Modeled NIL (conference heuristic)</h2>
      <p>
        Every Power program gets a modeled range so the rank list is not 66 blanks and two
        filings. The construct is documented here and tagged <strong>modeled</strong>. It is
        not a scrape, not a player sum, and not a Texas $80M rumor.
      </p>
      <p>
        Institutional floor/center: most P4 models assume schools spend a large fraction of
        the House cap. We use House 2025–26 <strong>{money(HOUSE_2025_26)}</strong> as the
        institutional ceiling. Third-party / total roster medians are taken from the
        nil-ncaa.com 2026–27 P4 table:
      </p>
      <table className="roster methods-table">
        <thead>
          <tr>
            <th>Conference</th>
            <th className="num">Rev-share (table)</th>
            <th className="num">Third-party</th>
            <th className="num">Total roster</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(CONFERENCE_NIL).map(([name, row]) => (
            <tr key={name}>
              <td>{name}</td>
              <td className="num">{money(row.revShare)}</td>
              <td className="num">{money(row.thirdParty)}</td>
              <td className="num">{money(row.total)}</td>
            </tr>
          ))}
          <tr>
            <td>Notre Dame</td>
            <td className="num">{money(CONFERENCE_NIL.ACC.revShare)}</td>
            <td className="num">{money(Math.round(CONFERENCE_NIL.ACC.thirdParty * 1.08))}</td>
            <td className="num">{money(Math.round(CONFERENCE_NIL.ACC.total * 1.08))} <span className="fine-inline">(ACC × 1.08)</span></td>
          </tr>
        </tbody>
      </table>
      <blockquote>
        low = 50% of House ($10.25M) for phase-in / half-share / recent P4 newcomers
        ({[...HALF_SHARE_IDS].join(', ')}); else 70% of the conference total median.
        high₀ = min(1.25 × conference total, House + conference third-party) — a ceiling
        so we do not invent uncapped Texas figures with no source.
        high = conference median + (high₀ − median) × (capacity quartile / 4).
        mid = (low + high) / 2.
      </blockquote>
      <p>
        Capacity quartile is the school’s annual public-cap stack versus the 68-school
        book: only the top quartile sits at the high end of the conference band. nil-ncaa.com
        numbers are estimates, not filings. Cite them as such.
      </p>

      <h2>Position rate card (modeled)</h2>
      <p>
        School modeled NIL remains the rollup. The football + thin MBB card is explanatory:
        a typical P4 85-man football roster and a 13-man basketball rotation. Relative
        Weight (starting QB = 100, scout = 2) is a desk heuristic for scarcity / market
        rate — not a survey. Slot dollars are scaled so roster-spot mids sum to {Math.round(ROSTER_POOL_SHARE * 100)}%
        of that school’s modeled midpoint; 7% is left for other sports / unallocated.
        Low/high on each roster spot track the school modeled range. The table below is the same
        card published at the SEC median total ({money(EXAMPLE_MID)}) as a worked example.
      </p>
      <h3 className="roster-hed">Football — 85 roster spots</h3>
      <table className="roster methods-table">
        <thead>
          <tr>
            <th>Slot</th>
            <th className="num">Roster spots</th>
            <th className="num">Weight</th>
            <th className="num">Example band / spot</th>
            <th className="num">Row total</th>
          </tr>
        </thead>
        <tbody>
          {example.fb.map((r) => (
            <tr key={r.id}>
              <td>{r.label}</td>
              <td className="num">{r.count}</td>
              <td className="num">{r.units}</td>
              <td className="num modeled-cell">{moneyRange(r.low, r.high)}</td>
              <td className="num">{money(r.lineMid)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>Football</td>
            <td className="num">{example.footballSeats}</td>
            <td />
            <td />
            <td className="num">{money(example.rollup.fbMid)}</td>
          </tr>
        </tbody>
      </table>
      <h3 className="roster-hed">Men’s basketball — 13 roster spots</h3>
      <table className="roster methods-table">
        <thead>
          <tr>
            <th>Slot</th>
            <th className="num">Roster spots</th>
            <th className="num">Weight</th>
            <th className="num">Example band / spot</th>
            <th className="num">Row total</th>
          </tr>
        </thead>
        <tbody>
          {example.mbb.map((r) => (
            <tr key={r.id}>
              <td>{r.label}</td>
              <td className="num">{r.count}</td>
              <td className="num">{r.units}</td>
              <td className="num modeled-cell">{moneyRange(r.low, r.high)}</td>
              <td className="num">{money(r.lineMid)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>MBB</td>
            <td className="num">{example.mbbSeats}</td>
            <td />
            <td />
            <td className="num">{money(example.rollup.mbbMid)}</td>
          </tr>
        </tbody>
      </table>
      <p className="fine">
        Example FB+MBB mid {money(example.rollup.mid)} plus other/unallocated {money(example.rollup.otherMid)}
        = {money(example.rollup.mid + example.rollup.otherMid)} against the {money(EXAMPLE_MID)} SEC median.
        School pages scale the same weights to that school’s modeled mid. Named football
        players on the school page are a second cut of the same card — not extra money.
      </p>


      <h2>Named football roster (modeled)</h2>
      <p>
        Every Power school page lists <em>verified</em> 2026 football names from the public
        ESPN team roster JSON. We do not invent a name. CollegeFootballData’s roster endpoint
        returned 401 without an API key and was skipped. Wikipedia 2026 then 2025 team pages
        supply a two-deep when the American-football depth-chart template is present; those
        names are matched to the ESPN roster (so a 2025 starter who left is dropped).
      </p>
      <p>
        Each named player gets a modeled low/high that is a <em>share</em> of that school’s
        football slice of the 93% pot (the existing rate card). We do not invent a reported
        deal dollar. Confidence is <strong>modeled</strong> unless a news URL is attached —
        none are on the desk yet. Booked school NIL stays official.
      </p>
      <blockquote>
        Starter on a verified two-deep → high end of the position band (starter-spot weight).
        Backup on that two-deep → low end (depth-spot weight).
        Name and position only → midpoint of the starter and depth weights, and the row says so.
        If the sum of player mids would exceed the football slice (itself inside 93% of the
        school modeled midpoint), every mid is scaled down so ~7% stays unallocated at school
        level and men’s basketball keeps its card.
      </blockquote>
      <p>
        <em>Comparative</em> means the same position-band weight across the conference: a
        starting QB is weight 100 at every SEC desk, a backup QB is 15. Dollars then scale
        with that school’s modeled midpoint versus the conference median from the nil-ncaa.com
        table (SEC $30.16M, Big Ten $24.41M, Big 12 $21.61M, ACC $21.24M; Notre Dame is ACC × 1.08).
        A richer public-cap stack therefore shows a wider named-player band at the same roster spot —
        not because we scraped a marketplace.
      </p>
      <p>
        Sources are linked in the roster footer: the ESPN roster page and, when used, the
        Wikipedia team page. No On3, Opendorse, NIL Go, Instagram, X, or TikTok.
      </p>

      <h2>Alumni: official line, then a modeled range</h2>
      <p>
        Official line = College Scorecard median earnings 10 years after entry (compiled
        for this v1 from the College Transitions December 2025 Scorecard table, linked
        back to each school’s Scorecard page). Opportunity Insights (Chetty) mid-career
        earnings are the other official lane; we did not ingest OI tables in v1 and do
        not invent a Chetty number.
      </p>
      <p>
        School pages also carry a short “What backs this” note under the Scorecard line.
        That block is corroboration of the average, not a second alumni net-worth engine
        and not a replacement earnings number. It cites BLS OEWS occupation pages for a
        simple major/career mix by school type (flagship public, tech/engineering, private
        elite) — May 2025 national wages, tagged reported as BLS figures and estimated as
        a mix — plus the matching state OEWS overview. When a state open-payroll or
        transparency site is obvious we link it (Texas Comptroller Transparency, Ohio
        Checkbook salaries, California publicpay.ca.gov, Florida salaries.myflorida.com)
        so reporters know those tapes exist for public-university alumni on the state
        payroll; we do not invent databases. A few schools (Texas, Notre Dame, Stanford,
        Michigan) get one notable public-company alum with an EDGAR/DEF 14A link as a
        fat-tail illustration. We do not scrape Glassdoor, LinkedIn, On3, Opendorse,
        NIL Go, or social.
      </p>
      <p>
        We do not invent silent net-worth totals. The second line is a <em>modeled range</em>:
      </p>
      <ul>
        {meta.alumniModel.notes.map((n) => <li key={n}>{n}</li>)}
      </ul>

      <h2>Coach pay vs buyouts</h2>
      <p>
        USA TODAY Sports football (updated Oct 8, 2025; buyout as of Dec 1, 2025) and
        men’s basketball (updated Apr 8, 2026; buyout as of Apr 1, 2026). Pay is an
        annual flow. A buyout is overhang — a liability if the school fires without
        cause on that date — not yearly spend. Private-school blanks stay blank.
      </p>
      <p>
        Contract term is a through-year or years remaining, cited from the employment
        agreement or a newsroom/school release that quotes one. USA TODAY salary tables
        do not publish years remaining, so a blank term is pending — not a guess.
      </p>

      <h2>Athletics staff pay</h2>
      <p>
        School pages add a staff section under the FB/MBB head-coach cards: athletic
        director pay when a USA TODAY / school-board / 990 story cites a current chair;
        other head coaches (WBB, softball, etc.) when a USA TODAY table or newsroom
        figure is attached; football coordinators and assistants from the USA TODAY
        assistant database (Dec 18, 2024) or a named Football Scoop coordinator story.
        A few named office roles (deputy AD, CFO) appear only with a source. We do not
        invent a title or a dollar. Knight-Newhouse coaches-compensation is a department
        total when we cite it — not a stand-in for a missing name. No On3.
      </p>

      <h2>Private-school gap</h2>
      <p>
        Notre Dame, USC, Vanderbilt, Miami (plus Duke, Stanford, Northwestern, Baylor, BYU, TCU, SMU, Syracuse, Wake Forest, and Boston College) do not
        publish Knight-Newhouse MFRS categories. We use conference 990 distributions
        and, for Notre Dame, the widely reported NBC deal (~$50M/yr on the new contract;
        AP: prior deal ~$22M; FOS/Athletic: roughly double / ~$50M — labeled estimated
        because terms were not officially disclosed) plus ~$17M ACC media. EADA top-lines
        are cited when useful but not unpacked into fake categories.
      </p>

      <h2>FY tagging and conference floors</h2>
      <p>
        USA TODAY Power 4 FY2025 tax returns (2024 season): Big Ten full-share floor
        $76M (Ohio State $91.6M; Oregon $48.4M and Washington $46.7M half-shares);
        SEC $70.3M (Georgia high $74.5M; Texas $12.1M and Oklahoma $2.6M phase-in);
        ACC $42.8M (Clemson $55.13M; Louisville $47.4M; Miami $48.25M);
        Big 12 $37.9M (Kansas Athletics Inc. $38.31M).
      </p>
      <p>
        When a school’s own NCAA MFRS already contains media rights + conference
        postseason, we use that stack and cite the 990 distribution as a cross-check —
        we do not add the 990 check on top of MFRS media.
      </p>

      <h2>Confidence marks</h2>
      <ul>
        <li><strong>reported</strong> — a primary public document or a newsroom story that quotes one.</li>
        <li><strong>estimated</strong> — desk estimate, residual, or unofficial deal term. Source is still named.</li>
        <li><strong>modeled</strong> — alumni cohort / wealth / giving, conference NIL range, or position rate card.</li>
        <li><strong>pending</strong> — we looked, we do not have a number, cell stays empty.</li>
      </ul>

      <h2>What we did not do</h2>
      <ul>
        <li>No On3 / Opendorse / NIL Go scrape, and no Instagram / X / TikTok scrapers.</li>
        <li>No Glassdoor or LinkedIn ingest — those sites are not a source for the earnings corroboration block.</li>
        <li>No invented source labels.</li>
        <li>No invented player names, and no invented <em>reported</em> deal dollar on a named player (modeled shares of the school pot are labeled modeled).</li>
        <li>No women’s sports or Olympic-sport roster math in v1 (the 7% unallocated slice is the placeholder).</li>
        <li>Knight-Newhouse bulk download is CAPTCHA-gated; we used school NCAA PDFs and cited KN via CNBC where the category stack was published.</li>
      </ul>
    </div>
  )
}
