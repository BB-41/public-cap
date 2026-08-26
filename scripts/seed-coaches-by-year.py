#!/usr/bin/env python3
"""Seed coachesByYear (2021–2026) and FSU staff year-split. No invented dollars."""
import json
from copy import deepcopy
from pathlib import Path

ROOT = Path("/workspace")
YEARS = [2021, 2022, 2023, 2024, 2025, 2026]
USAT = {
    "source": "USA TODAY Sports coach salary database",
    "url": "https://sportsdata.usatoday.com/ncaa/salaries/football/coach",
    "asOf": "2025-10-08",
    "confidence": "reported",
}

PENDING_PAY = {
    "value": None,
    "confidence": "pending",
    "source": None,
    "url": None,
    "asOf": None,
    "notes": "No extracted pay on the desk for this chair-year.",
}


def pending_field(notes):
    return {**PENDING_PAY, "notes": notes}


def name_chair(name, notes):
    return {
        "name": name,
        "pay": pending_field(notes),
        "buyout": pending_field(notes),
        "term": {"confidence": "pending", "asOf": "2026-08", "notes": notes},
    }


def usat_chair(name, pay, buyout, extra=None):
    chair = {
        "name": name,
        "pay": {
            "value": pay,
            "year": 2025,
            "confidence": "reported",
            "source": USAT["source"],
            "url": USAT["url"],
            "asOf": USAT["asOf"],
            "notes": "USA TODAY cell stored on the desk for this chair. Not reused on a later hire.",
        },
        "buyout": {
            "value": buyout,
            "confidence": "reported" if buyout is not None else "pending",
            "source": USAT["source"] if buyout is not None else None,
            "url": USAT["url"] if buyout is not None else None,
            "asOf": USAT["asOf"] if buyout is not None else None,
            "notes": "School buyout if fired without cause on the as-of date. Liability/overhang, not annual spend."
            if buyout is not None
            else "No USA TODAY buyout cell on the desk for this chair-year.",
        },
        "term": {
            "confidence": "pending",
            "asOf": "2026-08",
            "notes": "Prior-year through-year not extracted.",
        },
    }
    if extra:
        chair.update(extra)
    return chair


def slim_name(current, notes):
    """Same person, no pay copied from a later file year."""
    return {
        "name": current["name"],
        "pay": pending_field(notes),
        "buyout": pending_field(notes),
        "term": {
            "confidence": "pending",
            "asOf": "2026-08",
            "notes": notes,
        },
    }


# First football season as HC at this school when obvious. Inclusive.
# Do not start earlier than we are sure. Full 68-school tape is still incoming.
FROM_YEAR = {
    "alabama": 2024,
    "arkansas": 2021,
    "auburn": 2023,
    "georgia": 2021,
    "mississippi-state": 2024,
    "missouri": 2021,
    "oklahoma": 2022,
    "south-carolina": 2021,
    "tennessee": 2021,
    "texas": 2021,
    "texas-am": 2024,
    "vanderbilt": 2021,
    "illinois": 2021,
    "indiana": 2024,
    "iowa": 2021,
    "maryland": 2021,
    "michigan": 2024,
    "michigan-state": 2024,
    "minnesota": 2021,
    "nebraska": 2023,
    "northwestern": 2023,
    "ohio-state": 2021,
    "oregon": 2022,
    "penn-state": 2021,
    "purdue": 2023,
    "rutgers": 2021,
    "ucla": 2024,
    "usc": 2022,
    "washington": 2024,
    "wisconsin": 2023,
    "boston-college": 2024,
    "california": 2021,
    "clemson": 2021,
    "duke": 2024,
    "georgia-tech": 2023,
    "louisville": 2023,
    "miami": 2022,
    "nc-state": 2021,
    "north-carolina": 2025,
    "pittsburgh": 2021,
    "smu": 2022,
    "stanford": 2025,
    "syracuse": 2024,
    "virginia": 2022,
    "wake-forest": 2025,
    "arizona": 2024,
    "arizona-state": 2023,
    "byu": 2021,
    "baylor": 2021,
    "cincinnati": 2023,
    "colorado": 2023,
    "houston": 2024,
    "kansas": 2021,
    "kansas-state": 2021,
    "oklahoma-state": 2021,
    "tcu": 2022,
    "texas-tech": 2022,
    "ucf": 2025,
    "utah": 2021,
    "west-virginia": 2025,
    "notre-dame": 2022,
}

# 2026-only new hires already on the current blob. Prior chairs restored from the desk.
NEW_2026 = {
    "lsu",
    "florida",
    "ole-miss",
    "kentucky",
    "iowa-state",
    "virginia-tech",
}

# FSU 6th/7th Amendment additional + $215k base (same file math as 2026 TAC).
FSU_TAC = {
    2021: (2_785_000, 3_000_000, "CY2"),
    2022: (3_035_000, 3_250_000, "CY3"),
    2023: (5_335_000, 5_550_000, "CY4"),
    2024: (9_785_000, 10_000_000, "CY5"),
    2025: (5_435_000, 5_650_000, "CY6"),  # 7th Amendment cut
    2026: (10_085_000, 10_300_000, "CY7"),
}
NORVELL6 = "https://s3.documentcloud.org/documents/24442204/floridastate_norvell_contract_6thamendment-to-2019-ea.pdf"
NORVELL7 = "https://s3.documentcloud.org/documents/25460174/norvell-mike-7th-amendment-to-2019-ea-final-12.pdf"


def norvell_year(year, current):
    addl, tac, cy = FSU_TAC[year]
    chair = deepcopy(current) if year >= 2025 else {
        "name": "Mike Norvell",
        "term": deepcopy(current.get("term")) if year >= 2024 else {
            "confidence": "reported",
            "source": "FSU 6th Amendment to 2019 EA",
            "url": NORVELL6,
            "asOf": "2026-08",
            "through": "2031",
            "notes": "6th Amendment Total Term through Dec. 31, 2031.",
        },
        "contractUrl": current.get("contractUrl") if year >= 2024 else NORVELL6,
        "contract": deepcopy(current.get("contract")) if year >= 2024 else None,
    }
    if chair.get("contract") is None:
        chair.pop("contract", None)
    src = NORVELL7 if year >= 2025 else NORVELL6
    chair["pay"] = {
        "value": tac,
        "year": year,
        "yearLabel": f"{year} TAC",
        "confidence": "reported",
        "source": "FSU 6th Amendment additional-comp table + $215,000 base"
        + (" (7th Amendment CY6 cut)" if year == 2025 else ""),
        "url": src,
        "asOf": "2024-12-13" if year >= 2025 else "2024-02-16",
        "notes": f"{cy} ({year}): base $215,000 + additional ${addl:,}. Same file math as the 2026 TAC cell. Incentives not included.",
        "breakdown": [
            {"label": "Base", "value": 215_000},
            {"label": f"Additional ({cy})", "value": addl},
        ],
    }
    if year == 2026:
        chair["pay"] = deepcopy(current["pay"])
    if year < 2026:
        chair["buyout"] = {
            "value": None,
            "confidence": "pending",
            "source": src,
            "url": src,
            "asOf": None,
            "notes": "Year-specific remaining-pay overhang not minted for this season. 2026 uses the 7th Amendment CY7 math.",
            "rule": "85% of remaining CY TAC + CY reinstatement (7th Amendment V.E.)." if year >= 2025 else None,
        }
        if chair["buyout"]["rule"] is None:
            chair["buyout"].pop("rule")
    return chair


def seed_lsu(current_fb, current_mbb):
    kelly = usat_chair(
        "Brian Kelly",
        10_175_000,
        53_293_333,
        extra={
            "contractUrl": "https://ath-ems.lsu.edu/prr/contracts/Employment%20Contracts/Football/Archive/Brian%20Kelly%20-%2011.28.21.pdf",
        },
    )
    kelly["pay"]["notes"] = (
        "USA TODAY cell the desk stored for Kelly. Not reused on 2026 (Kiffin term sheet)."
    )
    orgeron = name_chair(
        "Ed Orgeron",
        "2021 chair of record. No extracted USA TODAY cell on this desk.",
    )
    out = {}
    out[2021] = {"football": orgeron, "mbb": name_chair("—", "2021 MBB chair not extracted.")}
    # McMahon hired March 2022
    mc_name = slim_name(current_mbb, "Matt McMahon was the 2022–25 chair. Pay cell is the current USA TODAY row — shown on 2025–26 only.")
    mc_name["name"] = "Matt McMahon"
    for y in (2022, 2023, 2024):
        out[y] = {"football": deepcopy(kelly), "mbb": deepcopy(mc_name)}
    out[2025] = {"football": deepcopy(kelly), "mbb": deepcopy(current_mbb)}
    out[2026] = {"football": deepcopy(current_fb), "mbb": deepcopy(current_mbb)}
    return out


def seed_generic(sid, current_fb, current_mbb):
    out = {}
    if sid in NEW_2026:
        return out  # handled separately
    start = FROM_YEAR.get(sid)
    for y in YEARS:
        if start is None or y < start:
            continue
        if y >= 2025:
            out[y] = {"football": deepcopy(current_fb), "mbb": deepcopy(current_mbb)}
        else:
            out[y] = {
                "football": slim_name(
                    current_fb,
                    f"{current_fb['name']} was the {y} chair of record. Year-specific pay not extracted — we do not copy a later file year backward.",
                ),
                "mbb": name_chair("—", "Prior-year MBB chair not extracted."),
            }
    return out


def main():
    path = ROOT / "data" / "schools.json"
    data = json.loads(path.read_text())
    by_id = {s["id"]: s for s in data["schools"]}

    # --- restore prior chairs from the original desk (c211976) ---
    priors = {
        "florida": {
            "years": (2022, 2023, 2024, 2025),
            "chair": usat_chair("Billy Napier", 7_470_000, 20_428_333),
            "y2021": name_chair("—", "2021 chair of record not extracted (not Napier; first LSU-style season was 2022)."),
        },
        "ole-miss": {
            "years": (2021, 2022, 2023, 2024, 2025),
            "chair": usat_chair("Lane Kiffin", 9_000_000, 36_600_000),
        },
        "kentucky": {
            "years": (2021, 2022, 2023, 2024, 2025),
            "chair": usat_chair("Mark Stoops", 9_000_000, 37_687_500),
        },
        "iowa-state": {
            "years": (2021, 2022, 2023, 2024, 2025),
            "chair": usat_chair("Matt Campbell", 5_000_000, 35_416_667),
        },
        "virginia-tech": {
            "years": (2022, 2023, 2024, 2025),
            "chair": usat_chair("Brent Pry", 4_787_500, None),
            "y2021": name_chair("—", "2021 chair of record not extracted (Pry’s first season was 2022)."),
        },
    }

    fsu_staff_2024 = deepcopy(by_id["florida-state"]["staff"])
    fsu_staff_now = {
        "athleticDirector": deepcopy(by_id["florida-state"]["staff"]["athleticDirector"]),
        "office": [],
        "otherHeadCoaches": deepcopy(by_id["florida-state"]["staff"].get("otherHeadCoaches") or []),
        "assistants": [
            {
                "name": "Tony White",
                "sport": "football",
                "role": "Defensive coordinator",
                "pay": {
                    "value": None,
                    "confidence": "pending",
                    "source": "Florida State official 2026 football coaches directory",
                    "url": "https://seminoles.com/sports/football/coaches",
                    "asOf": "2026",
                    "notes": "Official current directory. No extracted dollar on this desk — we do not invent assistant pay.",
                },
            },
            {
                "name": "Tim Harris Jr.",
                "sport": "football",
                "role": "Offensive coordinator / Wide receivers",
                "pay": {
                    "value": None,
                    "confidence": "pending",
                    "source": "Florida State official 2026 football coaches directory",
                    "url": "https://seminoles.com/sports/football/coaches",
                    "asOf": "2026",
                    "notes": "Official current directory (first season as OC in 2026; 2025 pass-game / WR). No extracted dollar on this desk.",
                },
            },
        ],
        "notes": "Official 2026 Seminoles.com football staff directory. 2024 USA TODAY assistants (Fuller / Atkins) stay on 2024 only. Do not clone this list onto 2025.",
    }

    for s in data["schools"]:
        sid = s["id"]
        fb = s["coaches"]["football"]
        mbb = s["coaches"]["mbb"]
        by_year = {}

        if sid == "lsu":
            by_year = seed_lsu(fb, mbb)
        elif sid == "florida-state":
            for y in YEARS:
                by_year[y] = {
                    "football": norvell_year(y, fb),
                    "mbb": deepcopy(mbb) if y >= 2025 else name_chair("—", "Prior-year MBB chair not extracted."),
                }
            s["staff"] = fsu_staff_now
            s["staffByYear"] = {
                "2024": fsu_staff_2024,
                "2026": deepcopy(fsu_staff_now),
            }
        elif sid in priors:
            spec = priors[sid]
            for y in spec["years"]:
                by_year[y] = {
                    "football": deepcopy(spec["chair"]),
                    "mbb": deepcopy(mbb) if y >= 2025 else name_chair("—", "Prior-year MBB chair not extracted."),
                }
            if "y2021" in spec:
                by_year[2021] = {
                    "football": spec["y2021"],
                    "mbb": name_chair("—", "Prior-year MBB chair not extracted."),
                }
            by_year[2026] = {"football": deepcopy(fb), "mbb": deepcopy(mbb)}
        else:
            by_year = seed_generic(sid, fb, mbb)
            if 2026 not in by_year:
                by_year[2026] = {"football": deepcopy(fb), "mbb": deepcopy(mbb)}
            if 2025 not in by_year and sid not in NEW_2026:
                # current chair also coached 2025 unless they are a 2026-only hire
                start = FROM_YEAR.get(sid, 2026)
                if start <= 2025:
                    by_year[2025] = {"football": deepcopy(fb), "mbb": deepcopy(mbb)}

        s["coachesByYear"] = {str(y): by_year[y] for y in sorted(by_year)}

    # meta note
    data["meta"]["blockers"].append(
        "Football chairs are year-keyed (coachesByYear, 2021–2026). applySeason uses that year’s chair — we do not blank 2021–24 to an em-dash and we do not copy a 2026 hire onto 2024. A full 68-school year tape is still incoming; years without a key stay pending. No On3."
    )

    path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n")
    pub = ROOT / "public" / "data" / "schools.json"
    pub.write_text(path.read_text())
    print("wrote", path, "and", pub)

    # sanity
    for sid in ("lsu", "florida-state", "florida", "ole-miss", "kentucky", "clemson"):
        s = by_id[sid]
        print(sid)
        for y in YEARS:
            row = s["coachesByYear"].get(str(y))
            if not row:
                print(f"  {y}: (pending)")
                continue
            fb = row["football"]
            print(f"  {y}: {fb['name']:16} pay={fb['pay'].get('value')}")


if __name__ == "__main__":
    main()
