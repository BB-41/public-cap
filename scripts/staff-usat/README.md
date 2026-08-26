# USA TODAY football assistant year tapes

Year-keyed staff pay lives in `staffByYear.YYYY` only. A table for football
season Y is never copied onto Y+1 or onto the current official directory.

Expected files (same shape):

- `2024.json` — USA TODAY Sports football assistant salary database,
  as of 2024-12-18 (2024 contract year).
- `2021.json` / `2022.json` / `2023.json` — drop in when those USA TODAY
  tables are extracted. Ingest with:

      python3 scripts/ingest-staff-by-year.py --year 2021

`ingest-staff-2026.py` writes official-directory **names** onto 2026 only.
It must not reuse a 2024 dollar or clone 2026 onto 2025.
