import { money, moneyRange } from '../lib/format.js'
import {
  CONFERENCE_NIL,
  HALF_SHARE_IDS,
  HOUSE_2025_26,
  NIL_MARKET_BASELINE,
  NIL_MARKET_BY_SEASON,
  NIL_MARKET_SOURCE,
  nilYearFactor,
} from '../lib/nilModel.js'
import { FB_RATE_CARD, MBB_RATE_CARD, ROSTER_POOL_SHARE, rateCardForMethods } from '../lib/nilRoster.js'
import { ConferenceStrip } from '../components/TvContracts.jsx'
import { useTvBook } from '../lib/tv.js'

const EXAMPLE_MID = CONFERENCE_NIL.SEC.total // published example at the SEC median

export default function Methods({ meta }) {
  const example = rateCardForMethods(EXAMPLE_MID)
  const tv = useTvBook()
  return (
    <div className="page-wrap methods">
      <h1 className="issue-hed">How the desk is built. · 68 schools</h1>
      <p className="lede">
        Public Cap is a media-grade capacity book, not a recruiting-service NIL ranking.
        We would rather leave a cell empty than mint a fake source.
      </p>

      <h2>History and the NIL-era start</h2>
      <p>
        The desk now carries football seasons 2021 through 2026. Seasons are keyed as
        <em>football seasons</em>, not athletic fiscal years. NCAA interim NIL policy
        took effect July 1, 2021 — that is why the book starts at 2021–22. Athletic
        fiscal years run July–June and lag the fall: football season Y overlaps
        conference FY(Y+1) (the 990 year ending June Y+1).
      </p>
      <p>
        The latest extracted school-level capacity stack is FY2025. It is shown on
        football 2025 and 2026 as the latest public figures, still labeled FY2025 —
        not invented 2026 dollars. Football 2021–2024 do not reuse those FY2025
        ticket, sponsorship, or contribution lines; those cells stay pending
        (“prior-year line not extracted”). Conference media for 2021–2024 uses a
        cited Power-conference 990 floor when we have one (USA TODAY / AP / CBS),
        tagged estimated, not a school 990.
      </p>
      <p>
        House cap exists only for 2025–26 ($20.5M, reported) and 2026–27 (~$21.3M,
        estimated). Earlier years read “no House cap (pre-settlement).” We do not
        invent a pre-settlement cap. NIL ÷ House stays empty when there is no House
        number. Modeled NIL is shown in every football season on the desk: 2025–26
        and 2026–27 keep the House-era conference heuristic (rev-share + third-party);
        2021–24 use a labeled collective-era third-party-only backcast scaled by a
        published national market-size series. Booked NIL stays official and untouched:
        Louisville and Kentucky on 2025–26, plus Louisville’s cited FY2025 pre-cap
        line on 2024. Empty booked cells stay pending.         The year picker shows the chair of record
        for that football season, not only the current hire — the 2021–2026 Wikipedia
        season-page infobox tape is on the desk for all 68 schools. Coach pay on a year
        prefers that year’s file; USA TODAY 2025 is attached only when that year cell
        is on the tape. We do not copy a new hire’s pay backward onto a prior chair.
      </p>
      <p>
        Named football rosters are ESPN public JSON for each season (the live site
        API hydrates the current year; closed seasons are resolved from ESPN’s
        public core athlete lists). Wikipedia two-deep matching is used in modeled-NIL
        years. No On3 / Opendorse / NIL Go / social.
      </p>

      <h2>Definitions</h2>
      <p className="lede tight">The same language that sits on the rank list and school pages. Hover a header there and you get this copy.</p>
      <dl className="defs">
        <dt>House cap</dt>
        <dd>Official settlement benefits pool. $20.5 million in 2025–26 — the same number for every participating school. The 2026–27 ~$21.3 million figure is labeled estimated until the NCAA publishes year two the same way it published $20.5M.</dd>
        <dt>Annual capacity / public cap</dt>
        <dd>Default is booked-only — the filing stack: media + sponsorships + tickets + booked contributions. A toggle, Include modeled alumni, adds the Scorecard-based extra-alumni midpoint (modeled athletics giving minus booked contributions, so we do not double-count). Extra low can be $0 when booked gifts already exceed the conservative alumni model. Annual, not lifetime. We never add lifetime wealth into the ranking.</dd>
        <dt>Booked NIL</dt>
        <dd>FOIA ledgers, MFRS “Institutional NIL Revenue Share,” or collective Form 990s we can cite. Empty means pending — we do not have a number, not that spend is zero. Booked remains the official number when it exists (today: Louisville and Kentucky). No On3 / Opendorse / NIL Go.</dd>
        <dt>Modeled NIL</dt>
        <dd>
          A conference-heuristic <em>range</em> for every school, including those with a filing, so you can compare the model to the books.
          2025–26 / 2026–27 use the <a href="https://nil-ncaa.com/" target="_blank" rel="noreferrer">nil-ncaa.com</a> 2026–27 P4 roster-cost table
          (school revenue share vs third-party NIL). 2021–24 use only the third-party half of that table, scaled by a published national
          NIL market total versus 2024–25 — tagged <strong>modeled</strong>, collective-era, no House rev-share. Those numbers are estimates,
          not filings. The model never overwrites booked NIL.
        </dd>
        <dt>Coach pay vs buyout overhang</dt>
        <dd>Pay is an annual flow for the chair of record in the selected football season. A current-year file wins when it publishes a dollar; USA TODAY is fallback only when that year’s file has no dollar. The year picker does not copy a new hire backward onto 2024. A buyout is overhang — a liability if the school fires without cause on the as-of date — not yearly spend. Private-school blanks stay blank.</dd>
        <dt>Contract term</dt>
        <dd>Through-year or years remaining on the current head-coach deal, cited from the employment agreement or a newsroom/school release that quotes one. Public-school buyouts prefer the file; articles are fallback only when no current file is loaded. Not a guess. Pending if we do not have a public through-year.</dd>
        <dt>Transfer portal</dt>
        <dd>Notable football additions and departures for the 2025–26 / 2026 cycle. Names from public Wikipedia / NCAA.com / FOX / CBS pages. Dollars only if a cited news number exists. On3 is not scraped.</dd>
        <dt>Apparel + naming rights</dt>
        <dd>Current outfitter and stadium or facility naming. Annual value only when a Sportico, Athletic, FOIA, or local-paper number exists.</dd>
        <dt>Student fees + institutional subsidy</dt>
        <dd>
          Student fees are not tuition. They are a dedicated or allocated athletic fee (or a slice of a student
          activity fee) that athletics booked that year — NCAA MFRS line 3, an annual department total already
          on the KN tape. Institutional support is the university check; government is the tax/state slice when
          a source splits it. Implied per-student is that total ÷ the enrollment proxy, a spread, not a published
          schedule. $0 means self-funded or $0 on the line. Empty means pending. EADA has no split.
        </dd>
        <dt>Wins per dollar</dt>
        <dd>2025 football wins divided by booked NIL if present, else modeled NIL mid (labeled modeled), and by annual capacity (booked-only unless the alumni toggle is on). Wikipedia / NCAA standings.</dd>
        <dt>Buyouts actually paid</dt>
        <dd>Money actually owed or settled after a firing — not the if-fired overhang on the current coach. Athletic contract census, USA TODAY, 990, FOIA.</dd>
        <dt>Staff pay</dt>
        <dd>Cited public pay for the athletic director, other head coaches, and football assistants, keyed to the selected football season. Named football assistant dollars for 2021–2024 are the USA TODAY contract year from each team page (row asOf: Dec 9, 2021 / Dec 8, 2022 / Nov 16, 2023 / Dec 18, 2024) and sit on that year only, with that year’s published names — not the 2026 official directory. Titles are not invented. 2026 shows official-directory names and roles; pay stays pending unless a cited 2026 dollar exists. 2025 is empty without a year-accurate tape (we do not clone 2026 names or 2024 dollars onto 2025). WBB / AD cells are cited-only. Empty means pending — we do not invent a title or a dollar.</dd>
        <dt>Official alumni earnings vs modeled wealth</dt>
        <dd>Official line = College Scorecard median, 10 years after entry. It is not net worth. The second line is a modeled range (living-alumni proxy × earnings × 5–12× wealth-to-income). We do not invent a silent net-worth total.</dd>
        <dt>What backs this (earnings corroboration)</dt>
        <dd>A quiet check on the official average, not a second alumni net-worth engine. Scorecard stays the earnings number. Under it we cite BLS Occupational Employment and Wage Statistics for 2–4 occupations that match a simple career mix (flagship public, tech/engineering, or private elite) — national May 2025 medians/means, plus the state OEWS page. Those wages are reported BLS figures and estimated as a mix for that school type; they are not this school’s alumni. Where a state open-payroll site is obvious (Texas, Ohio, California, Florida) we link it so reporters know public-university alumni on the state payroll can be looked up. A handful of schools get one notable public-company alum with an EDGAR/DEF 14A or IR link (fat tail, not a cohort). Glassdoor and LinkedIn are not ingested.</dd>
        <dt>Desk tape</dt>
        <dd>A dated log of filings that moved a Public Cap figure — not a news feed. Booked NIL, contract PDFs, paid buyouts, cited apparel or naming, student-fee / subsidy lines, and House-cap Q&amp;As. We do not invent a headline. A school page that is quiet says so: “No public filing on the desk yet.”</dd>
        <dt>TV / media rights</dt>
        <dd>Most Power 4 TV contracts are conference deals, not 68 school contracts. The school page and the <a href="/tv">TV book</a> show rights holders, term, the cited conference pot, and how the share is split when a 2024–26 source exists. A school media check is printed only when reported, or as a labeled equal-share estimate (cited pot ÷ cited members). Notre Dame’s NBC football deal is the school-level exception. The College Football Playoff is one national package. ACC Grant of Rights / viewership splits are described as cited — not flattened to equal share. Empty means pending.</dd>
        <dt>Confidence tags</dt>
        <dd><strong>reported</strong> — a primary public document, or a newsroom story that quotes one. <strong>estimated</strong> — desk estimate, residual, or unofficial deal term; source still named. <strong>modeled</strong> — alumni cohort / wealth / giving, the conference NIL range, or the position rate card. <strong>pending</strong> — we looked, we do not have a number, cell stays empty.</dd>
      </dl>

      <h2>TV / media rights</h2>
      <p>
        Power 4 “TV contracts” are almost all conference deals. This desk keeps one record per
        conference, plus Notre Dame’s NBC football exception, plus a short College Football Playoff
        note. We do not mint 68 school contracts. Equal-share math is labeled estimated and shows
        the formula. ACC 2025 settlement language (40% equal / 60% viewership) is quoted as cited;
        we do not flatten that league to equal share. Through-years are conference facts — the rank
        list stays clean, with no media-through column.
      </p>
      <ConferenceStrip book={tv} />
      <p className="fine">Full citations live on the <a href="/tv">TV / media rights</a> page and on each school card.</p>

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
        Capacity (annual), booked-only = media/conference distributions + sponsorships/licensing
        + tickets/premium + athletic contributions booked. That is the default headline.
        The toggle adds modeled extra alumni giving (booked contributions already subtracted
        so we do not double-count). Extra is the midpoint of max(0, modeled athletics giving − booked gifts).
        The 0.5-2% wealth flow is all-cause philanthropy; the extra uses a modeled 4% athletics-directed slice of that flow.
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
        api.on3.com. A public news article may be cited once when it is itself a FOIA,
        ledger, or counsel-statement story (Courier-Journal, August 2026: Louisville
        $32.9M FOIA Mar 2025–Jul 1 2026, including ~$12.7M pre-cap KY NIL; prior desk
        cell was $20.27M for the House Year 1 window. Kentucky $18M from March 2025–July
        2026 as reported by counsel. CalMatters, August 2026: UCLA and California each
        about $20.5M in 2025-26; names/sport splits not released. Texas Public Radio,
        April 2026: Texas $13.5M House Year 1 YTD Jul 2025–Mar 2026; on-track ~$18M
        left unbooked. FY2025 MFRS / pre-cap cells: Penn State Item 44 $18,368,391
        with published sport lines; Oklahoma State “just over $16 million,” booked as
        $16M estimated — not $16,000,001; Texas school-FY $3.2M, only two months of
        House. Georgia, Tennessee, Alabama, Oregon, Utah, and UNC FY2025 Item 44 $0
        from the cited filings. Kentucky FY2025 $0 is not booked — no public MFRS PDF
        on the desk; the $18M counsel cell stays).
      </p>
      <p>
        Ratios: NIL ÷ House cap, and NIL ÷ our capacity. A school can sit near 100% of
        House and still be a small slice of capacity. Booked is never replaced by the model.
      </p>

      <h2>Modeled NIL (conference heuristic)</h2>
      <p>
        Every Power program gets a modeled range so the rank list is not 66 blanks and two
        filings. The construct is documented here and tagged <strong>modeled</strong>. It is
        not a scrape, not a player sum, and not a Texas $80M rumor. House-era and
        collective-era years use different formulas; booked NIL and the House cap are
        unchanged by either one.
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
        numbers are estimates, not filings. Cite them as such. This House-era formula is
        what 2025 and 2026 still use — those two years were not rewritten when the
        collective-era backcast was added.
      </p>

      <h2>Modeled NIL before House (2021–24, labeled modeled)</h2>
      <p>
        Football 2021–2024 now show a modeled range for all 68 schools. It is a
        <em>collective-era third-party-only</em> backcast, tagged <strong>modeled</strong>.
        We do not add the $15.6M / $20.5M House revenue-share into those years. Booked
        NIL stays FOIA / MFRS / 990 only — empty stays pending. The House cap stays
        blank (pre-settlement). NIL ÷ House stays empty when there is no House number.
      </p>
      <p>
        The mature (2024–25) third-party median is the same nil-ncaa.com conference
        row the House-era model uses — <code>conferenceNilBand(school.conference).thirdParty</code>,
        including Notre Dame’s ACC × 1.08 premium. That median is then scaled by a
        published national NIL market-size series versus the 2024–25 baseline of $1.67B
        (Opendorse “NIL at 3,” recapped by Athletic Business). The year scalar is a
        market total, not a player file. We still do not scrape On3, Opendorse, NIL Go,
        social, or player valuations.
      </p>
      <table className="roster methods-table">
        <thead>
          <tr>
            <th>Football season</th>
            <th>Academic</th>
            <th className="num">National NIL market</th>
            <th className="num">Year factor</th>
          </tr>
        </thead>
        <tbody>
          {[
            { year: 2021, academic: '2021–22' },
            { year: 2022, academic: '2022–23' },
            { year: 2023, academic: '2023–24' },
            { year: 2024, academic: '2024–25 (baseline)' },
          ].map((row) => (
            <tr key={row.year}>
              <td>{row.year}</td>
              <td>{row.academic}</td>
              <td className="num">
                {NIL_MARKET_BY_SEASON[row.year] >= 1e9
                  ? `$${(NIL_MARKET_BY_SEASON[row.year] / 1e9).toFixed(2)}B`
                  : `$${(NIL_MARKET_BY_SEASON[row.year] / 1e6).toFixed(0)}M`}
              </td>
              <td className="num">{nilYearFactor(row.year).toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="fine">
        yearFactor = market[season] / {money(NIL_MARKET_BASELINE)}. Sources:{' '}
        <a href={NIL_MARKET_SOURCE.pdf} target="_blank" rel="noreferrer">Opendorse “NIL at 3” PDF ↗</a>
        {' · '}
        <a href={NIL_MARKET_SOURCE.recap} target="_blank" rel="noreferrer">Athletic Business recap ↗</a>
      </p>
      <blockquote>
        median_y = conference third-party × yearFactor.
        low = 0.70 × median_y (no $10.25M House half-share floor — that is a 2025+
        institutional concept; the half-share / newcomer list does not punch a House
        hole in a collective-era year).
        high₀ = 1.25 × median_y.
        high = median_y + (high₀ − median_y) × (capacity quartile / 4), using that
        season’s conference-media-floor capacity totals.
        mid = (low + high) / 2.
      </blockquote>
      <p>
        Conference bucket: <code>conferenceInSeason(school, year)</code> remaps
        2021–23 membership (Texas and Oklahoma in the Big 12; the Pac-12 ten; AAC
        newcomers; BYU independent). When that remap exists, the model uses it.
        Otherwise it uses the school’s current book conference. Pac-12 has no
        published third-party median in <code>CONFERENCE_NIL</code>, and this desk
        does not invent a Pac-12 House rev-share. For 2021–23 Pac-12 the third-party
        median is a documented proxy: the average of the published Big 12
        ($6.01M) and ACC ($5.64M) third-party medians ($5.825M), then the same
        Opendorse year factor as every other school. AAC still has no published
        third-party row and inherits the ACC median; plain Independent is treated
        like Notre Dame’s ACC × 1.08 lane. Estimates, not filings.
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
        School pages scale the same weights to that school’s modeled mid — including
        2021–24 once a collective-era midpoint exists. Named football players on the
        school page are a second cut of the same card — not extra money.
      </p>


      <h2>Named football roster (modeled)</h2>
      <p>
        Every Power school page lists <em>verified</em> football names for the selected season from the public
        ESPN team roster JSON. We do not invent a name. A missing year file (today: 2022
        and 2025) or a school with no names stays an empty roster. CollegeFootballData’s roster endpoint
        returned 401 without an API key and was skipped. Wikipedia 2026 then 2025 team pages
        supply a two-deep when the American-football depth-chart template is present; those
        names are matched to the ESPN roster (so a 2025 starter who left is dropped).
        2021–24 files are ESPN public core athlete lists for that closed season.
      </p>
      <p>
        Once a school modeled midpoint exists — House-era in 2025–26 / 2026–27, or the
        collective-era third-party × Opendorse year-factor range in 2021–24 — each named
        player gets a modeled low/high that is a <em>share</em> of that school’s football
        slice of the 93% pot (the existing rate card). We do not call the names-only
        path once that midpoint exists. We do not invent a reported deal dollar.
        Confidence is <strong>modeled</strong>. In collective-era years the player note
        says the share is year-scaled, not a filing, and is not an On3 / Opendorse
        player value. Booked NIL (school and player) stays official-only. No named
        booked dollars unless a public file names the athlete.
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
        with that school’s modeled midpoint versus the conference median. House-era years
        use the nil-ncaa.com total-roster table (SEC $30.16M, Big Ten $24.41M, Big 12 $21.61M,
        ACC $21.24M; Notre Dame is ACC × 1.08). Collective-era years use that conference’s
        third-party median × the Opendorse year factor — Pac-12 via the Big 12 + ACC
        third-party average proxy above. A richer public-cap stack therefore shows a wider
        named-player band at the same roster spot — not because we scraped a marketplace.
      </p>
      <p>
        Sources are linked in the roster footer: the ESPN roster page and, when used, the
        Wikipedia team page. No On3, Opendorse, NIL Go, Instagram, X, or TikTok.
      </p>

      <h2>Position NIL history (modeled vs booked)</h2>
      <p>
        On a school page the named football roster is grouped by position. Click a
        position (QB, RB, WR, and the rest) to open an in-page year graph across the
        year-picker span (football 2021 through the current season). This is not a
        new site section and not a marketplace valuation.
      </p>
      <p>
        <em>Position history is the named roster players at that position for each
        year, allocated from that year’s school modeled NIL — and from booked NIL
        only when a FOIA / MFRS / 990 / counsel cell exists.</em>
        Years without a named roster file on the desk (today: 2022 and 2025) use the
        same position rate card already published above, labeled as a rate-card year.
        A missing booked cell stays empty: we do not invent booked dollars, and we
        do not draw a booked point. When a school booked cell does exist, the booked
        series is that cell × this position’s modeled share of the school pot — an
        allocated share of the filing, not a position ledger and not a named-athlete
        contract. Louisville and Kentucky (and any later school filing) keep their
        booked cells official; the model never overwrites them.
      </p>
      <p>
        Clicking a named player opens that player’s own year series when the name
        appears on more than one season roster. Player cells stay modeled. This desk
        still has no named booked dollar on an athlete unless a public file names
        them — none in v1 — so a player graph does not mint a booked series.
        Share URLs can deep-link an open position chart (<code>#pos-qb</code>) or
        player chart the same way the capacity-stack drills already share.
      </p>
      <p>
        No On3, Opendorse, NIL Go, or social scrape. The graph is a second cut of
        the school pot already on the desk, not extra money.
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
        The extra-alumni row on the school stack is always shown. It is excluded from the
        headline total unless Include modeled alumni is on. The extra is already net of
        booked athletic gifts; we do not add the stock into the ranking.
        We do not invent silent net-worth totals. The second line is a <em>modeled range</em>:
      </p>
      <ul>
        {meta.alumniModel.notes.map((n) => <li key={n}>{n}</li>)}
      </ul>

      <h2>Coach pay vs buyouts</h2>
      <p>
        Football head-coach pay prefers a current-chair employment agreement, term
        sheet, letter of intent, or board packet when that file publishes compensation.
        Confidence is reported and the source is the file. USA TODAY Sports football
        (updated Oct 8, 2025; buyout as of Dec 1, 2025) is the fallback only when we do
        not have a current-chair file with a dollar.         We never leave an outgoing coach’s
        pay on a school that has a new chair — the year picker keeps that outgoing
        chair on the seasons they actually coached. Men’s basketball still uses USA TODAY
        (updated Apr 8, 2026; buyout as of Apr 1, 2026). Pay is an annual flow —
        incentives listed in the file stay out of that cell. A buyout is overhang — a
        liability if the school fires without cause on that date — not yearly spend.
        Private-school blanks stay blank.
      </p>
      <p>
        Contract term is a through-year or years remaining, cited from the employment
        agreement or a newsroom/school release that quotes one. USA TODAY salary tables
        do not publish years remaining, so a blank term is pending — not a guess.
        Public-school buyouts prefer the employment agreement, amendment, or board
        packet; articles are the fallback only when no current file is on the desk.
        The buyout tool and school-page football card list every contract file on
        the desk (original EA plus amendments), oldest first — not only the latest.
      </p>

      <h2>Athletics staff pay</h2>
      <p>
        School pages add a staff section under the FB/MBB head-coach cards: athletic
        director pay when a USA TODAY / school-board / 990 story cites a current chair;
        other head coaches (WBB, softball, etc.) when a USA TODAY table or newsroom
        figure is attached; football coordinators and assistants year-keyed on
        staffByYear. The USA TODAY assistant team pages are the 2021–2024 contract
        years — named assistants and the numeric Total Pay sum appear when the year
        picker is that year, citing that row’s asOf (Dec 9, 2021 / Dec 8, 2022 /
        Nov 16, 2023 / Dec 18, 2024), not as 2026 contract pay. Titles are not
        invented. 2026 on-field names come from the official athletics directory;
        those dollars stay pending without a cited 2026 figure. 2025 is not a clone
        of 2026. A few named office roles (deputy AD, CFO)
        appear only with a source. We do not invent a title or a dollar.
        Knight-Newhouse coaches-compensation is a department total when we cite it —
        not a stand-in for a missing name. No On3.
      </p>


      <h2>Transfer portal</h2>
      <p>
        School pages list notable football additions and departures for the 2025–26 / 2026
        cycle. The NCAA ran a single FBS window, January 2–16, 2026 (CFP finalists got a
        short extra window after the title game). Names come from public Wikipedia 2026
        team pages, NCAA.com, FOX, CBS, Sports Illustrated, or school releases. In/out
        counts appear only when one of those pages publishes a number. Dollars stay blank
        unless a cited news figure exists — we do not invent a portal check. On3, Opendorse,
        and NIL Go are not scraped.
      </p>

      <h2>Apparel and naming rights</h2>
      <p>
        A short stack on the school page: current outfitter (Nike, Adidas, Under Armour,
        Jordan) and stadium or facility naming deals. Annual value is printed only when
        Sportico, The Athletic, a FOIA story, or a local paper cites one. Pending otherwise.
        A donor stadium name (Illinois / Gies) is labeled as a gift, not a commercial AAV.
      </p>

      <h2>Student fees and institutional subsidy</h2>
      <p>
        Student fees on this desk are the dollars athletics booked from student fees in
        that fiscal year — usually a dedicated athletic fee, or a slice of a student
        activity fee, assessed on top of tuition. Not tuition. Not the whole bursar bill.
        The Knight-Newhouse figure is already the athletic department’s annual receipt
        (NCAA MFRS line 3). We do not treat it as a tuition rate and multiply it by
        enrollment to invent a new total. Institutional support is the university writing
        a check or booking indirect support. Government support is the tax or state slice
        when a source splits it; KN usually rolls it into institutional/government.
      </p>
      <p>
        Two identities sit under the booked total, both labeled estimated. Implied
        per-student = booked student-fee total ÷ the enrollment proxy already on the
        school card (an IPEDS-ish undergrad headcount). That is a spread of the
        department total, not a published fee schedule, and it does not replace the
        booked cell. Published rate × enrollment is shown only when a feeRate is already
        on the desk (today: Louisville $200/semester). Semesters count as two terms a
        year; an annual rate counts as one. We do not invent a summer term. That product
        is arithmetic, not a filing, and it does not overwrite the KN total — Louisville’s
        $200 rate starts 2025–26 / FY2026; the FY2025 KN cell is still the old $25-fee year.
        If the booked line is $0, implied per-student is $0 (self-funded on that line).
      </p>
      <p>
        KN bulk download is CAPTCHA-gated; FY2025 dollars come from the public school-profile
        revenue charts (student fees; institutional/government support as KN’s combined
        lines 2+4+6+6A). The EADA 2024–25 public file at ope.ed.gov/athletics has department
        totals only — no fee/support split — so EADA cells stay unused here. $0 is printed
        when KN/MFRS reports $0 on that line, or when a school release says the department
        is self-funded (Ohio State FY25: no tuition or tax dollars; KN residual $112,280
        noted, not booked). Rutgers keeps a newsroom 3-way split (fees / university / state)
        that cross-checks KN. Government stays pending unless a source splits Line 2.
        Empty means pending, not zero. Privates and Pittsburgh have no public MFRS split.
        We did not scrape bursar pages for 68 new fee rates.
      </p>

      <h2>Wins per dollar</h2>
      <p>
        Last completed football season (2025) wins, from Wikipedia conference standings
        and the NCAA standings PDF, divided by booked NIL if we have one, else the modeled
        NIL midpoint (the cell says modeled), and divided by annual capacity. Shown as
        wins per $1 million on the rank list (compact) and the school page. Not a coach
        grade. Men’s basketball 2025–26 records were not extracted on this pass.
      </p>

      <h2>Buyouts actually paid</h2>
      <p>
        Separate from the if-fired overhang on the current chair. This table is money a
        school actually owes or has settled with a former FB/MBB coach after a firing —
        The Athletic’s March 2026 contract census, USA TODAY, or a local FOIA. Headline
        max and current/settled figures are distinguished in the notes. Jimbo Fisher’s
        2023 Texas A&amp;M deal is included because the money is still moving. Pending
        if we do not have a cited payout.
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
        <li>No On3 / Opendorse / NIL Go scrape, and no Instagram / X / TikTok scrapers. The 2021–24 year scalar is a published national market total from the Opendorse “NIL at 3” report / Athletic Business recap — not a player file.</li>
        <li>No Glassdoor or LinkedIn ingest — those sites are not a source for the earnings corroboration block.</li>
        <li>No invented source labels.</li>
        <li>No invented player names, and no invented <em>reported</em> deal dollar on a named player (modeled shares of the school pot are labeled modeled).</li>
        <li>No women’s sports or Olympic-sport roster math in v1 (the 7% unallocated slice is the placeholder).</li>
        <li>Knight-Newhouse bulk download is CAPTCHA-gated; FY2025 student-fee and institutional/government figures are taken from public KN school-profile charts, plus school/newsroom MFRS already on the desk (Rutgers Extra Points, Ohio State newsroom, Louisville fee rate).</li>
      </ul>
    </div>
  )
}
