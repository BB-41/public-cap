#!/usr/bin/env python3
"""Attach USA TODAY head-coach Total Pay to coachesByYear[YYYY].football.pay.

Pins each dollar to that snapshot year. Does not change chair names.
Does not overwrite a contract-PDF / cited-article cell.
Does not write 2021–2025 dollars onto 2026 or onto current coaches.football.
Does not touch staffByYear or booked NIL cells.
"""
from __future__ import annotations

import json
import re
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TAPE_DIR = Path(__file__).with_name("coach-usat")
APPLY_YEARS = (2021, 2022, 2023, 2024, 2025)

CHAIR_NOTE_RE = re.compile(
    r"Chair of record who started football \d{4} \(Wikipedia season-page infobox\)\.?\s*"
)
GENERIC_PAY_NOTES = (
    "No extracted pay on the desk for this chair-year.",
    "USA TODAY cell stored on the desk for this chair-year. Not reused on a later hire.",
)
NAME_ALIASES = {
    "elidrinkwitz": "eliahdrinkwitz",
}

BLOCKER = (
    "Football chairs are year-keyed (coachesByYear, 2021–2026) from the Wikipedia "
    "season-page infobox tape. applySeason uses that year’s chair — we do not blank "
    "2021–24 to an em-dash and we do not copy a 2026 hire onto 2024. USA TODAY "
    "team-page Total Pay is attached to that year’s chair when the names match; "
    "file/PDF dollars win. We do not copy a 2024 cell onto 2025 or 2026. No On3."
)


def fold_name(name: str | None) -> str:
    s = re.sub(r"[^a-z]", "", (name or "").lower())
    return NAME_ALIASES.get(s, s)


def same_person(a: str | None, b: str | None) -> bool:
    return bool(a) and bool(b) and fold_name(a) == fold_name(b)


def year_row(book: dict | None, year: int) -> dict | None:
    if not book:
        return None
    return book.get(str(year)) or book.get(year)


def is_usa_today(field: dict | None) -> bool:
    src = ((field or {}).get("source") or "").upper()
    return "USA TODAY" in src


def is_protected_dollar(pay: dict | None) -> bool:
    """True when the desk already has a non-USA TODAY cited dollar."""
    if not pay or pay.get("value") is None:
        return False
    return not is_usa_today(pay)


def keep_context(notes: str | None) -> str:
    s = CHAIR_NOTE_RE.sub("", notes or "").strip()
    for generic in GENERIC_PAY_NOTES:
        s = s.replace(generic, "").strip()
    return " ".join(s.split())


def usat_pay(year: int, value: int, url: str, as_of: str | None, extra: str = "") -> dict:
    notes = (
        f"USA TODAY {year} Total Pay from the team page"
        + (f" (as of {as_of})" if as_of else "")
        + ". Not reused on a later hire."
    )
    if extra:
        notes = f"{extra} {notes}".strip()
    return {
        "value": value,
        "year": year,
        "confidence": "reported",
        "source": f"USA TODAY {year} Total Pay",
        "url": url,
        "asOf": as_of,
        "notes": notes,
    }


def matching_row(chair_name: str, coaches: list[dict]) -> dict | None:
    hits = [c for c in coaches if same_person(chair_name, c.get("name"))]
    if len(hits) == 1:
        return hits[0]
    if len(hits) > 1:
        paid = [c for c in hits if c.get("pay") is not None]
        if len(paid) == 1:
            return paid[0]
        return hits[0]
    return None


def load_tapes() -> dict[int, dict]:
    tapes = {}
    for year in APPLY_YEARS:
        path = TAPE_DIR / f"{year}.json"
        if not path.exists():
            print(f"skip {year}: no tape at {path}")
            continue
        tape = json.loads(path.read_text())
        if tape.get("contractYear") != year:
            raise SystemExit(f"{path} contractYear {tape.get('contractYear')} != {year}")
        tapes[year] = tape
    if 2021 not in tapes:
        raise SystemExit("need at least scripts/coach-usat/2021.json")
    return tapes


def apply_school(school: dict, tapes: dict[int, dict]) -> dict:
    stats = {
        "filled": 0,
        "upgraded": 0,
        "protected": 0,
        "pending": 0,
        "name_miss": 0,
    }
    book = school.get("coachesByYear") or {}
    sid = school["id"]
    for year, tape in tapes.items():
        row = year_row(book, year)
        if not row or not row.get("football"):
            raise SystemExit(f"{sid} missing coachesByYear.{year}.football")
        fb = row["football"]
        chair = fb.get("name")
        team = (tape.get("schools") or {}).get(sid)
        if not team:
            continue
        match = matching_row(chair, team.get("coaches") or [])
        pay = fb.get("pay") or {}
        if is_protected_dollar(pay):
            stats["protected"] += 1
            continue
        if not match or match.get("pay") is None:
            if pay.get("value") is None:
                stats["pending"] += 1
            elif is_usa_today(pay) and year == 2025:
                # Existing 2025 USA TODAY cell stays if this year's table is null
                # for the chair (private withhold). Do not blank it here unless
                # the tape year is the one we are replacing from a name miss.
                stats["pending"] += 1
            if match is None and (team.get("coaches") or []):
                stats["name_miss"] += 1
            continue
        extra = keep_context(pay.get("notes"))
        cell = usat_pay(year, match["pay"], team["url"], match.get("asOf"), extra)
        if pay.get("value") == match["pay"] and is_usa_today(pay):
            fb["pay"] = cell
            stats["upgraded"] += 1
        elif pay.get("value") is None:
            fb["pay"] = cell
            stats["filled"] += 1
        elif is_usa_today(pay) and pay.get("year") == year:
            # Same source year; keep the already-cited value if it differs.
            if pay.get("value") != match["pay"]:
                print(
                    f"  keep cited {sid} {year} {pay.get('value')} "
                    f"(team page {match['pay']})"
                )
                fb["pay"] = {
                    **cell,
                    "value": pay["value"],
                    "notes": f"{cell['notes']} Desk already stored {pay['value']} from this USA TODAY year.",
                }
                stats["upgraded"] += 1
            else:
                fb["pay"] = cell
                stats["upgraded"] += 1
        elif is_usa_today(pay):
            # A USA TODAY cell without a year pin — replace with this year's row.
            fb["pay"] = cell
            stats["upgraded"] += 1
        else:
            stats["protected"] += 1
    return stats


def ingest(path: Path, tapes: dict[int, dict]) -> None:
    data = json.loads(path.read_text())
    totals = {k: 0 for k in ("filled", "upgraded", "protected", "pending", "name_miss")}
    for school in data["schools"]:
        stats = apply_school(school, tapes)
        for k, v in stats.items():
            totals[k] += v
    blockers = data.get("meta", {}).get("blockers") or []
    data["meta"]["blockers"] = [
        BLOCKER if "coachesByYear" in b else b for b in blockers
    ]
    if not any("coachesByYear" in b for b in data["meta"]["blockers"]):
        data["meta"]["blockers"].append(BLOCKER)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {path} · {totals}")


def main() -> None:
    tapes = load_tapes()
    for rel in ("data/schools.json", "public/data/schools.json"):
        ingest(ROOT / rel, deepcopy(tapes))


if __name__ == "__main__":
    main()
