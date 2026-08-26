#!/usr/bin/env python3
"""Write scripts/staff-usat/2024.json from the cited USA TODAY Dec 18, 2024 table.

Source of names and dollars: scripts/apply-coach-staff.py (ASSISTANTS / TITLES /
FB_ASST_POOL). This does not invent pay and does not scrape the live table.
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "scripts" / "staff-usat" / "2024.json"

# Roles only when Football Scoop named them (same TITLES map as apply-coach-staff).
TITLES = {
    ("lsu", "Blake Baker"): "Defensive coordinator",
    ("michigan", "Wink Martindale"): "Defensive coordinator",
    ("ohio-state", "Jim Knowles"): "Defensive coordinator",
    ("ole-miss", "Pete Golding"): "Defensive coordinator",
    ("utah", "Andy Ludwig"): "Offensive coordinator",
    ("florida-state", "Adam Fuller"): "Defensive coordinator",
    ("georgia", "Glenn Schumann"): "Defensive coordinator",
    ("ohio-state", "Chip Kelly"): "Offensive coordinator",
    ("utah", "Morgan Scalley"): "Defensive coordinator",
    ("oregon", "Tosh Lupoi"): "Defensive coordinator",
    ("iowa", "Phil Parker"): "Defensive coordinator",
}

# (school, name, pay) — USA TODAY Sports football assistant salary database, 2024-12-18
ASSISTANTS = [
    ("alabama", "Kane Wommack", 1550000),
    ("alabama", "Nick Sheridan", 1350000),
    ("arkansas", "Bobby Petrino", 1500000),
    ("arkansas", "Travis Williams", 1175000),
    ("auburn", "DJ Durkin", 1200000),
    ("auburn", "Charles Kelly", 875000),
    ("florida", "Austin Armstrong", 1201500),
    ("florida", "Rob Sale", 1001500),
    ("georgia", "Glenn Schumann", 2003000),
    ("georgia", "Travaris Robinson", 1503000),
    ("kentucky", "Brad White", 1750000),
    ("kentucky", "Vince Marrow", 1300000),
    ("lsu", "Blake Baker", 2500000),
    ("lsu", "Bo Davis", 1250000),
    ("mississippi-state", "Coleman Hutzler", 1000000),
    ("mississippi-state", "Cody Kennedy", 750000),
    ("missouri", "Kirby Moore", 1500000),
    ("missouri", "Corey Batoon", 1030000),
    ("oklahoma", "Seth Littrell", 1100000),
    ("oklahoma", "Bill Bedenbaugh", 1000000),
    ("ole-miss", "Pete Golding", 2150000),
    ("ole-miss", "Charlie Weis Jr.", 1650000),
    ("south-carolina", "Clayton White", 1200000),
    ("south-carolina", "Dowell Loggains", 1000000),
    ("tennessee", "Tim Banks", 1500000),
    ("tennessee", "Glen Elarbee", 900000),
    ("texas", "Pete Kwiatkowski", 1800000),
    ("texas", "Kyle Flood", 1375000),
    ("texas-am", "Collin Klein", 1600000),
    ("texas-am", "Jay Bateman", 1000000),
    ("illinois", "Barry Lunney Jr.", 1025000),
    ("illinois", "Aaron Henry", 725000),
    ("indiana", "Bryant Haines", 1175000),
    ("indiana", "Mike Shanahan", 800000),
    ("iowa", "Phil Parker", 1900000),
    ("iowa", "Tim Lester", 1100000),
    ("maryland", "Brian Williams", 1300000),
    ("maryland", "Josh Gattis", 950000),
    ("michigan", "Wink Martindale", 2300000),
    ("michigan", "Lou Esposito", 1286000),
    ("michigan-state", "Joe Rossi", 1500000),
    ("michigan-state", "Brian Lindgren", 1100000),
    ("minnesota", "Corey Hetherman", 850000),
    ("minnesota", "Brian Callahan", 600000),
    ("nebraska", "Tony White", 1600000),
    ("nebraska", "Marcus Satterfield", 1400000),
    ("ohio-state", "Jim Knowles", 2200000),
    ("ohio-state", "Chip Kelly", 2000000),
    ("oregon", "Tosh Lupoi", 1900000),
    ("oregon", "Will Stein", 1400000),
    ("purdue", "Graham Harrell", 950000),
    ("purdue", "Kevin Kane", 850000),
    ("rutgers", "Joe Harasymiak", 1500000),
    ("rutgers", "Kirk Ciarrocca", 1475000),
    ("ucla", "Ikaika Malloe", 1000000),
    ("ucla", "Juan Castillo", 605000),
    ("washington", "Brennan Carroll", 1300000),
    ("washington", "Steve Belichick", 1200000),
    ("wisconsin", "Phil Longo", 1250000),
    ("wisconsin", "Mike Tressel", 800000),
    ("clemson", "Garrett Riley", 1750000),
    ("clemson", "Wes Goodwin", 1400000),
    ("california", "Peter Sirmon", 950000),
    ("california", "Mike Bloesch", 850000),
    ("florida-state", "Adam Fuller", 2015000),
    ("florida-state", "Alex Atkins", 1265000),
    ("georgia-tech", "Buster Faulkner", 1000000),
    ("georgia-tech", "Chris Weinke", 700000),
    ("louisville", "Ron English", 800000),
    ("louisville", "Brian Brohm", 750000),
    ("nc-state", "Tony Gibson", 1500000),
    ("nc-state", "Robert Anae", 900000),
    ("north-carolina", "Geoff Collins", 1133000),
    ("north-carolina", "Chip Lindsey", 1090000),
    ("pittsburgh", "Randy Bates", 937944),
    ("virginia", "Des Kitchings", 925000),
    ("virginia", "John Rudzinski", 900000),
    ("virginia-tech", "Chris Marve", 875000),
    ("virginia-tech", "Tyler Bowen", 875000),
    ("wake-forest", "Warren Ruggiero", 1110585),
    ("wake-forest", "Brad Lambert", 839166),
    ("arizona", "Duane Akina", 785000),
    ("arizona-state", "Marcus Arroyo", 830000),
    ("arizona-state", "Brian Ward", 800000),
    ("colorado", "Pat Shurmur", 801000),
    ("colorado", "Robert Livingston", 800750),
    ("houston", "Shiel Wood", 750000),
    ("houston", "Kevin Barbay", 750000),
    ("iowa-state", "Jon Heacock", 1200000),
    ("iowa-state", "Taylor Mouser", 550000),
    ("kansas", "Jeff Grimes", 800000),
    ("kansas", "Brian Borland", 720000),
    ("kansas-state", "Joe Klanderman", 825000),
    ("kansas-state", "Conor Riley", 750000),
    ("oklahoma-state", "Kasey Dunn", 1000000),
    ("oklahoma-state", "Bryan Nardo", 700000),
    ("texas-tech", "Tim DeRuyter", 1050000),
    ("texas-tech", "Zach Kittley", 850000),
    ("ucf", "Addison Williams", 700000),
    ("ucf", "Darin Hinshaw", 600000),
    ("utah", "Andy Ludwig", 2050000),
    ("utah", "Morgan Scalley", 2000000),
    ("west-virginia", "Jordan Lesley", 775000),
    ("west-virginia", "Chad Scott", 700000),
    ("cincinnati", "Tyson Veidt", 750000),
    ("cincinnati", "Brad Glenn", 700000),
]

# USA TODAY "Assistant Coach Total Pay" staff-pool column (same Dec 2024 table)
POOLS = {
    "alabama": 9475000,
    "arkansas": 6190000,
    "auburn": 6475000,
    "florida": 6565000,
    "georgia": 10332000,
    "kentucky": 7565000,
    "lsu": 9300000,
    "mississippi-state": 5260000,
    "missouri": 6980000,
    "oklahoma": 7114999,
    "ole-miss": 8225000,
    "south-carolina": 6635000,
    "tennessee": 7135000,
    "texas": 9100000,
    "texas-am": 7200000,
    "illinois": 5325000,
    "indiana": 5935000,
    "iowa": 7900000,
    "maryland": 5475000,
    "michigan": 9384000,
    "michigan-state": 6975000,
    "minnesota": 4599000,
    "nebraska": 6775000,
    "ohio-state": 11425000,
    "oregon": 8225000,
    "purdue": 4965000,
    "rutgers": 5750000,
    "ucla": 4670000,
    "washington": 7200000,
    "wisconsin": 5375000,
    "clemson": 9675000,
    "california": 4375000,
    "florida-state": 8475000,
    "georgia-tech": 5120000,
    "louisville": 4765000,
    "nc-state": 6207205,
    "north-carolina": 7373858,
    "virginia": 4500000,
    "virginia-tech": 5435000,
    "wake-forest": 1949743,
    "arizona": 4200000,
    "arizona-state": 4675000,
    "colorado": 4588750,
    "houston": 3950000,
    "iowa-state": 4460000,
    "kansas": 4840000,
    "kansas-state": 4697000,
    "oklahoma-state": 6000000,
    "texas-tech": 5301190,
    "ucf": 4000000,
    "utah": 8275000,
    "west-virginia": 4225000,
    "cincinnati": 4390000,
}


def main() -> None:
    schools: dict = defaultdict(lambda: {"assistants": []})
    for sid, name, pay in ASSISTANTS:
        schools[sid]["assistants"].append(
            {
                "name": name,
                "role": TITLES.get((sid, name), "Football assistant"),
                "pay": pay,
            }
        )
    for sid, pool in POOLS.items():
        schools[sid]["pool"] = pool

    tape = {
        "contractYear": 2024,
        "asOf": "2024-12-18",
        "source": "USA TODAY Sports football assistant salary database",
        "url": "https://sportsdata.usatoday.com/ncaa/salaries/football/assistant",
        "notes": (
            "2024 contract-year total pay (as of Dec 18, 2024). "
            "Named assistants and the staff-total pool belong on staffByYear.2024 only. "
            "Not a current 2026 salary."
        ),
        "schools": {sid: schools[sid] for sid in sorted(schools)},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(tape, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {OUT} · {len(tape['schools'])} schools · {len(ASSISTANTS)} named assistants")


if __name__ == "__main__":
    main()
