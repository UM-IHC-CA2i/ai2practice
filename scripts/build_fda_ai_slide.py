#!/usr/bin/env python3
"""Build the downloadable FDA AI-Enabled Medical Device List PowerPoint slide.

Uses python-pptx so this works locally and in GitHub Actions without Node/npm.
Run after scripts/update_fda_ai_data.py has created data/fda-ai-summary.json.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
import math
from typing import Any

from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION, XL_TICK_LABEL_POSITION
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_AUTO_SIZE
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "fda-ai-summary.json"
OUT_DIR = ROOT / "downloads"
OUT_PATH = OUT_DIR / "fda-ai-enabled-medical-device-list-slide.pptx"
SITE_URL = "https://um-ihc-ca2i.github.io/ai2practice/tracker.html"
AUTHORS = "Li S, Andriole K, Chang P, Grimm L, Heilbrun M, Krupinski E, Klontzas M, Amiruddin R, Kadom N, Doo FX"
COLORS = [
    "2568B8", "C93636", "E97817", "16858C", "AD2458", "F3A62A", "3E8B45",
    "6A2CA0", "4B2CA3", "14725E", "8B7468", "7F97A1", "D44A1C", "5A8D3B",
    "64748B", "0E7490", "854D0E", "7C3AED", "475569", "B45309",
]


def hex_to_rgb(value: str) -> RGBColor:
    value = value.strip().lstrip("#")
    return RGBColor(int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16))


def fmt(n: Any) -> str:
    try:
        return f"{int(n):,}"
    except Exception:
        return "—"


def pct(n: Any) -> str:
    try:
        val = float(n)
        return f"{val:.1f}".rstrip("0").rstrip(".") + "%"
    except Exception:
        return "—"


def date_label(value: str | None) -> str:
    if not value:
        return "not available"
    value = str(value)
    for day_fmt in ("%-d", "%d"):
        try:
            if len(value) == 10:
                dt = datetime.strptime(value, "%Y-%m-%d")
            else:
                dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return dt.strftime(f"%b {day_fmt}, %Y").replace(" 0", " ")
        except Exception:
            continue
    return value


def add_textbox(slide, text: str, x: float, y: float, w: float, h: float, *,
                size: float = 12, bold: bool = False, italic: bool = False,
                color: str = "10233F", align=PP_ALIGN.LEFT) -> None:
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.margin_left = Pt(0)
    tf.margin_right = Pt(0)
    tf.margin_top = Pt(0)
    tf.margin_bottom = Pt(0)
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.name = "Aptos"
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = hex_to_rgb(color)


def add_metric(slide, x: float, y: float, value: str, label: str) -> None:
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(1.08), Inches(0.86))
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor(255, 255, 255)
    shape.line.color.rgb = hex_to_rgb("DDE6EC")
    shape.line.width = Pt(0.75)
    add_textbox(slide, value, x + 0.08, y + 0.13, 0.92, 0.26, size=17, bold=True, color="10233F", align=PP_ALIGN.CENTER)
    add_textbox(slide, label, x + 0.06, y + 0.48, 0.96, 0.25, size=6.8, color="64748B", align=PP_ALIGN.CENTER)


def nice_max(value: int) -> int:
    if value <= 10:
        return 10
    magnitude = 10 ** (len(str(value)) - 1)
    normalized = value / magnitude
    if normalized <= 2:
        step = 0.5
    elif normalized <= 5:
        step = 1
    else:
        step = 2
    return int(math.ceil(normalized / step) * step * magnitude)


def ordered_panels_for_legend(data: dict[str, Any]) -> list[str]:
    """Radiology first, all other displayed panels by total count, Other last."""
    display = [str(p) for p in (data.get("display_panels") or [])]
    totals = {str(item.get("panel")): int(item.get("count") or 0) for item in data.get("panel_totals", [])}

    panels = [p for p in display if p != "Other"]
    # Add any panel in yearly data that may not be present in display_panels.
    for y in data.get("years", []):
        for p in (y.get("panels") or {}).keys():
            if p not in panels and p != "Other":
                panels.append(p)

    ordered: list[str] = []
    if "Radiology" in panels:
        ordered.append("Radiology")
    ordered.extend(sorted([p for p in panels if p != "Radiology"], key=lambda p: (-totals.get(p, 0), p)))

    if "Other" in display or any("Other" in (y.get("panels") or {}) for y in data.get("years", [])):
        ordered.append("Other")
    return ordered


def panel_counts(data: dict[str, Any], panels: list[str]) -> dict[str, int]:
    counts = {str(item.get("panel")): int(item.get("count") or 0) for item in data.get("panel_totals", [])}
    if "Other" in panels:
        known = sum(counts.get(p, 0) for p in panels if p != "Other")
        counts["Other"] = max(int(data.get("total_list_entries") or 0) - known, 0)
    return counts


def pretty_panel_name(panel: str) -> str:
    return panel.replace("Gastroenterology-Urology", "Gastroenterology/Urology")


def add_custom_legend(slide, panels: list[str], counts: dict[str, int], color_map: dict[str, str]) -> None:
    x = 9.05
    y = 1.32
    line_h = 0.235 if len(panels) <= 16 else 0.205
    font_size = 8.7 if len(panels) <= 16 else 7.8
    for i, panel in enumerate(panels):
        yy = y + i * line_h
        if panel == "Radiology":
            hl = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x + 0.23), Inches(yy - 0.02), Inches(3.28), Inches(line_h + 0.035))
            hl.fill.solid()
            hl.fill.fore_color.rgb = hex_to_rgb("FFF56A")
            hl.line.fill.background()
        sq = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(yy + 0.035), Inches(0.11), Inches(0.11))
        sq.fill.solid()
        sq.fill.fore_color.rgb = hex_to_rgb(color_map.get(panel, "64748B"))
        sq.line.fill.background()
        label = f"{pretty_panel_name(panel)} ({fmt(counts.get(panel, 0))})"
        add_textbox(slide, label, x + 0.2, yy, 3.65, 0.16, size=font_size, bold=(panel == "Radiology"), color="111827")


def main() -> None:
    if not DATA_PATH.exists():
        raise SystemExit("Missing data/fda-ai-summary.json. Run: python scripts/update_fda_ai_data.py")

    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    years = [y for y in data.get("years", []) if int(y.get("total", 0) or 0) > 0]
    if not years:
        raise SystemExit("No yearly data available in data/fda-ai-summary.json.")

    legend_panels = ordered_panels_for_legend(data)
    counts = panel_counts(data, legend_panels)
    color_map = {panel: COLORS[i % len(COLORS)] for i, panel in enumerate(legend_panels)}

    # For stacked columns, later series appear on top. Add smaller/Other series first
    # and Radiology last, while keeping the custom legend in Radiology-first order.
    stack_panels = list(reversed(legend_panels))

    labels = [str(y.get("year")) for y in years]
    chart_data = CategoryChartData()
    chart_data.categories = labels
    for panel in stack_panels:
        values = []
        for y in years:
            panel_values = y.get("panels") or {}
            values.append(int(panel_values.get(panel) or 0))
        chart_data.add_series(panel, values)

    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = hex_to_rgb("FBF8F0")

    add_textbox(slide, "FDA AI-Enabled Medical Device List", 0.55, 0.28, 7.6, 0.38, size=22, bold=True)
    add_textbox(slide, "Entries by final-decision year and FDA lead panel", 0.55, 0.72, 7.7, 0.24, size=11, color="64748B")
    add_textbox(slide, "Source: U.S. Food and Drug Administration AI-Enabled Medical Devices List CSV; adapted by AI2Practice for educational use.", 0.55, 1.00, 8.4, 0.23, size=8.3, color="64748B")

    add_metric(slide, 9.02, 0.28, fmt(data.get("total_list_entries")), "FDA list entries")
    add_metric(slide, 10.38, 0.28, fmt(data.get("radiology_entries")), "Radiology entries")
    add_metric(slide, 11.75, 0.28, pct(data.get("radiology_share_pct")), "Radiology share")

    chart_shape = slide.shapes.add_chart(
        XL_CHART_TYPE.COLUMN_STACKED,
        Inches(0.55), Inches(1.34), Inches(8.18), Inches(4.55),
        chart_data,
    )
    chart = chart_shape.chart
    chart.has_title = False
    chart.has_legend = False
    chart.value_axis.has_major_gridlines = True
    chart.value_axis.tick_labels.font.size = Pt(8)
    chart.category_axis.tick_labels.font.size = Pt(6.8)
    chart.category_axis.tick_label_position = XL_TICK_LABEL_POSITION.LOW
    chart.value_axis.maximum_scale = nice_max(max(int(y.get("total") or 0) for y in years))
    chart.value_axis.minimum_scale = 0
    try:
        chart.value_axis.axis_title.text_frame.text = "Number of devices"
        chart.value_axis.has_title = True
    except Exception:
        pass

    for series in chart.series:
        name = str(series.name)
        series.format.fill.solid()
        series.format.fill.fore_color.rgb = hex_to_rgb(color_map.get(name, "64748B"))
        series.format.line.color.rgb = hex_to_rgb(color_map.get(name, "64748B"))

    add_custom_legend(slide, legend_panels, counts, color_map)

    sync_date = date_label(str(data.get("synced_at_utc", ""))[:10])
    latest_date = date_label(data.get("latest_final_decision"))
    add_textbox(slide, f"Latest final-decision date in FDA source: {latest_date}   |   AI2Practice sync: {sync_date}", 0.55, 5.98, 12.15, 0.18, size=7.4, color="64748B")

    cite_shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), Inches(6.18), Inches(12.22), Inches(0.88))
    cite_shape.fill.solid()
    cite_shape.fill.fore_color.rgb = hex_to_rgb("FFF8CC")
    cite_shape.line.color.rgb = hex_to_rgb("C7A400")
    cite_shape.line.width = Pt(1)

    add_textbox(slide, "Find this useful? Please cite us.", 0.75, 6.30, 2.95, 0.22, size=10.2, bold=True, color="10233F")
    citation = (
        f"{AUTHORS}. AI2Practice: FDA AI-Enabled Medical Device List visualization. "
        f"AI2Practice. {SITE_URL}. Source data: U.S. FDA AI-Enabled Medical Devices List. "
        "Visualization adapted by AI2Practice for educational use; not an FDA product or endorsement."
    )
    add_textbox(slide, citation, 3.62, 6.26, 8.95, 0.43, size=8.0, color="1F2937")
    add_textbox(slide, "FDA notes that the AI-Enabled Medical Device List is updated periodically and is not comprehensive.", 3.62, 6.75, 8.95, 0.17, size=6.9, italic=True, color="64748B")

    props = prs.core_properties
    props.author = "AI2Practice"
    props.title = "FDA AI-Enabled Medical Device List"
    props.subject = "FDA AI-Enabled Medical Device List visualization"
    props.keywords = "FDA; AI-enabled medical devices; AI2Practice; radiology"
    props.comments = "Source: FDA AI-Enabled Medical Devices List; visualization adapted by AI2Practice for educational use."
    props.modified = datetime.now(timezone.utc)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    prs.save(OUT_PATH)
    print(f"Wrote: {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
