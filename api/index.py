import csv
import io
import json
import zipfile
from typing import List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from engine.rentguard import evaluate

app = FastAPI(title="RentGuard API", version="1.0.0")


class EvaluationRecord(BaseModel):
    tenant_id: str = Field(..., description="Unique tenant identifier")
    due_date: str = Field(..., description="ISO formatted due date (YYYY-MM-DD)")
    late_count_window: int = Field(..., ge=0, description="Late count within the monitoring window")
    days_since_eligible_filing: int = Field(..., ge=0, description="Days since filing became eligible")
    portfolio_late_rate: float = Field(..., ge=0, description="Portfolio-wide late rate as a decimal")


class JudgePacketRequest(BaseModel):
    tenant_id: Optional[str] = Field(None, description="Optional tenant identifier")
    artifacts: List[dict] = Field(..., description="List of artifact payloads to package")


@app.post("/api/evaluate/json")
async def evaluate_json(record: EvaluationRecord):
    payload = evaluate(record.dict())
    if not payload:
        raise HTTPException(status_code=400, detail="Evaluation did not produce an artifact")
    return JSONResponse(content=payload)


@app.post("/api/evaluate/csv")
async def evaluate_csv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV uploads are supported")

    raw = await file.read()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Unable to decode CSV as UTF-8")

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV contained no rows")

    total = len(rows)
    late_count = sum(1 for r in rows if r.get("is_late", "").lower() == "true")
    portfolio_late_rate = late_count / total if total else 0

    results = []
    for row in rows:
        try:
            record = {
                "tenant_id": row["tenant_id"],
                "due_date": row["due_date"],
                "late_count_window": int(row["late_count_window"]),
                "days_since_eligible_filing": int(row["days_since_eligible_filing"]),
                "portfolio_late_rate": portfolio_late_rate,
            }
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid CSV row: {exc}")

        payload = evaluate(record)
        if not payload:
            raise HTTPException(status_code=400, detail=f"Evaluation failed for tenant {record['tenant_id']}")
        results.append(payload)

    return {"count": len(results), "portfolio_late_rate": portfolio_late_rate, "results": results}


@app.post("/api/judge-packet")
async def judge_packet(request: JudgePacketRequest):
    if not request.artifacts:
        raise HTTPException(status_code=400, detail="At least one artifact is required")

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zipf:
        for artifact in request.artifacts:
            tenant_id = artifact.get("tenant_id", request.tenant_id or "tenant")
            artifact_id = artifact.get("artifact_id", "artifact")
            name = f"{tenant_id}_{artifact_id}.json"
            zipf.writestr(name, json.dumps(artifact, indent=2))

    buffer.seek(0)
    filename = request.tenant_id or "judge_packet"
    headers = {"Content-Disposition": f"attachment; filename={filename}.zip"}

    return StreamingResponse(buffer, media_type="application/zip", headers=headers)
