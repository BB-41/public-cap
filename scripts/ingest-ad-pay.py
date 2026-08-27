#!/usr/bin/env python3
"""Attach cited athletic-director pay to staff.athleticDirector.pay.

Pins each dollar to that snapshot year. Matches the current chair name.
Does not invent pay. Does not touch HC pay, assistants, booked NIL, or 990s.
Does not copy a 2024 AD number onto a 2026 AD who is a different person.
Does not overwrite a newer cite already on the desk with an older snapshot.

Sources: scripts/ad-cites.json (USA TODAY Network stories + FOIA / board /
state payroll) and any scripts/ad-usat/{year}.json tapes from a live
sportsdata.usatoday.com AD table.
"""
from __future__ import annotations

import json
import re
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CITES_PATH = Path(__file__).with_name("ad-cites.json")
TAPE_DIR = Path(__file__).with_name("ad-usat")

NAME_ALIASES = {
    "patkraft": "patrickkraft",
    "trevalbert": "trevalberts",
}

BLOCKER = (
    "Athletic-director pay is cited-only on staff.athleticDirector.pay "
    "(and the 2026 staff-year copy). USA TODAY Sports has no live AD table "
    "on sportsdata.usatoday.com; dollars come from USA TODAY Network stories "
    "that name a number, or from state payroll / university FOIA / board "
    "minutes. Each cell is year-pinned. A 2024 snapshot is never copied onto "
    "a 2026 AD who is a different person. A newer cite already on the desk "
    "is not overwritten by an older snapshot. Privates and withheld chairs "
    "stay pending. No On3 / Opendorse / NIL Go."
)


def fold_name(name: str | None) -> str:
    s = re.sub(r"[^a-z]", "", (name or "").lower())
    return NAME_ALIASES.get(s, s)


def same_person(a: str | None, b: str | None) -> bool:
    if not a or not b:
        return False
    fa, fb = fold_name(a), fold_name(b)
    if fa == fb:
        return True
    # Last-name match + shared first initial (Pat / Patrick Kraft).
    def parts(name: str) -> tuple[str, str]:
        bits = [p for p in re.sub(r"[^a-z\s]", " ", (name or "").lower()).split() if p]
        if not bits:
            return "", ""
        return bits[0], bits[-1]

    a0, a1 = parts(a)
    b0, b1 = parts(b)
    return bool(a1) and a1 == b1 and bool(a0) and bool(b0) and a0[0] == b0[0]


def asof_year(value: str | None) -> int | None:
    if not value:
        return None
    s = str(value).strip()
    if len(s) >= 4 and s[:4].isdigit():
        y = int(s[:4])
        if 2000 <= y <= 2100:
            return y
    return None


def desk_year(pay: dict | None) -> int | None:
    """Year the stored dollar belongs to — not a Sportsnaut recap date."""
    if not pay:
        return None
    if pay.get("year") is not None:
        try:
            return int(pay["year"])
        except (TypeError, ValueError):
            pass
    notes = f"{pay.get('notes') or ''} {pay.get('source') or ''}".lower()
    m = re.search(r"\b(20\d{2}) extension\b", notes)
    if m:
        return int(m.group(1))
    return asof_year(pay.get("asOf"))


def is_usa_today(field: dict | None) -> bool:
    blob = f"{(field or {}).get('source') or ''} {(field or {}).get('notes') or ''}"
    return "USA TODAY" in blob.upper()


def cell_from_cite(row: dict) -> dict:
    year = int(row["year"])
    as_of = row.get("asOf")
    notes = row.get("notes") or (
        f"Cited {year} athletic-director pay. Not reused on a later hire."
    )
    return {
        "value": int(row["pay"]),
        "year": year,
        "confidence": row.get("confidence") or "reported",
        "source": row["source"],
        "url": row["url"],
        "asOf": as_of,
        "notes": notes,
    }


def load_cites() -> list[dict]:
    rows = []
    if CITES_PATH.exists():
        blob = json.loads(CITES_PATH.read_text())
        for row in blob.get("cites") or []:
            if row.get("pay") is None:
                continue
            rows.append(row)
    for year_path in sorted(TAPE_DIR.glob("[0-9][0-9][0-9][0-9].json")):
        tape = json.loads(year_path.read_text())
        year = tape.get("contractYear")
        for row in tape.get("directors") or tape.get("schools") or []:
            if isinstance(row, dict) and row.get("pay") is not None:
                rows.append(
                    {
                        "id": row.get("id") or row.get("schoolId"),
                        "name": row.get("name"),
                        "pay": row["pay"],
                        "year": year or row.get("season"),
                        "asOf": row.get("asOf") or tape.get("asOf"),
                        "source": tape.get("source") or "USA TODAY Sports athletics director salary database",
                        "url": row.get("url") or tape.get("url"),
                        "notes": (
                            f"USA TODAY {year} Total Pay from the AD table. "
                            "Not reused on a later hire."
                        ),
                        "confidence": "reported",
                    }
                )
    return rows


def best_cite(cites: list[dict], sid: str, chair: str | None) -> dict | None:
    hits = [
        c
        for c in cites
        if c.get("id") == sid
        and c.get("pay") is not None
        and same_person(chair, c.get("name"))
    ]
    if not hits:
        return None
    hits.sort(key=lambda c: (int(c["year"]), str(c.get("asOf") or "")), reverse=True)
    return hits[0]


def apply_ad(ad: dict, cite: dict | None, stats: dict) -> dict:
    out = deepcopy(ad) if isinstance(ad, dict) else {}
    pay = out.get("pay") if isinstance(out.get("pay"), dict) else {}
    if cite is None:
        if pay.get("value") is None:
            stats["pending"] += 1
        else:
            y = desk_year(pay)
            if y and pay.get("year") is None:
                out["pay"] = {**pay, "year": y}
            stats["kept"] += 1
        return out
    incoming = cell_from_cite(cite)
    existing_year = desk_year(pay)
    incoming_year = incoming["year"]
    if pay.get("value") is not None and existing_year is not None and existing_year > incoming_year:
        stats["protected"] += 1
        print(
            f"  keep newer {incoming.get('url') and cite['id']} "
            f"{pay.get('value')} year={existing_year} "
            f"(incoming {incoming['value']} year={incoming_year})"
        )
        # Stamp a year pin on the kept cell when it lacked one.
        if pay.get("year") is None:
            out["pay"] = {**pay, "year": existing_year}
        return out
    if pay.get("value") == incoming["value"] and (
        is_usa_today(pay) or existing_year == incoming_year
    ):
        out["pay"] = incoming
        stats["upgraded"] += 1
        return out
    if pay.get("value") is None:
        out["pay"] = incoming
        stats["filled"] += 1
        return out
    if existing_year is not None and existing_year < incoming_year:
        out["pay"] = incoming
        stats["upgraded"] += 1
        return out
    if existing_year == incoming_year and pay.get("value") != incoming["value"]:
        # Same year, different dollar — keep the desk value, pin the year.
        print(
            f"  keep cited {cite['id']} {pay.get('value')} "
            f"(incoming {incoming['value']} year={incoming_year})"
        )
        out["pay"] = {
            **incoming,
            "value": pay["value"],
            "notes": (
                f"{incoming['notes']} Desk already stored {pay['value']} "
                f"for this year."
            ),
        }
        stats["protected"] += 1
        return out
    out["pay"] = incoming
    stats["upgraded"] += 1
    return out


def apply_school(school: dict, cites: list[dict]) -> dict:
    stats = {
        "filled": 0,
        "upgraded": 0,
        "protected": 0,
        "pending": 0,
        "kept": 0,
        "name_miss": 0,
    }
    staff = school.setdefault("staff", {})
    ad = staff.get("athleticDirector") or {}
    chair = ad.get("name")
    sid = school["id"]
    school_cites = [c for c in cites if c.get("id") == sid]
    if school_cites and chair and not any(same_person(chair, c.get("name")) for c in school_cites):
        stats["name_miss"] += 1
        print(f"  name miss {sid}: chair={chair!r} cites={[c.get('name') for c in school_cites]}")
    cite = best_cite(cites, sid, chair)
    new_ad = apply_ad(ad, cite, stats)
    staff["athleticDirector"] = new_ad
    by = school.get("staffByYear") or {}
    year_2026 = by.get("2026")
    if isinstance(year_2026, dict):
        year_2026["athleticDirector"] = deepcopy(new_ad)
        by["2026"] = year_2026
        school["staffByYear"] = by
    return stats


def ingest(path: Path, cites: list[dict]) -> None:
    data = json.loads(path.read_text())
    totals = {k: 0 for k in ("filled", "upgraded", "protected", "pending", "kept", "name_miss")}
    for school in data["schools"]:
        stats = apply_school(school, cites)
        for k, v in stats.items():
            totals[k] += v
    blockers = data.get("meta", {}).get("blockers") or []
    data["meta"]["blockers"] = [
        BLOCKER if b.startswith("Athletic-director pay") else b for b in blockers
    ]
    if not any(b.startswith("Athletic-director pay") for b in data["meta"]["blockers"]):
        data["meta"]["blockers"].append(BLOCKER)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {path} · {totals}")


def main() -> None:
    cites = load_cites()
    if not cites:
        raise SystemExit("no AD cites loaded")
    print(f"loaded {len(cites)} cited rows")
    for rel in ("data/schools.json", "public/data/schools.json"):
        ingest(ROOT / rel, deepcopy(cites))


if __name__ == "__main__":
    main()
