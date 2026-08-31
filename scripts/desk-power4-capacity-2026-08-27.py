#!/usr/bin/env python3
"""Power 4 capacity-desk pass as of 2026-08-27.

1) Stamp three stale current-chair FB pays from coachesByYear.2026
   onto coaches.football.pay (same chair only). Never copy USA TODAY
   2025 onto a 2026 year-key. Do not stamp other chairs.

2) Book Ole Miss FY2025 MFRS Item 44 from the already-linked PDF.
   Do not overwrite booked House.

3) Split paid buyouts onto cited cash years in layers.buyoutsPaid.

4) Write start-of-year buyout.steps = existing TAC/guaranteed table
   × file/article percent. Same method as FSU/PSU/ISU. Label derived.
   Do not overwrite PSU/Clemson/FSU/UNC/VT/ISU steps.
"""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data"
PUB = ROOT / "public" / "data"

PROTECTED_STEPS = {
    "penn-state",
    "clemson",
    "florida-state",
    "north-carolina",
    "virginia-tech",
    "iowa-state",
}
STAMP_IDS = ("alabama", "indiana", "ohio-state")
OLE_MISS_PDF = "https://olemisssports.com/documents/download/2026/1/15/NCAAReport_FY25.pdf"
ATHLETIC = (
    "https://www.nytimes.com/athletic/7080378/2026/03/03/"
    "college-football-coach-firings-buyouts-total/"
)


def load(path: Path):
    return json.loads(path.read_text())


def dump(path: Path, obj, *, ensure_ascii: bool) -> None:
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=ensure_ascii) + "\n")


def money_list(values):
    return " / ".join(
        f"${v / 1_000_000:.2f} million" if v % 100000 else f"${v / 1_000_000:.1f} million"
        if v % 10000 == 0
        else f"${v:,}"
        for v in values
    )


def remaining_steps(years, pct, source_label, source_url, rule, extra_note=""):
    """years = [{asOf, through, contractYear, pay}, ...] start-of-year remaining × pct."""
    steps = []
    pays = [y["pay"] for y in years]
    for i, y in enumerate(years):
        rem_pay = sum(pays[i:])
        remaining = int(round(rem_pay * pct))
        table = money_list(pays[i:])
        notes = (
            f"Derived from the already-on-desk compensation table ({table} = ${rem_pay:,}) "
            f"× {pct:.4g} school-side remaining. Start-of-year remaining = ${remaining:,}. "
            "Labeled derived — not a published remaining-dollar line. Full remaining years; "
            "this desk does not mint a mid-year proration. "
            f"{extra_note}{source_url}"
        ).strip()
        steps.append(
            {
                "asOf": y["asOf"],
                "remaining": remaining,
                "contractYear": y["contractYear"],
                "through": y["through"],
                "notes": notes,
                "confidence": "estimated",
            }
        )
    return steps


def book_steps(buyout_obj, steps, source_label, source_url, rule_text, first_as_value=True):
    school_steps = [
        {
            "asOf": s["asOf"],
            "remaining": s["remaining"],
            "contractYear": s["contractYear"],
            "through": s["through"],
            "notes": s["notes"],
        }
        for s in steps
    ]
    buyout_obj["steps"] = school_steps
    if first_as_value and steps and steps[0].get("remaining") is not None:
        buyout_obj["value"] = steps[0]["remaining"]
        buyout_obj["confidence"] = "estimated"
        buyout_obj["asOf"] = steps[0]["asOf"]
        buyout_obj["source"] = source_label
        buyout_obj["url"] = source_url
        buyout_obj["notes"] = (
            "Derived start-of-year remaining (compensation table × school-side percent). "
            "Labeled derived. Liability/overhang, not annual spend."
        )
    if rule_text:
        buyout_obj["rule"] = rule_text
    return school_steps


def buyouts_steps(steps, source_label, source_url, rule_text):
    out = []
    for s in steps:
        out.append(
            {
                "through": s["through"],
                "amount": s["remaining"],
                "rule": rule_text,
                "confidence": "estimated",
                "source": {"label": source_label, "url": source_url},
                "asOf": s["asOf"],
                "remaining": s["remaining"],
                "contractYear": s["contractYear"],
                "notes": s["notes"],
            }
        )
    return out


def stamp_current_pays(schools):
    stamped = []
    for s in schools["schools"]:
        if s["id"] not in STAMP_IDS:
            continue
        cur = s["coaches"]["football"]
        y26 = s["coachesByYear"]["2026"]["football"]
        assert cur["name"] == y26["name"], s["id"]
        assert y26["pay"]["value"] is not None
        assert "USA TODAY" not in (y26["pay"].get("source") or "").upper()
        cur["pay"] = deepcopy(y26["pay"])
        stamped.append((s["id"], cur["name"], cur["pay"]["value"]))
    return stamped


def book_ole_miss_item44(schools, tape):
    s = next(x for x in schools["schools"] if x["id"] == "ole-miss")
    assert s["nil"]["booked"]["value"] is None
    # Master already booked Item 44 at $0. Keep that cell (notes, tape id, asOf).
    if s["nil"].get("preCap", {}).get("value") == 0:
        return {
            "id": "ole-miss-precap-item44-fy2025",
            "kept": True,
            "value": 0,
        }
    s["nil"]["booked"]["notes"] = (
        "No House Year 1 (2025-26) FOIA / counsel spent total on the desk. "
        "FY2025 MFRS Item 44 is booked on nil.preCap."
    )
    s["nil"]["preCap"] = {
        "value": 0,
        "confidence": "reported",
        "source": "Ole Miss FY2025 NCAA Membership Financial Report — Item 44 Institutional NIL Revenue Share $0",
        "url": OLE_MISS_PDF,
        "asOf": "2026-01-15",
        "fiscalYear": "FY2025",
        "notes": (
            "FY2025 Item 44 Institutional NIL Revenue Share is $0 (pre-House, year ended Jun 30 2025). "
            "Does not count against the 2025-26 House cap. Does not replace a House Year 1 spent total "
            "— that cell stays pending unless separately booked."
        ),
    }
    blocker = schools["meta"]["blockers"][4]
    old = (
        "Georgia / Tennessee / Alabama / Oregon / Utah / UNC / Ohio State / Illinois / "
        "Minnesota / Washington / Wisconsin / Iowa State / Virginia Item 44 $0."
    )
    new = (
        "Georgia / Tennessee / Alabama / Oregon / Utah / UNC / Ohio State / Illinois / "
        "Minnesota / Washington / Wisconsin / Iowa State / Virginia / Ole Miss Item 44 $0."
    )
    if old in blocker:
        schools["meta"]["blockers"][4] = blocker.replace(old, new)
    item = {
        "id": "ole-miss-precap-nil-2026-01-15",
        "date": "2026-01-15",
        "school": "ole-miss",
        "schoolName": "Ole Miss",
        "kind": "booked-nil",
        "headline": "Ole Miss FY2025 NCAA Membership Financial Report books Item 44 Institutional NIL Revenue Share at $0.",
        "figure": 0,
        "confidence": "reported",
        "source": {
            "label": "Ole Miss FY2025 NCAA Membership Financial Report",
            "url": OLE_MISS_PDF,
        },
        "field": "nil.preCap",
    }
    ids = {t["id"] for t in tape["items"]}
    if item["id"] not in ids:
        tape["items"].append(item)
    return item


def split_paid_buyouts(layers):
    """Replace lump rows with cited cash-year rows where the Athletic cite names a schedule."""
    schools = layers["schools"]

    def row(**kwargs):
        base = {
            "whoPaid": kwargs.pop("whoPaid"),
            "status": kwargs.pop("status", "owed / being paid"),
            "source": kwargs.pop("source"),
            "url": kwargs.pop("url", ATHLETIC),
            "asOf": kwargs.pop("asOf", "2026-03-03"),
        }
        base.update(kwargs)
        return base

    # Arkansas Pittman $7.7M / 2 years
    schools["arkansas"]["buyoutsPaid"] = [
        row(
            coach="Sam Pittman",
            sport="FB",
            year=2025,
            amount=3_850_000,
            whoPaid="Arkansas",
            confidence="estimated",
            source="The Athletic — settled at $7.7M over two years with no offset (headline ~$9.3M)",
            notes=(
                "Estimated AAV: Athletic $7.7 million ÷ 2 named years. Labeled derived. "
                "Lump $7.7 million remains the cited settlement. Year cash so the table shows annual spend."
            ),
        ),
        row(
            coach="Sam Pittman",
            sport="FB",
            year=2026,
            amount=3_850_000,
            whoPaid="Arkansas",
            confidence="estimated",
            source="The Athletic — settled at $7.7M over two years with no offset (headline ~$9.3M)",
            notes=(
                "Estimated AAV: Athletic $7.7 million ÷ 2 named years. Labeled derived. "
                "Lump $7.7 million remains the cited settlement."
            ),
        ),
    ]

    # Freeze stays a lump
    # Napier: ~50% in 30 days then $2.5M/yr through 2028
    schools["florida"]["buyoutsPaid"] = [
        row(
            coach="Billy Napier",
            sport="FB",
            year=2025,
            amount=10_600_000,
            whoPaid="Florida",
            confidence="estimated",
            source="The Athletic — $21.2M, no offset; ~50% due in 30 days then $2.5M/year through 2028",
            notes=(
                "Estimated first-year cash: ~50% of Athletic $21.2 million due in 30 days. "
                "Labeled derived. Then the cited $2.5 million a year through 2028. "
                "Year rows ($10.6M + $2.5M × 3 = $18.1M) do not re-total the $21.2M lump — residual unallocated."
            ),
        ),
        row(
            coach="Billy Napier",
            sport="FB",
            year=2026,
            amount=2_500_000,
            whoPaid="Florida",
            confidence="reported",
            source="The Athletic — $21.2M, no offset; ~50% due in 30 days then $2.5M/year through 2028",
            notes="Cited $2.5 million a year through 2028. Athletic lump is $21.2 million.",
        ),
        row(
            coach="Billy Napier",
            sport="FB",
            year=2027,
            amount=2_500_000,
            whoPaid="Florida",
            confidence="reported",
            source="The Athletic — $21.2M, no offset; ~50% due in 30 days then $2.5M/year through 2028",
            notes="Cited $2.5 million a year through 2028. Athletic lump is $21.2 million.",
        ),
        row(
            coach="Billy Napier",
            sport="FB",
            year=2028,
            amount=2_500_000,
            whoPaid="Florida",
            confidence="reported",
            source="The Athletic — $21.2M, no offset; ~50% due in 30 days then $2.5M/year through 2028",
            notes="Cited $2.5 million a year through 2028. Athletic lump is $21.2 million.",
        ),
    ]

    # Stoops ~$6.75M/yr through Apr 2031
    schools["kentucky"]["buyoutsPaid"] = [
        row(
            coach="Mark Stoops",
            sport="FB",
            year=yr,
            amount=6_750_000,
            whoPaid="Kentucky",
            confidence="estimated",
            source="The Athletic — $37.6M guaranteed, no offset; payments stretched to April 2031 (~$6.75M/year)",
            notes=(
                "Cited ~$6.75 million a year through April 2031 (Athletic $37.6 million guaranteed). "
                "Labeled derived year cash. 2025 stub and 2031 through-April remainder are not separately minted."
            ),
        )
        for yr in (2026, 2027, 2028, 2029, 2030)
    ]

    # Kelly ~$53.2M over 6 years into 2031. Keep master's Orgeron $16.9M lump.
    orgeron_rows = [
        r for r in schools["lsu"].get("buyoutsPaid") or [] if "Orgeron" in (r.get("coach") or "")
    ]
    schools["lsu"]["buyoutsPaid"] = [
        row(
            coach="Brian Kelly",
            sport="FB",
            year=yr,
            amount=8_866_667,
            whoPaid="LSU",
            confidence="estimated",
            source="The Athletic buyout census (Mar 3, 2026) and USA TODAY — fired without cause; school paying the full ~$53.2–54M over six years into 2031",
            notes=(
                "Estimated AAV: Athletic ~$53.2 million ÷ 6 named years into 2031. Labeled derived. "
                "6 × $8,866,667 = $53,200,002 vs the cited $53.2 million lump. "
                "Athletic current $53.2M (offset still applies if he takes a qualifying job)."
            ),
        )
        for yr in (2026, 2027, 2028, 2029, 2030, 2031)
    ] + orgeron_rows

    # Franklin ~$9M / 3 years
    schools["penn-state"]["buyoutsPaid"] = [
        row(
            coach="James Franklin",
            sport="FB",
            year=yr,
            amount=3_000_000,
            whoPaid="Penn State",
            confidence="estimated",
            source="The Athletic — settled at about $9M over three years after the Virginia Tech hire (headline max was $48.6M)",
            notes=(
                "Estimated AAV: Athletic ~$9 million ÷ 3 named years. Labeled derived. "
                "Lump about $9 million remains the cited settlement. Wikipedia/CBS: originally ~$49M; reduced when he took Virginia Tech."
            ),
        )
        for yr in (2025, 2026, 2027)
    ]

    # Foster — through-date only; keep lump
    foster = schools["ucla"]["buyoutsPaid"][0]
    foster["notes"] = (
        (foster.get("notes") or "")
        + " Through 2028 (Athletic). Cite is a through-date, not a named year schedule — lump kept; no invented AAV year rows."
    ).strip()

    # Wilcox — through-date only
    wilcox = schools["california"]["buyoutsPaid"][0]
    wilcox["notes"] = (
        (wilcox.get("notes") or "")
        + " Through 2027 (Athletic). Cite is a through-date, not a named year schedule — lump kept; no invented AAV year rows."
    ).strip()

    # Pry $3.1M / 2 years
    schools["virginia-tech"]["buyoutsPaid"] = [
        row(
            coach="Brent Pry",
            sport="FB",
            year=yr,
            amount=1_550_000,
            whoPaid="Virginia Tech",
            confidence="estimated",
            source="The Athletic — settled Dec 8, 2025 at $3.1M over two years after he returned as Franklin’s DC (headline $6M)",
            notes=(
                "Estimated AAV: Athletic $3.1 million ÷ 2 named years. Labeled derived. "
                "Lump $3.1 million remains the cited settlement."
            ),
        )
        for yr in (2025, 2026)
    ]

    # Gundy $15M / 3 years
    schools["oklahoma-state"]["buyoutsPaid"] = [
        row(
            coach="Mike Gundy",
            sport="FB",
            year=yr,
            amount=5_000_000,
            whoPaid="Oklahoma State",
            confidence="estimated",
            source="The Athletic — $15M over three years, subject to offset",
            notes=(
                "Estimated AAV: Athletic $15 million ÷ 3 named years. Labeled derived. "
                "Lump $15 million remains the cited total."
            ),
        )
        for yr in (2025, 2026, 2027)
    ]

    # Fisher — through-date only; keep lump
    fisher = schools["texas-am"]["buyoutsPaid"][0]
    fisher["notes"] = (
        (fisher.get("notes") or "Not a 2025 firing. Included because money is still actually moving.")
        + " Through 2031 (Athletic). Cite is a through-date, not a named year schedule — lump kept; no invented AAV year rows."
    ).strip()

    # Freeze / Moore / Smith / Davis stay lumps — confirm
    assert schools["auburn"]["buyoutsPaid"][0]["amount"] == 15_800_000
    assert schools["michigan"]["buyoutsPaid"][0]["amount"] == 0
    assert schools["michigan-state"]["buyoutsPaid"][0]["amount"] == 33_000_000
    assert schools["north-carolina"]["buyoutsPaid"][0]["amount"] == 5_312_000


def write_step_tapes(schools, buyouts):
    by = {s["id"]: s for s in schools["schools"]}
    bco = buyouts["coaches"]
    written = []

    def apply(sid, years, pct, label, url, rule, extra="", replace_overhang=False):
        assert sid not in PROTECTED_STEPS, sid
        school_bo = by[sid]["coaches"]["football"]["buyout"]
        book = bco[sid]
        steps = remaining_steps(years, pct, label, url, rule, extra_note=extra)
        book_steps(school_bo, steps, label, url, rule)
        book["steps"] = buyouts_steps(steps, label, url, rule)
        book["tape"] = "steps"
        if replace_overhang:
            book.pop("overhang", None)
        written.append((sid, [s["remaining"] for s in steps]))
        return steps

    # Kentucky — 70% confirmed in Stein EA §9(b)
    apply(
        "kentucky",
        [
            {"asOf": "2025-12-02", "through": "2027-01-31", "contractYear": "Dec 2, 2025 – Jan 31, 2027", "pay": 5_500_000},
            {"asOf": "2027-02-01", "through": "2028-01-31", "contractYear": "2027", "pay": 5_600_000},
            {"asOf": "2028-02-01", "through": "2029-01-31", "contractYear": "2028", "pay": 5_700_000},
            {"asOf": "2029-02-01", "through": "2030-01-31", "contractYear": "2029", "pay": 5_800_000},
            {"asOf": "2030-02-01", "through": "2031-01-31", "contractYear": "2030", "pay": 5_900_000},
        ],
        0.70,
        "University of Kentucky — Stein FY2025–26 employment agreement PDF (posted Feb 2026)",
        "https://legal.uky.edu/sites/default/files/2026-02/stein-fy2526.pdf",
        "70% of remaining Regular Compensation, paid monthly through Jan. 31, 2031. Subject to mitigate/offset.",
        extra="File §9(b): seventy percent (70%) of Regular Compensation (Base + media) for the unexpired Term. PDF: ",
    )

    apply(
        "arkansas",
        [
            {"asOf": "2026-01-01", "through": "2026-12-31", "contractYear": "2026", "pay": 6_500_000},
            {"asOf": "2027-01-01", "through": "2027-12-31", "contractYear": "2027", "pay": 6_600_000},
            {"asOf": "2028-01-01", "through": "2028-12-31", "contractYear": "2028", "pay": 6_700_000},
            {"asOf": "2029-01-01", "through": "2029-12-31", "contractYear": "2029", "pay": 6_800_000},
            {"asOf": "2030-01-01", "through": "2030-12-31", "contractYear": "2030", "pay": 6_900_000},
        ],
        0.70,
        "Southwest Times Record (Dec. 1, 2025), quoting Silverfield term sheet via open records",
        "https://www.swtimes.com/story/sports/college/sec/2025/12/01/arkansas-football-coach-ryan-silverfield-salary-bonuses-buyouts/87557612007/",
        "70% of remaining annual compensation, including scheduled increases, through Dec. 31, 2030 (article quoting term sheet).",
        extra="Article quoting the FOIA term sheet. Source: ",
    )

    apply(
        "auburn",
        [
            {"asOf": "2026-01-01", "through": "2026-12-31", "contractYear": "2026", "pay": 6_750_000},
            {"asOf": "2027-01-01", "through": "2027-12-31", "contractYear": "2027", "pay": 7_000_000},
            {"asOf": "2028-01-01", "through": "2028-12-31", "contractYear": "2028", "pay": 7_250_000},
            {"asOf": "2029-01-01", "through": "2029-12-31", "contractYear": "2029", "pay": 7_500_000},
            {"asOf": "2030-01-01", "through": "2030-12-31", "contractYear": "2030", "pay": 7_750_000},
            {"asOf": "2031-01-01", "through": "2031-12-31", "contractYear": "2031", "pay": 8_000_000},
        ],
        0.75,
        "Montgomery Advertiser (Aug. 24, 2026), quoting Auburn employment agreement obtained via records request",
        "https://www.montgomeryadvertiser.com/story/sports/college/auburn/2026/08/24/alex-golesh-contract-auburn-football-buyout-details/87624147007/",
        "75% of remaining compensation, paid monthly through term end (article quoting EA).",
        extra="Article quoting the Aug. 11, 2026 EA. Source: ",
    )
    # copy auburn.rule onto schools if it only lived on buyouts.json
    by["auburn"]["coaches"]["football"]["buyout"]["rule"] = bco["auburn"]["rule"]

    apply(
        "michigan",
        [
            {"asOf": "2026-01-01", "through": "2026-12-31", "contractYear": "2026", "pay": 8_000_000},
            {"asOf": "2027-01-01", "through": "2027-12-31", "contractYear": "2027", "pay": 8_100_000},
            {"asOf": "2028-01-01", "through": "2028-12-31", "contractYear": "2028", "pay": 8_200_000},
            {"asOf": "2029-01-01", "through": "2029-12-31", "contractYear": "2029", "pay": 8_300_000},
            {"asOf": "2030-01-01", "through": "2031-01-31", "contractYear": "2030", "pay": 8_400_000},
        ],
        0.75,
        "Detroit Free Press (Jan. 23, 2026), quoting Whittingham memorandum of understanding via FOIA",
        "https://www.freep.com/story/sports/college/university-michigan/wolverines/2026/01/23/kyle-whittingham-contract-michigan-football/88318877007/",
        "75% of remaining base salary through Jan. 31, 2031 (article quoting MOU).",
        extra="Article quoting the Dec. 26, 2025 FOIA MOU. Source: ",
    )

    apply(
        "michigan-state",
        [
            {"asOf": "2025-12-01", "through": "2027-01-31", "contractYear": "YR1 (2026)", "pay": 5_000_000},
            {"asOf": "2027-02-01", "through": "2028-01-31", "contractYear": "YR2", "pay": 5_500_000},
            {"asOf": "2028-02-01", "through": "2029-01-31", "contractYear": "YR3", "pay": 6_000_000},
            {"asOf": "2029-02-01", "through": "2030-01-31", "contractYear": "YR4", "pay": 6_500_000},
            {"asOf": "2030-02-01", "through": "2031-01-31", "contractYear": "YR5", "pay": 7_000_000},
        ],
        0.725,
        "Michigan State Head Football Coach Terms Sheet (Dec. 1, 2025) via WLNS",
        "https://www.wlns.com/wp-content/uploads/sites/50/2025/12/Fitzgerald-terms-sheet.pdf",
        "72.5% of remaining Annual Compensation, paid monthly through Jan. 31, 2031. Subject to mitigate/offset.",
        extra="Already-parsed YR1–5 Annual Compensation table × 72.5% (terms sheet). PDF: ",
    )

    apply(
        "ucla",
        [
            {"asOf": "2026-01-01", "through": "2026-12-31", "contractYear": "Y1 (2026)", "pay": 5_400_000},
            {"asOf": "2027-01-01", "through": "2027-12-31", "contractYear": "Y2 (2027)", "pay": 5_500_000},
            {"asOf": "2028-01-01", "through": "2028-12-31", "contractYear": "Y3 (2028)", "pay": 5_600_000},
            {"asOf": "2029-01-01", "through": "2029-12-31", "contractYear": "Y4 (2029)", "pay": 5_700_000},
            {"asOf": "2030-01-01", "through": "2030-12-31", "contractYear": "Y5 (2030)", "pay": 5_800_000},
        ],
        0.75,
        "Yahoo Sports / California Post (Jan. 29, 2026), quoting Chesney employment agreement",
        "https://sports.yahoo.com/articles/contract-details-revealed-ucla-got-035156125.html",
        "75% of remaining base salary and talent fee, subject to mitigation (article quoting EA).",
        extra="Article quoting the EA (Y1–5 base + talent fee). Source: ",
    )

    apply(
        "ole-miss",
        [
            {"asOf": "2026-01-01", "through": "2026-12-31", "contractYear": "Y1 (2026)", "pay": 6_800_000},
            {"asOf": "2027-01-01", "through": "2027-12-31", "contractYear": "Y2 (2027)", "pay": 6_900_000},
            {"asOf": "2028-01-01", "through": "2028-12-31", "contractYear": "Y3 (2028)", "pay": 7_000_000},
            {"asOf": "2029-01-01", "through": "2029-12-31", "contractYear": "Y4 (2029)", "pay": 7_100_000},
            {"asOf": "2030-01-01", "through": "2030-12-31", "contractYear": "Y5 (2030)", "pay": 7_200_000},
        ],
        0.75,
        "Clarion Ledger / Daily Journal, quoting Golding term sheet with the Ole Miss Athletic Foundation",
        "https://www.clarionledger.com/story/sports/college/ole-miss/2026/07/01/pete-golding-contract-salary-ole-miss-football-coach/90754060007/",
        "75% of remaining OMAF annual compensation through the otherwise unexpired term (article quoting term sheet).",
        extra="Article quoting the OMAF term sheet (Y1–5). Source: ",
    )

    apply(
        "kansas-state",
        [
            {"asOf": "2026-01-01", "through": "2026-12-31", "contractYear": "2026", "pay": 4_100_000},
            {"asOf": "2027-01-01", "through": "2027-12-31", "contractYear": "2027", "pay": 4_200_000},
            {"asOf": "2028-01-01", "through": "2028-12-31", "contractYear": "2028", "pay": 4_300_000},
            {"asOf": "2029-01-01", "through": "2029-12-31", "contractYear": "2029", "pay": 4_400_000},
            {"asOf": "2030-01-01", "through": "2030-12-31", "contractYear": "2030", "pay": 4_500_000},
        ],
        0.75,
        "Topeka Capital-Journal (Dec. 10, 2025), quoting Klein employment agreement released by K-State",
        "https://www.cjonline.com/story/sports/college/cat-zone/2025/12/10/collin-klein-contract-kansas-state-football-salary-buyout-bonuses-chris-klieman/87702201007/",
        "75% of remaining unpaid base salary through the then-current term (article quoting EA).",
        extra="Article quoting the athletics-released EA (2026–30 base). Source: ",
    )

    apply(
        "utah",
        [
            {"asOf": "2026-01-01", "through": "2026-12-31", "contractYear": "2026", "pay": 5_100_000},
            {"asOf": "2027-01-01", "through": "2027-12-31", "contractYear": "2027", "pay": 5_250_000},
            {"asOf": "2028-01-01", "through": "2028-12-31", "contractYear": "2028", "pay": 5_400_000},
            {"asOf": "2029-01-01", "through": "2029-12-31", "contractYear": "2029", "pay": 5_550_000},
            {"asOf": "2030-01-01", "through": "2030-12-31", "contractYear": "2030", "pay": 5_700_000},
        ],
        0.75,
        "Deseret News (March 20, 2026), quoting Scalley employment agreement via public records",
        "https://www.deseret.com/sports/2026/03/20/morgan-scalley-utah-football-coach-contract-details/",
        "75% of remaining Base Salary, Outfitter Payment, and MMR Payment through the remainder of the term (article quoting EA).",
        extra="Article quoting the FOIA EA (2026–30 Base + Outfitter + MMR). Source: ",
    )

    # Oregon — 100% remaining guaranteed + $1M deferred/year from Amendment #3 §6.2.b / §4.1
    # Replaces USA TODAY overhang $56,733,333 (Oct 8, 2025 / CY4). Desk as-of is CY5.
    ore_years = [
        {"asOf": "2026-02-01", "through": "2027-01-31", "contractYear": "CY5 (2026)", "gtd": 9_600_000},
        {"asOf": "2027-02-01", "through": "2028-01-31", "contractYear": "CY6", "gtd": 9_800_000},
        {"asOf": "2028-02-01", "through": "2029-01-31", "contractYear": "CY7", "gtd": 10_000_000},
        {"asOf": "2029-02-01", "through": "2030-01-31", "contractYear": "CY8", "gtd": 10_200_000},
        {"asOf": "2030-02-01", "through": "2031-01-31", "contractYear": "CY9", "gtd": 10_400_000},
    ]
    ore_steps = []
    gtds = [y["gtd"] for y in ore_years]
    url = "https://trustees.uoregon.edu/sites/default/files/2025-03/final-bot-march-7-materials.pdf"
    label = "U. of Oregon BOT Mar. 7, 2025 packet — Exhibit A Amendment #3 (Lanning)"
    rule = "100% remaining guaranteed salary + remaining deferred, monthly, subject to §6.2.e mitigation."
    for i, y in enumerate(ore_years):
        gtd_sum = sum(gtds[i:])
        deferred = 1_000_000 * (len(ore_years) - i)
        remaining = gtd_sum + deferred
        notes = (
            f"Derived from Amendment #3 §4.1 guaranteed salary ({money_list(gtds[i:])} = ${gtd_sum:,}) "
            f"+ §4.2 / BOT summary deferred $1,000,000 per remaining contract year (${deferred:,}) "
            f"= ${remaining:,} × 100% (§6.2.b). Labeled derived. Replaces the USA TODAY Oct. 8, 2025 "
            f"overhang ($56,733,333), which was a CY4 as-of. PDF: {url}"
        )
        ore_steps.append(
            {
                "asOf": y["asOf"],
                "remaining": remaining,
                "contractYear": y["contractYear"],
                "through": y["through"],
                "notes": notes,
                "confidence": "estimated",
            }
        )
    school_bo = by["oregon"]["coaches"]["football"]["buyout"]
    book_steps(school_bo, ore_steps, label, url, rule)
    bco["oregon"]["steps"] = buyouts_steps(ore_steps, label, url, rule)
    bco["oregon"]["tape"] = "steps"
    bco["oregon"].pop("overhang", None)
    written.append(("oregon", [s["remaining"] for s in ore_steps]))

    apply(
        "florida",
        [
            {"asOf": "2026-01-01", "through": "2026-12-31", "contractYear": "2026", "pay": 7_450_000},
            {"asOf": "2027-01-01", "through": "2027-12-31", "contractYear": "2027", "pay": 7_450_000},
            {"asOf": "2028-01-01", "through": "2028-12-31", "contractYear": "2028", "pay": 7_450_000},
            {"asOf": "2029-01-01", "through": "2029-12-31", "contractYear": "2029", "pay": 7_450_000},
            {"asOf": "2030-01-01", "through": "2030-12-31", "contractYear": "2030", "pay": 7_450_000},
            {"asOf": "2031-01-01", "through": "2031-12-31", "contractYear": "2031", "pay": 7_450_000},
        ],
        0.70,
        "Gainesville Sun (Dec. 1, 2025), quoting UF payment details",
        "https://www.gainesville.com/story/sports/college/football/2025/12/01/breaking-down-contract-terms-of-florida-football-coach-jon-sumrall/87484907007/",
        "70% remaining annualized compensation through Dec. 31, 2031 (article).",
        extra="Article: $7.45 million flat per contract year through Dec. 31, 2031. Source: ",
    )

    # Oklahoma State Morris — 75% only while terminated before February 2029
    apply(
        "oklahoma-state",
        [
            {"asOf": "2026-01-01", "through": "2027-01-31", "contractYear": "2026", "pay": 3_800_000},
            {"asOf": "2027-02-01", "through": "2028-01-31", "contractYear": "2027", "pay": 3_900_000},
            {"asOf": "2028-02-01", "through": "2029-01-31", "contractYear": "2028", "pay": 4_000_000},
        ],
        0.75,
        "The Oklahoman (Dec. 12, 2025), quoting Morris employment agreement",
        "https://www.usatoday.com/story/sports/college/cowboys/2025/12/12/eric-morris-contract-salary-buyout-details-oklahoma-state-football-coach/87726037007/",
        "75% of remaining base if terminated before February 2029; a lower remaining-percent thereafter (article quoting EA).",
        extra=(
            "75% applies to all remaining base if fired before February 2029, including later years "
            "($4.1M / $4.2M) still in this remaining sum. Stop after the Feb. 2028 step — later percent "
            "is 60 vs 65 with no file on the desk. Source: "
        ),
    )
    # remaining at 2026 start should include 2029-30 years at 75%
    # The apply() above only summed the 3 listed years. Fix: rebuild with later years in the remaining
    # but without writing 2029+ steps.
    morris_pays = [3_800_000, 3_900_000, 4_000_000, 4_100_000, 4_200_000]
    morris_years = [
        {"asOf": "2026-01-01", "through": "2027-01-31", "contractYear": "2026"},
        {"asOf": "2027-02-01", "through": "2028-01-31", "contractYear": "2027"},
        {"asOf": "2028-02-01", "through": "2029-01-31", "contractYear": "2028"},
    ]
    url = "https://www.usatoday.com/story/sports/college/cowboys/2025/12/12/eric-mailis-contract-salary-buyout-details-oklahoma-state-football-coach/87726037007/"
    # keep the already-cited URL from the chair
    url = by["oklahoma-state"]["coaches"]["football"]["buyout"]["url"]
    label = "The Oklahoman (Dec. 12, 2025), quoting Morris employment agreement"
    rule = "75% of remaining base if terminated before February 2029; a lower remaining-percent thereafter (article quoting EA)."
    morris_steps = []
    for i, y in enumerate(morris_years):
        rem_pay = sum(morris_pays[i:])
        remaining = int(round(rem_pay * 0.75))
        notes = (
            f"Derived from the already-on-desk base table ({money_list(morris_pays[i:])} = ${rem_pay:,}) "
            f"× 75% (article: 75% of remaining base if terminated before February 2029). "
            f"Start-of-year remaining = ${remaining:,}. Labeled derived. "
            "Later-year percent (60 vs 65 after Feb. 2029) is not on a file — no step after this window. "
            f"Source: {url}"
        )
        morris_steps.append(
            {
                "asOf": y["asOf"],
                "remaining": remaining,
                "contractYear": y["contractYear"],
                "through": y["through"],
                "notes": notes,
                "confidence": "estimated",
            }
        )
    book_steps(by["oklahoma-state"]["coaches"]["football"]["buyout"], morris_steps, label, url, rule)
    bco["oklahoma-state"]["steps"] = buyouts_steps(morris_steps, label, url, rule)
    bco["oklahoma-state"]["tape"] = "steps"
    # replace the short 3-year-only row
    written = [(sid, rems) for sid, rems in written if sid != "oklahoma-state"]
    written.append(("oklahoma-state", [s["remaining"] for s in morris_steps]))

    # LSU — signed EA is an image-only scan; no extractable year table. Copy existing pending step.
    lsu_existing = deepcopy(bco["lsu"]["steps"])
    by["lsu"]["coaches"]["football"]["buyout"]["steps"] = [
        {
            "asOf": None,
            "remaining": st.get("amount"),
            "contractYear": "through Jan. 31, 2033",
            "through": st.get("through"),
            "notes": st.get("rule")
            or "Signed EA is 80% of remaining Base + Supplemental — dollar pending; image-only scan did not yield a year table.",
        }
        for st in lsu_existing
    ]
    if not by["lsu"]["coaches"]["football"]["buyout"].get("rule"):
        by["lsu"]["coaches"]["football"]["buyout"]["rule"] = bco["lsu"]["buyoutRule"]

    # Tennessee — copy existing buyouts.json steps onto schools (do not invent 50%)
    tn_existing = deepcopy(bco["tennessee"]["steps"])
    tn_school = []
    for st in tn_existing:
        tn_school.append(
            {
                "asOf": "2025-10-08" if st.get("amount") is not None else "2027-12-15",
                "remaining": st.get("amount"),
                "contractYear": "through Dec. 15, 2027" if st.get("through") == "2027-12-15" else "Dec. 15, 2027 – Jan. 31, 2030",
                "through": st.get("through"),
                "notes": (st.get("rule") or "")
                + (
                    " Copied from buyouts.json. PDF: https://tennessee.edu/wp-content/uploads/2025/08/Josh-Heupel-Amendment-3-2025-30-v2.docx.pdf"
                ),
            }
        )
    by["tennessee"]["coaches"]["football"]["buyout"]["steps"] = tn_school
    if not by["tennessee"]["coaches"]["football"]["buyout"].get("rule"):
        by["tennessee"]["coaches"]["football"]["buyout"]["rule"] = bco["tennessee"]["buyoutRule"]

    # do not touch protected
    for sid in PROTECTED_STEPS:
        assert by[sid]["coaches"]["football"]["buyout"].get("steps"), sid

    rule_updates = {
        "arkansas": (
            "If Arkansas terminates without cause: 70% of remaining annual compensation, "
            "including scheduled increases, through Dec. 31, 2030. Start-of-year remaining "
            "is derived from the already-on-desk year table \u00d7 70% and labeled derived."
        ),
        "auburn": (
            "If Auburn terminates without cause: 75% of remaining compensation, paid in "
            "equal monthly installments through the remainder of the term (through Dec. 31, 2031). "
            "Start-of-year remaining is derived from the already-on-desk year table \u00d7 75% and labeled derived."
        ),
        "florida": (
            "If Florida terminates without cause: 70% of remaining annualized compensation, "
            "paid in equal monthly installments through Dec. 31, 2031. $7.45 million per contract year. "
            "Start-of-year remaining is derived from that flat table \u00d7 70% and labeled derived."
        ),
        "ole-miss": (
            "If the Ole Miss Athletic Foundation terminates without cause: 75% of remaining "
            "OMAF annual compensation through the otherwise unexpired term. Start-of-year remaining "
            "is derived from the already-on-desk Y1\u20135 table \u00d7 75% and labeled derived."
        ),
        "michigan": (
            "If Michigan terminates without cause: 75% of remaining base salary through Jan. 31, 2031. "
            "Start-of-year remaining is derived from the already-on-desk 2026\u201330 base table \u00d7 75% and labeled derived."
        ),
        "michigan-state": (
            "If Michigan State terminates without cause: 72.5% of remaining Annual Compensation, "
            "paid in equal monthly installments through Jan. 31, 2031. Start-of-year remaining is "
            "derived from the already-on-desk YR1\u20135 table \u00d7 72.5% and labeled derived."
        ),
        "ucla": (
            "If UCLA terminates without cause: 75% of remaining base salary and talent fee. "
            "Start-of-year remaining is derived from the already-on-desk Y1\u20135 table \u00d7 75% and labeled derived."
        ),
        "kansas-state": (
            "If Kansas State terminates without cause: 75% of remaining unpaid base salary through "
            "the then-current term. Start-of-year remaining is derived from the already-on-desk "
            "2026\u201330 base table \u00d7 75% and labeled derived."
        ),
        "utah": (
            "If Utah terminates without cause: 75% of remaining Base Salary, Outfitter Payment, "
            "and MMR Payment for each year through the remainder of the term. Start-of-year remaining "
            "is derived from the already-on-desk 2026\u201330 table \u00d7 75% and labeled derived."
        ),
    }
    for sid, text in rule_updates.items():
        if "rule" in bco[sid]:
            bco[sid]["rule"] = text
        school_bo = by[sid]["coaches"]["football"]["buyout"]
        if school_bo.get("rule") and "will not multiply" in school_bo["rule"]:
            school_bo["rule"] = text
        elif sid == "auburn":
            school_bo["rule"] = text

    return written


def main():
    schools = load(SRC / "schools.json")
    buyouts = load(SRC / "buyouts.json")
    tape = load(SRC / "tape.json")
    layers = load(PUB / "layers.json")

    stamped = stamp_current_pays(schools)
    item44 = book_ole_miss_item44(schools, tape)
    split_paid_buyouts(layers)
    written = write_step_tapes(schools, buyouts)

    dump(SRC / "schools.json", schools, ensure_ascii=False)
    dump(PUB / "schools.json", schools, ensure_ascii=False)
    dump(SRC / "buyouts.json", buyouts, ensure_ascii=True)
    dump(PUB / "buyouts.json", buyouts, ensure_ascii=True)
    dump(PUB / "layers.json", layers, ensure_ascii=True)

    # Tape is mixed-escape. Master already has ole-miss-precap-item44-fy2025 — do not duplicate.

    print("stamped current-chair pays:")
    for row in stamped:
        print(" ", row)
    print("ole miss item 44", item44)
    print("step tapes:")
    for sid, rems in written:
        print(f"  {sid}: {rems}")
    print("lsu dollar steps left pending (signed EA image-only)")
    print("tn steps copied from buyouts.json")


if __name__ == "__main__":
    main()
