import base64
import binascii
import re
from datetime import date
from typing import Dict, List, Tuple


class ValidationError(ValueError):
    """Base error for payload validation failures."""


class PayloadShapeError(ValidationError):
    """Raised when the payload structure or field values are malformed."""


class SignatureError(ValidationError):
    """Raised when signatures are missing, invalid, or exceed limits."""

MAX_SIGNATURE_BYTES = 200_000


def safe_filename_component(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]", "_", value or "")
    cleaned = cleaned.strip("._")
    return cleaned or "document"


def _strip_data_url(signature: str) -> str:
    if not isinstance(signature, str):
        raise SignatureError("Signature must be a string.")
    if signature.startswith("data:"):
        try:
            return signature.split(",", 1)[1]
        except IndexError as exc:  # pragma: no cover - defensive
            raise SignatureError("Invalid data URL for signature.") from exc
    return signature


def decode_signature(signature: str) -> bytes:
    payload = _strip_data_url(signature).strip()
    try:
        decoded = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise SignatureError("Signature must be valid base64.") from exc
    if not decoded:
        raise SignatureError("Signature content was empty.")
    if len(decoded) > MAX_SIGNATURE_BYTES:
        raise SignatureError("Signature exceeds maximum allowed size.")
    return decoded


def validate_payload(payload: dict) -> Tuple[str, date, List[Dict[str, bytes]]]:
    """
    Validate and canonicalize the signature capture payload.

    Contract (input schema)
    - payload: JSON object with required keys:
      - project (string, non-empty)
      - workers (non-empty list of objects)
      - signDate (optional ISO-8601 date string)
    - each worker object requires:
      - name (string, non-empty, case-insensitive unique across workers)
      - signature (base64 string; data URLs are accepted)

    Rejection rules
    - structural issues (wrong types, missing fields, empty values) raise PayloadShapeError
    - signature decoding failures or size limits raise SignatureError
    - semantic conflicts (duplicate worker names) raise ValidationError

    Guarantees (output contract)
    - returns (project, sign_date, workers) where:
      - project is a trimmed string
      - sign_date is a date instance (defaults to today when omitted)
      - workers is a deterministic, name-sorted list of {"name", "signature_bytes"}
    - worker ordering is canonicalized (case-insensitive sort) to keep PDF output stable
    """

    if not isinstance(payload, dict):
        raise PayloadShapeError("Payload must be a JSON object.")

    required_fields = ("project", "workers")
    for field in required_fields:
        if field not in payload:
            raise PayloadShapeError(f"Missing required field: {field}")

    project = str(payload["project"]).strip()
    if not project:
        raise PayloadShapeError("Project must be a non-empty string.")

    sign_date_value = payload.get("signDate")
    if sign_date_value:
        try:
            sign_date = date.fromisoformat(sign_date_value)
        except ValueError as exc:
            raise PayloadShapeError("signDate must be in YYYY-MM-DD format.") from exc
    else:
        sign_date = date.today()

    workers = payload.get("workers")
    if not isinstance(workers, list) or not workers:
        raise PayloadShapeError("workers must be a non-empty list.")

    seen_names = set()
    validated_workers = []
    for worker in workers:
        if not isinstance(worker, dict):
            raise PayloadShapeError("Each worker must be an object.")
        name = str(worker.get("name") or "").strip()
        signature_raw = worker.get("signature")
        if not name or not signature_raw:
            raise PayloadShapeError("Each worker requires a name and signature.")

        name_key = name.lower()
        if name_key in seen_names:
            raise ValidationError("Worker names must be unique (case-insensitive).")
        seen_names.add(name_key)

        signature_bytes = decode_signature(signature_raw)
        validated_workers.append({"name": name, "signature_bytes": signature_bytes})

    validated_workers = sorted(validated_workers, key=lambda worker: worker["name"].lower())

    return project, sign_date, validated_workers
