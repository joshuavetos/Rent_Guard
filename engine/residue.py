import datetime
import json
from pathlib import Path
from typing import Any, Dict, List

from engine.rules import ACTIVE
from engine.receipt import RECEIPT_SPEC_VERSION, canonical_json, decision_id_for

ARTIFACT_DIR = Path("artifacts")

def utc_now_iso() -> str:
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

def emit_decision(
    status: str,
    tenant_id: str,
    rule_id: str,
    rule_name: str,
    decision: str,
    rule_path: List[str],
    context: Dict[str, Any],
    explanation: str,
):
    ARTIFACT_DIR.mkdir(exist_ok=True)

    core = {
        "receipt_spec": RECEIPT_SPEC_VERSION,
        "product": "RentGuard",
        "product_version": "1.0",
        "decision_id": "",
        "inputs_milli": {
            "portfolio_late_rate_milli": int(context["portfolio_late_rate_milli"]),
            "x_days_late": int(ACTIVE["X_DAYS_LATE"]) * 1000,
            "y_repeat": int(ACTIVE["Y_REPEAT"]) * 1000,
            "z_max_delay": int(ACTIVE["Z_MAX_DELAY"]) * 1000,
        },
        "gates": {
            "rule_path": list(rule_path),
        },
        "outputs": {
            "status": status,
            "tenant_id": tenant_id,
            "rule_id": rule_id,
            "rule_name": rule_name,
            "decision": decision,
            "explanation": explanation,
        },
        "artifacts": {},
        "thresholds": ACTIVE,
        "context": context,
    }

    did = decision_id_for(core | {"decision_id": ""})
    core["decision_id"] = did

    envelope = {
        "timestamp_utc": utc_now_iso(),
        "payload": core,
    }

    fname = f"{status}_{tenant_id}_{did[:12]}.json"
    path = ARTIFACT_DIR / fname

    with open(path, "w", encoding="utf-8") as f:
        f.write(canonical_json(envelope))

    print(f"Artifact written: {path}")

def emit_override(original_decision_id: str, actor: str, reason: str):
    payload = {
        "receipt_spec": RECEIPT_SPEC_VERSION,
        "product": "RentGuard",
        "product_version": "1.0",
        "decision_id": "",
        "inputs_milli": {},
        "gates": {"force_override": True},
        "outputs": {
            "status": "FORCE_OVERRIDE",
            "original_decision_id": original_decision_id,
            "actor": actor,
            "reason": reason,
        },
        "artifacts": {},
    }
    did = decision_id_for(payload | {"decision_id": ""})
    payload["decision_id"] = did

    envelope = {"timestamp_utc": utc_now_iso(), "payload": payload}
    ARTIFACT_DIR.mkdir(exist_ok=True)
    path = ARTIFACT_DIR / f"FORCE_OVERRIDE_{did[:12]}.json"
    path.write_text(canonical_json(envelope), encoding="utf-8")
    print(f"Artifact written: {path}")
