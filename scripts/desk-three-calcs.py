#!/usr/bin/env python3
"""Three desk calculations from data already on the file.

1) Stamp coaches.football.pay onto coachesByYear.2026.football.pay when the
   chair matches and the current cell is a 2026 / current-deal cite
   (PDF, article quoting the EA, or a 2026-asOf source). Never copy a
   USA TODAY 2024/2025 snapshot. Leave privates pending unless independently
   cited. Do not change chair names.

2) Write buyout.steps [{asOf, remaining, contractYear, notes}] only where a
   linked PDF (or already-parsed TAC / guaranteed table) plus the school-side
   percent/remaining-sum rule already produces a dollar on this desk.
   Do not mint a staircase from a bare percent.

3) House remaining room = published House Year 1 cap minus booked House spent,
   only for the five schools with a real House Year 1 spent cell.
"""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHOOLS = ROOT / "data" / "schools.json"
BUYOUTS = ROOT / "data" / "buyouts.json"
NAME_ALIASES = {"elidrinkwitz": "eliahdrinkwitz"}

# Already-parsed PDF remaining-sum / TAC×rule tapes (dollars already on the desk).
STEP_TAPES = {
    "florida-state": [
        {
            "asOf": "2026-01-01",
            "remaining": 58_192_500,
            "contractYear": "CY7 (2026)",
            "through": "2026-12-31",
            "notes": (
                "Derived from the 6th Amendment CY7–12 TAC table "
                "($10.3 / $10.45 / $10.6 / $10.75 / $10.9 / $11.05 million = $64.05 million) "
                "× 85% + CY7 reinstatement $3.75 million (7th Amendment V.E.). "
                "$64.05 million × 85% + $3.75 million = $58,192,500. "
                "Full remaining years at the start of 2026 — the file allows daily proration of "
                "partial years; this desk does not mint a mid-year dollar. "
                "PDF: https://s3.documentcloud.org/documents/25460174/norvell-mike-7th-amendment-to-2019-ea-final-12.pdf"
            ),
        },
        {
            "asOf": "2027-01-01",
            "remaining": 48_687_500,
            "contractYear": "CY8 (2027)",
            "through": "2027-12-31",
            "notes": (
                "Derived from remaining CY8–12 TAC ($53.75 million) × 85% + CY8 reinstatement $3.0 million "
                "= $48,687,500. PDF: https://s3.documentcloud.org/documents/25460174/norvell-mike-7th-amendment-to-2019-ea-final-12.pdf"
            ),
        },
        {
            "asOf": "2028-01-01",
            "remaining": 39_055_000,
            "contractYear": "CY9 (2028)",
            "through": "2028-12-31",
            "notes": (
                "Derived from remaining CY9–12 TAC ($43.3 million) × 85% + CY9 reinstatement $2.25 million "
                "= $39,055,000. PDF: https://s3.documentcloud.org/documents/25460174/norvell-mike-7th-amendment-to-2019-ea-final-12.pdf"
            ),
        },
        {
            "asOf": "2029-01-01",
            "remaining": 29_295_000,
            "contractYear": "CY10 (2029)",
            "through": "2029-12-31",
            "notes": (
                "Derived from remaining CY10–12 TAC ($32.7 million) × 85% + CY10 reinstatement $1.5 million "
                "= $29,295,000. PDF: https://s3.documentcloud.org/documents/25460174/norvell-mike-7th-amendment-to-2019-ea-final-12.pdf"
            ),
        },
        {
            "asOf": "2030-01-01",
            "remaining": 19_407_500,
            "contractYear": "CY11 (2030)",
            "through": "2030-12-31",
            "notes": (
                "Derived from remaining CY11–12 TAC ($21.95 million) × 85% + CY11 reinstatement $0.75 million "
                "= $19,407,500. PDF: https://s3.documentcloud.org/documents/25460174/norvell-mike-7th-amendment-to-2019-ea-final-12.pdf"
            ),
        },
        {
            "asOf": "2031-01-01",
            "remaining": 9_392_500,
            "contractYear": "CY12 (2031)",
            "through": "2031-12-31",
            "notes": (
                "Derived from remaining CY12 TAC ($11.05 million) × 85% + CY12 reinstatement $0 "
                "= $9,392,500. PDF: https://s3.documentcloud.org/documents/25460174/norvell-mike-7th-amendment-to-2019-ea-final-12.pdf"
            ),
        },
    ],
    "penn-state": [
        {
            "asOf": "2026-01-01",
            "remaining": 70_500_000,
            "contractYear": "2026",
            "through": "2026-12-31",
            "notes": (
                "Derived from the term-sheet Guaranteed Compensation table "
                "($8.0 / $8.25 / $8.5 / $9.0 / $9.0 / $9.25 / $9.25 / $9.25 million) "
                "× 100% remaining. Start-of-2026 remaining sum = $70,500,000. "
                "Retention bonus is not in Guaranteed Compensation. "
                "PDF: https://gopsusports.com/documents/2eb86a0c-2980-40cf-b0df-7cc2f56e13f7.pdf"
            ),
        },
        {
            "asOf": "2027-01-01",
            "remaining": 62_500_000,
            "contractYear": "2027",
            "through": "2027-12-31",
            "notes": (
                "100% of remaining 2027–2033 Guaranteed Compensation = $62,500,000. "
                "PDF: https://gopsusports.com/documents/2eb86a0c-2980-40cf-b0df-7cc2f56e13f7.pdf"
            ),
        },
        {
            "asOf": "2028-01-01",
            "remaining": 54_250_000,
            "contractYear": "2028",
            "through": "2028-12-31",
            "notes": (
                "100% of remaining 2028–2033 Guaranteed Compensation = $54,250,000. "
                "PDF: https://gopsusports.com/documents/2eb86a0c-2980-40cf-b0df-7cc2f56e13f7.pdf"
            ),
        },
        {
            "asOf": "2029-01-01",
            "remaining": 45_750_000,
            "contractYear": "2029",
            "through": "2029-12-31",
            "notes": (
                "100% of remaining 2029–2033 Guaranteed Compensation = $45,750,000. "
                "PDF: https://gopsusports.com/documents/2eb86a0c-2980-40cf-b0df-7cc2f56e13f7.pdf"
            ),
        },
        {
            "asOf": "2030-01-01",
            "remaining": 36_750_000,
            "contractYear": "2030",
            "through": "2030-12-31",
            "notes": (
                "100% of remaining 2030–2033 Guaranteed Compensation = $36,750,000. "
                "PDF: https://gopsusports.com/documents/2eb86a0c-2980-40cf-b0df-7cc2f56e13f7.pdf"
            ),
        },
        {
            "asOf": "2031-01-01",
            "remaining": 27_750_000,
            "contractYear": "2031",
            "through": "2031-12-31",
            "notes": (
                "100% of remaining 2031–2033 Guaranteed Compensation = $27,750,000. "
                "PDF: https://gopsusports.com/documents/2eb86a0c-2980-40cf-b0df-7cc2f56e13f7.pdf"
            ),
        },
        {
            "asOf": "2032-01-01",
            "remaining": 18_500_000,
            "contractYear": "2032",
            "through": "2032-12-31",
            "notes": (
                "100% of remaining 2032–2033 Guaranteed Compensation = $18,500,000. "
                "PDF: https://gopsusports.com/documents/2eb86a0c-2980-40cf-b0df-7cc2f56e13f7.pdf"
            ),
        },
        {
            "asOf": "2033-01-01",
            "remaining": 9_250_000,
            "contractYear": "2033",
            "through": "2033-12-31",
            "notes": (
                "100% of remaining 2033 Guaranteed Compensation = $9,250,000. "
                "PDF: https://gopsusports.com/documents/2eb86a0c-2980-40cf-b0df-7cc2f56e13f7.pdf"
            ),
        },
    ],
    "clemson": [
        {
            "asOf": "2026-01-01",
            "remaining": 57_000_000,
            "contractYear": "2026",
            "through": "2026-12-31",
            "notes": (
                "Term-sheet schedule amount: $57,000,000 flat if terminated in 2026 — "
                "not remaining-year math. "
                "PDF: https://sportstalksc.com/wp-content/uploads/2022/09/Swinney-Term-Sheet-Sept-2022.pdf"
            ),
        },
        {
            "asOf": "2027-01-01",
            "remaining": 60_000_000,
            "contractYear": "2027",
            "through": "2027-12-31",
            "notes": (
                "Remaining Base + Supplemental + Licensing for 2027–2031 "
                "($11.5 / $11.75 / $12.0 / $12.25 / $12.5 million) = $60,000,000. "
                "PDF: https://sportstalksc.com/wp-content/uploads/2022/09/Swinney-Term-Sheet-Sept-2022.pdf"
            ),
        },
        {
            "asOf": "2028-01-01",
            "remaining": 48_500_000,
            "contractYear": "2028",
            "through": "2028-12-31",
            "notes": (
                "Remaining 2028–2031 Base + Supplemental + Licensing = $48,500,000. "
                "PDF: https://sportstalksc.com/wp-content/uploads/2022/09/Swinney-Term-Sheet-Sept-2022.pdf"
            ),
        },
        {
            "asOf": "2029-01-01",
            "remaining": 36_750_000,
            "contractYear": "2029",
            "through": "2029-12-31",
            "notes": (
                "Remaining 2029–2031 Base + Supplemental + Licensing = $36,750,000. "
                "PDF: https://sportstalksc.com/wp-content/uploads/2022/09/Swinney-Term-Sheet-Sept-2022.pdf"
            ),
        },
        {
            "asOf": "2030-01-01",
            "remaining": 24_750_000,
            "contractYear": "2030",
            "through": "2030-12-31",
            "notes": (
                "Remaining 2030–2031 Base + Supplemental + Licensing = $24,750,000. "
                "PDF: https://sportstalksc.com/wp-content/uploads/2022/09/Swinney-Term-Sheet-Sept-2022.pdf"
            ),
        },
        {
            "asOf": "2031-01-01",
            "remaining": 12_500_000,
            "contractYear": "2031",
            "through": "2031-12-31",
            "notes": (
                "Remaining 2031 Base + Supplemental + Licensing = $12,500,000. "
                "PDF: https://sportstalksc.com/wp-content/uploads/2022/09/Swinney-Term-Sheet-Sept-2022.pdf"
            ),
        },
    ],
    "virginia-tech": [
        {
            "asOf": "2026-01-01",
            "remaining": 41_000_000,
            "contractYear": "2026",
            "through": "2026-12-31",
            "notes": (
                "Derived from the LOI Base + Supplemental windows "
                "($6.0 / $5.0 / $4.0 / $12.75 / $13.25 million) remaining-sum if terminated in 2026 "
                "= $41,000,000. Full remaining years. "
                "PDF: https://augustafreepress.com/wp-content/uploads/2025/11/james-franklin-virginia-tech-contract.pdf"
            ),
        },
        {
            "asOf": "2027-01-01",
            "remaining": 35_000_000,
            "contractYear": "2027",
            "through": "2027-12-31",
            "notes": (
                "Remaining 2027–2030 Base + Supplemental = $35,000,000. "
                "PDF: https://augustafreepress.com/wp-content/uploads/2025/11/james-franklin-virginia-tech-contract.pdf"
            ),
        },
        {
            "asOf": "2028-01-01",
            "remaining": 30_000_000,
            "contractYear": "2028",
            "through": "2028-12-31",
            "notes": (
                "Remaining 2028–2030 Base + Supplemental = $30,000,000. "
                "PDF: https://augustafreepress.com/wp-content/uploads/2025/11/james-franklin-virginia-tech-contract.pdf"
            ),
        },
        {
            "asOf": "2029-01-01",
            "remaining": 26_000_000,
            "contractYear": "2029",
            "through": "2029-12-31",
            "notes": (
                "Remaining 2029–2030 Base + Supplemental = $26,000,000. "
                "PDF: https://augustafreepress.com/wp-content/uploads/2025/11/james-franklin-virginia-tech-contract.pdf"
            ),
        },
        {
            "asOf": "2030-01-01",
            "remaining": 13_250_000,
            "contractYear": "2030",
            "through": "2030-12-31",
            "notes": (
                "Remaining 2030 Base + Supplemental = $13,250,000. "
                "PDF: https://augustafreepress.com/wp-content/uploads/2025/11/james-franklin-virginia-tech-contract.pdf"
            ),
        },
    ],
    "north-carolina": [
        {
            "asOf": "2026-01-01",
            "remaining": 20_000_000,
            "contractYear": "2026",
            "through": "2026-12-31",
            "notes": (
                "Derived from §12 remaining unpaid Base ($1,000,000/year) + Supplemental "
                "($9,000,000/year) through Dec. 31, 2027 only. Full remaining 2026 and 2027 years "
                "= $20,000,000. PDF: https://s3.documentcloud.org/documents/25502765/unc-coach-bill-belichick-contract.pdf"
            ),
        },
        {
            "asOf": "2027-01-01",
            "remaining": 10_000_000,
            "contractYear": "2027",
            "through": "2027-12-31",
            "notes": (
                "Remaining 2027 Base + Supplemental = $10,000,000. "
                "PDF: https://s3.documentcloud.org/documents/25502765/unc-coach-bill-belichick-contract.pdf"
            ),
        },
        {
            "asOf": "2028-01-01",
            "remaining": 0,
            "contractYear": "2028–29",
            "through": "2029-12-31",
            "notes": (
                "If terminated after Dec. 31, 2027: $0. Section 12 pays Base + Supplemental only "
                "through Dec. 31, 2027. PDF: https://s3.documentcloud.org/documents/25502765/unc-coach-bill-belichick-contract.pdf"
            ),
        },
    ],
    "iowa-state": [
        {
            "asOf": "2026-02-01",
            "remaining": 18_000_000,
            "contractYear": "2026",
            "through": "2027-01-31",
            "notes": (
                "Derived from the EA termination clause: 100% of remaining Base "
                "($3,000,000/year) through Jan. 31, 2032. Six remaining contract years "
                "× $3,000,000 = $18,000,000. Full years, not mid-year prorated. "
                "PDF: https://htv-prod-media.s3.amazonaws.com/files/iowa-state-contract-with-football-coach-jimmy-rogers-69aa0e837691f.pdf"
            ),
        },
        {
            "asOf": "2027-02-01",
            "remaining": 15_000_000,
            "contractYear": "2027",
            "through": "2028-01-31",
            "notes": (
                "Five remaining years × $3,000,000 Base = $15,000,000. "
                "PDF: https://htv-prod-media.s3.amazonaws.com/files/iowa-state-contract-with-football-coach-jimmy-rogers-69aa0e837691f.pdf"
            ),
        },
        {
            "asOf": "2028-02-01",
            "remaining": 12_000_000,
            "contractYear": "2028",
            "through": "2029-01-31",
            "notes": (
                "Four remaining years × $3,000,000 Base = $12,000,000. "
                "PDF: https://htv-prod-media.s3.amazonaws.com/files/iowa-state-contract-with-football-coach-jimmy-rogers-69aa0e837691f.pdf"
            ),
        },
        {
            "asOf": "2029-02-01",
            "remaining": 9_000_000,
            "contractYear": "2029",
            "through": "2030-01-31",
            "notes": (
                "Three remaining years × $3,000,000 Base = $9,000,000. "
                "PDF: https://htv-prod-media.s3.amazonaws.com/files/iowa-state-contract-with-football-coach-jimmy-rogers-69aa0e837691f.pdf"
            ),
        },
        {
            "asOf": "2030-02-01",
            "remaining": 6_000_000,
            "contractYear": "2030",
            "through": "2031-01-31",
            "notes": (
                "Two remaining years × $3,000,000 Base = $6,000,000. "
                "PDF: https://htv-prod-media.s3.amazonaws.com/files/iowa-state-contract-with-football-coach-jimmy-rogers-69aa0e837691f.pdf"
            ),
        },
        {
            "asOf": "2031-02-01",
            "remaining": 3_000_000,
            "contractYear": "2031",
            "through": "2032-01-31",
            "notes": (
                "One remaining year × $3,000,000 Base = $3,000,000. "
                "PDF: https://htv-prod-media.s3.amazonaws.com/files/iowa-state-contract-with-football-coach-jimmy-rogers-69aa0e837691f.pdf"
            ),
        },
    ],
}

HOUSE_REMAINING_IDS = ("louisville", "kentucky", "ucla", "california", "texas")


def fold_name(name):
    s = "".join(c for c in (name or "").lower() if c.isalpha())
    return NAME_ALIASES.get(s, s)


def same_person(a, b):
    return bool(a) and bool(b) and fold_name(a) == fold_name(b)


def is_usa_today(pay):
    return "USA TODAY" in (pay.get("source") or "").upper()


def is_2026_valid_cite(pay):
    """PDF / article quoting the EA / 2026-asOf source — not a USA TODAY snapshot."""
    if not pay or pay.get("value") is None:
        return False
    if is_usa_today(pay):
        return False
    src = pay.get("source") or ""
    as_of = str(pay.get("asOf") or "")
    year = pay.get("year")
    url = pay.get("url") or ""
    if year in (2024, 2025) and is_usa_today(pay):
        return False
    # Independently cited current-deal cell.
    return bool(src or url or as_of.startswith("2026") or year == 2026)


def stamp_2026(schools):
    stamped = []
    skipped_usat = []
    for school in schools:
        current = (school.get("coaches") or {}).get("football") or {}
        year_book = (school.get("coachesByYear") or {}).get("2026") or {}
        year_fb = year_book.get("football") or {}
        if not same_person(current.get("name"), year_fb.get("name")):
            continue
        pay = current.get("pay") or {}
        existing = year_fb.get("pay") or {}
        if existing.get("value") is not None and not is_usa_today(existing):
            # Independent year-cell cite (Day FOIA, Cignetti MOU, DeBoer trustee)
            # wins over a leftover current snapshot. Do not overwrite it.
            continue
        if not is_2026_valid_cite(pay):
            if pay.get("value") is not None:
                skipped_usat.append(school["id"])
            continue
        year_fb["pay"] = deepcopy(pay)
        stamped.append(school["id"])
    return stamped, skipped_usat


def attach_steps(school, steps):
    current = school["coaches"]["football"]
    buyout = current.setdefault("buyout", {})
    buyout["steps"] = deepcopy(steps)
    year_fb = school["coachesByYear"]["2026"]["football"]
    year_buyout = year_fb.setdefault("buyout", {})
    year_buyout["steps"] = deepcopy(steps)


def enrich_buyout_book(coach, steps):
    existing = {s.get("through"): s for s in (coach.get("steps") or [])}
    merged = []
    for step in steps:
        old = existing.get(step["through"], {})
        row = dict(old)
        row["asOf"] = step["asOf"]
        row["remaining"] = step["remaining"]
        row["contractYear"] = step["contractYear"]
        row["through"] = step["through"]
        row["amount"] = step["remaining"] if row.get("amount") is None else row["amount"]
        if step.get("notes") and not row.get("notes"):
            row["notes"] = step["notes"]
        merged.append(row)
    coach["steps"] = merged
    if any(s.get("amount") is not None or s.get("remaining") is not None for s in merged):
        coach["tape"] = "steps"


def house_spent(school):
    """House Year 1 spent only. Never preCap-only, never 990, never a cap plan."""
    booked = (school.get("nil") or {}).get("booked") or {}
    pre = (school.get("nil") or {}).get("preCap") or {}
    sid = school["id"]
    if booked.get("value") is None:
        return None
    if sid == "louisville":
        # Notes: $32.9M window includes the $12.7M pre-cap FY2025 line.
        if pre.get("value") is None:
            raise SystemExit("louisville House remaining needs the split preCap cell")
        return booked["value"] - pre["value"]
    return booked["value"]


def remaining_field(school, cap, spent, *, partial_year=False, footnote=None):
    leftover = cap - spent
    overhang = leftover < 0
    booked = school["nil"]["booked"]
    return {
        "value": leftover,
        "confidence": "estimated",
        "source": "House Year 1 remaining = published $20.5M NCAA House cap minus this school’s booked House spent cell",
        "url": "https://on.ncaa.com/QA61325",
        "asOf": booked.get("asOf"),
        "window": booked.get("window") or "2025-26",
        "spent": spent,
        "cap": cap,
        "partialYear": partial_year,
        "overhang": overhang,
        "notes": (
            (
                "Overhang: booked House spent is above the $20.5 million Year 1 cap. Shown, not hidden."
                if overhang
                else "Published House Year 1 cap minus booked House spent. Residual, not a filing."
            )
            + (" Year-to-date window — not a full-year leftover." if partial_year else "")
        ),
        "footnote": footnote,
    }


def attach_house_remaining(schools, cap):
    by_id = {s["id"]: s for s in schools}
    footnotes = {
        "louisville": (
            "House Year 1 remaining = $20.5M cap − $20.2M House spent "
            "($32.9M FOIA window minus the $12.7M pre-cap line). Not the full $32.9M, not a 990."
        ),
        "kentucky": (
            "House Year 1 remaining = $20.5M cap − $18M counsel spent. "
            "Collective 990s are not in this math."
        ),
        "ucla": (
            "House Year 1 remaining = $20.5M cap − about $20.5M school-stated spent. "
            "A $0 leftover is a real cell. Collective 990s are not in this math."
        ),
        "california": (
            "House Year 1 remaining = $20.5M cap − about $20.5M school-stated spent. "
            "A $0 leftover is a real cell. Collective 990s are not in this math."
        ),
        "texas": (
            "House Year 1 remaining as of YTD (Jul 2025–Mar 2026) = $20.5M cap − $13.5M booked. "
            "Partial-year, not a full-year leftover. The $3.2M pre-cap / MFRS line is inside the $13.5M — not added. "
            "Collective 990s are not in this math."
        ),
    }
    written = []
    for sid in HOUSE_REMAINING_IDS:
        school = by_id[sid]
        spent = house_spent(school)
        if spent is None:
            raise SystemExit(f"{sid} missing booked House spent")
        school["nil"]["houseRemaining"] = remaining_field(
            school,
            cap,
            spent,
            partial_year=(sid == "texas"),
            footnote=footnotes[sid],
        )
        written.append((sid, spent, cap - spent))
    for school in schools:
        if school["id"] not in HOUSE_REMAINING_IDS and "houseRemaining" in (school.get("nil") or {}):
            del school["nil"]["houseRemaining"]
    return written


def sync_public(*names):
    for name in names:
        src = ROOT / "data" / name
        dst = ROOT / "public" / "data" / name
        dst.write_text(src.read_text())


def main():
    schools_doc = json.loads(SCHOOLS.read_text())
    buyouts_doc = json.loads(BUYOUTS.read_text())
    schools = schools_doc["schools"]
    cap = schools_doc["meta"]["houseCap"]["y2025_26"]["value"]
    if cap != 20_500_000:
        raise SystemExit(f"unexpected House Year 1 cap {cap}")

    stamped, skipped = stamp_2026(schools)
    for sid, steps in STEP_TAPES.items():
        school = next(s for s in schools if s["id"] == sid)
        attach_steps(school, steps)
        enrich_buyout_book(buyouts_doc["coaches"][sid], steps)
    remaining = attach_house_remaining(schools, cap)

    SCHOOLS.write_text(json.dumps(schools_doc, indent=2, ensure_ascii=False) + "\n")
    BUYOUTS.write_text(json.dumps(buyouts_doc, indent=2, ensure_ascii=True) + "\n")
    sync_public("schools.json", "buyouts.json")

    print("stamped 2026 pay", len(stamped), ",".join(stamped))
    print("skipped USA TODAY / non-2026 cite", len(skipped))
    print("step tapes", ",".join(STEP_TAPES))
    print("house remaining", remaining)


if __name__ == "__main__":
    main()
