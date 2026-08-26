#!/usr/bin/env python3
"""Pull 2026 Big Ten on-field staff from official Sidearm coach tables.

Skip head coaches (already year-keyed), analysts, and 'Assistant X Coach'
extras when a position coach already exists. Do not invent names or pay.
"""
from __future__ import annotations

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
    r"analyst|quality control|graduate assistant|ga\b|strength|"
    r"conditioning|director of football ops|operations|recruiting director|"
    r"player personnel|graphics|video|nutrition|academic|equipment|"
    r"assistant athletic director|a\.?d\.?$",
    re.I,
)
ASSISTANT_EXTRA = re.compile(
    r"^assistant (offensive|defensive|wide|tight|running|linebacker|"
    r"secondary|special|quarterback|corner|safety|edge)",
    re.I,
)
HEAD_COACH = re.compile(r"head football coach|^head coach$|endowed head", re.I)
NAME_TITLE = re.compile(
    r'href="[^"]*(?:/coaches/|/roster/coaches/)[^"]+"[^>]*>\s*<span[^>]*>([^<]+)</span>'
    r".{0,800}?<span[^>]*>([^<]+)</span>",
    re.S | re.I,
)
# staff-directory cards: name heading then title
DIR_CARD = re.compile(
    r'<h[23][^>]*>\s*(?:<a[^>]*>)?\s*([^<]{3,40})\s*(?:</a>)?\s*</h[23]>'
    r".{0,400}?(?:class=\"[^\"]*(?:title|position|job)[^\"]*\"[^>]*>)"
    r"\s*([^<]{3,80})\s*<",
    re.S | re.I,
)


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", "replace")


def parse_pairs(html: str) -> list[tuple[str, str]]:
    pairs = []
    seen = set()
    for pat in (NAME_TITLE, DIR_CARD):
        for name, title in pat.findall(html):
            name = re.sub(r"\s+", " ", name).strip()
            title = re.sub(r"\s+", " ", title).strip()
            if not name or not title or len(name) > 40:
                continue
            key = (name.lower(), title.lower())
            if key in seen:
                continue
            seen.add(key)
            pairs.append((name, title))
    return pairs


def keep(title: str, hc_name: str, name: str) -> bool:
    if name.lower() == hc_name.lower():
        return False
    if HEAD_COACH.search(title) and "assistant" not in title.lower() and "associate" not in title.lower():
        return False
    if SKIP_TITLE.search(title):
        return False
    if ASSISTANT_EXTRA.search(title):
        return False
    if re.search(r"assistant .+ coach$", title, re.I) and "coordinator" not in title.lower():
        # "Assistant Wide Receivers Coach" extras
        if re.match(r"assistant ", title, re.I):
            return False
    return True


def main() -> None:
    out = {}
    for sid, meta in B1G.items():
        html = fetch(meta["url"])
        pairs = parse_pairs(html)
        assistants = []
        for name, title in pairs:
            if keep(title, meta["hc"], name):
                assistants.append({"name": name, "role": title})
        print(f"{sid:16} parsed={len(pairs):3} keep={len(assistants):3} {meta['url']}")
        if len(assistants) < 6:
            print("  WARNING thin parse", assistants)
        out[sid] = {
            "hc": meta["hc"],
            "ad": meta["ad"],
            "url": meta["url"],
            "assistants": assistants,
        }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
