#!/usr/bin/env python3
"""Download the current FDA AI-Enabled Medical Device List CSV and build tracker data.

Uses only the Python standard library so it can run locally or in GitHub Actions.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen

FDA_PAGE = (
    "https://www.fda.gov/medical-devices/artificial-intelligence-enabled-medical-devices/"
    "list-artificial-intelligence-enabled-medical-devices"
)
FALLBACK_CSV = "https://www.fda.gov/media/178541/download?attachment="
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
CSV_OUT = DATA_DIR / "fda-ai-enabled-medical-devices.csv"
JSON_OUT = DATA_DIR / "fda-ai-summary.json"
USER_AGENT = "AI2Practice-FDA-Tracker/1.0 (+https://github.com/UM-IHC-CA2i/ai2practice)"


class CsvLinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.current_href: str | None = None
        self.current_text: list[str] = []
        self.csv_href: str | None = None

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            self.current_href = dict(attrs).get("href")
            self.current_text = []

    def handle_data(self, data):
        if self.current_href is not None:
            self.current_text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self.current_href is not None:
            text = " ".join("".join(self.current_text).split()).lower()
            if "download a csv file" in text or ("csv" in text and "download" in text):
                self.csv_href = self.current_href
            self.current_href = None
            self.current_text = []


def fetch_bytes(url: str) -> tuple[bytes, str]:
    req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with urlopen(req, timeout=60) as resp:
        return resp.read(), resp.geturl()


def discover_csv_url() -> str:
    html_bytes, final_page = fetch_bytes(FDA_PAGE)
    html = html_bytes.decode("utf-8", errors="replace")
    parser = CsvLinkParser()
    parser.feed(html)
    if parser.csv_href:
        return urljoin(final_page, parser.csv_href)
    return FALLBACK_CSV


def decode_csv(raw: bytes) -> str:
    for enc in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            pass
    raise RuntimeError("Could not decode the FDA CSV")


def clean(s: str | None) -> str:
    if s is None:
        return ""
    return " ".join(str(s).replace("\ufeff", "").replace("\xa0", " ").split())


def find_column(fieldnames: list[str], patterns: tuple[str, ...]) -> str:
    normalized = [(f, clean(f).lower()) for f in fieldnames]
    for original, low in normalized:
        if all(p in low for p in patterns):
            return original
    raise RuntimeError(f"Could not find column matching {patterns}; columns were: {fieldnames}")


def parse_date(value: str) -> datetime | None:
    value = clean(value)
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def existing_hash() -> str | None:
    if not JSON_OUT.exists():
        return None
    try:
        return json.loads(JSON_OUT.read_text(encoding="utf-8")).get("csv_sha256")
    except Exception:
        return None


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    csv_url = discover_csv_url()
    raw, final_csv_url = fetch_bytes(csv_url)
    csv_hash = hashlib.sha256(raw).hexdigest()

    old_hash = existing_hash()
    if old_hash == csv_hash and CSV_OUT.exists() and JSON_OUT.exists():
        print("FDA CSV is unchanged; existing tracker data were left intact.")
        print(f"FDA CSV: {final_csv_url}")
        return

    text = decode_csv(raw)
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise RuntimeError("FDA CSV did not contain a header row")

    date_col = find_column(reader.fieldnames, ("date", "final", "decision"))
    panel_col = find_column(reader.fieldnames, ("panel",))

    rows = list(reader)
    panel_totals: Counter[str] = Counter()
    yearly_totals: Counter[int] = Counter()
    yearly_panels: dict[int, Counter[str]] = defaultdict(Counter)
    latest: datetime | None = None

    for row in rows:
        panel = clean(row.get(panel_col)) or "Unspecified"
        panel_totals[panel] += 1

        dt = parse_date(row.get(date_col, ""))
        if dt is None:
            continue
        yearly_totals[dt.year] += 1
        yearly_panels[dt.year][panel] += 1
        if latest is None or dt > latest:
            latest = dt

    total = len(rows)
    radiology = panel_totals.get("Radiology", 0)
    share = round((radiology / total * 100.0), 1) if total else 0.0

    ordered_panels = ["Radiology"]
    ordered_panels += [p for p, _ in panel_totals.most_common() if p != "Radiology"][:8]

    years = []
    if yearly_totals:
        first_year = min(yearly_totals)
        last_year = max(yearly_totals)
        for year in range(first_year, last_year + 1):
            total_year = yearly_totals.get(year, 0)
            shown = {p: yearly_panels[year].get(p, 0) for p in ordered_panels}
            other = total_year - sum(shown.values())
            if other:
                shown["Other"] = other
            years.append({"year": year, "total": total_year, "panels": shown})

    panel_summary = [{"panel": p, "count": c} for p, c in panel_totals.most_common()]

    summary = {
        "source_page": FDA_PAGE,
        "csv_url": final_csv_url,
        "synced_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "latest_final_decision": latest.strftime("%Y-%m-%d") if latest else None,
        "total_list_entries": total,
        "radiology_entries": radiology,
        "radiology_share_pct": share,
        "display_panels": ordered_panels + (["Other"] if any("Other" in y["panels"] for y in years) else []),
        "panel_totals": panel_summary,
        "years": years,
        "csv_sha256": csv_hash,
        "note": "FDA states that this list is updated periodically and is not comprehensive.",
    }

    CSV_OUT.write_bytes(raw)
    JSON_OUT.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"FDA CSV: {final_csv_url}")
    print(f"Rows: {total}")
    print(f"Radiology: {radiology} ({share}%)")
    print(f"Latest final decision: {summary['latest_final_decision']}")
    print(f"Wrote: {CSV_OUT.relative_to(ROOT)}")
    print(f"Wrote: {JSON_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
