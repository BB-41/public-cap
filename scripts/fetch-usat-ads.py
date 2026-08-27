#!/usr/bin/env python3
"""Probe USA TODAY Sports for an athletics-director salary table.

Same ingest style as fetch-usat-coaches.py / fetch-usat-assistants.py:
read __NEXT_DATA__, never invent pay, never trust ?year= query params.

As of the 2026-08 probe, sportsdata.usatoday.com/ncaa/salaries has no AD
coachType. Live football-adjacent types are coach / assistant / strength /
general-manager (GMs, not ADs). This script records that probe and, if an
AD table appears later, writes year tapes under scripts/ad-usat/.

Does not scrape On3 / Opendorse / NIL Go.
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = Path(__file__).with_name("ad-usat")
UA = "PublicCap/1.0 (athletics capacity desk; +https://thepubliccap.com)"
YEARS = (2021, 2022, 2023, 2024, 2025, 2026)

# Same USA TODAY team IDs as scripts/fetch-usat-coaches.py
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

# National slugs to try. AD is the target; football-adjacent types are
# recorded so we do not mistake GM/strength rows for athletic directors.
NATIONAL_PATHS = (
    "football/athletic-director",
    "football/athletics-director",
    "football/ad",
    "athletic-director/coach",
    "athletics-director/coach",
    "football/director",
    "football/general-manager",
    "football/coach",
    "football/assistant",
    "football/strength",
    "mens-basketball/coach",
    "womens-basketball/coach",
)

NEXT_DATA = re.compile(
    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', re.S
)


def fetch(url: str) -> tuple[int | None, str, str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    last = None
    for attempt, wait in enumerate((0, 2, 4), start=1):
        if wait:
            time.sleep(wait)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                html = resp.read().decode("utf-8", "replace")
                return resp.status, resp.geturl(), html
        except urllib.error.HTTPError as exc:
            return exc.code, url, ""
        except (urllib.error.URLError, TimeoutError) as exc:
            last = exc
            print(f"  retry {attempt} {url}: {exc}")
    print(f"  failed {url}: {last}")
    return None, url, ""


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


def parse_next_data(html: str) -> dict | None:
    m = NEXT_DATA.search(html)
    if not m:
        return None
    blob = json.loads(m.group(1))
    fb = (blob.get("props") or {}).get("pageProps", {}).get("fallback") or {}
    page_date = (fb.get("globalData") or {}).get("date")
    if isinstance(page_date, str) and "T" in page_date:
        page_date = page_date[:10]
    rows = []
    extra_years = set()
    types = {}
    for row in fb.get("salaries") or []:
        season = row.get("season")
        ctype = row.get("coachType")
        types[ctype] = types.get(ctype, 0) + 1
        if season not in YEARS:
            if isinstance(season, int) and season >= 2026:
                extra_years.add(season)
            continue
        first = (row.get("firstName") or "").strip()
        last = (row.get("lastName") or "").strip()
        name = " ".join(p for p in (first, last) if p)
        if not name:
            continue
        rows.append(
            {
                "name": name,
                "pay": numeric_pay(row.get("totalPay")),
                "season": season,
                "coachType": ctype,
                "teamName": row.get("teamName"),
                "asOf": as_of_date(row, page_date),
                "aggregatedTime": row.get("aggregatedTime"),
            }
        )
    gd = fb.get("globalData") or {}
    return {
        "pageTitle": gd.get("pageTitle"),
        "pageDate": page_date,
        "query": blob.get("query"),
        "coachTypes": types,
        "rows": rows,
        "extraYears": sorted(extra_years),
        "nSalaries": len(fb.get("salaries") or []),
    }


def looks_like_ad(parsed: dict) -> bool:
    title = (parsed.get("pageTitle") or "").lower()
    types = parsed.get("coachTypes") or {}
    if any(k and "director" in str(k).lower() for k in types):
        return True
    return "athletic director" in title or "athletics director" in title


def write_year_tapes(national_url: str, parsed: dict) -> None:
    by_year = {y: [] for y in YEARS}
    for row in parsed["rows"]:
        by_year[row["season"]].append(row)
    years_present = {y: len(by_year[y]) for y in YEARS if by_year[y]}
    if not years_present:
        print("AD-like table had no in-range season rows; no year tape written")
        return
    for y, rows in by_year.items():
        if not rows:
            continue
        asofs = [r["asOf"] for r in rows if r.get("asOf")]
        tape = {
            "contractYear": y,
            "asOf": max(set(asofs), key=asofs.count) if asofs else None,
            "source": "USA TODAY Sports athletics director salary database",
            "url": national_url,
            "notes": (
                f"USA TODAY {y} contract year. Athletic-director Total Pay from "
                f"__NEXT_DATA__. Withheld / -1 cells stay null. "
                f"Do not copy this year onto another year or another person."
            ),
            "directors": rows,
        }
        path = OUT_DIR / f"{y}.json"
        path.write_text(json.dumps(tape, indent=2, ensure_ascii=False) + "\n")
        paid = sum(1 for r in rows if r["pay"] is not None)
        print(f"wrote {path} · {len(rows)} rows · {paid} with numeric pay")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    probe = {
        "asOf": time.strftime("%Y-%m-%d"),
        "source": "USA TODAY Sports NCAA salaries",
        "nationalIndex": "https://sportsdata.usatoday.com/ncaa/salaries/",
        "notes": (
            "Probed sportsdata.usatoday.com/ncaa/salaries for an athletics-director "
            "table. Live site enums are coach / assistant / strength / "
            "general-manager. general-manager is football-adjacent but is GMs, "
            "not ADs. No On3."
        ),
        "paths": [],
        "adTable": None,
    }
    ad_parsed = None
    ad_url = None
    for rel in NATIONAL_PATHS:
        url = f"https://sportsdata.usatoday.com/ncaa/salaries/{rel}"
        print(f"probe {url}")
        status, final, html = fetch(url)
        entry = {"path": rel, "url": url, "status": status, "final": final}
        if status == 200 and html:
            parsed = parse_next_data(html)
            if parsed:
                entry["pageTitle"] = parsed["pageTitle"]
                entry["pageDate"] = parsed["pageDate"]
                entry["coachTypes"] = parsed["coachTypes"]
                entry["nSalaries"] = parsed["nSalaries"]
                entry["isAthleticDirectorTable"] = looks_like_ad(parsed)
                if looks_like_ad(parsed) and ad_parsed is None:
                    ad_parsed = parsed
                    ad_url = final
        probe["paths"].append(entry)
        time.sleep(0.2)

    if ad_parsed:
        probe["adTable"] = {"url": ad_url, "pageTitle": ad_parsed["pageTitle"]}
        write_year_tapes(ad_url, ad_parsed)
    else:
        print(
            "no athletics-director __NEXT_DATA__ table on sportsdata.usatoday.com; "
            "use scripts/ad-cites.json (USA TODAY Network stories + FOIA / board)"
        )

    path = OUT_DIR / "probe.json"
    path.write_text(json.dumps(probe, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {path}")


if __name__ == "__main__":
    main()
