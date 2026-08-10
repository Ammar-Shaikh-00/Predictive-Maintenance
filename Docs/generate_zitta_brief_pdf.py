"""Generate a simple ZITTA client brief PDF."""

from pathlib import Path

from reportlab.lib.colors import black, HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

out = Path(__file__).resolve().parent / "ZITTA_ML_Architecture_Brief_Update.pdf"

doc = SimpleDocTemplate(
    str(out),
    pagesize=A4,
    leftMargin=20 * mm,
    rightMargin=20 * mm,
    topMargin=18 * mm,
    bottomMargin=18 * mm,
    title="ZITTA Brief Update — Incoming Data to ML Architecture",
)

styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="TitleMain",
        fontName="Helvetica-Bold",
        fontSize=14,
        textColor=black,
        spaceAfter=3 * mm,
        leading=18,
        alignment=TA_LEFT,
    )
)
styles.add(
    ParagraphStyle(
        name="Meta",
        fontName="Helvetica",
        fontSize=10,
        textColor=HexColor("#444444"),
        spaceAfter=6 * mm,
        leading=13,
    )
)
styles.add(
    ParagraphStyle(
        name="H1",
        fontName="Helvetica-Bold",
        fontSize=11,
        textColor=black,
        spaceBefore=5 * mm,
        spaceAfter=2.5 * mm,
        leading=14,
    )
)
styles.add(
    ParagraphStyle(
        name="P",
        fontName="Helvetica",
        fontSize=10,
        textColor=black,
        spaceAfter=2 * mm,
        leading=13,
    )
)
styles.add(
    ParagraphStyle(
        name="BulletItem",
        fontName="Helvetica",
        fontSize=10,
        textColor=black,
        leftIndent=4 * mm,
        spaceAfter=1.5 * mm,
        leading=13,
    )
)
styles.add(
    ParagraphStyle(
        name="Cell",
        fontName="Helvetica",
        fontSize=9.5,
        textColor=black,
        leading=12,
    )
)
styles.add(
    ParagraphStyle(
        name="CellHead",
        fontName="Helvetica-Bold",
        fontSize=9.5,
        textColor=black,
        leading=12,
    )
)

story = []

story.append(Paragraph("ZITTA Brief Update: Incoming Data → ML Architecture", styles["TitleMain"]))
story.append(Paragraph("Date: 5 August 2026", styles["Meta"]))

story.append(Paragraph("1. How Incoming Data Enters the ML Models", styles["H1"]))
story.append(
    Paragraph(
        "The live monitoring path is implemented end-to-end. Sensor data from the extruder "
        "is ingested, buffered, turned into ML features, scored by state and anomaly models, "
        "then evaluated against historical baselines.",
        styles["P"],
    )
)
story.append(
    Paragraph(
        "1. <b>Ingest</b> — Poll extruder API every 10s and normalize sensor fields "
        "(speed, load, pressure, temperature zones).",
        styles["BulletItem"],
    )
)
story.append(
    Paragraph(
        "2. <b>Buffer</b> — Keep a 5-minute rolling window (~30 points) so live inference matches training.",
        styles["BulletItem"],
    )
)
story.append(
    Paragraph(
        "3. <b>Features</b> — Compute means/trends, temperature spread, and temperature direction.",
        styles["BulletItem"],
    )
)
story.append(
    Paragraph(
        "4. <b>ML Layer</b> — State model (RandomForest) classifies OFF / HEATING / COOLING / READY / "
        "PRODUCTION / LOW_PRODUCTION. Per-state Isolation Forest models score anomalies.",
        styles["BulletItem"],
    )
)
story.append(
    Paragraph(
        "5. <b>Evaluation</b> — For PRODUCTION / LOW_PRODUCTION, compare to baselines and check drift.",
        styles["BulletItem"],
    )
)
story.append(
    Paragraph(
        "6. <b>Store &amp; Expose</b> — Save to SQLite and serve via local FastAPI (port 8001).",
        styles["BulletItem"],
    )
)
story.append(
    Paragraph(
        "<b>Offline retrain (manual):</b> raw DB → 5-minute windows → clustering → labels → classifier + anomaly models.",
        styles["P"],
    )
)

story.append(Paragraph("2. Goals Completed", styles["H1"]))

rows = [
    [Paragraph("<b>Area</b>", styles["CellHead"]), Paragraph("<b>Status</b>", styles["CellHead"])],
    [Paragraph("Live API → feature → ML → database pipeline", styles["Cell"]), Paragraph("Done", styles["Cell"])],
    [Paragraph("Simulation replay for testing", styles["Cell"]), Paragraph("Done", styles["Cell"])],
    [Paragraph("ML state classification (6 states)", styles["Cell"]), Paragraph("Done (~99.7% test accuracy)", styles["Cell"])],
    [
        Paragraph("Per-state anomaly scoring", styles["Cell"]),
        Paragraph("Done (PRODUCTION, OFF, HEATING, COOLING, LOW_PRODUCTION)", styles["Cell"]),
    ],
    [Paragraph("Baseline / z-score evaluation + drift", styles["Cell"]), Paragraph("Done", styles["Cell"])],
    [Paragraph("Manual 5-minute ML retrain pipeline", styles["Cell"]), Paragraph("Done", styles["Cell"])],
    [Paragraph("Live buffer aligned to 5-minute training", styles["Cell"]), Paragraph("Done", styles["Cell"])],
    [Paragraph("Local API for live / ML status", styles["Cell"]), Paragraph("Done", styles["Cell"])],
    [Paragraph("Docker packaging", styles["Cell"]), Paragraph("Done", styles["Cell"])],
]

table = Table(rows, colWidths=[105 * mm, 65 * mm])
table.setStyle(
    TableStyle(
        [
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#888888")),
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#EEEEEE")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]
    )
)
story.append(table)

story.append(Paragraph("3. Still Missing / Open on ZITTA", styles["H1"]))
gaps = [
    "Auto-retrain still uses the older 30-minute path; manual retrain is the correct 5-minute path — these need to be unified.",
    "READY and HEATING need more real transition data (READY nearly absent; HEATING sparse).",
    "Material / profile baselines not implemented yet (pressure-regime baseline only).",
    "Full alerting (state-aware alerts, email/dashboard dispatch, material/batch context) not fully delivered.",
    "Ops Center / full ZITTA UI integration — ML pipeline is local FastAPI; not yet fully wired into the ops product.",
    "Production database / outbound publishing — still SQLite-centric; no LSTM / advanced sequence model yet.",
]
for g in gaps:
    story.append(Paragraph(f"• {g}", styles["BulletItem"]))

story.append(Paragraph("One-Line Status", styles["H1"]))
story.append(
    Paragraph(
        "<b>Core ML architecture for live extruder data is implemented and working</b> "
        "(ingest → 5-minute features → state + anomaly ML → baseline evaluation). "
        "Remaining work is mainly production hardening: auto-retrain alignment, more transition data, "
        "alerting, Ops Center integration, and material-aware baselines.",
        styles["P"],
    )
)

doc.build(story)
print(f"Wrote: {out}")
