from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import Any, Dict

from engine.residue import emit

SYSDNA_HASH = "a7f9c2b8"
DEFINITIONS = {
    "grace_period_days": 3,
    "min_actionable_balance": 50.00,
}


def evaluate(ledger: Dict[str, Any], persist: bool = False):
    artifact: Dict[str, Any] = {
        "engine": "rentguard",
        "sysdna_hash": SYSDNA_HASH,
        "definitions": DEFINITIONS,
        "tenant_id": ledger.get("tenant_id"),
        "human_override": False,
    }

    due_date_raw = ledger.get("due_date")
    current_date_raw = ledger.get("current_date")

    try:
        due_date = datetime.fromisoformat(str(due_date_raw)).date()
    except Exception:
        artifact.update({
            "status": "FORCE_OVERRIDE_REQUIRED",
            "decision": "DATE_UNDETERMINED",
            "action": "HUMAN_REVIEW",
            "explanation": "System could not determine due date; human override required.",
        })
        return emit(artifact, persist=persist)

    try:
        current_date = datetime.fromisoformat(str(current_date_raw)).date() if current_date_raw else date.today()
    except Exception:
        artifact.update({
            "status": "FORCE_OVERRIDE_REQUIRED",
            "decision": "DATE_UNDETERMINED",
            "action": "HUMAN_REVIEW",
            "explanation": "System could not determine current date; human override required.",
        })
        return emit(artifact, persist=persist)

    balance_raw = ledger.get("balance", 0)
    try:
        balance_value = Decimal(str(balance_raw))
    except (InvalidOperation, TypeError):
        balance_value = Decimal("0")
    formatted_balance = f"{balance_value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP):.2f}"

    no_notice_raw = ledger.get("no_notice_sent", True)
    if isinstance(no_notice_raw, str):
        no_notice_flag = no_notice_raw.strip().lower() != "false"
    else:
        no_notice_flag = bool(no_notice_raw)

    artifact.update({
        "due_date": due_date.isoformat(),
        "current_date": current_date.isoformat(),
        "balance": formatted_balance,
        "no_notice_sent": no_notice_flag,
    })

    if ledger.get("human_block", False) or ledger.get("human_override", False):
        override_reason = ledger.get("override_reason")
        if not override_reason:
            artifact.update({
                "status": "FORCE_OVERRIDE_REQUIRED",
                "decision": "OVERRIDE_REASON_REQUIRED",
                "action": "REQUEST_OVERRIDE_REASON",
                "explanation": "Human blocked logic without supplying override_reason.",
            })
            return emit(artifact, persist=persist)

        artifact.update({
            "status": "FORCE_OVERRIDE",
            "decision": "HUMAN_OVERRIDE",
            "action": "LOG_FORCE_OVERRIDE",
            "override_reason": override_reason,
            "human_override": True,
            "explanation": "Human override recorded per request.",
        })
        return emit(artifact, persist=persist)

    grace_period_days = DEFINITIONS["grace_period_days"]
    min_actionable_balance = Decimal(str(DEFINITIONS["min_actionable_balance"]))
    late_condition = (
        current_date > due_date + timedelta(days=grace_period_days)
        and balance_value > min_actionable_balance
    )

    if late_condition:
        artifact.update({
            "status": "LATE",
            "decision": "ESCALATE",
            "action": "NONE",
            "days_past_due": (current_date - due_date).days,
        })
    else:
        artifact.update({
            "status": "CLEAR",
            "decision": "NO_ACTION",
            "action": "NONE",
            "days_past_due": (current_date - due_date).days,
        })

    if artifact["status"] == "LATE" and artifact["no_notice_sent"]:
        artifact.update({
            "action": "GENERATE_3_DAY_NOTICE",
            "notice_date": date.today().isoformat(),
        })

    return emit(artifact, persist=persist)
