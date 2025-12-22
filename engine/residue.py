import datetime
import json
import uuid
from pathlib import Path
from engine.rules import ACTIVE

ARTIFACT_DIR = Path("artifacts")


def emit(payload: dict):
    ARTIFACT_DIR.mkdir(exist_ok=True)
    payload["artifact_id"] = str(uuid.uuid4())
    payload["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"
    payload["thresholds"] = ACTIVE

    fname = f"{payload['status']}_{payload.get('tenant_id','NA')}_{payload['artifact_id']}.json"
    path = ARTIFACT_DIR / fname

    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, sort_keys=True, separators=(",", ":"), indent=2)

    print(f"Artifact written: {path}")


def emit_override(original_artifact_id: str, actor: str, reason: str):
    payload = {
        "status": "FORCE_OVERRIDE",
        "engine": "rentguard",
        "original_artifact_id": original_artifact_id,
        "actor": actor,
        "decision": "HUMAN_OVERRIDE",
        "human_override": True,
        "reason": reason
    }
    emit(payload)
