#!/usr/bin/env python3
"""Second-pass 2026-08-28 Public Cap hole hunt.

Cited dollars + URL + date only. Does not overwrite booked House / Item 44,
collective990, fees, existing AD pay, existing 2026 current-deal pays,
buyout.steps, apparel AAV, or media. Does not stamp USA TODAY 2025 onto
2026 year-keys. Does not book Venables source AAV. Leaves Florida / LSU /
Michigan Item 44 and LSU Nike, plus Lupoi / Fickell / Ferentz / Fisch /
Coyle / Pollard / Palumbo / Carter, to the parallel hunt.
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

PACK_DOEREN = "https://packinsider.com/2026/06/29/nc-state-football-coaching-salaries-2026/"
AP_ROD = "https://apnews.com/article/west-virginia-rich-rodriguez-contract-45ec4c08a34b053b8d9c45f66fc473c4"
AZ_ROSSINI = "https://arizonasports.com/ncaa/arizona-state/arizona-state-football/rossini-ext"
METRO_BAKER = "https://wvmetronews.com/2025/07/24/wvu-director-of-athletics-wren-baker-agree-on-contract-extension/"
SOUCF_MOHAJIR = "https://www.sonsofucf.com/ucf-ad-terry-mohajir-talks-adjustments-for-knights/"
ATH_CUNN = "https://www.nytimes.com/athletic/4785862/2023/08/18/cincinnati-ad-john-cunningham-contract/"
SI_CUNN = "https://www.si.com/college/cincinnati/news/report-uc-extends-john-cunninghams-contract-through-june-2028"
CHRON_NUNEZ = "https://www.houstonchronicle.com/sports/college/article/eddie-nunez-athletic-director-houston-budget-19705454.php"
ABQ_NUNEZ = "https://www.abqjournal.com/sports/lobo-coaches-confident-in-new-athletic-director-search-details-of-eddie-nuezs-houston-contract-emerge/438695"


def dump_json(path: Path, data, *, ascii_ok: bool) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=ascii_ok) + "\n")


def money(value, source, url, as_of, notes, year=None):
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
    return out


def apply_ad(school, pay):
    staff = school.setdefault("staff", {})
    ad = staff.get("athleticDirector") or {}
    existing = ad.get("pay") if isinstance(ad.get("pay"), dict) else {}
    if existing.get("value") is not None:
        raise SystemExit(f"refusing to overwrite AD pay for {school['id']}: {existing}")
    ad["pay"] = pay
    ad["notes"] = (
        "Current athletics-director chair as of the 2026-08-27 desk. "
        "Pay is year-pinned on staff.athleticDirector.pay."
    )
    staff["athleticDirector"] = ad
    by = school.get("staffByYear") or {}
    year_2026 = by.get("2026")
    if isinstance(year_2026, dict):
        year_2026["athleticDirector"] = deepcopy(ad)
        by["2026"] = year_2026
        school["staffByYear"] = by


def apply_2026_hc_year_only(school, spec):
    """Fill coachesByYear.2026 only. Leave current-deal USA TODAY / buyout.steps alone."""
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
        year_fb["contract"] = deepcopy(spec["contract"])


def main() -> None:
    schools_doc = json.loads((SRC / "schools.json").read_text())
    tape_doc = json.loads((SRC / "tape.json").read_text())
    cites_doc = json.loads((ROOT / "scripts" / "ad-cites.json").read_text())
    before = deepcopy({s["id"]: s for s in schools_doc["schools"]})
    by_id = {s["id"]: s for s in schools_doc["schools"]}

    for sid, expected in BOOKED_MUST.items():
        if by_id[sid]["nil"]["booked"]["value"] != expected:
            raise SystemExit(f"refusing: {sid} booked drifted")
    if (by_id["kentucky"].get("nil") or {}).get("preCap", {}).get("value") is not None:
        raise SystemExit("Kentucky preCap must stay empty")
    if by_id["texas"]["nil"]["preCap"]["value"] != 3_200_000:
        raise SystemExit("texas preCap drifted")
    if by_id["oklahoma"]["coachesByYear"]["2026"]["football"]["pay"].get("value") is not None:
        raise SystemExit("Venables 2026 must stay empty")
    pitt_pay = by_id["pittsburgh"]["staff"]["athleticDirector"].get("pay") or {}
    if pitt_pay.get("value") is not None:
        raise SystemExit("Greene pay must stay pending")
    cal_pay = by_id["california"]["staff"]["athleticDirector"].get("pay") or {}
    if cal_pay.get("value") is not None:
        raise SystemExit("Cal AD pay must stay pending")
    if by_id["pittsburgh"]["capacity"].get("studentFees", {}).get("value") is not None:
        raise SystemExit("Pitt student fees must stay empty")

    # --- A) Item 44: none hosted on this pass ---

    # --- B) 2026 HC year-keys only ---
    apply_2026_hc_year_only(
        by_id["nc-state"],
        {
            "pay": money(
                5_750_000,
                "PackInsider (June 29, 2026), quoting Doeren FOIA documents",
                PACK_DOEREN,
                "2026-06-29",
                "FOIA: $5.75 million in 2026 after the published $125,000 annual raise, through the 2029 season. Not the USA TODAY 2025-10-08 $6,215,377 cell. Incentives not added. Current-deal line stays the USA TODAY 2025 snapshot.",
                year=2026,
            ),
            "buyout": {
                "value": None,
                "confidence": "pending",
                "source": "PackInsider (June 29, 2026) FOIA salary tape",
                "url": PACK_DOEREN,
                "asOf": None,
                "notes": "FOIA salary tape does not print a current-dollar school-side overhang. We do not invent buyout.steps.",
            },
            "year_term": {
                "confidence": "reported",
                "asOf": "2026-06-29",
                "source": "Wikipedia season-page infobox; PackInsider FOIA",
                "url": "https://en.wikipedia.org/wiki/2026_NC_State_Wolfpack_football_team",
                "through": "2029",
                "yearsRemaining": 4,
                "notes": f"{CHAIR} FOIA: under contract through the 2029 season.",
            },
            "contractUrl": PACK_DOEREN,
            "contract": {
                "label": "PackInsider — Doeren 2026 FOIA salary tape",
                "url": PACK_DOEREN,
            },
        },
    )
    apply_2026_hc_year_only(
        by_id["west-virginia"],
        {
            "pay": money(
                3_600_000,
                "AP News (Dec. 2024), quoting Rodriguez Dec. 11 MOU obtained by FOIA; $3.5M first season + $100,000 each subsequent season",
                AP_ROD,
                "2024-12-16",
                "FOIA MOU: $3.5 million in 2025 (first season) + $100,000 each subsequent season. 2026 step is $3,600,000. Tops at $3.9 million in 2029. Not a USA TODAY 2025 stamp. Incentives not added. Current-deal line stays the USA TODAY 2025 snapshot.",
                year=2026,
            ),
            "buyout": {
                "value": None,
                "confidence": "pending",
                "source": "AP News — Rodriguez MOU via FOIA",
                "url": AP_ROD,
                "asOf": None,
                "notes": "School-side without-cause is 50% of remaining total compensation — we do not invent the remainder or buyout.steps.",
            },
            "year_term": {
                "confidence": "reported",
                "asOf": "2024-12-16",
                "source": "Wikipedia season-page infobox; AP FOIA MOU",
                "url": "https://en.wikipedia.org/wiki/2026_West_Virginia_Mountaineers_football_team",
                "through": "2029",
                "yearsRemaining": 4,
                "notes": f"{CHAIR} Five-year MOU through the 2029 season. 247 later obtained the July 18, 2025 official contract and said it forwarded the MOU year table.",
            },
            "contractUrl": AP_ROD,
            "contract": {
                "label": "AP News — Rodriguez MOU via FOIA",
                "url": AP_ROD,
            },
        },
    )

    # --- C) AD pay ---
    apply_ad(
        by_id["arizona-state"],
        money(
            950_000,
            "Arizona Sports (April 10, 2025), quoting Arizona Board of Regents approval of the Rossini extension",
            AZ_ROSSINI,
            "2025-04-10",
            "ABOR: base increases from $650,000 to $950,000 effective July 1, 2025, through June 30, 2030. Annual raise ranging from $50,000 to $100,000 is not invented. Retention / performance bonuses and the $100,000 merit bonus are not added. Same person as the 2026 chair.",
            year=2025,
        ),
    )
    apply_ad(
        by_id["west-virginia"],
        money(
            1_400_000,
            "WV MetroNews (July 24, 2025), quoting Baker June 5, 2025 second amendment to the employment agreement",
            METRO_BAKER,
            "2025-07-24",
            "Amendment signed June 5, 2025: $1.3 million in calendar 2025 + $100,000 each year to $2.0 million in 2032. 2026 step is $1,400,000. $200,000 July 1 retention (through 2029) and coach-incentive share (max $250k) are not added. Same person as the 2026 chair.",
            year=2026,
        ),
    )
    apply_ad(
        by_id["ucf"],
        money(
            1_000_000,
            "Sons of UCF (June 20, 2025), quoting a November 2022 extension summary furnished by UCF Sports Information",
            SOUCF_MOHAJIR,
            "2025-06-20",
            "SID summary: $1,000,000 in 2025 and $1,000,000 in 2026 on the July 2022–June 30, 2027 term. Performance bonuses capped at $300,000 are not added. A later extension offer through June 30, 2029 has no published dollar and is not booked.",
            year=2026,
        ),
    )
    apply_ad(
        by_id["cincinnati"],
        money(
            725_000,
            "The Athletic (Aug. 18, 2023), quoting Cunningham Board-approved extension obtained by public records; SI reprint",
            ATH_CUNN,
            "2023-08-18",
            "FOIA schedule: $650,000 beginning July 1, 2023 + $25,000 annually to $750,000 in 2027-28. 2026-27 step is $725,000. Retention bonus and performance bonus are not added. Same person as the 2026 chair.",
            year=2026,
        ),
    )
    apply_ad(
        by_id["houston"],
        money(
            1_000_000,
            "Houston Chronicle hire terms, quoted by the Albuquerque Journal: $900,000 first year + $50,000 annually to $1.1 million ending August 2029",
            ABQ_NUNEZ,
            "2024-08-26",
            "Published schedule from the five-year UH deal (hired August 2024): $900k / $950k / $1.0M / $1.05M / $1.1M. 2026 step (Aug. 2026–Aug. 2027) is $1,000,000. $250,000 performance incentive and the $150,000 UNM buyout payment are not added. Same person as the 2026 chair.",
            year=2026,
        ),
    )

    new_items = [
        {
            "id": "nc-state-pay-doeren-2026-foia",
            "date": "2026-06-29",
            "school": "nc-state",
            "schoolName": "NC State",
            "kind": "contract",
            "headline": "PackInsider FOIA: Dave Doeren $5.75 million in 2026 after the $125,000 annual raise, through 2029. Not the USA TODAY 2025-10-08 cell.",
            "figure": 5_750_000,
            "confidence": "reported",
            "source": {"label": "PackInsider — Doeren 2026 FOIA salary tape", "url": PACK_DOEREN},
            "field": "coachesByYear.2026.football.pay",
        },
        {
            "id": "west-virginia-pay-rodriguez-2026-mou",
            "date": "2024-12-16",
            "school": "west-virginia",
            "schoolName": "West Virginia",
            "kind": "contract",
            "headline": "AP FOIA MOU: Rich Rodriguez $3.5 million in 2025 + $100,000 each subsequent season. 2026 step is $3,600,000.",
            "figure": 3_600_000,
            "confidence": "reported",
            "source": {"label": "AP News — Rodriguez MOU via FOIA", "url": AP_ROD},
            "field": "coachesByYear.2026.football.pay",
        },
        {
            "id": "arizona-state-ad-rossini-2025-abor",
            "date": "2025-04-10",
            "school": "arizona-state",
            "schoolName": "Arizona State",
            "kind": "contract",
            "headline": "Arizona Board of Regents approved Graham Rossini’s extension: $950,000 base effective July 1, 2025. $50k–$100k annual raise not invented.",
            "figure": 950_000,
            "confidence": "reported",
            "source": {"label": "Arizona Sports — ABOR Rossini extension", "url": AZ_ROSSINI},
            "field": "staff.athleticDirector.pay",
        },
        {
            "id": "west-virginia-ad-baker-2026-amendment",
            "date": "2025-07-24",
            "school": "west-virginia",
            "schoolName": "West Virginia",
            "kind": "contract",
            "headline": "WV MetroNews quotes Baker’s June 5, 2025 amendment: $1.3 million in 2025 + $100,000 a year. 2026 step is $1,400,000.",
            "figure": 1_400_000,
            "confidence": "reported",
            "source": {"label": "WV MetroNews — Baker second amendment", "url": METRO_BAKER},
            "field": "staff.athleticDirector.pay",
        },
        {
            "id": "ucf-ad-mohajir-2026-sid",
            "date": "2025-06-20",
            "school": "ucf",
            "schoolName": "UCF",
            "kind": "contract",
            "headline": "UCF Sports Information summary via Sons of UCF: Terry Mohajir $1,000,000 in 2026 on the November 2022 extension.",
            "figure": 1_000_000,
            "confidence": "reported",
            "source": {"label": "Sons of UCF — Mohajir SID extension summary", "url": SOUCF_MOHAJIR},
            "field": "staff.athleticDirector.pay",
        },
        {
            "id": "cincinnati-ad-cunningham-2026-foia",
            "date": "2023-08-18",
            "school": "cincinnati",
            "schoolName": "Cincinnati",
            "kind": "contract",
            "headline": "The Athletic FOIA: John Cunningham $650,000 from July 1, 2023 + $25,000 annually. 2026-27 step is $725,000.",
            "figure": 725_000,
            "confidence": "reported",
            "source": {"label": "The Athletic — Cunningham extension via public records", "url": ATH_CUNN},
            "field": "staff.athleticDirector.pay",
        },
        {
            "id": "houston-ad-nunez-2026-chronicle",
            "date": "2024-08-26",
            "school": "houston",
            "schoolName": "Houston",
            "kind": "contract",
            "headline": "Houston Chronicle hire table, quoted by the Albuquerque Journal: Eddie Nuñez $900,000 year 1 + $50,000 annually. 2026 step is $1,000,000.",
            "figure": 1_000_000,
            "confidence": "reported",
            "source": {"label": "Albuquerque Journal quoting Houston Chronicle — Nuñez UH deal", "url": ABQ_NUNEZ},
            "field": "staff.athleticDirector.pay",
        },
    ]
    existing_ids = {i.get("id") for i in tape_doc["items"]}
    for item in reversed(new_items):
        if item["id"] in existing_ids:
            raise SystemExit(f"tape id already present: {item['id']}")
        tape_doc["items"].insert(0, item)
    tape_doc["meta"]["itemCount"] = len(tape_doc["items"])
    tape_doc["meta"]["asOf"] = "2026-08-28"

    new_cites = [
        {
            "id": "arizona-state",
            "name": "Graham Rossini",
            "pay": 950_000,
            "year": 2025,
            "asOf": "2025-04-10",
            "source": "Arizona Sports — ABOR Rossini extension",
            "url": AZ_ROSSINI,
            "notes": "July 1, 2025 base $950k. $50k–$100k annual raise not invented.",
            "confidence": "reported",
        },
        {
            "id": "west-virginia",
            "name": "Wren Baker",
            "pay": 1_400_000,
            "year": 2026,
            "asOf": "2025-07-24",
            "source": "WV MetroNews — Baker second amendment",
            "url": METRO_BAKER,
            "notes": "2026 calendar step $1.4M from the published +$100k schedule. Retention not added.",
            "confidence": "reported",
        },
        {
            "id": "ucf",
            "name": "Terry Mohajir",
            "pay": 1_000_000,
            "year": 2026,
            "asOf": "2025-06-20",
            "source": "Sons of UCF — Mohajir SID extension summary",
            "url": SOUCF_MOHAJIR,
            "notes": "SID schedule: $1.0M in 2026. Bonuses not added.",
            "confidence": "reported",
        },
        {
            "id": "cincinnati",
            "name": "John Cunningham",
            "pay": 725_000,
            "year": 2026,
            "asOf": "2023-08-18",
            "source": "The Athletic — Cunningham extension via public records",
            "url": ATH_CUNN,
            "notes": "2026-27 step $725k from the published +$25k schedule. Retention not added.",
            "confidence": "reported",
        },
        {
            "id": "houston",
            "name": "Eddie Nunez",
            "pay": 1_000_000,
            "year": 2026,
            "asOf": "2024-08-26",
            "source": "Houston Chronicle / Albuquerque Journal — Nuñez UH hire table",
            "url": ABQ_NUNEZ,
            "notes": "2026 step $1.0M from the published +$50k schedule. Incentives not added.",
            "confidence": "reported",
        },
    ]
    have = {(c["id"], c.get("name"), c.get("year")) for c in cites_doc["cites"]}
    for row in new_cites:
        if (row["id"], row["name"], row["year"]) not in have:
            cites_doc["cites"].append(row)
    cites_doc["asOf"] = "2026-08-28"

    after = {s["id"]: s for s in schools_doc["schools"]}
    for sid in BOOKED_MUST:
        if after[sid]["nil"]["booked"] != before[sid]["nil"]["booked"]:
            raise SystemExit(f"booked drifted {sid}")
        if "collective990" in before[sid].get("nil", {}):
            if after[sid]["nil"]["collective990"] != before[sid]["nil"]["collective990"]:
                raise SystemExit(f"collective990 drifted {sid}")
    if after["louisville"]["nil"]["preCap"] != before["louisville"]["nil"]["preCap"]:
        raise SystemExit("louisville preCap drifted")
    if after["texas"]["nil"]["preCap"] != before["texas"]["nil"]["preCap"]:
        raise SystemExit("texas preCap drifted")
    if (after["kentucky"].get("nil") or {}).get("preCap", {}).get("value") is not None:
        raise SystemExit("Kentucky preCap filled")
    if after["oklahoma"]["coachesByYear"]["2026"]["football"]["pay"].get("value") is not None:
        raise SystemExit("Venables 2026 filled")
    if after["nc-state"]["coaches"]["football"]["pay"]["value"] != 6_215_377:
        raise SystemExit("Doeren current USA TODAY overwritten")
    if after["west-virginia"]["coaches"]["football"]["pay"]["value"] != 3_600_000:
        raise SystemExit("Rodriguez current overwritten")
    if after["nc-state"]["coachesByYear"]["2026"]["football"]["pay"]["value"] != 5_750_000:
        raise SystemExit("Doeren 2026 miss")
    if after["west-virginia"]["coachesByYear"]["2026"]["football"]["pay"]["value"] != 3_600_000:
        raise SystemExit("Rodriguez 2026 miss")
    if after["arizona-state"]["staff"]["athleticDirector"]["pay"]["value"] != 950_000:
        raise SystemExit("Rossini miss")
    if after["west-virginia"]["staff"]["athleticDirector"]["pay"]["value"] != 1_400_000:
        raise SystemExit("Baker miss")
    if after["ucf"]["staff"]["athleticDirector"]["pay"]["value"] != 1_000_000:
        raise SystemExit("Mohajir miss")
    if after["cincinnati"]["staff"]["athleticDirector"]["pay"]["value"] != 725_000:
        raise SystemExit("Cunningham miss")
    if after["houston"]["staff"]["athleticDirector"]["pay"]["value"] != 1_000_000:
        raise SystemExit("Nunez miss")
    if after["california"]["staff"]["athleticDirector"].get("pay", {}).get("value") is not None:
        raise SystemExit("Cal AD filled")
    if after["pittsburgh"]["staff"]["athleticDirector"].get("pay", {}).get("value") is not None:
        raise SystemExit("Greene filled")

    dump_json(SRC / "schools.json", schools_doc, ascii_ok=False)
    dump_json(PUB / "schools.json", schools_doc, ascii_ok=False)
    dump_json(SRC / "tape.json", tape_doc, ascii_ok=True)
    dump_json(PUB / "tape.json", tape_doc, ascii_ok=True)
    dump_json(ROOT / "scripts" / "ad-cites.json", cites_doc, ascii_ok=False)
    print("ingested second-hole-hunt AD / 2026 HC year-keys")


if __name__ == "__main__":
    main()
