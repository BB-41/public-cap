#!/usr/bin/env python3
"""Pull public 2025/2026 football rosters for the 68 P4+ND schools.

Sources (in order):
  1. CollegeFootballData /roster — skipped when 401 (API key required).
  2. ESPN public site API team roster (2026 season current).
  3. Wikipedia 2026 then 2025 team-page depth-chart template (starter/backup rank).

No On3 / Opendorse / NIL Go / social scrape.
Names are only kept if they appear on the ESPN public roster.
"""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCHOOLS = json.loads((ROOT / "schools.json").read_text())["schools"]
OUT = ROOT / "rosters.json"
UA = "PublicCap/1.1 (college athletics capacity desk; roster research; +https://localhost)"

ESPN_TEAMS = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=1000"
ESPN_ROSTER = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/{id}/roster"
WIKI = "https://en.wikipedia.org/wiki/{title}"

OVERRIDE_SLUG = {
    "ole-miss": "ole-miss-rebels",
    "miami": "miami-hurricanes",
    "nc-state": "nc-state-wolfpack",
    "texas-am": "texas-am-aggies",
    "california": "california-golden-bears",
    "pittsburgh": "pittsburgh-panthers",
    "usc": "usc-trojans",
    "ucla": "ucla-bruins",
    "lsu": "lsu-tigers",
    "ucf": "ucf-knights",
    "smu": "smu-mustangs",
    "tcu": "tcu-horned-frogs",
    "byu": "byu-cougars",
    "notre-dame": "notre-dame-fighting-irish",
}


def norm(s: str) -> str:
    s = (s or "").lower()
    for a, b in [("&", "and"), (".", ""), ("'", ""), ("-", " "), ("(", " "), (")", " ")]:
        s = s.replace(a, b)
    return " ".join(s.split())


def get(url: str, timeout: int = 30) -> tuple[int, bytes]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json,text/html"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read() if e.fp else b""
    except Exception as e:
        return 0, str(e).encode()


def load_espn_index() -> list[dict]:
    code, body = get(ESPN_TEAMS)
    if code != 200:
        raise SystemExit(f"ESPN teams list failed {code}")
    data = json.loads(body)
    return [t["team"] for t in data["sports"][0]["leagues"][0]["teams"]]


def map_schools(espn_teams: list[dict]) -> dict[str, dict]:
    matched = {}
    used = set()
    for s in SCHOOLS:
        sid, name = s["id"], s["name"]
        nname, nid = norm(name), norm(sid.replace("-", " "))
        hit = None
        if sid in OVERRIDE_SLUG:
            hit = next((e for e in espn_teams if e.get("slug") == OVERRIDE_SLUG[sid]), None)
        if not hit:
            for e in espn_teams:
                if e["id"] in used:
                    continue
                loc = norm(e.get("location"))
                if loc == nname or loc == nid:
                    hit = e
                    break
        if hit:
            used.add(hit["id"])
            matched[sid] = hit
        else:
            matched[sid] = None
    return matched


POS_PARENT = {
    "QB": "qb",
    "RB": "rb",
    "FB": "rb",
    "TB": "rb",
    "HB": "rb",
    "WR": "wr",
    "TE": "te",
    "OL": "ol",
    "OT": "ol",
    "OG": "ol",
    "C": "ol",
    "G": "ol",
    "T": "ol",
    "LT": "ol",
    "RT": "ol",
    "LG": "ol",
    "RG": "ol",
    "DE": "edge",
    "EDGE": "edge",
    "OLB": "edge",
    "DL": "dl",
    "DT": "dl",
    "NT": "dl",
    "IDL": "dl",
    "NG": "dl",
    "LB": "lb",
    "ILB": "lb",
    "MLB": "lb",
    "WLB": "lb",
    "CB": "cb",
    "DB": "cb",
    "S": "s",
    "FS": "s",
    "SS": "s",
    "SAF": "s",
    "PK": "k",
    "K": "k",
    "P": "k",
    "LS": "k",
    "KR": "k",
    "PR": "k",
    "ATH": "ath",
    "SPEC": "k",
}

WIKI_SLOT_FAMILY = {
    "QB": "qb",
    "RB": "rb",
    "RB1": "rb",
    "RB2": "rb",
    "FB": "rb",
    "WR": "wr",
    "WR1": "wr",
    "WR2": "wr",
    "WR3": "wr",
    "WRX": "wr",
    "WRZ": "wr",
    "WRH": "wr",
    "SLOT": "wr",
    "TE": "te",
    "TE1": "te",
    "TE2": "te",
    "LT": "ol",
    "LG": "ol",
    "C": "ol",
    "RG": "ol",
    "RT": "ol",
    "OT": "ol",
    "OG": "ol",
    "OL": "ol",
    "LDE": "edge",
    "RDE": "edge",
    "DE": "edge",
    "EDGE": "edge",
    "JACK": "edge",
    "RUSH": "edge",
    "LEO": "edge",
    "SAM": "edge",
    "ROLB": "edge",
    "LOLB": "edge",
    "OLB": "edge",
    "LDT": "dl",
    "RDT": "dl",
    "NT": "dl",
    "DT": "dl",
    "NG": "dl",
    "DL": "dl",
    "WLB": "lb",
    "MLB": "lb",
    "ILB": "lb",
    "MIKE": "lb",
    "WILL": "lb",
    "SLB": "lb",
    "LB": "lb",
    "CB": "cb",
    "LCB": "cb",
    "RCB": "cb",
    "NCB": "cb",
    "NB": "cb",
    "DB": "cb",
    "DB1": "cb",
    "DB2": "cb",
    "FS": "s",
    "SS": "s",
    "S": "s",
    "SAF": "s",
    "PK": "k",
    "K": "k",
    "P": "k",
    "LS": "k",
}


def clean_wiki_name(raw: str) -> list[str]:
    if not raw or raw.strip() in {"-", "–", "—", "&nbsp;"}:
        return []
    raw = raw.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&").replace("&apos;", "'")
    raw = raw.replace("&quot;", '"')
    raw = re.sub(r"<br\s*/?>", "|", raw, flags=re.I)
    raw = re.sub(r"<[^>]+>", "", raw)
    raw = re.sub(r"'{2,}", "", raw)
    raw = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]", r"\1", raw)
    parts = re.split(r"[|/]| and ", raw)
    out = []
    for p in parts:
        p = re.sub(r"\s+", " ", p).strip(" .,;:")
        # drop position-only or school-name tokens
        if len(p) < 3 or p.upper() == p and len(p) <= 6:
            continue
        if p.lower() in {"offense", "defense", "special teams", "out (indefinitely)", "out (season)"}:
            continue
        out.append(p)
    return out


def parse_wiki_depth(html: str) -> dict[str, int]:
    """name_norm -> rank (1 starter, 2 backup, 3 third). First win keeps best rank."""
    ranks: dict[str, int] = {}
    # embedded template JSON: "QB_Starter":{"wt":"Name"}
    for m in re.finditer(
        r'"([A-Za-z0-9]+)_((?:Starter|Backup|Third|Reserves?))":\{"wt":"(.*?)"\}',
        html,
    ):
        slot, kind, wt = m.group(1), m.group(2), m.group(3)
        if slot.endswith("SchoolName") or slot.startswith("Key") or slot in {"OffenseRef", "DefenseRef"}:
            continue
        rank = 1 if kind == "Starter" else 2 if kind == "Backup" else 3
        for name in clean_wiki_name(wt):
            key = norm(name)
            if key and (key not in ranks or rank < ranks[key]):
                ranks[key] = rank
    # also KR/PR/LS/Holder fields without Starter suffix
    for m in re.finditer(
        r'"(Kick_Returner|Punt_Returner|Long_Snapper|Holder)":\{"wt":"(.*?)"\}',
        html,
    ):
        for name in clean_wiki_name(m.group(2)):
            key = norm(name)
            ranks.setdefault(key, 2)
    return ranks


def parse_espn_roster(payload: dict) -> list[dict]:
    players = []
    for group in payload.get("athletes") or []:
        unit = group.get("position") or ""
        for a in group.get("items") or []:
            pos = a.get("position") or {}
            abbr = (pos.get("abbreviation") or "").upper()
            exp = a.get("experience") or {}
            name = a.get("displayName") or a.get("fullName")
            if not name:
                continue
            players.append(
                {
                    "id": str(a.get("id") or ""),
                    "name": name,
                    "first": a.get("firstName") or "",
                    "last": a.get("lastName") or "",
                    "pos": abbr,
                    "posName": pos.get("displayName") or pos.get("name") or "",
                    "family": POS_PARENT.get(abbr, "ath"),
                    "class": exp.get("abbreviation") or "",
                    "className": exp.get("displayValue") or "",
                    "years": exp.get("years"),
                    "jersey": str(a.get("jersey") or ""),
                    "unit": unit,
                    "playerUrl": next(
                        (lk.get("href") for lk in (a.get("links") or []) if "playercard" in (lk.get("rel") or [])),
                        None,
                    ),
                }
            )
    return players


def wiki_titles(team: dict) -> list[str]:
    display = team.get("displayName") or ""
    loc = team.get("location") or ""
    mascot = team.get("name") or ""
    titles = []
    for year in (2026, 2025):
        if display:
            titles.append(f"{year} {display} football team")
        if loc and mascot and f"{loc} {mascot}" != display:
            titles.append(f"{year} {loc} {mascot} football team")
    return titles


def fetch_wiki_depth(team: dict) -> tuple[dict[str, int], str | None, int | None]:
    for title in wiki_titles(team):
        url = WIKI.format(title=title.replace(" ", "_"))
        code, body = get(url, timeout=25)
        time.sleep(0.25)
        if code != 200:
            continue
        html = body.decode("utf-8", "replace")
        # skip soft-404 / missing
        if "Wikipedia does not have a" in html and "depth chart" not in html.lower():
            continue
        ranks = parse_wiki_depth(html)
        year = 2026 if title.startswith("2026") else 2025
        if ranks:
            return ranks, url, year
        # page exists but no depth — keep URL if 2026
        if year == 2026:
            # try 2025 next
            continue
        return {}, url, year
    return {}, None, None


def main() -> None:
    print("CFBD skip: API key required (401).")
    espn_teams = load_espn_index()
    mapping = map_schools(espn_teams)
    out = {
        "meta": {
            "asOf": "2026-08-23",
            "notes": (
                "Football names from ESPN public team roster JSON (2026 season). "
                "Depth ranks from Wikipedia 2026/2025 team-page depth-chart templates when present. "
                "CollegeFootballData roster API returned 401 without a key and was skipped. "
                "No On3 / Opendorse / NIL Go / social."
            ),
            "sources": [
                {"id": "espn-roster", "label": "ESPN college-football team roster API", "url": ESPN_TEAMS},
                {"id": "wikipedia-depth", "label": "Wikipedia team-page depth chart (2026 then 2025)"},
            ],
        },
        "schools": {},
        "failed": [],
    }

    n = len(SCHOOLS)
    for i, s in enumerate(SCHOOLS, 1):
        sid = s["id"]
        team = mapping.get(sid)
        print(f"[{i}/{n}] {sid} ...", flush=True)
        if not team:
            out["failed"].append({"id": sid, "reason": "no ESPN team mapping"})
            continue
        espn_id = team["id"]
        roster_url = ESPN_ROSTER.format(id=espn_id)
        page_url = f"https://www.espn.com/college-football/team/roster/_/id/{espn_id}"
        code, body = get(roster_url)
        time.sleep(0.15)
        if code != 200:
            out["failed"].append({"id": sid, "reason": f"ESPN roster HTTP {code}"})
            continue
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            out["failed"].append({"id": sid, "reason": "ESPN roster not JSON"})
            continue
        players = parse_espn_roster(payload)
        season = (payload.get("season") or {}).get("year")
        if not players:
            out["failed"].append({"id": sid, "reason": "ESPN roster empty"})
            continue

        ranks, wiki_url, wiki_year = fetch_wiki_depth(team)
        ranked = 0
        for p in players:
            key = norm(p["name"])
            alt = norm(f"{p['first']} {p['last']}")
            r = ranks.get(key) or ranks.get(alt)
            # last-name unique match if exactly one
            if r is None and p["last"]:
                ln = norm(p["last"])
                hits = [v for k, v in ranks.items() if k.endswith(" " + ln) or k == ln]
                if len(hits) == 1:
                    r = hits[0]
            p["depthRank"] = r  # 1/2/3 or None
            if r:
                ranked += 1

        out["schools"][sid] = {
            "id": sid,
            "espnId": str(espn_id),
            "espnSlug": team.get("slug"),
            "season": season,
            "sourceUrl": page_url,
            "sourceApi": roster_url,
            "wikiUrl": wiki_url,
            "wikiYear": wiki_year,
            "depthMatched": ranked,
            "playerCount": len(players),
            "players": players,
        }
        print(f"    {len(players)} players, {ranked} depth-matched, wiki={wiki_year}", flush=True)

    OUT.write_text(json.dumps(out, indent=2))
    public = ROOT.parent / "public" / "data" / "rosters.json"
    public.write_text(json.dumps(out))
    named = sum(1 for v in out["schools"].values() if v.get("playerCount"))
    players = sum(v.get("playerCount", 0) for v in out["schools"].values())
    print(f"Wrote {OUT} and {public}")
    print(f"Schools with names: {named}/{n}; players: {players}; failed: {out['failed']}")


if __name__ == "__main__":
    main()
