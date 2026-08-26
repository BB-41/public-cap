"""Year-honest football staff helpers.

staffByYear.YYYY is the only source for that football season. A USA TODAY
assistant table is never copied onto another year or onto the current
official directory.
"""
from __future__ import annotations

from copy import deepcopy
from pathlib import Path

TAPE_DIR = Path(__file__).with_name("staff-usat")
USAT_ASOF_2024 = "2024-12-18"

# FSU 2024 Fuller / Atkins already on the desk and correct.
KEEP_EXISTING_2024 = {"florida-state"}


def load_usat_tape(year: int) -> dict:
    import json

    path = TAPE_DIR / f"{year}.json"
    if not path.exists():
        raise FileNotFoundError(
            f"No {path}. Drop the USA TODAY {year} table in the same shape "
            f"as staff-usat/2024.json."
        )
    tape = json.loads(path.read_text())
    if int(tape.get("contractYear") or year) != year:
        raise ValueError(f"{path.name} contractYear {tape.get('contractYear')} != {year}")
    return tape


def usat_pay(value: int, tape: dict) -> dict:
    return {
        "value": int(value),
        "confidence": "reported",
        "source": tape["source"],
        "url": tape["url"],
        "asOf": tape["asOf"],
        "notes": (
            f"USA TODAY {tape['contractYear']} contract-year total pay "
            f"(as of {tape['asOf']}). Not a current 2026 salary."
        ),
    }


def usat_pool(value: int, tape: dict) -> dict:
    return {
        "value": int(value),
        "confidence": "reported",
        "source": f"{tape['source']} (staff total column)",
        "url": tape["url"],
        "asOf": tape["asOf"],
        "notes": (
            f"Published staff-total pay for the school's primary on-field football "
            f"assistants, {tape['contractYear']} contract year. Not a 2026 staff pool."
        ),
    }


def build_year_staff(sid: str, row: dict, tape: dict, existing: dict | None) -> dict:
    if existing and sid in KEEP_EXISTING_2024 and int(tape["contractYear"]) == 2024:
        out = deepcopy(existing)
        out["notes"] = (
            "USA TODAY 2024 contract year (as of Dec 18, 2024). Named assistants "
            "(Fuller / Atkins) are that table, not the 2026 official directory."
        )
        return out

    assistants = []
    for a in row.get("assistants") or []:
        assistants.append(
            {
                "name": a["name"],
                "sport": "football",
                "role": a.get("role") or "Football assistant",
                "pay": usat_pay(a["pay"], tape),
            }
        )
    staff = {
        "athleticDirector": {
            "confidence": "pending",
            "asOf": str(tape["contractYear"]),
            "notes": f"{tape['contractYear']} AD pay not extracted.",
        },
        "office": [],
        "otherHeadCoaches": [],
        "assistants": assistants,
        "notes": (
            f"{tape['source']}, {tape['contractYear']} contract year "
            f"(as of {tape['asOf']}). Named assistants are that year's table, "
            f"not the 2026 official directory."
        ),
    }
    if row.get("pool") is not None:
        staff["footballAssistantPool"] = usat_pool(row["pool"], tape)
    return staff


def apply_usat_year(data: dict, year: int, tape: dict) -> tuple[int, int]:
    key = str(year)
    by_id = {s["id"]: s for s in data["schools"]}
    missing = [sid for sid in tape["schools"] if sid not in by_id]
    if missing:
        raise ValueError(f"unknown school ids in {year} tape: {missing}")
    n_schools = n_assts = 0
    for sid, row in tape["schools"].items():
        school = by_id[sid]
        by = school.setdefault("staffByYear", {})
        existing = by.get(key)
        by[key] = build_year_staff(sid, row, tape, existing)
        n_schools += 1
        n_assts += len(by[key].get("assistants") or [])
    return n_schools, n_assts


def is_usat_2024_pay(pay: dict | None) -> bool:
    if not isinstance(pay, dict):
        return False
    if pay.get("asOf") == USAT_ASOF_2024:
        return True
    src = (pay.get("source") or "").lower()
    notes = (pay.get("notes") or "").lower()
    return "football assistant salary database" in src or "2024 contract-year" in notes


def assistant_names(staff: dict | None) -> list[str]:
    return [a.get("name") for a in (staff or {}).get("assistants") or []]
