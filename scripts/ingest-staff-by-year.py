#!/usr/bin/env python3
"""Attach a USA TODAY assistant year tape to staffByYear.YYYY only.

Usage:
    python3 scripts/ingest-staff-by-year.py --year 2024
    python3 scripts/ingest-staff-by-year.py --year 2021   # when 2021.json exists

Never copies that year onto an adjacent year or onto the current official
directory. 2026 names stay in ingest-staff-2026.py.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from staff_year import apply_usat_year, load_usat_tape  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--year", type=int, required=True, help="Football season / contract year")
    args = ap.parse_args()
    if args.year in (2021, 2022, 2023, 2024):
        pass
    elif args.year == 2026:
        raise SystemExit("2026 official-directory names go through ingest-staff-2026.py")
    if args.year == 2025:
        raise SystemExit(
            "Do not invent a 2025 staff list. A distinct 2025 directory is kept "
            "only when it is already on the desk and is not a 2026 clone."
        )
    tape = load_usat_tape(args.year)
    for rel in ("data/schools.json", "public/data/schools.json"):
        path = ROOT / rel
        data = json.loads(path.read_text())
        n_schools, n_assts = apply_usat_year(data, args.year, tape)
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        print(
            f"wrote {path} · staffByYear.{args.year} · {n_schools} schools · {n_assts} named assistants"
        )


if __name__ == "__main__":
    main()
