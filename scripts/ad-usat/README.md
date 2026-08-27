# Athletic director pay tapes

Current-chair AD pay lives on `staff.athleticDirector.pay` (and the 2026
staff-year copy). A table for year Y is never copied onto a different person
who holds the chair later.

USA TODAY Sports `sportsdata.usatoday.com/ncaa/salaries` does **not** currently
publish an athletics-director `coachType`. Live enums are `coach`, `assistant`,
`strength`, and football-adjacent `general-manager` (GMs, not ADs). Probe with:

    python3 scripts/fetch-usat-ads.py

That writes `scripts/ad-usat/probe.json`. If a real AD table appears, the same
script pulls `__NEXT_DATA__` and writes year tapes. Do not trust `?year=`
query params.

Until that table exists, dollars come from:

- USA TODAY Network stories that name current-AD pay (same ingest as the
  national table would use)
- State payroll / university FOIA / board minutes that name current-AD pay

Curated, year-pinned rows: `scripts/ad-cites.json`. Apply with:

    python3 scripts/ingest-ad-pay.py

Rules: never invent a dollar; never scrape On3 / Opendorse / NIL Go; privates
and withheld cells stay pending; a 2024 number is not written onto a 2026 AD
who is a different person; a newer cite already on the desk is not overwritten
by an older snapshot.
