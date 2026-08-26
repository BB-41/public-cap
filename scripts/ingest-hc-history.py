#!/usr/bin/env python3
"""Ingest the verified 2021–2026 football chair tape into coachesByYear.

Keeps existing file / year-key dollars when the same chair already has a value.
Attaches USA TODAY 2025 pay only when the tape includes pay for that year.
Does not invent names or dollars. Missouri stays Eliah Drinkwitz.
"""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TAPE = json.loads((Path(__file__).with_name("hc-history.json")).read_text())
YEARS = [2021, 2022, 2023, 2024, 2025, 2026]
USAT = {
    "source": "USA TODAY Sports coach salary database",
    "url": "https://sportsdata.usatoday.com/ncaa/salaries/football/coach",
    "asOf": "2025-10-08",
    "confidence": "reported",
}

WIKI_TEAM = {
    "alabama": "Alabama Crimson Tide",
    "arkansas": "Arkansas Razorbacks",
    "auburn": "Auburn Tigers",
    "florida": "Florida Gators",
    "georgia": "Georgia Bulldogs",
    "kentucky": "Kentucky Wildcats",
    "lsu": "LSU Tigers",
    "mississippi-state": "Mississippi State Bulldogs",
    "missouri": "Missouri Tigers",
    "oklahoma": "Oklahoma Sooners",
    "ole-miss": "Ole Miss Rebels",
    "south-carolina": "South Carolina Gamecocks",
    "tennessee": "Tennessee Volunteers",
    "texas": "Texas Longhorns",
    "texas-am": "Texas A&M Aggies",
    "vanderbilt": "Vanderbilt Commodores",
    "illinois": "Illinois Fighting Illini",
    "indiana": "Indiana Hoosiers",
    "iowa": "Iowa Hawkeyes",
    "maryland": "Maryland Terrapins",
    "michigan": "Michigan Wolverines",
    "michigan-state": "Michigan State Spartans",
    "minnesota": "Minnesota Golden Gophers",
    "nebraska": "Nebraska Cornhuskers",
    "northwestern": "Northwestern Wildcats",
    "ohio-state": "Ohio State Buckeyes",
    "oregon": "Oregon Ducks",
    "penn-state": "Penn State Nittany Lions",
    "purdue": "Purdue Boilermakers",
    "rutgers": "Rutgers Scarlet Knights",
    "ucla": "UCLA Bruins",
    "usc": "USC Trojans",
    "washington": "Washington Huskies",
    "wisconsin": "Wisconsin Badgers",
    "boston-college": "Boston College Eagles",
    "california": "California Golden Bears",
    "clemson": "Clemson Tigers",
    "duke": "Duke Blue Devils",
    "florida-state": "Florida State Seminoles",
    "georgia-tech": "Georgia Tech Yellow Jackets",
    "louisville": "Louisville Cardinals",
    "miami": "Miami Hurricanes",
    "nc-state": "NC State Wolfpack",
    "north-carolina": "North Carolina Tar Heels",
    "pittsburgh": "Pittsburgh Panthers",
    "smu": "SMU Mustangs",
    "stanford": "Stanford Cardinal",
    "syracuse": "Syracuse Orange",
    "virginia": "Virginia Cavaliers",
    "virginia-tech": "Virginia Tech Hokies",
    "wake-forest": "Wake Forest Demon Deacons",
    "arizona": "Arizona Wildcats",
    "arizona-state": "Arizona State Sun Devils",
    "baylor": "Baylor Bears",
    "byu": "BYU Cougars",
    "cincinnati": "Cincinnati Bearcats",
    "colorado": "Colorado Buffaloes",
    "houston": "Houston Cougars",
    "iowa-state": "Iowa State Cyclones",
    "kansas": "Kansas Jayhawks",
    "kansas-state": "Kansas State Wildcats",
    "oklahoma-state": "Oklahoma State Cowboys",
    "tcu": "TCU Horned Frogs",
    "texas-tech": "Texas Tech Red Raiders",
    "ucf": "UCF Knights",
    "utah": "Utah Utes",
    "west-virginia": "West Virginia Mountaineers",
    "notre-dame": "Notre Dame Fighting Irish",
}

PENDING_PAY = {
    "value": None,
    "confidence": "pending",
    "source": None,
    "url": None,
    "asOf": None,
    "notes": "No extracted pay on the desk for this chair-year.",
}

EMPTY_MBB = {
    "name": "—",
    "pay": {**PENDING_PAY, "notes": "Prior-year MBB chair not extracted."},
    "buyout": {**PENDING_PAY, "notes": "Prior-year MBB chair not extracted."},
    "term": {"confidence": "pending", "asOf": "2026-08", "notes": "Prior-year MBB chair not extracted."},
}


def norm_name(name: str) -> str:
    s = (name or "").replace(".", "").replace("'", "").lower()
    s = " ".join(s.split())
    if s == "eli drinkwitz":
        return "eliah drinkwitz"
    return s


def wiki_url(school_id: str, year: int) -> str:
    team = WIKI_TEAM[school_id]
    title = f"{year} {team} football team".replace(" ", "_")
    return f"https://en.wikipedia.org/wiki/{title.replace('&', '%26')}"


def pending_pay(notes: str) -> dict:
    return {**PENDING_PAY, "notes": notes}


def usat_pay(value: int) -> dict:
    return {
        "value": value,
        "year": 2025,
        "confidence": USAT["confidence"],
        "source": USAT["source"],
        "url": USAT["url"],
        "asOf": USAT["asOf"],
        "notes": "USA TODAY cell stored on the desk for this chair-year. Not reused on a later hire.",
    }


def same_person(a: str | None, b: str | None) -> bool:
    return bool(a) and bool(b) and norm_name(a) == norm_name(b)


def year_row(book: dict | None, year: int) -> dict | None:
    if not book:
        return None
    return book.get(year) or book.get(str(year))


def keep_existing(fb: dict | None, tape_name: str) -> dict | None:
    if not fb or not same_person(fb.get("name"), tape_name):
        return None
    if fb.get("pay", {}).get("value") is None and fb.get("buyout", {}).get("value") is None:
        if not fb.get("contract") and not fb.get("contractUrl"):
            return None
    return deepcopy(fb)


def build_chair(school: dict, year: int, tape_row: dict, existing_year: dict | None) -> dict:
    sid = school["id"]
    name = tape_row["name"]
    if name == "Eli Drinkwitz":
        name = "Eliah Drinkwitz"
    notes = tape_row.get("notes")
    wiki = wiki_url(sid, year)
    source_note = f"Chair of record who started football {year} (Wikipedia season-page infobox)."
    if notes:
        source_note = f"{notes} {source_note}"

    kept = keep_existing((existing_year or {}).get("football"), name)
    if kept:
        kept["name"] = name
        extra = (kept.get("pay") or {}).get("notes") or ""
        if source_note not in extra:
            if kept.get("pay"):
                kept["pay"]["notes"] = f"{source_note} {extra}".strip()
        if notes and kept.get("term") and notes not in (kept["term"].get("notes") or ""):
            kept["term"]["notes"] = f"{notes} {kept['term'].get('notes') or ''}".strip()
        return kept

    # 2026 current-directory object wins when it is the same chair (PDF / file pay).
    if year == 2026:
        current = keep_existing(school.get("coaches", {}).get("football"), name)
        if current:
            current["name"] = name
            return current

    pay = usat_pay(tape_row["pay"]) if tape_row.get("pay") is not None else pending_pay(source_note)
    return {
        "name": name,
        "pay": pay,
        "buyout": pending_pay(source_note) if pay.get("value") is None else {
            "value": None,
            "confidence": "pending",
            "source": USAT["source"],
            "url": USAT["url"],
            "asOf": None,
            "notes": "USA TODAY buyout cell not on this tape. School-side overhang stays pending unless a file dollar exists.",
        },
        "term": {
            "confidence": "pending",
            "asOf": "2026-08",
            "source": "Wikipedia season-page infobox",
            "url": wiki,
            "notes": source_note,
        },
    }


def ingest(path: Path) -> None:
    data = json.loads(path.read_text())
    by_id = {s["id"]: s for s in data["schools"]}
    missing = [sid for sid in TAPE if sid not in by_id]
    extra = [sid for sid in TAPE if sid not in WIKI_TEAM]
    if missing:
        raise SystemExit(f"unknown school ids: {missing}")
    if extra:
        raise SystemExit(f"missing wiki titles: {extra}")
    if len(TAPE) != 68:
        raise SystemExit(f"tape has {len(TAPE)} schools, expected 68")

    for sid, years in TAPE.items():
        school = by_id[sid]
        book = school.get("coachesByYear") or {}
        out = {}
        for year in YEARS:
            tape_row = years.get(str(year)) or years.get(year)
            if not tape_row:
                raise SystemExit(f"{sid} missing {year}")
            prev = year_row(book, year)
            mbb = deepcopy((prev or {}).get("mbb")) or deepcopy(EMPTY_MBB)
            out[str(year)] = {"football": build_chair(school, year, tape_row, prev), "mbb": mbb}
        school["coachesByYear"] = out

        # Directory object is the 2026 chair. Keep the file blob when names match.
        chair26 = out["2026"]["football"]
        current = school.get("coaches", {}).get("football") or {}
        if same_person(current.get("name"), chair26.get("name")):
            school["coaches"]["football"]["name"] = chair26["name"]
        else:
            school["coaches"]["football"] = deepcopy(chair26)

    blocker = (
        "Football chairs are year-keyed (coachesByYear, 2021–2026) from the Wikipedia "
        "season-page infobox tape. applySeason uses that year’s chair — we do not blank "
        "2021–24 to an em-dash and we do not copy a 2026 hire onto 2024. USA TODAY 2025 "
        "pay is attached only when that year cell is on the tape. No On3."
    )
    blockers = data.get("meta", {}).get("blockers") or []
    data["meta"]["blockers"] = [
        blocker if "coachesByYear" in b else b for b in blockers
    ]
    if not any("coachesByYear" in b for b in data["meta"]["blockers"]):
        data["meta"]["blockers"].append(blocker)

    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {path} · {len(TAPE)} schools × {len(YEARS)} years")


def main() -> None:
    for rel in ("data/schools.json", "public/data/schools.json"):
        ingest(ROOT / rel)


if __name__ == "__main__":
    main()
