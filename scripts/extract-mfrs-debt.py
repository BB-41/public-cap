#!/usr/bin/env python3
"""Download hosted FY2025 MFRS/AUP PDFs and print athletics debt lines.

Does not write desk data. Review the printed table, then book only cited cells.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pymupdf

ROOT = Path("/tmp/mfrs-debt")
ROOT.mkdir(parents=True, exist_ok=True)

PDFS = {
    "georgia": "https://georgiadogs.com/documents/download/2026/1/15/2025_NCAA_Financial_Report.pdf",
    "tennessee": "https://utsports.com/documents/download/2026/1/15/FY25_NCAA_AUP.pdf",
    "oregon": "https://goducks.com/documents/download/2026/1/13/University_of_Oregon_NCAA_FRS_FY2025_FINAL.pdf",
    "utah": "https://utahutes.com/documents/download/2026/1/21/FY25_NCAA_Revenue_and_Expense_Report.pdf",
    "north-carolina": "https://goheels.com/documents/download/2026/2/3/NCAAMembershipFinancialReport2025.pdf",
    "illinois": "https://fightingillini.com/documents/download/2026/1/29/FY25_IL_NCAA_Full_Report__Revised_1-22-26_.pdf",
    "minnesota": "https://gophersports.com/documents/download/2026/1/20/Minnesota_FY25_NCAA_Online_Report_-_FINAL_01.14.26.pdf",
    "washington": "https://gohuskies.com/documents/download/2026/1/17/FY25_NCAA_FINAL.pdf",
    "wisconsin": "https://uwbadgers.com/documents/download/2026/1/16/Final_FY25_NCAA_Report.pdf",
    "iowa-state": "https://cyclones.com/documents/download/2026/1/16/NCAA_Financial_Report_-_FY25_-_FINAL.pdf",
    "virginia": "https://stuffsomerssays.com/wp-content/uploads/2026/03/NCAA_MFRS_Submission_FY25.pdf",
    "ole-miss": "https://olemisssports.com/documents/download/2026/1/15/NCAAReport_FY25.pdf",
    "ohio-state": "https://news.osu.edu/download/c91b5f24-f009-4455-81eb-4b89b108f1bc/fy25ncaamembershipreportfinal.pdf",
    "florida-state": "https://s3.documentcloud.org/documents/26597309/fsu-ncaa-financial-report-fy25.pdf",
    "kansas": "https://kuathletics.com/documents/download/2026/1/15/FY_24-25_NCAA_Final_Report.pdf",
    "arkansas": "https://arkansasrazorbacks.com/pdf/athletics/ncaa-membership/2024-25.pdf",
    "south-carolina": "https://sc.edu/about/offices_and_divisions/controller/documents/usc_columbia_ncaa_aup_report_2025.pdf",
    "colorado": "https://content.leg.colorado.gov/sites/default/files/documents/audits/2505F-B_university_of_colorado_boulder_ncaa_aup_fy25.pdf",
    "florida": "https://floridagators.com/documents/download/2025/9/22/UAA_Financial_Statements_2024_2025.pdf",
}

MONEY = r"\$?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)"


def fetch(url: str, dest: Path) -> bool:
    import urllib.request

    if dest.exists() and dest.stat().st_size > 1000:
        return True
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "PublicCapDesk/1.0 (athletics-debt extraction; +https://thepubliccap.com)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            dest.write_bytes(r.read())
        return True
    except Exception as exc:
        print(f"FAIL {dest.stem}: {exc}", file=sys.stderr)
        return False


def parse_money(s: str) -> int | None:
    if not s:
        return None
    clean = s.replace("$", "").replace(",", "").strip()
    if clean in {"-", "—", ""}:
        return 0
    try:
        return int(round(float(clean)))
    except ValueError:
        return None


def extract(text: str) -> dict:
    out = {}
    # Standard MFRS "Other Reporting Items" dump
    m = re.search(r"52\s*[-–.]\s*Total Athletics Related Debt:\s*" + MONEY, text, re.I)
    if m:
        out["outstanding"] = parse_money(m.group(1))
    m = re.search(r"53\s*[-–.]\s*Total Institutional Debt:\s*" + MONEY, text, re.I)
    if m:
        out["institutional"] = parse_money(m.group(1))
    m = re.search(
        r"34\s*\|\s*Athletic Facilities Debt Service, Leases and Rental Fee\s*\|\s*" + MONEY,
        text,
        re.I,
    )
    if m:
        out["debtService"] = parse_money(m.group(1))
    if "debtService" not in out:
        m = re.search(
            r"Athletic Facilities Debt Service, Leases and Rental Fee[^\n]{0,80}" + MONEY,
            text,
            re.I,
        )
        if m:
            out["debtService"] = parse_money(m.group(1))
    if "outstanding" not in out:
        m = re.search(
            r"Total Athletics\s*-?\s*Related Debt(?:\s*\(Principal Balance\))?\s*" + MONEY,
            text,
            re.I,
        )
        if m:
            out["outstanding"] = parse_money(m.group(1))
    if "outstanding" not in out:
        m = re.search(
            r"total amount outstanding as of June 30, 2025, was\s*" + MONEY,
            text,
            re.I,
        )
        if m:
            out["outstanding"] = parse_money(m.group(1))
    return out


def main():
    rows = []
    for sid, url in PDFS.items():
        dest = ROOT / f"{sid}.pdf"
        ok = fetch(url, dest)
        rec = {"id": sid, "url": url, "ok": ok}
        if ok:
            try:
                doc = pymupdf.open(dest)
                text = "\n".join(page.get_text() for page in doc)
                rec.update(extract(text))
                rec["pages"] = doc.page_count
                rec["chars"] = len(text)
            except Exception as exc:
                rec["error"] = str(exc)
        rows.append(rec)
        print(
            f"{sid:16} out={rec.get('outstanding')} svc={rec.get('debtService')} inst={rec.get('institutional')} pages={rec.get('pages')} err={rec.get('error')}"
        )
    print("\nJSON")
    import json

    print(json.dumps(rows, indent=2))


if __name__ == "__main__":
    main()
