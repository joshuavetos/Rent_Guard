import hashlib
import json
from typing import Any, Dict

RECEIPT_SPEC_VERSION = "1.0.3"

def canonical_json(obj: Any) -> str:
    return json.dumps(
        obj,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )

def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def decision_id_for(payload_without_id: Dict[str, Any]) -> str:
    return sha256_hex(canonical_json(payload_without_id)
