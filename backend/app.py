import base64
import hashlib
import io
import json
import logging
import threading
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List

from flask import Flask, jsonify, request
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

from backend.validation import (
    PayloadShapeError,
    SignatureError,
    ValidationError,
    safe_filename_component,
    validate_payload,
)

OUTPUT_DIR = Path(__file__).resolve().parent / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

_today_signins: Dict[str, set[str]] = {}
_signin_lock = threading.Lock()


def _canonical_payload(project: str, sign_date: date, workers: List[Dict[str, bytes]]) -> Dict[str, object]:
    return {
        "project": project,
        "signDate": sign_date.isoformat(),
        "workers": [
            {
                "name": worker["name"],
                "signature": base64.b64encode(worker["signature_bytes"]).decode("ascii"),
            }
            for worker in workers
        ],
    }


def _log_with_context(level: int, message: str, *, project: str, sign_date: date, step: str) -> None:
    logging.log(
        level,
        message,
        extra={
            "project": project,
            "sign_date": sign_date.isoformat(),
            "timestamp": datetime.utcnow().isoformat(),
            "step": step,
        },
    )


def _record_signins(sign_date: date, worker_names: List[str]) -> None:
    date_key = sign_date.isoformat()
    with _signin_lock:
        existing = _today_signins.setdefault(date_key, set())
        for name in worker_names:
            existing.add(name)


def _build_pdf(project: str, sign_date: date, workers: List[Dict[str, bytes]], *, artifact_id: str | None = None) -> Path:
    filename_base = f"{safe_filename_component(project)}_{safe_filename_component(sign_date.isoformat())}"
    if artifact_id:
        filename_base = f"{filename_base}_{artifact_id}"
    filename = f"{filename_base}.pdf"
    pdf_path = OUTPUT_DIR / filename

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    margin = 0.75 * inch
    y = height - margin
    line_height = 1.5 * inch

    for worker in workers:
        if y - line_height < margin:
            pdf.showPage()
            y = height - margin

        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(margin, y, f"Name: {worker['name']}")
        y -= 0.35 * inch

        sig_image = ImageReader(io.BytesIO(worker["signature_bytes"]))
        max_width = width - (2 * margin)
        sig_width, sig_height = sig_image.getSize()
        scale = min(max_width / sig_width, 1)
        render_height = sig_height * scale

        if y - render_height < margin:
            pdf.showPage()
            y = height - margin

        pdf.drawImage(sig_image, margin, y - render_height, width=sig_width * scale, height=render_height)
        y -= render_height + 0.5 * inch

    pdf.save()
    buffer.seek(0)

    with pdf_path.open("wb") as f:
        f.write(buffer.read())

    return pdf_path


@app.route("/sign", methods=["POST"])
def sign():
    steps: List[str] = []
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Invalid JSON payload.", "steps": steps}), 400
    context_project = payload.get("project", "unknown") if isinstance(payload, dict) else "unknown"
    context_sign_date = date.today()

    try:
        project, sign_date, workers = validate_payload(payload)
        steps.append("validated_payload")
        canonical_payload = _canonical_payload(project, sign_date, workers)
        artifact_id = hashlib.sha256(
            json.dumps(canonical_payload, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
    except PayloadShapeError as exc:
        steps.append("validation_failed")
        _log_with_context(logging.ERROR, "payload_validation_failed", project=str(context_project), sign_date=context_sign_date, step="validate")
        logging.exception("payload_validation_failed")
        return jsonify({"error": str(exc), "type": "payload", "steps": steps}), 400
    except SignatureError as exc:
        steps.append("validation_failed")
        _log_with_context(logging.ERROR, "payload_validation_failed", project=str(context_project), sign_date=context_sign_date, step="validate")
        logging.exception("payload_validation_failed")
        return jsonify({"error": str(exc), "type": "signature", "steps": steps}), 422
    except ValidationError as exc:
        steps.append("validation_failed")
        _log_with_context(logging.ERROR, "payload_validation_failed", project=str(context_project), sign_date=context_sign_date, step="validate")
        logging.exception("payload_validation_failed")
        return jsonify({"error": str(exc), "type": "semantic", "steps": steps}), 409

    try:
        pdf_path = _build_pdf(project, sign_date, workers, artifact_id=artifact_id)
        steps.append("pdf_generated")
    except Exception as exc:  # pragma: no cover - runtime safety
        _log_with_context(logging.ERROR, "pdf_generation_failed", project=project, sign_date=sign_date, step="pdf")
        logging.exception("pdf_generation_failed")
        return jsonify({"error": "Failed to generate PDF.", "steps": steps}), 500

    try:
        _record_signins(sign_date, [w["name"] for w in workers])
        steps.append("signins_recorded")
    except Exception:  # pragma: no cover - best effort
        _log_with_context(logging.WARNING, "signin_record_failed", project=project, sign_date=sign_date, step="today-signins")
        logging.exception("signin_record_failed")

    _log_with_context(logging.INFO, "sign_request_completed", project=project, sign_date=sign_date, step="complete")
    return jsonify({"message": "Signatures captured.", "pdf": pdf_path.name, "artifact_id": artifact_id, "steps": steps})


@app.route("/today-signins", methods=["GET"])
def today_signins():
    today_key = date.today().isoformat()
    with _signin_lock:
        names = sorted(_today_signins.get(today_key, set()))
    return jsonify({"date": today_key, "workers": names})


if __name__ == "__main__":  # pragma: no cover
    app.run(host="0.0.0.0", port=8000)
