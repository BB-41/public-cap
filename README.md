# Public Cap

College athletics capacity desk — Power 4 plus Notre Dame (68 schools).

## Run

cd /workspace/public-cap
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview

Data: public/data/schools.json
Logos: public/logos/*.png (local files, not hotlinked).


## Seasons

Football seasons 2021–2026 (NIL era; NCAA interim policy July 1, 2021).
Keyed as football years, not athletic fiscal years. FY runs July–June.
Modeled NIL: House-era (rev-share + third-party) for 2025–26 and 2026–27;
collective-era third-party-only backcast for 2021–24, labeled modeled.
Named ESPN rosters get a modeled share whenever a school midpoint exists
(including 2021–24). A missing year file stays empty; booked NIL stays official.
Collective Form 990s live on `nil.collective990` and never overwrite booked House / Item 44.

Data: `public/data/schools.json`, `public/data/rosters-YYYY.json`.

Football assistant pay is year-keyed (`staffByYear`). USA TODAY team pages
(as of Dec 18, 2024) fill 2021–2024 names and Total Pay. 2026 is the official
directory (names; pay pending). 2025 is empty unless a distinct tape exists.
Refresh tapes with `python3 scripts/fetch-usat-assistants.py`.

Football head-coach pay is year-keyed (`coachesByYear.YYYY.football.pay`).
USA TODAY team pages (`/coach/team/{id}` `__NEXT_DATA__`) fill 2021–2025
Total Pay when the published name matches that year’s chair. File/PDF
dollars win. A 2024 cell is never copied onto 2025 or 2026.
Refresh with `python3 scripts/fetch-usat-coaches.py` then
`python3 scripts/ingest-usat-coach-pay.py`.

Athletic-director pay is cited-only on `staff.athleticDirector.pay`.
USA TODAY Sports has no live AD table on `sportsdata.usatoday.com/ncaa/salaries`
(probe with `python3 scripts/fetch-usat-ads.py`). Dollars come from USA TODAY
Network stories that name a number, or from state payroll / university FOIA /
board minutes. Each cell is year-pinned to that snapshot. A 2024 number is
never copied onto a 2026 AD who is a different person. A newer cite already
on the desk is not overwritten by an older snapshot. Privates stay pending.
Apply with `python3 scripts/ingest-ad-pay.py`.
