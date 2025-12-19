import json, datetime, uuid
from pathlib import Path
from engine.rules import ACTIVE

ARTIFACT_DIR = Path("artifacts")

def emit(payload):
    ARTIFACT_DIR.mkdir(exist_ok=True)
    payload["artifact_id"] = str(uuid.uuid4())
    payload["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"
    
    # Transparency Rule: Always record the thresholds used
    payload["thresholds"] = ACTIVE

    fname = f"{payload['status']}_{payload['tenant_id']}_{payload['artifact_id']}.json"
    path = ARTIFACT_DIR / fname

    with open(path, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"📜 Artifact written: {path}")

def emit_override(original_artifact_id, actor, reason):
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
