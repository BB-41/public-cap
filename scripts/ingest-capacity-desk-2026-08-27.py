#!/usr/bin/env python3
"""Ingest 2026-08-27 Public Cap capacity-desk hunt.

Cited dollars + URLs only. Does not invent AAV splits. Does not overwrite
House booked cells, collective990, studentFees, or a newer AD cite.
Does not stamp USA TODAY 2025-10-08 onto coachesByYear.2026.
Does not apply a Castiglione cite to Roger Denny.
Does not flip Shane Beamer. Leaves privates and Pitt fees empty.
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

CJ_BATT = (
    "https://www.courier-journal.com/story/sports/college/kentucky/2026/06/17/"
    "j-batt-contract-kentucky-athletics-director-uk-wildcats-term-sheet-champions-blue-ceo/"
    "90596720007/"
)
NEWSSTAR_AUS = (
    "https://www.thenewsstar.com/story/sports/college/lsu/2026/04/22/"
    "verge-ausberry-contract-lsu-ad-lsu-football-lane-kiffin/89738501007/"
)
OKLA_DENNY = (
    "https://www.oklahoman.com/story/sports/college/sooners/2026/01/30/"
    "ou-board-of-regents-approves-contracts-jason-witten-roger-denny-sooners/88434348007/"
)
CL_SELMON = (
    "https://www.clarionledger.com/story/sports/college/mississippi-state/2025/05/14/"
    "zac-selmon-contract-mississippi-state-athletic-director/83607124007/"
)
LAT_JARMOND = "https://www.latimes.com/sports/ucla/story/2024-12-10/ucla-jarmond-contract"
ST_CHUN = (
    "https://www.seattletimes.com/sports/washington-huskies-football/"
    "new-uw-ad-pat-chun-we-will-not-take-a-back-seat-to-anyone/"
)
JS_EICH = (
    "https://www.jsonline.com/story/sports/college/uw/2026/07/13/"
    "wisconsin-badgers-ad-shawn-eichorst-contract-salary-information/90905999007/"
)
AP_DONATI = (
    "https://apnews.com/article/south-carolina-athletic-director-donati-"
    "a976698910d4657cc0a6bf00e4ff797e"
)
ADG_YUR = (
    "https://www.arkansasonline.com/news/2022/oct/31/"
    "arkansas-ad-yurachek-reportedly-turned-down-auburn-job/"
)
ADV_COHEN = (
    "https://www.montgomeryadvertiser.com/story/sports/college/auburn/2023/06/01/"
    "john-cohen-auburn-athletics-director-contract-buyout-compensation/70257983007/"
)
CJ_TAYLOR = (
    "https://www.cjonline.com/story/sports/college/cat-zone/2026/05/26/"
    "gene-taylor-kansas-state-ad-atheltic-director-retirement-plans-coaches/90065135007/"
)
DES_HARLAN = (
    "https://www.deseret.com/2023/6/15/23762164/"
    "utah-utes-ad-mark-harlans-contract-extension-through-2028-includes-significant-raise-hefty-buyout/"
)
OM_MFRS = "https://olemisssports.com/documents/download/2026/1/15/NCAAReport_FY25.pdf"
UGA_SAL = (
    "https://www.onlineathens.com/story/sports/college/bulldogs-extra/2026/08/10/"
    "georgia-athletic-salaries-georgia-football-kirby-smart-josh-brooks/91115029007/"
)
UGA_SMART = (
    "https://georgiadogs.com/news/2024/5/2/"
    "general-uga-athletics-board-approves-contract-extensions-for-josh-brooks-and-kirby-smart"
)
KNOX_HEUPEL = (
    "https://www.knoxnews.com/story/sports/college/university-of-tennessee/football/"
    "2025/08/26/josh-heupel-contract-extension-tennessee-football-pay/85836629007/"
)
HEUPEL_A3 = "https://tennessee.edu/wp-content/uploads/2025/08/Josh-Heupel-Amendment-3-2025-30-v2.docx.pdf"
HEUPEL_A2 = "https://tennessee.edu/wp-content/uploads/2025/04/Heupel-Josh-1-2023-Amendment2.pdf"
HEUPEL_EA = "https://tennessee.edu/wp-content/uploads/2025/04/Heupel-Josh-2021-27_orig.pdf"
CL_LEBBY = (
    "https://www.clarionledger.com/story/sports/college/mississippi-state/2025/12/15/"
    "jeff-lebby-salary-mississippi-state-contract-bowl-bonus/87693965007/"
)
USAT_ORGERON = (
    "https://www.usatoday.com/story/sports/college/lsu/2026/05/21/"
    "ed-orgeron-lsu-football-contract-lane-kiffin-staff-joe-burrow/90199664007/"
)


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


def tape_item(**kwargs):
    return kwargs


def apply_ad(school, *, name=None, name_source=None, name_url=None, pay):
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
        )
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
        raise SystemExit(f"refusing to overwrite 2026 pay for {school['id']}")
    year_pay = deepcopy(spec["pay"])
    year_pay["notes"] = f"{CHAIR} {spec['pay']['notes']}"
    year_fb["pay"] = year_pay
    year_fb["buyout"] = deepcopy(spec["buyout"])
    year_fb["term"] = deepcopy(spec["year_term"])
    if spec.get("contractUrl"):
        year_fb["contractUrl"] = spec["contractUrl"]
    if spec.get("contract"):
        # Keep any already-loaded file list (Heupel).
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
    layers_doc = json.loads((PUB / "layers.json").read_text())
    tape_doc = json.loads((SRC / "tape.json").read_text())
    cites_doc = json.loads((ROOT / "scripts" / "ad-cites.json").read_text())

    by_id = {s["id"]: s for s in schools_doc["schools"]}
    for sid, expected in BOOKED_MUST.items():
        got = by_id[sid]["nil"]["booked"]["value"]
        if got != expected:
            raise SystemExit(f"refusing: {sid} booked {got} != {expected}")
    if by_id["texas"]["nil"]["preCap"]["value"] != 3_200_000:
        raise SystemExit("texas preCap drifted")
    if by_id["louisville"]["nil"]["preCap"]["value"] != 12_700_000:
        raise SystemExit("louisville preCap drifted")
    pitt_fees = by_id["pittsburgh"]["capacity"].get("studentFees") or {}
    if pitt_fees.get("value") is not None:
        raise SystemExit("Pitt student fees must stay empty")
    if by_id["south-carolina"]["coachesByYear"]["2026"]["football"]["pay"].get("value") is not None:
        raise SystemExit("refusing to flip Beamer 2026")
    if by_id["oklahoma"]["staff"]["athleticDirector"].get("name") != "Roger Denny":
        raise SystemExit("Oklahoma chair is not Denny — do not apply a Castiglione cite")

    # --- A) AD pay ---
    apply_ad(
        by_id["kentucky"],
        name="J Batt",
        name_source="University of Kentucky / Courier-Journal (USA TODAY Network)",
        name_url=CJ_BATT,
        pay=money(
            2_600_000,
            "Courier-Journal (June 17, 2026), quoting UK Office of Legal Counsel term sheet",
            CJ_BATT,
            "2026-06-17",
            "Year 1 total $2.6M ($400k base + $2.2M supplemental) on the June 2026 term sheet through June 30, 2032. Barnhart retired June 30, 2026 — his AD pay is not reused on Batt. Incentives not added.",
            year=2026,
            extra={
                "breakdown": [
                    {"label": "Base (Year 1)", "value": 400_000},
                    {"label": "Supplemental (Year 1)", "value": 2_200_000},
                ]
            },
        ),
    )
    apply_ad(
        by_id["lsu"],
        pay=money(
            1_500_000,
            "USA TODAY Network / Daily Advertiser (April 22, 2026), quoting Ausberry employment agreement",
            NEWSSTAR_AUS,
            "2026-04-22",
            "First-year guaranteed compensation $1.5 million through 2027 on the FOIA contract; Board of Supervisors approved April 23, 2026. Later-year $1.6M / $1.7M steps are not this cell. Incentives not added.",
            year=2026,
        ),
    )
    apply_ad(
        by_id["oklahoma"],
        pay=money(
            1_250_000,
            "The Oklahoman (Jan. 30, 2026) — OU Board of Regents approved Denny contract",
            OKLA_DENNY,
            "2026-01-30",
            "Board-approved annual salary $1.25 million through June 30, 2030. Joe Castiglione’s USA TODAY $2.2M snapshot is not applied to Denny.",
            year=2026,
        ),
    )
    apply_ad(
        by_id["mississippi-state"],
        pay=money(
            1_250_000,
            "Clarion Ledger (May 14, 2025), quoting Selmon extension documents",
            CL_SELMON,
            "2025-05-14",
            "Feb. 1, 2025 extension: $1.25 million this year (2025). Contract says +$25,000 each year it is continually renewed — that 2026 step is not booked unless a renewal cite appears. $100k milestone bonus left out.",
            year=2025,
        ),
    )
    apply_ad(
        by_id["ucla"],
        pay=money(
            1_800_000,
            "Los Angeles Times (Dec. 10, 2024), quoting Jarmond extension signed May 2024",
            LAT_JARMOND,
            "2024-12-10",
            "Published schedule on the July 1, 2024 extension through June 30, 2029: Year 1 $1.55M, Year 2 $1.6M, Year 3 $1.8M. 2026-27 is Year 3. Retention / signing bonus not added.",
            year=2026,
        ),
    )
    apply_ad(
        by_id["washington"],
        pay=money(
            1_500_000,
            "Seattle Times, quoting Chun memorandum of understanding (March 2024 hire)",
            ST_CHUN,
            "2024-03-28",
            "MOU: base $1.3 million July 1, 2024–June 30, 2025, then +$100,000 each year, capping at $1.7 million the final two years. 2026-27 step is $1.5 million. Bonuses not added.",
            year=2026,
        ),
    )
    apply_ad(
        by_id["wisconsin"],
        pay=money(
            1_600_000,
            "Milwaukee Journal Sentinel (July 13, 2026), quoting Eichorst contract via open records",
            JS_EICH,
            "2026-07-13",
            "Five-year deal: initial base $1.6 million for 2026-27 through June 30, 2031. $50,000 annual raises and incentives (capped $300k) are not added into this cell.",
            year=2026,
        ),
    )
    apply_ad(
        by_id["south-carolina"],
        pay=money(
            2_000_000,
            "AP News, quoting South Carolina Board of Trustees approval of Donati contract",
            AP_DONATI,
            "2024-12-05",
            "Board: $1.9 million first year beginning Jan. 2, 2025, plus a $100,000 increase each subsequent year. 2026 calendar year is $2.0 million. Incentives (up to $400k) not added.",
            year=2026,
        ),
    )
    apply_ad(
        by_id["arkansas"],
        pay=money(
            1_500_000,
            "Arkansas Democrat-Gazette (Oct. 31, 2022), quoting FOIA amended contract",
            ADG_YUR,
            "2022-10-31",
            "FOIA: salary increased to $1.5 million beginning January 2023 through Dec. 31, 2027. Same person as the 2026 chair. $250k deferred and performance bonuses are not added. Year-pinned to 2023 when the $1.5M step began.",
            year=2023,
        ),
    )
    apply_ad(
        by_id["auburn"],
        pay=money(
            1_500_000,
            "Montgomery Advertiser (June 1, 2023), quoting Cohen employment agreement via records",
            ADV_COHEN,
            "2023-06-01",
            "Starting compensation $1.5 million in the first year (includes $100k Oct. 31 retention). Same person as the 2026 chair. The May 2024 addendum extended the term through October 2029 and did not republish a new dollar — this cell stays year-pinned to the 2023 FOIA snapshot. We do not invent the $25k Nov. 1 steps.",
            year=2023,
        ),
    )
    apply_ad(
        by_id["kansas-state"],
        pay=money(
            925_000,
            "Topeka Capital-Journal (May 26, 2026), quoting Taylor’s current contract",
            CJ_TAYLOR,
            "2026-05-26",
            "USA TODAY Network: $925,000 base through June 2030. Retention bonuses ($250k this year / $500k later) are not added into this cell.",
            year=2026,
        ),
    )
    apply_ad(
        by_id["utah"],
        pay=money(
            1_000_000,
            "Deseret News (June 15, 2023), quoting Harlan extension via public records",
            DES_HARLAN,
            "2023-06-15",
            "FOIA schedule: base $850,000 on July 1, 2023, then +$50,000 each year through June 30, 2027. 2026-27 step is $1,000,000. July 1, 2027 jumps to $1.1M and is not this cell. Retention / performance bonuses not added.",
            year=2026,
        ),
    )

    # --- B) Ole Miss FY2025 Item 44 ---
    om_nil = by_id["ole-miss"]["nil"]
    if om_nil.get("preCap") and om_nil["preCap"].get("value") is not None:
        raise SystemExit("Ole Miss preCap already booked")
    om_nil["preCap"] = {
        "value": 0,
        "confidence": "reported",
        "source": "Ole Miss FY2025 NCAA Membership Financial Report — Item 44 Institutional NIL Revenue Share $0",
        "url": OM_MFRS,
        "asOf": "2026-01-15",
        "fiscalYear": "FY2025",
        "notes": (
            "Hosted MFRS PDF pages 16 / 74 / 93 print Item 44 as $0 (pre-House, year ended Jun 30 2025). "
            "Booked $0 because the report shows $0 — not an invented blank. Does not count against the "
            "2025-26 House cap. Does not replace a House Year 1 spent total."
        ),
    }

    # --- C) 2026 HC year cells ---
    apply_2026_hc(
        by_id["georgia"],
        {
            "pay": money(
                13_003_000,
                "Athens Banner-Herald (Aug. 10, 2026), quoting UGA Athletic Association open-records salary tape (July 2026)",
                UGA_SAL,
                "2026-08-10",
                "July 2026 FOIA salary tape: Kirby Smart $13.003 million total pay. Not the USA TODAY 2025-10-08 $13,282,580 cell. UGA Athletic Association board (May 2, 2024) set $13 million annually through Dec. 31, 2033.",
                year=2026,
            ),
            "buyout": pending_buyout(
                "Athens Banner-Herald (Aug. 10, 2026) open-records salary tape; UGA board May 2, 2024 extension",
                UGA_SAL,
                "Salary tape does not publish a current-dollar overhang. May 2024 board release says the deal is fully guaranteed through Dec. 31, 2028 — we do not invent the remainder.",
            ),
            "year_term": wiki_term(
                "https://en.wikipedia.org/wiki/2026_Georgia_Bulldogs_football_team",
                "2033",
                7,
                "UGA Athletic Association board (May 2, 2024) extended Smart through Dec. 31, 2033.",
            ),
            "current_term": article_term(
                "UGA Athletics (May 2, 2024) — Athletic Association board extension",
                UGA_SMART,
                "2033",
                7,
                "Board-approved extension through Dec. 31, 2033. 2026 year pay is the July 2026 FOIA salary tape.",
                "2024-05-02",
            ),
            "contractUrl": UGA_SAL,
            "contract": {
                "label": "Athens Banner-Herald — UGA July 2026 open-records salary tape",
                "url": UGA_SAL,
            },
        },
    )
    apply_2026_hc(
        by_id["tennessee"],
        {
            "pay": money(
                9_000_000,
                "University of Tennessee Heupel EA + Amendment 2 (supplemental) + Amendment 3; Knox News (Aug. 26, 2025)",
                HEUPEL_A3,
                "2025-08-26",
                "Original EA base $275,000 + Amendment 2 supplemental $8,725,000 = $9,000,000. Amendment 3 (Aug. 26, 2025) extends the term through Jan. 31, 2030 and does not republish a new pay table; Knox News quoting the amendment says pay remains $9 million. Incentives not added.",
                year=2026,
                extra={
                    "breakdown": [
                        {"label": "Base pay (original EA)", "value": 275_000},
                        {"label": "Supplemental pay (Amendment 2)", "value": 8_725_000},
                    ]
                },
            ),
            "buyout": pending_buyout(
                "University of Tennessee Heupel Amendment 3 PDF",
                HEUPEL_A3,
                "School-side without-cause is 75% of remaining Base + Supplemental if fired on or after Dec. 15, 2025 and before Dec. 15, 2027 (50% after). We do not invent the remainder.",
            ),
            "year_term": wiki_term(
                "https://en.wikipedia.org/wiki/2026_Tennessee_Volunteers_football_team",
                "2030",
                4,
                "Amendment 3 extends the employment agreement through Jan. 31, 2030.",
            ),
            "current_term": article_term(
                "University of Tennessee Heupel Amendment 3 PDF; Knox News (Aug. 26, 2025)",
                HEUPEL_A3,
                "2030",
                4,
                "Amendment 3 (signed Aug. 26, 2025) substitutes Jan. 31, 2030 as the term end. Pay remains the Amendment 2 $9.0 million table.",
                "2025-08-26",
            ),
            "contractUrl": HEUPEL_A3,
            "contract": {
                "label": "University of Tennessee Heupel Amendment 3 PDF",
                "url": HEUPEL_A3,
                "files": [
                    {
                        "kind": "employment-agreement",
                        "label": "Original employment agreement (tennessee.edu)",
                        "url": HEUPEL_EA,
                    },
                    {
                        "kind": "amendment",
                        "n": 1,
                        "label": "Amendment 1",
                        "url": "https://tennessee.edu/wp-content/uploads/2025/04/Heupel-Josh-Amendment1-2022-28-FC.pdf",
                    },
                    {
                        "kind": "amendment",
                        "n": 2,
                        "label": "Amendment 2 — $8,725,000 supplemental",
                        "url": HEUPEL_A2,
                    },
                    {
                        "kind": "amendment",
                        "n": 3,
                        "label": "Amendment 3 (Aug. 2025) — current governing",
                        "url": HEUPEL_A3,
                    },
                ],
            },
        },
    )
    apply_2026_hc(
        by_id["mississippi-state"],
        {
            "pay": money(
                4_365_000,
                "Clarion Ledger (Dec. 15, 2025), quoting Lebby university + Bulldog Club contracts",
                CL_LEBBY,
                "2025-12-15",
                "Article quoting the contracts: $4.35 million for the 2025 season, increasing $15,000 annually through 2028. 2026 step is $4,365,000. Not the USA TODAY 2025-10-08 cell. Bowl / incentive bonuses not added.",
                year=2026,
            ),
            "buyout": pending_buyout(
                "Clarion Ledger (Nov. 28 / Dec. 15, 2025), quoting Lebby contracts",
                CL_LEBBY,
                "School-side without-cause is 75% of remaining salary — we do not invent the remainder.",
            ),
            "year_term": wiki_term(
                "https://en.wikipedia.org/wiki/2026_Mississippi_State_Bulldogs_football_team",
                "2028",
                2,
                "Clarion Ledger: under contract through the 2028 season.",
            ),
            "current_term": article_term(
                "Clarion Ledger (Dec. 15, 2025), quoting Lebby contracts",
                CL_LEBBY,
                "2028",
                2,
                "University + Bulldog Club contracts through the 2028 season. 2026 pay is the published $4.35M + $15k step.",
                "2025-12-15",
            ),
            "contractUrl": CL_LEBBY,
            "contract": {
                "label": "Clarion Ledger — Lebby contracts via open records",
                "url": CL_LEBBY,
            },
        },
    )

    # --- D) Orgeron paid buyout ---
    lsu_layer = layers_doc["schools"]["lsu"]
    existing_orgeron = [
        b for b in (lsu_layer.get("buyoutsPaid") or []) if "orgeron" in (b.get("coach") or "").lower()
    ]
    if existing_orgeron:
        raise SystemExit("Orgeron buyout already on layers")
    lsu_layer.setdefault("buyoutsPaid", []).append(
        {
            "coach": "Ed Orgeron",
            "sport": "FB",
            "year": 2021,
            "amount": 16_900_000,
            "through": "2025-12",
            "whoPaid": "LSU",
            "status": "paid through Dec 2025",
            "confidence": "reported",
            "source": "USA TODAY Network / Daily Advertiser (May 21, 2026), quoting records — $16.9M buyout, payments concluded December 2025",
            "url": USAT_ORGERON,
            "asOf": "2026-05-21",
            "notes": (
                "Lump + through-date only. USA TODAY Network: after firing Orgeron in 2021, LSU was on the hook "
                "for a $16.9 million buyout; those payments concluded December 2025. Advocate / NOLA cite a $17 "
                "million buyout in equal monthly installments with the last payment due December 2025. This cell "
                "stores the USA TODAY Network $16.9M lump through Dec. 2025. We do not invent an annual split."
            ),
        }
    )

    # --- tape ---
    new_items = [
        tape_item(
            id="ole-miss-precap-item44-fy2025",
            date="2026-01-15",
            school="ole-miss",
            schoolName="Ole Miss",
            kind="filing",
            headline="Ole Miss FY2025 NCAA Membership Financial Report Item 44 Institutional NIL Revenue Share is $0.",
            figure=0,
            confidence="reported",
            source={"label": "Ole Miss FY2025 NCAA MFRS PDF", "url": OM_MFRS},
            field="nil.preCap",
        ),
        tape_item(
            id="lsu-paid-buyout-orgeron-2025-12",
            date="2025-12",
            school="lsu",
            schoolName="LSU",
            kind="paid-buyout",
            headline="USA TODAY Network: LSU finished Ed Orgeron’s $16.9 million 2021 buyout in December 2025. Lump + through-date; no invented annual split.",
            figure=16_900_000,
            confidence="reported",
            source={"label": "USA TODAY Network / Daily Advertiser — Orgeron buyout leftover", "url": USAT_ORGERON},
            field="layers.buyoutsPaid",
        ),
        tape_item(
            id="georgia-contract-smart-2026-08-10",
            date="2026-08-10",
            school="georgia",
            schoolName="Georgia",
            kind="contract",
            headline="Athens Banner-Herald July 2026 open-records salary tape: Kirby Smart $13.003 million. Not the USA TODAY 2025-10-08 cell.",
            figure=13_003_000,
            confidence="reported",
            source={"label": "Athens Banner-Herald — UGA July 2026 salary tape", "url": UGA_SAL},
            field="coaches.football.pay",
        ),
        tape_item(
            id="tennessee-contract-heupel-2025-08-26",
            date="2025-08-26",
            school="tennessee",
            schoolName="Tennessee",
            kind="contract",
            headline="Heupel Amendment 3 extends the deal through Jan. 31, 2030; EA + Amendment 2 keep annual pay at $9.0 million ($275k base + $8.725M supplemental).",
            figure=9_000_000,
            confidence="reported",
            source={"label": "University of Tennessee Heupel Amendment 3 + Knox News", "url": HEUPEL_A3},
            field="coaches.football.pay",
        ),
        tape_item(
            id="mississippi-state-contract-lebby-2026",
            date="2025-12-15",
            school="mississippi-state",
            schoolName="Mississippi State",
            kind="contract",
            headline="Clarion Ledger quotes Lebby’s contracts: $4.35 million in 2025, +$15,000 annually through 2028, so $4,365,000 in 2026.",
            figure=4_365_000,
            confidence="reported",
            source={"label": "Clarion Ledger — Lebby contracts", "url": CL_LEBBY},
            field="coaches.football.pay",
        ),
    ]
    existing_ids = {it["id"] for it in tape_doc["items"]}
    add = [it for it in new_items if it["id"] not in existing_ids]
    tape_doc["items"] = add + tape_doc["items"]
    tape_doc["meta"]["itemCount"] = len(tape_doc["items"])

    # --- ad-cites.json ---
    new_cites = [
        {
            "id": "kentucky",
            "name": "J Batt",
            "pay": 2_600_000,
            "year": 2026,
            "asOf": "2026-06-17",
            "source": "Courier-Journal (June 17, 2026), quoting UK Office of Legal Counsel term sheet",
            "url": CJ_BATT,
            "notes": "Year 1 $2.6M. Barnhart retired June 30, 2026 — not reused.",
            "confidence": "reported",
        },
        {
            "id": "lsu",
            "name": "Verge Ausberry",
            "pay": 1_500_000,
            "year": 2026,
            "asOf": "2026-04-22",
            "source": "USA TODAY Network / Daily Advertiser (April 22, 2026), quoting Ausberry EA",
            "url": NEWSSTAR_AUS,
            "notes": "First-year $1.5M through 2027.",
            "confidence": "reported",
        },
        {
            "id": "oklahoma",
            "name": "Roger Denny",
            "pay": 1_250_000,
            "year": 2026,
            "asOf": "2026-01-30",
            "source": "The Oklahoman — OU Board of Regents",
            "url": OKLA_DENNY,
            "notes": "Board-approved $1.25M through June 30, 2030. Castiglione cite omitted.",
            "confidence": "reported",
        },
        {
            "id": "mississippi-state",
            "name": "Zac Selmon",
            "pay": 1_250_000,
            "year": 2025,
            "asOf": "2025-05-14",
            "source": "Clarion Ledger, quoting Selmon extension documents",
            "url": CL_SELMON,
            "notes": "$1.25M for 2025. Do not invent the +$25k renewal step.",
            "confidence": "reported",
        },
        {
            "id": "ucla",
            "name": "Martin Jarmond",
            "pay": 1_800_000,
            "year": 2026,
            "asOf": "2024-12-10",
            "source": "Los Angeles Times — Jarmond extension schedule",
            "url": LAT_JARMOND,
            "notes": "Year 3 of the July 1, 2024 extension is $1.8M (2026-27).",
            "confidence": "reported",
        },
        {
            "id": "washington",
            "name": "Patrick Chun",
            "pay": 1_500_000,
            "year": 2026,
            "asOf": "2024-03-28",
            "source": "Seattle Times, quoting Chun MOU",
            "url": ST_CHUN,
            "notes": "MOU $1.3M in 2024-25 + $100k annual; 2026-27 is $1.5M.",
            "confidence": "reported",
        },
        {
            "id": "wisconsin",
            "name": "Shawn Eichorst",
            "pay": 1_600_000,
            "year": 2026,
            "asOf": "2026-07-13",
            "source": "Milwaukee Journal Sentinel, quoting Eichorst contract via open records",
            "url": JS_EICH,
            "notes": "2026-27 base $1.6M.",
            "confidence": "reported",
        },
        {
            "id": "south-carolina",
            "name": "Jeremiah Donati",
            "pay": 2_000_000,
            "year": 2026,
            "asOf": "2024-12-05",
            "source": "AP News, quoting SC Board of Trustees",
            "url": AP_DONATI,
            "notes": "$1.9M first year (2025) + $100k each subsequent year = $2.0M in 2026.",
            "confidence": "reported",
        },
        {
            "id": "arkansas",
            "name": "Hunter Yurachek",
            "pay": 1_500_000,
            "year": 2023,
            "asOf": "2022-10-31",
            "source": "Arkansas Democrat-Gazette FOIA amended contract",
            "url": ADG_YUR,
            "notes": "$1.5M beginning January 2023. Same person. Deferred not added.",
            "confidence": "reported",
        },
        {
            "id": "auburn",
            "name": "John Cohen",
            "pay": 1_500_000,
            "year": 2023,
            "asOf": "2023-06-01",
            "source": "Montgomery Advertiser, quoting Cohen EA",
            "url": ADV_COHEN,
            "notes": "Starting $1.5M. 2024 addendum extended term; did not republish a new dollar.",
            "confidence": "reported",
        },
        {
            "id": "kansas-state",
            "name": "Gene Taylor",
            "pay": 925_000,
            "year": 2026,
            "asOf": "2026-05-26",
            "source": "Topeka Capital-Journal (USA TODAY Network)",
            "url": CJ_TAYLOR,
            "notes": "$925k base. Retention bonuses not added.",
            "confidence": "reported",
        },
        {
            "id": "utah",
            "name": "Mark Harlan",
            "pay": 1_000_000,
            "year": 2026,
            "asOf": "2023-06-15",
            "source": "Deseret News, quoting Harlan extension",
            "url": DES_HARLAN,
            "notes": "Published +$50k schedule: 2026-27 base is $1.0M.",
            "confidence": "reported",
        },
    ]
    have = {(c["id"], c.get("name"), c.get("year")) for c in cites_doc["cites"]}
    for row in new_cites:
        key = (row["id"], row["name"], row["year"])
        if key not in have:
            cites_doc["cites"].append(row)

    # sanity
    for sid, expected in BOOKED_MUST.items():
        if by_id[sid]["nil"]["booked"]["value"] != expected:
            raise SystemExit(f"House booked drifted {sid}")
    if by_id["pittsburgh"]["capacity"].get("studentFees", {}).get("value") is not None:
        raise SystemExit("Pitt fees filled")
    if by_id["south-carolina"]["coachesByYear"]["2026"]["football"]["pay"].get("value") is not None:
        raise SystemExit("Beamer flipped")
    if by_id["kentucky"]["staff"]["athleticDirector"]["name"] != "J Batt":
        raise SystemExit("Kentucky AD name not updated")
    if by_id["kentucky"]["staff"]["athleticDirector"]["pay"]["value"] != 2_600_000:
        raise SystemExit("Kentucky AD pay miss")
    if by_id["ole-miss"]["nil"]["preCap"]["value"] != 0:
        raise SystemExit("Ole Miss Item 44 miss")
    if by_id["georgia"]["coachesByYear"]["2026"]["football"]["pay"]["value"] != 13_003_000:
        raise SystemExit("Smart 2026 miss")
    if by_id["tennessee"]["coachesByYear"]["2026"]["football"]["pay"]["value"] != 9_000_000:
        raise SystemExit("Heupel 2026 miss")
    if by_id["mississippi-state"]["coachesByYear"]["2026"]["football"]["pay"]["value"] != 4_365_000:
        raise SystemExit("Lebby 2026 miss")
    if any(s.get("private") and (s.get("staff") or {}).get("athleticDirector", {}).get("pay", {}).get("value") for s in schools_doc["schools"]):
        raise SystemExit("private AD pay filled")

    dump_json(SRC / "schools.json", schools_doc, ascii_ok=False)
    dump_json(PUB / "schools.json", schools_doc, ascii_ok=False)
    dump_json(SRC / "tape.json", tape_doc, ascii_ok=True)
    dump_json(PUB / "tape.json", tape_doc, ascii_ok=True)
    dump_json(PUB / "layers.json", layers_doc, ascii_ok=True)
    dump_json(ROOT / "scripts" / "ad-cites.json", cites_doc, ascii_ok=False)
    print("ingested AD / Item 44 / 2026 HC / Orgeron")


if __name__ == "__main__":
    main()
