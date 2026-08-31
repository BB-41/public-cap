#!/usr/bin/env python3
"""Book citeable FY2025 / House Y1 NIL cells. Does not invent dollars."""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data"
PUB = ROOT / "public" / "data"

PENDING_HOUSE = (
    "No House Year 1 (2025-26) FOIA / counsel spent total on the desk. "
    "FY2025 MFRS Item 44 is booked on nil.preCap."
)

PSU_SPORTS = (
    "Published sport lines (MFRS Item 44): football $13,338,959; "
    "men's basketball $3,004,666; wrestling $1,449,766; baseball $300,000; "
    "women's basketball $110,000; men's hockey $95,000; men's lacrosse $50,000; "
    "women's volleyball $10,000; men's tennis $10,000. "
    "Some of this may be Happy Valley United money folded onto Item 44 — "
    "labeled reported MFRS; no invented collective / institutional split beyond "
    "those published sport lines. Not House Year 1 (rev-share starts Jul 1, 2025 / FY2026)."
)

ZERO_NOTE = (
    "FY2025 Item 44 Institutional NIL Revenue Share is $0 "
    "(pre-House, year ended Jun 30 2025). Does not count against the 2025-26 House cap. "
    "Does not replace a House Year 1 spent total — that cell stays pending unless separately booked."
)


def field(value, confidence, source, url, as_of, *, fiscal_year=None, window=None, notes=None):
    out = {
        "value": value,
        "confidence": confidence,
        "source": source,
        "url": url,
        "asOf": as_of,
    }
    if fiscal_year:
        out["fiscalYear"] = fiscal_year
    if window:
        out["window"] = window
    if notes:
        out["notes"] = notes
    return out


def pending(notes):
    return {
        "value": None,
        "confidence": "pending",
        "source": None,
        "url": None,
        "asOf": None,
        "notes": notes,
    }


def tape_item(**kwargs):
    return kwargs


def load(path: Path):
    return json.loads(path.read_text())


def dump(path: Path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n")


def by_id(schools):
    return {s["id"]: s for s in schools}


def assert_untouched(before, after, school_id, *paths):
    b, a = before[school_id]["nil"], after[school_id]["nil"]
    for path in paths:
        cur_b, cur_a = b, a
        for key in path.split("."):
            cur_b = cur_b[key]
            cur_a = cur_a[key]
        if cur_b != cur_a:
            raise SystemExit(f"refused to overwrite {school_id} nil.{path}")


def main():
    schools_doc = load(SRC / "schools.json")
    tape_doc = load(SRC / "tape.json")
    before = deepcopy(by_id(schools_doc["schools"]))
    schools = by_id(schools_doc["schools"])

    # --- required institutional cells ---
    psu = schools["penn-state"]
    psu["nil"]["booked"] = pending(PENDING_HOUSE)
    psu["nil"]["preCap"] = field(
        18_368_391,
        "reported",
        "PennLive / Penn State on SI — FY2025 MFRS Item 44 Institutional NIL Revenue Share $18,368,391 (year ended Jun 30 2025)",
        "https://www.pennlive.com/pennstatefootball/2026/02/penn-state-spent-184-million-in-nil-during-fiscal-year-2025-heres-the-breakdown.html",
        "2026-02",
        fiscal_year="FY2025",
        notes=PSU_SPORTS + " Companion table: Penn State on SI (May 2, 2026).",
    )

    osu = schools["oklahoma-state"]
    osu["nil"]["booked"] = pending(PENDING_HOUSE)
    osu["nil"]["preCap"] = field(
        16_000_000,
        "estimated",
        'The Oklahoman — OSU FY2025 NCAA financial report: NIL compensation of "just over $16 million" for a portion of FY2025',
        "https://www.oklahoman.com/story/sports/college/cowboys/2026/01/26/oklahoma-state-athletics-2025-fiscal-year-finances-revenue-osu-cowboys/88307484007/",
        "2026-01-26",
        fiscal_year="FY2025",
        notes=(
            'Story phrasing is "just over $16 million." Booked as the $16 million the story names — '
            "not $16,000,001. NCAA report obtained by The Oklahoman; not a published ledger line. "
            "FY2025 (Jul 2024–Jun 2025) is pre-House. OSU intent to meet the $20.5M cap going forward is a plan, not booked."
        ),
    )

    texas = schools["texas"]
    texas["nil"]["booked"] = field(
        13_500_000,
        "reported",
        "Texas Public Radio / Houston Public Media — UT-Austin disclosed $13.5M revenue-share payments Jul 2025–end Mar 2026",
        "https://www.tpr.org/economy-and-labor/2026-04-05/how-much-money-do-college-athletes-in-texas-make-public-universities-wont-say",
        "2026-04-05",
        window="2025-07-01 to 2026-03",
        notes=(
            "School disclosure of House Year 1 year-to-date spend. "
            "On-track ~$18M is a projection — not booked. "
            "Do not add the FY2025 $3.2M MFRS line below (Jul–Aug 2025 overlaps this window). "
            "Do not book the $18M cap plan."
        ),
    )
    texas["nil"]["preCap"] = field(
        3_200_000,
        "reported",
        "Austin American-Statesman — Texas FY2025 NCAA financial report: $3.2M revenue-sharing (year ended Aug 31, 2025)",
        "https://www.statesman.com/sports/college/longhorns/football/article/texas-longhorns-nil-revenue-sharing-21304634.php",
        "2026-01-23",
        fiscal_year="FY2025",
        notes=(
            "School FY ends Aug 31, so this MFRS line is only two months of House (Jul 1–Aug 31, 2025). "
            "Not the $18M cap plan (Del Conte / Novak). "
            "Included in the House Year 1 YTD $13.5M above — not additional."
        ),
    )

    # --- optional booked-zero FY2025 Item 44 (separate preCap cells) ---
    zeros = [
        (
            "georgia",
            "UGA FY2025 NCAA financial report — Item 44 Institutional NIL Revenue Share $0",
            "https://georgiadogs.com/documents/download/2026/1/15/2025_NCAA_Financial_Report.pdf",
            "2026-01-15",
            PENDING_HOUSE,
        ),
        (
            "oregon",
            "Oregon FY2025 NCAA FRS / AUP — Item 44 Institutional NIL Revenue Share $0 (university told auditors there were no institutional NIL revenue-share expenses)",
            "https://goducks.com/documents/download/2026/1/13/University_of_Oregon_NCAA_FRS_FY2025_FINAL.pdf",
            "2026-01-13",
            PENDING_HOUSE,
        ),
        (
            "tennessee",
            "Tennessee FY2025 NCAA AUP — Item 44 Institutional NIL Revenue Share $0",
            "https://utsports.com/documents/download/2026/1/15/FY25_NCAA_AUP.pdf",
            "2026-01-15",
            PENDING_HOUSE,
        ),
        (
            "alabama",
            "Alabama FY2025 NCAA financial report (published copy) — Item 44 Institutional NIL Revenue Share $0",
            "https://www.scribd.com/document/996414831/Alabama-s-2024-25-athletics-financial-report",
            "2026-01",
            PENDING_HOUSE,
        ),
        (
            "utah",
            "Utah FY2025 NCAA Revenue and Expense Report — Item 44 Institutional NIL Revenue Share $0",
            "https://utahutes.com/documents/download/2026/1/21/FY25_NCAA_Revenue_and_Expense_Report.pdf",
            "2026-01-21",
            PENDING_HOUSE,
        ),
        (
            "north-carolina",
            "UNC FY2025 NCAA Membership Financial Report — Item 44 Institutional NIL Revenue Share $0",
            "https://goheels.com/documents/download/2026/2/3/NCAAMembershipFinancialReport2025.pdf",
            "2026-02-03",
            (
                "WRAL May 2026: UNC disclosed program allocations "
                "($13M football / $7M men's basketball / $250k women's basketball / $250k baseball). "
                "Allocation / budget, not a year-end FOIA spent ledger. Individual contracts withheld. Not booked. "
                "FY2025 Item 44 $0 is on nil.preCap."
            ),
        ),
    ]
    for sid, source, url, as_of, booked_notes in zeros:
        schools[sid]["nil"]["booked"] = pending(booked_notes)
        schools[sid]["nil"]["preCap"] = field(
            0, "reported", source, url, as_of, fiscal_year="FY2025", notes=ZERO_NOTE
        )

    # Kentucky: keep the $18M House-window counsel cell. No FY2025 MFRS PDF on the desk.
    after = by_id(schools_doc["schools"])
    assert_untouched(before, after, "louisville", "booked", "preCap")
    assert_untouched(before, after, "kentucky", "booked")
    assert_untouched(before, after, "ucla", "booked")
    assert_untouched(before, after, "california", "booked")
    if "preCap" in after["kentucky"]["nil"]:
        raise SystemExit("refused to add kentucky preCap without a citeable FY2025 filing")

    blockers = schools_doc["meta"]["blockers"]
    for i, line in enumerate(blockers):
        if line.startswith("Most NIL bands are pending"):
            blockers[i] = (
                "Most NIL bands are pending — booked House-window cells are Louisville "
                "(FOIA $32.9M Mar 2025–Jul 1 2026, including $12.7M pre-cap KY NIL), "
                "Kentucky (counsel $18M, same window), UCLA and California "
                "(CalMatters: each about $20.5M in 2025-26), Texas "
                "(TPR: $13.5M House Year 1 YTD Jul 2025–Mar 2026). "
                "FY2025 MFRS / preCap cells: Penn State Item 44 $18,368,391 (published sport lines); "
                'Oklahoma State "just over $16 million" (estimated; not $16,000,001); '
                "Texas school-FY $3.2M (only two months of House); "
                "Georgia / Tennessee / Alabama / Oregon / Utah / UNC Item 44 $0. "
                "Kentucky FY2025 $0 not booked — no public MFRS PDF on the desk; "
                "do not overwrite the $18M counsel cell. "
                "Do not book a USC plan-to-distribute quote "
                "or the Texas $18M cap plan / on-track projection."
            )

    new_tape = [
        tape_item(
            id="texas-booked-nil-ytd-2026-04-05",
            date="2026-04-05",
            school="texas",
            schoolName="Texas",
            kind="booked-nil",
            headline="Texas Public Radio: UT-Austin disclosed $13.5 million in revenue-share payments from July 2025 through the end of March 2026. On-track ~$18M is a projection — left unbooked.",
            figure=13_500_000,
            confidence="reported",
            source={
                "label": "Texas Public Radio / Houston Public Media",
                "url": "https://www.tpr.org/economy-and-labor/2026-04-05/how-much-money-do-college-athletes-in-texas-make-public-universities-wont-say",
            },
            field="nil.booked",
        ),
        tape_item(
            id="penn-state-precap-nil-2026-02",
            date="2026-02",
            school="penn-state",
            schoolName="Penn State",
            kind="booked-nil",
            headline="PennLive: Penn State FY2025 MFRS books $18,368,391 Institutional NIL Revenue Share (1 Jul 2024–30 Jun 2025), with published sport lines. Not House Year 1.",
            figure=18_368_391,
            confidence="reported",
            source={
                "label": "PennLive — Penn State FY2025 NIL breakdown",
                "url": "https://www.pennlive.com/pennstatefootball/2026/02/penn-state-spent-184-million-in-nil-during-fiscal-year-2025-heres-the-breakdown.html",
            },
            field="nil.preCap",
        ),
        tape_item(
            id="unc-precap-nil-2026-02-03",
            date="2026-02-03",
            school="north-carolina",
            schoolName="North Carolina",
            kind="booked-nil",
            headline="UNC FY2025 NCAA Membership Financial Report books Item 44 Institutional NIL Revenue Share at $0. House Year 1 allocations stay unbooked.",
            figure=0,
            confidence="reported",
            source={
                "label": "UNC FY2025 NCAA Membership Financial Report",
                "url": "https://goheels.com/documents/download/2026/2/3/NCAAMembershipFinancialReport2025.pdf",
            },
            field="nil.preCap",
        ),
        tape_item(
            id="oklahoma-state-precap-nil-2026-01-26",
            date="2026-01-26",
            school="oklahoma-state",
            schoolName="Oklahoma State",
            kind="booked-nil",
            headline='The Oklahoman: OSU FY2025 NCAA report includes NIL compensation of "just over $16 million" for a portion of the year. Booked as $16 million — not $16,000,001.',
            figure=16_000_000,
            figureNote="just over",
            confidence="estimated",
            source={
                "label": "The Oklahoman — OSU FY2025 finances",
                "url": "https://www.oklahoman.com/story/sports/college/cowboys/2026/01/26/oklahoma-state-athletics-2025-fiscal-year-finances-revenue-osu-cowboys/88307484007/",
            },
            field="nil.preCap",
        ),
        tape_item(
            id="texas-precap-nil-2026-01-23",
            date="2026-01-23",
            school="texas",
            schoolName="Texas",
            kind="booked-nil",
            headline="Austin American-Statesman: Texas FY2025 NCAA report books $3.2 million in revenue sharing. School FY ended Aug 31, 2025 — only two months of House. The $18M cap plan is not booked.",
            figure=3_200_000,
            confidence="reported",
            source={
                "label": "Austin American-Statesman — Texas FY2025 NCAA report",
                "url": "https://www.statesman.com/sports/college/longhorns/football/article/texas-longhorns-nil-revenue-sharing-21304634.php",
            },
            field="nil.preCap",
        ),
        tape_item(
            id="utah-precap-nil-2026-01-21",
            date="2026-01-21",
            school="utah",
            schoolName="Utah",
            kind="booked-nil",
            headline="Utah FY2025 NCAA Revenue and Expense Report books Item 44 Institutional NIL Revenue Share at $0.",
            figure=0,
            confidence="reported",
            source={
                "label": "Utah FY2025 NCAA Revenue and Expense Report",
                "url": "https://utahutes.com/documents/download/2026/1/21/FY25_NCAA_Revenue_and_Expense_Report.pdf",
            },
            field="nil.preCap",
        ),
        tape_item(
            id="georgia-precap-nil-2026-01-15",
            date="2026-01-15",
            school="georgia",
            schoolName="Georgia",
            kind="booked-nil",
            headline="UGA FY2025 NCAA financial report books Item 44 Institutional NIL Revenue Share at $0.",
            figure=0,
            confidence="reported",
            source={
                "label": "UGA FY2025 NCAA financial report",
                "url": "https://georgiadogs.com/documents/download/2026/1/15/2025_NCAA_Financial_Report.pdf",
            },
            field="nil.preCap",
        ),
        tape_item(
            id="tennessee-precap-nil-2026-01-15",
            date="2026-01-15",
            school="tennessee",
            schoolName="Tennessee",
            kind="booked-nil",
            headline="Tennessee FY2025 NCAA AUP books Item 44 Institutional NIL Revenue Share at $0.",
            figure=0,
            confidence="reported",
            source={
                "label": "Tennessee FY2025 NCAA AUP",
                "url": "https://utsports.com/documents/download/2026/1/15/FY25_NCAA_AUP.pdf",
            },
            field="nil.preCap",
        ),
        tape_item(
            id="oregon-precap-nil-2026-01-13",
            date="2026-01-13",
            school="oregon",
            schoolName="Oregon",
            kind="booked-nil",
            headline="Oregon FY2025 NCAA FRS books Item 44 Institutional NIL Revenue Share at $0. AUP: university told auditors there were no institutional NIL revenue-share expenses.",
            figure=0,
            confidence="reported",
            source={
                "label": "Oregon FY2025 NCAA FRS",
                "url": "https://goducks.com/documents/download/2026/1/13/University_of_Oregon_NCAA_FRS_FY2025_FINAL.pdf",
            },
            field="nil.preCap",
        ),
        tape_item(
            id="alabama-precap-nil-2026-01",
            date="2026-01",
            school="alabama",
            schoolName="Alabama",
            kind="booked-nil",
            headline="Alabama FY2025 NCAA financial report (published copy) books Item 44 Institutional NIL Revenue Share at $0.",
            figure=0,
            confidence="reported",
            source={
                "label": "Alabama FY2025 NCAA financial report (Scribd copy already on this desk)",
                "url": "https://www.scribd.com/document/996414831/Alabama-s-2024-25-athletics-financial-report",
            },
            field="nil.preCap",
        ),
    ]

    existing_ids = {it["id"] for it in tape_doc["items"]}
    for it in new_tape:
        if it["id"] in existing_ids:
            raise SystemExit(f"tape id already exists: {it['id']}")
    tape_doc["items"] = new_tape + tape_doc["items"]
    tape_doc["meta"]["itemCount"] = len(tape_doc["items"])
    tape_doc["meta"]["asOf"] = "2026-08-26"

    dump(SRC / "schools.json", schools_doc)
    dump(SRC / "tape.json", tape_doc)
    dump(PUB / "schools.json", schools_doc)
    dump(PUB / "tape.json", tape_doc)
    print("booked", {sid: after[sid]["nil"] for sid in [
        "penn-state", "oklahoma-state", "texas", "georgia", "oregon",
        "tennessee", "alabama", "utah", "north-carolina", "louisville", "kentucky", "ucla", "california",
    ]})
    print("tape items", tape_doc["meta"]["itemCount"])


if __name__ == "__main__":
    main()
