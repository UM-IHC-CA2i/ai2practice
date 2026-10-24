#!/usr/bin/env python3
"""Rebuild sitemap.xml from the site's public pages.

Run from anywhere: python3 scripts/build_sitemap.py
Lists top-level, modules/, pages/ and lessons/ pages; skips mockups, backups,
the Google verification file and anything marked noindex. lastmod is the
file's modification date.
"""
from datetime import date
from pathlib import Path

BASE = "https://um-ihc-ca2i.github.io/ai2practice/"
ROOT = Path(__file__).resolve().parent.parent
GLOBS = ["*.html", "modules/*.html", "pages/*.html", "lessons/*.html"]


def pages():
    for pattern in GLOBS:
        for path in sorted(ROOT.glob(pattern)):
            if path.name.startswith("google"):
                continue
            if "noindex" in path.read_text(encoding="utf-8", errors="ignore"):
                continue
            yield path


def main():
    rows = []
    for path in pages():
        rel = path.relative_to(ROOT).as_posix()
        loc = BASE if rel == "index.html" else BASE + rel
        mod = date.fromtimestamp(path.stat().st_mtime).isoformat()
        rows.append(f"  <url><loc>{loc}</loc><lastmod>{mod}</lastmod></url>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + "\n".join(rows) + "\n</urlset>\n")
    (ROOT / "sitemap.xml").write_text(xml, encoding="utf-8")
    print(f"sitemap.xml: {len(rows)} pages")


if __name__ == "__main__":
    main()
