# USA TODAY football head-coach year tapes

Year-keyed HC Total Pay lives on `coachesByYear.YYYY.football.pay` only.
A table for football season Y is never copied onto Y+1 or onto the 2026 chair.

Expected files (same shape):

- `2021.json` / `2022.json` / `2023.json` / `2024.json` / `2025.json` — USA TODAY
  Sports football head-coach team pages (`__NEXT_DATA__`). Refresh with:

      python3 scripts/fetch-usat-coaches.py
      python3 scripts/ingest-usat-coach-pay.py

`?year=` query params still serve the latest snapshot — do not use them.
Chair names stay on the Wikipedia tape. File/PDF dollars win over USA TODAY.
Private / withheld (`totalPay` -1 or null) cells stay pending.
