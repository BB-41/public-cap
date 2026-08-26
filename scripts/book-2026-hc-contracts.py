#!/usr/bin/env python3
"""Book 2026 HC pay/contracts from hosted PDFs or articles that quote the EA.

Does not invent buyout stairs from a newspaper percent paraphrase.
Campbell step tape is file math from the Penn State term sheet (100% remaining
guaranteed compensation). Fitzgerald 72.5% stays a rule, not minted dollars.
"""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHAIR_NOTE = "Chair of record who started football 2026 (Wikipedia season-page infobox)."


def src(label, url):
    return {"label": label, "url": url}


def step(through, amount, rule, label, url, confidence="reported"):
    return {
        "through": through,
        "amount": amount,
        "rule": rule,
        "confidence": confidence,
        "source": src(label, url),
    }


# --- source URLs ---
ARK = "https://www.swtimes.com/story/sports/college/sec/2025/12/01/arkansas-football-coach-ryan-silverfield-salary-bonuses-buyouts/87557612007/"
OM = "https://www.clarionledger.com/story/sports/college/ole-miss/2026/07/01/pete-golding-contract-salary-ole-miss-football-coach/90754060007/"
OM_TS = "https://www.hottytoddy.com/2025/12/11/how-much-will-new-ole-miss-coach-pete-golding-and-assistants-make/"
MICH = "https://www.freep.com/story/sports/college/university-michigan/wolverines/2026/01/23/kyle-whittingham-contract-michigan-football/88318877007/"
MSU_PDF = "https://www.wlns.com/wp-content/uploads/sites/50/2025/12/Fitzgerald-terms-sheet.pdf"
MSU_ART = "https://statenews.com/article/2025/12/inside-pat-fitzgeralds-30-million-contract-and-incentives"
UMN_FEB = "https://regents.umn.edu/sites/regents.umn.edu/files/2026-02/docket-fin-feb2026-v2.pdf"
UMN_JUL = "https://regents.umn.edu/sites/regents.umn.edu/files/2025-07/docket-bor-july2025.pdf"
PSU = "https://gopsusports.com/documents/2eb86a0c-2980-40cf-b0df-7cc2f56e13f7.pdf"
UCLA = "https://sports.yahoo.com/articles/contract-details-revealed-ucla-got-035156125.html"
KSU = "https://www.cjonline.com/story/sports/college/cat-zone/2025/12/10/collin-klein-contract-kansas-state-football-salary-buyout-bonuses-chris-klieman/87702201007/"
OSU = "https://www.usatoday.com/story/sports/college/cowboys/2025/12/12/eric-morris-contract-salary-buyout-details-oklahoma-state-football-coach/87726037007/"
UTAH = "https://www.deseret.com/sports/2026/03/20/morgan-scalley-utah-football-coach-contract-details/"

CAMPBELL_GUARANTEED = [
    ("2026", 8_000_000, "2026-12-31"),
    ("2027", 8_250_000, "2027-12-31"),
    ("2028", 8_500_000, "2028-12-31"),
    ("2029", 9_000_000, "2029-12-31"),
    ("2030", 9_000_000, "2030-12-31"),
    ("2031", 9_250_000, "2031-12-31"),
    ("2032", 9_250_000, "2032-12-31"),
    ("2033", 9_250_000, "2033-12-31"),
]
CAMPBELL_REMAINING = []
run = 0
for period, val, through in reversed(CAMPBELL_GUARANTEED):
    run += val
    CAMPBELL_REMAINING.append((through, run, period, val))
CAMPBELL_REMAINING.reverse()


def year_term(wiki_url, through, years_remaining, extra):
    return {
        "confidence": "reported",
        "asOf": "2026-08",
        "source": "Wikipedia season-page infobox",
        "url": wiki_url,
        "through": through,
        "yearsRemaining": years_remaining,
        "notes": f"{CHAIR_NOTE} {extra}",
    }


def article_term(source, url, through, years_remaining, notes, as_of="2026-08"):
    return {
        "confidence": "reported",
        "source": source,
        "url": url,
        "asOf": as_of,
        "through": through,
        "yearsRemaining": years_remaining,
        "notes": notes,
    }


def pending_buyout(source, url, notes, rule=None, coach_side=None):
    out = {
        "value": None,
        "confidence": "pending",
        "source": source,
        "url": url,
        "asOf": None,
        "notes": notes,
    }
    if rule:
        out["rule"] = rule
    if coach_side:
        out["coachSide"] = coach_side
    return out


BOOK = {
    "arkansas": {
        "wiki": "https://en.wikipedia.org/wiki/2026_Arkansas_Razorbacks_football_team",
        "through": "2030",
        "years": 4,
        "term_extra": "Five-year term sheet through Dec. 31, 2030. School-side without-cause is 70% of remaining annual compensation.",
        "current_term": article_term(
            "Southwest Times Record (Dec. 1, 2025), quoting Silverfield term sheet via open records",
            ARK,
            "2030",
            4,
            "Through Dec. 31, 2030 on the cited term sheet. School-side without-cause is 70% of remaining annual compensation, including scheduled increases.",
            "2025-12-01",
        ),
        "pay": {
            "value": 6_500_000,
            "year": 2026,
            "confidence": "reported",
            "source": "Southwest Times Record (Dec. 1, 2025), quoting Silverfield term sheet via open records",
            "url": ARK,
            "asOf": "2025-12-01",
            "notes": "Annual salary $350,000 + other annual compensation $6.15 million in 2026. Other compensation rises $100,000 each year through 2030. No current-chair PDF URL on this desk — article quotes the FOIA term sheet. Pittman’s USA TODAY cell is not reused.",
            "breakdown": [
                {"label": "Annual salary", "value": 350_000},
                {"label": "Other annual compensation (2026)", "value": 6_150_000},
            ],
            "schedule": [
                {"period": "2026", "value": 6_500_000},
                {"period": "2027", "value": 6_600_000},
                {"period": "2028", "value": 6_700_000},
                {"period": "2029", "value": 6_800_000},
                {"period": "2030", "value": 6_900_000},
            ],
            "incentives": [
                {
                    "label": "CFP / SEC / bowl ladder",
                    "notes": "Article lists bowl, CFP, and SEC bonuses. Not included in annual pay.",
                }
            ],
            "baseOnly": None,
        },
        "buyout": pending_buyout(
            "Southwest Times Record (Dec. 1, 2025), quoting Silverfield term sheet via open records",
            ARK,
            "70% of remaining annual compensation, including scheduled increases — we do not invent the remainder. Pittman’s paid buyout lives on the tape.",
            "70% of remaining annual compensation, including scheduled increases, through Dec. 31, 2030 (article quoting term sheet).",
            "Coach-side LD if Silverfield walks: $10M on or before Dec. 31, 2026; $7.5M / $5M / $2.5M / $1.25M on the later Dec. 31 windows through 2030.",
        ),
        "contract": {
            "label": "Southwest Times Record / UA released term sheet (Dec. 1, 2025)",
            "url": ARK,
        },
        "buyout_book": {
            "tape": "pending",
            "termThrough": "2030-12-31",
            "steps": [],
            "rule": "If Arkansas terminates without cause: 70% of remaining annual compensation, including scheduled increases, through Dec. 31, 2030. No public current-dollar overhang / staircase is on this desk; we will not multiply 70% × remaining years ourselves.",
            "notes": "Prior-coach (Pittman) USA TODAY cell is not reused; that money is a paid-buyout. Current chair pay is from the Southwest Times Record story quoting the FOIA term sheet. Formal long-form EA was still in process when the term sheet posted.",
            "mitigation": {
                "rule": "Duty to seek comparable football-coaching employment; Arkansas may offset future compensation. We do not invent a dollar offset.",
                "source": src(
                    "Southwest Times Record (Dec. 1, 2025), quoting Silverfield term sheet via open records",
                    ARK,
                ),
            },
            "buyoutRule": "70% of remaining annual compensation, including scheduled increases, through Dec. 31, 2030 (article quoting term sheet).",
            "coachSide": "Coach-side LD if Silverfield walks: $10M on or before Dec. 31, 2026; then $7.5 / $5 / $2.5 / $1.25 million on later Dec. 31 windows through 2030.",
        },
        "tape": {
            "id": "arkansas-contract-silverfield-2025-12-01",
            "date": "2025-12-01",
            "school": "arkansas",
            "schoolName": "Arkansas",
            "kind": "contract",
            "headline": "Southwest Times Record publishes Ryan Silverfield’s FOIA term sheet: $6.5 million in 2026, 70% school-side remaining-pay rule, term through Dec. 31, 2030.",
            "figure": 6_500_000,
            "confidence": "reported",
            "source": src(
                "Southwest Times Record — Silverfield term sheet via open records",
                ARK,
            ),
            "field": "coaches.football.term",
        },
    },
    "ole-miss": {
        "wiki": "https://en.wikipedia.org/wiki/2026_Ole_Miss_Rebels_football_team",
        "through": "2030",
        "years": 4,
        "term_extra": "Five-year term sheet through 2030. School-side without-cause is 75% of remaining OMAF annual compensation.",
        "current_term": article_term(
            "Clarion Ledger / Daily Journal, quoting Golding term sheet with the Ole Miss Athletic Foundation",
            OM,
            "2030",
            4,
            "Five-year term through 2030. School-side without-cause is 75% of remaining OMAF annual compensation.",
            "2026-07-01",
        ),
        "pay": {
            "value": 6_800_000,
            "year": 2026,
            "confidence": "reported",
            "source": "Clarion Ledger / Daily Journal, quoting Golding term sheet with the Ole Miss Athletic Foundation",
            "url": OM,
            "asOf": "2026-07-01",
            "notes": "Year 1 OMAF annual compensation $6.8 million, rising $100,000 each Dec. 31 through $7.2 million in 2030. No current-chair PDF URL on this desk — article quotes the term sheet. Kiffin’s USA TODAY cell is not reused.",
            "breakdown": [{"label": "OMAF annual compensation (Year 1)", "value": 6_800_000}],
            "schedule": [
                {"period": "Year 1 (2026)", "value": 6_800_000},
                {"period": "Year 2 (2027)", "value": 6_900_000},
                {"period": "Year 3 (2028)", "value": 7_000_000},
                {"period": "Year 4 (2029)", "value": 7_100_000},
                {"period": "Year 5 (2030)", "value": 7_200_000},
            ],
            "incentives": [
                {
                    "label": "SEC / CFP / coach-of-year ladder",
                    "notes": "Article lists SEC-win, championship, and coach-of-year bonuses. Not included in annual pay.",
                }
            ],
            "baseOnly": None,
        },
        "buyout": pending_buyout(
            "Clarion Ledger / Daily Journal, quoting Golding term sheet with the Ole Miss Athletic Foundation",
            OM,
            "75% of remaining OMAF annual compensation through the unexpired term — we do not invent the remainder. Kiffin’s paid buyout lives on the tape.",
            "75% of remaining OMAF annual compensation through the otherwise unexpired term (article quoting term sheet).",
        ),
        "contract": {
            "label": "Clarion Ledger / Daily Journal — Golding OMAF term sheet",
            "url": OM,
        },
        "buyout_book": {
            "tape": "pending",
            "termThrough": "2030-12-31",
            "steps": [],
            "rule": "If the Ole Miss Athletic Foundation terminates without cause: 75% of remaining OMAF annual compensation through the otherwise unexpired term. No public current-dollar overhang / staircase is on this desk; we will not multiply 75% × remaining years ourselves.",
            "notes": "Prior-coach (Kiffin) USA TODAY cell is not reused. Current chair pay is from the Clarion Ledger / Daily Journal stories quoting the OMAF term sheet. No PDF URL on this desk.",
            "mitigation": None,
            "buyoutRule": "75% of remaining OMAF annual compensation through the otherwise unexpired term (article quoting term sheet).",
        },
        "tape": {
            "id": "ole-miss-contract-golding-2026-07-01",
            "date": "2026-07-01",
            "school": "ole-miss",
            "schoolName": "Ole Miss",
            "kind": "contract",
            "headline": "Clarion Ledger publishes Pete Golding’s OMAF term-sheet terms: $6.8 million in Year 1, 75% school-side remaining-pay rule, five years through 2030.",
            "figure": 6_800_000,
            "confidence": "reported",
            "source": src("Clarion Ledger — Golding OMAF term sheet", OM),
            "field": "coaches.football.term",
        },
    },
    "michigan": {
        "wiki": "https://en.wikipedia.org/wiki/2026_Michigan_Wolverines_football_team",
        "through": "2031",
        "years": 5,
        "term_extra": "Five-year MOU through Jan. 31, 2031. School-side without-cause is 75% of remaining base salary.",
        "current_term": article_term(
            "Detroit Free Press (Jan. 23, 2026), quoting Whittingham memorandum of understanding via FOIA",
            MICH,
            "2031",
            5,
            "Five-year MOU dated Dec. 26, 2025, through Jan. 31, 2031. School-side without-cause is 75% of remaining base salary.",
            "2026-01-23",
        ),
        "pay": {
            "value": 8_000_000,
            "year": 2026,
            "confidence": "reported",
            "source": "Detroit Free Press (Jan. 23, 2026), quoting Whittingham memorandum of understanding via FOIA",
            "url": MICH,
            "asOf": "2026-01-23",
            "notes": "Base salary $8.0 million in 2026, rising $100,000 per year to $8.4 million. Discretionary signing bonus up to $2.3 million is not in this cell. No current-chair PDF URL on this desk — article quotes the FOIA MOU. Moore’s USA TODAY cell is not reused.",
            "breakdown": [{"label": "Base (2026)", "value": 8_000_000}],
            "schedule": [
                {"period": "2026", "value": 8_000_000},
                {"period": "2027", "value": 8_100_000},
                {"period": "2028", "value": 8_200_000},
                {"period": "2029", "value": 8_300_000},
                {"period": "2030", "value": 8_400_000, "notes": "Final year of the five-year MOU (through Jan. 31, 2031)."},
            ],
            "incentives": [
                {
                    "label": "Performance / academic bonuses",
                    "notes": "Article lists Big Ten / CFP / coach-of-year and an APR discretionary bonus. Not included in annual pay.",
                }
            ],
            "baseOnly": None,
        },
        "buyout": pending_buyout(
            "Detroit Free Press (Jan. 23, 2026), quoting Whittingham memorandum of understanding via FOIA",
            MICH,
            "75% of remaining base salary if fired without cause before Jan. 31, 2031 — we do not invent the remainder. Moore’s for-cause firing is a $0 paid-buyout on the tape.",
            "75% of remaining base salary through Jan. 31, 2031 (article quoting MOU).",
            "Coach-side LD if Whittingham walks: $5 million before Feb. 1, 2027, then down $1 million each Feb. 1.",
        ),
        "contract": {
            "label": "Detroit Free Press / U-M released memorandum of understanding (Jan. 23, 2026)",
            "url": MICH,
        },
        "buyout_book": {
            "tape": "pending",
            "termThrough": "2031-01-31",
            "steps": [],
            "rule": "If Michigan terminates without cause: 75% of remaining base salary through Jan. 31, 2031. No public current-dollar overhang / staircase is on this desk; we will not multiply 75% × remaining years ourselves.",
            "notes": "Prior-coach (Moore) USA TODAY cell is not reused; that firing was for cause ($0). Current chair pay is from the Free Press story quoting the Dec. 26, 2025 MOU.",
            "mitigation": None,
            "buyoutRule": "75% of remaining base salary through Jan. 31, 2031 (article quoting MOU).",
            "coachSide": "Coach-side LD if Whittingham walks: $5 million before Feb. 1, 2027, then down $1 million each Feb. 1.",
        },
        "tape": {
            "id": "michigan-contract-whittingham-2026-01-23",
            "date": "2026-01-23",
            "school": "michigan",
            "schoolName": "Michigan",
            "kind": "contract",
            "headline": "Detroit Free Press publishes Kyle Whittingham’s FOIA memorandum of understanding: $8.0 million base in 2026, 75% school-side remaining-pay rule, term through Jan. 31, 2031.",
            "figure": 8_000_000,
            "confidence": "reported",
            "source": src("Detroit Free Press — Whittingham MOU via FOIA", MICH),
            "field": "coaches.football.term",
        },
    },
    "michigan-state": {
        "wiki": "https://en.wikipedia.org/wiki/2026_Michigan_State_Spartans_football_team",
        "through": "2031",
        "years": 5,
        "term_extra": "Five-year terms sheet through Jan. 31, 2031. School-side without-cause is 72.5% of remaining Annual Compensation.",
        "current_term": article_term(
            "Michigan State Head Football Coach Terms Sheet (Dec. 1, 2025) via WLNS",
            MSU_PDF,
            "2031",
            5,
            "Five-year terms sheet effective Dec. 1, 2025 through Jan. 31, 2031. First contract year is Dec. 1, 2025 – Jan. 31, 2027. School-side without-cause is 72.5% of remaining Annual Compensation.",
            "2025-12-01",
        ),
        "pay": {
            "value": 5_000_000,
            "year": 2026,
            "confidence": "reported",
            "source": "Michigan State Head Football Coach Terms Sheet (Dec. 1, 2025) via WLNS",
            "url": MSU_PDF,
            "asOf": "2025-12-01",
            "notes": "YR1 (2026) Annual Compensation = Base $4,000,000 + Supplemental $1,000,000, annualized Dec. 1, 2025 – Jan. 31, 2027. Seven-win seasons in the first three years auto-extend one year at +$500,000. Incentives not included.",
            "breakdown": [
                {"label": "Base", "value": 4_000_000},
                {"label": "Supplemental (YR1)", "value": 1_000_000},
            ],
            "schedule": [
                {"period": "YR1 (Dec 1, 2025 – Jan 31, 2027)", "value": 5_000_000, "notes": "Base $4.0M + supplemental $1.0M annualized"},
                {"period": "YR2 (Feb 1, 2027 – Jan 31, 2028)", "value": 5_500_000},
                {"period": "YR3 (Feb 1, 2028 – Jan 31, 2029)", "value": 6_000_000},
                {"period": "YR4 (Feb 1, 2029 – Jan 31, 2030)", "value": 6_500_000},
                {"period": "YR5 (Feb 1, 2030 – Jan 31, 2031)", "value": 7_000_000},
            ],
            "incentives": [
                {
                    "label": "Regular-season win bonuses (cumulative)",
                    "notes": "File: $500k at 6 / 7 / 8+ regular-season wins. Not included in Annual Compensation.",
                }
            ],
            "baseOnly": None,
        },
        "buyout": pending_buyout(
            "Michigan State Head Football Coach Terms Sheet (Dec. 1, 2025) via WLNS",
            MSU_PDF,
            "72.5% of remaining Annual Compensation, paid monthly through the unexpired term — we do not invent the remainder. Smith’s paid-buyout lives on the tape.",
            "72.5% of remaining Annual Compensation, paid monthly through Jan. 31, 2031. Subject to mitigate/offset.",
            "Coach-side LD starts at $6.5 million in 2026 and decreases annually to $1 million in 2030 (State News / MLive quoting the terms sheet; PDF coach-side table was not fully extractable).",
        ),
        "contract": {
            "label": "Michigan State Head Football Coach Terms Sheet (Dec. 1, 2025) via WLNS",
            "url": MSU_PDF,
            "files": [
                {
                    "kind": "term-sheet",
                    "date": "2025-12-01",
                    "label": "Head Football Coach Terms Sheet (Dec. 1, 2025)",
                    "url": MSU_PDF,
                }
            ],
        },
        "buyout_book": {
            "tape": "pending",
            "termThrough": "2031-01-31",
            "steps": [],
            "rule": "If Michigan State terminates without cause: 72.5% of remaining Annual Compensation, paid in equal monthly installments through the otherwise unexpired term (through Jan. 31, 2031). The file publishes the compensation table and the percent; it does not publish a dollar staircase. Dollar pending — we will not invent 72.5% × remaining years.",
            "notes": "Prior-coach (Smith) USA TODAY cell is not reused; that money is a paid-buyout. Binding terms sheet pending a long-form EA.",
            "mitigation": {
                "rule": "Duty to mitigate; university may offset post-termination gross income from intercollegiate or professional football (coaching, media, or administration) for the remaining term.",
                "source": src("Michigan State Head Football Coach Terms Sheet (Dec. 1, 2025) via WLNS", MSU_PDF),
            },
            "buyoutRule": "72.5% of remaining Annual Compensation, paid monthly through Jan. 31, 2031. Subject to mitigate/offset.",
            "coachSide": "Coach-side LD starts at $6.5 million in 2026 and decreases annually to $1 million in 2030 (State News / MLive quoting the terms sheet).",
        },
        "tape": {
            "id": "michigan-state-contract-fitzgerald-2025-12-01",
            "date": "2025-12-01",
            "school": "michigan-state",
            "schoolName": "Michigan State",
            "kind": "contract",
            "headline": "WLNS hosts Pat Fitzgerald’s MSU terms sheet. $5.0 million annualized in 2026 (Base $4.0M + Supplemental $1.0M). School-side without-cause is 72.5% of remaining Annual Compensation through Jan. 31, 2031. No published dollar calendar.",
            "figure": 5_000_000,
            "confidence": "reported",
            "source": src("Michigan State Fitzgerald terms sheet via WLNS", MSU_PDF),
            "field": "coaches.football.term",
        },
    },
    "minnesota": {
        "wiki": "https://en.wikipedia.org/wiki/2026_Minnesota_Golden_Gophers_football_team",
        "through": "2030",
        "years": 4,
        "term_extra": "Term through Dec. 31, 2030. School-side without-cause is 70% of remaining base + supplemental + retention (July 2025 docket). Feb. 2026 finance docket adds the $700,000 management bonus.",
        "current_term": article_term(
            "U. of Minnesota Regents finance docket (Feb. 2026) — Fleck new EA",
            UMN_FEB,
            "2030",
            4,
            "Term through Dec. 31, 2030. School-side without-cause is 70% of remaining base + supplemental + retention, quoted from the July 9, 2025 docket. Feb. 2026 docket is the current pay packet.",
            "2026-02",
        ),
        "pay": {
            "value": 7_900_000,
            "year": 2026,
            "confidence": "reported",
            "source": "U. of Minnesota Regents finance docket (Feb. 2026) — Fleck new EA",
            "url": UMN_FEB,
            "asOf": "2026-02",
            "notes": "Docket: with the $700,000 management bonus, current annual salary increases to $7,900,000. That bonus is inside this cell; other incentives are not.",
            "breakdown": [
                {"label": "Annual salary including management bonus", "value": 7_900_000}
            ],
            "schedule": None,
            "incentives": [
                {
                    "label": "Big Ten regular-season win bonuses",
                    "notes": "Non-cumulative $150k / $300k / $750k. Not in annual pay.",
                },
                {
                    "label": "CFP national championship",
                    "value": 1_500_000,
                    "notes": "Top of the restated CFP ladder. Not in annual pay.",
                },
            ],
            "baseOnly": None,
        },
        "buyout": pending_buyout(
            "U. of Minnesota Regents docket (July 9, 2025)",
            UMN_JUL,
            "70% of remaining base + supplemental + retention — we do not invent the remainder. The Feb. 2026 docket does not publish a dollar calendar.",
            "70% of remaining base + supplemental + retention (July 2025 docket).",
        ),
        "contract": {
            "label": "U. of Minnesota Regents finance docket (Feb. 2026) — Fleck new EA",
            "url": UMN_FEB,
            "files": [
                {
                    "kind": "board-packet",
                    "date": "2025-07-09",
                    "label": "July 2025 Regents docket (70% quote)",
                    "url": UMN_JUL,
                },
                {
                    "kind": "board-packet",
                    "date": "2026-02",
                    "label": "Feb. 2026 finance docket (new EA packet)",
                    "url": UMN_FEB,
                },
            ],
        },
        "buyout_book": None,  # already booked; only sync schools
        "tape": {
            "id": "minnesota-contract-fleck-pay-2026-02",
            "date": "2026-02",
            "school": "minnesota",
            "schoolName": "Minnesota",
            "kind": "contract",
            "headline": "Minnesota Regents finance docket books P. J. Fleck’s 2026 annual salary at $7.9 million after a $700,000 management bonus. School-side without-cause remains 70% of remaining base + supplemental + retention. No published dollar calendar.",
            "figure": 7_900_000,
            "confidence": "reported",
            "source": src("U. of Minnesota Regents finance docket (Feb. 2026)", UMN_FEB),
            "field": "coaches.football.pay",
        },
    },
    "penn-state": {
        "wiki": "https://en.wikipedia.org/wiki/2026_Penn_State_Nittany_Lions_football_team",
        "through": "2033",
        "years": 7,
        "term_extra": "Eight-year term sheet commencing Dec. 8, 2025 through 2033. School-side without-cause is 100% of remaining Guaranteed Compensation (base + supplemental), subject to mitigation.",
        "current_term": article_term(
            "Penn State — Matt Campbell Head Coach Term Sheet (Dec. 8, 2025)",
            PSU,
            "2033",
            7,
            "Eight years commencing Dec. 8, 2025. School-side without-cause is 100% of remaining Guaranteed Compensation (base + supplemental), subject to Coach’s mitigation. Retention bonus is not in that line.",
            "2025-12-08",
        ),
        "pay": {
            "value": 8_000_000,
            "year": 2026,
            "confidence": "reported",
            "source": "Penn State — Matt Campbell Head Coach Term Sheet (Dec. 8, 2025)",
            "url": PSU,
            "asOf": "2025-12-08",
            "notes": "2026 Guaranteed Compensation $8,000,000 (base + supplemental). The $1,000,000 per-contract-year retention bonus is not in this cell. Franklin’s USA TODAY cell is not reused.",
            "breakdown": [{"label": "Guaranteed compensation (base + supplemental)", "value": 8_000_000}],
            "schedule": [
                {"period": period, "value": val} for period, val, _ in CAMPBELL_GUARANTEED
            ],
            "incentives": [
                {
                    "label": "Retention bonus",
                    "value": 1_000_000,
                    "notes": "Per contract year. Not in Guaranteed Compensation and not in this cell.",
                },
                {
                    "label": "CFP / Big Ten / academic bonuses",
                    "notes": "File lists highest-in-category CFP, Big Ten, coach-of-year, GPA, and GSR bonuses. Not included in annual pay.",
                },
            ],
            "baseOnly": None,
        },
        "buyout": {
            "value": 70_500_000,
            "confidence": "reported",
            "source": "Penn State — Matt Campbell Head Coach Term Sheet (Dec. 8, 2025) — 100% of remaining 2026–2033 Guaranteed Compensation",
            "url": PSU,
            "asOf": "2026-01-01",
            "notes": "PDF-math at the start of 2026 (full remaining years of the Guaranteed Compensation table). Retention bonus is not in this line. Franklin’s paid buyout lives on the tape. Liability/overhang, not annual spend.",
            "rule": "100% of remaining Guaranteed Compensation (base + supplemental), subject to Coach’s mitigation.",
            "coachSide": "Coach-side LD: $10M (2026), $8M (2027), $6M (2028), $4M (2029), $2M (2030), then $1M (2031–2033).",
        },
        "contract": {
            "label": "Penn State — Matt Campbell Head Coach Term Sheet (Dec. 8, 2025)",
            "url": PSU,
            "files": [
                {
                    "kind": "term-sheet",
                    "date": "2025-12-08",
                    "label": "Head Coach Term Sheet (Dec. 8, 2025)",
                    "url": PSU,
                }
            ],
        },
        "buyout_book": {
            "tape": "steps",
            "termThrough": "2033-12-31",
            "steps": [
                step(
                    through,
                    remaining,
                    (
                        f"If Penn State terminates without cause in {year}: 100% of remaining Guaranteed Compensation "
                        f"({year}–2033). File table is $8.0 / $8.25 / $8.5 / $9.0 / $9.0 / $9.25 / $9.25 / $9.25 million. "
                        f"Remaining sum = ${remaining:,}. Full remaining years at the start of {year} — the file allows "
                        f"mitigation/offset; this desk does not mint a mid-year dollar. Retention bonus is not in Guaranteed Compensation."
                    ),
                    "Penn State — Matt Campbell Head Coach Term Sheet (Dec. 8, 2025)",
                    PSU,
                )
                for through, remaining, year, _val in CAMPBELL_REMAINING
            ],
            "rule": "University without-cause: 100% of remaining Guaranteed Compensation (base + supplemental) from the term-sheet year table, subject to Coach’s mitigation. Start-of-2026 remaining sum is $70,500,000. Retention bonus is not in that line.",
            "notes": "Term sheet commencing Dec. 8, 2025. Guaranteed Compensation is base + supplemental. 100% remaining, subject to mitigation. Calendar years, not Saturdays. Franklin’s paid buyout lives on the tape.",
            "mitigation": {
                "rule": "100% remaining Guaranteed Compensation is subject to Coach’s mitigation. The file does not publish a dollar offset table. We do not invent one.",
                "source": src("Penn State — Matt Campbell Head Coach Term Sheet (Dec. 8, 2025)", PSU),
            },
            "buyoutRule": "100% of remaining Guaranteed Compensation (base + supplemental), subject to Coach’s mitigation.",
            "coachSide": "Coach-side LD: $10M (2026), $8M (2027), $6M (2028), $4M (2029), $2M (2030), then $1M (2031–2033).",
        },
        "tape": {
            "id": "penn-state-contract-campbell-2025-12-08",
            "date": "2025-12-08",
            "school": "penn-state",
            "schoolName": "Penn State",
            "kind": "contract",
            "headline": "Penn State posts Matt Campbell’s Head Coach Term Sheet. 2026 Guaranteed Compensation is $8,000,000. School-side without-cause is 100% of remaining Guaranteed Compensation (2026–2033 table = $70.5 million at the start of 2026), subject to mitigation.",
            "figure": 70_500_000,
            "confidence": "reported",
            "source": src("Penn State Campbell term sheet", PSU),
            "field": "coaches.football.term",
        },
    },
    "ucla": {
        "wiki": "https://en.wikipedia.org/wiki/2026_UCLA_Bruins_football_team",
        "through": "2030",
        "years": 4,
        "term_extra": "Five-year contract through 2030. School-side without-cause is 75% of remaining base salary and talent fee.",
        "current_term": article_term(
            "Yahoo Sports / California Post (Jan. 29, 2026), quoting Chesney employment agreement",
            UCLA,
            "2030",
            4,
            "Five-year contract. School-side without-cause is 75% of remaining base salary and talent fee, subject to mitigation.",
            "2026-01-29",
        ),
        "pay": {
            "value": 5_400_000,
            "year": 2026,
            "confidence": "reported",
            "source": "Yahoo Sports / California Post (Jan. 29, 2026), quoting Chesney employment agreement",
            "url": UCLA,
            "asOf": "2026-01-29",
            "notes": "Year 1 base salary and talent fee $5.4 million, rising $100,000 per year to $5.8 million. One-time $3.7 million hiring bonus and $550,000 retention bonuses (first vesting Feb. 15, 2027) are not in this cell. No current-chair PDF URL on this desk — article quotes the contract. Foster’s USA TODAY cell is not reused.",
            "breakdown": [{"label": "Base + talent fee (Year 1)", "value": 5_400_000}],
            "schedule": [
                {"period": "Year 1 (2026)", "value": 5_400_000},
                {"period": "Year 2 (2027)", "value": 5_500_000},
                {"period": "Year 3 (2028)", "value": 5_600_000},
                {"period": "Year 4 (2029)", "value": 5_700_000},
                {"period": "Year 5 (2030)", "value": 5_800_000},
            ],
            "incentives": [
                {
                    "label": "Hiring bonus",
                    "value": 3_700_000,
                    "notes": "One-time. $2.65M on or before Feb. 2; balance on or before March 2. Not in annual pay.",
                },
                {
                    "label": "Retention bonus",
                    "value": 550_000,
                    "notes": "If still employed through Feb. 15, 2027 and each later Feb. 15. Not in this cell.",
                },
            ],
            "baseOnly": None,
        },
        "buyout": pending_buyout(
            "Yahoo Sports / California Post (Jan. 29, 2026), quoting Chesney employment agreement",
            UCLA,
            "75% of remaining base salary and talent fee — we do not invent the remainder. Foster’s paid buyout lives on the tape.",
            "75% of remaining base salary and talent fee, subject to mitigation (article quoting EA).",
            "Coach-side LD if Chesney walks: $8M on or before Dec. 21, 2026; then $5M / $3.5M / $2M / $1M on later Dec. 31 windows through 2030.",
        ),
        "contract": {
            "label": "Yahoo Sports / California Post — Chesney employment agreement (Jan. 29, 2026)",
            "url": UCLA,
        },
        "buyout_book": {
            "tape": "pending",
            "termThrough": "2030-12-31",
            "steps": [],
            "rule": "If UCLA terminates without cause: 75% of remaining base salary and talent fee. No public current-dollar overhang / staircase is on this desk; we will not multiply 75% × remaining years ourselves.",
            "notes": "Prior-coach (Foster) USA TODAY cell is not reused. Current chair pay is from the California Post story quoting the employment agreement. No PDF URL on this desk.",
            "mitigation": {
                "rule": "Mitigation clause requires Chesney to seek employment that would offset any buyout amount owed. We do not invent a dollar offset.",
                "source": src(
                    "Yahoo Sports / California Post (Jan. 29, 2026), quoting Chesney employment agreement",
                    UCLA,
                ),
            },
            "buyoutRule": "75% of remaining base salary and talent fee, subject to mitigation (article quoting EA).",
            "coachSide": "Coach-side LD if Chesney walks: $8M on or before Dec. 21, 2026; then $5 / $3.5 / $2 / $1 million on later Dec. 31 windows through 2030.",
        },
        "tape": {
            "id": "ucla-contract-chesney-2026-01-29",
            "date": "2026-01-29",
            "school": "ucla",
            "schoolName": "UCLA",
            "kind": "contract",
            "headline": "California Post / Yahoo Sports publish Bob Chesney employment-agreement terms: $5.4 million Year 1 base + talent fee, 75% school-side remaining-pay rule, five years through 2030.",
            "figure": 5_400_000,
            "confidence": "reported",
            "source": src("Yahoo Sports / California Post — Chesney EA", UCLA),
            "field": "coaches.football.term",
        },
    },
    "kansas-state": {
        "wiki": "https://en.wikipedia.org/wiki/2026_Kansas_State_Wildcats_football_team",
        "through": "2030",
        "years": 4,
        "term_extra": "Five-year deal through 2030. School-side without-cause is 75% of remaining unpaid base salary.",
        "current_term": article_term(
            "Topeka Capital-Journal (Dec. 10, 2025), quoting Klein employment agreement released by K-State",
            KSU,
            "2030",
            4,
            "Five-year deal through 2030, with up to two one-year extensions for six-win bowl seasons. School-side without-cause is 75% of remaining unpaid base salary.",
            "2025-12-10",
        ),
        "pay": {
            "value": 4_100_000,
            "year": 2026,
            "confidence": "reported",
            "source": "Topeka Capital-Journal (Dec. 10, 2025), quoting Klein employment agreement released by K-State",
            "url": KSU,
            "asOf": "2025-12-10",
            "notes": "2026 base salary $4.1 million, rising $100,000 per year to $4.5 million in 2030. No current-chair PDF URL on this desk — article quotes the athletics-released contract. Klieman’s USA TODAY cell is not reused.",
            "breakdown": [{"label": "Base (2026)", "value": 4_100_000}],
            "schedule": [
                {"period": "2026", "value": 4_100_000},
                {"period": "2027", "value": 4_200_000},
                {"period": "2028", "value": 4_300_000},
                {"period": "2029", "value": 4_400_000},
                {"period": "2030", "value": 4_500_000},
            ],
            "incentives": [
                {
                    "label": "Six-win bowl auto-extensions",
                    "notes": "Article: two possible added years at $4.6M / $4.7M. Not in the current term cell.",
                }
            ],
            "baseOnly": True,
        },
        "buyout": pending_buyout(
            "Topeka Capital-Journal (Dec. 10, 2025), quoting Klein employment agreement released by K-State",
            KSU,
            "75% of remaining unpaid base salary — we do not invent the remainder or reuse the article’s after-season dollar table. Klieman’s paid-buyout lives on the tape.",
            "75% of remaining unpaid base salary through the then-current term (article quoting EA).",
            "Coach-side LD if Klein walks: $5M before Dec. 31, 2026; then $4M / $3M / $2M / $1M on later windows through Dec. 1, 2030; $0 after Dec. 2, 2030.",
        ),
        "contract": {
            "label": "Topeka Capital-Journal / K-State released Klein employment agreement (Dec. 10, 2025)",
            "url": KSU,
        },
        "buyout_book": {
            "tape": "pending",
            "termThrough": "2030-12-31",
            "steps": [],
            "rule": "If Kansas State terminates without cause: 75% of remaining unpaid base salary through the then-current term. No public current-dollar overhang / staircase is on this desk; we will not multiply 75% × remaining years ourselves or book a newspaper after-season dollar table.",
            "notes": "Prior-coach (Klieman) USA TODAY cell is not reused. Current chair pay is from the Capital-Journal story quoting the athletics-released contract. No PDF URL on this desk.",
            "mitigation": {
                "rule": "Duty to seek other employment at market rate; K-State may adjust the amount owed. We do not invent a dollar offset.",
                "source": src(
                    "Topeka Capital-Journal (Dec. 10, 2025), quoting Klein employment agreement released by K-State",
                    KSU,
                ),
            },
            "buyoutRule": "75% of remaining unpaid base salary through the then-current term (article quoting EA).",
            "coachSide": "Coach-side LD if Klein walks: $5M before Dec. 31, 2026; then $4 / $3 / $2 / $1 million on later windows through Dec. 1, 2030; $0 after Dec. 2, 2030.",
        },
        "tape": {
            "id": "kansas-state-contract-klein-2025-12-10",
            "date": "2025-12-10",
            "school": "kansas-state",
            "schoolName": "Kansas State",
            "kind": "contract",
            "headline": "Topeka Capital-Journal publishes Collin Klein employment-agreement terms released by K-State: $4.1 million base in 2026, 75% school-side remaining-pay rule, term through 2030.",
            "figure": 4_100_000,
            "confidence": "reported",
            "source": src("Topeka Capital-Journal — Klein EA", KSU),
            "field": "coaches.football.term",
        },
    },
    "oklahoma-state": {
        "wiki": "https://en.wikipedia.org/wiki/2026_Oklahoma_State_Cowboys_football_team",
        "through": "2031",
        "years": 5,
        "term_extra": "Five-year contract through Jan. 31, 2031. School-side without-cause is 75% of remaining base if terminated before February 2029; a lower remaining-percent thereafter.",
        "current_term": article_term(
            "The Oklahoman (Dec. 12, 2025), quoting Morris employment agreement",
            OSU,
            "2031",
            5,
            "Five-year contract signed Nov. 24, 2025, through Jan. 31, 2031. School-side without-cause is 75% of remaining base if terminated before February 2029; a lower remaining-percent thereafter. We do not pick 60% vs 65% without the file.",
            "2025-12-12",
        ),
        "pay": {
            "value": 3_800_000,
            "year": 2026,
            "confidence": "reported",
            "source": "The Oklahoman (Dec. 12, 2025), quoting Morris employment agreement",
            "url": OSU,
            "asOf": "2025-12-12",
            "notes": "Base $3.8 million in the first season, with a $100,000 raise each Feb. 1 beginning 2027, through Jan. 31, 2031. No current-chair PDF URL on this desk — article quotes the employment agreement. Gundy’s USA TODAY cell is not reused.",
            "breakdown": [{"label": "Base (2026)", "value": 3_800_000}],
            "schedule": [
                {"period": "2026", "value": 3_800_000},
                {"period": "Feb 1, 2027 – Jan 31, 2028", "value": 3_900_000},
                {"period": "Feb 1, 2028 – Jan 31, 2029", "value": 4_000_000},
                {"period": "Feb 1, 2029 – Jan 31, 2030", "value": 4_100_000},
                {"period": "Feb 1, 2030 – Jan 31, 2031", "value": 4_200_000},
            ],
            "incentives": [
                {
                    "label": "Bowl / CFP ladder",
                    "notes": "Article lists a $150,000 bowl bonus up to $1 million for a national title. Not included in annual pay.",
                }
            ],
            "baseOnly": True,
        },
        "buyout": pending_buyout(
            "The Oklahoman (Dec. 12, 2025), quoting Morris employment agreement",
            OSU,
            "75% of remaining base if terminated before February 2029; a lower remaining-percent thereafter. We do not invent the remainder or pick 60% vs 65% without the file. Gundy’s paid buyout lives on the tape.",
            "75% of remaining base if terminated before February 2029; a lower remaining-percent thereafter (article quoting EA).",
            "Coach-side LD if Morris walks: $7M through Jan. 31, 2027; then $4M / $3M / $1M / $0 on later Feb. 1 windows.",
        ),
        "contract": {
            "label": "The Oklahoman — Morris employment agreement (Dec. 12, 2025)",
            "url": OSU,
        },
        "buyout_book": {
            "tape": "pending",
            "termThrough": "2031-01-31",
            "steps": [],
            "rule": "If Oklahoma State terminates without cause before February 2029: 75% of remaining base. A lower remaining-percent applies later in the term. Outlets disagree on whether that later figure is 60% or 65% — we will not pick one without the file, and we will not mint remaining-pay dollars.",
            "notes": "Prior-coach (Gundy) USA TODAY cell is not reused. Current chair pay is from The Oklahoman story quoting the employment agreement. No PDF URL on this desk.",
            "mitigation": None,
            "buyoutRule": "75% of remaining base if terminated before February 2029; a lower remaining-percent thereafter (article quoting EA).",
            "coachSide": "Coach-side LD if Morris walks: $7M through Jan. 31, 2027; then $4M / $3M / $1M / $0 on later Feb. 1 windows.",
        },
        "tape": {
            "id": "oklahoma-state-contract-morris-2025-12-12",
            "date": "2025-12-12",
            "school": "oklahoma-state",
            "schoolName": "Oklahoma State",
            "kind": "contract",
            "headline": "The Oklahoman publishes Eric Morris employment-agreement terms: $3.8 million base in 2026, 75% school-side remaining-pay rule before February 2029, term through Jan. 31, 2031.",
            "figure": 3_800_000,
            "confidence": "reported",
            "source": src("The Oklahoman — Morris EA", OSU),
            "field": "coaches.football.term",
        },
    },
    "utah": {
        "wiki": "https://en.wikipedia.org/wiki/2026_Utah_Utes_football_team",
        "through": "2030",
        "years": 4,
        "term_extra": "Five-year employment agreement through the 2030 season. School-side without-cause is 75% of remaining Base + Outfitter + MMR.",
        "current_term": article_term(
            "Deseret News (March 20, 2026), quoting Scalley employment agreement via public records",
            UTAH,
            "2030",
            4,
            "Five-year deal through the 2030 season. School-side without-cause is 75% of remaining Base Salary, Outfitter Payment, and MMR Payment.",
            "2026-03-20",
        ),
        "pay": {
            "value": 5_100_000,
            "year": 2026,
            "confidence": "reported",
            "source": "Deseret News (March 20, 2026), quoting Scalley employment agreement via public records",
            "url": UTAH,
            "asOf": "2026-03-20",
            "notes": "Total base compensation $5.1 million in Year 1: university base $3.6 million + JMI multimedia $1.0 million + Under Armour $500,000. Total rises $150,000 annually. No current-chair PDF URL on this desk — article quotes the FOIA employment agreement. Whittingham’s USA TODAY cell is not reused.",
            "breakdown": [
                {"label": "University base", "value": 3_600_000},
                {"label": "Multimedia rights (JMI)", "value": 1_000_000},
                {"label": "Outfitter (Under Armour)", "value": 500_000},
            ],
            "schedule": [
                {"period": "2026", "value": 5_100_000},
                {"period": "2027", "value": 5_250_000},
                {"period": "2028", "value": 5_400_000},
                {"period": "2029", "value": 5_550_000},
                {"period": "2030", "value": 5_700_000},
            ],
            "incentives": [
                {
                    "label": "Incentive-based compensation",
                    "notes": "Article: up to $1.5 million (conference, CFP, academic). Not included in annual pay.",
                }
            ],
            "baseOnly": None,
        },
        "buyout": pending_buyout(
            "Deseret News (March 20, 2026), quoting Scalley employment agreement via public records",
            UTAH,
            "75% of remaining Base + Outfitter + MMR for each year (or partial year, prorated) — we do not invent the remainder.",
            "75% of remaining Base Salary, Outfitter Payment, and MMR Payment through the remainder of the term (article quoting EA).",
        ),
        "contract": {
            "label": "Deseret News — Scalley employment agreement via public records (March 20, 2026)",
            "url": UTAH,
        },
        "buyout_book": {
            "tape": "pending",
            "termThrough": "2030-12-31",
            "steps": [],
            "rule": "If Utah terminates without cause: 75% of remaining Base Salary, Outfitter Payment, and MMR Payment for each year (or partial year on a prorated basis) through the remainder of the term. No public current-dollar overhang / staircase is on this desk; we will not multiply 75% × remaining years ourselves.",
            "notes": "Prior-coach (Whittingham) USA TODAY cell is not reused. Current chair pay is from the Deseret News story quoting the FOIA employment agreement. No PDF URL on this desk.",
            "mitigation": None,
            "buyoutRule": "75% of remaining Base Salary, Outfitter Payment, and MMR Payment through the remainder of the term (article quoting EA).",
        },
        "tape": {
            "id": "utah-contract-scalley-2026-03-20",
            "date": "2026-03-20",
            "school": "utah",
            "schoolName": "Utah",
            "kind": "contract",
            "headline": "Deseret News publishes Morgan Scalley’s FOIA employment agreement: $5.1 million Year 1 total base compensation, 75% school-side remaining-pay rule, term through the 2030 season.",
            "figure": 5_100_000,
            "confidence": "reported",
            "source": src("Deseret News — Scalley EA via public records", UTAH),
            "field": "coaches.football.term",
        },
    },
}


def apply_school(school, spec):
    name = school["coaches"]["football"]["name"]
    wiki = spec["wiki"]

    year_pay = deepcopy(spec["pay"])
    year_pay["notes"] = f"{CHAIR_NOTE} {spec['pay']['notes']}"

    year_fb = school["coachesByYear"]["2026"]["football"]
    year_fb["pay"] = year_pay
    year_fb["buyout"] = deepcopy(spec["buyout"])
    year_fb["term"] = year_term(wiki, spec["through"], spec["years"], spec["term_extra"])
    year_fb["contractUrl"] = spec["contract"]["url"]
    year_fb["contract"] = deepcopy(spec["contract"])

    current = school["coaches"]["football"]
    current["pay"] = deepcopy(spec["pay"])
    current["buyout"] = deepcopy(spec["buyout"])
    current["term"] = deepcopy(spec["current_term"])
    current["contractUrl"] = spec["contract"]["url"]
    current["contract"] = deepcopy(spec["contract"])
    current["name"] = name


def apply_buyout(coach, spec, name):
    book = spec.get("buyout_book")
    if not book:
        return
    coach["tape"] = book["tape"]
    coach["termThrough"] = book["termThrough"]
    coach["steps"] = book["steps"]
    if "overhang" in coach:
        del coach["overhang"]
    if book.get("rule"):
        coach["rule"] = book["rule"]
    elif "rule" in coach and book["tape"] == "steps":
        del coach["rule"]
    coach["notes"] = book["notes"]
    coach["mitigation"] = book.get("mitigation")
    coach["contract"] = deepcopy(spec["contract"])
    coach["pay"] = deepcopy(spec["pay"])
    coach["buyoutRule"] = book.get("buyoutRule")
    if book.get("coachSide"):
        coach["coachSide"] = book["coachSide"]
    elif "coachSide" in coach:
        del coach["coachSide"]
    coach["name"] = name


def main():
    schools_path = ROOT / "data" / "schools.json"
    buyouts_path = ROOT / "data" / "buyouts.json"
    tape_path = ROOT / "data" / "tape.json"

    schools = json.loads(schools_path.read_text())
    buyouts = json.loads(buyouts_path.read_text())
    tape = json.loads(tape_path.read_text())

    by_id = {s["id"]: s for s in schools["schools"]}
    for sid, spec in BOOK.items():
        school = by_id[sid]
        apply_school(school, spec)
        apply_buyout(buyouts["coaches"][sid], spec, school["coaches"]["football"]["name"])

    extra_sources = [
        "Penn State Campbell Head Coach Term Sheet (Dec. 8, 2025) via gopsusports.com — 100% remaining Guaranteed Compensation step tape",
        "Michigan State Fitzgerald terms sheet (Dec. 1, 2025) via WLNS",
        "Southwest Times Record (Dec. 1, 2025) — Silverfield term sheet via open records (pay/buyout rule; no PDF URL on desk)",
        "Clarion Ledger — Golding OMAF term sheet (pay/buyout rule; no PDF URL on desk)",
        "Detroit Free Press (Jan. 23, 2026) — Whittingham MOU via FOIA (pay/buyout rule; no PDF URL on desk)",
        "Yahoo Sports / California Post (Jan. 29, 2026) — Chesney EA (pay/buyout rule; no PDF URL on desk)",
        "Topeka Capital-Journal (Dec. 10, 2025) — Klein EA released by K-State (pay/buyout rule; no PDF URL on desk)",
        "The Oklahoman (Dec. 12, 2025) — Morris EA (pay/buyout rule; no PDF URL on desk)",
        "Deseret News (March 20, 2026) — Scalley EA via public records (pay/buyout rule; no PDF URL on desk)",
    ]
    for line in extra_sources:
        if line not in buyouts["meta"]["sources"]:
            buyouts["meta"]["sources"].append(line)

    existing_ids = {it["id"] for it in tape["items"]}
    new_items = [spec["tape"] for spec in BOOK.values() if spec["tape"]["id"] not in existing_ids]
    tape["items"] = new_items + tape["items"]
    tape["meta"]["itemCount"] = len(tape["items"])

    schools_path.write_text(json.dumps(schools, indent=2, ensure_ascii=False) + "\n")
    buyouts_path.write_text(json.dumps(buyouts, indent=2, ensure_ascii=True) + "\n")
    tape_path.write_text(json.dumps(tape, indent=2, ensure_ascii=True) + "\n")

    for name in ("schools.json", "buyouts.json", "tape.json"):
        src_p = ROOT / "data" / name
        dst = ROOT / "public" / "data" / name
        dst.write_text(src_p.read_text())

    # sanity
    assert buyouts["coaches"]["penn-state"]["tape"] == "steps"
    assert buyouts["coaches"]["penn-state"]["steps"][0]["amount"] == 70_500_000
    assert buyouts["coaches"]["penn-state"]["steps"][-1]["amount"] == 9_250_000
    assert buyouts["coaches"]["michigan-state"]["tape"] == "pending"
    assert by_id["minnesota"]["coaches"]["football"]["pay"]["value"] == 7_900_000
    assert by_id["minnesota"]["coachesByYear"]["2026"]["football"]["pay"]["value"] == 7_900_000
    print("booked", ", ".join(BOOK))


if __name__ == "__main__":
    main()
