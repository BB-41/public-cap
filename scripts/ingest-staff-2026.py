#!/usr/bin/env python3
"""Replace 2026 on-field football assistants from official-directory JSON.

Pay stays null unless the desk already has a cited dollar for that person.
AD is not a football assistant. FSU 2024 Fuller/Atkins stay on 2024 only.
"""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAFF = json.loads(Path(__file__).with_name("staff-2026.json").read_text())

PENDING = {
    "value": None,
    "confidence": "pending",
    "source": None,
    "url": None,
    "asOf": None,
    "notes": "Official 2026 on-field directory. No cited dollar on the desk for this assistant.",
}


def norm(name: str) -> str:
    s = (name or "").replace(".", "").replace("'", "").lower()
    return " ".join(s.split())


def pay_index(assistants: list) -> dict:
    out = {}
    for a in assistants or []:
        val = (a.get("pay") or {}).get("value")
        if val is not None:
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
    existing = pay_index(school.get("staff", {}).get("assistants"))
    # also index FSU year keys so we don't invent, but 2024 dollars stay on 2024
    assistants = []
    for row in payload.get("assistants") or []:
        name, role = row["name"], row["role"]
        pay = deepcopy(existing.get(norm(name))) or pending_pay(url)
        assistants.append({"name": name, "sport": "football", "role": role, "pay": pay})

    staff = school.setdefault("staff", {})
    staff["assistants"] = assistants
    if url:
        extra = f"2026 on-field staff from the official directory ({url}). Pay stays pending unless a cited dollar already existed for that person. Not a 2024 USA TODAY assistant table."
        staff["notes"] = extra

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

    # FSU year split: 2025/2026 get the new directory; 2024 Fuller/Atkins stay.
    by = school.get("staffByYear")
    if by:
        for y in ("2025", "2026"):
            if y in by:
                year_staff = deepcopy(by[y])
                year_staff["assistants"] = deepcopy(assistants)
                if url:
                    year_staff["notes"] = (
                        "Official current directory. 2024 USA TODAY assistants (Fuller / Atkins) stay on 2024 only."
                    )
                if ad_name:
                    year_staff["athleticDirector"] = deepcopy(staff["athleticDirector"])
                by[y] = year_staff


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
