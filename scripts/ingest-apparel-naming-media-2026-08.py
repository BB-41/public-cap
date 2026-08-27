#!/usr/bin/env python3
"""Book cited apparel/naming AAV and upgrade estimated conference-floor media.

asOf 2026-08-27. Labeled models / cited dollars only.
Does not scrape On3 / Opendorse / NIL Go.
Does not invent dollars.
Does not overwrite booked NIL, fees, AD pay, or existing apparel/naming AAV.
"""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data"
PUB = ROOT / "public" / "data"

AL_NIKE = "https://www.al.com/alabamafootball/2025/08/alabama-quietly-extended-nike-deal-details-remain-a-mystery.html"
FL_JORDAN = "https://floridagators.com/news/2017/12/6/general-jordan-brand-welcomes-university-of-florida-to-the-family"
UGA_JERSEY = "https://www.onlineathens.com/story/sports/college/bulldogs-extra/2026/01/30/georgia-football-corporate-logos-josh-brooks/88421369007/"
UGA_WIKI = "https://en.wikipedia.org/wiki/Georgia_Bulldogs_football"
LSU_NIKE = "https://lsusports.net/news/2025/12/11/lsu-athletics-announces-long-term-partnership-extension-with-nike-leads-nikes-launch-of-blue-ribbon-elite-nil-program"
UO_NBC = "https://nbc16.com/sports/ducks/uo-signs-new-athletic-apparel-deal-with-nike"
UO_AP = "https://apnews.com/general-news-462ca17443ae44428ec8dc67f5508bcb"
UO_BOARD = "http://trustees.uoregon.edu/adopted-motions-and-resolutions"
UW_ESPN = "https://www.espn.com/college-sports/story/_/id/23104808/university-washington-10-year-agreement-wear-adidas-apparel-starting-summer-2019"
TX_TRIB = "https://www.texastribune.org/2015/10/30/ut-signs-record-apparel-deal-nike-250-million-over/"
GT_AP = "https://apnews.com/article/georgia-tech-hyundai-bobby-dodd-stadium-naming-rights-7efc03a1c8f00edabf4b5c5e0b60b42d"
GT_AJC = "https://www.ajc.com/sports/georgia-tech/board-of-regents-approves-bobby-dodd-stadium-at-hyundai-field/FLUH7LDNIFBJNMXUK2YVXPDA2Q/"
OM_MFRS = "https://olemisssports.com/documents/download/2026/1/15/NCAAReport_FY25.pdf"
UVA_MFRS = "https://stuffsomerssays.com/wp-content/uploads/2026/03/NCAA_MFRS_Submission_FY25.pdf"
WIKI_ACC = "https://en.wikipedia.org/wiki/Atlantic_Coast_Conference"
ACC_990 = "https://projects.propublica.org/nonprofits/organizations/560599082/202631349349301238/full"

BOOKED_MUST = {
    "louisville": 32_900_000,
    "kentucky": 18_000_000,
    "ucla": 20_500_000,
    "california": 20_500_000,
    "texas": 13_500_000,
}

EXISTING_APPAREL_AAV = {
    "south-carolina": 7_750_000,
    "illinois": 4_900_000,
    "iowa": 3_400_000,
    "ohio-state": 6_100_000,
    "penn-state": 30_000_000,
    "clemson": 5_850_000,
    "georgia-tech": 18_600_000,
    "north-carolina": 3_250_000,
    "texas-tech": 5_925_000,
    "wisconsin": 7_000_000,
    "kentucky": 7_000_000,
}

EXISTING_NAMING_AAV = {
    "arkansas": 5_400_000,
    "kentucky": 1_850_000,
    "indiana": 2_500_000,
    "arizona": 3_000_000,
    "texas-tech": 5_000_000,
}

ACC_990_ESTIMATED = {
    "boston-college": 47_087_682,
    "florida-state": 43_601_179,
    "georgia-tech": 46_052_588,
    "pittsburgh": 46_304_685,
    "virginia-tech": 46_546_737,
    "wake-forest": 42_814_168,
}


def dump(path: Path, data, *, ascii_ok: bool):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=ascii_ok) + "\n")


def brand(value, source, url, as_of, notes=None):
    out = {
        "value": value,
        "confidence": "reported",
        "source": source,
        "url": url,
        "asOf": as_of,
    }
    if notes:
        out["notes"] = notes
    return out


def money(value, source, url, as_of, notes, confidence="reported"):
    return {
        "value": value,
        "confidence": confidence,
        "source": source,
        "url": url,
        "asOf": as_of,
        "notes": notes,
    }


def naming(**kwargs):
    return kwargs


def tape_item(**kwargs):
    return kwargs


def apply_apparel(layer, spec):
    a = layer["apparel"]
    if spec.get("brand") and a["brand"].get("value") is None:
        a["brand"] = spec["brand"]
    if spec.get("annualValue") and a["annualValue"].get("value") is None:
        a["annualValue"] = spec["annualValue"]
    if spec.get("naming"):
        existing = {(n.get("facility"), n.get("sponsor")) for n in (a.get("naming") or [])}
        for row in spec["naming"]:
            key = (row.get("facility"), row.get("sponsor"))
            if key not in existing:
                a.setdefault("naming", []).append(row)
    if spec.get("notes") and not a.get("notes"):
        a["notes"] = spec["notes"]


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


def main():
    schools_doc = json.loads((SRC / "schools.json").read_text())
    layers_doc = json.loads((PUB / "layers.json").read_text())
    tape_doc = json.loads((SRC / "tape.json").read_text())
    before_schools = deepcopy({s["id"]: s for s in schools_doc["schools"]})
    before_layers = deepcopy(layers_doc["schools"])

    by_id = {s["id"]: s for s in schools_doc["schools"]}
    layers = layers_doc["schools"]

    idx = schools_doc["meta"]["sourcesIndex"]
    idx["om_mfrs"] = OM_MFRS
    idx["wiki_acc"] = WIKI_ACC
    idx["acc_990"] = ACC_990
    idx["al_nike"] = AL_NIKE
    idx["fl_jordan"] = FL_JORDAN
    idx["lsu_nike"] = LSU_NIKE
    idx["uo_nike"] = UO_NBC
    idx["uw_adidas"] = UW_ESPN
    idx["tx_nike"] = TX_TRIB
    idx["gt_hyundai"] = GT_AP

    # --- apparel / naming ---
    apply_apparel(
        layers["alabama"],
        {
            "brand": brand(
                "Nike",
                "AL.com (Aug. 27, 2025) — AD Greg Byrne: Alabama extended Nike “a few years ago”; current terms not public",
                AL_NIKE,
                "2025-08-27",
                "Brand only. Byrne said the extension is not available for public inspection. The 2013 deal’s $5.25M AAV expired June 30, 2025 and is not copied onto the current cell.",
            )
        },
    )
    apply_apparel(
        layers["florida"],
        {
            "brand": brand(
                "Jordan Brand (Nike)",
                "Florida Athletics (Dec. 6, 2017) — Jordan Brand outfits football and men’s/women’s basketball from 2018–19",
                FL_JORDAN,
                "2017-12-06",
                "School release names the current on-field brand. No guaranteed cash+product AAV on this desk. Fanatics licensed-merchandise guarantee is not the outfitter AAV.",
            )
        },
    )
    apply_apparel(
        layers["georgia"],
        {
            "brand": brand(
                "Nike",
                "Wikipedia Georgia Bulldogs football infobox — Outfitter: Nike. Athens Banner-Herald (Jan. 30, 2026) discusses 2026 jersey-patch talks on the current Bulldog uniform",
                UGA_WIKI,
                "2026-01-30",
                "Brand only. The 2015 Banner-Herald FOIA ($40.8M through June 30, 2024) expired and is not copied onto this cell.",
            )
        },
    )
    layers["georgia"]["apparel"]["brand"]["url"] = UGA_JERSEY
    apply_apparel(
        layers["lsu"],
        {
            "brand": brand(
                "Nike",
                "LSU Athletics (Dec. 11, 2025) — long-term Nike extension through 2036; Nike newsroom same day",
                LSU_NIKE,
                "2025-12-11",
                "Official release names the brand and through-year, not a cash+product AAV. We do not book a third-party $4.75M+$1M figure that the school release does not print.",
            )
        },
    )
    apply_apparel(
        layers["oregon"],
        {
            "brand": brand(
                "Nike",
                "NBC 16 / KVAL — Oregon Board of Trustees approved the 11-year Nike multi-sport apparel agreement (Dec. 8, 2017) through May 31, 2028",
                UO_NBC,
                "2017-12-08",
            ),
            "annualValue": money(
                8_000_000,
                "AP / Oregonian — $88 million cash+gear over 11 years. Board approved Dec. 8, 2017 (UO trustees adopted-motions list; NBC 16/KVAL).",
                UO_AP,
                "2017-12-08",
                (
                    "AP: $88 million over 11 years. AAV $8.0 million if spread flat, labeled estimated. "
                    "Same stories name $2.0–2.5 million annual cash (rising to $2.5 million through 2028) "
                    "and $5–6 million annual product (to $6 million in 2022–23), plus a $3 million signing bonus not in this AAV. "
                    "Through May 31, 2028."
                ),
                confidence="estimated",
            ),
        },
    )
    apply_apparel(
        layers["washington"],
        {
            "brand": brand(
                "Adidas",
                "ESPN (2018) — 10-year Adidas agreement beginning summer 2019 after 20 years with Nike",
                UW_ESPN,
                "2018",
            ),
            "annualValue": money(
                11_955_000,
                "ESPN — Adidas pays Washington $5.275 million cash + $5.58 million product + $1.1 million marketing annually (“almost $12 million”)",
                UW_ESPN,
                "2018",
                (
                    "Named annual pieces, not a guessed lump. $5,275,000 + $5,580,000 + $1,100,000 = $11,955,000. "
                    "Championship bonuses up to $500,000 are not in this AAV. 10-year term from summer 2019."
                ),
            ),
        },
    )
    apply_apparel(
        layers["texas"],
        {
            "annualValue": money(
                16_666_667,
                "Texas Tribune / AP — UT System Board of Regents approved a 15-year, $250 million Nike licensing and apparel contract (Oct. 30, 2015)",
                TX_TRIB,
                "2015-10-30",
                (
                    "Tribune: $250 million over 15 years, “averages more than $16 million per year.” "
                    "AAV $16,666,667 if spread flat, labeled estimated. Story also names a $20 million up-front cash payment "
                    "plus $6.5 million annual cash; product and the Kevin Durant line sit in the $250 million lump. "
                    "15-year term from 2015 is still the cited current deal on this desk."
                ),
                confidence="estimated",
            )
        },
    )
    apply_apparel(
        layers["georgia-tech"],
        {
            "naming": [
                naming(
                    facility="Bobby Dodd Stadium at Hyundai Field",
                    sponsor="Hyundai Motor America",
                    annualValue=2_750_000,
                    term="20 years / ~$55M (field name; 10-year initial + two 5-year renewals)",
                    confidence="estimated",
                    source="AP / Atlanta Journal-Constitution — Board of Regents: Hyundai pays about $55 million over 20 years for the field name",
                    url=GT_AP,
                    asOf="2023-08-08",
                    notes=(
                        "Field name, not the stadium bowl (still Bobby Dodd Stadium). "
                        "AAV $2.75 million if $55 million / 20, labeled estimated. "
                        "AJC: another $15 million-plus in separate Hyundai sponsorships is not in this AAV."
                    ),
                )
            ]
        },
    )

    # --- media upgrades (estimated floor → reported school/990 line) ---
    om = by_id["ole-miss"]["capacity"]
    assert om["mediaConference"]["confidence"] == "estimated"
    om["mediaConference"] = reported_cap(
        67_592_796,
        "Ole Miss FY2025 NCAA Membership Financial Report — Media Rights $49,607,055 + Conference $2,689,817 + Conference postseason $15,295,924",
        OM_MFRS,
        "2026-01-15",
        "SEC floor was $70.3M. We use the school's MFRS media+conference stack so we do not double-count the floor.",
    )
    om["tickets"] = reported_cap(
        26_582_195,
        "Ole Miss FY2025 NCAA Membership Financial Report — Category 1 Ticket Sales",
        OM_MFRS,
        "2026-01-15",
    )
    om["sponsorships"] = reported_cap(
        12_457_220,
        "Ole Miss FY2025 NCAA Membership Financial Report — Category 15 Royalties, Licensing, Advertisement and Sponsorships",
        OM_MFRS,
        "2026-01-15",
    )
    om["contributions"] = reported_cap(
        47_155_567,
        "Ole Miss FY2025 NCAA Membership Financial Report — Category 8 Contributions",
        OM_MFRS,
        "2026-01-15",
    )
    om["totalOperating"] = reported_cap(
        178_621_017,
        "Ole Miss FY2025 NCAA Membership Financial Report — total operating revenues",
        OM_MFRS,
        "2026-01-15",
    )

    uva = by_id["virginia"]["capacity"]
    assert uva["mediaConference"]["confidence"] == "estimated"
    uva["mediaConference"] = reported_cap(
        43_196_192,
        "Virginia FY2025 NCAA Membership Financial Report — Media Rights $33,681,945 + Conference $2,721,016 + Conference postseason $6,793,231",
        UVA_MFRS,
        "2026-03",
        "ACC floor was $42.8M. We use the school's MFRS media+conference stack so we do not double-count the 990 check.",
    )
    uva["tickets"] = reported_cap(
        15_902_119,
        "Virginia FY2025 NCAA Membership Financial Report — Category 1 Ticket Sales",
        UVA_MFRS,
        "2026-03",
    )
    uva["sponsorships"] = reported_cap(
        8_166_062,
        "Virginia FY2025 NCAA Membership Financial Report — Category 15 Royalties, Licensing, Advertisement and Sponsorships",
        UVA_MFRS,
        "2026-03",
    )
    uva["contributions"] = reported_cap(
        34_462_654,
        "Virginia FY2025 NCAA Membership Financial Report — Category 8 Contributions",
        UVA_MFRS,
        "2026-03",
    )
    uva["totalOperating"] = reported_cap(
        155_120_584,
        "Virginia FY2025 NCAA Membership Financial Report — total operating revenues",
        UVA_MFRS,
        "2026-03",
    )

    for sid, value in ACC_990_ESTIMATED.items():
        cell = by_id[sid]["capacity"]["mediaConference"]
        if cell.get("confidence") != "estimated":
            raise SystemExit(f"{sid} media is {cell.get('confidence')}, not estimated")
        by_id[sid]["capacity"]["mediaConference"] = reported_cap(
            value,
            "Wikipedia ACC page — FY2025 Form 990 Schedule A distributions via ProPublica (ACC filing May 14, 2026)",
            WIKI_ACC,
            "2026-05-14",
            (
                f"Named ACC 990 grant ${value:,}. Floor was $42.8M. "
                f"ProPublica hosts the FY2025 Form 990 ({ACC_990}). "
                "We do not replace already-reported Courier-Journal / WRAL school lines."
            ),
        )

    # --- tape ---
    new_tape = [
        tape_item(
            id="oregon-apparel-nike-2017-12-08",
            date="2017-12-08",
            school="oregon",
            schoolName="Oregon",
            kind="apparel",
            headline="Oregon Board of Trustees approved an 11-year Nike deal. AP: $88 million cash+gear (~$8.0 million AAV if spread flat).",
            figure=8_000_000,
            confidence="estimated",
            source={"label": "AP — Oregon $88 million Nike apparel agreement", "url": UO_AP},
            field="layers.apparel.annualValue",
        ),
        tape_item(
            id="washington-apparel-adidas-2018",
            date="2018",
            school="washington",
            schoolName="Washington",
            kind="apparel",
            headline="ESPN: Washington’s 10-year Adidas deal is $5.275 million cash + $5.58 million product + $1.1 million marketing ($11.955 million AAV).",
            figure=11_955_000,
            confidence="reported",
            source={"label": "ESPN — Washington 10-year Adidas agreement", "url": UW_ESPN},
            field="layers.apparel.annualValue",
        ),
        tape_item(
            id="texas-apparel-nike-2015-10-30",
            date="2015-10-30",
            school="texas",
            schoolName="Texas",
            kind="apparel",
            headline="Texas Tribune: UT System regents approved a 15-year, $250 million Nike deal (~$16.7 million AAV if spread flat).",
            figure=16_666_667,
            confidence="estimated",
            source={"label": "Texas Tribune — UT Nike $250 million / 15 years", "url": TX_TRIB},
            field="layers.apparel.annualValue",
        ),
        tape_item(
            id="georgia-tech-naming-hyundai-2023-08-08",
            date="2023-08-08",
            school="georgia-tech",
            schoolName="Georgia Tech",
            kind="naming",
            headline="AP / AJC: Board of Regents approve Bobby Dodd Stadium at Hyundai Field — about $55 million over 20 years (~$2.75 million AAV). Field name, not the bowl.",
            figure=2_750_000,
            confidence="estimated",
            source={"label": "AP — Georgia Tech Hyundai field naming", "url": GT_AP},
            field="layers.apparel.naming",
        ),
        tape_item(
            id="ole-miss-mfrs-media-2026-01-15",
            date="2026-01-15",
            school="ole-miss",
            schoolName="Ole Miss",
            kind="990",
            headline="Ole Miss FY2025 MFRS media+conference stack: Media Rights $49,607,055 + Conference $2,689,817 + postseason $15,295,924 = $67,592,796 (was the $70.3M SEC floor).",
            figure=67_592_796,
            confidence="reported",
            source={"label": "Ole Miss FY2025 NCAA Membership Financial Report", "url": OM_MFRS},
            field="capacity.mediaConference",
        ),
        tape_item(
            id="virginia-mfrs-media-2026-03",
            date="2026-03",
            school="virginia",
            schoolName="Virginia",
            kind="990",
            headline="Virginia FY2025 MFRS media+conference stack: Media Rights $33,681,945 + Conference $2,721,016 + postseason $6,793,231 = $43,196,192 (was the $42.8M ACC floor).",
            figure=43_196_192,
            confidence="reported",
            source={"label": "Virginia FY2025 NCAA Membership Financial Report", "url": UVA_MFRS},
            field="capacity.mediaConference",
        ),
    ]
    for sid, value in ACC_990_ESTIMATED.items():
        new_tape.append(
            tape_item(
                id=f"{sid}-acc-990-media-2026-05-14",
                date="2026-05-14",
                school=sid,
                schoolName=by_id[sid]["shortName"],
                kind="990",
                headline=f"ACC FY2025 Form 990 Schedule A (ProPublica / Wikipedia table): {by_id[sid]['shortName']} ${value:,} (was the $42.8M conference floor).",
                figure=value,
                confidence="reported",
                source={"label": "Wikipedia ACC — FY2025 Form 990 Schedule A via ProPublica", "url": WIKI_ACC},
                field="capacity.mediaConference",
            )
        )

    existing_ids = {it["id"] for it in tape_doc["items"]}
    for it in new_tape:
        if it["id"] in existing_ids:
            raise SystemExit(f"tape id already exists: {it['id']}")
    tape_doc["items"] = new_tape + tape_doc["items"]
    tape_doc["meta"]["itemCount"] = len(tape_doc["items"])
    tape_doc["meta"]["asOf"] = "2026-08-27"
    layers_doc["meta"]["asOf"] = "2026-08-27"

    after = {s["id"]: s for s in schools_doc["schools"]}

    for sid, expected in BOOKED_MUST.items():
        got = after[sid]["nil"]["booked"]["value"]
        if got != expected:
            raise SystemExit(f"booked NIL drifted {sid}: {got}")
        if after[sid]["nil"] != before_schools[sid]["nil"]:
            raise SystemExit(f"nil object drifted {sid}")
    for sid in after:
        if "collective990" in before_schools[sid].get("nil", {}):
            if after[sid]["nil"]["collective990"] != before_schools[sid]["nil"]["collective990"]:
                raise SystemExit(f"collective990 drifted {sid}")
        if after[sid]["coaches"]["football"].get("pay") != before_schools[sid]["coaches"]["football"].get("pay"):
            raise SystemExit(f"current HC pay drifted {sid}")
        if after[sid].get("staff") != before_schools[sid].get("staff"):
            raise SystemExit(f"staff drifted {sid}")
        for k in ("studentFees", "institutionalSupport", "governmentSupport"):
            if after[sid]["capacity"].get(k) != before_schools[sid]["capacity"].get(k):
                raise SystemExit(f"{k} drifted {sid}")
        if after[sid]["capacity"]["mediaConference"].get("confidence") == "reported":
            if before_schools[sid]["capacity"]["mediaConference"].get("confidence") == "reported":
                if after[sid]["capacity"]["mediaConference"] != before_schools[sid]["capacity"]["mediaConference"]:
                    raise SystemExit(f"reported media overwritten {sid}")
    for sid, expected in EXISTING_APPAREL_AAV.items():
        got = layers[sid]["apparel"]["annualValue"]["value"]
        if got != expected:
            raise SystemExit(f"apparel AAV drifted {sid}: {got}")
        if layers[sid]["apparel"]["annualValue"] != before_layers[sid]["apparel"]["annualValue"]:
            raise SystemExit(f"existing apparel annualValue object drifted {sid}")
    for sid, expected in EXISTING_NAMING_AAV.items():
        rows = [n for n in layers[sid]["apparel"]["naming"] if n.get("annualValue") == expected]
        if not rows:
            raise SystemExit(f"naming AAV missing {sid} {expected}")

    dump(SRC / "schools.json", schools_doc, ascii_ok=False)
    dump(SRC / "tape.json", tape_doc, ascii_ok=True)
    dump(PUB / "schools.json", schools_doc, ascii_ok=False)
    dump(PUB / "tape.json", tape_doc, ascii_ok=True)
    dump(PUB / "layers.json", layers_doc, ascii_ok=True)

    print(
        "new apparel AAV",
        {
            sid: layers[sid]["apparel"]["annualValue"]["value"]
            for sid in ("oregon", "washington", "texas")
        },
    )
    print("new brands", {sid: layers[sid]["apparel"]["brand"]["value"] for sid in ("alabama", "florida", "georgia", "lsu", "oregon", "washington")})
    print("gt naming", layers["georgia-tech"]["apparel"]["naming"])
    print(
        "media",
        {
            sid: after[sid]["capacity"]["mediaConference"]["value"]
            for sid in ["ole-miss", "virginia", *ACC_990_ESTIMATED]
        },
    )
    print("tape items", tape_doc["meta"]["itemCount"])


if __name__ == "__main__":
    main()
