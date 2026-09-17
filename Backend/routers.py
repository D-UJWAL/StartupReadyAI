from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
import models, schemas, database, auth
from typing import List, Optional
import json, os, uuid, io
from datetime import datetime

router = APIRouter(prefix="/api", tags=["api"])

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".xlsx", ".png", ".jpg", ".jpeg", ".mp4"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB

# ── /api/me ────────────────────────────────────────────────────────────────────
@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# ── /api/startups ──────────────────────────────────────────────────────────────
@router.post("/startups", response_model=schemas.StartupResponse)
def create_startup(startup: schemas.StartupCreate, db: Session = Depends(database.get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    # Prevent duplicate startups for the same user
    if current_user.startup_id:
        existing = db.query(models.Startup).filter(models.Startup.id == current_user.startup_id).first()
        if existing:
            # Update instead of create
            for k, v in startup.model_dump(exclude_unset=True).items():
                setattr(existing, k, v)
            db.commit()
            db.refresh(existing)
            return existing
    db_startup = models.Startup(**startup.model_dump())
    db.add(db_startup)
    db.commit()
    db.refresh(db_startup)
    current_user.startup_id = db_startup.id
    db.commit()
    db.refresh(current_user)
    return db_startup

@router.get("/startups", response_model=List[schemas.StartupResponse])
def get_startups(db: Session = Depends(database.get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.startup_id:
        return []
    startup = db.query(models.Startup).filter(models.Startup.id == current_user.startup_id).first()
    return [startup] if startup else []

@router.put("/startups/{startup_id}", response_model=schemas.StartupResponse)
def update_startup(startup_id: int, startup_update: schemas.StartupUpdate,
                   db: Session = Depends(database.get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    # Security: user can only update their own startup
    if current_user.startup_id != startup_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this startup")
    db_startup = db.query(models.Startup).filter(models.Startup.id == startup_id).first()
    if not db_startup:
        raise HTTPException(status_code=404, detail="Startup not found")
    for k, v in startup_update.model_dump(exclude_unset=True).items():
        setattr(db_startup, k, v)
    db.commit()
    db.refresh(db_startup)
    return db_startup

# ── /api/dashboard ─────────────────────────────────────────────────────────────
@router.get("/dashboard")
def get_dashboard_stats(db: Session = Depends(database.get_db),
                        current_user: models.User = Depends(auth.get_current_user)):
    total_founders = 1
    total_startups = 0
    evals_completed = 0
    avg_score = "--/100"

    if current_user.startup_id:
        startup = db.query(models.Startup).filter(
            models.Startup.id == current_user.startup_id).first()
        if startup:
            # Count founders from team array in registration_data
            try:
                data = json.loads(startup.registration_data or "{}")
                team = data.get("team", [])
                if isinstance(team, list) and len(team) > 0:
                    # Count team members with a name filled in
                    named = [m for m in team if m.get("name", "").strip()]
                    total_founders = max(len(named), 1)
            except Exception:
                total_founders = 1

            # Startup count: only 1 after full 12-step completion
            if startup.registration_step is not None and startup.registration_step >= 12:
                total_startups = 1

            # Evaluations: completed when all 14 scored steps (1–14) are saved.
            # Step 15 is the results screen and is never stored as a DB row.
            evals = db.query(models.Evaluation).filter(
                models.Evaluation.startup_id == startup.id).all()
            scored_evals = [e for e in evals if 1 <= e.step <= 14]
            if len(scored_evals) >= 14:
                evals_completed = 1
                scores = [e.score for e in scored_evals if e.score is not None]
                if scores:
                    avg = round(sum(scores) / len(scores))
                    avg_score = f"{avg}/100"

    return {
        "total_users": total_founders,
        "total_startups": total_startups,
        "evaluations_completed": evals_completed,
        "avg_score": avg_score,
    }

# ── /api/evaluations ───────────────────────────────────────────────────────────
@router.post("/evaluations", response_model=schemas.EvaluationResponse)
def save_evaluation(evaluation: schemas.EvaluationCreate,
                    db: Session = Depends(database.get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.startup_id:
        raise HTTPException(status_code=400, detail="Complete startup registration first")
    db_eval = db.query(models.Evaluation).filter(
        models.Evaluation.startup_id == current_user.startup_id,
        models.Evaluation.step == evaluation.step).first()
    if db_eval:
        db_eval.score = evaluation.score
        db_eval.data = evaluation.data
    else:
        db_eval = models.Evaluation(
            startup_id=current_user.startup_id,
            step=evaluation.step,
            score=evaluation.score,
            data=evaluation.data)
        db.add(db_eval)
    db.commit()
    db.refresh(db_eval)
    return db_eval

@router.get("/evaluations", response_model=List[schemas.EvaluationResponse])
def get_evaluations(db: Session = Depends(database.get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.startup_id:
        return []
    return db.query(models.Evaluation).filter(
        models.Evaluation.startup_id == current_user.startup_id
    ).order_by(models.Evaluation.step).all()

# ── /api/evaluations/result ────────────────────────────────────────────────────
@router.get("/evaluations/result")
def get_evaluation_result(db: Session = Depends(database.get_db),
                           current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.startup_id:
        raise HTTPException(status_code=400, detail="No startup found")
    evals = db.query(models.Evaluation).filter(
        models.Evaluation.startup_id == current_user.startup_id
    ).order_by(models.Evaluation.step).all()

    step_names = [
        "", "Startup Overview", "Problem & Solution", "Market Opportunity",
        "Product Readiness", "Technology", "Business Model", "Team Assessment",
        "Financial Readiness", "Legal & Compliance", "Sales & GTM",
        "Traction & Growth", "ESG & Impact", "Investment Readiness", "Risk Assessment"
    ]

    category_scores = {}
    for ev in evals:
        if 1 <= ev.step <= 14:
            category_scores[step_names[ev.step]] = ev.score

    # Overall score = weighted average of all category scores
    if category_scores:
        overall = round(sum(category_scores.values()) / len(category_scores))
    else:
        overall = 0

    if overall >= 80:
        label = "Growth Ready"
    elif overall >= 65:
        label = "Series A Ready"
    elif overall >= 50:
        label = "Seed Ready"
    else:
        label = "Pre-Seed Stage"

    # Rule-based SWOT from scores
    strengths, weaknesses, opportunities, threats = [], [], [], []
    for cat, score in category_scores.items():
        if score >= 70:
            strengths.append(f"Strong {cat} ({score}/100)")
        elif score < 50:
            weaknesses.append(f"{cat} needs improvement ({score}/100)")

    if len(strengths) > 2:
        opportunities.append("Strong foundation to attract seed investors")
    opportunities.append("Growing market demand for innovative solutions")
    opportunities.append("Government schemes available for registered startups")

    if "Financial Readiness" in category_scores and category_scores["Financial Readiness"] < 60:
        threats.append("Limited runway may restrict growth options")
    threats.append("Competitive market landscape")
    threats.append("Regulatory compliance requirements")

    # Rule-based recommendations (top 10, prioritized by lowest scores)
    sorted_cats = sorted(category_scores.items(), key=lambda x: x[1])
    recommendations = []
    for cat, score in sorted_cats[:10]:
        gap = 100 - score
        improvement = max(3, round(gap * 0.3))
        rec = {
            "area": cat,
            "recommendation": f"Strengthen {cat} to improve investor confidence",
            "priority": "High" if score < 50 else ("Medium" if score < 70 else "Low"),
            "expected_improvement": f"+{improvement}% overall score",
            "effort": "Low" if gap < 20 else ("Medium" if gap < 40 else "High"),
            "owner": "Founder",
            "current_score": score
        }
        recommendations.append(rec)

    return {
        "overall_score": overall,
        "readiness_label": label,
        "category_scores": category_scores,
        "strengths": strengths or ["Complete more evaluation sections to identify strengths"],
        "weaknesses": weaknesses or ["No critical weaknesses identified"],
        "opportunities": opportunities,
        "threats": threats,
        "recommendations": recommendations,
        "total_sections_completed": len(category_scores)
    }

# ── /api/evaluations/report (PDF download) ─────────────────────────────────
@router.get("/evaluations/report")
def get_evaluation_report(db: Session = Depends(database.get_db),
                           current_user: models.User = Depends(auth.get_current_user)):
    """Generate a PDF evaluation report from the latest saved evaluation data."""
    if not current_user.startup_id:
        raise HTTPException(status_code=400, detail="No startup found")

    # Fetch latest evaluation data (same source as /result endpoint)
    evals = db.query(models.Evaluation).filter(
        models.Evaluation.startup_id == current_user.startup_id
    ).order_by(models.Evaluation.step).all()

    # Fetch startup name
    startup = db.query(models.Startup).filter(
        models.Startup.id == current_user.startup_id
    ).first()
    startup_name = startup.name if startup else "Your Startup"

    step_names = [
        "", "Startup Overview", "Problem & Solution", "Market Opportunity",
        "Product Readiness", "Technology", "Business Model", "Team Assessment",
        "Financial Readiness", "Legal & Compliance", "Sales & GTM",
        "Traction & Growth", "ESG & Impact", "Investment Readiness", "Risk Assessment"
    ]

    # Build category scores (same logic as /result)
    category_scores = {}
    for ev in evals:
        if 1 <= ev.step <= 14:
            category_scores[step_names[ev.step]] = ev.score

    if category_scores:
        overall = round(sum(category_scores.values()) / len(category_scores))
    else:
        overall = 0

    if overall >= 80:
        label = "Growth Ready"
    elif overall >= 65:
        label = "Series A Ready"
    elif overall >= 50:
        label = "Seed Ready"
    else:
        label = "Pre-Seed Stage"

    strengths, weaknesses, opportunities, threats = [], [], [], []
    for cat, score in category_scores.items():
        if score >= 70:
            strengths.append(f"Strong {cat} ({score}/100)")
        elif score < 50:
            weaknesses.append(f"{cat} needs improvement ({score}/100)")

    if len(strengths) > 2:
        opportunities.append("Strong foundation to attract seed investors")
    opportunities.append("Growing market demand for innovative solutions")
    opportunities.append("Government schemes available for registered startups")

    if "Financial Readiness" in category_scores and category_scores["Financial Readiness"] < 60:
        threats.append("Limited runway may restrict growth options")
    threats.append("Competitive market landscape")
    threats.append("Regulatory compliance requirements")

    sorted_cats = sorted(category_scores.items(), key=lambda x: x[1])
    recommendations = []
    for cat, score in sorted_cats[:10]:
        gap = 100 - score
        improvement = max(3, round(gap * 0.3))
        recommendations.append({
            "area": cat,
            "recommendation": f"Strengthen {cat} to improve investor confidence",
            "priority": "High" if score < 50 else ("Medium" if score < 70 else "Low"),
            "expected_improvement": f"+{improvement}% overall score",
            "effort": "Low" if gap < 20 else ("Medium" if gap < 40 else "High"),
            "owner": "Founder",
            "current_score": score,
        })

    # ── Build PDF with reportlab ────────────────────────────────────────────
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                        Table, TableStyle, HRFlowable)
    except ImportError:
        raise HTTPException(status_code=500, detail="PDF library not available")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
        title=f"StartupReady AI Evaluation — {startup_name}",
    )

    styles = getSampleStyleSheet()
    brand = colors.HexColor("#4f46e5")
    dark  = colors.HexColor("#0f172a")
    muted = colors.HexColor("#64748b")
    green = colors.HexColor("#059669")
    red   = colors.HexColor("#dc2626")
    amber = colors.HexColor("#d97706")

    h1 = ParagraphStyle("h1", parent=styles["Heading1"],
                         textColor=dark, fontSize=22, spaceAfter=4, leading=28)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"],
                         textColor=brand, fontSize=14, spaceBefore=16, spaceAfter=6, leading=18)
    body = ParagraphStyle("body", parent=styles["Normal"],
                          textColor=dark, fontSize=9, leading=13)
    small = ParagraphStyle("small", parent=styles["Normal"],
                           textColor=muted, fontSize=8, leading=11)
    center = ParagraphStyle("center", parent=body, alignment=TA_CENTER)

    story = []

    # Cover block
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("StartupReady AI", ParagraphStyle("brand", parent=styles["Normal"],
                            textColor=brand, fontSize=11, spaceAfter=2)))
    story.append(Paragraph(f"Evaluation Report — {startup_name}", h1))
    story.append(Paragraph(
        f"Generated on {datetime.now().strftime('%d %B %Y')} · Rule-based AI Assessment",
        small))
    story.append(Spacer(1, 0.3*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=brand, spaceAfter=8))

    # Overall score box
    overall_table = Table(
        [[Paragraph(f"<b>{overall}%</b>", ParagraphStyle("big", parent=center,
                    textColor=colors.white, fontSize=36, leading=40)),
          Paragraph(f"<b>Overall Funding Readiness</b><br/>"
                    f"<font color='#e2e8f0'>{label}</font>"
                    f"<br/><br/><font size=8>{len(category_scores)} of 14 sections scored</font>",
                    ParagraphStyle("lbl", parent=styles["Normal"],
                                   textColor=colors.white, fontSize=12, leading=18))]],
        colWidths=[4*cm, None]
    )
    overall_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), brand),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
    ]))
    story.append(overall_table)
    story.append(Spacer(1, 0.5*cm))

    # Category scores table
    story.append(Paragraph("Category Scores", h2))
    cat_data = [["Category", "Score", "Status"]]
    for cat, score in sorted(category_scores.items(), key=lambda x: -x[1]):
        status = "Strong" if score >= 70 else ("Adequate" if score >= 50 else "Needs Work")
        cat_data.append([cat, f"{score}/100", status])

    cat_table = Table(cat_data, colWidths=[None, 2.5*cm, 3*cm])
    cat_table_style = [
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("ALIGN", (1, 0), (2, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for i, (cat, score) in enumerate(sorted(category_scores.items(), key=lambda x: -x[1]), start=1):
        cell_color = green if score >= 70 else (amber if score >= 50 else red)
        cat_table_style.append(("TEXTCOLOR", (1, i), (1, i), cell_color))
        cat_table_style.append(("FONTNAME", (1, i), (1, i), "Helvetica-Bold"))
    cat_table.setStyle(TableStyle(cat_table_style))
    story.append(cat_table)
    story.append(Spacer(1, 0.3*cm))

    # SWOT
    story.append(Paragraph("SWOT Analysis", h2))
    swot_sections = [
        ("Strengths", strengths or ["Complete more sections to identify strengths"], colors.HexColor("#064e3b")),
        ("Weaknesses", weaknesses or ["No critical weaknesses identified"], colors.HexColor("#7f1d1d")),
        ("Opportunities", opportunities, colors.HexColor("#1e3a8a")),
        ("Threats", threats, colors.HexColor("#78350f")),
    ]
    swot_cells = []
    for title, items, bg in swot_sections:
        cell_text = f"<b>{title}</b><br/>" + "<br/>".join(f"• {item}" for item in items)
        swot_cells.append(Paragraph(cell_text,
                           ParagraphStyle(f"swot", parent=body,
                                          textColor=colors.white, fontSize=8.5, leading=13)))

    swot_table = Table(
        [[swot_cells[0], swot_cells[1]], [swot_cells[2], swot_cells[3]]],
        colWidths=["50%", "50%"]
    )
    swot_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), swot_sections[0][2]),
        ("BACKGROUND", (1, 0), (1, 0), swot_sections[1][2]),
        ("BACKGROUND", (0, 1), (0, 1), swot_sections[2][2]),
        ("BACKGROUND", (1, 1), (1, 1), swot_sections[3][2]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 1, colors.white),
    ]))
    story.append(swot_table)
    story.append(Spacer(1, 0.3*cm))

    # Recommendations
    story.append(Paragraph("Top Recommendations", h2))
    rec_data = [["#", "Recommendation", "Priority", "Score Impact", "Effort", "Owner"]]
    for i, rec in enumerate(recommendations, 1):
        rec_data.append([
            str(i),
            rec["recommendation"],
            rec["priority"],
            rec["expected_improvement"],
            rec["effort"],
            rec["owner"],
        ])

    rec_table = Table(rec_data, colWidths=[0.6*cm, None, 1.8*cm, 2.2*cm, 1.8*cm, 1.8*cm])
    rec_style = [
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (2, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("WORDWRAP", (1, 0), (1, -1), True),
    ]
    priority_colors = {"High": red, "Medium": amber, "Low": muted}
    for i, rec in enumerate(recommendations, 1):
        pc = priority_colors.get(rec["priority"], muted)
        rec_style.append(("TEXTCOLOR", (2, i), (2, i), pc))
        rec_style.append(("FONTNAME", (2, i), (2, i), "Helvetica-Bold"))
    rec_table.setStyle(TableStyle(rec_style))
    story.append(rec_table)

    # Footer
    story.append(Spacer(1, 0.6*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=muted, spaceAfter=4))
    story.append(Paragraph(
        f"StartupReady AI · Rule-based Evaluation Report · {startup_name} · "
        f"Generated {datetime.now().strftime('%d %b %Y %H:%M')}",
        ParagraphStyle("footer", parent=small, alignment=TA_CENTER)))

    doc.build(story)
    buf.seek(0)

    safe_name = (startup_name or "Report").replace(" ", "_").replace("/", "-")
    filename = f"StartupReady_AI_Evaluation_Report_{safe_name}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

# ── /api/uploads ───────────────────────────────────────────────────────────────
@router.post("/uploads", response_model=schemas.DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user.startup_id:
        raise HTTPException(status_code=400, detail="Complete startup registration first")

    # Validate extension
    _, ext = os.path.splitext(file.filename or "")
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)} MB")

    # Generate safe unique filename
    stored_filename = f"{uuid.uuid4().hex}{ext.lower()}"
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    file_path = os.path.join(UPLOADS_DIR, stored_filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    file_url = f"/files/{stored_filename}"

    # Check if this doc_type already exists for this startup — replace if so
    existing = db.query(models.Document).filter(
        models.Document.startup_id == current_user.startup_id,
        models.Document.doc_type == doc_type
    ).first()

    if existing:
        # Delete old file safely
        old_path = os.path.join(UPLOADS_DIR, existing.stored_filename)
        if os.path.exists(old_path):
            os.remove(old_path)
        existing.original_filename = file.filename
        existing.stored_filename = stored_filename
        existing.file_url = file_url
        db.commit()
        db.refresh(existing)
        return existing

    doc = models.Document(
        startup_id=current_user.startup_id,
        original_filename=file.filename,
        stored_filename=stored_filename,
        doc_type=doc_type,
        file_url=file_url,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.get("/uploads", response_model=List[schemas.DocumentResponse])
def get_uploads(db: Session = Depends(database.get_db),
                current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.startup_id:
        return []
    return db.query(models.Document).filter(
        models.Document.startup_id == current_user.startup_id).all()

@router.delete("/uploads/{doc_id}")
def delete_upload(doc_id: int, db: Session = Depends(database.get_db),
                  current_user: models.User = Depends(auth.get_current_user)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.startup_id != current_user.startup_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    # Delete file from disk
    file_path = os.path.join(UPLOADS_DIR, doc.stored_filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}


from fastapi.responses import FileResponse

@router.get("/uploads/{doc_id}/download")
def download_upload(doc_id: int, db: Session = Depends(database.get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.startup_id != current_user.startup_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Prevent path traversal by using basename
    file_path = os.path.join(UPLOADS_DIR, os.path.basename(doc.stored_filename))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing on server")
        
    return FileResponse(file_path, filename=doc.original_filename, content_disposition_type="attachment")

@router.get("/uploads/{doc_id}/view")
def view_upload(doc_id: int, db: Session = Depends(database.get_db),
                current_user: models.User = Depends(auth.get_current_user)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.startup_id != current_user.startup_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    file_path = os.path.join(UPLOADS_DIR, os.path.basename(doc.stored_filename))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing on server")
        
    return FileResponse(file_path, filename=doc.original_filename, content_disposition_type="inline")

# -- /api/ai/generate ----------------------------------------------------------
from pydantic import BaseModel
from ai_provider import ai_service

class AIRequest(BaseModel):
    action: str
    text: Optional[str] = None
    context: Optional[str] = None

@router.post("/ai/generate")
async def generate_ai_content(req: AIRequest, current_user: models.User = Depends(auth.get_current_user)):
    if req.action == 'generate':
        prompt = f"Act as an expert startup advisor. Generate a short, professional draft for the field '{req.context}'. Make it sound compelling and realistic for an early-stage startup. Do not use markdown."
    elif req.action == 'improve':
        prompt = f"Act as an expert startup advisor. Improve the following text, making it more professional, structured, and compelling for investors. Keep it concise. Original text: {req.text}"
    elif req.action == 'rewrite':
        prompt = f"Act as an expert startup advisor. Rewrite the following text to be highly investor-focused, starting with the core conclusion and metrics. Keep it concise. Original text: {req.text}"
    elif req.action == 'action_plan':
        prompt = f"Act as an expert startup advisor. Based on this recommendation: '{req.context}', generate a brief 3-step action plan or checklist for the founder to execute."
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    result = await ai_service.generate_text(prompt)
    return {"text": result}
