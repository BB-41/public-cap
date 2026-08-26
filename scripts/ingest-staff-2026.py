#!/usr/bin/env python3
"""Replace 2026 on-field football assistants from official-directory JSON.

Writes official-directory names onto current `staff` and staffByYear.2026 only.
Never writes 2025. Never reuses a USA TODAY 2024 (asOf 2024-12-18) dollar or
staff-total pool — those live on staffByYear.2024. Pay stays pending unless a
cited 2026 dollar already sits on that 2026 person.
"""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Official 2026 directories: ACC+ND+SEC payload, Big 12 payload, Big Ten parsed
# from the athletics pages. Pay stays pending unless already cited.
STAFF = {}
for fname in ("staff-2026-acc-sec.json", "staff-2026-b12.json", "staff-2026-b1g.json"):
    STAFF.update(json.loads(Path(__file__).with_name(fname).read_text()))

PENDING = {
    "value": None,
    "confidence": "pending",
    "source": None,
    "url": None,
    "asOf": None,
    "notes": "Official 2026 on-field directory. No cited 2026 dollar on the desk for this assistant.",
}

USAT_ASOF_2024 = "2024-12-18"


def norm(name: str) -> str:
    s = (name or "").replace(".", "").replace("'", "").lower()
    return " ".join(s.split())


def is_usat_2024_pay(pay: dict | None) -> bool:
    if not isinstance(pay, dict) or pay.get("value") is None:
        return False
    if pay.get("asOf") == USAT_ASOF_2024:
        return True
    src = (pay.get("source") or "").lower()
    notes = (pay.get("notes") or "").lower()
    return "football assistant salary database" in src or "2024 contract-year" in notes


def pay_index_current_year_only(assistants: list) -> dict:
    """Keep only a cited non-2024 dollar already on this 2026 person."""
    out = {}
    for a in assistants or []:
        pay = a.get("pay") or {}
        if pay.get("value") is None:
            continue
        if is_usat_2024_pay(pay):
            continue
        out[norm(a.get("name"))] = a["pay"]
    return out


def pending_pay(url: str | None) -> dict:
    row = deepcopy(PENDING)
    if url:
        row["source"] = "Official 2026 football coaches directory"
        row["url"] = url
        row["asOf"] = "2026"
    return row


def apply_school(school: dict, payload: dict) -> None:
    url = payload.get("url")
    # Only reuse a dollar already cited on the 2026 directory itself.
    # Do not walk staffByYear.2024 (or any other year) — that is how 2024
    # USA TODAY cells were silently reattached to 2026 names.
    existing = pay_index_current_year_only((school.get("staff") or {}).get("assistants"))
    existing.update(
        pay_index_current_year_only(((school.get("staffByYear") or {}).get("2026") or {}).get("assistants"))
    )
    assistants = []
    for row in payload.get("assistants") or []:
        name, role = row["name"], row["role"]
        pay = deepcopy(existing.get(norm(name))) or pending_pay(url)
        assistants.append({"name": name, "sport": "football", "role": role, "pay": pay})

    staff = school.setdefault("staff", {})
    staff["assistants"] = assistants
    if staff.get("footballAssistantPool") and (
        (staff["footballAssistantPool"].get("asOf") == USAT_ASOF_2024)
        or "assistant salary database" in (staff["footballAssistantPool"].get("source") or "").lower()
    ):
        del staff["footballAssistantPool"]
    if url:
        staff["notes"] = (
            f"Official 2026 on-field directory ({url}). "
            "Assistant pay is pending unless a cited 2026 dollar exists. "
            "USA TODAY Dec 18, 2024 assistant dollars and staff-total pools sit on 2024 only."
        )

    ad_name = payload.get("ad")
    if ad_name:
        ad = staff.get("athleticDirector") or {}
        ad_out = deepcopy(ad) if isinstance(ad, dict) else {}
        ad_out["name"] = ad_name
        if ad_out.get("value") is None and (ad_out.get("pay") or {}).get("value") is None:
            ad_out.setdefault("confidence", "pending")
            ad_out.setdefault("asOf", "2026")
            ad_out["source"] = ad_out.get("source") or "Official 2026 athletics staff directory"
            ad_out["url"] = url
            ad_out["notes"] = ad_out.get("notes") or "Name from the official directory. No cited AD dollar on the desk."
        staff["athleticDirector"] = ad_out

    # 2026 only. A 2024 year key (FSU Fuller/Atkins, USA TODAY names) stays put.
    # Never write 2025 — a missing 2025 key is an honest empty, not a 2026 clone.
    by = school.setdefault("staffByYear", {})
    year_staff = deepcopy(by.get("2026") or staff)
    year_staff["assistants"] = deepcopy(assistants)
    if year_staff.get("footballAssistantPool") and (
        (year_staff["footballAssistantPool"].get("asOf") == USAT_ASOF_2024)
        or "assistant salary database" in (year_staff["footballAssistantPool"].get("source") or "").lower()
    ):
        del year_staff["footballAssistantPool"]
    if url:
        year_staff["notes"] = staff["notes"]
    if ad_name:
        year_staff["athleticDirector"] = deepcopy(staff["athleticDirector"])
    by["2026"] = year_staff
    school["staff"] = deepcopy(year_staff)


def main() -> None:
    for rel in ("data/schools.json", "public/data/schools.json"):
        path = ROOT / rel
        data = json.loads(path.read_text())
        by_id = {s["id"]: s for s in data["schools"]}
        missing = [sid for sid in STAFF if sid not in by_id]
        if missing:
            raise SystemExit(f"unknown school ids: {missing}")
        for sid, payload in STAFF.items():
            apply_school(by_id[sid], payload)
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        print(f"wrote {path} · {len(STAFF)} staff directories")


if __name__ == "__main__":
    main()
