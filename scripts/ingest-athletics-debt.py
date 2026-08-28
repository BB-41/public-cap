#!/usr/bin/env python3
"""Book cited athletics-debt cells onto layers.json.

Outstanding = NCAA MFRS Category 52 / Other Reporting Items (stock).
Debt service = Category 34 athletic facilities debt service, leases, rental fees (flow).
Projects = named stadium/building/loan tape only — no invented amortization.

Does not add debt to annual capacity.
Does not book Category 53 university-wide institutional debt.
Does not touch NIL, House, Item 44, coaches, staff, buyouts, apparel, or subsidy.
"""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / "public" / "data"
SRC = ROOT / "data"

# Hosted FY2025 NCAA MFRS PDFs already on this desk. Category 52 / Category 34
# extracted from the filing. Category 53 institutional debt is recorded here only
# so the PR can list figures we refused — it is never written onto the school.
MFRS = {
    "arkansas": {
        "url": "https://arkansasrazorbacks.com/pdf/athletics/ncaa-membership/2024-25.pdf",
        "source": "Arkansas FY2025 NCAA Membership Financial Report",
        "asOf": "2026-01",
        "outstanding": 131_210_939,
        "debtService": 18_833_345,
        "institutional": 885_401_808,
    },
    "florida-state": {
        "url": "https://s3.documentcloud.org/documents/26597309/fsu-ncaa-financial-report-fy25.pdf",
        "source": "Florida State FY2025 NCAA Membership Financial Report (DocumentCloud / Tallahassee Democrat)",
        "asOf": "2026-01-31",
        "outstanding": 436_518_989,
        "debtService": 25_664_066,
        "institutional": 616_606_632,
    },
    "georgia": {
        "url": "https://georgiadogs.com/documents/download/2026/1/15/2025_NCAA_Financial_Report.pdf",
        "source": "UGA FY2025 NCAA financial report",
        "asOf": "2026-01-15",
        "outstanding": 148_629_203,
        "debtService": 13_398_448,
        "institutional": 218_843_976,
    },
    "illinois": {
        "url": "https://fightingillini.com/documents/download/2026/1/29/FY25_IL_NCAA_Full_Report__Revised_1-22-26_.pdf",
        "source": "Illinois FY2025 NCAA Membership Financial Report",
        "asOf": "2026-01-29",
        "outstanding": 304_463_059,
        "debtService": 17_770_740,
        "institutional": 704_264_308,
    },
    "iowa-state": {
        "url": "https://cyclones.com/documents/download/2026/1/16/NCAA_Financial_Report_-_FY25_-_FINAL.pdf",
        "source": "Iowa State FY2025 NCAA Financial Report",
        "asOf": "2026-01-16",
        "outstanding": 132_414_190,
        "debtService": 12_090_096,
        "institutional": 471_590_847,
    },
    "kansas": {
        "url": "https://kuathletics.com/documents/download/2026/1/15/FY_24-25_NCAA_Final_Report.pdf",
        "source": "Kansas FY2025 NCAA Membership Financial Report",
        "asOf": "2026-01-15",
        "outstanding": 198_099_309,
        "debtService": 5_852_923,
        "institutional": 978_187_711,
    },
    "minnesota": {
        "url": "https://gophersports.com/documents/download/2026/1/20/Minnesota_FY25_NCAA_Online_Report_-_FINAL_01.14.26.pdf",
        "source": "Minnesota FY2025 NCAA Membership Financial Report",
        "asOf": "2026-01-20",
        "outstanding": 150_552_241,
        "debtService": 7_939_461,
        "institutional": 1_845_292_000,
    },
    "north-carolina": {
        "url": "https://goheels.com/documents/download/2026/2/3/NCAAMembershipFinancialReport2025.pdf",
        "source": "UNC FY2025 NCAA Membership Financial Report",
        "asOf": "2026-02-03",
        "outstanding": 48_677_171,
        "debtService": 5_213_340,
        "institutional": 1_291_247_755,
    },
    "ohio-state": {
        "url": "https://news.osu.edu/download/c91b5f24-f009-4455-81eb-4b89b108f1bc/fy25ncaamembershipreportfinal.pdf",
        "source": "Ohio State FY2025 NCAA Membership Financial Report",
        "asOf": "2026-01-30",
        "outstanding": 273_599_995,
        "debtService": 29_710_677,
        "institutional": 4_365_559_000,
    },
    "ole-miss": {
        "url": "https://olemisssports.com/documents/download/2026/1/15/NCAAReport_FY25.pdf",
        "source": "Ole Miss FY2025 NCAA Membership Financial Report",
        "asOf": "2026-01-15",
        "outstanding": 85_470_702,
        "debtService": 12_798_652,
        "institutional": 227_741_119,
    },
    "oregon": {
        "url": "https://goducks.com/documents/download/2026/1/13/University_of_Oregon_NCAA_FRS_FY2025_FINAL.pdf",
        "source": "Oregon FY2025 NCAA FRS",
        "asOf": "2026-01-13",
        "outstanding": 157_942_463,
        "debtService": 18_303_978,
        "institutional": 925_914_000,
    },
    "tennessee": {
        "url": "https://utsports.com/documents/download/2026/1/15/FY25_NCAA_AUP.pdf",
        "source": "Tennessee FY2025 NCAA AUP / Membership Financial Report",
        "asOf": "2026-01-15",
        "outstanding": 327_732_018,
        "debtService": 12_732_343,
        "institutional": 945_166_843,
    },
    "utah": {
        "url": "https://utahutes.com/documents/download/2026/1/21/FY25_NCAA_Revenue_and_Expense_Report.pdf",
        "source": "Utah FY2025 NCAA Revenue and Expense Report",
        "asOf": "2026-01-21",
        "outstanding": 90_742_848,
        "debtService": 11_181_497,
        "institutional": 2_407_267_000,
    },
    "virginia": {
        "url": "https://stuffsomerssays.com/wp-content/uploads/2026/03/NCAA_MFRS_Submission_FY25.pdf",
        "source": "Virginia FY2025 NCAA Membership Financial Report (published copy)",
        "asOf": "2026-03",
        "outstanding": 24_939_741,
        "debtService": 1_331_006,
        "institutional": 2_485_114_615,
    },
    "washington": {
        "url": "https://gohuskies.com/documents/download/2026/1/17/FY25_NCAA_FINAL.pdf",
        "source": "Washington FY2025 NCAA Membership Financial Report",
        "asOf": "2026-01-17",
        "outstanding": 279_089_162,
        "debtService": 9_922_009,
        "institutional": 2_565_762_000,
    },
    "wisconsin": {
        "url": "https://uwbadgers.com/documents/download/2026/1/16/Final_FY25_NCAA_Report.pdf",
        "source": "Wisconsin FY2025 NCAA Membership Financial Report",
        "asOf": "2026-01-16",
        "outstanding": 130_627_132,
        "debtService": 10_470_659,
        "institutional": 822_446_230,
    },
}

AUP = {
    "south-carolina": {
        "url": "https://sc.edu/about/offices_and_divisions/controller/documents/usc_columbia_ncaa_aup_report_2025.pdf",
        "source": "South Carolina FY2025 NCAA AUP (Columbia campus)",
        "asOf": "2025-06-30",
        "outstanding": 153_235_000,
        "debtService": 14_755_276,
        "institutional": 524_408_366,
        "notes": "AUP Other Reporting Items: Total Athletics-Related Debt (principal) $153,235,000. Category 34 athletic facilities debt service, leases and rental fees $14,755,276. Category 53 institutional $524,408,366 is university-wide and is not booked.",
    },
    "colorado": {
        "url": "https://content.leg.colorado.gov/sites/default/files/documents/audits/2505F-B_university_of_colorado_boulder_ncaa_aup_fy25.pdf",
        "source": "Colorado Boulder FY2025 NCAA AUP (Colorado OSA)",
        "asOf": "2025-06-30",
        "outstanding": 138_829_000,
        "debtService": 14_649_402,
        "institutional": 1_850_291_000,
        "notes": "AUP: outstanding athletics-related debt $138,829,000 as of June 30, 2025. Category 34 athletic facilities debt service, leases and rental fees $14,649,402. University debt $1,850,291,000 is refused — not an athletics split.",
    },
}

FLORIDA = {
    "url": "https://floridagators.com/documents/download/2025/9/22/UAA_Financial_Statements_2024_2025.pdf",
    "source": "University Athletic Association (Florida) FY2025 audited financial statements",
    "asOf": "2025-06-30",
    "outstanding": 134_895_000,
    "notes": "UAA long-term bonds outstanding $134,895,000 as of June 30, 2025 (Note 6A). Athletics-association debt, not Category 53 university-wide. Category 34 annual debt service is not printed as a single MFRS line on this statement; FY2026 scheduled service is not booked as FY2025.",
}

PENN_STATE = {
    "url": "https://www.statecollege.com/articles/penn-state-sports/analyzing-penn-state-athletics-financial-report/",
    "source": "StateCollege.com — Penn State FY2025 NCAA financial report",
    "asOf": "2025-12",
    "outstanding": 534_650_181,
    "debtService": 24_204_901,
    "notes": "Newsroom quoting the FY2025 NCAA report: athletics-related debt $534,650,181; facilities debt, renting or leases $24,204,901 (Category 34). Not university-wide debt.",
    "project": {
        "name": "Beaver Stadium renovation",
        "kind": "stadium",
        "cost": 700_000_000,
        "remaining": None,
        "through": "2027",
        "source": "StateCollege.com quoting Penn State deputy AD Vinnie James / NCAA report coverage",
        "url": "https://www.statecollege.com/articles/penn-state-sports/analyzing-penn-state-athletics-financial-report/",
        "notes": "Announced renovation cost up to $700 million; completion targeted fall 2027. Remaining principal is not named as a separate project leftover — do not invent an amortization.",
        "confidence": "reported",
    },
}

IOWA_LOAN = {
    "name": "Athletics COVID campus loan",
    "kind": "loan",
    "cost": 50_000_000,
    "remaining": 45_000_000,
    "through": "30-year term from July 1, 2025",
    "source": "The Gazette — UI Athletics $50M loan amended to 30 years",
    "url": "https://www.thegazette.com/news/university-of-iowa-athletics-will-pay-back-50m-loan-in-30-years-not-15/article_25c9740e-fcd2-4511-b6f2-cf922e06641f.html",
    "notes": "Internal university loan, not a stadium bond. Original 2021 $50M / 15-year note; amended July 1, 2025 to 30 years at 2.5%. Gazette: $5M shaved off principal. Not FY2025 Category 52 — that cell stays pending without a hosted MFRS PDF.",
    "confidence": "reported",
}

NEBRASKA_PROJECT = {
    "name": "Memorial Stadium Big Red Rebuild",
    "kind": "stadium",
    "cost": 600_000_000,
    "remaining": None,
    "through": "2028",
    "source": "AP — Nebraska Board of Regents April 24, 2026",
    "url": "https://apnews.com/article/nebraska-memorial-stadium-f6c32cfd79d29a4b8884cf5516ebf073",
    "notes": "Regents approved $600 million overhaul, funded by $250 million philanthropy and $350 million private bond financing, targeted for the 2028 season. The $350 million is announced financing, not a Category 52 leftover. FY2025 outstanding stays pending without a hosted MFRS PDF.",
    "confidence": "reported",
}

PRIVATES = {
    "vanderbilt",
    "northwestern",
    "usc",
    "boston-college",
    "duke",
    "miami",
    "smu",
    "stanford",
    "syracuse",
    "wake-forest",
    "byu",
    "baylor",
    "tcu",
    "notre-dame",
}

UNTOUCHABLE_LAYER_KEYS = ("apparel", "subsidy", "buyoutsPaid", "portal", "record")


def load(path: Path):
    return json.loads(path.read_text())


def dump(path: Path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n")


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


def pending(notes, url=None):
    return {
        "value": None,
        "confidence": "pending",
        "source": None,
        "url": url,
        "asOf": None,
        "notes": notes,
    }


def empty_debt(school_id, private):
    if school_id == "pittsburgh":
        notes = "Pennsylvania public-records exemption. No public FY2025 MFRS debt split on the desk. Empty means pending, not zero."
    elif private or school_id in PRIVATES:
        notes = "Private school. No public NCAA MFRS debt split on the desk unless the school or a newsroom published one. Empty means pending, not zero."
    else:
        notes = "No hosted FY2025 NCAA MFRS / AUP athletics-debt line on the desk yet. Empty means pending, not zero."
    return {
        "outstanding": pending("Pending a cited Category 52 / athletics-related debt stock."),
        "debtService": pending("Pending a cited Category 34 / annual facilities debt service."),
        "projects": [],
        "notes": notes,
    }


def apply_stock_flow(layer, rec, extra_notes=None, projects=None):
    out_notes = (
        f"NCAA MFRS Category 52 / Other Reporting Items — total athletics-related debt {money(rec['outstanding'])} "
        "at FY2025 year-end. A stock, not yearly spend. Not university-wide Category 53."
    )
    svc_notes = (
        f"NCAA MFRS Category 34 — athletic facilities debt service, leases and rental fees {money(rec['debtService'])}. "
        "This year’s check (principal + interest + leases/rent), regardless of who paid. Not added to annual capacity."
    )
    layer["debt"] = {
        "outstanding": field(
            rec["outstanding"],
            "reported",
            f"{rec['source']} — Category 52 Total Athletics Related Debt {money(rec['outstanding'])}",
            rec["url"],
            rec["asOf"],
            notes=out_notes,
        ),
        "debtService": field(
            rec["debtService"],
            "reported",
            f"{rec['source']} — Category 34 Athletic Facilities Debt Service {money(rec['debtService'])}",
            rec["url"],
            rec["asOf"],
            notes=svc_notes,
        ),
        "projects": projects or [],
        "notes": extra_notes
        or (
            "Hosted FY2025 NCAA Membership Financial Report. Outstanding is a stock; "
            "debt service is the annual flow. Neither enters the capacity stack."
        ),
    }


def tape_item(**kwargs):
    return kwargs


def snapshot_layers(schools):
    return {sid: deepcopy({k: schools[sid].get(k) for k in UNTOUCHABLE_LAYER_KEYS}) for sid in schools}


def assert_untouched(before, after):
    for sid, prev in before.items():
        cur = after[sid]
        for key in UNTOUCHABLE_LAYER_KEYS:
            if prev.get(key) != cur.get(key):
                raise SystemExit(f"refused to overwrite {sid} {key}")


def main():
    layers_doc = load(PUB / "layers.json")
    tape_src = load(SRC / "tape.json")
    schools_doc = load(SRC / "schools.json")
    names = {s["id"]: s["name"] for s in schools_doc["schools"]}
    private_ids = {s["id"] for s in schools_doc["schools"] if s.get("private")}
    layers = layers_doc["schools"]
    before = snapshot_layers(layers)

    for sid, layer in layers.items():
        layer["debt"] = empty_debt(sid, sid in private_ids)

    booked_out = []
    booked_svc = []
    booked_proj = []
    refused_institutional = []

    for sid, rec in {**MFRS, **AUP}.items():
        apply_stock_flow(layers[sid], rec, extra_notes=rec.get("notes"))
        booked_out.append(sid)
        booked_svc.append(sid)
        if rec.get("institutional") is not None:
            refused_institutional.append((sid, rec["institutional"], rec["url"]))

    # Florida UAA statements — outstanding only
    layers["florida"]["debt"] = {
        "outstanding": field(
            FLORIDA["outstanding"],
            "reported",
            f"{FLORIDA['source']} — long-term debt {money(FLORIDA['outstanding'])}",
            FLORIDA["url"],
            FLORIDA["asOf"],
            notes=FLORIDA["notes"],
        ),
        "debtService": pending(
            "UAA statements list FY2026 scheduled principal + interest; that is not booked as FY2025 Category 34."
        ),
        "projects": [],
        "notes": "Athletics-association bonds from the UAA audit. Not university-wide UF debt. Not added to capacity.",
    }
    booked_out.append("florida")

    # Penn State — newsroom quoting the NCAA report
    layers["penn-state"]["debt"] = {
        "outstanding": field(
            PENN_STATE["outstanding"],
            "reported",
            f"{PENN_STATE['source']} — athletics-related debt {money(PENN_STATE['outstanding'])}",
            PENN_STATE["url"],
            PENN_STATE["asOf"],
            notes="Newsroom quoting the FY2025 NCAA report Category 52 stock. Not university-wide debt.",
        ),
        "debtService": field(
            PENN_STATE["debtService"],
            "reported",
            f"{PENN_STATE['source']} — facilities debt, renting or leases {money(PENN_STATE['debtService'])}",
            PENN_STATE["url"],
            PENN_STATE["asOf"],
            notes="Newsroom quoting the FY2025 NCAA report facilities-debt / rent / lease line (Category 34).",
        ),
        "projects": [PENN_STATE["project"]],
        "notes": PENN_STATE["notes"],
    }
    booked_out.append("penn-state")
    booked_svc.append("penn-state")
    booked_proj.append("penn-state")

    # Iowa — named loan only; Category 52 stays pending
    iowa = empty_debt("iowa", False)
    iowa["projects"] = [IOWA_LOAN]
    iowa["notes"] = (
        "No hosted FY2025 MFRS PDF on the desk. The Gazette loan is a cited athletics-debt instrument, "
        "not Category 52. Empty outstanding means pending, not zero."
    )
    layers["iowa"]["debt"] = iowa
    booked_proj.append("iowa")

    # Nebraska — named stadium project only
    neb = empty_debt("nebraska", False)
    neb["projects"] = [NEBRASKA_PROJECT]
    neb["notes"] = (
        "No hosted FY2025 MFRS PDF on the desk. Big Red Rebuild is a cited board project. "
        "The $350 million bond plan is announced financing, not a Category 52 leftover."
    )
    layers["nebraska"]["debt"] = neb
    booked_proj.append("nebraska")

    assert_untouched(before, layers)

    # --- tape ---
    existing = {it.get("id") for it in tape_src.get("items", [])}
    new_tape = []
    for sid in booked_out:
        d = layers[sid]["debt"]["outstanding"]
        tid = f"{sid}-debt-outstanding-fy2025"
        if tid in existing:
            continue
        new_tape.append(
            tape_item(
                id=tid,
                date=d.get("asOf") if d.get("asOf") and len(str(d.get("asOf"))) >= 7 else "2026-01",
                school=sid,
                schoolName=names.get(sid, sid),
                kind="debt",
                headline=(
                    f"{names.get(sid, sid)} FY2025 athletics-related debt (stock) is {money(d['value'])}."
                ),
                figure=d["value"],
                confidence="reported",
                source={"label": d.get("source"), "url": d.get("url")},
                field="layers.debt.outstanding",
            )
        )
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
            new_tape.append(
                tape_item(
                    id=tid,
                    date="2026-04-24" if sid == "nebraska" else ("2025-07-01" if sid == "iowa" else "2025-12"),
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

    tape_src["items"] = list(tape_src.get("items") or []) + new_tape
    tape_src["meta"]["itemCount"] = len(tape_src["items"])
    tape_src["meta"]["asOf"] = "2026-08-28"

    notes = layers_doc["meta"].get("notes") or []
    debt_note = (
        "Athletics debt sits on layers.debt (outstanding stock, Category 34 annual service, named projects). "
        "Hosted FY2025 NCAA MFRS / AUP PDFs win. Category 53 university-wide institutional debt is refused. "
        "Not added to the capacity stack. $0 only when a filing says $0. Empty means pending."
    )
    if not any("Athletics debt sits on layers.debt" in n for n in notes):
        notes.append(debt_note)
    layers_doc["meta"]["notes"] = notes
    layers_doc["meta"]["asOf"] = "2026-08-28"

    dump(PUB / "layers.json", layers_doc)
    dump(SRC / "tape.json", tape_src)
    dump(PUB / "tape.json", tape_src)

    pending_ids = sorted(
        sid
        for sid, layer in layers.items()
        if layer.get("debt", {}).get("outstanding", {}).get("value") is None
        and layer.get("debt", {}).get("debtService", {}).get("value") is None
        and not layer.get("debt", {}).get("projects")
    )
    print("booked outstanding:", ", ".join(sorted(booked_out)))
    print("booked service:", ", ".join(sorted(booked_svc)))
    print("booked projects:", ", ".join(sorted(booked_proj)))
    print("pending:", ", ".join(pending_ids))
    print("refused institutional:")
    for sid, n, url in refused_institutional:
        print(f"  {sid} {money(n)}  {url}")
    print(f"tape +{len(new_tape)}")


if __name__ == "__main__":
    main()
