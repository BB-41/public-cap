#!/usr/bin/env python3
"""Third-pass 2026-08-27 Public Cap hunt.

Cited dollars only. Does not overwrite existing AD pay, House booked,
Kentucky preCap, Beamer 2026, Pitt fees, or privates.
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

JC_MCC = "https://www.jconline.com/story/sports/college/purdue/2026/08/07/purdue-athletic-director-tommy-mcclelland-contract-salary-buyout-incentives-term-sheet/91187650007/"
RU_ZINN = "https://governingboards.rutgers.edu/sites/default/files/2026-03/Special%20BoG%2025-0730%20-%20FINAL.pdf"
TD_ALFORD = "https://www.tallahassee.com/story/sports/college/fsu/2024/08/22/florida-state-ad-michael-alford-contract-extension/74898716007/"
CU_LOVO = "https://cu.diligent.community/document/4398d6a0-4379-4c4e-a326-b5a92b8ab2e1/"
KU_GOFF = "https://news.ku.edu/sites/news/files/2024-05/Travis%20Goff%20Amended%20and%20Restated%20Employment%20Agreement%2C%202024_Redactedv2.pdf"
AP_WEIB = "https://apnews.com/article/oklahoma-state-chad-weiberg-new-contract-1cf20bf7f4f7630e2e34dc80b30fda25"
AJC_ALPERT = "https://www.ajc.com/sports/2025/11/georgia-tech-signed-new-athletic-director-to-5-year-contract/"
FSU_MFRS = "https://s3.documentcloud.org/documents/26597309/fsu-ncaa-financial-report-fy25.pdf"
KU_MFRS = "https://kuathletics.com/documents/download/2026/1/15/FY_24-25_NCAA_Final_Report.pdf"
MIZZ_MFRS = "https://www.missouribusinessalert.com/industries/banking_finance/mizzou-athletics-reports-9-million-operating-deficit-for-fiscal-year-2025/article_7bd733a1-642b-5806-9c60-152df863d34c.html"
MSU_MFRS = "https://cdispatch.com/news/how-big-is-msu-athletics-165-million-big-a-record-number/"


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
        if not name:
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


def apply_precap(school, spec):
    nil = school.setdefault("nil", {})
    existing = nil.get("preCap") if isinstance(nil.get("preCap"), dict) else {}
    if existing.get("value") is not None:
        raise SystemExit(f"refusing to overwrite preCap for {school['id']}: {existing}")
    nil["preCap"] = spec


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
    if (by_id["kentucky"].get("nil") or {}).get("preCap", {}).get("value") is not None:
        raise SystemExit("Kentucky preCap must stay empty")
    if by_id["arizona"]["staff"]["athleticDirector"]["pay"]["value"] != 1_350_000:
        raise SystemExit("Arizona AD drifted")
    if by_id["clemson"]["staff"]["athleticDirector"]["pay"]["value"] != 1_350_000:
        raise SystemExit("Clemson AD drifted")

    apply_ad(
        by_id["purdue"],
        pay=money(
            1_000_000,
            "Indianapolis Star / Journal & Courier (Aug. 7, 2026), quoting McClelland MOU obtained by IndyStar; Board committee approved the term sheet",
            JC_MCC,
            "2026-08-07",
            "MOU: $1 million base in 2026-27, +$50,000 each year after. $250,000 deferred and up to $300,000 incentives not added. Same person as the 2026 chair.",
            year=2026,
        ),
    )
    apply_ad(
        by_id["rutgers"],
        pay=money(
            1_350_000,
            "Rutgers Board of Governors minutes, special meeting July 30, 2025",
            RU_ZINN,
            "2025-07-30",
            "Board: 5-year contract, base $1,350,000 in Contract Year 1. $50,000 annual increases only after a positive evaluation — 2026 step not invented. Retention / performance bonuses not added.",
            year=2025,
        ),
    )
    apply_ad(
        by_id["florida-state"],
        pay=money(
            1_750_000,
            "Tallahassee Democrat (Aug. 22, 2024), quoting Alford July 1, 2024 extension",
            TD_ALFORD,
            "2024-08-22",
            "Published schedule: $1.45 million in 2024-25, +$150,000 each year to $1.9 million in 2027-28. 2026-27 step is $1,750,000. Facility / performance bonuses not added.",
            year=2026,
        ),
    )
    apply_ad(
        by_id["colorado"],
        pay=money(
            1_200_000,
            "University of Colorado Board of Regents — Lovo employment agreement (Jan. 1, 2026–Dec. 31, 2030)",
            CU_LOVO,
            "2026-01-01",
            "Contract Year is the calendar year. 2026 guaranteed $1.2 million ($600,000 base + $300,000 media + $300,000 community). Incentives not added.",
            year=2026,
            extra={
                "breakdown": [
                    {"label": "Base (2026)", "value": 600_000},
                    {"label": "Media supplemental", "value": 300_000},
                    {"label": "Community-relations supplemental", "value": 300_000},
                ]
            },
        ),
    )
    apply_ad(
        by_id["kansas"],
        pay=money(
            1_380_000,
            "University of Kansas amended employment agreement (effective Jan. 1, 2024)",
            KU_GOFF,
            "2024-01-01",
            "Published base-salary schedule: 6/1/26–5/31/27 $1,380,000. Retention bonuses not added. Same person as the 2026 chair.",
            year=2026,
        ),
    )
    apply_ad(
        by_id["oklahoma-state"],
        pay=money(
            750_000,
            "Associated Press (Oct. 24, 2025), quoting OSU/A&M Board of Regents approval of Weiberg extension",
            AP_WEIB,
            "2025-10-24",
            "Board-approved extension keeps previous salary of $750,000 a year through 2029. Flat annual dollar — no invented step. Incentives not added.",
            year=2026,
        ),
    )
    apply_ad(
        by_id["georgia-tech"],
        pay=money(
            800_000,
            "Atlanta Journal-Constitution (Nov. 17, 2025), quoting Alpert MOU obtained via open records",
            AJC_ALPERT,
            "2025-11-17",
            "MOU: first-year salary $700,000 (2025-26) + $100,000 each year through June 30, 2030. 2026-27 step is $800,000. $200,000 unspecified supplemental and performance incentives not added.",
            year=2026,
        ),
    )

    item44 = {
        "florida-state": {
            "value": 0,
            "confidence": "reported",
            "source": "Florida State FY2025 NCAA Membership Financial Report — Item 44 Institutional NIL Revenue Share $0",
            "url": FSU_MFRS,
            "asOf": "2026-01-31",
            "fiscalYear": "FY2025",
            "notes": "Hosted DocumentCloud MFRS PDF (Tallahassee Democrat) prints Item 44 as $0 for FY2025. Booked $0 because the report shows $0. Does not replace a House Year 1 spent total.",
        },
        "kansas": {
            "value": 0,
            "confidence": "reported",
            "source": "Kansas FY2025 NCAA Membership Financial Report — Item 44 Institutional NIL Revenue Share $0",
            "url": KU_MFRS,
            "asOf": "2026-01-15",
            "fiscalYear": "FY2025",
            "notes": "Hosted MFRS PDF prints Item 44 as $0 for Reporting Year (FY) 2025. Booked $0 because the report shows $0. Does not replace a House Year 1 spent total.",
        },
        "missouri": {
            "value": 0,
            "confidence": "reported",
            "source": "Missouri Business Alert (Jan. 21, 2026), quoting Mizzou FY2025 NCAA report Item 44 Institutional NIL Revenue Share $0",
            "url": MIZZ_MFRS,
            "asOf": "2026-01-21",
            "fiscalYear": "FY2025",
            "notes": "Newsroom quoting the FY2025 report: Institutional NIL Revenue Share $0 for every sport. Booked $0 because the report shows $0. Does not replace a House Year 1 spent total.",
        },
        "mississippi-state": {
            "value": 0,
            "confidence": "reported",
            "source": "The Dispatch (Feb. 14, 2026), quoting MSU FY2025 NCAA membership report obtained via public records",
            "url": MSU_MFRS,
            "asOf": "2026-02-14",
            "fiscalYear": "FY2025",
            "notes": "Newsroom quoting the obtained FY2025 report: no Institutional NIL Revenue Share expenses because revenue sharing started July 1. Booked $0 because the report shows $0. Does not replace a House Year 1 spent total.",
        },
    }
    for sid, spec in item44.items():
        apply_precap(by_id[sid], spec)

    new_items = [
        {
            "id": "florida-state-precap-item44-fy2025",
            "date": "2026-01-31",
            "school": "florida-state",
            "schoolName": "Florida State",
            "kind": "filing",
            "headline": "Florida State FY2025 NCAA Membership Financial Report Item 44 Institutional NIL Revenue Share is $0.",
            "figure": 0,
            "confidence": "reported",
            "source": {"label": "FSU FY2025 NCAA MFRS PDF (DocumentCloud / Tallahassee Democrat)", "url": FSU_MFRS},
            "field": "nil.preCap",
        },
        {
            "id": "kansas-precap-item44-fy2025",
            "date": "2026-01-15",
            "school": "kansas",
            "schoolName": "Kansas",
            "kind": "filing",
            "headline": "Kansas FY2025 NCAA Membership Financial Report Item 44 Institutional NIL Revenue Share is $0.",
            "figure": 0,
            "confidence": "reported",
            "source": {"label": "Kansas FY2025 NCAA MFRS PDF", "url": KU_MFRS},
            "field": "nil.preCap",
        },
        {
            "id": "missouri-precap-item44-fy2025",
            "date": "2026-01-21",
            "school": "missouri",
            "schoolName": "Missouri",
            "kind": "filing",
            "headline": "Missouri Business Alert quotes Mizzou FY2025 Item 44 Institutional NIL Revenue Share as $0.",
            "figure": 0,
            "confidence": "reported",
            "source": {"label": "Missouri Business Alert — Mizzou FY2025 NCAA report", "url": MIZZ_MFRS},
            "field": "nil.preCap",
        },
        {
            "id": "mississippi-state-precap-item44-fy2025",
            "date": "2026-02-14",
            "school": "mississippi-state",
            "schoolName": "Mississippi State",
            "kind": "filing",
            "headline": "The Dispatch quotes MSU FY2025 NCAA membership report: no Institutional NIL Revenue Share expenses.",
            "figure": 0,
            "confidence": "reported",
            "source": {"label": "The Dispatch — MSU FY2025 NCAA report via public records", "url": MSU_MFRS},
            "field": "nil.preCap",
        },
    ]
    existing_ids = {it["id"] for it in tape_doc["items"]}
    add = [it for it in new_items if it["id"] not in existing_ids]
    tape_doc["items"] = add + tape_doc["items"]
    tape_doc["meta"]["itemCount"] = len(tape_doc["items"])

    new_cites = [
        {"id": "purdue", "name": "Tommy McClelland", "pay": 1_000_000, "year": 2026, "asOf": "2026-08-07", "source": "Indianapolis Star / Journal & Courier — McClelland MOU", "url": JC_MCC, "notes": "2026-27 base $1.0M. Deferred not added.", "confidence": "reported"},
        {"id": "rutgers", "name": "Keli Zinn", "pay": 1_350_000, "year": 2025, "asOf": "2025-07-30", "source": "Rutgers Board of Governors minutes", "url": RU_ZINN, "notes": "Contract Year 1 $1.35M. Evaluation-gated steps not invented.", "confidence": "reported"},
        {"id": "florida-state", "name": "Michael Alford", "pay": 1_750_000, "year": 2026, "asOf": "2024-08-22", "source": "Tallahassee Democrat — Alford extension schedule", "url": TD_ALFORD, "notes": "2026-27 step $1.75M from published +$150k schedule.", "confidence": "reported"},
        {"id": "colorado", "name": "Fernando Lovo", "pay": 1_200_000, "year": 2026, "asOf": "2026-01-01", "source": "CU Board of Regents Lovo EA", "url": CU_LOVO, "notes": "2026 guaranteed $1.2M.", "confidence": "reported"},
        {"id": "kansas", "name": "Travis Goff", "pay": 1_380_000, "year": 2026, "asOf": "2024-01-01", "source": "KU amended EA base-salary schedule", "url": KU_GOFF, "notes": "6/1/26–5/31/27 $1.38M.", "confidence": "reported"},
        {"id": "oklahoma-state", "name": "Chad Weiberg", "pay": 750_000, "year": 2026, "asOf": "2025-10-24", "source": "AP — OSU/A&M Board of Regents", "url": AP_WEIB, "notes": "Flat $750k through 2029.", "confidence": "reported"},
        {"id": "georgia-tech", "name": "Ryan Alpert", "pay": 800_000, "year": 2026, "asOf": "2025-11-17", "source": "AJC — Alpert open-records MOU", "url": AJC_ALPERT, "notes": "2026-27 step $800k. Supplemental not added.", "confidence": "reported"},
    ]
    have = {(c["id"], c.get("name"), c.get("year")) for c in cites_doc["cites"]}
    for row in new_cites:
        if (row["id"], row["name"], row["year"]) not in have:
            cites_doc["cites"].append(row)

    checks = {
        "purdue": 1_000_000,
        "rutgers": 1_350_000,
        "florida-state": 1_750_000,
        "colorado": 1_200_000,
        "kansas": 1_380_000,
        "oklahoma-state": 750_000,
        "georgia-tech": 800_000,
    }
    for sid, val in checks.items():
        if by_id[sid]["staff"]["athleticDirector"]["pay"]["value"] != val:
            raise SystemExit(f"{sid} AD miss")
    for sid in item44:
        if by_id[sid]["nil"]["preCap"]["value"] != 0:
            raise SystemExit(f"{sid} Item 44 miss")
    if (by_id["kentucky"].get("nil") or {}).get("preCap", {}).get("value") is not None:
        raise SystemExit("Kentucky preCap filled")
    if by_id["louisville"]["nil"]["booked"]["value"] != 32_900_000:
        raise SystemExit("Louisville booked drifted")

    dump_json(SRC / "schools.json", schools_doc, ascii_ok=False)
    dump_json(PUB / "schools.json", schools_doc, ascii_ok=False)
    dump_json(SRC / "tape.json", tape_doc, ascii_ok=True)
    dump_json(PUB / "tape.json", tape_doc, ascii_ok=True)
    dump_json(ROOT / "scripts" / "ad-cites.json", cites_doc, ascii_ok=False)
    print("ingested pass-3 AD / Item 44")


if __name__ == "__main__":
    main()
