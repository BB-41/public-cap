#!/usr/bin/env python3
"""Fill leftover athletics-debt holes and named stadium/building projects.

Additive only:
  - Category 52 / 34 only when a hosted MFRS/AUP (or newsroom quoting those
    exact lines) prints them. Does not overwrite booked outstanding/service.
  - Named projects from newsroom / board / official cites. No invented
    amortization. Remaining / through only when the cite names them.
  - Media upgrades: Arkansas, South Carolina, LSU estimated SEC floors →
    reported MFRS/AUP media+conference stacks from the same hosted PDF used
    for debt. Florida UAA prints SEC+NCAA combined, not Category 11 — leave
    the estimated floor. Do not overwrite a cell already reported from a
    990 or MFRS.

Does not add debt to annual capacity.
Does not book Category 53 university-wide institutional debt.
Does not touch NIL, House, Item 44, collective990, coaches, staff, buyouts,
apparel, or subsidy.
"""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / "public" / "data"
SRC = ROOT / "data"

LSU_AUP = (
    "https://app2.lla.state.la.us/publicreports.nsf/0/f5626f9d09f9522486258d8f006c2429/"
    "$file/00009a43.pdf?.7773098=&openelement="
)
AR_MFRS = "https://arkansasrazorbacks.com/pdf/athletics/ncaa-membership/2024-25.pdf"
SC_AUP = "https://sc.edu/about/offices_and_divisions/controller/documents/usc_columbia_ncaa_aup_report_2025.pdf"

# Same hosted PDFs already used for debt. Media Rights + Conference (non-media)
# + Conference postseason — desk convention from Ole Miss / Tennessee.
MEDIA = {
    "arkansas": {
        "value": 60_527_434,
        "source": (
            "Arkansas FY2025 NCAA Membership Financial Report — Media Rights "
            "$42,407,177 + Conference $4,603,644 + Conference postseason $13,516,613"
        ),
        "url": AR_MFRS,
        "asOf": "2026-01",
        "notes": (
            "SEC floor was $70.3M. We use the school's MFRS media+conference stack "
            "so we do not double-count the floor. Same hosted PDF as Category 52/34."
        ),
    },
    "south-carolina": {
        "value": 62_094_554,
        "source": (
            "South Carolina FY2025 NCAA AUP (Columbia campus) — Media Rights "
            "$44,003,065 + Conference $2,728,777 + Conference postseason $15,362,712"
        ),
        "url": SC_AUP,
        "asOf": "2025-06-30",
        "notes": (
            "SEC floor was $70.3M. We use the school's AUP media+conference stack "
            "so we do not double-count the floor. Same hosted AUP as Category 52/34."
        ),
    },
    "lsu": {
        "value": 69_548_957,
        "source": (
            "LSU FY2025 NCAA AUP (Louisiana Legislative Auditor) — Media rights "
            "$53,107,417 + Conference (non-media/non-postseason) $3,267,327 + "
            "Conference postseason $13,174,213"
        ),
        "url": LSU_AUP,
        "asOf": "2025-06-30",
        "notes": (
            "SEC floor was $70.3M. We use the school's AUP media+conference stack "
            "so we do not double-count the floor. Same hosted AUP as Category 34."
        ),
    },
}

LSU_SERVICE = {
    "url": LSU_AUP,
    "source": "LSU FY2025 NCAA AUP (Louisiana Legislative Auditor)",
    "asOf": "2025-06-30",
    "debtService": 13_257_498,
    "notes": (
        "Hosted FY2025 NCAA AUP on the Louisiana Legislative Auditor site. "
        "Statement line Athletic facilities debt service, leases, and rental fees "
        "$13,257,498 is Category 34. The notes print LSU Athletics bonds outstanding "
        "$44,130,000 and TAF bonds $107,059,438 separately — no combined Category 52 "
        "line is booked. Category 53 university-wide debt is refused. Not added to capacity."
    ),
}

# Named stadium / indoor / facility / campus-loan projects. Cost only when cited.
# remaining / through only when the cite names them. No invented amortization.
PROJECTS = {
    "oklahoma": [
        {
            "name": "The Palace Project — Gaylord Family Oklahoma Memorial Stadium west side",
            "kind": "stadium",
            "cost": 450_000_000,
            "remaining": None,
            "through": "2029",
            "source": "Oklahoma Athletics — Board of Regents Palace Project announcement",
            "url": "https://soonersports.com/news/2025/11/21/football-ou-announces-the-palace-project",
            "notes": (
                "Regents advanced west-side design; estimated cost of the west-side "
                "renovation, inclusive of a sizable maintenance investment, is $450 million. "
                "Construction after the 2027 season; completion targeted for the 2029 season. "
                "No state-appropriated funds or student tuition/fees. Remaining principal "
                "is not named — do not invent an amortization. FY2025 Category 52 stays pending."
            ),
            "confidence": "reported",
        }
    ],
    "auburn": [
        {
            "name": "Jordan-Hare Stadium north-end multipurpose facility and plaza",
            "kind": "stadium",
            "cost": 323_000_000,
            "remaining": None,
            "through": "2029",
            "source": "AP — Auburn Board of Trustees Jordan-Hare $323 million renovation",
            "url": "https://apnews.com/article/auburn-jordanhare-stadium-renovation-fa40038cce47a9be0f2cebababfddae1",
            "notes": (
                "Board of Trustees granted final approval. Facility $305 million plus plaza "
                "$18 million = $323 million. Portion targeted fall 2028; remainder spring 2029. "
                "Remaining principal is not named. FY2025 Category 52/34 stay pending without "
                "a hosted MFRS PDF."
            ),
            "confidence": "reported",
        },
        {
            "name": "Jordan-Hare Stadium north-end video board",
            "kind": "stadium",
            "cost": 25_700_000,
            "remaining": None,
            "through": "2025",
            "source": "AP — Auburn $25.7 million Jordan-Hare video board (completed before 2025 season)",
            "url": "https://apnews.com/article/auburn-jordanhare-stadium-renovation-fa40038cce47a9be0f2cebababfddae1",
            "notes": "Named completed capital project on the same AP cite. Not Category 52 leftover.",
            "confidence": "reported",
        },
    ],
    "missouri": [
        {
            "name": "Memorial Stadium Centennial Project (Faurot Field north end zone)",
            "kind": "stadium",
            "cost": 250_000_000,
            "remaining": None,
            "through": "2026",
            "source": "Missouri Athletics — Memorial Stadium Centennial Project",
            "url": "https://mutigers.com/news/2026/04/17/from-renderings-to-reality-mizzous-memorial-stadium-centennial-project-comes-to-life-two-years-after-first-images-emerged",
            "notes": (
                "Official: $250 million project enclosing the north end zone, targeted for the "
                "2026 season. Board of Curators approved design April 18, 2024. Remaining "
                "principal is not named. FY2025 Category 52/34 stay pending without a hosted MFRS."
            ),
            "confidence": "reported",
        }
    ],
    "west-virginia": [
        {
            "name": "Milan Puskar Stadium West Tower Press Box",
            "kind": "stadium",
            "cost": 150_000_000,
            "remaining": None,
            "through": "2028",
            "source": "West Virginia Athletics — AD Wren Baker on the West Tower project",
            "url": "https://wvusports.com/news/2026/5/22/football-wvus-baker-says-west-tower-press-box-project-moving-along",
            "notes": (
                "Official: estimated $150 million West Tower Press Box, approved by the Board "
                "of Governors. Construction after the 2026 season; open targeted for 2028. "
                "Remaining principal is not named. FY2025 Category 52/34 stay pending."
            ),
            "confidence": "reported",
        }
    ],
    "texas-tech": [
        {
            "name": "Jones AT&T Stadium south end zone / Dustin R. Womble Football Center",
            "kind": "stadium",
            "cost": 242_000_000,
            "remaining": None,
            "through": "2025",
            "source": "Lubbock Avalanche-Journal — Texas Tech $242 million football facilities project",
            "url": "https://www.lubbockonline.com/story/sports/college/red-raiders/2024/08/09/texas-tech-football-jones-att-stadium-womble-football-center-latest/74725504007/",
            "notes": (
                "Newsroom: two-year $242 million project announced July 2022 (south end zone, "
                "Womble Football Center, visitors locker room). South end zone opened 2024; "
                "Womble completed that winter. A later cite discusses a 30-year payoff plan "
                "of more than $200 million — not an exact remaining principal, so remaining "
                "is not booked. FY2025 Category 52/34 stay pending."
            ),
            "confidence": "reported",
        }
    ],
    "purdue": [
        {
            "name": "Ross-Ade Stadium Phase 1 renovation",
            "kind": "stadium",
            "cost": 45_400_000,
            "remaining": None,
            "through": "2023",
            "source": "Purdue News — Board of Trustees Ross-Ade / Mackey package",
            "url": "https://www.purdue.edu/newsroom/2022/Q2/purdue-trustees-approve-namings-and-resolutions-of-appreciation-ross-ade-stadium-and-mackey-arena-renovations-contract-extension-for-brohm",
            "notes": (
                "Trustees: estimated total project cost $45.4 million, gift-funded. Tunnel from "
                "Kozuch Football Performance Complex, dining conversion, south-end concourse "
                "connector. Completion targeted August 2023. Remaining principal is not named. "
                "FY2025 Category 52/34 stay pending without a hosted MFRS."
            ),
            "confidence": "reported",
        }
    ],
    "kentucky": [
        {
            "name": "Champions Blue / UK Athletics facilities capital loan",
            "kind": "loan",
            "cost": 110_000_000,
            "remaining": None,
            "through": "repayment begins FY2027-28",
            "source": "University of Kentucky Office of the President — Champions Blue projects",
            "url": "https://pres.uky.edu/champions-blue-projects",
            "notes": (
                "Board of Trustees approved an internal loan of up to $110 million for athletics "
                "capital projects. Named initial pieces on the same page: Kroger Field maintenance "
                "$15M; corner suites and elevators $13M; soccer/softball $5M; west-end club design "
                "and Wi-Fi $8M. Those named draws are not even-split out of the $110M ceiling. "
                "A separate up-to-$31M operating loan is not a facility project and is not booked. "
                "Remaining principal is not named. FY2025 Category 52/34 stay pending. Does not "
                "touch the $18M House counsel NIL cell."
            ),
            "confidence": "reported",
        }
    ],
    "texas-am": [
        {
            "name": "Bright-Slocum Center renovation",
            "kind": "indoor",
            "cost": 52_000_000,
            "remaining": None,
            "through": "2029",
            "source": "The Eagle / myAggieNation — A&M Board of Regents Bright-Slocum $52 million",
            "url": "https://myaggienation.com/aggie_sports/football/a-m-board-of-regents-approve-renovations-to-bright-slocum-center/article_f5c90578-623c-5649-b792-f2529da62789.html",
            "notes": (
                "Regents unanimously approved a three-phased $52 million Bright-Slocum renovation. "
                "Phase 1A $30 million (locker rooms / training) after the 2026 season; later phases "
                "through August 2029. Remaining principal is not named. FY2025 Category 52/34 stay "
                "pending — The Eagle NCAA FOIA story printed rounded $24 million debt service, not "
                "the exact Category 34 line."
            ),
            "confidence": "reported",
        }
    ],
    "ucf": [
        {
            "name": "Roth Tower expansion — FBC Mortgage Stadium",
            "kind": "stadium",
            "cost": 88_000_000,
            "remaining": None,
            "through": "2026",
            "source": "FOX 35 Orlando — UCF Board of Trustees Roth Tower expansion",
            "url": "https://www.fox35orlando.com/news/ucf-football-stadium-roth-tower-expansion-project",
            "notes": (
                "Newsroom quoting university records: estimated price tag $88 million, Board of "
                "Trustees approved construction and financing. Orange County TDT funding is $90 "
                "million; BOT packet also cites $88.6 million of new debt. Cost is the announced "
                "estimated project price, not an invented leftover. Through fall 2026. FY2025 "
                "Category 52/34 stay pending."
            ),
            "confidence": "estimated",
        }
    ],
    "florida": [
        {
            "name": "Ben Hill Griffin Stadium renovation",
            "kind": "stadium",
            "cost": 1_450_000_000,
            "remaining": None,
            "through": "2030",
            "source": "Gainesville Sun — UF Board of Trustees Ben Hill Griffin $1.45 billion renovation",
            "url": "https://www.gainesville.com/story/news/education/campus/2026/06/11/university-of-florida-approves-massive-stadium-revamp/90511846007/",
            "notes": (
                "Board of Trustees approved financing June 11, 2026. Construction after the 2026 "
                "season; completion before the 2030 season. Funded by donors, reserves, "
                "project-generated revenues and long-term debt pending Board of Governors. "
                "Remaining principal is not named. Does not overwrite UAA FY2025 outstanding."
            ),
            "confidence": "reported",
        }
    ],
}

UNTOUCHABLE_LAYER_KEYS = ("apparel", "subsidy", "buyoutsPaid", "portal", "record")
UNTOUCHABLE_SCHOOL_KEYS = ("nil", "coaches", "staff", "coachesByYear", "staffByYear")


def load(path: Path):
    return json.loads(path.read_text())


def dump(path: Path, data, *, ensure_ascii: bool):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=ensure_ascii) + "\n")


def money(n):
    return f"${n:,}"


def field(value, confidence, source, url, as_of, *, fiscal_year="FY2025", notes=None):
    return {
        "value": value,
        "confidence": confidence,
        "source": source,
        "url": url,
        "asOf": as_of,
        "fiscalYear": fiscal_year,
        "notes": notes,
    }


def reported_cap(value, source, url, as_of, notes=None, fiscal_year="FY2025"):
    out = {
        "value": value,
        "confidence": "reported",
        "source": source,
        "url": url,
        "asOf": as_of,
        "fiscalYear": fiscal_year,
    }
    if notes:
        out["notes"] = notes
    return out


def tape_item(**kwargs):
    return kwargs


def snapshot_layers(schools):
    return {sid: deepcopy({k: schools[sid].get(k) for k in UNTOUCHABLE_LAYER_KEYS}) for sid in schools}


def snapshot_schools(by_id):
    return {
        sid: deepcopy({k: by_id[sid].get(k) for k in UNTOUCHABLE_SCHOOL_KEYS if k in by_id[sid]})
        for sid in by_id
    }


def snapshot_media(by_id):
    return {sid: deepcopy(by_id[sid]["capacity"]["mediaConference"]) for sid in by_id}


def assert_untouched_layers(before, after):
    for sid, prev in before.items():
        cur = after[sid]
        for key in UNTOUCHABLE_LAYER_KEYS:
            if prev.get(key) != cur.get(key):
                raise SystemExit(f"refused to overwrite {sid} {key}")


def assert_untouched_schools(before, after):
    for sid, prev in before.items():
        cur = after[sid]
        for key in UNTOUCHABLE_SCHOOL_KEYS:
            if prev.get(key) != cur.get(key):
                raise SystemExit(f"refused to overwrite {sid} {key}")


def project_key(p):
    return (p.get("name"), p.get("url"), p.get("cost"))


def append_projects(layer, rows):
    existing = {project_key(p) for p in (layer.get("projects") or [])}
    added = []
    for row in rows:
        if project_key(row) in existing:
            continue
        layer.setdefault("projects", []).append(row)
        added.append(row)
    return added


def main():
    layers_doc = load(PUB / "layers.json")
    tape_src = load(SRC / "tape.json")
    schools_doc = load(SRC / "schools.json")
    by_id = {s["id"]: s for s in schools_doc["schools"]}
    names = {s["id"]: s["name"] for s in schools_doc["schools"]}
    layers = layers_doc["schools"]
    before_layers = snapshot_layers(layers)
    before_schools = snapshot_schools(by_id)
    before_all_media = snapshot_media(by_id)
    before_media = {sid: deepcopy(before_all_media[sid]) for sid in MEDIA}
    before_debt = {sid: deepcopy(layers[sid]["debt"]) for sid in layers}

    booked_svc = []
    booked_proj = []
    media_upgraded = []

    # --- LSU Category 34 only (no invented Category 52 sum) ---
    lsu = layers["lsu"]["debt"]
    if lsu["outstanding"].get("value") is not None:
        raise SystemExit("lsu outstanding already booked — refuse overwrite")
    if lsu["debtService"].get("value") is not None:
        raise SystemExit("lsu debtService already booked — refuse overwrite")
    rec = LSU_SERVICE
    lsu["debtService"] = field(
        rec["debtService"],
        "reported",
        f"{rec['source']} — Category 34 Athletic Facilities Debt Service {money(rec['debtService'])}",
        rec["url"],
        rec["asOf"],
        notes=(
            f"NCAA AUP statement — athletic facilities debt service, leases and rental fees "
            f"{money(rec['debtService'])}. This year’s check (principal + interest + leases/rent), "
            "regardless of who paid. Not added to annual capacity."
        ),
    )
    lsu["notes"] = rec["notes"]
    booked_svc.append("lsu")

    # --- projects (append only) ---
    for sid, rows in PROJECTS.items():
        d = layers[sid]["debt"]
        added = append_projects(d, rows)
        if not added:
            continue
        booked_proj.append(sid)
        if d["outstanding"].get("value") is None and d["debtService"].get("value") is None:
            d["notes"] = (
                "No hosted FY2025 NCAA MFRS / AUP Category 52/34 line on the desk yet. "
                "Named project(s) are cited board / official / newsroom costs, not a Category 52 leftover. "
                "Empty outstanding means pending, not zero."
            )

    # --- media upgrades (estimated floor → reported school line) ---
    for sid, rec in MEDIA.items():
        cell = by_id[sid]["capacity"]["mediaConference"]
        if cell.get("confidence") == "reported" and "MFRS" in (cell.get("source") or ""):
            raise SystemExit(f"{sid} media already reported from MFRS — refuse overwrite")
        if cell.get("confidence") == "reported" and "990" in (cell.get("source") or ""):
            raise SystemExit(f"{sid} media already reported from 990 — refuse overwrite")
        if cell.get("confidence") != "estimated":
            raise SystemExit(f"{sid} media is {cell.get('confidence')}, not estimated")
        if cell.get("value") != 70_300_000:
            raise SystemExit(f"{sid} media is {cell.get('value')}, not the $70.3M SEC floor")
        by_id[sid]["capacity"]["mediaConference"] = reported_cap(
            rec["value"], rec["source"], rec["url"], rec["asOf"], rec["notes"]
        )
        media_upgraded.append(sid)

    # Florida stays on the estimated SEC floor — UAA prints SEC+NCAA combined, not Cat 11.
    fl = by_id["florida"]["capacity"]["mediaConference"]
    if fl.get("value") != 70_300_000 or fl.get("confidence") != "estimated":
        raise SystemExit("florida media drifted before this pass")

    ky_nil = by_id["kentucky"]["nil"]["booked"]["value"]
    if ky_nil != 18_000_000:
        raise SystemExit(f"kentucky booked NIL drifted: {ky_nil}")

    assert_untouched_layers(before_layers, layers)
    assert_untouched_schools(before_schools, by_id)
    for sid, prev in before_all_media.items():
        if sid in MEDIA:
            continue
        if by_id[sid]["capacity"]["mediaConference"] != prev:
            raise SystemExit(f"refused to overwrite {sid} mediaConference")

    # refuse overwrite of already-booked outstanding/service
    for sid, prev in before_debt.items():
        cur = layers[sid]["debt"]
        if prev["outstanding"].get("value") is not None and cur["outstanding"] != prev["outstanding"]:
            raise SystemExit(f"refused to overwrite {sid} outstanding")
        if prev["debtService"].get("value") is not None and cur["debtService"] != prev["debtService"]:
            raise SystemExit(f"refused to overwrite {sid} debtService")
        if prev.get("projects"):
            prev_keys = {project_key(p) for p in prev["projects"]}
            if not prev_keys.issubset({project_key(p) for p in cur.get("projects") or []}):
                raise SystemExit(f"refused to drop {sid} existing projects")

    # --- tape ---
    existing = {it.get("id") for it in tape_src.get("items", [])}
    new_tape = []
    for sid in booked_svc:
        d = layers[sid]["debt"]["debtService"]
        tid = f"{sid}-debt-service-fy2025"
        if tid in existing or d.get("value") is None:
            continue
        new_tape.append(
            tape_item(
                id=tid,
                date=d.get("asOf") if d.get("asOf") and len(str(d.get("asOf"))) >= 7 else "2026-01",
                school=sid,
                schoolName=names.get(sid, sid),
                kind="debt",
                headline=(
                    f"{names.get(sid, sid)} FY2025 Category 34 athletic facilities debt service is {money(d['value'])}."
                ),
                figure=d["value"],
                confidence="reported",
                source={"label": d.get("source"), "url": d.get("url")},
                field="layers.debt.debtService",
            )
        )
    for sid in booked_proj:
        for i, p in enumerate(layers[sid]["debt"]["projects"]):
            tid = f"{sid}-debt-project-{i}"
            if tid in existing:
                continue
            date = "2026-08-28"
            if sid == "oklahoma":
                date = "2025-11-21"
            elif sid == "missouri":
                date = "2026-04-17"
            elif sid == "west-virginia":
                date = "2026-05-22"
            elif sid == "kentucky":
                date = "2025-06-13"
            elif sid == "florida":
                date = "2026-06-11"
            elif sid == "purdue":
                date = "2022-04-08"
            elif sid == "ucf":
                date = "2024-03-29"
            new_tape.append(
                tape_item(
                    id=tid,
                    date=date,
                    school=sid,
                    schoolName=names.get(sid, sid),
                    kind="debt",
                    headline=f"{names.get(sid, sid)} named athletics-debt project: {p['name']}"
                    + (f" ({money(p['cost'])})" if p.get("cost") is not None else ""),
                    figure=p.get("cost"),
                    confidence=p.get("confidence") or "reported",
                    source={"label": p.get("source"), "url": p.get("url")},
                    field="layers.debt.projects",
                )
            )
    for sid in media_upgraded:
        rec = MEDIA[sid]
        old = before_media[sid]
        tid = f"{sid}-mfrs-media-fy2025"
        if tid in existing:
            continue
        new_tape.append(
            tape_item(
                id=tid,
                date=rec["asOf"] if len(str(rec["asOf"])) >= 7 else "2026-01",
                school=sid,
                schoolName=names.get(sid, sid),
                kind="990",
                headline=(
                    f"{names.get(sid, sid)} FY2025 media+conference stack is {money(rec['value'])} "
                    f"(was the {money(old['value'])} SEC floor)."
                ),
                figure=rec["value"],
                confidence="reported",
                source={"label": rec["source"], "url": rec["url"]},
                field="capacity.mediaConference",
            )
        )

    tape_src["items"] = list(tape_src.get("items") or []) + new_tape
    tape_src["meta"]["itemCount"] = len(tape_src["items"])
    tape_src["meta"]["asOf"] = "2026-08-28"
    layers_doc["meta"]["asOf"] = "2026-08-28"
    idx = schools_doc["meta"].setdefault("sourcesIndex", {})
    idx["lsu_aup"] = LSU_AUP
    idx["ar_mfrs"] = AR_MFRS
    idx["sc_aup"] = SC_AUP

    dump(PUB / "layers.json", layers_doc, ensure_ascii=True)
    dump(SRC / "tape.json", tape_src, ensure_ascii=True)
    dump(PUB / "tape.json", tape_src, ensure_ascii=True)
    dump(SRC / "schools.json", schools_doc, ensure_ascii=False)
    dump(PUB / "schools.json", schools_doc, ensure_ascii=False)

    pending_ids = sorted(
        sid
        for sid, layer in layers.items()
        if layer.get("debt", {}).get("outstanding", {}).get("value") is None
        and layer.get("debt", {}).get("debtService", {}).get("value") is None
        and not layer.get("debt", {}).get("projects")
    )
    print("booked service:", ", ".join(sorted(booked_svc)))
    print("booked projects:", ", ".join(sorted(booked_proj)))
    print("media upgrades:", ", ".join(sorted(media_upgraded)))
    print("still empty (no stock/flow/project):", ", ".join(pending_ids))
    print(f"tape +{len(new_tape)}")


if __name__ == "__main__":
    main()
