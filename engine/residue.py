import datetime
import json
import logging
import os
import hashlib
import uuid
from pathlib import Path
from typing import Any, Dict

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from engine.rules import ACTIVE

ARTIFACT_DIR = Path("artifacts")
logger = logging.getLogger(__name__)


def _upload_to_s3(content: str, tenant_id: str, timestamp: str) -> None:
    bucket_name = os.environ.get("S3_BUCKET_NAME")
    if not bucket_name:
        logger.warning("S3_BUCKET_NAME not configured; skipping residue upload.")
        return

    content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
    key = f"residue/{tenant_id}/{timestamp}_{content_hash}.json"
    client = boto3.client("s3")
    try:
        client.put_object(Bucket=bucket_name, Key=key, Body=content, ContentType="application/json")
    except (BotoCoreError, ClientError) as exc:
        logger.warning("Residue upload failed: %s", exc)


def emit(payload: Dict[str, Any], persist: bool = False):
    payload["artifact_id"] = str(uuid.uuid4())
    payload["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"

    payload["thresholds"] = ACTIVE

    serialized = json.dumps(payload, indent=2)

    if persist:
        ARTIFACT_DIR.mkdir(exist_ok=True)
        fname = f"{payload['status']}_{payload['tenant_id']}_{payload['artifact_id']}.json"
        path = ARTIFACT_DIR / fname

        with open(path, "w") as f:
            f.write(serialized)

        print(f"📜 Artifact written: {path}")

    _upload_to_s3(serialized, str(payload.get("tenant_id", "tenant")), payload["timestamp"])

    return payload


def emit_override(original_artifact_id: str, actor: str, reason: str):
    payload = {
        "status": "FORCE_OVERRIDE",
        "engine": "rentguard",
        "original_artifact_id": original_artifact_id,
        "actor": actor,
        "decision": "HUMAN_OVERRIDE",
        "human_override": True,
        "reason": reason,
    }
    emit(payload, persist=True)
