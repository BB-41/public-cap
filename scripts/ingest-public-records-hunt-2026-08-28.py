#!/usr/bin/env python3
"""Ingest the one file-quoted cell from the 2026-08-28 public-records hunt.

Minnesota Mark Coyle Contract Year Seven base from the June 11, 2026
Regents finance docket (v3). Does not overwrite booked NIL, collective990,
studentFees, existing AD pay, existing 2026 HC current-deal pay, buyout.steps,
apparel AAV, or media. Does not stamp USA TODAY 2025 onto a 2026 year-key.
Does not book Venables AAV. Does not invent dollars.
"""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data"
PUB = ROOT / "public" / "data"

UMN_COYLE = "https://regents.umn.edu/sites/regents.umn.edu/files/2026-06/docket-fin-june2026-v3.pdf"

BOOKED_MUST = {
    "louisville": 32_900_000,
    "kentucky": 18_000_000,
    "ucla": 20_500_000,
    "california": 20_500_000,
    "texas": 13_500_000,
}


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


def apply_ad(school, *, pay=None):
    staff = school.setdefault("staff", {})
    ad = staff.get("athleticDirector") or {}
    if pay is not None:
        existing = ad.get("pay") if isinstance(ad.get("pay"), dict) else {}
        if existing.get("value") is not None:
            raise SystemExit(f"refusing to overwrite AD pay for {school['id']}: {existing}")
        ad["pay"] = pay
        ad["notes"] = (
            "Current athletics-director chair as of the 2026-08-28 desk. "
            "Pay is year-pinned on staff.athleticDirector.pay."
        )
    staff["athleticDirector"] = ad
    by = school.get("staffByYear") or {}
    year_2026 = by.get("2026")
    if isinstance(year_2026, dict):
        year_2026["athleticDirector"] = deepcopy(ad)
        by["2026"] = year_2026
        school["staffByYear"] = by


def main() -> None:
    schools_doc = json.loads((SRC / "schools.json").read_text())
    tape_doc = json.loads((SRC / "tape.json").read_text())
    cites_doc = json.loads((ROOT / "scripts" / "ad-cites.json").read_text())
    before = deepcopy({s["id"]: s for s in schools_doc["schools"]})
    by_id = {s["id"]: s for s in schools_doc["schools"]}

    for sid, expected in BOOKED_MUST.items():
        if by_id[sid]["nil"]["booked"]["value"] != expected:
            raise SystemExit(f"refusing: {sid} booked drifted")
    if by_id["minnesota"]["staff"]["athleticDirector"].get("pay", {}).get("value") is not None:
        raise SystemExit("Minnesota AD already booked")
    if by_id["minnesota"]["staff"]["athleticDirector"].get("name") != "Mark Coyle":
        raise SystemExit("Minnesota AD chair is not Mark Coyle")
    if by_id["oklahoma"]["coachesByYear"]["2026"]["football"]["pay"].get("value") is not None:
        raise SystemExit("Venables 2026 must stay empty")
    if by_id["california"]["coachesByYear"]["2026"]["football"]["pay"].get("value") is not None:
        raise SystemExit("Lupoi 2026 must stay empty")
    for sid in ("wisconsin", "iowa", "washington"):
        pay = by_id[sid]["coachesByYear"]["2026"]["football"]["pay"]
        if pay.get("value") is not None:
            raise SystemExit(f"{sid} 2026 HC already booked")
    if (by_id["lsu"].get("nil") or {}).get("preCap", {}).get("value") is not None:
        raise SystemExit("LSU preCap must stay empty — no hosted Item 44 on this hunt")
    if (by_id["florida"].get("nil") or {}).get("preCap", {}).get("value") is not None:
        raise SystemExit("Florida preCap must stay empty")
    if (by_id["michigan"].get("nil") or {}).get("preCap", {}).get("value") is not None:
        raise SystemExit("Michigan preCap must stay empty")
    if by_id["kentucky"]["nil"]["booked"]["value"] != 18_000_000:
        raise SystemExit("Kentucky booked drifted")

    apply_ad(
        by_id["minnesota"],
        pay=money(
            2_000_000,
            "U. of Minnesota Regents finance docket (June 11, 2026) — Coyle third amendment",
            UMN_COYLE,
            "2026-06-11",
            (
                "Contract Year Seven (July 1, 2026–June 30, 2027) annual base $2,000,000 on the "
                "June 11, 2026 third-amendment summary. Term through June 30, 2032. Longevity bonus "
                "($250,000 vesting June 30, 2027) and supplemental retirement ($180,000) are not added. "
                "Not the Star Tribune $2.76M six-year average. Same person as the 2026 chair."
            ),
            year=2026,
        ),
    )

    new_items = [
        {
            "id": "minnesota-ad-coyle-2026-third-amendment",
            "date": "2026-06-11",
            "school": "minnesota",
            "schoolName": "Minnesota",
            "kind": "filing",
            "headline": "Minnesota Regents June 11, 2026 finance docket (v3) books Mark Coyle Contract Year Seven base at $2,000,000.",
            "figure": 2_000_000,
            "confidence": "reported",
            "source": {
                "label": "U. of Minnesota Regents finance docket (June 11, 2026) — Coyle third amendment",
                "url": UMN_COYLE,
            },
            "field": "staff.athleticDirector.pay",
        },
    ]
    existing_ids = {it["id"] for it in tape_doc["items"]}
    add = [it for it in new_items if it["id"] not in existing_ids]
    tape_doc["items"] = add + tape_doc["items"]
    tape_doc["meta"]["itemCount"] = len(tape_doc["items"])

    cite = {
        "id": "minnesota",
        "name": "Mark Coyle",
        "pay": 2_000_000,
        "year": 2026,
        "asOf": "2026-06-11",
        "source": "U. of Minnesota Regents finance docket — Coyle third amendment",
        "url": UMN_COYLE,
        "notes": "CY7 (2026-27) base $2.0M. Longevity / supplemental retirement not added. Not the $2.76M AAV.",
        "confidence": "reported",
    }
    have = {(c["id"], c.get("name"), c.get("year")) for c in cites_doc["cites"]}
    if (cite["id"], cite["name"], cite["year"]) not in have:
        cites_doc["cites"].append(cite)

    if by_id["minnesota"]["staff"]["athleticDirector"]["pay"]["value"] != 2_000_000:
        raise SystemExit("Coyle AD miss")
    if by_id["minnesota"]["staffByYear"]["2026"]["athleticDirector"]["pay"]["value"] != 2_000_000:
        raise SystemExit("Coyle 2026 staff-year miss")
    for sid, expected in BOOKED_MUST.items():
        if by_id[sid]["nil"]["booked"]["value"] != expected:
            raise SystemExit(f"{sid} booked drifted after ingest")
    if before["wisconsin"]["coachesByYear"]["2026"]["football"]["pay"] != by_id["wisconsin"]["coachesByYear"]["2026"]["football"]["pay"]:
        raise SystemExit("Wisconsin 2026 HC drifted")
    if before["lsu"]["coaches"]["football"]["pay"] != by_id["lsu"]["coaches"]["football"]["pay"]:
        raise SystemExit("LSU Kiffin pay drifted")

    dump_json(SRC / "schools.json", schools_doc, ascii_ok=False)
    dump_json(PUB / "schools.json", schools_doc, ascii_ok=False)
    dump_json(SRC / "tape.json", tape_doc, ascii_ok=True)
    dump_json(PUB / "tape.json", tape_doc, ascii_ok=True)
    dump_json(ROOT / "scripts" / "ad-cites.json", cites_doc, ascii_ok=False)
    print("ingested Minnesota Coyle CY7 $2,000,000")


if __name__ == "__main__":
    main()
