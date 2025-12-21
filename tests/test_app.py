import base64
from datetime import date
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest

from backend.app import _build_pdf
from backend.validation import (
    MAX_SIGNATURE_BYTES,
    PayloadShapeError,
    SignatureError,
    ValidationError,
    safe_filename_component,
    validate_payload,
)


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
    with pytest.raises(PayloadShapeError):
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
    with pytest.raises(ValidationError):
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
    with pytest.raises(SignatureError):
        validate_payload(payload)


def test_invalid_sign_date_rejected():
    raw = base64.b64encode(b"sig").decode()
    payload = _payload_with_workers(raw, sign_date="2024-13-01")
    with pytest.raises(PayloadShapeError):
        validate_payload(payload)


def test_safe_filename_component_sanitizes():
    assert safe_filename_component("Proj:One/Two") == "Proj_One_Two"
    assert safe_filename_component("...") == "document"


def test_workers_are_sorted_deterministically():
    sig = base64.b64encode(b"sig").decode()
    payload = {
        "project": "Demo",
        "workers": [
            {"name": "carol", "signature": sig},
            {"name": "Alice", "signature": sig},
        ],
    }
    _, _, workers = validate_payload(payload)
    assert [w["name"] for w in workers] == ["Alice", "carol"]


def test_build_pdf_smoke(monkeypatch, tmp_path):
    png_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAEklEQVR42mP8z/C/HwAE/wJ/lrZBrgAAAABJRU5ErkJggg=="
    signature_bytes = base64.b64decode(png_base64)
    workers = [
        {"name": "Alice", "signature_bytes": signature_bytes},
        {"name": "Bob", "signature_bytes": signature_bytes},
    ]
    monkeypatch.setattr("backend.app.OUTPUT_DIR", tmp_path)
    pdf_path = _build_pdf("Demo Project", date(2024, 1, 1), workers)
    assert pdf_path.exists()
    assert pdf_path.stat().st_size > 0
