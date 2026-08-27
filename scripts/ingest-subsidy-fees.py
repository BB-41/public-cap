#!/usr/bin/env python3
"""Book citeable student-fee and institutional-support cells.

Source order:
  1. Hosted FY2025 NCAA Membership Financial Reports (same PDFs as Item 44)
  2. EADA public file — inspected; 2024-25 has department totals only, no split
  3. Knight-Newhouse when it cites the same MFRS lines

Does not invent dollars. Does not mint $0 unless a filing shows $0.
Does not add fees/support into the capacity stack (media + sponsorships +
tickets + contributions). Does not touch NIL, coaches, or staff.
"""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data"
PUB = ROOT / "public" / "data"

# Hosted FY2025 MFRS PDFs already on this desk (Item 44 / capacity sources).
# Line 3 = student fees; line 4 = direct institutional; line 2 = government.
# Indirect (lines 6/6A) is noted, not booked as direct institutional.
MFRS = {
    "georgia": {
        "url": "https://georgiadogs.com/documents/download/2026/1/15/2025_NCAA_Financial_Report.pdf",
        "source": "UGA FY2025 NCAA financial report",
        "asOf": "2026-01-15",
        "fees": 3_871_937,
        "inst": 0,
        "gov": 0,
    },
    "tennessee": {
        "url": "https://utsports.com/documents/download/2026/1/15/FY25_NCAA_AUP.pdf",
        "source": "Tennessee FY2025 NCAA AUP / Membership Financial Report",
        "asOf": "2026-01-15",
        "fees": 1_000_000,
        "inst": 7_137_633,
        "gov": 0,
        "notes": "Line 5 transfers to institution −$8,137,633. Not netted out of the booked line-4 cell.",
    },
    "oregon": {
        "url": "https://goducks.com/documents/download/2026/1/13/University_of_Oregon_NCAA_FRS_FY2025_FINAL.pdf",
        "source": "Oregon FY2025 NCAA FRS",
        "asOf": "2026-01-13",
        "fees": 0,
        "inst": 0,
        "gov": 589_167,
        "notes": "Line 4 direct institutional is $0. Line 2 government is $589,167 (sports lottery / state). KN combined this on institutional/government; desk keeps the split.",
    },
    "utah": {
        "url": "https://utahutes.com/documents/download/2026/1/21/FY25_NCAA_Revenue_and_Expense_Report.pdf",
        "source": "Utah FY2025 NCAA Revenue and Expense Report",
        "asOf": "2026-01-21",
        "fees": 6_458_932,
        "inst": 3_709_854,
        "gov": 0,
        "notes": "Line 6 indirect institutional support $2,458,527 is not booked as direct institutional.",
    },
    "north-carolina": {
        "url": "https://goheels.com/documents/download/2026/2/3/NCAAMembershipFinancialReport2025.pdf",
        "source": "UNC FY2025 NCAA Membership Financial Report",
        "asOf": "2026-02-03",
        "fees": 8_504_951,
        "inst": 0,
        "gov": 0,
        "notes": "Line 4 direct institutional is $0. Line 6 indirect $1,918,664 is not booked as direct.",
    },
    "illinois": {
        "url": "https://fightingillini.com/documents/download/2026/1/29/FY25_IL_NCAA_Full_Report__Revised_1-22-26_.pdf",
        "source": "Illinois FY2025 NCAA Membership Financial Report",
        "asOf": "2026-01-29",
        "fees": 3_639_531,
        "inst": 22_395,
        "gov": 7_970_572,
        "notes": "Line 5 transfers −$142,446. KN combined government + direct institutional as $7,992,967; desk keeps the split.",
    },
    "minnesota": {
        "url": "https://gophersports.com/documents/download/2026/1/20/Minnesota_FY25_NCAA_Online_Report_-_FINAL_01.14.26.pdf",
        "source": "Minnesota FY2025 NCAA Membership Financial Report",
        "asOf": "2026-01-20",
        "fees": 0,
        "inst": 5_054_285,
        "gov": 0,
        "notes": "Line 6 indirect institutional support $6,458,586 is not booked as direct institutional.",
    },
    "washington": {
        "url": "https://gohuskies.com/documents/download/2026/1/17/FY25_NCAA_FINAL.pdf",
        "source": "Washington FY2025 NCAA Membership Financial Report",
        "asOf": "2026-01-17",
        "fees": 0,
        "inst": 10_781_975,
        "gov": 0,
    },
    "wisconsin": {
        "url": "https://uwbadgers.com/documents/download/2026/1/16/Final_FY25_NCAA_Report.pdf",
        "source": "Wisconsin FY2025 NCAA Membership Financial Report",
        "asOf": "2026-01-16",
        "fees": 0,
        "inst": 7_245_480,
        "gov": 3_176_379,
        "notes": "Line 5 transfers −$7,245,480. KN combined government + direct institutional as $10,421,859; desk keeps the split.",
    },
    "iowa-state": {
        "url": "https://cyclones.com/documents/download/2026/1/16/NCAA_Financial_Report_-_FY25_-_FINAL.pdf",
        "source": "Iowa State FY2025 NCAA Financial Report",
        "asOf": "2026-01-16",
        "fees": 1_819_397,
        "inst": 0,
        "gov": 0,
    },
    "virginia": {
        "url": "https://stuffsomerssays.com/wp-content/uploads/2026/03/NCAA_MFRS_Submission_FY25.pdf",
        "source": "Virginia FY2025 NCAA Membership Financial Report (published copy)",
        "asOf": "2026-03",
        "fees": 17_335_632,
        "inst": 17_916_907,
        "gov": 0,
        "notes": "Line 6 indirect institutional support $1,401,812 is not booked as direct institutional.",
    },
    "ole-miss": {
        "url": "https://olemisssports.com/documents/download/2026/1/15/NCAAReport_FY25.pdf",
        "source": "Ole Miss FY2025 NCAA Membership Financial Report",
        "asOf": "2026-01-15",
        "fees": 0,
        "inst": 5_734_050,
        "gov": 0,
    },
}

OSU_PDF = "https://news.osu.edu/download/c91b5f24-f009-4455-81eb-4b89b108f1bc/fy25ncaamembershipreportfinal.pdf"
OSU_NEWS = "https://news.osu.edu/ohio-state-athletics-sets-record-with-336m-in-fy25-revenue-after-national-championship-season/"

KEEP_TAPE_IDS = {
    "ohio-state-subsidy-fy2025",
    "rutgers-subsidy-fy2025",
    "louisville-subsidy-fee-2025-07-18",
}

STACK_KEYS = ("mediaConference", "sponsorships", "tickets", "contributions")


def load(path: Path):
    return json.loads(path.read_text())


def dump(path: Path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n")


def field(value, confidence, source, url, as_of, *, fiscal_year="FY2025", notes=None):
    out = {
        "value": value,
        "confidence": confidence,
        "source": source,
        "url": url,
        "asOf": as_of,
        "fiscalYear": fiscal_year,
    }
    if notes:
        out["notes"] = notes
    return out


def pending(notes, url=None):
    return {
        "value": None,
        "confidence": "pending",
        "source": None,
        "url": url,
        "asOf": None,
        "notes": notes,
    }


def money(n):
    return f"${n:,}"


def clone(obj):
    return deepcopy(obj)


def snapshot_untouchables(school):
    return {
        "nil": clone(school.get("nil")),
        "coaches": clone(school.get("coaches")),
        "staff": clone(school.get("staff")),
        "coachesByYear": clone(school.get("coachesByYear")),
        "staffByYear": clone(school.get("staffByYear")),
        "stack": {k: clone(school.get("capacity", {}).get(k)) for k in STACK_KEYS},
    }


def assert_untouched(before, after, school_id):
    b, a = before[school_id], after[school_id]
    for key in ("nil", "coaches", "staff", "coachesByYear", "staffByYear"):
        if b.get(key) != a.get(key):
            raise SystemExit(f"refused to overwrite {school_id} {key}")
    for k in STACK_KEYS:
        if b["stack"].get(k) != a.get("capacity", {}).get(k):
            raise SystemExit(f"refused to overwrite {school_id} capacity.{k}")


def apply_capacity(school, student_fees, institutional, government, notes=None):
    cap = school.setdefault("capacity", {})
    cap["studentFees"] = student_fees
    cap["institutionalSupport"] = institutional
    if government is not None:
        cap["governmentSupport"] = government
    if notes:
        cap["subsidyNotes"] = notes


def apply_layer(layer_school, student_fees, institutional, government, notes=None, fee_rate=None):
    sub = layer_school.setdefault("subsidy", {})
    keep_rate = fee_rate if fee_rate is not None else sub.get("feeRate")
    layer_school["subsidy"] = {
        "studentFees": student_fees,
        "institutionalSupport": institutional,
        "governmentSupport": government
        if government is not None
        else pending("No Line 2 government split on this desk."),
        "notes": notes,
    }
    if keep_rate:
        layer_school["subsidy"]["feeRate"] = keep_rate


def tape_item(**kwargs):
    return kwargs


def main():
    schools_doc = load(SRC / "schools.json")
    tape_doc = load(SRC / "tape.json")
    layers_doc = load(PUB / "layers.json")

    before = {s["id"]: snapshot_untouchables(s) for s in schools_doc["schools"]}
    schools = {s["id"]: s for s in schools_doc["schools"]}
    layers = layers_doc["schools"]

    booked_ids = []

    # --- hosted MFRS PDFs ---
    for sid, rec in MFRS.items():
        school = schools[sid]
        fee_notes = "Cited $0 on MFRS line 3 — not an invented blank." if rec["fees"] == 0 else "NCAA MFRS line 3 — athletics slice of student fees, not tuition."
        inst_notes = "Cited $0 on MFRS line 4 — not an invented blank." if rec["inst"] == 0 else "NCAA MFRS line 4 — direct institutional support."
        gov_notes = "Cited $0 on MFRS line 2 — not an invented blank." if rec["gov"] == 0 else "NCAA MFRS line 2 — direct state or other government support."
        extra = rec.get("notes")
        fees = field(
            rec["fees"],
            "reported",
            f"{rec['source']} — Item 3 Student Fees {money(rec['fees'])}",
            rec["url"],
            rec["asOf"],
            notes=fee_notes,
        )
        inst = field(
            rec["inst"],
            "reported",
            f"{rec['source']} — Item 4 Direct Institutional Support {money(rec['inst'])}",
            rec["url"],
            rec["asOf"],
            notes=inst_notes,
        )
        gov = field(
            rec["gov"],
            "reported",
            f"{rec['source']} — Item 2 Direct State or Other Government Support {money(rec['gov'])}",
            rec["url"],
            rec["asOf"],
            notes=gov_notes,
        )
        notes = extra or "Hosted FY2025 NCAA Membership Financial Report. Student fees are the athletics slice, not tuition."
        apply_capacity(school, fees, inst, gov, notes)
        apply_layer(layers[sid], fees, inst, gov, notes)
        booked_ids.append(sid)

    # --- Ohio State: keep the $0/$0/$0 filing; PDF confirms line 3 $0 and line 4 $112,280 offset by transfers ---
    osu_fees = field(
        0,
        "reported",
        "Ohio State Athletics / OSU News — FY25 NCAA Membership Report: department is self-funded and receives no tuition or tax dollars",
        OSU_NEWS,
        "2026-01-30",
        notes="Cited as $0 allocated student-fee / tuition support. Hosted FY25 MFRS PDF line 3 is $0. Not an invented blank.",
    )
    osu_inst = field(
        0,
        "reported",
        "Ohio State Athletics / OSU News — self-funded, no tuition or tax dollars",
        OSU_NEWS,
        "2026-01-30",
        notes=(
            "School filing: $0 institutional / tax support. Hosted FY25 MFRS PDF line 4 is $112,280 "
            f"offset by line 5 transfers −$112,280 ({OSU_PDF}). Desk keeps the $0/$0 filing."
        ),
    )
    osu_gov = field(
        0,
        "reported",
        "Ohio State Athletics / OSU News — no tax dollars",
        OSU_NEWS,
        "2026-01-30",
        notes="Hosted FY25 MFRS PDF line 2 is $0.",
    )
    osu_notes = (
        "Department FY25 release: self-funded, no tuition or tax dollars. "
        "Hosted MFRS PDF confirms line 3 student fees $0 and line 2 government $0; "
        "line 4 $112,280 is offset by transfers. $0/$0 is the filing, not an invented blank."
    )
    apply_capacity(schools["ohio-state"], osu_fees, osu_inst, osu_gov, osu_notes)
    apply_layer(layers["ohio-state"], osu_fees, osu_inst, osu_gov, osu_notes)
    booked_ids.append("ohio-state")

    # --- Rutgers: keep Extra Points 3-way split (already a filing) ---
    ru = layers["rutgers"]["subsidy"]
    apply_capacity(
        schools["rutgers"],
        clone(ru["studentFees"]),
        clone(ru["institutionalSupport"]),
        clone(ru["governmentSupport"]),
        ru.get("notes"),
    )
    booked_ids.append("rutgers")

    # --- remaining publics: promote existing KN cells onto the school object ---
    for school in schools_doc["schools"]:
        sid = school["id"]
        if sid in booked_ids:
            continue
        if school.get("private"):
            continue
        sub = layers.get(sid, {}).get("subsidy") or {}
        sf = sub.get("studentFees")
        inst = sub.get("institutionalSupport")
        gov = sub.get("governmentSupport")
        if (sf or {}).get("value") is None and (inst or {}).get("value") is None:
            continue
        apply_capacity(
            school,
            clone(sf) if sf else pending("No cited student-fee line on the desk."),
            clone(inst) if inst else pending("No cited institutional-support line on the desk."),
            clone(gov) if gov else None,
            sub.get("notes"),
        )
        booked_ids.append(sid)

    # Louisville feeRate stays on layers; capacity gets the FY2025 department cells.
    # (already promoted from KN above)

    # --- tape rows ---
    existing_ids = {it.get("id") for it in tape_doc.get("items", [])}
    new_tape = []
    for sid in booked_ids:
        if sid in ("ohio-state", "rutgers"):
            continue
        school = schools[sid]
        cap = school["capacity"]
        sf = cap.get("studentFees") or {}
        inst = cap.get("institutionalSupport") or {}
        gov = cap.get("governmentSupport") or {}
        name = school["name"]
        src = sf if sf.get("url") else inst
        date = src.get("asOf") or "FY2025"
        if len(str(date)) == 7 and str(date)[4] == "-":
            date = f"{date}-01"

        if sf.get("value") is not None:
            tid = f"{sid}-student-fee-fy2025"
            if tid not in existing_ids:
                new_tape.append(
                    tape_item(
                        id=tid,
                        date=date if date != "FY2025" else "2026-01",
                        school=sid,
                        schoolName=name,
                        kind="student-fee",
                        headline=(
                            f"{name} FY2025 NCAA MFRS / KN line 3 books student fees allocated to athletics at {money(sf['value'])}. "
                            "This is the athletics slice of a student fee, not tuition."
                            if sf["value"]
                            else f"{name} FY2025 filing books $0 student fees allocated to athletics (self-funded on that line)."
                        ),
                        figure=sf["value"],
                        confidence=sf.get("confidence") or "reported",
                        source={"label": sf.get("source"), "url": sf.get("url")},
                        field="capacity.studentFees",
                    )
                )
        if inst.get("value") is not None or gov.get("value") is not None:
            tid = f"{sid}-subsidy-fy2025"
            if tid not in existing_ids:
                bits = []
                if inst.get("value") is not None:
                    bits.append(f"direct institutional {money(inst['value'])}")
                if gov.get("value") is not None:
                    bits.append(f"government {money(gov['value'])}")
                figure = inst.get("value") if inst.get("value") is not None else gov.get("value")
                new_tape.append(
                    tape_item(
                        id=tid,
                        date=date if date != "FY2025" else "2026-01",
                        school=sid,
                        schoolName=name,
                        kind="subsidy",
                        headline=f"{name} FY2025 NCAA MFRS / KN allocated-support lines: {', '.join(bits)}.",
                        figure=figure,
                        confidence=(inst.get("confidence") or gov.get("confidence") or "reported"),
                        source={
                            "label": (inst.get("source") or gov.get("source")),
                            "url": (inst.get("url") or gov.get("url")),
                        },
                        field="capacity.institutionalSupport",
                    )
                )

    tape_doc["items"] = list(tape_doc.get("items") or []) + new_tape

    # --- layers + schools meta ---
    layers_doc["meta"]["asOf"] = "2026-08-27"
    notes = layers_doc["meta"].get("notes") or []
    subsidy_note = (
        "Student fees / institutional support sit on the school (capacity.studentFees, "
        "capacity.institutionalSupport, capacity.governmentSupport when split) and on layers.subsidy. "
        "Hosted FY2025 NCAA MFRS PDFs win when we have the file (line 3 fees; line 4 direct institutional; "
        "line 2 government). EADA 2024-25 public file (ope.ed.gov) was opened — department/sport totals only, "
        "no fee/support split, so no EADA dollars were booked. Remaining publics use Knight-Newhouse school-profile "
        "FY2025 figures that cite the same MFRS lines (fees = line 3; institutional/government = KN combined 2+4+6+6A). "
        "Ohio State keeps the $0/$0 self-funded filing (PDF line 4 $112,280 is offset by transfers). "
        "Rutgers keeps the Extra Points 3-way split. Louisville keeps the published $200/semester athletic fee "
        "plus the FY2025 department total. $0 is printed only when the filing shows $0. "
        "Privates and Pittsburgh stay pending. Not added to the capacity stack. Athletic fee ≠ tuition."
    )
    replaced = False
    for i, line in enumerate(notes):
        if "Student fees / institutional support" in line:
            notes[i] = subsidy_note
            replaced = True
    if not replaced:
        notes.append(subsidy_note)
    layers_doc["meta"]["notes"] = notes

    blockers = schools_doc["meta"].get("blockers") or []
    extra_blocker = (
        "Student-fee / institutional-support cells: hosted FY2025 MFRS PDFs first "
        "(Georgia, Tennessee, Oregon, Utah, UNC, Illinois, Minnesota, Washington, Wisconsin, "
        "Iowa State, Virginia, Ole Miss, Ohio State). EADA 2024-25 public file has no fee/support "
        "split — unused for those cells. Remaining publics use Knight-Newhouse FY2025 school-profile "
        "lines that cite the same MFRS categories. Privates and Pittsburgh stay empty. "
        "Do not mint $0 unless the report shows $0. Not added to booked capacity."
    )
    if not any(line.startswith("Student-fee / institutional-support") for line in blockers):
        blockers.append(extra_blocker)
    schools_doc["meta"]["blockers"] = blockers
    schools_doc["meta"]["asOf"] = "2026-08-27"

    # --- write both copies ---
    dump(SRC / "schools.json", schools_doc)
    dump(PUB / "schools.json", schools_doc)
    dump(SRC / "tape.json", tape_doc)
    dump(PUB / "tape.json", tape_doc)
    dump(PUB / "layers.json", layers_doc)

    after = {s["id"]: s for s in schools_doc["schools"]}
    for sid in before:
        assert_untouched(before, after, sid)

    filled = [
        s["id"]
        for s in schools_doc["schools"]
        if (s.get("capacity") or {}).get("studentFees", {}).get("value") is not None
        or (s.get("capacity") or {}).get("institutionalSupport", {}).get("value") is not None
    ]
    privates_minted = [
        s["id"]
        for s in schools_doc["schools"]
        if s.get("private")
        and (
            (s.get("capacity") or {}).get("studentFees", {}).get("value") is not None
            or (s.get("capacity") or {}).get("institutionalSupport", {}).get("value") is not None
        )
    ]
    if privates_minted:
        raise SystemExit(f"refused to mint private-school subsidy cells: {privates_minted}")
    osu = after["ohio-state"]["capacity"]
    if osu["studentFees"]["value"] != 0 or osu["institutionalSupport"]["value"] != 0:
        raise SystemExit("Ohio State $0/$0 filing was overwritten")

    print(f"capacity subsidy cells: {len(filled)} schools")
    print(f"new tape rows: {len(new_tape)}")
    print("ok")


if __name__ == "__main__":
    main()
