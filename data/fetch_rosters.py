#!/usr/bin/env python3
"""Pull public 2025/2026 football rosters for the 68 P4+ND schools.

Sources (in order):
  1. CollegeFootballData /roster — skipped when 401 (API key required).
  2. ESPN public site API team roster (2026 season current).
  3. Wikipedia 2026 then 2025 CFB Team Depth Chart (wikitext API, then HTML template).
     Post–Week 1 2026 charts win over a stale 2025 chart when present.

No On3 / Opendorse / NIL Go / social scrape.
Names are kept from the ESPN public team roster, plus cited ESPN athlete
records that are missing from that JSON (see ROSTER_ADDITIONS).
"""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCHOOLS = json.loads((ROOT / "schools.json").read_text())["schools"]
OUT = ROOT / "rosters.json"
PUBLIC_2026 = ROOT.parent / "public" / "data" / "rosters-2026.json"
PUBLIC_LEGACY = ROOT.parent / "public" / "data" / "rosters.json"
UA = "Mozilla/5.0 (compatible; PublicCap/1.1; +https://github.com/BB-41/public-cap)"
AS_OF = "2026-09-06"

# Cited depth ranks applied after Wikipedia matching. Full name only.
# Leave unmatched names at None — do not invent a two-deep.
DEPTH_OVERRIDES = {
    "smu": {
        "Kevin Jennings": {
            "depthRank": 1,
            "source": "Wikipedia — 2026 SMU Mustangs football team: third consecutive year as the starter",
            "url": "https://en.wikipedia.org/wiki/2026_SMU_Mustangs_football_team",
        }
    },
    "washington": {
        "Demond Williams Jr.": {
            "depthRank": 1,
            "source": "ESPN Apple Cup box score (Washington vs Washington State, Sep 6, 2026): started and completed every Washington pass (24/35, 268 yards, 1 TD)",
            "url": "https://www.espn.com/college-football/boxscore/_/gameId/401858437",
        }
    },
    "wisconsin": {
        "Colton Joseph": {
            "depthRank": 1,
            "source": "ESPN box score (Wisconsin at Notre Dame, Sep 6, 2026): started at QB",
            "url": "https://www.espn.com/college-football/boxscore/_/gameId/401858438",
        }
    },
    "louisville": {
        "Lincoln Kienholz": {
            "depthRank": 1,
            "source": "ESPN box score (Louisville at Ole Miss, Sep 6, 2026): started at QB",
            "url": "https://www.espn.com/college-football/boxscore/_/gameId/401856661",
        }
    },
}

# Players confirmed on a public ESPN athlete record / box score but missing
# from the team roster JSON. Injected before depth matching so a cited
# override can attach. Do not invent class/jersey — copy the ESPN athlete file.
ROSTER_ADDITIONS = {
    "washington": [
        {
            "id": "5079653",
            "name": "Demond Williams Jr.",
            "first": "Demond",
            "last": "Williams Jr.",
            "pos": "QB",
            "posName": "Quarterback",
            "family": "qb",
            "class": "JR",
            "className": "Junior",
            "years": 3,
            "jersey": "1",
            "unit": "offense",
            "playerUrl": "https://www.espn.com/college-football/player/_/id/5079653/demond-williams-jr",
        }
    ]
}

CITED_STARTER_SOURCES = [
    {
        "id": "smu-jennings-starter",
        "label": "Wikipedia — 2026 SMU Mustangs football team (Kevin Jennings starter)",
        "url": "https://en.wikipedia.org/wiki/2026_SMU_Mustangs_football_team",
    },
    {
        "id": "washington-williams-starter",
        "label": "ESPN box score — Apple Cup (Demond Williams Jr. started)",
        "url": "https://www.espn.com/college-football/boxscore/_/gameId/401858437",
    },
    {
        "id": "wisconsin-joseph-starter",
        "label": "ESPN box score — Wisconsin at Notre Dame (Colton Joseph started)",
        "url": "https://www.espn.com/college-football/boxscore/_/gameId/401858438",
    },
    {
        "id": "louisville-kienholz-starter",
        "label": "ESPN box score — Louisville at Ole Miss (Lincoln Kienholz started)",
        "url": "https://www.espn.com/college-football/boxscore/_/gameId/401856661",
    },
]

CITED_STARTER_NOTES = (
    "Cited starter overrides (full name + public URL) are applied after wiki matching — "
    "SMU QB Kevin Jennings is depthRank 1 from the 2026 team-page starter note; "
    "Washington Demond Williams Jr., Wisconsin Colton Joseph, and Louisville Lincoln Kienholz "
    "are depthRank 1 from Sep 6, 2026 ESPN box scores. "
    "Demond Williams Jr. is injected from the ESPN athlete record when absent from the team roster JSON."
)

ESPN_TEAMS = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=1000"
ESPN_ROSTER = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/{id}/roster"
WIKI = "https://en.wikipedia.org/wiki/{title}"
WIKI_API = "https://en.wikipedia.org/w/api.php"

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


def get(url: str, timeout: int = 30, retries: int = 4) -> tuple[int, bytes]:
    headers = {
        "User-Agent": UA,
        "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.espn.com/college-football/",
    }
    last_code, last_body = 0, b""
    for attempt in range(retries):
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            last_code = e.code
            last_body = e.read() if e.fp else b""
            if e.code not in {403, 429, 500, 502, 503} or attempt == retries - 1:
                return e.code, last_body
        except Exception as e:
            last_code, last_body = 0, str(e).encode()
            if attempt == retries - 1:
                return last_code, last_body
        time.sleep(1.5 * (attempt + 1))
    return last_code, last_body


def load_espn_index() -> list[dict]:
    code, body = get(ESPN_TEAMS)
    if code != 200:
        raise SystemExit(f"ESPN teams list failed {code}: {body[:200]!r}")
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
    raw = re.sub(r"^\s*\d+\s+", "", raw)
    parts = re.split(r"[|/]| and ", raw)
    out = []
    for p in parts:
        p = re.sub(r"^\d+\s+", "", p)
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


def parse_wiki_depth_wikitext(wt: str) -> dict[str, int]:
    """Parse {{CFB Team Depth Chart}} / {{CFB Depth Chart}} parameter lines."""
    ranks: dict[str, int] = {}
    if not wt:
        return ranks
    for m in re.finditer(r"\{\{\s*CFB(?:\s+Team)?\s+Depth\s+Chart\b(.*)\n\}\}", wt, flags=re.I | re.S):
        for line in m.group(1).splitlines():
            mm = re.match(
                r"\|\s*([A-Za-z0-9]+)_((?:Starter|Backup|Third|Reserves?))\s*=\s*(.*)",
                line,
                flags=re.I,
            )
            if not mm:
                continue
            slot, kind, raw = mm.group(1), mm.group(2), mm.group(3)
            if slot.endswith("SchoolName") or slot.startswith("Key") or slot in {"OffenseRef", "DefenseRef"}:
                continue
            rank = 1 if kind.lower() == "starter" else 2 if kind.lower() == "backup" else 3
            for name in clean_wiki_name(raw):
                key = norm(name)
                if key and (key not in ranks or rank < ranks[key]):
                    ranks[key] = rank
    return ranks


def fetch_wiki_wikitext(title: str) -> tuple[int, str]:
    q = urllib.parse.urlencode(
        {"action": "parse", "page": title, "prop": "wikitext", "format": "json", "redirects": 1}
    )
    code, body = get(f"{WIKI_API}?{q}", timeout=25)
    if code != 200:
        return code, ""
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return 0, ""
    if data.get("error"):
        return 404, ""
    return 200, (data.get("parse") or {}).get("wikitext", {}).get("*") or ""


def apply_roster_additions(sid: str, players: list[dict]) -> int:
    """Inject cited ESPN athletes missing from the team roster JSON. Returns added count."""
    extras = ROSTER_ADDITIONS.get(sid) or []
    if not extras:
        return 0
    have_ids = {p.get("id") for p in players}
    have_names = {norm(p.get("name") or "") for p in players}
    added = 0
    for extra in extras:
        eid = str(extra.get("id") or "")
        ename = norm(extra.get("name") or "")
        if (eid and eid in have_ids) or (ename and ename in have_names):
            continue
        players.append(dict(extra))
        if eid:
            have_ids.add(eid)
        if ename:
            have_names.add(ename)
        added += 1
    return added


def apply_depth_overrides(sid: str, players: list[dict]) -> int:
    """Apply cited starter/backup ranks. Returns newly ranked count."""
    ov = DEPTH_OVERRIDES.get(sid) or {}
    if not ov:
        return 0
    added = 0
    for p in players:
        hit = ov.get(p.get("name") or "")
        if not hit:
            continue
        if not p.get("depthRank"):
            added += 1
        p["depthRank"] = hit["depthRank"]
        p["depthSource"] = hit.get("source")
        p["depthUrl"] = hit.get("url")
    return added


def write_roster_files(out: dict) -> None:
    OUT.write_text(json.dumps(out, indent=2))
    compact = json.dumps(out, separators=(",", ":"))
    PUBLIC_2026.write_text(compact)
    PUBLIC_LEGACY.write_text(compact)


def fetch_wiki_depth(team: dict) -> tuple[dict[str, int], str | None, int | None]:
    page_2026: tuple[str, int] | None = None
    for title in wiki_titles(team):
        url = WIKI.format(title=title.replace(" ", "_"))
        year = 2026 if title.startswith("2026") else 2025
        code, wt = fetch_wiki_wikitext(title)
        time.sleep(0.15)
        if code != 200:
            continue
        if year == 2026:
            page_2026 = (url, year)
        ranks = parse_wiki_depth_wikitext(wt)
        if not ranks:
            # HTML fallback for pages whose template JSON is not in wikitext
            hcode, body = get(url, timeout=25)
            time.sleep(0.15)
            if hcode == 200:
                html = body.decode("utf-8", "replace")
                if "Wikipedia does not have a" not in html or "depth chart" in html.lower():
                    ranks = parse_wiki_depth(html)
        if ranks:
            return ranks, url, year
        if year == 2026:
            continue
        if page_2026:
            return {}, page_2026[0], page_2026[1]
        return {}, url, year
    if page_2026:
        return {}, page_2026[0], page_2026[1]
    return {}, None, None


def main() -> None:
    print("CFBD skip: API key required (401).")
    espn_teams = load_espn_index()
    mapping = map_schools(espn_teams)
    out = {
        "meta": {
            "asOf": AS_OF,
            "season": 2026,
            "notes": (
                "Football names from ESPN public team roster JSON (2026 season), pulled after Week 1. "
                "Depth ranks from Wikipedia 2026 then 2025 CFB Team Depth Chart (wikitext API, HTML fallback). "
                "A 2026 chart beats a 2025 chart. ESPN's public depthcharts JSON was empty on this pull. "
                "Last-name depth matches require a unique last name on the ESPN roster. "
                + CITED_STARTER_NOTES + " "
                "CollegeFootballData roster API returned 401 without a key and was skipped."
            ),
            "sources": [
                {"id": "espn-roster", "label": "ESPN college-football team roster API", "url": ESPN_TEAMS},
                {"id": "wikipedia-depth", "label": "Wikipedia CFB Team Depth Chart (2026 then 2025, wikitext)"},
                *CITED_STARTER_SOURCES,
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
        apply_roster_additions(sid, players)
        season = (payload.get("season") or {}).get("year")
        if not players:
            out["failed"].append({"id": sid, "reason": "ESPN roster empty"})
            continue

        ranks, wiki_url, wiki_year = fetch_wiki_depth(team)
        last_counts: dict[str, int] = {}
        for p in players:
            ln = norm(p.get("last") or "")
            if ln:
                last_counts[ln] = last_counts.get(ln, 0) + 1
        ranked = 0
        for p in players:
            key = norm(p["name"])
            alt = norm(f"{p['first']} {p['last']}")
            r = ranks.get(key) or ranks.get(alt)
            # last-name unique match only if that last name is unique on the roster
            # (avoids giving Jake Bobo Drew Bobo's OL starter rank)
            if r is None and p["last"]:
                ln = norm(p["last"])
                if last_counts.get(ln, 0) == 1:
                    hits = [v for k, v in ranks.items() if k.endswith(" " + ln) or k == ln]
                    if len(hits) == 1:
                        r = hits[0]
            p["depthRank"] = r  # 1/2/3 or None
            if r:
                ranked += 1
        ranked += apply_depth_overrides(sid, players)

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

    write_roster_files(out)
    named = sum(1 for v in out["schools"].values() if v.get("playerCount"))
    players = sum(v.get("playerCount", 0) for v in out["schools"].values())
    print(f"Wrote {OUT}, {PUBLIC_2026}, and {PUBLIC_LEGACY}")
    print(f"Schools with names: {named}/{n}; players: {players}; failed: {out['failed']}")


def apply_overrides_only() -> None:
    """Re-apply cited additions/overrides to the on-desk roster files without a live ESPN pull."""
    out = json.loads(OUT.read_text())
    notes = out.setdefault("meta", {}).get("notes") or ""
    marker = "Cited starter overrides (full name + public URL)"
    if marker in notes:
        prefix, _sep, rest = notes.partition(marker)
        # Drop the old cited-override sentence; keep the CFBD skip if present.
        after = rest
        if "CollegeFootballData" in after:
            after = "CollegeFootballData" + after.split("CollegeFootballData", 1)[1]
        else:
            after = after.split(". ", 1)[-1] if ". " in after else ""
        out["meta"]["notes"] = (prefix + CITED_STARTER_NOTES + (" " + after if after else "")).strip()
    elif CITED_STARTER_NOTES not in notes:
        out["meta"]["notes"] = (notes.rstrip() + " " + CITED_STARTER_NOTES).strip()
    sources = out.setdefault("meta", {}).setdefault("sources", [])
    have = {s.get("id") for s in sources}
    for src in CITED_STARTER_SOURCES:
        if src["id"] not in have:
            sources.append(src)
            have.add(src["id"])
    schools = out.get("schools") or {}
    for sid in sorted(set(ROSTER_ADDITIONS) | set(DEPTH_OVERRIDES)):
        school = schools.get(sid)
        if not school:
            continue
        players = school.get("players") or []
        added = apply_roster_additions(sid, players)
        ranked = apply_depth_overrides(sid, players)
        school["players"] = players
        school["playerCount"] = len(players)
        school["depthMatched"] = sum(1 for p in players if p.get("depthRank"))
        print(f"{sid}: +{added} roster rows, {ranked} cited ranks, depthMatched={school['depthMatched']}")
    write_roster_files(out)
    print(f"Wrote {OUT}, {PUBLIC_2026}, and {PUBLIC_LEGACY}")


if __name__ == "__main__":
    import sys

    if "--apply-overrides-only" in sys.argv:
        apply_overrides_only()
    else:
        main()
