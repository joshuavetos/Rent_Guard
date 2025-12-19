from datetime import date, datetime
from engine.rules import ACTIVE
from engine.residue import emit

def days_between(a, b):
    return (b - a).days

def evaluate(record):
    today = date.today()

    days_late = days_between(
        datetime.fromisoformat(record["due_date"]).date(),
        today
    )

    # RG-MASS-ANOMALY
    if record["portfolio_late_rate"] > ACTIVE["N_PORTFOLIO_RATE"]:
        return emit({
            "status": "REFUSED",
            "engine": "rentguard",
            "tenant_id": record["tenant_id"],
            "rule_id": "RG-MASS-ANOMALY",
            "rule_name": "Portfolio Integrity Breach",
            "decision": "ENFORCEMENT_REFUSED",
            "context": record,
            "human_override": False,
            "explanation": "Abnormally high portfolio lateness suggests systemic or data error."
        })
        return

    # RG-LATE-X
    if days_late > ACTIVE["X_DAYS_LATE"]:
        if record["late_count_window"] >= ACTIVE["Y_REPEAT"]:
            # RG-REPEAT-Y
            if record["days_since_eligible_filing"] > ACTIVE["Z_MAX_DELAY"]:
                # RG-DELAY-BLOCK
                return emit({
                    "status": "REFUSED",
                    "engine": "rentguard",
                    "tenant_id": record["tenant_id"],
                    "rule_id": "RG-DELAY-BLOCK",
                    "rule_name": "Filing Delay Exceeded",
                    "decision": "FILING_DELAY_REFUSED",
                    "context": record,
                    "human_override": False,
                    "explanation": "Filing delayed beyond allowable window."
                })
                return

        return emit({
            "status": "APPROVED",
            "engine": "rentguard",
            "tenant_id": record["tenant_id"],
            "rule_id": "RG-LATE-X",
            "rule_name": "Notice Required",
            "decision": "NOTICE_MANDATED",
            "context": record,
            "human_override": False,
            "explanation": "Tenant late beyond threshold."
        })
        return

    return emit({
        "status": "APPROVED",
        "engine": "rentguard",
        "tenant_id": record["tenant_id"],
        "rule_id": "RG-OK",
        "rule_name": "Within Policy",
        "decision": "NO_ACTION",
        "context": record,
        "human_override": False,
        "explanation": "Tenant within acceptable bounds."
    })
