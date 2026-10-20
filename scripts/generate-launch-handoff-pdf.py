#!/usr/bin/env python3
"""Build docs/Pupmeow-Launch-Handoff.pdf from docs/LAUNCH_HANDOFF.md (requires reportlab)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MD = ROOT / "docs" / "LAUNCH_HANDOFF.md"
OUT = ROOT / "docs" / "Pupmeow-Launch-Handoff.pdf"


def main() -> int:
    try:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_LEFT
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import Paragraph, Preformatted, SimpleDocTemplate, Spacer, Table, TableStyle
    except ImportError:
        print("Install reportlab: pip install reportlab", file=sys.stderr)
        return 1

    if not MD.is_file():
        print(f"Missing {MD}", file=sys.stderr)
        return 1

    text = MD.read_text(encoding="utf-8")
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "HandoffTitle",
        parent=styles["Title"],
        fontSize=20,
        spaceAfter=12,
        textColor=colors.HexColor("#1a2233"),
    )
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=14, spaceBefore=14, spaceAfter=8)
    h3 = ParagraphStyle("H3", parent=styles["Heading3"], fontSize=11, spaceBefore=10, spaceAfter=6)
    body = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, leading=14, alignment=TA_LEFT)
    bullet = ParagraphStyle("Bullet", parent=body, leftIndent=14, bulletIndent=0, spaceAfter=4)
    mono = ParagraphStyle("Mono", parent=styles["Code"], fontSize=8, leading=10, backColor=colors.HexColor("#f4f4f5"))

    story: list = []
    in_code = False
    code_lines: list[str] = []
    table_rows: list[list[str]] = []

    def flush_table() -> None:
        nonlocal table_rows
        if not table_rows:
            return
        data = [[Paragraph(_esc(c), body) for c in row] for row in table_rows]
        t = Table(data, colWidths=[45 * mm, 120 * mm])
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8f5f3")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.append(t)
        story.append(Spacer(1, 8))
        table_rows = []

    for raw in text.splitlines():
        line = raw.rstrip()

        if line.strip().startswith("```"):
            if in_code:
                story.append(Preformatted("\n".join(code_lines), mono))
                story.append(Spacer(1, 8))
                code_lines = []
                in_code = False
            else:
                flush_table()
                in_code = True
            continue
        if in_code:
            code_lines.append(line)
            continue

        if line.startswith("|") and "|" in line[1:]:
            if re.match(r"^\|[\s\-:|]+\|$", line.replace(" ", "")):
                continue
            cells = [c.strip() for c in line.strip("|").split("|")]
            table_rows.append(cells)
            continue
        else:
            flush_table()

        if not line.strip():
            story.append(Spacer(1, 6))
            continue
        if line.startswith("# "):
            story.append(Paragraph(_esc(line[2:]), title_style))
            continue
        if line.startswith("## "):
            story.append(Paragraph(_esc(line[3:]), h2))
            continue
        if line.startswith("### "):
            story.append(Paragraph(_esc(line[4:]), h3))
            continue
        if line.startswith("- [ ] "):
            story.append(Paragraph(f"&#9744; {_esc(line[6:])}", bullet))
            continue
        if line.startswith("- "):
            story.append(Paragraph(f"&#8226; {_esc(line[2:])}", bullet))
            continue
        if line.startswith("---"):
            story.append(Spacer(1, 4))
            continue

        story.append(Paragraph(_esc(line), body))

    flush_table()

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="Pupmeow Launch Handoff",
        author="Pupmeow Team",
    )
    doc.build(story)
    print(f"Wrote {OUT}")
    return 0


def _esc(s: str) -> str:
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", s)
    return s


if __name__ == "__main__":
    raise SystemExit(main())
