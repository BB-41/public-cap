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

Data: `public/data/schools.json`, `public/data/rosters-YYYY.json`.

Football assistant pay is year-keyed (`staffByYear`). USA TODAY Dec 18, 2024
named assistants and staff-total pools live on 2024 only. 2026 is the official
directory (names; pay pending). 2025 is empty unless a distinct tape exists.
2021–2023 ingest the same way when those tables land (`scripts/staff-usat/`).
