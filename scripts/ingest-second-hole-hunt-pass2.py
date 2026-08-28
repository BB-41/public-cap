#!/usr/bin/env python3
"""Second-hole-hunt pass 2 — 2026-08-28.

Cited dollars + URL + date only. Does not overwrite booked House / Item 44,
collective990, fees, existing AD pay, existing 2026 current-deal pays,
buyout.steps, existing apparel AAV, or media. Does not stamp USA TODAY 2025
onto 2026 year-keys. Leaves reserved cells to the parallel hunt.
"""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data"
PUB = ROOT / "public" / "data"

BOOKED_MUST = {
    "louisville": 32_900_000,
    "kentucky": 18_000_000,
    "ucla": 20_500_000,
    "california": 20_500_000,
    "texas": 13_500_000,
}

CHAIR = "Chair of record who started football 2026 (Wikipedia season-page infobox)."

ATH_SATTER = (
    "https://www.nytimes.com/athletic/3975896/2022/12/06/"
    "scott-satterfield-cincinnati-contract-salary-buyout/"
)
BOARDROOM_SATTER = "https://boardroom.tv/scott-satterfield-salary-contract-cincinnati/"
WLW_SATTER = (
    "https://700wlw.iheart.com/featured/lance-mcalister/content/"
    "2026-01-04-bearcats-and-buyouts-satterfield-and-miller/"
)
AANDM_ADIDAS = (
    "https://myaggienation.com/am_news/tamu-adidas-sign-five-year-deal/"
    "article_da4108b1-c669-58d2-ae4e-d2d1b14166b0.html"
)

EXISTING_APPAREL_AAV = {
    "wisconsin": 7_000_000,
    "kentucky": 7_000_000,
    "south-carolina": 7_750_000,
    "illinois": 4_900_000,
    "iowa": 3_400_000,
    "ohio-state": 6_100_000,
    "penn-state": 30_000_000,
    "clemson": 5_850_000,
    "georgia-tech": 18_600_000,
    "north-carolina": 3_250_000,
    "texas-tech": 5_925_000,
}


def dump_json(path: Path, data, *, ascii_ok: bool) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=ascii_ok) + "\n")


def money(value, source, url, as_of, notes, year=None):
    out = {
        "value": value,
        "confidence": "reported",
        "source": source,
        "url": url,
        "asOf": as_of,
        "notes": notes,
    }
    if year is not None:
        out["year"] = year
    return out


def apply_2026_hc_year_only(school, spec):
    year_fb = school["coachesByYear"]["2026"]["football"]
    if year_fb["pay"].get("value") is not None:
        raise SystemExit(f"refusing to overwrite 2026 pay for {school['id']}")
    year_pay = deepcopy(spec["pay"])
    year_pay["notes"] = f"{CHAIR} {spec['pay']['notes']}"
    year_fb["pay"] = year_pay
    year_fb["buyout"] = deepcopy(spec["buyout"])
    year_fb["term"] = deepcopy(spec["year_term"])
    if spec.get("contractUrl"):
        year_fb["contractUrl"] = spec["contractUrl"]
    if spec.get("contract"):
        year_fb["contract"] = deepcopy(spec["contract"])


def apply_apparel_aav(layer, annual):
    a = layer["apparel"]
    if a["annualValue"].get("value") is not None:
        raise SystemExit("refusing to overwrite existing apparel AAV")
    a["annualValue"] = annual


def main() -> None:
    schools_doc = json.loads((SRC / "schools.json").read_text())
    layers_doc = json.loads((PUB / "layers.json").read_text())
    tape_doc = json.loads((SRC / "tape.json").read_text())
    before = deepcopy({s["id"]: s for s in schools_doc["schools"]})
    before_layers = deepcopy(layers_doc["schools"])
    by_id = {s["id"]: s for s in schools_doc["schools"]}
    layers = layers_doc["schools"]

    for sid, expected in BOOKED_MUST.items():
        if by_id[sid]["nil"]["booked"]["value"] != expected:
            raise SystemExit(f"refusing: {sid} booked drifted")
    if (by_id["kentucky"].get("nil") or {}).get("preCap", {}).get("value") is not None:
        raise SystemExit("Kentucky preCap must stay empty")
    if by_id["oklahoma"]["coachesByYear"]["2026"]["football"]["pay"].get("value") is not None:
        raise SystemExit("Venables 2026 must stay empty")
    if by_id["california"]["coachesByYear"]["2026"]["football"]["pay"].get("value") is not None:
        raise SystemExit("Lupoi 2026 must stay empty")
    if by_id["cincinnati"]["coaches"]["football"]["pay"]["value"] != 3_700_000:
        raise SystemExit("Satterfield current USA TODAY drifted")
    if layers["texas-am"]["apparel"]["annualValue"].get("value") is not None:
        raise SystemExit("A&M apparel AAV already booked")
    if layers["lsu"]["apparel"]["annualValue"].get("value") is not None:
        raise SystemExit("LSU Nike AAV must stay pending")
    for sid, expected in EXISTING_APPAREL_AAV.items():
        got = layers[sid]["apparel"]["annualValue"]["value"]
        if got != expected:
            raise SystemExit(f"{sid} apparel AAV drifted {got}")

    apply_2026_hc_year_only(
        by_id["cincinnati"],
        {
            "pay": money(
                3_800_000,
                "The Athletic (Dec. 6, 2022), quoting Satterfield Dec. 4 MOU obtained by public records; Boardroom year table; 700WLW Jan. 4, 2026 restates the 2026 step",
                ATH_SATTER,
                "2022-12-06",
                "FOIA MOU: $3.5 million in 2023 (first full season) + $100,000 each subsequent season, culminating at $4.0 million in 2028. 2026 step is $3,800,000. USA TODAY 2024 $3.6M / 2025 $3.7M match the published steps. Incentives not added. Current-deal line stays the USA TODAY 2025 snapshot. No later file that changes the year table is on the desk.",
                year=2026,
            ),
            "buyout": {
                "value": None,
                "confidence": "pending",
                "source": "The Athletic — Satterfield MOU via public records",
                "url": ATH_SATTER,
                "asOf": None,
                "notes": "School-side without-cause from Jan. 1, 2026 is 70% of remaining pay — we do not invent the remainder or buyout.steps.",
            },
            "year_term": {
                "confidence": "reported",
                "asOf": "2022-12-06",
                "source": "Wikipedia season-page infobox; Athletic FOIA MOU",
                "url": "https://en.wikipedia.org/wiki/2026_Cincinnati_Bearcats_football_team",
                "through": "2028",
                "yearsRemaining": 3,
                "notes": f"{CHAIR} Six-year MOU through the 2028 season.",
            },
            "contractUrl": ATH_SATTER,
            "contract": {
                "label": "The Athletic — Satterfield MOU via public records",
                "url": ATH_SATTER,
            },
        },
    )

    apply_apparel_aav(
        layers["texas-am"],
        money(
            9_000_000,
            "The Eagle / My Aggie Nation (May 3, 2024), quoting the Adidas contract obtained by open records: $3 million annual base compensation + $6 million in products",
            AANDM_ADIDAS,
            "2024-05-03",
            (
                "Current Adidas deal (July 1, 2022–June 30, 2027), finalized Aug. 18, 2023. "
                "AAV is the named annual cash + product ($3M + $6M) — not a guess from the “more than $47 million” five-year headline. "
                "Not in this AAV: guaranteed minimum royalties ($380k / $400k / $400k / $400k / $380k), "
                "the additional $1 million a year for mutually agreed marketing initiatives, or performance bonuses. "
                "Aggies Wire (Aug. 2, 2026) still names the same term through June 30, 2027."
            ),
        ),
    )
    layers["texas-am"]["apparel"]["notes"] = (
        "Adidas FOIA cash+product AAV booked. Royalties and the $1M marketing fund are not added."
    )

    new_items = [
        {
            "id": "cincinnati-pay-satterfield-2026-mou",
            "date": "2022-12-06",
            "school": "cincinnati",
            "schoolName": "Cincinnati",
            "kind": "contract",
            "headline": "Athletic FOIA MOU: Scott Satterfield $3.5 million in 2023 + $100,000 each subsequent season. 2026 step is $3,800,000. Not the USA TODAY 2025-10-08 cell.",
            "figure": 3_800_000,
            "confidence": "reported",
            "source": {"label": "The Athletic — Satterfield MOU via public records", "url": ATH_SATTER},
            "field": "coachesByYear.2026.football.pay",
        },
        {
            "id": "texas-am-apparel-adidas-2024-eagle",
            "date": "2024-05-03",
            "school": "texas-am",
            "schoolName": "Texas A&M",
            "kind": "apparel",
            "headline": "The Eagle FOIA: Adidas $3 million annual cash + $6 million product on the July 2022–June 2027 deal. AAV is the named $9.0 million — royalties and $1M marketing not added.",
            "figure": 9_000_000,
            "confidence": "reported",
            "source": {"label": "The Eagle / My Aggie Nation — Adidas FOIA", "url": AANDM_ADIDAS},
            "field": "layers.apparel.annualValue",
        },
    ]
    existing_ids = {i.get("id") for i in tape_doc["items"]}
    for item in reversed(new_items):
        if item["id"] in existing_ids:
            raise SystemExit(f"tape id already present: {item['id']}")
        tape_doc["items"].insert(0, item)
    tape_doc["meta"]["itemCount"] = len(tape_doc["items"])
    tape_doc["meta"]["asOf"] = "2026-08-28"

    after = {s["id"]: s for s in schools_doc["schools"]}
    for sid in BOOKED_MUST:
        if after[sid]["nil"]["booked"] != before[sid]["nil"]["booked"]:
            raise SystemExit(f"booked drifted {sid}")
        if "collective990" in before[sid].get("nil", {}):
            if after[sid]["nil"]["collective990"] != before[sid]["nil"]["collective990"]:
                raise SystemExit(f"collective990 drifted {sid}")
    if after["louisville"]["nil"]["preCap"] != before["louisville"]["nil"]["preCap"]:
        raise SystemExit("louisville preCap drifted")
    if after["texas"]["nil"]["preCap"] != before["texas"]["nil"]["preCap"]:
        raise SystemExit("texas preCap drifted")
    if (after["kentucky"].get("nil") or {}).get("preCap", {}).get("value") is not None:
        raise SystemExit("Kentucky preCap filled")
    if after["oklahoma"]["coachesByYear"]["2026"]["football"]["pay"].get("value") is not None:
        raise SystemExit("Venables 2026 filled")
    if after["cincinnati"]["coaches"]["football"]["pay"]["value"] != 3_700_000:
        raise SystemExit("Satterfield current USA TODAY overwritten")
    if after["cincinnati"]["coachesByYear"]["2026"]["football"]["pay"]["value"] != 3_800_000:
        raise SystemExit("Satterfield 2026 miss")
    if layers["texas-am"]["apparel"]["annualValue"]["value"] != 9_000_000:
        raise SystemExit("A&M apparel AAV miss")
    if layers["lsu"]["apparel"]["annualValue"].get("value") is not None:
        raise SystemExit("LSU Nike AAV filled")
    for sid, expected in EXISTING_APPAREL_AAV.items():
        if layers[sid]["apparel"]["annualValue"] != before_layers[sid]["apparel"]["annualValue"]:
            raise SystemExit(f"existing apparel AAV drifted {sid}")
    if after["california"]["staff"]["athleticDirector"].get("pay", {}).get("value") is not None:
        raise SystemExit("Cal AD filled")
    if after["pittsburgh"]["staff"]["athleticDirector"].get("pay", {}).get("value") is not None:
        raise SystemExit("Greene filled")

    dump_json(SRC / "schools.json", schools_doc, ascii_ok=False)
    dump_json(PUB / "schools.json", schools_doc, ascii_ok=False)
    dump_json(PUB / "layers.json", layers_doc, ascii_ok=True)
    dump_json(SRC / "tape.json", tape_doc, ascii_ok=True)
    dump_json(PUB / "tape.json", tape_doc, ascii_ok=True)
    print("ingested pass2 Satterfield 2026 + A&M Adidas AAV")


if __name__ == "__main__":
    main()
