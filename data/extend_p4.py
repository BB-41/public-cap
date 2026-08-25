#!/usr/bin/env python3
"""Extend Public Cap from 16 schools to Power 4 + Notre Dame (68). Reuses existing 16."""
import json
from pathlib import Path

ROOT = Path("/workspace/public-cap")
SRC_JSON = ROOT / "data" / "schools.json"
SC = json.loads(Path("/tmp/scorecard_p4.json").read_text())
COACH = json.loads(Path("/tmp/usat_coaches.json").read_text())

SRC = {
    "usat_p4": "https://www.usatoday.com/story/sports/college/2026/05/22/power-4-conference-money-comparison-big-ten-sec-acc-big-12-pac-12-brett-yormark/90204563007/",
    "b1g_dist": "https://buckeyeswire.usatoday.com/story/sports/college/buckeyes/football/2026/05/23/big-ten-programs-revenue-distribution-numbers-ohio-state/90236918007/",
    "cj_acc": "https://www.courier-journal.com/story/sports/college/louisville/2026/07/21/acc-revenue-louisville-cardinals-college-football-basketball-fiscal-year-2025-federal-tax-returns/90663084007/",
    "wral_acc": "https://www.wral.com/sports/acc-revenue-record-tax-documents-average-per-school-distribution-jim-phillips-may-2026/",
    "cbs_sec": "https://www.cbssports.com/college-football/news/sec-revenue-distribution-sports-football-billion-dollars-2024-2025/",
    "dmn_sec": "https://www.dallasnews.com/sports/college-sports/2026/02/05/sec-revenue-distribution-texas-oklahoma/",
    "usat_fb": "https://sportsdata.usatoday.com/ncaa/salaries/football/coach",
    "usat_mbb": "https://sportsdata.usatoday.com/ncaa/salaries/mens-basketball/coach",
    "kn": "https://www.knightnewhousedata.org/",
    "scorecard_data": "https://collegescorecard.ed.gov/data/",
    "ct_earn": "https://www.collegetransitions.com/dataverse/graduate-earnings/",
    "nces": "https://nces.ed.gov/collegenavigator/",
    "big12_990": "https://data.useplinth.com/foundation/the-big-12-conference-inc-752604555",
    "usat_b12": "https://www.usatoday.com/story/sports/ncaaf/big12/2026/06/08/big-12-conference-revenue-dilution-realignment-big-ten-sec-acc/90375818007/",
}

def n(value, confidence, source, url, as_of, fy=None, notes=None, window=None):
    d = {"value": value, "confidence": confidence, "source": source, "url": url, "asOf": as_of}
    if fy:
        d["fiscalYear"] = fy
    if notes:
        d["notes"] = notes
    if window:
        d["window"] = window
    return d

def empty(notes, url=None):
    return {"value": None, "confidence": "pending", "source": None, "url": url, "asOf": None, "notes": notes}

def coach_obj(usat_key, sport):
    row = COACH[sport].get(usat_key)
    url = SRC["usat_fb"] if sport == "fb" else SRC["usat_mbb"]
    as_of = "2025-10-08" if sport == "fb" else "2026-04-08"
    if not row:
        return {
            "name": "—",
            "pay": empty("USA TODAY salary cell not located for this school."),
            "buyout": empty("USA TODAY buyout cell not located."),
        }
    pay, buy = row["pay"], row["buyout"]
    out = {"name": row["name"]}
    if pay is not None:
        out["pay"] = n(pay, "reported", "USA TODAY Sports coach salary database", url, as_of,
                       notes="Total pay. Annual flow, not a wealth stock.")
    else:
        out["pay"] = empty("USA TODAY left pay blank (private-school / unreleased contract).")
    if buy is not None:
        out["buyout"] = n(buy, "reported", "USA TODAY Sports coach salary database", url, as_of,
                          notes="School buyout if fired without cause on the as-of date. Liability/overhang, not annual spend.")
    else:
        out["buyout"] = empty("USA TODAY left the buyout cell blank (private-school or unreleased).")
    return out

PEER = {
    "SEC": (18_000_000, 24_000_000, 28_000_000),
    "Big Ten": (18_000_000, 26_000_000, 28_000_000),
    "ACC": (14_000_000, 20_000_000, 22_000_000),
    "Big 12": (14_000_000, 18_000_000, 22_000_000),
}

def media_field(kind, notes=None):
    if kind == "sec_floor":
        return n(70_300_000, "estimated",
                 "USA TODAY — SEC FY2025 minimum distribution to full-share members",
                 SRC["usat_p4"], "2026-05-22", "FY2025",
                 notes=notes or "School-level 990 not independently extracted. Using conference floor as estimated media/conference flow.")
    if kind == "b1g_floor":
        return n(76_000_000, "estimated",
                 "USA TODAY / Buckeyes Wire — Big Ten FY2025 full-share floor",
                 SRC["b1g_dist"], "2026-05-23", "FY2025",
                 notes=notes or "School-level 990 not independently extracted. Using conference floor as estimated media/conference flow.")
    if kind == "acc_floor":
        return n(42_800_000, "estimated",
                 "USA TODAY / WRAL — ACC FY2025 minimum to 14 full-share football members",
                 SRC["wral_acc"], "2026-05", "FY2025",
                 notes=notes or "School-level 990 not independently extracted. Using conference floor as estimated media/conference flow.")
    if kind == "b12_floor":
        return n(37_900_000, "estimated",
                 "USA TODAY — Big 12 FY2025 full-share floor (~$37.9M; Utah $37.88M)",
                 SRC["usat_p4"], "2026-05-22", "FY2025",
                 notes=notes or "School-level 990 not independently extracted. Using conference floor as estimated media/conference flow.")
    raise ValueError(kind)

def reported_media(value, source, url, as_of, notes=None):
    return n(value, "reported", source, url, as_of, "FY2025", notes=notes)

def capacity_block(conf, private, media, extra_note=None):
    fy = "FY2025"
    cap = {"fiscalYearPrimary": fy}
    if extra_note:
        cap["fiscalYearNote"] = extra_note
    cap["mediaConference"] = media
    if private:
        cap["gapNote"] = "Private institution. Knight-Newhouse does not publish MFRS categories. Tickets, sponsorships, and athletic contributions are a revenue gap."
        cap["sponsorships"] = empty("Private-school gap. No public Category 15.")
        cap["tickets"] = empty("Private-school gap. No public Category 1.")
        cap["contributions"] = empty("Private-school gap. No public Category 8.")
    else:
        spon, tix, give = PEER[conf]
        cap["sponsorships"] = n(spon, "estimated",
            "Desk estimate — Category 15 not extracted for this school in the 68-school expansion. Peer-scaled from conference programs with published stacks.",
            SRC["kn"], "2026-08", fy,
            notes="Estimate only. Not a reported line.")
        cap["tickets"] = n(tix, "estimated",
            "Desk estimate — Category 1 not extracted for this school in the 68-school expansion. Peer-scaled from conference programs with published stacks.",
            SRC["kn"], "2026-08", fy,
            notes="Estimate only. Not a reported line.")
        cap["contributions"] = n(give, "estimated",
            "Desk estimate — Category 8 not extracted for this school in the 68-school expansion. Peer-scaled from conference programs with published stacks.",
            SRC["kn"], "2026-08", fy,
            notes="Estimate only. Not a reported line.")
    return cap

def alumni_block(sid, ipeds, scorecard_slug):
    sc = SC[sid]
    earn = int(sc["earn10"])
    ugds = int(float(sc["ugds"]))
    url = f"https://collegescorecard.ed.gov/school/?{ipeds}-{scorecard_slug}"
    return {
        "undergradEnrollment": n(ugds, "reported",
            "College Scorecard Most Recent Institution file — undergraduate enrollment (UGDS)",
            SRC["scorecard_data"], "2026-06-10",
            notes="Used only as a cohort-size proxy. Not a census of living alumni."),
        "officialEarnings": n(earn, "reported",
            "College Scorecard median earnings 10 years after entry (Most Recent Institution file, June 2026 release)",
            SRC["scorecard_data"], "2026-06-10",
            notes="Official alumni earnings line. Scorecard, not a net-worth figure. Opportunity Insights (Chetty) mid-career earnings are the other official lane; we did not ingest OI tables in this expansion."),
        "scorecardUrl": url,
    }

def school(**kw):
    sid = kw["id"]
    ipeds = kw["ipedsId"]
    slug = kw["scorecardSlug"]
    conf = kw["conference"]
    private = kw["private"]
    return {
        "id": sid,
        "name": kw["name"],
        "shortName": kw.get("shortName", kw["name"]),
        "conference": conf,
        "private": private,
        "revenueGap": private,
        "city": kw["city"],
        "ipedsId": ipeds,
        "scorecardUrl": f"https://collegescorecard.ed.gov/school/?{ipeds}-{slug}",
        "logo": f"/logos/{sid}.png",
        "abbr": kw["abbr"],
        "color": kw["color"],
        "capacity": capacity_block(conf, private, kw["media"], kw.get("note")),
        "alumni": alumni_block(sid, ipeds, slug),
        "nil": {"booked": empty("No FOIA / MFRS institutional NIL or collective 990 figure located. Band left pending. We do not scrape On3, Opendorse, or NIL Go.")},
        "coaches": {
            "football": coach_obj(kw["usat"], "fb"),
            "mbb": coach_obj(kw["usat"], "mbb"),
        },
    }

# Existing 16 keep their numbers; we only stamp logo/abbr/color.
EXISTING_META = {
    "texas": ("TEX", "#BF5700"),
    "ohio-state": ("OSU", "#BB0000"),
    "alabama": ("ALA", "#9E1B32"),
    "georgia": ("UGA", "#BA0C2F"),
    "michigan": ("MICH", "#00274C"),
    "tennessee": ("TENN", "#FF8200"),
    "oregon": ("ORE", "#154733"),
    "washington": ("WASH", "#4B2E83"),
    "usc": ("USC", "#990000"),
    "notre-dame": ("ND", "#0C2340"),
    "kansas": ("KU", "#0051BA"),
    "louisville": ("LOU", "#AD0000"),
    "kentucky": ("UK", "#0033A0"),
    "vanderbilt": ("VAN", "#866D4B"),
    "clemson": ("CLEM", "#F56600"),
    "miami": ("MIA", "#F47321"),
}

NEW = []

def add(**kw):
    NEW.append(school(**kw))

# ---- SEC additions ----
add(id="arkansas", name="Arkansas", abbr="ARK", color="#9D2235", conference="SEC",
    private=False, city="Fayetteville, AR", ipedsId="106397",
    scorecardSlug="University-of-Arkansas", usat="Arkansas",
    media=media_field("sec_floor"))
add(id="auburn", name="Auburn", abbr="AUB", color="#0C2340", conference="SEC",
    private=False, city="Auburn, AL", ipedsId="100858",
    scorecardSlug="Auburn-University", usat="Auburn",
    media=media_field("sec_floor"))
add(id="florida", name="Florida", abbr="FLA", color="#0021A5", conference="SEC",
    private=False, city="Gainesville, FL", ipedsId="134130",
    scorecardSlug="University-of-Florida", usat="Florida",
    media=media_field("sec_floor"))
add(id="lsu", name="LSU", abbr="LSU", color="#461D7C", conference="SEC",
    private=False, city="Baton Rouge, LA", ipedsId="159391",
    scorecardSlug="Louisiana-State-University-and-Agricultural-Mechanical-College", usat="LSU",
    media=media_field("sec_floor"))
add(id="mississippi-state", name="Mississippi State", abbr="MSST", color="#660000", conference="SEC",
    private=False, city="Starkville, MS", ipedsId="176080",
    scorecardSlug="Mississippi-State-University", usat="Mississippi State",
    media=media_field("sec_floor"))
add(id="missouri", name="Missouri", abbr="MIZZ", color="#F1B82D", conference="SEC",
    private=False, city="Columbia, MO", ipedsId="178396",
    scorecardSlug="University-of-Missouri-Columbia", usat="Missouri",
    media=media_field("sec_floor"))
add(id="oklahoma", name="Oklahoma", abbr="OU", color="#841617", conference="SEC",
    private=False, city="Norman, OK", ipedsId="207500",
    scorecardSlug="University-of-Oklahoma-Norman-Campus", usat="Oklahoma",
    media=reported_media(2_600_000,
        "SEC / CBS Sports / Dallas Morning News — Oklahoma FY2025 conference distribution (phase-in)",
        SRC["cbs_sec"], "2026-02",
        notes="Cited phase-in, not a full SEC share. Not blended with a prior-year Big 12 check."),
    note="FY2025 SEC distribution is a phase-in ($2.6M cited). Tickets/sponsorships/contributions are desk estimates; media is the cited phase-in only.")
add(id="ole-miss", name="Ole Miss", abbr="MISS", color="#CE1126", conference="SEC",
    private=False, city="Oxford, MS", ipedsId="176017",
    scorecardSlug="University-of-Mississippi", usat="Ole Miss",
    media=media_field("sec_floor"))
add(id="south-carolina", name="South Carolina", abbr="SC", color="#73000A", conference="SEC",
    private=False, city="Columbia, SC", ipedsId="218663",
    scorecardSlug="University-of-South-Carolina-Columbia", usat="South Carolina",
    media=media_field("sec_floor"))
add(id="texas-am", name="Texas A&M", abbr="TAMU", color="#500000", conference="SEC",
    private=False, city="College Station, TX", ipedsId="228723",
    scorecardSlug="Texas-AM-University-College-Station", usat="Texas A&M",
    media=media_field("sec_floor"))

# ---- Big Ten additions ----
add(id="illinois", name="Illinois", abbr="ILL", color="#E84A27", conference="Big Ten",
    private=False, city="Champaign, IL", ipedsId="145637",
    scorecardSlug="University-of-Illinois-Urbana-Champaign", usat="Illinois",
    media=reported_media(76_000_000, "USA TODAY / Buckeyes Wire — Illinois Big Ten FY2025 distribution (full-share floor)",
                         SRC["b1g_dist"], "2026-05-23"))
add(id="indiana", name="Indiana", abbr="IU", color="#990000", conference="Big Ten",
    private=False, city="Bloomington, IN", ipedsId="151351",
    scorecardSlug="Indiana-University-Bloomington", usat="Indiana",
    media=reported_media(81_000_000, "USA TODAY / Buckeyes Wire — Indiana Big Ten FY2025 distribution (CFP premium)",
                         SRC["b1g_dist"], "2026-05-23"))
add(id="iowa", name="Iowa", abbr="IOWA", color="#FFCD00", conference="Big Ten",
    private=False, city="Iowa City, IA", ipedsId="153658",
    scorecardSlug="University-of-Iowa", usat="Iowa",
    media=reported_media(76_000_000, "USA TODAY / Buckeyes Wire — Iowa Big Ten FY2025 distribution (full-share floor)",
                         SRC["b1g_dist"], "2026-05-23"))
add(id="maryland", name="Maryland", abbr="MD", color="#E03A3E", conference="Big Ten",
    private=False, city="College Park, MD", ipedsId="163286",
    scorecardSlug="University-of-Maryland-College-Park", usat="Maryland",
    media=reported_media(76_000_000, "USA TODAY / Buckeyes Wire — Maryland Big Ten FY2025 distribution (full-share floor)",
                         SRC["b1g_dist"], "2026-05-23"))
add(id="michigan-state", name="Michigan State", abbr="MSU", color="#18453B", conference="Big Ten",
    private=False, city="East Lansing, MI", ipedsId="171100",
    scorecardSlug="Michigan-State-University", usat="Michigan State",
    media=reported_media(76_000_000, "USA TODAY / Buckeyes Wire — Michigan State Big Ten FY2025 distribution (full-share floor)",
                         SRC["b1g_dist"], "2026-05-23"))
add(id="minnesota", name="Minnesota", abbr="MINN", color="#7A0019", conference="Big Ten",
    private=False, city="Minneapolis, MN", ipedsId="174066",
    scorecardSlug="University-of-Minnesota-Twin-Cities", usat="Minnesota",
    media=reported_media(76_000_000, "USA TODAY / Buckeyes Wire — Minnesota Big Ten FY2025 distribution (full-share floor)",
                         SRC["b1g_dist"], "2026-05-23"))
add(id="nebraska", name="Nebraska", abbr="NEB", color="#E41C38", conference="Big Ten",
    private=False, city="Lincoln, NE", ipedsId="181464",
    scorecardSlug="University-of-Nebraska-Lincoln", usat="Nebraska",
    media=reported_media(76_000_000, "USA TODAY / Buckeyes Wire — Nebraska Big Ten FY2025 distribution (full-share floor)",
                         SRC["b1g_dist"], "2026-05-23"))
add(id="northwestern", name="Northwestern", abbr="NU", color="#4E2A84", conference="Big Ten",
    private=True, city="Evanston, IL", ipedsId="147767",
    scorecardSlug="Northwestern-University", usat="Northwestern",
    media=reported_media(76_000_000, "USA TODAY / Buckeyes Wire — Northwestern Big Ten FY2025 distribution (full-share floor)",
                         SRC["b1g_dist"], "2026-05-23"))
add(id="penn-state", name="Penn State", abbr="PSU", color="#041E42", conference="Big Ten",
    private=False, city="University Park, PA", ipedsId="214777",
    scorecardSlug="Pennsylvania-State-University-Main-Campus", usat="Penn State",
    media=reported_media(88_900_000, "USA TODAY / Buckeyes Wire — Penn State Big Ten FY2025 distribution (CFP semifinal premium)",
                         SRC["b1g_dist"], "2026-05-23"))
add(id="purdue", name="Purdue", abbr="PUR", color="#CEB888", conference="Big Ten",
    private=False, city="West Lafayette, IN", ipedsId="243780",
    scorecardSlug="Purdue-University-Main-Campus", usat="Purdue",
    media=reported_media(76_000_000, "USA TODAY / Buckeyes Wire — Purdue Big Ten FY2025 distribution (full-share floor)",
                         SRC["b1g_dist"], "2026-05-23"))
add(id="rutgers", name="Rutgers", abbr="RUT", color="#CC0033", conference="Big Ten",
    private=False, city="Piscataway, NJ", ipedsId="186380",
    scorecardSlug="Rutgers-University-New-Brunswick", usat="Rutgers",
    media=reported_media(76_000_000, "USA TODAY / Buckeyes Wire — Rutgers Big Ten FY2025 distribution (full-share floor)",
                         SRC["b1g_dist"], "2026-05-23"))
add(id="ucla", name="UCLA", abbr="UCLA", color="#2D68C4", conference="Big Ten",
    private=False, city="Los Angeles, CA", ipedsId="110662",
    scorecardSlug="University-of-California-Los-Angeles", usat="UCLA",
    media=reported_media(76_000_000, "USA TODAY / Buckeyes Wire — UCLA Big Ten FY2025 distribution (full share; listed at the $76M floor)",
                         SRC["b1g_dist"], "2026-05-23",
                         notes="UCLA/USC booked as full members in the FY2025 990 table. Oregon/Washington were the half-shares."))
add(id="wisconsin", name="Wisconsin", abbr="WIS", color="#C5050C", conference="Big Ten",
    private=False, city="Madison, WI", ipedsId="240444",
    scorecardSlug="University-of-Wisconsin-Madison", usat="Wisconsin",
    media=reported_media(76_000_000, "USA TODAY / Buckeyes Wire — Wisconsin Big Ten FY2025 distribution (full-share floor)",
                         SRC["b1g_dist"], "2026-05-23"))

# ---- ACC additions ----
add(id="boston-college", name="Boston College", abbr="BC", color="#8A100B", conference="ACC",
    private=True, city="Chestnut Hill, MA", ipedsId="164924",
    scorecardSlug="Boston-College", usat="Boston College",
    media=media_field("acc_floor"))
add(id="california", name="California", abbr="CAL", color="#003262", conference="ACC",
    private=False, city="Berkeley, CA", ipedsId="110635",
    scorecardSlug="University-of-California-Berkeley", usat="California",
    media=reported_media(22_990_000, "Courier-Journal — ACC FY2025 Form 990, California $22.99M (partial TV share)",
                         SRC["cj_acc"], "2026-07-21"))
add(id="duke", name="Duke", abbr="DUKE", color="#003087", conference="ACC",
    private=True, city="Durham, NC", ipedsId="198419",
    scorecardSlug="Duke-University", usat="Duke",
    media=reported_media(48_240_000, "Courier-Journal — ACC FY2025 Form 990, Duke $48.24M",
                         SRC["cj_acc"], "2026-07-21"))
add(id="florida-state", name="Florida State", abbr="FSU", color="#782F40", conference="ACC",
    private=False, city="Tallahassee, FL", ipedsId="134097",
    scorecardSlug="Florida-State-University", usat="Florida State",
    media=media_field("acc_floor"))
add(id="georgia-tech", name="Georgia Tech", abbr="GT", color="#B3A369", conference="ACC",
    private=False, city="Atlanta, GA", ipedsId="139755",
    scorecardSlug="Georgia-Institute-of-Technology-Main-Campus", usat="Georgia Tech",
    media=media_field("acc_floor"))
add(id="nc-state", name="NC State", abbr="NCSU", color="#CC0000", conference="ACC",
    private=False, city="Raleigh, NC", ipedsId="199193",
    scorecardSlug="North-Carolina-State-University-at-Raleigh", usat="North Carolina State",
    media=reported_media(46_600_000, "WRAL — ACC FY2025 Form 990, NC State $46.6M",
                         SRC["wral_acc"], "2026-05"))
add(id="north-carolina", name="North Carolina", abbr="UNC", color="#7BAFD4", conference="ACC",
    private=False, city="Chapel Hill, NC", ipedsId="199120",
    scorecardSlug="University-of-North-Carolina-at-Chapel-Hill", usat="North Carolina",
    media=reported_media(47_920_000, "Courier-Journal / WRAL — ACC FY2025 Form 990, North Carolina $47.92M",
                         SRC["cj_acc"], "2026-07-21"))
add(id="pittsburgh", name="Pittsburgh", abbr="PITT", color="#003594", conference="ACC",
    private=False, city="Pittsburgh, PA", ipedsId="215293",
    scorecardSlug="University-of-Pittsburgh-Pittsburgh-Campus", usat="Pittsburgh",
    media=media_field("acc_floor"))
add(id="smu", name="SMU", abbr="SMU", color="#C8102E", conference="ACC",
    private=True, city="Dallas, TX", ipedsId="228246",
    scorecardSlug="Southern-Methodist-University", usat="SMU",
    media=reported_media(17_070_000, "Courier-Journal — ACC FY2025 Form 990, SMU $17.07M (no TV money early in membership)",
                         SRC["cj_acc"], "2026-07-21"))
add(id="stanford", name="Stanford", abbr="STAN", color="#8C1515", conference="ACC",
    private=True, city="Stanford, CA", ipedsId="243744",
    scorecardSlug="Stanford-University", usat="Stanford",
    media=reported_media(19_560_000, "Courier-Journal — ACC FY2025 Form 990, Stanford $19.56M (partial TV share)",
                         SRC["cj_acc"], "2026-07-21"))
add(id="syracuse", name="Syracuse", abbr="SYR", color="#F76900", conference="ACC",
    private=True, city="Syracuse, NY", ipedsId="196413",
    scorecardSlug="Syracuse-University", usat="Syracuse",
    media=reported_media(48_450_000, "Courier-Journal — ACC FY2025 Form 990, Syracuse $48.45M (2nd in league)",
                         SRC["cj_acc"], "2026-07-21"))
add(id="virginia", name="Virginia", abbr="UVA", color="#232D4B", conference="ACC",
    private=False, city="Charlottesville, VA", ipedsId="234076",
    scorecardSlug="University-of-Virginia-Main-Campus", usat="Virginia",
    media=media_field("acc_floor"))
add(id="virginia-tech", name="Virginia Tech", abbr="VT", color="#630031", conference="ACC",
    private=False, city="Blacksburg, VA", ipedsId="233921",
    scorecardSlug="Virginia-Polytechnic-Institute-and-State-University", usat="Virginia Tech",
    media=media_field("acc_floor"))
add(id="wake-forest", name="Wake Forest", abbr="WAKE", color="#9E7E38", conference="ACC",
    private=True, city="Winston-Salem, NC", ipedsId="199847",
    scorecardSlug="Wake-Forest-University", usat="Wake Forest",
    media=media_field("acc_floor"))

# ---- Big 12 additions ----
add(id="arizona", name="Arizona", abbr="ARIZ", color="#CC0033", conference="Big 12",
    private=False, city="Tucson, AZ", ipedsId="104179",
    scorecardSlug="University-of-Arizona", usat="Arizona",
    media=reported_media(38_009_311, "Big 12 Conference FY2025 Form 990 grantee list — University of Arizona",
                         SRC["big12_990"], "2026-05"))
add(id="arizona-state", name="Arizona State", abbr="ASU", color="#8C1D40", conference="Big 12",
    private=False, city="Tempe, AZ", ipedsId="104151",
    scorecardSlug="Arizona-State-University-Campus-Immersion", usat="Arizona State",
    media=reported_media(43_009_550, "Big 12 Conference FY2025 Form 990 grantee list — Arizona State University (league high)",
                         SRC["big12_990"], "2026-05"))
add(id="baylor", name="Baylor", abbr="BAY", color="#154734", conference="Big 12",
    private=True, city="Waco, TX", ipedsId="223232",
    scorecardSlug="Baylor-University", usat="Baylor",
    media=reported_media(39_950_085, "Big 12 Conference FY2025 Form 990 grantee list — Baylor University",
                         SRC["big12_990"], "2026-05"))
add(id="byu", name="BYU", abbr="BYU", color="#002255", conference="Big 12",
    private=True, city="Provo, UT", ipedsId="230038",
    scorecardSlug="Brigham-Young-University", usat="BYU",
    media=reported_media(23_110_622, "Big 12 Conference FY2025 Form 990 grantee list — Brigham Young University (half-share year)",
                         SRC["big12_990"], "2026-05"))
add(id="cincinnati", name="Cincinnati", abbr="CIN", color="#E00122", conference="Big 12",
    private=False, city="Cincinnati, OH", ipedsId="201885",
    scorecardSlug="University-of-Cincinnati-Main-Campus", usat="Cincinnati",
    media=reported_media(20_211_539, "Big 12 Conference FY2025 Form 990 grantee list — University of Cincinnati (half-share year)",
                         SRC["big12_990"], "2026-05"))
add(id="colorado", name="Colorado", abbr="COLO", color="#CFB87C", conference="Big 12",
    private=False, city="Boulder, CO", ipedsId="126614",
    scorecardSlug="University-of-Colorado-Boulder", usat="Colorado",
    media=reported_media(39_034_422, "Big 12 Conference FY2025 Form 990 grantee list — University of Colorado",
                         SRC["big12_990"], "2026-05"))
add(id="houston", name="Houston", abbr="HOU", color="#C8102E", conference="Big 12",
    private=False, city="Houston, TX", ipedsId="225511",
    scorecardSlug="University-of-Houston", usat="Houston",
    media=n(20_000_000, "estimated",
            "USA TODAY — BYU/Houston/UCF/Cincinnati on FY2025 half-shares; UCF $19.98M and Cincinnati $20.21M are cited 990 lines. Houston school-level FY2025 990 line not independently extracted.",
            SRC["usat_b12"], "2026-06-08", "FY2025",
            notes="Estimated half-share peer to UCF/Cincinnati. Not a named Houston 990 figure."))
add(id="iowa-state", name="Iowa State", abbr="ISU", color="#C8102E", conference="Big 12",
    private=False, city="Ames, IA", ipedsId="153603",
    scorecardSlug="Iowa-State-University", usat="Iowa State",
    media=reported_media(41_194_426, "Big 12 Conference FY2025 Form 990 grantee list — Iowa State",
                         SRC["big12_990"], "2026-05"))
add(id="kansas-state", name="Kansas State", abbr="KSU", color="#512888", conference="Big 12",
    private=False, city="Manhattan, KS", ipedsId="155399",
    scorecardSlug="Kansas-State-University", usat="Kansas State",
    media=reported_media(39_830_544, "Big 12 Conference FY2025 Form 990 grantee list — Kansas State University",
                         SRC["big12_990"], "2026-05"))
add(id="oklahoma-state", name="Oklahoma State", abbr="OKST", color="#FF7300", conference="Big 12",
    private=False, city="Stillwater, OK", ipedsId="207388",
    scorecardSlug="Oklahoma-State-University-Main-Campus", usat="Oklahoma State",
    media=reported_media(38_038_756, "Big 12 Conference FY2025 Form 990 grantee list — Oklahoma State University",
                         SRC["big12_990"], "2026-05"))
add(id="tcu", name="TCU", abbr="TCU", color="#4D1979", conference="Big 12",
    private=True, city="Fort Worth, TX", ipedsId="228875",
    scorecardSlug="Texas-Christian-University", usat="TCU",
    media=reported_media(39_272_007, "Big 12 Conference FY2025 Form 990 grantee list — Texas Christian University",
                         SRC["big12_990"], "2026-05"))
add(id="texas-tech", name="Texas Tech", abbr="TTU", color="#CC0000", conference="Big 12",
    private=False, city="Lubbock, TX", ipedsId="229115",
    scorecardSlug="Texas-Tech-University", usat="Texas Tech",
    media=reported_media(39_734_106, "Big 12 Conference FY2025 Form 990 grantee list — Texas Tech University",
                         SRC["big12_990"], "2026-05"))
add(id="ucf", name="UCF", abbr="UCF", color="#BA9B37", conference="Big 12",
    private=False, city="Orlando, FL", ipedsId="132903",
    scorecardSlug="University-of-Central-Florida", usat="UCF",
    media=reported_media(19_978_520, "Big 12 Conference FY2025 Form 990 grantee list — University of Central Florida (half-share year)",
                         SRC["big12_990"], "2026-05"))
add(id="utah", name="Utah", abbr="UTAH", color="#CC0000", conference="Big 12",
    private=False, city="Salt Lake City, UT", ipedsId="230764",
    scorecardSlug="University-of-Utah", usat="Utah",
    media=reported_media(37_879_865, "Big 12 Conference FY2025 Form 990 grantee list — University of Utah",
                         SRC["big12_990"], "2026-05"))
add(id="west-virginia", name="West Virginia", abbr="WVU", color="#002855", conference="Big 12",
    private=False, city="Morgantown, WV", ipedsId="238032",
    scorecardSlug="West-Virginia-University", usat="West Virginia",
    media=reported_media(39_582_600, "Big 12 Conference FY2025 Form 990 grantee list — West Virginia University",
                         SRC["big12_990"], "2026-05"))

data = json.loads(SRC_JSON.read_text())
existing_ids = {s["id"] for s in data["schools"]}
for s in data["schools"]:
    abbr, color = EXISTING_META[s["id"]]
    s["logo"] = f"/logos/{s['id']}.png"
    s["abbr"] = abbr
    s["color"] = color

new_ids = {s["id"] for s in NEW}
overlap = existing_ids & new_ids
if overlap:
    raise SystemExit(f"overlap {overlap}")

data["schools"].extend(NEW)
data["meta"]["version"] = "1.1.0"
data["meta"]["scope"] = "Football and men's basketball only. Full Power 4 (SEC 16, Big Ten 18, ACC 17, Big 12 16) plus Notre Dame. 68 schools."
data["meta"]["asOf"] = "2026-08-23"
data["meta"]["blockers"] = [
    "College Scorecard API key not used; official earnings and UGDS from the June 2026 Most Recent Institution file (collegescorecard.ed.gov/data) for the 52 added schools. The original 16 keep their College Transitions Dec 2025 Scorecard compilation figures (same Scorecard median, earlier compile).",
    "Knight-Newhouse custom reports / bulk download require a form + CAPTCHA; new public schools use conference 990 floors or cited school 990 lines plus desk-estimated tickets/sponsorships/contributions.",
    "USA TODAY Sports football (Oct 8, 2025) and men's basketball (Apr 8, 2026) salary tables used for coach pay/buyouts. Blank private-school cells stay pending.",
    "Private schools have structural revenue gaps (tickets/sponsorships/contributions pending).",
    "Most NIL bands are pending — only Louisville (FOIA) and Kentucky (counsel statement) are booked. No On3 / Opendorse / NIL Go.",
    "CollegeFootballData /teams requires an API key we do not have; logos pulled from Wikimedia Commons then ESPN public NCAA marks, saved locally.",
]
data["meta"]["sourcesIndex"].update({
    "scorecard_data": SRC["scorecard_data"],
    "usat_b12": SRC["usat_b12"],
})
data["meta"]["conferenceFloorsFY2025"]["ACC"]["note"] = "Clemson high $55.13M; Cal $22.99M, Stanford $19.56M, SMU $17.07M partial shares"
data["meta"]["conferenceFloorsFY2025"]["Big 12"]["note"] = "Arizona State high $43.0M; BYU $23.11M, Cincinnati $20.21M, UCF $19.98M half-shares; Houston estimated ~$20M half-share"
data["meta"]["conferenceFloorsFY2025"]["Big Ten"]["note"] = "Oregon $48.4M, Washington $46.7M half-shares; UCLA/USC listed as full $76M; Penn State $88.9M, Indiana $81.0M, Ohio State $91.6M"

# sort by conference then name for a stable file
order = {"SEC": 0, "Big Ten": 1, "ACC": 2, "Big 12": 3, "Independent / ACC": 4}
data["schools"].sort(key=lambda s: (order.get(s["conference"], 9), s["name"]))

out_txt = json.dumps(data, indent=2)
(ROOT / "data" / "schools.json").write_text(out_txt)
(ROOT / "public" / "data").mkdir(parents=True, exist_ok=True)
(ROOT / "public" / "data" / "schools.json").write_text(out_txt)
ids = [s["id"] for s in data["schools"]]
print("schools", len(ids))
print("new", len(NEW))
print("missing from 68 expected?", )
expected = {
    "alabama","arkansas","auburn","florida","georgia","kentucky","lsu","mississippi-state","missouri","oklahoma","ole-miss","south-carolina","tennessee","texas","texas-am","vanderbilt",
    "illinois","indiana","iowa","maryland","michigan","michigan-state","minnesota","nebraska","northwestern","ohio-state","oregon","penn-state","purdue","rutgers","ucla","usc","washington","wisconsin",
    "boston-college","california","clemson","duke","florida-state","georgia-tech","louisville","miami","nc-state","north-carolina","pittsburgh","smu","stanford","syracuse","virginia","virginia-tech","wake-forest",
    "arizona","arizona-state","baylor","byu","cincinnati","colorado","houston","iowa-state","kansas","kansas-state","oklahoma-state","tcu","texas-tech","ucf","utah","west-virginia",
    "notre-dame",
}
print("missing", sorted(expected - set(ids)))
print("extra", sorted(set(ids) - expected))
