import io
import json
import zipfile
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from engine.rentguard import evaluate

app = FastAPI(title="RentGuard API", version="2.0.0")


class Ledger(BaseModel):
    tenant_id: str = Field(..., description="Tenant identifier")
    due_date: str = Field(..., description="ISO formatted due date (YYYY-MM-DD)")
    balance: float = Field(..., description="Outstanding balance")
    no_notice_sent: Optional[bool] = Field(True, description="Whether no notice has been sent")
    current_date: Optional[str] = Field(None, description="Optional override for current date (ISO)")
    human_block: Optional[bool] = Field(False, description="Flag indicating human blocked logic")
    human_override: Optional[bool] = Field(False, description="Flag indicating human override")
    override_reason: Optional[str] = Field(None, description="Reason for human override")


class JudgePacketRequest(BaseModel):
    tenant_id: Optional[str] = Field(None, description="Optional tenant identifier")
    artifacts: list[dict] = Field(..., description="List of artifact payloads to package")


@app.get("/api/health")
async def health():
    return {"status": "ok", "engine": "RentGuard", "version": "2.0.0"}


@app.post("/api/evaluate")
async def evaluate_ledger(record: Ledger, persist: bool = Query(False)):
    payload = evaluate(record.dict(), persist=persist)
    if not payload:
        raise HTTPException(status_code=400, detail="Evaluation did not produce an artifact")
    return JSONResponse(content=payload)


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
