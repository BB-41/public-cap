#!/usr/bin/env python3
"""Add coach contract terms + public staff pay to schools.json (both copies).

Football assistant dollars in ASSISTANTS / FB_ASST_POOL are the USA TODAY
2024 contract year (asOf 2024-12-18). Do not write them onto current `staff`
or staffByYear.2025/2026. Year-keyed ingest is scripts/ingest-staff-by-year.py
plus scripts/staff-usat/YYYY.json.
"""
import json
from copy import deepcopy
from pathlib import Path

ASOF = "2026-08"
ASOF_YEAR = 2026
USA_FB_ASST = "https://sportsdata.usatoday.com/ncaa/salaries/football/assistant"
USA_WBB = "https://sportsdata.usatoday.com/ncaa/salaries/womens-basketball/coach"
USA_FB = "https://sportsdata.usatoday.com/ncaa/salaries/football/coach"
USA_MBB = "https://sportsdata.usatoday.com/ncaa/salaries/mens-basketball/coach"

PENDING_TERM = {
    "confidence": "pending",
    "asOf": ASOF,
    "notes": "No public through-year on the desk yet. Not a guess.",
}

def term(through, source, url, confidence="reported", notes="", start_year=None, rolling=False, years=None, as_of=ASOF):
    t = {
        "confidence": confidence,
        "source": source,
        "url": url,
        "asOf": as_of,
    }
    if through:
        t["through"] = str(through)
        t["yearsRemaining"] = max(0, int(through) - ASOF_YEAR) if not rolling else (years or 0)
    if years is not None:
        t["yearsRemaining"] = years
    if start_year:
        t["startYear"] = start_year
    if rolling:
        t["rolling"] = True
    if notes:
        t["notes"] = notes
    return t

def pay(value, source, url, as_of, notes="", confidence="reported"):
    return {
        "value": int(value),
        "confidence": confidence,
        "source": source,
        "url": url,
        "asOf": as_of,
        "notes": notes,
    }

# --- FB / MBB contract terms (cited only) ---
FB_TERMS = {
    "alabama": term(2033, "Alabama Athletics", "https://rolltide.com/news/2026/4/22/football-head-coach-kalen-deboers-contract-extended-through-2033-season", notes="Board-approved extension through Jan. 31, 2033.", start_year=2024),
    "georgia": term(2033, "University of Georgia Athletics", "https://georgiadogs.com/news/2024/5/2/general-uga-athletics-board-approves-contract-extensions-for-josh-brooks-and-kirby-smart", notes="Athletics board: term extends to Dec. 31, 2033."),
    "kentucky": term(2031, "University of Kentucky employment agreement / Nov. 2022 extension notice", "https://legal.uky.edu/sites/default/files/2023-01/2022.11%20Stoops%2C%20Mark%20Orig%20thru%20Amend%206%20%28fixed%29%201.30.23.pdf", notes="Extension notice in the public contract packet: through June 2031."),
    "missouri": term(2029, "KOMU / Mizzou Athletics contract posting", "https://www.komu.com/sports/mizzouxtra/mizzou-extends-contract-for-drinkwitz/article_aa28f39a-47b7-41e1-bb3a-90f27611b546.html", notes="Extension keeps Drinkwitz through the 2029 season."),
    "oklahoma": term(2031, "University of Oklahoma Athletics", "https://soonersports.com/news/2026/8/20/football-venables-agrees-to-2-year-contract-extension", notes="Two-year add-on; six-year deal through the 2031 season."),
    "south-carolina": term(2030, "University of South Carolina Athletics", "https://gamecocksonline.com/news/2025/01/24/south-carolina-beamer-ink-contract-extension/", notes="Board-approved extension through the 2030 season."),
    "tennessee": term(2030, "University of Tennessee employment agreement amendment", "https://tennessee.edu/wp-content/uploads/2025/08/Josh-Heupel-Amendment-3-2025-30-v2.docx.pdf", notes="Amendment extends the term to Jan. 31, 2030 / June 30, 2030."),
    "texas": term(2031, "San Antonio Express-News (contract review)", "https://www.mysanantonio.com/sports/article/steve-sarkisian-texas-longhorns-salary-20826265.php", notes="Employed through Dec. 31, 2031 after the 2025 extension."),
    "texas-am": term(2031, "GigEm247 / open-records contract", "https://247sports.com/college/texas-am/longformarticle/texas-am-releases-contract-details-of-new-six-year-69-million-deal-for-aggie-coach-mike-elko-274610222/", notes="Six-year deal through the 2031 season; expires Jan. 31, 2032.", confidence="reported"),
    "illinois": term(2030, "University of Illinois Athletics", "https://fightingillini.com/news/2025/5/13/football-bielema-agrees-to-new-six-year-contract", notes="New six-year deal through the 2030 season (June 30, 2031)."),
    "indiana": term(2032, "247Sports (Indiana extension terms)", "https://247sports.com/college/indiana/article/indiana-football-where-curt-cignettis-new-contract-extension-ranks-among-college-football-head-coaches-239930365/", notes="Eight-year extension through the 2032 season.", confidence="estimated"),
    "minnesota": term(2030, "University of Minnesota Athletics", "https://gophersports.com/news/2025/7/9/football-fleck-signs-extension-now-under-contract-through-2030", notes="Extension through the 2030 season."),
    "nebraska": term(2032, "University of Nebraska Athletics", "https://huskers.com/news/2025/10/30/nebraska-announces-contract-extension-with-coach-matt-rhule", notes="Two-year add-on through the 2032 season."),
    "ohio-state": term(2031, "Columbus Dispatch / Ohio State trustees", "https://www.dispatch.com/story/news/education/2025/02/19/ryan-day-ohio-state-football-coach-salary-contract-extension/79201555007/", notes="Trustees: through the 2031 season, terminating Jan. 31, 2032."),
    "oregon": term(2030, "USA TODAY Sports Network (contract obtained)", "https://www.journalstandard.com/story/sports/ncaaf/bigten/2025/03/07/dan-lanning-contract-buyout-details-bonuses-oregon-football/81976220007/", notes="Six-year extension through the 2030 season (to Jan. 1, 2031). Public contract PDF on file."),
    "clemson": term(2031, "Associated Press", "https://apnews.com/article/college-football-sports-clemson-tigers-nick-saban-e7ae9cca16076df3de46d3ee738b3160", notes="Reworked 10-season deal through 2031."),
    "florida-state": term(2031, "CBS Sports (contract review)", "https://www.cbssports.com/college-football/news/mike-norvell-buyout-contract-florida-state-head-coach/", notes="Extension through the 2031 season."),
    "louisville": term(2033, "Associated Press", "https://www.seattlepi.com/sports/louisville-and-football-coach-jeff-brohm-agree-to-a22222385", notes="New deal through the 2033 season."),
    "nc-state": term(2029, "The News & Observer / Yahoo Sports", "https://sports.yahoo.com/article/nc-state-dave-doeren-dodges-203138265.html", notes="April 2024 extension through December 2029."),
    "north-carolina": term(2029, "Fox News / UNC-released contract", "https://www.foxnews.com/sports/bill-belichicks-north-carolina-contract-details-show-staggering-salary-interesting-clauses", notes="UNC-released deal continues through the end of 2029."),
    "pittsburgh": term(2030, "Yahoo Sports (citing March 2022 Pitt deal)", "https://sports.yahoo.com/article/pat-narduzzi-contract-explained-pitt-085001852.html", notes="2022 deal through the 2030 season; later amendments not on the desk.", confidence="estimated"),
    "colorado": term(2029, "University of Colorado Athletics / published contract", "https://cubuffs.com/news/2025/3/28/football-cu-boulder-extends-coach-primes-contract-through-2029", notes="Amended agreement through Dec. 31, 2029."),
    "arizona-state": term(2030, "Arizona Sports / Arizona Board of Regents", "https://arizonasports.com/ncaa/arizona-state/arizona-state-football/kenny-dillingham-contract", notes="ABOR-approved extension through 2030, with rollover triggers that can add years."),
    "iowa-state": term(2032, "Iowa State Athletics", "https://cyclones.com/news/2024/12/11/football-campbells-contract-extended-to-2032", notes="Eight-year deal through Dec. 31, 2032."),
    "notre-dame": term(2030, "Yahoo Sports / Notre Dame official", "https://sports.yahoo.com/marcus-freeman-agrees-multiyear-extension-012718036.html", notes="Dec. 2024 extension through the 2030 season. Later 2025 enhancement did not publish a new through-year."),
    "washington": term(2030, "Associated Press", "https://apnews.com/article/washington-coach-fisch-97a6954dff8c5df52bf3557bd3332d41", notes="Hired Jan. 2024 on a seven-year deal (2024–2030). Later extension not on the desk.", confidence="estimated", start_year=2024),
    "miami": term(2031, "Miami Herald", "https://www.miamiherald.com/sports/college/acc/university-of-miami/article316752980.html", notes="Original 10-year deal ran through 2031. Aug. 2026 multiyear extension added years that were not disclosed.", confidence="estimated"),
}

MBB_TERMS = {
    "alabama": term(2032, "Sports Illustrated (Alabama board terms)", "https://www.si.com/college/alabama/basketball/details-for-nate-oats-historic-contract-extension-revealed", notes="Six-year extension through the 2031-32 season / March 2032."),
    "arkansas": term(2029, "Arkansas Razorbacks", "https://arkansasrazorbacks.com/hall-of-fame-coach-john-calipari-to-lead-razorback-basketball/", notes="Five-year deal through April 30, 2029; up to two NCAA-appearance rollovers."),
    "florida": term(2031, "Associated Press", "https://apnews.com/article/todd-golden-florida-contract-extension-5505738ac4b71203b7c147537894f4c6", notes="Six-year extension through the 2030-31 season."),
    "kentucky": term(2030, "Lexington Herald-Leader / UK employment agreement", "https://www.kentucky.com/sports/college/kentucky-sports/uk-basketball-men/article315126837.html", notes="Original PDF term through March 31, 2029; 2024-25 Elite Eight triggered the Sweet 16 auto-year through 2029-30."),
    "tennessee": term(2028, "University of Tennessee employment agreement", "https://tennessee.edu/wp-content/uploads/2025/08/Employment-Agreement_Rick-Barnes_2025-28.pdf", notes="Initial term May 1, 2018 through April 15, 2028; then auto-extends to keep three years remaining (lifetime structure).", rolling=True, years=3),
    "oregon": term(2028, "The Oregonian / public UO contract (2016-28)", "https://www.oregonlive.com/ducks/2022/08/oregon-mens-basketball-coach-dana-altman-to-receive-1-year-contract-extension-through-2027-28-season.html", notes="Board-approved extension through the 2027-28 season. Public contract PDF on file."),
    "illinois": term(2032, "University of Illinois Athletics", "https://fightingillini.com/news/2026/5/14/mens-basketball-underwood-set-for-latest-contract-amendment", notes="Existing six-year deal through June 30, 2032; performance add-ons can reach 2036."),
    "kansas": term(None, "University of Kansas employment agreement / Sporting News", "https://lawrencekstimes.com/wp-content/uploads/2021/04/20210402-Self-contract.pdf", notes="Lifetime five-year rolling term; a year is added on each anniversary.", rolling=True, years=5),
    "houston": term(2029, "University of Houston Athletics / Houston Chronicle", "https://uhcougars.com/news/2025/5/21/mens-basketball-kelvin-sampson-agrees-to-four-year-contract-extension", notes="Four-year deal through the 2028-29 season."),
    "iowa-state": term(2036, "Iowa State Athletics", "https://cyclones.com/news/2026/4/29/mens-basketball-otzelberger-agrees-to-10-year-contract-extension", notes="Ten-year extension through June 30, 2036."),
    "ole-miss": term(2031, "Northeast Mississippi Daily Journal (term sheet)", "https://cdispatch.com/sports/college-sports/here-are-the-details-of-chris-beards-new-deal-with-ole-miss/", notes="Six-year deal ending in 2031."),
    "texas": term(2031, "Houston Chronicle / UT System Board of Regents", "https://www.houstonchronicle.com/sports/college/longhorns/article/sean-miller-ut-contract-20317138.php", notes="Six-year, $31.8M deal through the 2031 season."),
    "michigan-state": term(None, "ESPN / Michigan State Board of Trustees", "https://www.espn.com/mens-college-basketball/story/_/id/47286976/michigan-state-tom-izzo-gets-1-million-raise-highest-paid-coach-big-ten", notes="Five-year contract that automatically renews annually (lifetime/rollover).", rolling=True, years=5),
    "arizona": term(2031, "Arizona Daily Star / Arizona Board of Regents", "https://tucson.com/sports/arizonawildcats/basketball/article_f00e3ce0-7b45-484a-9bf8-fe9acfd0ac13.html", notes="Five-year deal approved April 2026; through the 2030-31 season.", confidence="estimated"),
}

# --- Athletic directors (cited current pay only; skip superseded names) ---
ADS = {
    "texas": {"name": "Chris Del Conte", "pay": pay(2900000, "Sportsnaut (university-disclosed extension)", "https://sportsnaut.com/college-football/highest-paid-athletic-directors", "2026", "2026 base $2.9M; 2025 was $2.8M. Extension through 2036.")},
    "tennessee": {"name": "Danny White", "pay": pay(2750000, "USA TODAY / Knox News", "https://www.usatoday.com/story/sports/college/2025/07/01/danny-white-highest-paid-athletic-director-tennessee-vols/84435230007/", "2025-07-01", "Base $2.75M for 2024-25. Bonuses pushed total pay to $3.35M that year.")},
    "michigan": {"name": "Warde Manuel", "pay": pay(2400000, "Sportsnaut (Dec. 2024 Michigan deal)", "https://sportsnaut.com/college-football/highest-paid-athletic-directors", "2025", "Estimated ~$2.4M per year on the deal through summer 2030; some pay is deferred.", confidence="estimated")},
    "texas-am": {"name": "Trev Alberts", "pay": pay(2200000, "Sportsnaut (2024 A&M contract)", "https://sportsnaut.com/college-football/highest-paid-athletic-directors", "2025", "Average annual base $2.2M on the five-year deal.")},
    "florida": {"name": "Scott Stricklin", "pay": pay(2075000, "Sportsnaut / ESPN (2025 extension)", "https://sportsnaut.com/college-football/highest-paid-athletic-directors", "2025", "$250k raise from $1.8M on the 2025 extension.")},
    "alabama": {"name": "Greg Byrne", "pay": pay(2025000, "Sportsnaut (Alabama board, March 2024 deal)", "https://sportsnaut.com/college-football/highest-paid-athletic-directors", "2026", "Base $2.025M beginning summer 2026 ($1.955M in 2025).")},
    "ohio-state": {"name": "Ross Bjork", "pay": pay(2000000, "Sportsnaut / Columbus Dispatch (2024 hire)", "https://sportsnaut.com/college-football/highest-paid-athletic-directors", "2025", "$1.65M base + $350k media/PR; five-year deal through 2029.")},
    "texas-tech": {"name": "Kirby Hocutt", "pay": pay(1639000, "Sportsnaut (2022 extension)", "https://sportsnaut.com/college-football/highest-paid-athletic-directors", "2025", "Average annual $1.639M; deal through 2030.")},
    "illinois": {"name": "Josh Whitman", "pay": pay(1500000, "Sportsnaut (2023 Illinois extension)", "https://sportsnaut.com/college-football/highest-paid-athletic-directors", "2025", "$1.5M now; scheduled $1.725M in 2028. Deal can run through 2031.")},
}

# --- Other head coaches (WBB + a few cited Olympic-sport) ---
WBB_2026 = {
    "south-carolina": ("Dawn Staley", 4250000, "USA TODAY Sports (Staley contract)", "https://www.usatoday.com/story/sports/ncaaw/2026/04/09/south-carolina-dawn-staley-salary-womens-basketball-coaches/89496486007/", "2026-04-09", "2025-26 compensation; five-year deal signed March 2025, +$250k/yr through 2030."),
    "lsu": ("Kim Mulkey", 3350000, "USA TODAY Sports / Daily Advertiser", "https://www.thetowntalk.com/story/sports/college/lsu/2026/04/10/kim-mulkey-contract-salary-lsu-womens-basketball-2025-26-season/89556160007/", "2026-04-10", "2025-26 compensation from the contract USA TODAY obtained."),
    "texas": ("Vic Schaefer", 2300000, "USA TODAY Sports", "https://www.usatoday.com/story/sports/ncaaw/2026/04/09/south-carolina-dawn-staley-salary-womens-basketball-coaches/89496486007/", "2026-04-09", "2025-26 annual compensation as cited in the Staley ranking story."),
    "maryland": ("Brenda Frese", 2000000, "USA TODAY Sports", "https://www.usatoday.com/story/sports/ncaaw/2026/04/09/south-carolina-dawn-staley-salary-womens-basketball-coaches/89496486007/", "2026-04-09", "Story says more than $2 million; stored as the $2M floor.", "estimated"),
}

# Last full USA TODAY WBB table (2023-24). Skip chairs known to have turned over.
WBB_2024 = {
    "louisville": ("Jeff Walz", 1754000),
    "texas-am": ("Joni Taylor", 1500000),
    "indiana": ("Teri Moren", 1250000),
    "arizona": ("Adia Barnes", 1200000),
    "illinois": ("Shauna Green", 1104000),
    "oregon": ("Kelly Graves", 1075000),
    "ohio-state": ("Kevin McGuff", 1040000),
    "ole-miss": ("Yolett McPhee-McCuin", 1035000),
    "nc-state": ("Wes Moore", 1026324),
    "michigan-state": ("Robyn Fralick", 1000000),
    "georgia": ("Katie Abrahamson-Henderson", 977000),
    "north-carolina": ("Courtney Banghart", 950000),
    "michigan": ("Kim Barnes Arico", 893500),
    "virginia-tech": ("Kenny Brooks", 890000),
    "iowa-state": ("Bill Fennelly", 850000),
    "oklahoma": ("Jennie Baranczyk", 800000),
    "minnesota": ("Dawn Plitzuweit", 800000),
    "ucla": ("Cori Close", 774722),
    "rutgers": ("Coquese Washington", 750000),
    "colorado": ("JR Payne", 730000),
    "virginia": ("Amaka Agugua-Hamilton", 725000),
    "nebraska": ("Amy Williams", 715000),
    "utah": ("Lynne Roberts", 709500),
    "arkansas": ("Mike Neighbors", 700000),
    "florida": ("Kelly Rae Finley", 700000),
    "washington": ("Tina Langley", 675000),
    "kansas-state": ("Jeff Mittie", 670000),
    "mississippi-state": ("Sam Purcell", 662500),
    "wisconsin": ("Marisa Moseley", 658000),
    "ucf": ("Sytia Messer", 650000),
    "missouri": ("Robin Pingeton", 650000),
    "oklahoma-state": ("Jacie Hoyt", 650000),
    "arizona-state": ("Natasha Adair", 650000),
    "purdue": ("Katie Gearlds", 585000),
    "west-virginia": ("Mark Kellogg", 575000),
    "auburn": ("Johnnie Harris", 568750),
    "alabama": ("Kristy Curry", 562356),
    "texas-tech": ("Krista Gerlich", 560100),
    "kansas": ("Brandon Schneider", 540000),
    "california": ("Charmin Smith", 530400),
    "florida-state": ("Brooke Wyckoff", 525000),
    "cincinnati": ("Katrina Merriweather", 510000),
    "clemson": ("Amanda Butler", 478000),
    "houston": ("Ronald Hughey", 330000),
}

# Softballs with a 2025 USA TODAY Network story
OTHER_SPORTS = {
    "florida": [("softball", "Tim Walton", 396855, "USA TODAY Network / RGJ (SEC softball salaries)", "https://rgj.com/story/sports/college/softball/2025/05/07/sec-softball-coach-salary-patty-gasso-karen-weekly-tim-walton-patrick-murphy/83479673007/", "2025-05-07", "Current annual salary; deal through June 30, 2029.")],
    "oklahoma": [("softball", "Patty Gasso", 1700000, "USA TODAY Network / RGJ (SEC softball salaries)", "https://rgj.com/story/sports/college/softball/2025/05/07/sec-softball-coach-salary-patty-gasso-karen-weekly-tim-walton-patrick-murphy/83479673007/", "2025-05-07", "Base $300k + $400k supplemental retirement + $200k stay + $1.0M outside income (2025 step).", "estimated")],
    "tennessee": [("softball", "Karen Weekly", 540000, "USA TODAY Network / RGJ (SEC softball salaries)", "https://rgj.com/story/sports/college/softball/2025/05/07/sec-softball-coach-salary-patty-gasso-karen-weekly-tim-walton-patrick-murphy/83479673007/", "2025-05-07", "2025 season compensation; deal through June 30, 2029.")],
}

# Top cited FB assistants per school (USA TODAY Dec 18, 2024). Titles only when Football Scoop named them.
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

# (school, name, pay) — highest cited public assistants, USA TODAY 2024
ASSISTANTS = [
    ("alabama", "Kane Wommack", 1550000), ("alabama", "Nick Sheridan", 1350000),
    ("arkansas", "Bobby Petrino", 1500000), ("arkansas", "Travis Williams", 1175000),
    ("auburn", "DJ Durkin", 1200000), ("auburn", "Charles Kelly", 875000),
    ("florida", "Austin Armstrong", 1201500), ("florida", "Rob Sale", 1001500),
    ("georgia", "Glenn Schumann", 2003000), ("georgia", "Travaris Robinson", 1503000),
    ("kentucky", "Brad White", 1750000), ("kentucky", "Vince Marrow", 1300000),
    ("lsu", "Blake Baker", 2500000), ("lsu", "Bo Davis", 1250000),
    ("mississippi-state", "Coleman Hutzler", 1000000), ("mississippi-state", "Cody Kennedy", 750000),
    ("missouri", "Kirby Moore", 1500000), ("missouri", "Corey Batoon", 1030000),
    ("oklahoma", "Seth Littrell", 1100000), ("oklahoma", "Bill Bedenbaugh", 1000000),
    ("ole-miss", "Pete Golding", 2150000), ("ole-miss", "Charlie Weis Jr.", 1650000),
    ("south-carolina", "Clayton White", 1200000), ("south-carolina", "Dowell Loggains", 1000000),
    ("tennessee", "Tim Banks", 1500000), ("tennessee", "Glen Elarbee", 900000),
    ("texas", "Pete Kwiatkowski", 1800000), ("texas", "Kyle Flood", 1375000),
    ("texas-am", "Collin Klein", 1600000), ("texas-am", "Jay Bateman", 1000000),
    ("illinois", "Barry Lunney Jr.", 1025000), ("illinois", "Aaron Henry", 725000),
    ("indiana", "Bryant Haines", 1175000), ("indiana", "Mike Shanahan", 800000),
    ("iowa", "Phil Parker", 1900000), ("iowa", "Tim Lester", 1100000),
    ("maryland", "Brian Williams", 1300000), ("maryland", "Josh Gattis", 950000),
    ("michigan", "Wink Martindale", 2300000), ("michigan", "Lou Esposito", 1286000),
    ("michigan-state", "Joe Rossi", 1500000), ("michigan-state", "Brian Lindgren", 1100000),
    ("minnesota", "Corey Hetherman", 850000), ("minnesota", "Brian Callahan", 600000),
    ("nebraska", "Tony White", 1600000), ("nebraska", "Marcus Satterfield", 1400000),
    ("ohio-state", "Jim Knowles", 2200000), ("ohio-state", "Chip Kelly", 2000000),
    ("oregon", "Tosh Lupoi", 1900000), ("oregon", "Will Stein", 1400000),
    ("purdue", "Graham Harrell", 950000), ("purdue", "Kevin Kane", 850000),
    ("rutgers", "Joe Harasymiak", 1500000), ("rutgers", "Kirk Ciarrocca", 1475000),
    ("ucla", "Ikaika Malloe", 1000000), ("ucla", "Juan Castillo", 605000),
    ("washington", "Brennan Carroll", 1300000), ("washington", "Steve Belichick", 1200000),
    ("wisconsin", "Phil Longo", 1250000), ("wisconsin", "Mike Tressel", 800000),
    ("clemson", "Garrett Riley", 1750000), ("clemson", "Wes Goodwin", 1400000),
    ("california", "Peter Sirmon", 950000), ("california", "Mike Bloesch", 850000),
    ("florida-state", "Adam Fuller", 2015000), ("florida-state", "Alex Atkins", 1265000),
    ("georgia-tech", "Buster Faulkner", 1000000), ("georgia-tech", "Chris Weinke", 700000),
    ("louisville", "Ron English", 800000), ("louisville", "Brian Brohm", 750000),
    ("nc-state", "Tony Gibson", 1500000), ("nc-state", "Robert Anae", 900000),
    ("north-carolina", "Geoff Collins", 1133000), ("north-carolina", "Chip Lindsey", 1090000),
    ("pittsburgh", "Randy Bates", 937944),
    ("virginia", "Des Kitchings", 925000), ("virginia", "John Rudzinski", 900000),
    ("virginia-tech", "Chris Marve", 875000), ("virginia-tech", "Tyler Bowen", 875000),
    ("wake-forest", "Warren Ruggiero", 1110585), ("wake-forest", "Brad Lambert", 839166),
    ("arizona", "Duane Akina", 785000),
    ("arizona-state", "Marcus Arroyo", 830000), ("arizona-state", "Brian Ward", 800000),
    ("colorado", "Pat Shurmur", 801000), ("colorado", "Robert Livingston", 800750),
    ("houston", "Shiel Wood", 750000), ("houston", "Kevin Barbay", 750000),
    ("iowa-state", "Jon Heacock", 1200000), ("iowa-state", "Taylor Mouser", 550000),
    ("kansas", "Jeff Grimes", 800000), ("kansas", "Brian Borland", 720000),
    ("kansas-state", "Joe Klanderman", 825000), ("kansas-state", "Conor Riley", 750000),
    ("oklahoma-state", "Kasey Dunn", 1000000), ("oklahoma-state", "Bryan Nardo", 700000),
    ("texas-tech", "Tim DeRuyter", 1050000), ("texas-tech", "Zach Kittley", 850000),
    ("ucf", "Addison Williams", 700000), ("ucf", "Darin Hinshaw", 600000),
    ("utah", "Andy Ludwig", 2050000), ("utah", "Morgan Scalley", 2000000),
    ("west-virginia", "Jordan Lesley", 775000), ("west-virginia", "Chad Scott", 700000),
    ("cincinnati", "Tyson Veidt", 750000), ("cincinnati", "Brad Glenn", 700000),
]

# USA TODAY "Assistant Coach Total Pay" staff-pool column (same Dec 2024 table)
FB_ASST_POOL = {
    "alabama": 9475000, "arkansas": 6190000, "auburn": 6475000, "florida": 6565000,
    "georgia": 10332000, "kentucky": 7565000, "lsu": 9300000, "mississippi-state": 5260000,
    "missouri": 6980000, "oklahoma": 7114999, "ole-miss": 8225000, "south-carolina": 6635000,
    "tennessee": 7135000, "texas": 9100000, "texas-am": 7200000, "illinois": 5325000,
    "indiana": 5935000, "iowa": 7900000, "maryland": 5475000, "michigan": 9384000,
    "michigan-state": 6975000, "minnesota": 4599000, "nebraska": 6775000, "ohio-state": 11425000,
    "oregon": 8225000, "purdue": 4965000, "rutgers": 5750000, "ucla": 4670000,
    "washington": 7200000, "wisconsin": 5375000, "clemson": 9675000, "california": 4375000,
    "florida-state": 8475000, "georgia-tech": 5120000, "louisville": 4765000, "nc-state": 6207205,
    "north-carolina": 7373858, "virginia": 4500000, "virginia-tech": 5435000, "wake-forest": 1949743,
    "arizona": 4200000, "arizona-state": 4675000, "colorado": 4588750, "houston": 3950000,
    "iowa-state": 4460000, "kansas": 4840000, "kansas-state": 4697000, "oklahoma-state": 6000000,
    "texas-tech": 5301190, "ucf": 4000000, "utah": 8275000, "west-virginia": 4225000,
    "cincinnati": 4390000,
}

def build_staff(sid):
    staff = {
        "athleticDirector": ADS.get(sid) or {
            "confidence": "pending",
            "asOf": ASOF,
            "notes": "No current public AD pay on the desk. Private-school and unreleased chairs stay blank.",
        },
        "office": [],
        "otherHeadCoaches": [],
        "assistants": [],
    }
    if sid in WBB_2026:
        name, val, src, url, asof, notes, *rest = WBB_2026[sid]
        conf = rest[0] if rest else "reported"
        staff["otherHeadCoaches"].append({
            "name": name, "sport": "WBB",
            "pay": pay(val, src, url, asof, notes, conf),
        })
    elif sid in WBB_2024:
        name, val = WBB_2024[sid]
        staff["otherHeadCoaches"].append({
            "name": name, "sport": "WBB",
            "pay": pay(val, "USA TODAY Sports women's basketball salary database", USA_WBB, "2024-03-13",
                       "Last full published USA TODAY WBB table (2023-24 contract year). Confirm the chair before treating as current."),
        })
    for row in OTHER_SPORTS.get(sid, []):
        sport, name, val, src, url, asof, notes, *rest = row
        conf = rest[0] if rest else "reported"
        staff["otherHeadCoaches"].append({
            "name": name, "sport": sport,
            "pay": pay(val, src, url, asof, notes, conf),
        })
    # Football assistant dollars belong on staffByYear.2024 via
    # scripts/ingest-staff-by-year.py / staff-usat/2024.json. Do not attach
    # the 2024 USA TODAY table to current staff (that is the 2026 directory).
    return staff

def main():
    src = Path("/workspace/public-cap/data/schools.json")
    data = json.loads(src.read_text())
    fb_found = mbb_found = 0
    ad_n = asst_n = other_n = 0
    for s in data["schools"]:
        sid = s["id"]
        fb = s["coaches"]["football"]
        mbb = s["coaches"]["mbb"]
        if sid in FB_TERMS:
            fb["term"] = FB_TERMS[sid]
            fb_found += 1
        else:
            fb["term"] = deepcopy(PENDING_TERM)
        if sid in MBB_TERMS:
            mbb["term"] = MBB_TERMS[sid]
            mbb_found += 1
        else:
            mbb["term"] = deepcopy(PENDING_TERM)
        staff = build_staff(sid)
        s["staff"] = staff
        if staff["athleticDirector"].get("pay"):
            ad_n += 1
        asst_n += len(staff["assistants"])
        other_n += len(staff["otherHeadCoaches"])
    data["meta"]["version"] = "1.2.0"
    data["meta"]["asOf"] = "2026-08-24"
    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    src.write_text(text)
    Path("/workspace/public-cap/public/data/schools.json").write_text(text)
    print(f"FB terms found {fb_found} pending {68-fb_found}")
    print(f"MBB terms found {mbb_found} pending {68-mbb_found}")
    print(f"AD rows {ad_n}")
    print(f"assistant rows {asst_n}")
    print(f"other-coach rows {other_n}")

if __name__ == "__main__":
    main()
