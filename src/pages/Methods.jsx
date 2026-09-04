import { useEffect, useState } from 'react'
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

export default function Methods({ meta: metaProp }) {
  const [meta, setMeta] = useState(metaProp || null)
  useEffect(() => {
    if (metaProp) {
      setMeta(metaProp)
      return
    }
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
  }, [metaProp])
  const example = rateCardForMethods(EXAMPLE_MID)
  const tv = useTvBook()
  if (!meta) {
    return (
      <div className="page-wrap methods">
        <h1 className="issue-hed">How the desk is built. · 68 schools</h1>
        <p className="lede">Setting type…</p>
      </div>
    )
  }
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
        line on 2024. Empty booked cells stay pending. The homepage 2026 rank still
        shows House Year 1 booked / leftover (Louisville, Kentucky, Texas, UCLA, Cal)
        with a 2025–26 / House Year 1 label — it does not mint a 2026–27 booked line.
        The year picker shows the chair of record
        for that football season, not only the current hire — the 2021–2026 Wikipedia
        season-page infobox tape is on the desk for all 68 schools. Coach pay on a year
        prefers that year’s file; USA TODAY 2025 is attached only when that year cell
        is on the tape. We do not copy a new hire’s pay backward onto a prior chair.
      </p>
      <p>
        Named football rosters are ESPN public JSON for each season (the live site
        API hydrates the current year; closed seasons are resolved from ESPN’s
        public core athlete lists). Wikipedia two-deep matching is used in modeled-NIL
        years.
      </p>

      <h2>Definitions</h2>
      <p className="lede tight">The same language that sits on the rank list and school pages. Hover a header there and you get this copy.</p>
      <dl className="defs">
        <dt>House cap</dt>
        <dd>Official settlement benefits pool. $20.5 million in 2025–26 — the same number for every participating school. The 2026–27 ~$21.3 million figure is labeled estimated until the NCAA publishes year two the same way it published $20.5M.</dd>
        <dt>Annual capacity / public cap</dt>
        <dd>Default is booked-only — the filing stack: media + sponsorships + tickets + booked contributions. A toggle, Include modeled alumni, adds the Scorecard-based extra-alumni midpoint (modeled athletics giving minus booked contributions, so we do not double-count). Extra low can be $0 when booked gifts already exceed the conservative alumni model. Annual, not lifetime. We never add lifetime wealth into the ranking.</dd>
        <dt>Booked NIL</dt>
        <dd>FOIA ledgers, MFRS “Institutional NIL Revenue Share,” or counsel spent totals we can cite. Collective Form 990s live on a separate lane and never overwrite booked House / Item 44. Empty means pending — we do not have a number, not that spend is zero. Booked remains the official institutional number when it exists (today: Louisville and Kentucky).</dd>
        <dt>Collective 990</dt>
        <dd>
          A third-party Form 990 line that names grants to individuals, athlete service compensation, or student-athlete appearances.
          Cited from ProPublica Nonprofit Explorer / IRS e-file XML. Lagged one to two years. Labeled collective 990 — not a House spent total, not Item 44, not a player contract.
          Never added to booked NIL, pre-cap, capacity, or the booked-only rank. Position allocation stays on booked-then-modeled only; there is no “+ collective 990” pot toggle.
          A lump “program service expenses” line that does not name athletes is not booked as athlete pay. LLC collectives with no public return stay empty.
        </dd>
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
        <dd>Notable football additions and departures for the 2025–26 / 2026 cycle. Names from public Wikipedia / NCAA.com / FOX / CBS pages. Dollars only if a cited news number exists.</dd>
        <dt>Apparel + naming rights</dt>
        <dd>Current outfitter and stadium or facility naming. Annual value only when a Sportico, Athletic, FOIA, or local-paper number exists.</dd>
        <dt>Student fees + institutional subsidy</dt>
        <dd>
          Student fees are not tuition. They are a dedicated or allocated athletic fee (or a slice of a student
          activity fee) that athletics booked that year — NCAA MFRS line 3, an annual department total already
          the receipt. Institutional support is the university check (line 4); government is the tax/state slice
          (line 2) when a source splits it. Implied per-student is that total ÷ the enrollment proxy, a spread,
          not a published schedule. Published rate × enrollment is shown only when a feeRate is already on the
          desk — labeled calculated. $0 means self-funded or $0 on the line. Empty means pending. The EADA
          2024–25 public file has department totals only, no fee/support split.
        </dd>
        <dt>Wins per dollar</dt>
        <dd>2025 football wins divided by booked NIL if present, else modeled NIL mid (labeled modeled), and by annual capacity (booked-only unless the alumni toggle is on). Wikipedia / NCAA standings.</dd>
        <dt>Buyouts actually paid</dt>
        <dd>Money actually owed or settled after a firing — not the if-fired overhang on the current coach. Athletic contract census, USA TODAY, 990, FOIA.</dd>
        <dt>Offsets / free agents</dt>
        <dd>
          Residual School A buyout after a firing, on <code>/coach-fa</code>.
          A-side dollars and offset / mitigation rules are booked / cite-only — empty without a cite.
          School B annual salary may be a labeled modeled input. Optional all-in is A residual + B salary
          (two payers), off by default. Comp band is a USA TODAY Total Pay snapshot, labeled modeled /
          reported database — not a FOIA PDF. We do not invent today’s remaining principal.
        </dd>
        <dt>Offset credit</dt>
        <dd>What School A would subtract if the employment agreement offsets new pay. Zero when the file says no offset. Dollar-for-dollar overlap with a School B salary is only computed when a sitting-HC clause is on the desk.</dd>
        <dt>Net cost to A</dt>
        <dd>School A residual minus offset credit. When the formula is none, this equals the booked residual. Booked ∧ booked stays booked; any modeled input makes the cell modeled; missing required inputs stay pending and empty.</dd>
        <dt>All-in to fan</dt>
        <dd>Optional sum of net cost to A plus School B compensation. Two payers, not one combined invoice. Off by default.</dd>
        <dt>Comp band</dt>
        <dd>USA TODAY Total Pay peers for the named season — a labeled modeled / reported-database band, not FOIA PDFs.</dd>
        <dt>Athletics debt</dt>
        <dd>
          Athletics facility debt from the NCAA Membership Financial Report or a cited bond/board story —
          not the university’s entire balance sheet, and not part of annual capacity.
          Outstanding (MFRS Category 52) is a stock, like a buyout overhang.
          Annual debt service (Category 34 — principal, interest, leases, and rental fees on athletic facilities) is this year’s check.
          Named stadium or building projects are a cited tape only. We do not invent an amortization schedule
          or even-split a project cost across years. University-wide institutional debt stays out unless the
          filing itself splits an athletics-related amount. $0 is a real cell only when the filing says $0. Empty means pending.
        </dd>
        <dt>Conference exit</dt>
        <dd>
          What a school would pay the conference to leave — named Conference exit, not Buyout.
          A stock, not yearly spend, and not the coach-firing buyout on <code>/buyout</code>.
          Four instruments. ACC: settlement year ladder, rights in tow
          (FY 2025–26 / 2026 season exit $165 million, then −$18 million a year to a $75 million
          floor from 2030–31 through the ACC/ESPN deal in 2036), cited from a newsroom quote
          of the 68-page Clemson/FSU/ACC settlement. SEC: 2023–24 bylaws §3.2.1 $30 million
          with-notice withdrawal fee — cash, not a media-rights buyback; $40 million without
          notice and $45 million if deemed withdrawn are footnoted. Big 12: hosted bylaws §3.4
          cash formula (sum of distributions for the final two years of membership), modeled as
          2 × the last cited FY2025 Form 990 Schedule I line — labeled modeled, never booked.
          Paying that fee does not buy back media rights; the grant of rights still sits with
          the league. Big Ten: no published cash exit fee (not $0); the lock is the grant of
          rights through 2036. Notre Dame: modeled ~$100 million Hale / 247Sports estimate of the
          non-football ACC membership exit — not the FSU/Clemson football ladder. Not part of
          annual capacity. Booked-only remains the default capacity toggle.
        </dd>
        <dt>Staff pay</dt>
        <dd>Cited public pay for the athletic director, other head coaches, and football assistants, keyed to the selected football season. Named football assistant dollars for 2021–2024 are the USA TODAY contract year from each team page (row asOf: Dec 9, 2021 / Dec 8, 2022 / Nov 16, 2023 / Dec 18, 2024) and sit on that year only, with that year’s published names — not the 2026 official directory. Titles are not invented. 2026 shows official-directory names and roles; assistant pay stays pending unless a cited 2026 dollar exists. 2025 is empty without a year-accurate tape (we do not clone 2026 names or 2024 dollars onto 2025). Athletic-director pay is cited-only and year-pinned: USA TODAY Sports has no live AD table on sportsdata.usatoday.com, so dollars come from USA TODAY Network stories that name a number, or from state payroll / university FOIA / board minutes. A 2024 AD snapshot is never copied onto a 2026 AD who is a different person. A newer cite already on the desk is not overwritten by an older snapshot. Privates and withheld chairs stay pending. WBB cells are cited-only. Empty means pending — we do not invent a title or a dollar.</dd>
        <dt>Official alumni earnings vs modeled wealth</dt>
        <dd>Official line = College Scorecard median, 10 years after entry. It is not net worth. The second line is a modeled range (living-alumni proxy × earnings × 5–12× wealth-to-income). We do not invent a silent net-worth total.</dd>
        <dt>What backs this (earnings corroboration)</dt>
        <dd>A quiet check on the official average, not a second alumni net-worth engine. Scorecard stays the earnings number. Under it we cite BLS Occupational Employment and Wage Statistics for 2–4 occupations that match a simple career mix (flagship public, tech/engineering, or private elite) — national May 2025 medians/means, plus the state OEWS page. Those wages are reported BLS figures and estimated as a mix for that school type; they are not this school’s alumni. Where a state open-payroll site is obvious (Texas, Ohio, California, Florida) we link it so reporters know public-university alumni on the state payroll can be looked up. A handful of schools get one notable public-company alum with an EDGAR/DEF 14A or IR link (fat tail, not a cohort). Glassdoor and LinkedIn are not ingested.</dd>
        <dt>Desk tape</dt>
        <dd>A dated log of filings that moved a Public Cap figure — not a news feed. Booked NIL, collective 990s, contract PDFs, paid buyouts, cited apparel or naming, student-fee / subsidy lines, athletics-debt filings, conference-exit filings, and House-cap Q&amp;As. We do not invent a headline. A school page that is quiet says so: “No public filing on the desk yet.”</dd>
        <dt>TV / media rights</dt>
        <dd>Most Power 4 TV contracts are conference deals, not 68 school contracts. The school page and the <a href="/tv">TV book</a> show rights holders, term, the cited conference pot, and how the share is split when a 2024–26 source exists. A school media check is printed only when reported, or as a labeled equal-share estimate (cited pot ÷ cited members). Notre Dame’s NBC football deal is the school-level exception. The College Football Playoff is one national package. ACC Grant of Rights / viewership splits are described as cited — not flattened to equal share. Empty means pending.</dd>
        <dt>Confidence tags</dt>
        <dd><strong>reported</strong> — a primary public document, or a newsroom story that quotes one. <strong>booked</strong> — a cited contract figure or clause on the offset / free-agent lane (same bar as reported; empty without a cite). <strong>estimated</strong> — desk estimate, residual, or unofficial deal term; source still named. <strong>modeled</strong> — alumni cohort / wealth / giving, the conference NIL range, the position rate card, Big 12 conference-exit 2× Form 990 distributions, the Notre Dame Hale membership-exit estimate, a typed School B salary, or a USA TODAY Total Pay comp band. <strong>pending</strong> — we looked, we do not have a number, cell stays empty.</dd>
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
        Revenue Share,” or counsel spent totals. Collective Form 990s are a separate
        cited lane (<code>nil.collective990</code>) and never overwrite booked House /
        Item 44. If we do not have a booked institutional filing, that cell is pending. A public news article may be cited once when it is itself a FOIA,
        ledger, or counsel-statement story (Courier-Journal, August 2026: Louisville
        $32.9M FOIA Mar 2025–Jul 1 2026, including ~$12.7M pre-cap KY NIL; prior desk
        cell was $20.27M for the House Year 1 window. Kentucky $18M from March 2025–July
        2026 as reported by counsel. CalMatters, August 2026: UCLA and California each
        about $20.5M in 2025-26; names/sport splits not released. Texas Public Radio,
        April 2026: Texas $13.5M House Year 1 YTD Jul 2025–Mar 2026; on-track ~$18M
        left unbooked. FY2025 MFRS / pre-cap cells: Penn State Item 44 $18,368,391
        with published sport lines; Oklahoma State “just over $16 million,” booked as
        $16M estimated — not $16,000,001; Texas school-FY $3.2M, only two months of
        House. Georgia, Tennessee, Alabama, Oregon, Utah, UNC, Ohio State, Illinois,
        Minnesota, Washington, Wisconsin, Iowa State, Virginia, and Ole Miss FY2025 Item 44 $0
        from the cited filings. Kentucky FY2025 $0 is not booked — no public MFRS PDF
        on the desk; the $18M counsel cell stays).
      </p>
      <p>
        Ratios: NIL ÷ House cap, and NIL ÷ our capacity. A school can sit near 100% of
        House and still be a small slice of capacity. Booked is never replaced by the model.
      </p>
      <p>
        House remaining room is a residual on those five House Year 1 booked cells only:
        published $20.5 million cap minus booked House spent. Louisville uses the House
        portion of the $32.9M FOIA window ($32.9M minus the $12.7M pre-cap line), not
        the full window. Texas is year-to-date ($13.5M through March 2026), labeled YTD
        — not a full-year leftover. UCLA and California book about $20.5M, so remaining
        is $0, a real cell. If spent is above the cap we print the overhang; we do not
        hide it. The other 63 schools stay empty — we do not invent a $20.5M leftover
        from a missing spent cell. Collective 990s never enter booked or remaining.
      </p>

      <h2>Collective 990 (separate lane)</h2>
      <p>
        Some Power 4 + Notre Dame collectives file a public Form 990. When that return
        names the athlete-pay line — grants to individuals, athlete service compensation,
        student-athlete appearances / contractors, or “payments for name, image, and
        likeness” — we book that line on <code>nil.collective990</code> with the EIN,
        organization name, tax year, and a ProPublica Nonprofit Explorer URL. Confidence
        is <strong>reported</strong>. The dollar is labeled collective 990, not booked
        House and not Item 44.
      </p>
      <p>
        If the 990 only has a lump program-service total that is not clearly athlete NIL,
        we do not mint an athlete-pay number. LLC collectives with no public return stay
        empty. Empty schools stay empty. We do not invent EINs.
      </p>
      <p>
        These cells never enter booked NIL, pre-cap, capacity, or the default booked-only
        rank. Position allocation does not spend this pot — there is no “+ collective 990”
        toggle; the default remains booked-then-modeled. The school NIL block prints a
        visible footnote: third-party filing, lagged, not a House spent total, not a
        player contract.
      </p>
      <p>
        Seeded from IRS e-file XML via ProPublica / TEOS (verified on the form, not from
        a news memo): Texas One Fund Inc (EIN 87-3873183) student-athlete contractors /
        appearances $423,157 (2022), $11,717,673 (2023), $14,540,650 (2024); Friends of
        the University of Notre Dame Inc / FUND (EIN 87-4530736) NIL / athlete service
        compensation $1,176,862 (2022), $5,129,490 (2023), $10,823,302 (2024). Also
        booked when the 990 named the line: Classic City Collective (Georgia, 501(c)(6))
        $2,214,518 NIL payments (2023); 502Circle (Louisville) $545,833 athlete fees
        (2023); Walk of Champions (Alabama) $10,000 appearance fees (2023); Montlake
        Futures Fund (Washington) $2,803,276 appearance fees (year ended June 30, 2023);
        Garnet Trust Foundation (South Carolina) $2,735,455 NIL PAYMENTS (2023); Every
        True Tiger Foundation (Missouri) $13,000 name, image, and likeness (short year
        2022). Ohio State / Tennessee / LSU / Florida / Michigan / Oregon and other
        well-known collectives stay empty unless a public 990 names an athlete-pay line.
      </p>

      <h2>Modeled NIL (conference heuristic)</h2>
      <p>
        Every Power program gets a modeled range so the rank list is not 66 blanks and two
        filings. The construct is documented here and tagged <strong>modeled</strong>. It is
        not a player sum and not a Texas $80M rumor. House-era and
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
        market total, not a player file.
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
        says the share is year-scaled, not a filing. Booked NIL (school and player) stays official-only. No named
        booked dollars unless a public file names the athlete.
      </p>
      <blockquote>
        Starter on a verified two-deep → high end of the position band (starter-spot weight).
        Backup on that two-deep → low end (depth-spot weight).
        Full roster, no wiki rank → listed / depth-chart order fills starterCount, then
        depthCount, then the developmental 2-unit share. We do not copy one family midpoint
        onto every QB, WR, or other name at that position.
        Thin roster, no rank → midpoint of the starter and depth weights, and the row says so.
        A cited news-URL booked player NIL is kept and not overwritten by the band.
        If the sum of modeled player mids would exceed the football slice (itself inside 93% of the
        school modeled midpoint), every modeled mid is scaled down so ~7% stays unallocated at school
        level and men’s basketball keeps its card. School-level modeled NIL, booked NIL, capacity,
        and House cells do not change.
      </blockquote>
      <p>
        <em>Comparative</em> means the same position-band weight across the conference: a
        starting QB is weight 100 at every SEC desk, a backup QB is 15. Dollars then scale
        with that school’s modeled midpoint versus the conference median. House-era years
        use the nil-ncaa.com total-roster table (SEC $30.16M, Big Ten $24.41M, Big 12 $21.61M,
        ACC $21.24M; Notre Dame is ACC × 1.08). Collective-era years use that conference’s
        third-party median × the Opendorse year factor — Pac-12 via the Big 12 + ACC
        third-party average proxy above. A richer public-cap stack therefore shows a wider
        named-player band at the same roster spot — not a marketplace listing.
      </p>
      <p>
        Sources are linked in the roster footer: the ESPN roster page and, when used, the
        Wikipedia team page. No Instagram, X, or TikTok.
      </p>

      <h2>Position NIL history (modeled vs booked)</h2>
      <p>
        On a school page the named football roster is grouped by position. Click a
        position (QB, RB, WR, and the rest) to open an in-page year graph across the
        year-picker span (football 2021 through the current season). This is not a
        new site section and not a marketplace valuation.
      </p>
      <p>
        <em>Position dollars are an allocation of the school pot across that year’s
        named roster, not reported player contracts.</em>
        The pot is that year’s booked school NIL when a FOIA / MFRS / counsel
        cell exists (today: Louisville 2024 pre-cap and 2025, Kentucky 2025,
        UCLA and Cal 2025, Texas 2024 pre-cap and 2025, Penn State and Oklahoma State
        2024 pre-cap, and the cited FY2025 Item 44 $0 cells at Georgia, Tennessee,
        Alabama, Oregon, Utah, UNC, Ohio State, Illinois, Minnesota, Washington,
        Wisconsin, Iowa State, Virginia, and Ole Miss). Else the pot is the already-on-desk school modeled band —
        the conference heuristic, not a new national model. We spread that pot with
        the existing named-player unit card and sum by position. Years without a named roster file (today: 2022 and 2025)
        use the same position rate card, labeled as a rate-card year. Every position
        point or band is labeled <strong>modeled</strong> unless it is a real booked
        player or school cell. A missing booked cell is not invented. Louisville and
        Kentucky keep their booked cells official; the model never overwrites them.
      </p>
      <p>
        A visible footnote sits under the position graph and next to the clicked
        position or player dollar. It is not a hover tip. If that year’s pot is a
        booked school cell, the footnote names the filing
        (FOIA / MFRS / counsel), the year, and the URL. Collective 990 is not
        the pot. If the pot is the
        on-desk school model, the footnote says it is a labeled model (conference
        heuristic scaled to the published national market), not a reported player
        deal. Then: <em>We spread that school pot across the named roster for this
        year and summed the QB (or whatever position) share. That is an allocation,
        not a contract.</em> If a rare booked player cell exists, the footnote cites
        that player source instead of the allocation sentence.
      </p>
      <p>
        Clicking a named player opens that player’s own year series when the name
        appears on more than one season roster. Each player dollar is that player’s
        allocated modeled range (starter vs backup vs developmental), labeled
        modeled — not one family band copied onto every name. A cited news-URL
        booked player cell is kept and not overwritten. This desk still has no named
        booked dollar on an athlete unless a public file names them.
        Share URLs can deep-link an open position chart (<code>#pos-qb</code>) or
        player chart the same way the capacity-stack drills already share.
      </p>
      <p>
        The graph is a second cut of
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
        fat-tail illustration. We do not scrape Glassdoor, LinkedIn, or social.
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
        Where a linked PDF (or already-parsed TAC / guaranteed table) lists
        year-by-year remaining pay, the school buyout cell also carries a step tape
        — remaining = sum of remaining contract-year TAC or guaranteed × the
        school-side percent rule, labeled derived from that table + rule, with the
        PDF URL. A bare percent with no year table stays a rule. We do not invent
        a staircase. The buyout calculator consumes those steps when they exist.
      </p>
      <p>
        Football 2026 year cells (<code>coachesByYear.2026.football.pay</code>) take a
        copy of the current-chair pay object only when the names match and the
        current cell is a cited 2026 / current-deal dollar (PDF, article quoting the
        EA, or a 2026-asOf source). A 2024 or 2025 USA TODAY snapshot is not copied
        onto 2026. When the year-key already holds an independent 2026 cite and the
        current cell is a stale USA TODAY snapshot, current is stamped from that
        year-key (DeBoer $12.5M, Cignetti $12,025,000, Day $12.5M). Privates stay
        pending unless independently cited. Chair names are not rewritten.
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
        not a stand-in for a missing name.
      </p>


      <h2>Transfer portal</h2>
      <p>
        School pages list notable football additions and departures for the 2025–26 / 2026
        cycle. The NCAA ran a single FBS window, January 2–16, 2026 (CFP finalists got a
        short extra window after the title game). Names come from public Wikipedia 2026
        team pages, NCAA.com, FOX, CBS, Sports Illustrated, or school releases. In/out
        counts appear only when one of those pages publishes a number. Dollars stay blank
        unless a cited news figure exists — we do not invent a portal check.
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
        Hosted FY2025 NCAA Membership Financial Reports are the first source
        (line 3 student fees; line 4 direct institutional; line 2 government).
        That booked total is already the athletic department’s annual receipt.
        We do not treat it as a tuition rate and multiply it by enrollment to
        invent a new total. Institutional support is the university writing a
        check. Government support is the tax or state slice when a source splits
        it. Knight-Newhouse is used only when it cites those same lines; KN often
        rolls government + direct + indirect into one institutional/government cell.
      </p>
      <p>
        Two identities sit under the booked total, both labeled estimated. Implied
        per-student = booked student-fee total ÷ the enrollment proxy already on the
        school card (an IPEDS-ish undergrad headcount). That is a spread of the
        department total, not a published fee schedule, and it does not replace the
        booked cell. Published rate × enrollment is shown only when a feeRate is already
        on the desk (today: Louisville $200/semester). Semesters count as two terms a
        year; an annual rate counts as one. We do not invent a summer term. That product
        is calculated arithmetic — rate and enrollment both cited — and it does not
        overwrite the booked department total. Louisville’s $200 rate starts 2025–26 /
        FY2026; the FY2025 cell is still the old $25-fee year. If the booked line is $0,
        implied per-student is $0 (self-funded on that line).
      </p>
      <p>
        Source order: hosted FY2025 NCAA MFRS PDFs already used for Item 44, then the
        EADA public file at ope.ed.gov/athletics, then Knight-Newhouse when it cites
        the same lines. The EADA 2024–25 workbook was opened (4,275 columns) — grand
        total revenue/expense and sport totals only, no student-fee or
        institutional-support split — so no EADA dollars were booked for those cells.
        Remaining publics use KN school-profile FY2025 figures (student fees = MFRS
        line 3; institutional/government = KN combined lines 2+4+6+6A). $0 is printed
        when MFRS/KN reports $0 on that line, or when a school release says the
        department is self-funded (Ohio State FY25: no tuition or tax dollars; hosted
        MFRS line 4 $112,280 is offset by transfers and is not booked over the $0/$0
        filing). Rutgers keeps a newsroom 3-way split (fees / university / state).
        Government stays pending unless a source splits Line 2. Empty means pending,
        not zero. Privates and Pittsburgh have no public MFRS split. Cells live on
        the school object and are not added to the capacity stack. We did not scrape
        bursar pages.
      </p>

      <h2>Wins per dollar</h2>
      <p>
        Last completed football season (2025) wins, from Wikipedia conference standings
        and the NCAA standings PDF, divided by booked NIL if we have one, else the modeled
        NIL midpoint (the cell says modeled), and divided by annual capacity. Shown as
        wins per $1 million on the rank list (compact) and the school page. Not a coach
        grade. Men’s basketball 2025–26 records were not extracted on this pass.
      </p>

      <h2>Athletics debt</h2>
      <p>
        A school-page layer, next to apparel, student fees, and buyouts. The headline is
        outstanding athletics-related debt when we have it; annual debt service if that is
        the only cited cell. Click opens a breakdown: outstanding stock, annual debt service,
        then named stadium / indoor / facility projects. Shareable as <code>#debt</code>.
      </p>
      <p>
        Outstanding is NCAA MFRS Category 52 / Other Reporting Items — “Total Athletics
        Related Debt” — a stock at fiscal year-end, like a buyout overhang, not yearly spend.
        Annual debt service is Category 34, “Athletic Facilities Debt Service, Leases and
        Rental Fees”: principal and interest, including internal loans, plus leases and
        rental fees on athletic facilities in that reporting year, regardless of who cut
        the check. Knight-Newhouse cites those same two lines when we use it. A later MFRS
        page sometimes prints “Athletically-Related Facilities Annual Debt Service,” which
        can differ from Category 34 because it drops leases/rentals; this desk books
        Category 34. We do not add debt to annual capacity. Capacity stays media +
        sponsorships + tickets + booked contributions.
      </p>
      <p>
        Named projects are a cited tape only: project name, announced cost, remaining if
        the filing names it, through-date if named. We do not invent an amortization
        schedule or even-split a project cost across years. University-wide institutional
        debt (Category 53) is refused unless the filing itself splits an athletics-related
        amount. Privates stay empty unless the school or a newsroom published the figure.
        $0 is a real cell only when the filing says $0. Empty means pending.
      </p>
      <p>
        Source order: hosted FY2025 NCAA MFRS / AUP PDFs already on this desk, then a
        newsroom story that quotes those same lines (StateCollege.com on Penn State’s
        NCAA report; Gazette on Iowa’s campus athletics loan), then a board of trustees /
        regents resolution that names an athletics facility (Nebraska Memorial Stadium
        Big Red Rebuild). Knight-Newhouse school profiles cite the same MFRS debt lines
        but are JS-rendered here; we did not invent KN dollars we could not read. EMMA
        official statements are allowed when they name athletics facilities — none were
        booked on this pass without a matching athletics split.
      </p>

      <h2>Conference exit</h2>
      <p>
        A school-page layer, next to athletics debt. Named <em>Conference exit</em>,
        not Buyout — the coach-firing calculator stays on <a href="/buyout">/buyout</a>
        and is unchanged. Click opens a breakdown. Shareable as <code>#conference-exit</code>.
        This number is not added to annual capacity. Booked-only remains the
        default capacity toggle. We do not invent dollars or use “sources tell” figures.
      </p>
      <p>
        Four instruments. They are not equivalent.
      </p>
      <p>
        <strong>ACC — settlement year ladder, media rights in tow.</strong> The
        FSU / Clemson settlement published a stair. This desk cites
        {' '}<a href="https://www.postandcourier.com/sports/clemson/clemson-settlement-acc-lawsuit-exit-date/article_534238b8-1ec1-4ec4-b484-57ae49cd2cf5.html" target="_blank" rel="noreferrer">The Post and Courier</a>,
        which obtained the 68-page settlement: $165 million to exit in the
        2025–26 fiscal year (2026 season exit), then $147 million (2026–27),
        $129 million (2027–28), $111 million (2028–29), $93 million (2029–30),
        and $75 million from 2030–31 through the remainder of the ACC / ESPN
        deal (through 2036). Paying the fee lets the school leave <em>with</em>
        media rights — unlike the old grant-of-rights plus 3× operating budget.
        The school-page headline is year-honest: football 2025 (academic 2025–26)
        shows the $165 million step; football 2026 (academic 2026–27) shows
        $147 million. The full ladder sits in the drill. Applied only to current
        ACC football members (Boston College, Cal, Clemson, Duke, Florida State,
        Georgia Tech, Louisville, Miami, NC State, North Carolina, Pitt, SMU,
        Stanford, Syracuse, Virginia, Virginia Tech, Wake Forest).
      </p>
      <p>
        <strong>SEC — bylaw cash fee, not a media-rights buyback.</strong> Hosted
        2023–24 SEC Bylaws
        {' '}<a href="https://a.espncdn.com/sec/media/2023/2023-24%20SEC%20Bylaws.pdf" target="_blank" rel="noreferrer">§3.2</a>:
        $30 million with required notice (3.2.1); $40 million without notice (3.2.2);
        $45 million if deemed withdrawn (3.2.3). The school-page cell is the
        $30 million with-notice figure for every current SEC member, including
        Texas and Oklahoma. The $40 million / $45 million stairs are footnoted.
        The bylaws do not say a departing school leaves with media rights.
        This is not treated as equivalent to the ACC ladder.
      </p>
      <p>
        <strong>Big 12 — modeled 2× distributions from the FY2025 990 + hosted bylaws.</strong>
        {' '}<a href="https://static.big12sports.com/custompages/pdfs/handbook/bylaws.pdf" target="_blank" rel="noreferrer">§3.4</a>:
        Buyout Amount = the sum of distributions that otherwise would be paid
        during the final two years of membership. This desk models that as
        2 × the last cited FY2025 Form 990 Schedule I line
        {' '}(<a href="https://data.useplinth.com/foundation/the-big-12-conference-inc-752604555" target="_blank" rel="noreferrer">Plinth extract</a>
        of the IRS e-file;
        {' '}<a href="https://projects.propublica.org/nonprofits/organizations/752604555" target="_blank" rel="noreferrer">ProPublica</a>).
        Cells are labeled <strong>modeled</strong>, never booked. The hosted PDF
        still lists old members; we cite the withdrawal section, not the stale roster.
        The $100 million Texas / Oklahoma 2023–24 early-exit figure is not stamped
        on remaining members. Texas and Oklahoma are SEC.
      </p>
      <p>
        Paying the 2×-distributions formula does <em>not</em> buy back media
        rights. The grant of rights still sits with the league. §3.1: payment
        of the Buyout Amount “does not abrogate” the Grant of Rights Agreement.
        This is a cash formula only — not the ACC settlement (rights in tow).
        Every Big 12 school-page drill prints that sentence.
      </p>
      <p>
        Named full-share Schedule I lines are 2× the exact dollar (Arizona
        $38,009,311 → $76,018,622; Arizona State $43,009,550 → $86,019,100;
        Baylor $39,950,085 → $79,900,170; Colorado $39,034,422 → $78,068,844;
        Iowa State $41,194,426 → $82,388,852; Kansas $38,312,680 → $76,625,360;
        Kansas State $39,830,544 → $79,661,088; Oklahoma State $38,038,756 →
        $76,075,512; TCU $39,272,007 → $78,544,014; Texas Tech $39,734,106 →
        $79,468,212; Utah $37,879,865 → $75,759,730; West Virginia $39,582,600 →
        $79,165,200).
        BYU / Houston / UCF / Cincinnati were half-shares in FY2025; FY2026 is
        their first full-share year. We do not silently 2× the half-share as
        the going-forward buyout. Those four use a modeled range from named
        full-share peers (2 × $37,879,865–$43,009,550). Named half-share 990s
        (BYU $23,110,622; Cincinnati $20,211,539; UCF $19,978,520) appear as
        a 2× footnote only. Houston’s school-level FY2025 line was not
        independently extracted — no fake point.
        Cross-checks:
        {' '}<a href="https://www.usatoday.com/story/sports/college/2026/05/22/power-4-conference-money-comparison-big-ten-sec-acc-big-12-pac-12-brett-yormark/90204563007/" target="_blank" rel="noreferrer">USA TODAY 2026-05-22</a>
        (minimum full-share $37.9M; half-shares $19–23M);
        {' '}<a href="https://apnews.com/article/acc-big-12-revenue-distribution-b114cc5b581d043344b0d06110e0e2b0" target="_blank" rel="noreferrer">AP</a>
        /
        {' '}<a href="https://www.foxsports.com/articles/cfb/tax-filings-acc-paid-average-of-471m-to-fullshare-member-schools-big-12-paid-average-of-395m" target="_blank" rel="noreferrer">FOX Sports</a>
        (average ~$39.5M; Arizona/ASU/Colorado/Utah $37.9M–$43M);
        {' '}<a href="https://www.usatoday.com/story/sports/ncaaf/big12/2026/06/08/big-12-conference-revenue-dilution-realignment-big-ten-sec-acc/90375818007/" target="_blank" rel="noreferrer">USA TODAY 2026-06-08</a>
        named Iowa State $41.2M, Oklahoma State $38M, Texas Tech $39.7M.
        FY2026 <em>projections</em> in that last story are budgets, not 990s —
        unused.
      </p>
      <p>
        <strong>Notre Dame — modeled reporter estimate, not the football ladder.</strong>
        Football independent; they did not sign the ACC football grant of rights.
        We do not stamp the ACC $147M / $165M settlement on ND.
        {' '}<a href="https://247sports.com/article/explaining-notre-dames-realignment-dilemma-acc-grant-of-rights-fee-189990208/" target="_blank" rel="noreferrer">247Sports</a>
        quotes ESPN’s David Hale putting the ACC membership exit in the range
        of ~$100 million (three times the ACC’s then-recent annual revenue /
        the old 3× operating-budget style fee) and noting ND would be free of
        the football GOR charge. An original espn.com story or post with that
        $100 million figure was not located; the cell cites the newsroom quote
        and is labeled <strong>modeled</strong> (reporter estimate, not a filing).
        Footnote: this is the non-football ACC membership exit estimate.
      </p>
      <p>
        <strong>Big Ten — no published cash fee; grant of rights through 2036.</strong>
        Fourth instrument. There is no hosted cash exit fee.
        {' '}<a href="https://www.wakeforestlawreview.com/2024/09/fumbling-in-court-exploring-the-florida-state-acc-lawsuit/" target="_blank" rel="noreferrer">Wake Forest Law Review</a>
        on the Florida State / ACC case: “The Big 10 does not have an exit fee.”
        That is not $0 — $0 would read as free to leave. The lock is the grant
        of rights, currently through 2036. Media rights stay with the league if
        a school leaves before then.
        {' '}<a href="https://www.espn.com/college-sports/story/_/id/47003108/opposition-michigan-usc-pauses-24b-big-ten-deal" target="_blank" rel="noreferrer">ESPN</a>:
        Michigan Regent Jordan Acker discussed independence only “at the end of
        the Grant of Rights [in 2036]”; the paused UC Investments private-equity
        plan would have extended the grant of rights to 2046. Illinois FOIA has
        already been used to seek the bylaws; they were withheld. We do not
        model a number from another conference’s constitution, and we do not
        apply the Big 12 2×-distributions formula or leftover TV value.
        School-page #conference-exit cell reads <em>none published</em> / <em>grant of rights</em>.
      </p>

      <h2>Buyouts actually paid</h2>
      <p>
        Separate from the if-fired overhang on the current chair. This table is money a
        school actually owes or has settled with a former FB/MBB coach after a firing —
        The Athletic’s March 2026 contract census, USA TODAY, or a local FOIA. Headline
        max and current/settled figures are distinguished in the notes. Jimbo Fisher’s
        2023 Texas A&amp;M deal is included because the money is still moving. Pending
        if we do not have a cited payout. Paid buyouts show year cash when the
        filing names a schedule; otherwise the firing-year lump.
      </p>

      <h2>Offsets / free agents</h2>
      <p>
        A sibling lane to the current-chair buyout calculator, at <a href="/coach-fa">/coach-fa</a>.
        After a firing, School A may still owe a residual. That residual and the
        offset / mitigation clause stay booked / cite-only — empty without a cite.
        Fisher’s $77,562,500 figure is the cited remaining buyout at termination
        (Nov. 12, 2023), labeled booked-at-termination; the unpaid balance as of
        Sept. 4, 2026 is not ledger-verified, and the schedule continues through
        Dec. 31, 2031. We do not invent today’s remaining principal.
        Offset ¶5.3 of the Dec. 4, 2017 Texas A&amp;M agreement says the university
        is not entitled to any offset whatsoever — offset credit is $0.
        The public UI may accept a School B annual as a labeled modeled input.
        Optional all-in adds A residual to B salary and footnotes two payers; it
        stays off until flipped. Comp peers are USA TODAY 2025 Total Pay, labeled
        modeled / reported database — not FOIA PDFs. Other free-agent chairs stay
        empty until a booked residual is on the desk.
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
        <li><strong>booked</strong> — a cited contract figure or clause on the offset / free-agent lane. Empty without a cite.</li>
        <li><strong>estimated</strong> — desk estimate, residual, or unofficial deal term. Source is still named.</li>
        <li><strong>modeled</strong> — alumni cohort / wealth / giving, conference NIL range, position rate card, Big 12 conference-exit 2× 990s, the Notre Dame Hale estimate, a typed School B salary, or a USA TODAY Total Pay comp band.</li>
        <li><strong>pending</strong> — we looked, we do not have a number, cell stays empty.</li>
      </ul>

      <h2>What we did not do</h2>
      <ul>
        <li>No Instagram / X / TikTok scrapers. The 2021–24 year scalar is a published national market total from the Opendorse “NIL at 3” report / Athletic Business recap — not a player file.</li>
        <li>No Glassdoor or LinkedIn ingest — those sites are not a source for the earnings corroboration block.</li>
        <li>No invented source labels.</li>
        <li>No invented player names, and no invented <em>reported</em> deal dollar on a named player (modeled shares of the school pot are labeled modeled).</li>
        <li>No women’s sports or Olympic-sport roster math in v1 (the 7% unallocated slice is the placeholder).</li>
        <li>Knight-Newhouse bulk download is CAPTCHA-gated. Hosted FY2025 MFRS PDFs are the first student-fee / subsidy source; remaining publics use public KN school-profile charts that cite the same MFRS lines. EADA 2024–25 has no fee/support split. Rutgers Extra Points, Ohio State newsroom, and the Louisville $200/semester fee rate stay as already-cited filings.</li>
        <li>Athletics debt is a separate layer, not a capacity add-on. Category 53 university-wide institutional debt is refused unless the filing splits an athletics-related amount. We do not invent an amortization schedule from a project cost. Empty stays empty.</li>
        <li>Conference exit is a separate layer, not a capacity add-on and not a coach-firing buyout. We do not invent an ACC dollar without a hosted packet or a newsroom quote of the filing. We do not stamp the Big 12 $100M Texas/Oklahoma one-off on remaining members. Big 12 remaining members are a labeled model of §3.4 (2× last cited 990), not a booked invoice, and not an ACC-style rights-in-tow ladder. Notre Dame is a modeled Hale / 247Sports membership estimate — not the FSU/Clemson football ladder. Big Ten has no published cash fee — we do not print $0, do not borrow the Big 12 formula, and do not invent leftover TV value. Empty stays empty.</li>
        <li>Coach free-agent / offset residuals are a separate lane, not the if-fired overhang on the current chair. We do not invent today’s remaining principal from an old schedule, and we do not invent an offset credit when the file says none. School B salary is a labeled modeled input only. All-in is two payers, off by default. Comp band is a USA TODAY database snapshot, not a FOIA PDF. Other chairs stay empty until a cite is on the desk.</li>
      </ul>
    </div>
  )
}
