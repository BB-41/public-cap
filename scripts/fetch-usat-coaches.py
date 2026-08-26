#!/usr/bin/env python3
"""Pull USA TODAY football head-coach team pages for 2021–2025.

Reads each school's __NEXT_DATA__ salaries list. Does not invent pay.
Does not trust ?year= query params (those still serve the latest snapshot).
Writes scripts/coach-usat/{2021,2022,2023,2024,2025}.json in the year-tape shape.
A year file is written only when that season exists on the team pages.
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = Path(__file__).with_name("coach-usat")
YEARS = (2021, 2022, 2023, 2024, 2025)
UA = "PublicCap/1.0 (athletics capacity desk; +https://thepubliccap.com)"

# Same USA TODAY team IDs as scripts/fetch-usat-assistants.py
TEAM_IDS = {
    "alabama": "3478",
    "arizona": "3462",
    "arizona-state": "3463",
    "arkansas": "3479",
    "auburn": "3480",
    "baylor": "3484",
    "boston-college": "3416",
    "byu": "3493",
    "california": "3464",
    "cincinnati": "3503",
    "clemson": "3407",
    "colorado": "3424",
    "duke": "3408",
    "florida": "3472",
    "florida-state": "3409",
    "georgia": "3473",
    "georgia-tech": "3410",
    "houston": "3485",
    "illinois": "3432",
    "indiana": "3433",
    "iowa": "3434",
    "iowa-state": "3425",
    "kansas": "3426",
    "kansas-state": "3427",
    "kentucky": "3474",
    "louisville": "3505",
    "lsu": "3481",
    "maryland": "3411",
    "miami": "3417",
    "michigan": "3435",
    "michigan-state": "3436",
    "minnesota": "3437",
    "mississippi-state": "3483",
    "missouri": "3428",
    "nc-state": "3413",
    "nebraska": "3429",
    "north-carolina": "3412",
    "northwestern": "3438",
    "notre-dame": "3509",
    "ohio-state": "3439",
    "oklahoma": "3430",
    "oklahoma-state": "3431",
    "ole-miss": "3482",
    "oregon": "3465",
    "penn-state": "3440",
    "pittsburgh": "3418",
    "purdue": "3441",
    "rutgers": "3419",
    "smu": "3487",
    "south-carolina": "3475",
    "stanford": "3468",
    "syracuse": "3420",
    "tcu": "3490",
    "tennessee": "3476",
    "texas": "3488",
    "texas-am": "3489",
    "texas-tech": "3491",
    "ucf": "3615",
    "ucla": "3469",
    "usc": "3467",
    "utah": "3499",
    "vanderbilt": "3477",
    "virginia": "3414",
    "virginia-tech": "3422",
    "wake-forest": "3415",
    "washington": "3470",
    "west-virginia": "3423",
    "wisconsin": "3442",
}

NEXT_DATA = re.compile(
    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', re.S
)


def team_url(tid: str) -> str:
    return f"https://sportsdata.usatoday.com/ncaa/salaries/football/coach/team/{tid}"


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    last = None
    for attempt, wait in enumerate((0, 2, 4, 8), start=1):
        if wait:
            time.sleep(wait)
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                return resp.read().decode("utf-8", "replace")
        except (urllib.error.URLError, TimeoutError) as exc:
            last = exc
            print(f"  retry {attempt} {url}: {exc}")
    raise SystemExit(f"failed {url}: {last}")


def numeric_pay(value) -> int | None:
    """USA TODAY uses -1 for withheld Total Pay. Never invent a number."""
    if value is None:
        return None
    if isinstance(value, str) and not value.strip():
        return None
    try:
        n = int(value)
    except (TypeError, ValueError):
        return None
    if n <= 0:
        return None
    return n


def as_of_date(row: dict, page_date: str | None) -> str | None:
    raw = row.get("aggregatedTime") or page_date or ""
    if isinstance(raw, str) and len(raw) >= 10 and raw[4] == "-":
        return raw[:10]
    if isinstance(page_date, str) and len(page_date) >= 10 and page_date[4] == "-":
        return page_date[:10]
    return None


def parse_page(html: str, sid: str, tid: str) -> dict:
    m = NEXT_DATA.search(html)
    if not m:
        raise SystemExit(f"no __NEXT_DATA__ for {sid}")
    blob = json.loads(m.group(1))
    fb = blob["props"]["pageProps"]["fallback"]
    page_date = (fb.get("globalData") or {}).get("date")
    if isinstance(page_date, str) and "T" in page_date:
        page_date = page_date[:10]
    rows_by_year = {y: [] for y in YEARS}
    extra_years = set()
    for row in fb.get("salaries") or []:
        season = row.get("season")
        if season not in YEARS:
            if isinstance(season, int) and season >= 2026:
                extra_years.add(season)
            continue
        first = (row.get("firstName") or "").strip()
        last = (row.get("lastName") or "").strip()
        name = " ".join(p for p in (first, last) if p)
        if not name:
            continue
        rows_by_year[season].append(
            {
                "name": name,
                "pay": numeric_pay(row.get("totalPay")),
                "asOf": as_of_date(row, page_date),
                "aggregatedTime": row.get("aggregatedTime"),
            }
        )
    return {
        "url": team_url(tid),
        "pageDate": page_date,
        "years": rows_by_year,
        "extraYears": sorted(extra_years),
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    year_asof_hint = {
        2021: "2021-10-14",
        2022: "2022-10-12",
        2023: "2023-10-02",
        2024: "2024-10-16",
        2025: "2025-10-08",
    }
    by_year = {
        y: {
            "contractYear": y,
            "asOf": year_asof_hint[y],
            "source": "USA TODAY Sports football head-coach salary database",
            "url": "https://sportsdata.usatoday.com/ncaa/salaries/football/coach",
            "notes": (
                f"USA TODAY {y} contract year. Head-coach Total Pay from each school "
                f"team page (__NEXT_DATA__). Withheld / -1 cells stay null. "
                f"Do not copy this year onto another year."
            ),
            "schools": {},
        }
        for y in YEARS
    }
    years_present = {y: 0 for y in YEARS}
    paid_schools = {y: 0 for y in YEARS}
    extra = []
    for i, (sid, tid) in enumerate(TEAM_IDS.items(), start=1):
        url = team_url(tid)
        print(f"[{i}/{len(TEAM_IDS)}] {sid} {url}")
        page = parse_page(fetch(url), sid, tid)
        time.sleep(0.25)
        if page["extraYears"]:
            extra.append((sid, page["extraYears"]))
        for y in YEARS:
            rows = page["years"][y]
            if rows:
                years_present[y] += 1
            n_paid = sum(1 for r in rows if r["pay"] is not None)
            if n_paid:
                paid_schools[y] += 1
            by_year[y]["schools"][sid] = {
                "url": page["url"],
                "coaches": rows,
            }
    if extra:
        print("unexpected 2026+ seasons (not written):", extra)
    for y, tape in by_year.items():
        if years_present[y] == 0:
            print(f"skip {y}: no team-page rows for that season")
            continue
        # Pin tape asOf to the most common row timestamp that year
        asofs = [
            c["asOf"]
            for row in tape["schools"].values()
            for c in row["coaches"]
            if c.get("asOf")
        ]
        if asofs:
            tape["asOf"] = max(set(asofs), key=asofs.count)
        path = OUT_DIR / f"{y}.json"
        path.write_text(json.dumps(tape, indent=2, ensure_ascii=False) + "\n")
        print(
            f"wrote {path} · {len(tape['schools'])} schools · "
            f"{years_present[y]} with a {y} row · {paid_schools[y]} with numeric pay"
        )
    print("years_present", years_present)
    print("paid_schools", paid_schools)


if __name__ == "__main__":
    main()
