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


def is_usa_today(field: dict | None) -> bool:
    src = ((field or {}).get("source") or "").upper()
    return "USA TODAY" in src


def is_file_dollar(fb: dict | None) -> bool:
    """True when the desk already has a non-USA TODAY cited dollar for this chair."""
    if not fb:
        return False
    pay = fb.get("pay") or {}
    if pay.get("value") is None:
        return False
    return not is_usa_today(pay)


def keep_file_chair(fb: dict | None, tape_name: str) -> dict | None:
    """Keep file-cited pay / contract blobs. Do not keep a copied USA TODAY cell."""
    if not fb or not same_person(fb.get("name"), tape_name):
        return None
    if not is_file_dollar(fb) and not fb.get("contract") and not fb.get("contractUrl"):
        return None
    kept = deepcopy(fb)
    if is_usa_today(kept.get("pay")):
        kept["pay"] = pending_pay("No extracted pay on the desk for this chair-year.")
    if is_usa_today(kept.get("buyout")):
        kept["buyout"] = pending_pay("USA TODAY buyout cell not reused on a year without a tape pay cell.")
    if kept.get("pay", {}).get("value") is None and not kept.get("contract") and not kept.get("contractUrl"):
        return None
    return kept


def apply_chair_notes(fb: dict, name: str, notes: str | None, source_note: str, wiki: str) -> dict:
    fb["name"] = name
    term = fb.get("term") or {}
    term.setdefault("confidence", "pending")
    term.setdefault("asOf", "2026-08")
    term["source"] = "Wikipedia season-page infobox"
    term["url"] = wiki
    extra = term.get("notes") or ""
    if source_note not in extra:
        term["notes"] = f"{source_note} {extra}".strip()
    elif notes and notes not in extra:
        term["notes"] = f"{notes} {extra}".strip()
    fb["term"] = term
    pay = fb.get("pay")
    if pay and notes and notes not in (pay.get("notes") or ""):
        pay["notes"] = f"{notes} {pay.get('notes') or ''}".strip()
    return fb


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

    existing_fb = (existing_year or {}).get("football")
    current_fb = (school.get("coaches") or {}).get("football")

    # Tape pay cell wins for that year (USA TODAY 2025). File dollars stay on years
    # the tape leaves blank — especially 2026 current-chair PDFs. We do not copy a
    # 2025 USA TODAY cell onto 2021–24 or onto a 2026 name-only row.
    if tape_row.get("pay") is not None:
        pay = usat_pay(tape_row["pay"])
        if notes:
            pay["notes"] = f"{notes} {pay['notes']}"
        out = {
            "name": name,
            "pay": pay,
            "buyout": {
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
        donor = existing_fb if same_person((existing_fb or {}).get("name"), name) else None
        if donor:
            if donor.get("contract"):
                out["contract"] = deepcopy(donor["contract"])
            if donor.get("contractUrl"):
                out["contractUrl"] = donor["contractUrl"]
            buy = donor.get("buyout") or {}
            if buy.get("value") is not None and not is_usa_today(buy):
                out["buyout"] = deepcopy(buy)
            elif buy.get("rule"):
                out["buyout"] = {**out["buyout"], "rule": buy["rule"], "source": buy.get("source") or out["buyout"]["source"]}
        return out

    kept = keep_file_chair(existing_fb, name)
    if not kept and year == 2026:
        kept = keep_file_chair(current_fb, name)
    if kept:
        return apply_chair_notes(kept, name, notes, source_note, wiki)

    return {
        "name": name,
        "pay": pending_pay(source_note),
        "buyout": pending_pay(source_note),
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
        "pay is attached only when that year cell is on the tape."
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
