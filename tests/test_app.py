import base64
from datetime import date
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest

from backend.validation import MAX_SIGNATURE_BYTES, safe_filename_component, validate_payload


def _payload_with_workers(signature: str, sign_date: str | None = None):
    payload = {
        "project": "Test Project",
        "workers": [
            {
                "name": "Alice",
                "signature": signature,
            }
        ],
    }
    if sign_date is not None:
        payload["signDate"] = sign_date
    return payload


def test_missing_required_fields():
    with pytest.raises(ValueError):
        validate_payload({"project": "Demo"})


def test_duplicate_worker_names_case_insensitive():
    sig = base64.b64encode(b"sig").decode()
    payload = {
        "project": "Demo",
        "workers": [
            {"name": "Bob", "signature": sig},
            {"name": "bob", "signature": sig},
        ],
    }
    with pytest.raises(ValueError):
        validate_payload(payload)


def test_signature_with_data_url_prefix_decodes():
    raw = base64.b64encode(b"signature-bytes").decode()
    payload = _payload_with_workers(f"data:image/png;base64,{raw}")
    project, sign_date, workers = validate_payload(payload)
    assert project == "Test Project"
    assert isinstance(sign_date, date)
    assert workers[0]["signature_bytes"] == b"signature-bytes"


def test_oversized_signature_rejected():
    too_large = base64.b64encode(b"x" * (MAX_SIGNATURE_BYTES + 1)).decode()
    payload = _payload_with_workers(too_large)
    with pytest.raises(ValueError):
        validate_payload(payload)


def test_invalid_sign_date_rejected():
    raw = base64.b64encode(b"sig").decode()
    payload = _payload_with_workers(raw, sign_date="2024-13-01")
    with pytest.raises(ValueError):
        validate_payload(payload)


def test_safe_filename_component_sanitizes():
    assert safe_filename_component("Proj:One/Two") == "Proj_One_Two"
    assert safe_filename_component("...") == "document"
