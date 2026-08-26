#!/usr/bin/env python3
"""Pull 2026 Big Ten on-field staff from official coach / roster / staff pages.

Skip head coaches (already year-keyed), analysts, and 'Assistant X Coach'
extras when a position coach already exists. Do not invent names or pay.
"""
from __future__ import annotations

import html as html_lib
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).with_name("staff-2026-b1g.json")
UA = "PublicCap/1.2 (college athletics capacity desk; official staff directory)"

B1G = {
    "illinois": {
        "hc": "Bret Bielema",
        "ad": "Josh Whitman",
        "url": "https://fightingillini.com/sports/football/coaches/2026",
    },
    "indiana": {
        "hc": "Curt Cignetti",
        "ad": "Scott Dolson",
        "url": "https://iuhoosiers.com/sports/football/coaches",
    },
    "iowa": {
        "hc": "Kirk Ferentz",
        "ad": "Beth Goetz",
        "url": "https://hawkeyesports.com/sports/football/roster?tab=coaches",
    },
    "maryland": {
        "hc": "Mike Locksley",
        "ad": "James E. Smith",
        "url": "https://umterps.com/sports/football/coaches/2026",
    },
    "michigan": {
        "hc": "Kyle Whittingham",
        "ad": "Warde Manuel",
        "url": "https://mgoblue.com/sports/football/coaches",
    },
    "michigan-state": {
        "hc": "Pat Fitzgerald",
        "ad": "Jon Palumbo",
        "url": "https://msuspartans.com/sports/football/coaches",
    },
    "minnesota": {
        "hc": "P. J. Fleck",
        "ad": "Mark Coyle",
        "url": "https://gophersports.com/sports/football/coaches",
    },
    "nebraska": {
        "hc": "Matt Rhule",
        "ad": "Troy Dannen",
        "url": "https://huskers.com/staff-directory/department/football",
    },
    "northwestern": {
        "hc": "David Braun",
        "ad": "Mark Jackson",
        "url": "https://nusports.com/sports/football/roster/season/2026",
    },
    "ohio-state": {
        "hc": "Ryan Day",
        "ad": "Ross Bjork",
        "url": "https://ohiostatebuckeyes.com/sports/football/coaches",
    },
    "oregon": {
        "hc": "Dan Lanning",
        "ad": "Rob Mullens",
        "url": "https://goducks.com/sports/football/coaches",
    },
    "penn-state": {
        "hc": "Matt Campbell",
        "ad": "Patrick Kraft",
        "url": "https://gopsusports.com/staff-directory/department/football",
    },
    "purdue": {
        "hc": "Barry Odom",
        "ad": "Tommy McClelland",
        "url": "https://purduesports.com/staff-directory/department/football",
    },
    "rutgers": {
        "hc": "Greg Schiano",
        "ad": "Keli Zinn",
        "url": "https://scarletknights.com/sports/football/coaches",
    },
    "ucla": {
        "hc": "Bob Chesney",
        "ad": "Martin Jarmond",
        "url": "https://uclabruins.com/sports/football/coaches/2026",
        "alt": "https://uclabruins.com/sports/football/roster/season/2026",
    },
    "usc": {
        "hc": "Lincoln Riley",
        "ad": "Jennifer Cohen",
        "url": "https://usctrojans.com/sports/football/coaches",
    },
    "washington": {
        "hc": "Jedd Fisch",
        "ad": "Patrick Chun",
        "url": "https://gohuskies.com/sports/football/coaches",
    },
    "wisconsin": {
        "hc": "Luke Fickell",
        "ad": "Shawn Eichorst",
        "url": "https://uwbadgers.com/sports/football/coaches",
    },
}

SKIP_TITLE = re.compile(
    r"analyst|quality control|\bqc\b|graduate assistant|student assistant|"
    r"strength|conditioning|sports performance|athletic performance|"
    r"nutrition|academic|equipment|trainer|therapist|psycholog|dietician|dietitian|"
    r"player personnel|general manager|chief of staff|"
    r"graphics|video|branding|photography|design|creative|"
    r"operations|recruiting|scout|administration|relations|"
    r"communications|compliance|ticket|facilities|marketing|"
    r"physician|chaplain|nursing|medicine|rehabilitation|"
    r"sport science|sports science|scientist|"
    r"director of|assistant ad|associate ad|deputy athletics|"
    r"administrative assistant|consultant|advisor|"
    r"program assistant|position assistant|football qc|"
    r"special assistant to the head coach|assistant to the head coach|"
    r"offensive assistant$|defensive assistant$|front assistant|"
    r"assistant special teams|special teams assistant|"
    r"learning specialist|tutor|rehab|digital media|"
    r"offensive line assistant|running backs coach assistant",
    re.I,
)
ON_FIELD = re.compile(
    r"coordinator|head coach|quarterback|running back|wide receiver|"
    r"tight end|offensive line|defensive line|defensive end|defensive tackle|"
    r"linebacker|corner|safet|nickel|nickels|edge|secondary|defensive back|"
    r"special teams|specialist|fullback|inside receiver|pass game|run game|"
    r"offensive front|leo|senior defensive assistant|senior offensive assistant",
    re.I,
)
HEAD_COACH = re.compile(
    r"head football coach|^head coach$|endowed head|family head football",
    re.I,
)
TITLE_AS_NAME = re.compile(
    r"coach|coordinator|director|analyst|assistant ad|operations|trainer",
    re.I,
)
NAME_TITLE = re.compile(
    r'href="[^"]*(?:/coaches/|/roster/coaches/)[^"]+"[^>]*>\s*<span[^>]*>([^<]+)</span>'
    r".{0,800}?<span[^>]*>([^<]+)</span>",
    re.S | re.I,
)
DIR_CARD = re.compile(
    r"<h[23][^>]*>\s*(?:<a[^>]*>)?\s*([^<]{3,40})\s*(?:</a>)?\s*</h[23]>"
    r".{0,400}?(?:class=\"[^\"]*(?:title|position|job)[^\"]*\"[^>]*>)"
    r"\s*([^<]{3,80})\s*<",
    re.S | re.I,
)
STAFF_PAIR = re.compile(
    r'staff-directory-table-member-position__link--name"[^>]*>.*?>\s*([^<]{2,40})\s*</a>'
    r".{0,500}?"
    r"staff-directory-table-member-position__position[^>]*>\s*(?:<!--\[-->)?\s*<p>([^<]{2,90})</p>",
    re.S | re.I,
)
ROSTER_TABLE = re.compile(
    r'table__roster-name">\s*<span>([^<]{2,40})</span>.*?'
    r"roster-table-cell--position\">\s*<span>([^<]{2,90})</span>",
    re.S | re.I,
)
ROSTER_LIST = re.compile(
    r'roster-list-item__title">\s*([^<]{2,40})\s*</a>'
    r".{0,2500}?"
    r'roster-list-item__profile-field--position">\s*([^<]{2,90})\s*</strong>',
    re.S | re.I,
)
MD_ROW = re.compile(
    r'<tr class="s-table-body__row[^"]*"[^>]*>(.*?)</tr>',
    re.S | re.I,
)


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", "replace")


def clean(s: str) -> str:
    s = html_lib.unescape(s or "")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def parse_pairs(page: str) -> list[tuple[str, str]]:
    pairs = []
    seen = set()

    def add(name: str, title: str) -> None:
        name, title = clean(name), clean(title)
        if not name or not title or len(name) > 40 or name.lower() in {"title", "name"}:
            return
        if title.lower() in {"title", "position"}:
            return
        key = (name.lower(), title.lower())
        if key in seen:
            return
        seen.add(key)
        pairs.append((name, title))

    for pat in (NAME_TITLE, DIR_CARD, STAFF_PAIR, ROSTER_TABLE, ROSTER_LIST):
        for name, title in pat.findall(page):
            add(name, title)
    for row in MD_ROW.findall(page):
        spans = [clean(s) for s in re.findall(r"<span[^>]*>([^<]*)</span>", row)]
        spans = [s for s in spans if s]
        if len(spans) >= 2:
            # Maryland nextgen table: title, then name
            if re.search(r"coach|coordinator|backs|line|ends|special", spans[0], re.I):
                add(spans[1], spans[0])
            else:
                add(spans[0], spans[1])
    return pairs


def norm_person(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (name or "").lower())


def is_head_coach(title: str, name: str, hc_name: str) -> bool:
    if norm_person(name) == norm_person(hc_name):
        return True
    if HEAD_COACH.search(title) and "assistant" not in title.lower() and "associate" not in title.lower():
        return True
    return False


def is_support(title: str) -> bool:
    if SKIP_TITLE.search(title):
        return True
    if not ON_FIELD.search(title):
        return True
    return False


def looks_like_person(name: str) -> bool:
    if TITLE_AS_NAME.search(name):
        return False
    parts = name.replace(".", "").replace("'", "").split()
    return 2 <= len(parts) <= 4


def is_assistant_extra(title: str) -> bool:
    t = title.lower()
    # "Assistant Coach, WR" / "Assistant Coach - RB" is the position coach.
    if re.match(r"assistant coach\b", t) and ("-" in t or "," in t or "/" in t):
        return False
    if re.search(r"assistant special teams", t):
        return True
    if re.match(r"(senior )?assistant ", t) and "head coach" not in t:
        if "coordinator" in t and not re.search(r"assistant special teams", t):
            return False
        if re.search(
            r"\b(coach|line|backs|ends|linebacker|secondary|edge|nickel|receiver|safet|corner|rover)\b",
            t,
        ):
            return True
    return False


def position_key(title: str) -> str | None:
    t = title.lower()
    keys = [
        ("quarterback", "qb"),
        ("running back", "rb"),
        ("wide receiver", "wr"),
        ("tight end", "te"),
        ("offensive line", "ol"),
        ("defensive line", "dl"),
        ("defensive end", "de"),
        ("linebacker", "lb"),
        ("corner", "cb"),
        ("safety", "s"),
        ("safeties", "s"),
        ("nickel", "nb"),
        ("edge", "edge"),
        ("special teams", "st"),
        ("secondary", "db"),
        ("defensive back", "db"),
    ]
    for needle, key in keys:
        if needle in t:
            return key
    return None


def keep_on_field(pairs: list[tuple[str, str]], hc_name: str) -> list[dict]:
    first = []
    for name, title in pairs:
        if not looks_like_person(name):
            continue
        if is_head_coach(title, name, hc_name):
            continue
        if is_support(title):
            continue
        first.append((name, title))

    primaries = set()
    for name, title in first:
        if not is_assistant_extra(title):
            key = position_key(title)
            if key:
                primaries.add(key)

    out = []
    seen_name = set()
    for name, title in first:
        if is_assistant_extra(title):
            continue
        if name.lower() in seen_name:
            continue
        seen_name.add(name.lower())
        out.append({"name": name, "role": title})
    return out


def main() -> None:
    out = {}
    for sid, meta in B1G.items():
        page = fetch(meta["url"])
        pairs = parse_pairs(page)
        if len(pairs) < 6 and meta.get("alt"):
            page = fetch(meta["alt"])
            pairs = parse_pairs(page)
        assistants = keep_on_field(pairs, meta["hc"])
        # Rutgers coaches page lists Bob Fraser (user-noted STC / senior defensive assistant).
        if sid == "rutgers" and not any(norm_person(a["name"]) == "bobfraser" for a in assistants):
            for name, title in pairs:
                if norm_person(name) == "bobfraser":
                    assistants.append({"name": name, "role": title})
                    break
        print(f"{sid:16} parsed={len(pairs):3} keep={len(assistants):3} {meta['url']}")
        if len(assistants) < 6:
            print("  WARNING thin parse", assistants)
        out[sid] = {
            "hc": meta["hc"],
            "ad": meta["ad"],
            "url": meta["url"],
            "assistants": assistants,
        }
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
