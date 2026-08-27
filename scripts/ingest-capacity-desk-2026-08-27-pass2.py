#!/usr/bin/env python3
"""Second-pass 2026-08-27 Public Cap hunt.

Cited dollars + URLs only. Does not invent AAV splits or unsigned steps.
Does not overwrite House booked cells, collective990, studentFees, or a
newer AD cite. Does not stamp USA TODAY 2025-10-08 onto 2026 HC cells.
Does not flip Shane Beamer. Does not book Venables from ESPN/CBS AAV.
Leaves privates and Pitt fees empty. Does not apply a Babcock cite to
Brian White. Kentucky Item 44 $0 stays unbooked so the 2024 overlay does
not treat FY2025 $0 as the House-window cell.
"""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data"
PUB = ROOT / "public" / "data"

BOOKED_MUST = {
    "louisville": 32_900_000,
    "kentucky": 18_000_000,
    "ucla": 20_500_000,
    "california": 20_500_000,
    "texas": 13_500_000,
}

CHAIR = "Chair of record who started football 2026 (Wikipedia season-page infobox)."

FOX_NEFF = "https://www.foxcarolina.com/2025/10/17/trustees-approve-new-contract-clemson-athletics-director/"
NO_CORRIGAN = "https://www.newsobserver.com/sports/college/acc/unc/article285539222.html"
NCSU_CORRIGAN = "https://news.ncsu.edu/2024/02/board-of-trustees-approves-new-contract-for-corrigan/"
USAT_HEIRD = "https://www.usatoday.com/story/sports/college/louisville/2024/12/13/louisville-athletics-josh-heird-contract-acc-comparison/76411626007/"
TUCSON_DRF = "https://tucson.com/sports/college/basketball/wildcats/men/pascoe/article_befde8a8-d1d1-11ee-872f-671abbbc6198.html"
HOKIE_WHITE = "https://hokiesports.com/news/2026/06/22/brian-white-named-virginia-techs-vice-president-and-director-of-athletics"
TS_WHITE = "https://virginiatech.sportswar.com/article/2026/06/24/brian-whites-contract-details/"
GT_ALPERT = "https://news.gatech.edu/news/2025/07/08/georgia-tech-names-ryan-alpert-director-athletics"
PITT_NOTES = "https://pittsburghpanthers.com/documents/download/2026/4/9/Pitt_2026_Game_Notes_-_Cal.pdf"
TRIB_DRINK = "https://www.columbiatribune.com/story/sports/college/tiger-extra/2025/12/08/salary-buyout-bonus-details-on-eli-drinkwitzs-new-missouri-contract/87670786007/"
MIZZ_PDF = "https://mutigers.com/documents/2025/12/8/Eli_Drinkwitz_Second_Restated_and_Amended_Employment_Contract.pdf"
AJC_KEY = "https://www.ajc.com/sports/2025/12/more-details-of-brent-keys-contract/"
SPORTICO_SMITH = "https://www.sportico.com/leagues/college-sports/2025/maryland-ad-jim-smith-contract-revenue-1234862152/"
AFP_WILLIAMS = "https://augustafreepress.com/news/the-whole-story-uva-ad-carla-williams-quietly-signed-a-five-year-extension-last-month/"
CAL_COAD = "https://calbears.com/news/2025/7/2/athletics-news-larson-simon-o-neill-start-tenure-as-co-athletic-directors.aspx"
UNC_NEWMARK = "https://goheels.com/staff-directory/steve-newmark/3858"
ARK_MFRS = "https://arkansasrazorbacks.com/pdf/athletics/ncaa-membership/2024-25.pdf"


def dump_json(path: Path, data, *, ascii_ok: bool) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=ascii_ok) + "\n")


def money(value, source, url, as_of, notes, year=None, extra=None):
    out = {
        "value": value,
        "confidence": "reported",
        "source": source,
        "url": url,
        "asOf": as_of,
        "notes": notes,
    }
    if year is not None:
        out["year"] = year
    if extra:
        out.update(extra)
    return out


def pending_buyout(source, url, notes):
    return {
        "value": None,
        "confidence": "pending",
        "source": source,
        "url": url,
        "asOf": None,
        "notes": notes,
    }


def wiki_term(url, through, years, extra, as_of="2026-08"):
    return {
        "confidence": "reported",
        "asOf": as_of,
        "source": "Wikipedia season-page infobox",
        "url": url,
        "through": through,
        "yearsRemaining": years,
        "notes": f"{CHAIR} {extra}",
    }


def article_term(source, url, through, years, notes, as_of):
    return {
        "confidence": "reported",
        "source": source,
        "url": url,
        "asOf": as_of,
        "through": through,
        "yearsRemaining": years,
        "notes": notes,
    }


def apply_ad(school, *, name=None, name_source=None, name_url=None, pay=None):
    staff = school.setdefault("staff", {})
    ad = staff.get("athleticDirector") or {}
    if name:
        ad["name"] = name
        ad["confidence"] = "reported"
        ad["asOf"] = "2026-08"
        if name_source:
            ad["source"] = name_source
        if name_url:
            ad["url"] = name_url
        ad["notes"] = (
            "Current athletics-director chair as of the 2026-08-27 desk. "
            "Pay is year-pinned on staff.athleticDirector.pay."
            if pay is not None
            else "Current athletics-director chair as of the 2026-08-27 desk. Pay pending a cited dollar."
        )
    if pay is not None:
        existing = ad.get("pay") if isinstance(ad.get("pay"), dict) else {}
        if existing.get("value") is not None:
            raise SystemExit(f"refusing to overwrite AD pay for {school['id']}: {existing}")
        ad["pay"] = pay
    staff["athleticDirector"] = ad
    by = school.get("staffByYear") or {}
    year_2026 = by.get("2026")
    if isinstance(year_2026, dict):
        year_2026["athleticDirector"] = deepcopy(ad)
        by["2026"] = year_2026
        school["staffByYear"] = by


def apply_2026_hc(school, spec):
    year_fb = school["coachesByYear"]["2026"]["football"]
    if year_fb["pay"].get("value") is not None:
        print(f"skip already-filled 2026 HC {school['id']}={year_fb['pay']['value']}")
        return
    year_pay = deepcopy(spec["pay"])
    year_pay["notes"] = f"{CHAIR} {spec['pay']['notes']}"
    year_fb["pay"] = year_pay
    year_fb["buyout"] = deepcopy(spec["buyout"])
    year_fb["term"] = deepcopy(spec["year_term"])
    if spec.get("contractUrl"):
        year_fb["contractUrl"] = spec["contractUrl"]
    if spec.get("contract"):
        existing = year_fb.get("contract") if isinstance(year_fb.get("contract"), dict) else {}
        merged = deepcopy(spec["contract"])
        if existing.get("files") and not merged.get("files"):
            merged["files"] = existing["files"]
        year_fb["contract"] = merged

    current = school["coaches"]["football"]
    current["pay"] = deepcopy(spec["pay"])
    current["buyout"] = deepcopy(spec["buyout"])
    current["term"] = deepcopy(spec["current_term"])
    if spec.get("contractUrl"):
        current["contractUrl"] = spec["contractUrl"]
    if spec.get("contract"):
        existing = current.get("contract") if isinstance(current.get("contract"), dict) else {}
        merged = deepcopy(spec["contract"])
        if existing.get("files") and not merged.get("files"):
            merged["files"] = existing["files"]
        current["contract"] = merged


def main() -> None:
    schools_doc = json.loads((SRC / "schools.json").read_text())
    tape_doc = json.loads((SRC / "tape.json").read_text())
    cites_doc = json.loads((ROOT / "scripts" / "ad-cites.json").read_text())
    by_id = {s["id"]: s for s in schools_doc["schools"]}

    for sid, expected in BOOKED_MUST.items():
        if by_id[sid]["nil"]["booked"]["value"] != expected:
            raise SystemExit(f"refusing: {sid} booked drifted")
    if by_id["pittsburgh"]["capacity"].get("studentFees", {}).get("value") is not None:
        raise SystemExit("Pitt student fees must stay empty")
    if by_id["south-carolina"]["coachesByYear"]["2026"]["football"]["pay"].get("value") is not None:
        raise SystemExit("refusing to flip Beamer 2026")
    if by_id["oklahoma"]["staff"]["athleticDirector"].get("name") != "Roger Denny":
        raise SystemExit("Oklahoma chair is not Denny")
    if (by_id["kentucky"].get("nil") or {}).get("preCap", {}).get("value") is not None:
        raise SystemExit("Kentucky preCap must stay empty — 2024 overlay / House-window guardrail")

    # --- A) AD name + pay ---
    apply_ad(
        by_id["clemson"],
        name="Graham Neff",
        name_source="Clemson Board of Trustees Compensation Committee / FOX Carolina",
        name_url=FOX_NEFF,
        pay=money(
            1_350_000,
            "FOX Carolina (Oct. 17, 2025), quoting Clemson Board of Trustees Compensation Committee terms",
            FOX_NEFF,
            "2025-10-17",
            "Board table: July 1, 2026 total $1,350,000 ($1,100,000 base + supplemental + $250,000 deferred). Bonuses (max $250k) not added.",
            year=2026,
            extra={
                "breakdown": [
                    {"label": "Base + supplemental (July 1, 2026)", "value": 1_100_000},
                    {"label": "Deferred / licensing (July 1, 2026)", "value": 250_000},
                ]
            },
        ),
    )
    apply_ad(
        by_id["nc-state"],
        name="Boo Corrigan",
        name_source="NC State Board of Trustees / NC State News",
        name_url=NCSU_CORRIGAN,
        pay=money(
            1_563_125,
            "News & Observer (Feb. 16, 2024), quoting Corrigan agreement via public records",
            NO_CORRIGAN,
            "2024-02-16",
            "FOIA: base $713,125 + $700,000 supplemental at signing. Base +$50,000 each July 1 the contract remains in force (through June 2029). 2026-27 step is $863,125 + $700,000 = $1,563,125. Performance bonuses (up to $300k) not added. Official NCSU release confirms the chair through June 2029.",
            year=2026,
            extra={
                "breakdown": [
                    {"label": "Base (July 1, 2026 step)", "value": 863_125},
                    {"label": "Supplemental (fundraising / media / NIL / apparel)", "value": 700_000},
                ]
            },
        ),
    )
    apply_ad(
        by_id["louisville"],
        name="Josh Heird",
        name_source="University of Louisville Board of Trustees / Courier-Journal (USA TODAY Network)",
        name_url=USAT_HEIRD,
        pay=money(
            925_000,
            "Courier-Journal / USA TODAY (Dec. 13, 2024) — Board of Trustees extension",
            USAT_HEIRD,
            "2024-12-13",
            "Board extension through 2030, new five-year term beginning Jan. 1: base remains $850,000 plus $75,000 supplemental. Same person as the 2026 chair. Incentives not added. Year-pinned to the 2025 term start.",
            year=2025,
            extra={
                "breakdown": [
                    {"label": "Base", "value": 850_000},
                    {"label": "Supplemental", "value": 75_000},
                ]
            },
        ),
    )
    apply_ad(
        by_id["arizona"],
        pay=money(
            1_350_000,
            "Arizona Daily Star / tucson.com, quoting Arizona Board of Regents approval of Reed-Francois contract",
            TUCSON_DRF,
            "2024-02-22",
            "Board: $1.25 million through March 2025, then +$50,000 annually through 2028-29 (five-year package $6.75 million). 2026-27 step is $1,350,000. UA Foundation $250k slice is inside that salary, not added again. Incentives not added.",
            year=2026,
        ),
    )
    apply_ad(
        by_id["virginia-tech"],
        name="Brian White",
        name_source="Virginia Tech Athletics — official appointment (June 22, 2026)",
        name_url=HOKIE_WHITE,
        pay=money(
            1_600_000,
            "TechSideline (June 24, 2026), quoting contract terms issued to the press at White’s introduction",
            TS_WHITE,
            "2026-06-24",
            "Issued terms: 2026-27 total $1.6 million ($500,000 base + $1,100,000 supplemental) through June 30, 2031. Whit Babcock retired June 2026 — his pay is not reused. Performance bonuses not added.",
            year=2026,
            extra={
                "breakdown": [
                    {"label": "Base (2026-27)", "value": 500_000},
                    {"label": "Supplemental (2026-27)", "value": 1_100_000},
                ]
            },
        ),
    )
    apply_ad(
        by_id["georgia-tech"],
        name="Ryan Alpert",
        name_source="Georgia Tech News Center — official appointment (July 8, 2025)",
        name_url=GT_ALPERT,
    )
    apply_ad(
        by_id["pittsburgh"],
        name="Allen Greene",
        name_source="Pitt Athletics official 2026 game notes (April 9, 2026)",
        name_url=PITT_NOTES,
    )
    apply_ad(
        by_id["maryland"],
        name="James E. Smith",
        name_source="University of Maryland Office of the President — official appointment",
        name_url="https://president.umd.edu/news/welcoming-james-e-smith-to-lead-maryland-athletics",
        pay=money(
            1_500_000,
            "Sportico, quoting Smith employment agreement obtained by the newsroom",
            SPORTICO_SMITH,
            "2025-07-16",
            "Obtained EA: $1.5 million annually in base compensation ($1.2M base + $300k supplemental in contemporaneous open-records writeups). Five-year term through June 30, 2030. Revenue-growth and $45k performance incentives not added. Same person as the 2026 chair.",
            year=2025,
            extra={
                "breakdown": [
                    {"label": "Base", "value": 1_200_000},
                    {"label": "Supplemental / media / NIL", "value": 300_000},
                ]
            },
        ),
    )
    apply_ad(
        by_id["virginia"],
        name="Carla Williams",
        name_source="Virginia Athletics official (Aug. 25, 2026 message) / UVA Board of Visitors org chart",
        name_url="https://virginiasports.com/news/2026/08/25/a-message-from-director-of-athletics-carla-williams",
        pay=money(
            1_405_470,
            "Augusta Free Press (Jan. 16, 2025), quoting Williams Dec. 18, 2024 extension obtained via UVA FOIA",
            AFP_WILLIAMS,
            "2025-01-16",
            "FOIA extension signed Dec. 18, 2024 through May 31, 2030: $1,405,470 annually. $300,000 performance bonus and bowl / Directors' Cup percentages not added. Same person as the 2026 chair.",
            year=2025,
        ),
    )
    apply_ad(
        by_id["california"],
        name="Jay Larson and Jenny Simon-O'Neill",
        name_source="Cal Athletics official — co-directors of athletics (July 2, 2025)",
        name_url=CAL_COAD,
    )
    apply_ad(
        by_id["north-carolina"],
        name="Steve Newmark",
        name_source="UNC Athletics official staff directory — Director of Athletics (effective July 1, 2026)",
        name_url=UNC_NEWMARK,
    )

    # --- B) Arkansas FY2025 Item 44 ---
    ark_nil = by_id["arkansas"]["nil"]
    if ark_nil.get("preCap") and ark_nil["preCap"].get("value") is not None:
        raise SystemExit("Arkansas preCap already booked")
    ark_nil["preCap"] = {
        "value": 0,
        "confidence": "reported",
        "source": "Arkansas FY2025 NCAA Membership Financial Report — Item 44 Institutional NIL Revenue Share $0",
        "url": ARK_MFRS,
        "asOf": "2026-01",
        "fiscalYear": "FY2025",
        "notes": (
            "Hosted MFRS PDF at arkansasrazorbacks.com prints Item 44 as $0 for Reporting Year (FY) 2025 "
            "(pre-House, year ended Jun 30 2025). Booked $0 because the report shows $0 — not an invented blank. "
            "Does not count against the 2025-26 House cap. Does not replace a House Year 1 spent total."
        ),
    }

    # --- C) 2026 HC ---
    apply_2026_hc(
        by_id["missouri"],
        {
            "pay": money(
                10_250_000,
                "Columbia Daily Tribune (Dec. 8, 2025), quoting Drinkwitz restated EA year table after the file posted on mutigers.com",
                TRIB_DRINK,
                "2025-12-08",
                "Tribune year table from the Dec. 8, 2025 restated EA: 2026 total pay $10.25 million (then $10.45 / $10.65 / $10.85 / $11.05 / $11.25 million through 2031). Not the USA TODAY 2025-10-08 $9.0M cell and not the $10.75M AAV-only school release. Incentives (up to $2M) not added.",
                year=2026,
            ),
            "buyout": money(
                44_425_000,
                "Columbia Daily Tribune (Dec. 8, 2025), quoting the restated EA remaining-payment table",
                TRIB_DRINK,
                "2025-12-08",
                "School-side without-cause remaining if fired in 2026: $44,425,000 (80% of remaining pay). Later-year remaining figures are not minted as a staircase on this cell.",
                extra={"rule": "80% remaining Base + Non-Salary + Publicity Rights, with a duty to mitigate."},
            ),
            "year_term": wiki_term(
                "https://en.wikipedia.org/wiki/2026_Missouri_Tigers_football_team",
                "2032",
                6,
                "Restated EA through Jan. 15, 2032. Tribune quotes the year table from that file.",
            ),
            "current_term": article_term(
                "Columbia Daily Tribune (Dec. 8, 2025), quoting Drinkwitz restated EA",
                TRIB_DRINK,
                "2032",
                6,
                "Second Restated and Amended EA through Jan. 15, 2032. 2026 pay is the published $10.25 million year cell.",
                "2025-12-08",
            ),
            "contractUrl": MIZZ_PDF,
            "contract": {
                "label": "Missouri Drinkwitz Second Restated and Amended EA (Dec. 8, 2025)",
                "url": MIZZ_PDF,
            },
        },
    )
    apply_2026_hc(
        by_id["georgia-tech"],
        {
            "pay": money(
                6_500_000,
                "Atlanta Journal-Constitution (Dec. 5, 2025), quoting Key contract details obtained by the AJC",
                AJC_KEY,
                "2025-12-05",
                "AJC obtained the extension: new annual base compensation $6.5 million. Not the USA TODAY 2025-10-08 $4.5M cell. Win / CFP / ACC bonuses and automatic-extension escalators are not added.",
                year=2026,
            ),
            "buyout": pending_buyout(
                "Atlanta Journal-Constitution (Dec. 5, 2025), quoting Key contract",
                AJC_KEY,
                "School-side without-cause is 75% of unpaid compensation through the remaining term, including earned automatic extensions. We do not invent the remainder.",
            ),
            "year_term": wiki_term(
                "https://en.wikipedia.org/wiki/2026_Georgia_Tech_Yellow_Jackets_football_team",
                "2030",
                4,
                "AJC: coach-side liquidated damages schedule runs through December 2030.",
            ),
            "current_term": article_term(
                "Atlanta Journal-Constitution (Dec. 5, 2025), quoting Key contract",
                AJC_KEY,
                "2030",
                4,
                "Extension signed December 2025. AJC buyout schedule through December 2030. 2026 pay is the published $6.5 million base.",
                "2025-12-05",
            ),
            "contractUrl": AJC_KEY,
            "contract": {
                "label": "Atlanta Journal-Constitution — Key extension details via open records",
                "url": AJC_KEY,
            },
        },
    )

    new_items = [
        {
            "id": "missouri-contract-drinkwitz-2025-12-08",
            "date": "2025-12-08",
            "school": "missouri",
            "schoolName": "Missouri",
            "kind": "contract",
            "headline": "Columbia Daily Tribune quotes Drinkwitz’s restated EA year table: $10.25 million in 2026. Not the USA TODAY 2025-10-08 cell.",
            "figure": 10_250_000,
            "confidence": "reported",
            "source": {"label": "Columbia Daily Tribune — Drinkwitz restated EA year table", "url": TRIB_DRINK},
            "field": "coaches.football.pay",
        },
        {
            "id": "georgia-tech-contract-key-2025-12-05",
            "date": "2025-12-05",
            "school": "georgia-tech",
            "schoolName": "Georgia Tech",
            "kind": "contract",
            "headline": "AJC obtained Brent Key’s extension: $6.5 million annual base. Not the USA TODAY 2025-10-08 cell.",
            "figure": 6_500_000,
            "confidence": "reported",
            "source": {"label": "Atlanta Journal-Constitution — Key contract details", "url": AJC_KEY},
            "field": "coaches.football.pay",
        },
        {
            "id": "arkansas-precap-item44-fy2025",
            "date": "2026-01",
            "school": "arkansas",
            "schoolName": "Arkansas",
            "kind": "filing",
            "headline": "Arkansas FY2025 NCAA Membership Financial Report Item 44 Institutional NIL Revenue Share is $0.",
            "figure": 0,
            "confidence": "reported",
            "source": {"label": "Arkansas FY2025 NCAA MFRS PDF", "url": ARK_MFRS},
            "field": "nil.preCap",
        },
    ]
    existing_ids = {it["id"] for it in tape_doc["items"]}
    add = [it for it in new_items if it["id"] not in existing_ids]
    tape_doc["items"] = add + tape_doc["items"]
    tape_doc["meta"]["itemCount"] = len(tape_doc["items"])

    new_cites = [
        {
            "id": "clemson",
            "name": "Graham Neff",
            "pay": 1_350_000,
            "year": 2026,
            "asOf": "2025-10-17",
            "source": "FOX Carolina — Clemson Board of Trustees Compensation Committee",
            "url": FOX_NEFF,
            "notes": "July 1, 2026 total $1.35M ($1.1M + $250k deferred).",
            "confidence": "reported",
        },
        {
            "id": "nc-state",
            "name": "Boo Corrigan",
            "pay": 1_563_125,
            "year": 2026,
            "asOf": "2024-02-16",
            "source": "News & Observer, quoting Corrigan FOIA agreement",
            "url": NO_CORRIGAN,
            "notes": "2026-27 step from published +$50k July 1 schedule on the Feb. 2024 FOIA base + $700k supplemental.",
            "confidence": "reported",
        },
        {
            "id": "louisville",
            "name": "Josh Heird",
            "pay": 925_000,
            "year": 2025,
            "asOf": "2024-12-13",
            "source": "Courier-Journal / USA TODAY — Board of Trustees extension",
            "url": USAT_HEIRD,
            "notes": "$850k base + $75k supplemental on the Jan. 1, 2025 term through 2030.",
            "confidence": "reported",
        },
        {
            "id": "arizona",
            "name": "Desiree Reed-Francois",
            "pay": 1_350_000,
            "year": 2026,
            "asOf": "2024-02-22",
            "source": "Arizona Daily Star — Board of Regents schedule",
            "url": TUCSON_DRF,
            "notes": "$1.25M through March 2025 + $50k annual; 2026-27 is $1.35M.",
            "confidence": "reported",
        },
        {
            "id": "virginia-tech",
            "name": "Brian White",
            "pay": 1_600_000,
            "year": 2026,
            "asOf": "2026-06-24",
            "source": "TechSideline, quoting issued White contract terms; official VT appointment",
            "url": TS_WHITE,
            "notes": "2026-27 $1.6M. Babcock retired — not reused.",
            "confidence": "reported",
        },
        {
            "id": "maryland",
            "name": "James E. Smith",
            "pay": 1_500_000,
            "year": 2025,
            "asOf": "2025-07-16",
            "source": "Sportico, quoting Smith employment agreement",
            "url": SPORTICO_SMITH,
            "notes": "$1.5M annual ($1.2M + $300k supplemental). Incentives not added.",
            "confidence": "reported",
        },
        {
            "id": "virginia",
            "name": "Carla Williams",
            "pay": 1_405_470,
            "year": 2025,
            "asOf": "2025-01-16",
            "source": "Augusta Free Press — UVA FOIA Williams extension",
            "url": AFP_WILLIAMS,
            "notes": "FOIA: $1,405,470 annually through May 31, 2030. Performance bonus not added.",
            "confidence": "reported",
        },
    ]
    have = {(c["id"], c.get("name"), c.get("year")) for c in cites_doc["cites"]}
    for row in new_cites:
        key = (row["id"], row["name"], row["year"])
        if key not in have:
            cites_doc["cites"].append(row)

    if by_id["clemson"]["staff"]["athleticDirector"]["pay"]["value"] != 1_350_000:
        raise SystemExit("Clemson AD miss")
    if by_id["nc-state"]["staff"]["athleticDirector"]["pay"]["value"] != 1_563_125:
        raise SystemExit("NC State AD miss")
    if by_id["louisville"]["staff"]["athleticDirector"]["pay"]["value"] != 925_000:
        raise SystemExit("Louisville AD miss")
    if by_id["arizona"]["staff"]["athleticDirector"]["pay"]["value"] != 1_350_000:
        raise SystemExit("Arizona AD miss")
    if by_id["virginia-tech"]["staff"]["athleticDirector"]["name"] != "Brian White":
        raise SystemExit("VT AD name not White")
    if by_id["virginia-tech"]["staff"]["athleticDirector"]["pay"]["value"] != 1_600_000:
        raise SystemExit("VT AD pay miss")
    if by_id["georgia-tech"]["staff"]["athleticDirector"]["name"] != "Ryan Alpert":
        raise SystemExit("GT AD name miss")
    if (by_id["georgia-tech"]["staff"]["athleticDirector"].get("pay") or {}).get("value") is not None:
        raise SystemExit("GT AD pay invented")
    if by_id["pittsburgh"]["staff"]["athleticDirector"]["name"] != "Allen Greene":
        raise SystemExit("Pitt AD name miss")
    if (by_id["pittsburgh"]["staff"]["athleticDirector"].get("pay") or {}).get("value") is not None:
        raise SystemExit("Pitt AD pay invented")
    if by_id["maryland"]["staff"]["athleticDirector"]["pay"]["value"] != 1_500_000:
        raise SystemExit("Maryland AD miss")
    if by_id["virginia"]["staff"]["athleticDirector"]["name"] != "Carla Williams":
        raise SystemExit("UVA AD name miss")
    if by_id["virginia"]["staff"]["athleticDirector"]["pay"]["value"] != 1_405_470:
        raise SystemExit("UVA AD pay miss")
    if by_id["california"]["staff"]["athleticDirector"]["name"] != "Jay Larson and Jenny Simon-O'Neill":
        raise SystemExit("Cal AD name miss")
    if (by_id["california"]["staff"]["athleticDirector"].get("pay") or {}).get("value") is not None:
        raise SystemExit("Cal AD pay invented")
    if by_id["north-carolina"]["staff"]["athleticDirector"]["name"] != "Steve Newmark":
        raise SystemExit("UNC AD name miss")
    if (by_id["north-carolina"]["staff"]["athleticDirector"].get("pay") or {}).get("value") is not None:
        raise SystemExit("UNC AD pay invented")
    if by_id["arkansas"]["nil"]["preCap"]["value"] != 0:
        raise SystemExit("Arkansas Item 44 miss")
    if by_id["missouri"]["coachesByYear"]["2026"]["football"]["pay"]["value"] != 10_250_000:
        raise SystemExit("Drinkwitz 2026 miss")
    if by_id["texas"]["coachesByYear"]["2026"]["football"]["pay"]["value"] != 11_050_000:
        raise SystemExit("Sarkisian 2026 miss")
    if by_id["georgia-tech"]["coachesByYear"]["2026"]["football"]["pay"]["value"] != 6_500_000:
        raise SystemExit("Key 2026 miss")
    if by_id["south-carolina"]["coachesByYear"]["2026"]["football"]["pay"].get("value") is not None:
        raise SystemExit("Beamer flipped")
    if (by_id["kentucky"].get("nil") or {}).get("preCap", {}).get("value") is not None:
        raise SystemExit("Kentucky preCap filled")
    if by_id["louisville"]["nil"]["booked"]["value"] != 32_900_000:
        raise SystemExit("Louisville booked drifted")
    if any(
        s.get("private") and (s.get("staff") or {}).get("athleticDirector", {}).get("pay", {}).get("value")
        for s in schools_doc["schools"]
    ):
        raise SystemExit("private AD pay filled")

    staff_ads = {
        "clemson": "Graham Neff",
        "nc-state": "Boo Corrigan",
        "louisville": "Josh Heird",
        "georgia-tech": "Ryan Alpert",
        "pittsburgh": "Allen Greene",
        "virginia-tech": "Brian White",
        "california": "Jay Larson and Jenny Simon-O'Neill",
        "north-carolina": "Steve Newmark",
        "virginia": "Carla Williams",
        "maryland": "James E. Smith",
    }
    for staff_path in (ROOT / "scripts" / "staff-2026.json", ROOT / "scripts" / "staff-2026-acc-sec.json"):
        staff_doc = json.loads(staff_path.read_text())
        for sid, name in staff_ads.items():
            if sid in staff_doc:
                staff_doc[sid]["ad"] = name
        dump_json(staff_path, staff_doc, ascii_ok=False)

    dump_json(SRC / "schools.json", schools_doc, ascii_ok=False)
    dump_json(PUB / "schools.json", schools_doc, ascii_ok=False)
    dump_json(SRC / "tape.json", tape_doc, ascii_ok=True)
    dump_json(PUB / "tape.json", tape_doc, ascii_ok=True)
    dump_json(ROOT / "scripts" / "ad-cites.json", cites_doc, ascii_ok=False)
    print("ingested pass-2 AD / 2026 HC / Arkansas Item 44")


if __name__ == "__main__":
    main()
