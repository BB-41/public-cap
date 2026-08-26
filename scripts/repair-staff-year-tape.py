#!/usr/bin/env python3
"""Park USA TODAY 2024 assistant dollars on 2024; stop 2026→2025 clones.

- staffByYear.2024 = USA TODAY Dec 18, 2024 names + dollars + staff-total pool
- Delete staffByYear.2025 when it is only a clone of 2026 names
- 2026 / current `staff` keep official-directory names; strip 2024 dollars/pools
- Never invent a 2025 directory or a 2026 assistant dollar
"""
from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from staff_year import (  # noqa: E402
    apply_usat_year,
    assistant_names,
    is_usat_2024_pay,
    load_usat_tape,
)

PENDING_2026 = {
    "value": None,
    "confidence": "pending",
    "source": None,
    "url": None,
    "asOf": None,
    "notes": "Official 2026 on-field directory. No cited 2026 dollar on the desk for this assistant.",
}


def pending_pay(existing: dict | None) -> dict:
    row = deepcopy(PENDING_2026)
    if isinstance(existing, dict):
        src = existing.get("source") or ""
        if existing.get("url") and src.lower().startswith("official 2026"):
            row["source"] = src
            row["url"] = existing.get("url")
            row["asOf"] = existing.get("asOf") or "2026"
            row["notes"] = (
                "Official 2026 on-field directory. No cited 2026 dollar on the desk "
                "for this assistant. USA TODAY Dec 18, 2024 pay lives on 2024 only."
            )
    return row


def strip_2024_assistant_money(staff: dict | None) -> dict | None:
    if not isinstance(staff, dict):
        return staff
    for a in staff.get("assistants") or []:
        pay = a.get("pay")
        if is_usat_2024_pay(pay):
            a["pay"] = pending_pay(pay)
    pool = staff.get("footballAssistantPool")
    if is_usat_2024_pay(pool):
        del staff["footballAssistantPool"]
    url = next(
        (
            (a.get("pay") or {}).get("url")
            for a in (staff.get("assistants") or [])
            if (a.get("pay") or {}).get("url")
        ),
        None,
    )
    if not url:
        ad = staff.get("athleticDirector") or {}
        url = ad.get("url")
    extra = (
        "Assistant pay is pending unless a cited 2026 dollar exists. "
        "USA TODAY Dec 18, 2024 assistant dollars and staff-total pools sit on 2024 only."
    )
    if url:
        staff["notes"] = f"Official 2026 on-field directory ({url}). {extra}"
    else:
        staff["notes"] = extra
    return staff


def staff_blocker() -> str:
    return (
        "Football assistant pay is year-keyed (staffByYear). USA TODAY Sports "
        "assistant dollars (as of Dec 18, 2024) and the staff-total pool live on "
        "2024 only, with that year's published names — not the 2026 official "
        "directory. 2025 is empty unless a distinct year-accurate directory exists; "
        "we do not clone 2026 names or 2024 dollars onto 2025. 2026 keeps official-"
        "directory names; pay stays pending without a cited 2026 dollar. 2021–2023 "
        "use the same staffByYear slot when those USA TODAY tables are ingested. No On3."
    )


def repair(data: dict, tape: dict) -> dict:
    apply_usat_year(data, 2024, tape)
    dropped_2025 = 0
    stripped = 0
    for school in data["schools"]:
        by = school.setdefault("staffByYear", {})
        y26 = by.get("2026") or school.get("staff")
        y25 = by.get("2025")
        if y25 is not None and assistant_names(y25) == assistant_names(y26):
            del by["2025"]
            dropped_2025 += 1
        if "2026" in by:
            strip_2024_assistant_money(by["2026"])
            stripped += 1
        if school.get("staff"):
            strip_2024_assistant_money(school["staff"])
        if "2026" in by:
            school["staff"] = deepcopy(by["2026"])
    blockers = data.setdefault("meta", {}).setdefault("blockers", [])
    next_blockers = []
    replaced = False
    for b in blockers:
        if "Staff pay (AD, other head coaches, football assistants)" in b:
            next_blockers.append(staff_blocker())
            replaced = True
        else:
            next_blockers.append(b)
    if not replaced:
        next_blockers.append(staff_blocker())
    data["meta"]["blockers"] = next_blockers
    data["meta"]["asOf"] = "2026-08-26"
    return {"dropped_2025": dropped_2025, "stripped_2026": stripped}


def main() -> None:
    tape = load_usat_tape(2024)
    for rel in ("data/schools.json", "public/data/schools.json"):
        path = ROOT / rel
        data = json.loads(path.read_text())
        stats = repair(data, tape)
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        print(
            f"wrote {path} · 2024 tape on {len(tape['schools'])} schools · "
            f"dropped 2025 clones {stats['dropped_2025']} · stripped 2026 {stats['stripped_2026']}"
        )


if __name__ == "__main__":
    main()
