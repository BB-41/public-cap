#!/usr/bin/env python3
"""Ingest citeable public-record cells from the Aug 2026 hunt.

Only named dollars + URLs. Does not invent AAV from a multi-year partnership.
Does not overwrite booked House / Item 44 / collective 990 / existing apparel AAVs.
2026 HC year cells only — current-chair USA TODAY cells stay put.
"""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data"
PUB = ROOT / "public" / "data"

CHAIR = "Chair of record who started football 2026 (Wikipedia season-page infobox)."

WISC_PDF = (
    "https://www.wisconsin.edu/regents/download/meeting_materials/2025_meeting_materials/"
    "Meeting-Book---Special-Meeting-of-the-Board-of-Regents-(November-25,-2025).pdf"
)
NG = (
    "https://www.news-gazette.com/business/open-records-report-20-things-to-know-about-"
    "college-athletic-apparel-contracts/article_47f6cfe1-8c2b-5450-bdd9-877395bde72f.html"
)
CIGNETTI_247 = (
    "https://247sports.com/college/indiana/article/details-of-indiana-football-coach-"
    "curt-cignettis-newest-contract-that-makes-him-a-top-3-paid-coach-in-the-country-276117920/"
)
CIGNETTI_AP = "https://apnews.com/article/hoosiers-cignetti-contract-2a2d4db9907719ba85b9652bbb84264b"
DEBOER_CBS = "https://www.cbssports.com/college-football/news/kalen-deboer-alabama-contract-extension-salary/"
DAY_247 = (
    "https://247sports.com/college/ohio-state/article/ohio-state-football-ryan-day-receives-a-"
    "bonus-after-buckeyes-academic-achievement-for-third-straight-year-286549538/"
)
KROGER = (
    "https://www.arkansasonline.com/news/2026/jun/25/"
    "arkansas-football-stadium-naming-rights-deal-community-america-razorback-stadium-value/"
)
HOUSTON = "https://www.houstonchronicle.com/texas-sports-nation/college/article/UH-extend-naming-rights-deal-TDECU-2034-17427463.php"
ASU = "https://news.asu.edu/20230802-university-news-asu-mountain-america-credit-union-naming-rights-deal-football-stadium"

BOOKED_MUST = {
    "louisville": 32_900_000,
    "kentucky": 18_000_000,
    "ucla": 20_500_000,
    "california": 20_500_000,
    "texas": 13_500_000,
}

EXISTING_APPAREL_AAV = {
    "south-carolina": 7_750_000,
    "illinois": 4_900_000,
    "iowa": 3_400_000,
    "ohio-state": 6_100_000,
    "penn-state": 30_000_000,
    "clemson": 5_850_000,
    "georgia-tech": 18_600_000,
    "north-carolina": 3_250_000,
    "texas-tech": 5_925_000,
}


def dump(path: Path, data, *, ascii_ok: bool):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=ascii_ok) + "\n")


def brand(value, source, url, as_of, notes=None):
    out = {
        "value": value,
        "confidence": "reported",
        "source": source,
        "url": url,
        "asOf": as_of,
    }
    if notes:
        out["notes"] = notes
    return out


def money(value, source, url, as_of, notes, confidence="reported"):
    return {
        "value": value,
        "confidence": confidence,
        "source": source,
        "url": url,
        "asOf": as_of,
        "notes": notes,
    }


def pending_money(notes, source=None, url=None):
    return {
        "value": None,
        "confidence": "pending",
        "source": source,
        "url": url,
        "asOf": None,
        "notes": notes,
    }


def naming(**kwargs):
    return kwargs


def tape_item(**kwargs):
    return kwargs


def apply_apparel(layer, spec):
    a = layer["apparel"]
    if spec.get("brand") and a["brand"].get("value") is None:
        a["brand"] = spec["brand"]
    if spec.get("annualValue") and a["annualValue"].get("value") is None:
        a["annualValue"] = spec["annualValue"]
    if spec.get("naming"):
        existing = {(n.get("facility"), n.get("sponsor")) for n in (a.get("naming") or [])}
        for row in spec["naming"]:
            key = (row.get("facility"), row.get("sponsor"))
            if key not in existing:
                a.setdefault("naming", []).append(row)
    if spec.get("notes") and not a.get("notes"):
        a["notes"] = spec["notes"]


def apply_year_football(fb, spec):
    if fb["pay"].get("value") is not None:
        raise SystemExit(f"refusing to overwrite 2026 pay for {fb.get('name')}")
    fb["pay"] = spec["pay"]
    fb["buyout"] = spec["buyout"]
    fb["term"] = spec["term"]
    if spec.get("contractUrl"):
        fb["contractUrl"] = spec["contractUrl"]
    if spec.get("contract"):
        fb["contract"] = spec["contract"]


def main():
    schools_doc = json.loads((SRC / "schools.json").read_text())
    layers_doc = json.loads((PUB / "layers.json").read_text())
    tape_doc = json.loads((SRC / "tape.json").read_text())
    before_schools = deepcopy({s["id"]: s for s in schools_doc["schools"]})
    before_layers = deepcopy(layers_doc["schools"])

    by_id = {s["id"]: s for s in schools_doc["schools"]}
    layers = layers_doc["schools"]

    # --- A) apparel + naming ---
    ng_src = "News-Gazette FOIA apparel-contract package — current outfitter named in the open-records report"
    brand_only = {
        "indiana": "Adidas",
        "nebraska": "Adidas",
        "rutgers": "Adidas",
        "maryland": "Under Armour",
        "northwestern": "Under Armour",
        "michigan-state": "Nike",
        "colorado": "Nike",
        "texas-am": "Adidas",
        "kansas": "Adidas",
        "texas": "Nike",
        "michigan": "Nike",
    }
    for sid, name in brand_only.items():
        apply_apparel(
            layers[sid],
            {
                "brand": brand(
                    name,
                    ng_src,
                    NG,
                    "2023",
                    "FOIA package names the current outfitter. No guaranteed cash+product AAV extracted for this school. Not an invented allotment.",
                )
            },
        )

    apply_apparel(
        layers["wisconsin"],
        {
            "brand": brand(
                "Under Armour",
                "UW System Board of Regents special meeting packet (Nov. 25, 2025) — Under Armour renewal",
                WISC_PDF,
                "2025-11-25",
            ),
            "annualValue": money(
                7_000_000,
                "UW System Board of Regents special meeting packet (Nov. 25, 2025) — $3.8M annual cash + $3.2M wholesale product allotment",
                WISC_PDF,
                "2025-11-25",
                (
                    "Guaranteed cash $3.8 million (paid quarterly) + product allotment $3.2 million wholesale. "
                    "Initial term 7 years (2026–2033) with a 3-year option through 2036; total minimum gross $104.5 million. "
                    "Not in this AAV: $500k royalty minimum, $75k marketing fund, $175k NIL-contract minimum, "
                    "$3M one-time signing bonus (early payout of remaining current-deal rights fees), or performance bonuses. "
                    "Journal Sentinel quotes the same board figures."
                ),
            ),
            "notes": "Renewal begins after the current deal expires June 30, 2026.",
        },
    )

    apply_apparel(
        layers["kentucky"],
        {
            "brand": brand(
                "Nike",
                "UW System Board of Regents special meeting packet (Nov. 25, 2025) — names Kentucky’s ten-year Nike renewal",
                WISC_PDF,
                "2025-11-25",
            ),
            "annualValue": money(
                7_000_000,
                "UW System Board of Regents packet (Nov. 25, 2025) — Kentucky Nike annual product allowance $7 million (rises to $7.5 million in five years); no cash",
                WISC_PDF,
                "2025-11-25",
                (
                    "Hosted board packet names Kentucky’s July ten-year Nike renewal: $7 million annual product allowance, "
                    "rising to $7.5 million in year five; 15% royalty (5% on shoes) with a $400,000 average annual minimum. "
                    "AAV is the named $7.0 million year-1 product — not a guess from a multi-year lump. "
                    "Journal Sentinel repeats the $72.5 million product / no-cash total; we do not re-divide that lump."
                ),
            ),
            "naming": [
                naming(
                    facility="Kroger Field",
                    sponsor="Kroger",
                    annualValue=1_850_000,
                    term="12 years / $22 million (announced 2017)",
                    confidence="reported",
                    source="Arkansas Democrat-Gazette (June 25, 2026) — Kentucky/Kroger 12-year deal worth $1.85 million annually",
                    url=KROGER,
                    asOf="2026-06-25",
                    notes=(
                        "Named annual in the 2026 naming-rights census. Courier-Journal (Aug. 13, 2018) "
                        "books the same deal as $22 million over 12 years."
                    ),
                )
            ],
        },
    )

    apply_apparel(
        layers["houston"],
        {
            "naming": [
                naming(
                    facility="TDECU Stadium",
                    sponsor="Texas Dow Employees Credit Union",
                    annualValue=None,
                    term="10-year extension through at least 2034 (option through 2039)",
                    confidence="reported",
                    source='Houston Chronicle — TDECU extension: "more than $20 million" over 10 years; $14 million earmarked for the Football Operations Center',
                    url=HOUSTON,
                    asOf="2023",
                    notes=(
                        'Story names "more than $20 million" for the 10-year extension. '
                        "AAV pending — we do not divide a 'more than' lump. Original 2014 deal was $15 million / 10 years."
                    ),
                )
            ]
        },
    )

    apply_apparel(
        layers["arizona-state"],
        {
            "naming": [
                naming(
                    facility="Mountain America Stadium, Home of the ASU Sun Devils",
                    sponsor="Mountain America Credit Union",
                    annualValue=None,
                    term="15 years (announced Aug. 2, 2023)",
                    confidence="reported",
                    source="ASU News — 15-year Mountain America Stadium naming partnership. Financial terms not disclosed.",
                    url=ASU,
                    asOf="2023-08-02",
                    notes="School release names the 15-year term, not a dollar. An On3 $60 million figure is not booked.",
                )
            ]
        },
    )

    # --- D) 2026 HC year cells ---
    apply_year_football(
        by_id["indiana"]["coachesByYear"]["2026"]["football"],
        {
            "pay": {
                "value": 12_025_000,
                "year": 2026,
                "confidence": "reported",
                "source": "247Sports / Peegs.com (March 2, 2026), quoting the Feb. 4, 2026 Cignetti MOU via open records",
                "url": CIGNETTI_247,
                "asOf": "2026-03-02",
                "notes": (
                    f"{CHAIR} Year 1 (Jan. 1–Nov. 30, 2026) = base $500,000 + outside/marketing/promotional $11,525,000. "
                    "AP / IU: eight-year MOU averages $13.2 million ($105.6 million). "
                    "The $1,000,000 Nov. 30 retention bonus is not in this cell. Incentives not included."
                ),
                "breakdown": [
                    {"label": "Annual base salary", "value": 500_000},
                    {"label": "Outside / marketing / promotional (Year 1)", "value": 11_525_000},
                ],
                "schedule": [
                    {"period": "Year 1 (Jan 1–Nov 30, 2026)", "value": 12_025_000},
                    {"period": "Year 2 (Dec 2, 2026–Nov 30, 2027)", "value": 12_075_000},
                    {"period": "Year 3 (Dec 2, 2027–Nov 30, 2028)", "value": 12_125_000},
                    {"period": "Year 4 (Dec 1, 2028–Nov 30, 2029)", "value": 12_175_000},
                    {"period": "Year 5 (Dec 1, 2029–Nov 30, 2030)", "value": 12_225_000},
                    {"period": "Year 6 (Dec 1, 2030–Nov 30, 2031)", "value": 12_275_000},
                    {"period": "Year 7 (Dec 1, 2031–Nov 30, 2032)", "value": 12_325_000},
                    {"period": "Year 8 (Dec 1, 2032–Nov 30, 2033)", "value": 12_375_000},
                ],
                "incentives": [
                    {
                        "label": "Retention bonus",
                        "value": 1_000_000,
                        "notes": "Nov. 30 each year starting 2026. Not in the annual cell. AP average $13.2M includes this.",
                    },
                    {
                        "label": "CFP / Big Ten / coach-of-year ladder",
                        "notes": "FOIA MOU lists highest-in-category CFP and Big Ten bonuses. Not included in annual pay.",
                    },
                ],
                "baseOnly": None,
            },
            "buyout": {
                "value": None,
                "confidence": "pending",
                "source": "247Sports / Peegs.com (March 2, 2026), quoting the Feb. 4, 2026 Cignetti MOU via open records",
                "url": CIGNETTI_247,
                "asOf": None,
                "notes": "Fully guaranteed if IU fires without cause — we do not invent a remaining-dollar overhang from the year table.",
                "rule": "Fully guaranteed if Indiana terminates without cause (article quoting Feb. 4, 2026 MOU).",
            },
            "term": {
                "confidence": "reported",
                "asOf": "2026-08",
                "source": "Wikipedia season-page infobox; Feb. 4, 2026 MOU via 247Sports",
                "url": "https://en.wikipedia.org/wiki/2026_Indiana_Hoosiers_football_team",
                "through": "2033",
                "yearsRemaining": 7,
                "notes": f"{CHAIR} Eight-year MOU through the 2033 season. School-side without-cause is fully guaranteed remaining compensation.",
            },
            "contractUrl": CIGNETTI_247,
            "contract": {
                "label": "247Sports / Peegs.com — Cignetti Feb. 4, 2026 MOU via open records",
                "url": CIGNETTI_247,
            },
        },
    )

    apply_year_football(
        by_id["alabama"]["coachesByYear"]["2026"]["football"],
        {
            "pay": {
                "value": 12_500_000,
                "year": 2026,
                "confidence": "reported",
                "source": "CBS Sports (April 22, 2026) — Alabama trustee compensation meeting: DeBoer seven-year extension, $12.5 million annual salary",
                "url": DEBOER_CBS,
                "asOf": "2026-04-22",
                "notes": (
                    f"{CHAIR} AD Greg Byrne announced the extension at a trustee compensation meeting: "
                    "seven years through 2033, $12.5 million annual salary ($2 million raise). Incentives not included. "
                    "USA TODAY 2025 cell is not reused."
                ),
                "breakdown": [{"label": "Annual salary", "value": 12_500_000}],
                "schedule": None,
                "incentives": [
                    {
                        "label": "Performance bonuses",
                        "notes": "CBS does not publish a 2026 incentive table. Not included in annual pay.",
                    }
                ],
                "baseOnly": None,
            },
            "buyout": {
                "value": None,
                "confidence": "pending",
                "source": "CBS Sports (April 22, 2026) — trustee compensation meeting",
                "url": DEBOER_CBS,
                "asOf": None,
                "notes": "90% of remaining contract if fired without cause, no duty to mitigate — we do not invent the remainder.",
                "rule": "90% of remaining contract, no duty to mitigate (article quoting trustee announcement).",
                "coachSide": "Coach-side LD: $10 million in January 2027, $8 million in January 2028, $6 million in January 2029.",
            },
            "term": {
                "confidence": "reported",
                "asOf": "2026-08",
                "source": "Wikipedia season-page infobox; Alabama Athletics / CBS trustee announcement",
                "url": "https://en.wikipedia.org/wiki/2026_Alabama_Crimson_Tide_football_team",
                "through": "2033",
                "yearsRemaining": 7,
                "notes": f"{CHAIR} Seven-year extension through 2033. School-side without-cause is 90% of remaining contract with no duty to mitigate.",
            },
            "contractUrl": DEBOER_CBS,
            "contract": {
                "label": "CBS Sports — DeBoer trustee compensation announcement (April 22, 2026)",
                "url": DEBOER_CBS,
            },
        },
    )

    apply_year_football(
        by_id["ohio-state"]["coachesByYear"]["2026"]["football"],
        {
            "pay": {
                "value": 12_500_000,
                "year": 2026,
                "confidence": "reported",
                "source": "247Sports / Bucknuts (May 26, 2026), quoting Day’s FOIA employment agreement: $12.5 million basic annual compensation",
                "url": DAY_247,
                "asOf": "2026-05-26",
                "notes": (
                    f"{CHAIR} 2026 article quotes the public-records contract. "
                    "OSU News (Feb. 2025) named the same $12.5 million total annual compensation with a $2 million base. "
                    "Columbus Dispatch term sheet: base $2.0M + media $7.25M + sponsorship $1.0M + apparel $1.25M + $1.0M Jan. 31 retention. "
                    "School-named $12.5M includes that retention. Academic / CFP bonuses ($450k of 2025-26 incentives cited) are not in this cell."
                ),
                "breakdown": [
                    {"label": "Base", "value": 2_000_000},
                    {"label": "Media services", "value": 7_250_000},
                    {"label": "Sponsorship services", "value": 1_000_000},
                    {"label": "Apparel / shoe / equipment", "value": 1_250_000},
                    {"label": "Retention award (Jan. 31)", "value": 1_000_000},
                ],
                "schedule": None,
                "incentives": [
                    {
                        "label": "Academic GPA bonus",
                        "value": 100_000,
                        "notes": "2025-26: ~3.4 GPA triggered $100k. Not in annual pay.",
                    },
                    {
                        "label": "CFP / Big Ten / coach-of-year ladder",
                        "notes": "Article lists CFP and coach-of-year bonuses. Not included in annual pay.",
                    },
                ],
                "baseOnly": None,
            },
            "buyout": {
                "value": None,
                "confidence": "pending",
                "source": "247Sports / Bucknuts (May 26, 2026), quoting Day FOIA employment agreement",
                "url": DAY_247,
                "asOf": None,
                "notes": "2026 article quotes the EA for pay and incentives; it does not publish a current-dollar without-cause overhang. We do not invent one.",
            },
            "term": {
                "confidence": "reported",
                "asOf": "2026-08",
                "source": "Wikipedia season-page infobox; Day FOIA EA via 247Sports",
                "url": "https://en.wikipedia.org/wiki/2026_Ohio_State_Buckeyes_football_team",
                "through": "2031",
                "yearsRemaining": 5,
                "notes": f"{CHAIR} Seven-year deal through the 2031 season / Jan. 31, 2032 on the cited EA.",
            },
            "contractUrl": DAY_247,
            "contract": {
                "label": "247Sports / Bucknuts — Day employment agreement via public records (May 26, 2026)",
                "url": DAY_247,
            },
        },
    )

    # --- tape ---
    new_tape = [
        tape_item(
            id="wisconsin-apparel-under-armour-2025-11-25",
            date="2025-11-25",
            school="wisconsin",
            schoolName="Wisconsin",
            kind="apparel",
            headline="UW Board of Regents packet: Under Armour renewal is $3.8 million cash + $3.2 million wholesale product ($7.0 million AAV). Total minimum $104.5 million over 7 years + 3-year option.",
            figure=7_000_000,
            confidence="reported",
            source={"label": "UW System Board of Regents — Nov. 25, 2025 special meeting packet", "url": WISC_PDF},
            field="layers.apparel.annualValue",
        ),
        tape_item(
            id="kentucky-apparel-nike-2025-11-25",
            date="2025-11-25",
            school="kentucky",
            schoolName="Kentucky",
            kind="apparel",
            headline="UW Board of Regents packet names Kentucky’s ten-year Nike renewal: $7 million annual product allowance (to $7.5 million in year five), no cash.",
            figure=7_000_000,
            confidence="reported",
            source={"label": "UW System Board of Regents — Nov. 25, 2025 special meeting packet", "url": WISC_PDF},
            field="layers.apparel.annualValue",
        ),
        tape_item(
            id="kentucky-naming-kroger-2026-06-25",
            date="2026-06-25",
            school="kentucky",
            schoolName="Kentucky",
            kind="naming",
            headline="Arkansas Democrat-Gazette naming-rights census: Kroger Field is a 12-year deal worth $1.85 million annually ($22 million total).",
            figure=1_850_000,
            confidence="reported",
            source={"label": "Arkansas Democrat-Gazette — college stadium naming census", "url": KROGER},
            field="layers.apparel.naming",
        ),
        tape_item(
            id="indiana-contract-cignetti-2026-03-02",
            date="2026-03-02",
            school="indiana",
            schoolName="Indiana",
            kind="contract",
            headline="247Sports publishes Curt Cignetti’s Feb. 4, 2026 FOIA MOU: $12.025 million in 2026 (base $500k + promotional $11.525M). AP/IU average is $13.2 million including a $1 million retention bonus left out of the year cell.",
            figure=12_025_000,
            confidence="reported",
            source={"label": "247Sports / Peegs.com — Cignetti Feb. 4, 2026 MOU via open records", "url": CIGNETTI_247},
            field="coaches.football.pay",
        ),
        tape_item(
            id="alabama-contract-deboer-2026-04-22",
            date="2026-04-22",
            school="alabama",
            schoolName="Alabama",
            kind="contract",
            headline="CBS Sports: Alabama trustees approve Kalen DeBoer’s seven-year extension at $12.5 million annual salary through 2033. School-side without-cause is 90% remaining, no mitigate — dollar overhang left pending.",
            figure=12_500_000,
            confidence="reported",
            source={"label": "CBS Sports — DeBoer trustee compensation announcement", "url": DEBOER_CBS},
            field="coaches.football.pay",
        ),
        tape_item(
            id="ohio-state-contract-day-2026-05-26",
            date="2026-05-26",
            school="ohio-state",
            schoolName="Ohio State",
            kind="contract",
            headline="247Sports quotes Ryan Day’s FOIA employment agreement: $12.5 million basic annual compensation through 2031. Academic / CFP bonuses stay out of the year cell.",
            figure=12_500_000,
            confidence="reported",
            source={"label": "247Sports / Bucknuts — Day EA via public records", "url": DAY_247},
            field="coaches.football.pay",
        ),
    ]

    existing_ids = {it["id"] for it in tape_doc["items"]}
    for it in new_tape:
        if it["id"] in existing_ids:
            raise SystemExit(f"tape id already exists: {it['id']}")
    tape_doc["items"] = new_tape + tape_doc["items"]
    tape_doc["meta"]["itemCount"] = len(tape_doc["items"])
    tape_doc["meta"]["asOf"] = "2026-08-27"
    layers_doc["meta"]["asOf"] = "2026-08-27"

    # --- refuse regressions ---
    after = {s["id"]: s for s in schools_doc["schools"]}
    for sid, expected in BOOKED_MUST.items():
        got = after[sid]["nil"]["booked"]["value"]
        if got != expected:
            raise SystemExit(f"booked NIL drifted {sid}: {got}")
        if after[sid]["nil"] != before_schools[sid]["nil"]:
            raise SystemExit(f"nil object drifted {sid}")
    for sid in after:
        if "collective990" in before_schools[sid].get("nil", {}):
            if after[sid]["nil"]["collective990"] != before_schools[sid]["nil"]["collective990"]:
                raise SystemExit(f"collective990 drifted {sid}")
        if after[sid]["coaches"]["football"].get("pay") != before_schools[sid]["coaches"]["football"].get("pay"):
            raise SystemExit(f"current HC pay drifted {sid}")
    for sid, expected in EXISTING_APPAREL_AAV.items():
        got = layers[sid]["apparel"]["annualValue"]["value"]
        if got != expected:
            raise SystemExit(f"apparel AAV drifted {sid}: {got}")
        if layers[sid]["apparel"]["annualValue"] != before_layers[sid]["apparel"]["annualValue"]:
            raise SystemExit(f"existing apparel annualValue object drifted {sid}")

    # write: schools via json dump (indent-2, unicode) then copy; layers same as existing ascii
    dump(SRC / "schools.json", schools_doc, ascii_ok=False)
    dump(SRC / "tape.json", tape_doc, ascii_ok=True)
    dump(PUB / "schools.json", schools_doc, ascii_ok=False)
    dump(PUB / "tape.json", tape_doc, ascii_ok=True)
    dump(PUB / "layers.json", layers_doc, ascii_ok=True)

    print("apparel AAV", {sid: layers[sid]["apparel"]["annualValue"]["value"] for sid in ("wisconsin", "kentucky")})
    print("naming", {sid: [n.get("sponsor") for n in layers[sid]["apparel"]["naming"]] for sid in ("kentucky", "houston", "arizona-state")})
    print(
        "2026 pay",
        {sid: after[sid]["coachesByYear"]["2026"]["football"]["pay"]["value"] for sid in ("indiana", "alabama", "ohio-state")},
    )
    print("tape items", tape_doc["meta"]["itemCount"])


if __name__ == "__main__":
    main()
