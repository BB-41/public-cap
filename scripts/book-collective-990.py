#!/usr/bin/env python3
"""Surgically insert nil.collective990 arrays. Does not rewrite the rest of schools.json."""

from __future__ import annotations

import json
from pathlib import Path

BOOKED_MUST = {
    "louisville": 32_900_000,
    "kentucky": 18_000_000,
    "ucla": 20_500_000,
    "california": 20_500_000,
    "texas": 13_500_000,
}


def find_nil_span(text: str, school_id: str) -> tuple[int, int]:
    marker = f'"id": "{school_id}"'
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f"missing id {school_id}")
    nil_at = text.find('\n      "nil": {', start)
    if nil_at < 0 or nil_at - start > 8000:
        raise SystemExit(f"nil not near {school_id}")
    i = text.find("{", nil_at)
    depth = 0
    for j in range(i, len(text)):
        if text[j] == "{":
            depth += 1
        elif text[j] == "}":
            depth -= 1
            if depth == 0:
                return i, j
    raise SystemExit(f"unclosed nil for {school_id}")


def insert_key(obj_text: str, key: str, value_json: str) -> str:
    # obj_text includes surrounding { }
    inner = obj_text.strip()
    if not inner.startswith("{") or not inner.endswith("}"):
        raise SystemExit("nil object parse")
    body = inner[1:-1].rstrip()
    if body.endswith(","):
        body = body[:-1]
    if f'"{key}"' in body:
        raise SystemExit(f"{key} already present")
    return "{\n" + body + ",\n" + value_json + "\n      }"


def main() -> None:
    # cells live beside this file so the inserter stays small
    cells = json.loads(Path("scripts/collective-990-cells.json").read_text())
    src = Path("data/schools.json")
    text = src.read_text()
    data = json.loads(text)
    by_id = {s["id"]: s for s in data["schools"]}
    for sid, expected in BOOKED_MUST.items():
        got = by_id[sid]["nil"]["booked"]["value"]
        if got != expected:
            raise SystemExit(f"refusing: {sid} booked {got} != {expected}")
    if by_id["texas"]["nil"]["preCap"]["value"] != 3_200_000:
        raise SystemExit("texas preCap drifted")

    inserted: list[str] = []
    # apply from the end so offsets stay valid
    for sid in sorted(cells, key=lambda s: find_nil_span(text, s)[0], reverse=True):
        lo, hi = find_nil_span(text, sid)
        obj = text[lo : hi + 1]
        if '"collective990"' in obj:
            print("skip already-present", sid)
            continue
        arr = json.dumps(cells[sid], indent=2, ensure_ascii=False)
        arr = "        " + arr.replace("\n", "\n        ")
        value_json = f'        "collective990": {arr.lstrip()}'
        new_obj = insert_key(obj, "collective990", value_json)
        text = text[:lo] + new_obj + text[hi + 1 :]
        inserted.append(sid)

    src.write_text(text)
    Path("public/data/schools.json").write_text(text)

    check = json.loads(text)
    by_id = {s["id"]: s for s in check["schools"]}
    for sid, expected in BOOKED_MUST.items():
        if by_id[sid]["nil"]["booked"]["value"] != expected:
            raise SystemExit(f"post-write booked drifted {sid}")
    for sid, rows in cells.items():
        got = by_id[sid]["nil"]["collective990"]
        if [c["value"] for c in got] != [c["value"] for c in rows]:
            raise SystemExit(f"post-write cells drifted {sid}")
    print("inserted collective990 for", ", ".join(sorted(inserted)) or "(none)")


if __name__ == "__main__":
    main()
