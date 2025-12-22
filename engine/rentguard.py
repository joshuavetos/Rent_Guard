from datetime import date, datetime
from engine.rules import ACTIVE
from engine.residue import emit_decision

def days_between(a, b):
    return (b - a).days

def evaluate(record):
    today = date.today()
    rule_path = []

    due = datetime.fromisoformat(record["due_date"]).date()
    days_late = days_between(due, today)

    # RG-MASS-ANOMALY
    rule_path.append("RG-MASS-ANOMALY")
    if record["portfolio_late_rate_milli"] > ACTIVE["N_PORTFOLIO_RATE_MILLI"]:
        emit_decision(
            status="REFUSED",
            tenant_id=record["tenant_id"],
            rule_id="RG-MASS-ANOMALY",
            rule_name="Portfolio Integrity Breach",
            decision="ENFORCEMENT_REFUSED",
            rule_path=rule_path,
            context=record,
            explanation="Abnormally high portfolio lateness suggests systemic or data error.",
        )
        return

    # RG-LATE-X
    rule_path.append("RG-LATE-X")
    if days_late > ACTIVE["X_DAYS_LATE"]:
        # RG-REPEAT-Y
        rule_path.append("RG-REPEAT-Y")
        if record["late_count_window"] >= ACTIVE["Y_REPEAT"]:
            # RG-DELAY-BLOCK
            rule_path.append("RG-DELAY-BLOCK")
            if record["days_since_eligible_filing"] > ACTIVE["Z_MAX_DELAY"]:
                emit_decision(
                    status="REFUSED",
                    tenant_id=record["tenant_id"],
                    rule_id="RG-DELAY-BLOCK",
                    rule_name="Filing Delay Exceeded",
                    decision="FILING_DELAY_REFUSED",
                    rule_path=rule_path,
                    context=record,
                    explanation="Filing delayed beyond allowable window.",
                )
                return

        emit_decision(
            status="APPROVED",
            tenant_id=record["tenant_id"],
            rule_id="RG-LATE-X",
            rule_name="Notice Required",
            decision="NOTICE_MANDATED",
            rule_path=rule_path,
            context=record,
            explanation="Tenant late beyond threshold.",
        )
        return

    # RG-OK
    rule_path.append("RG-OK")
    emit_decision(
        status="APPROVED",
        tenant_id=record["tenant_id"],
        rule_id="RG-OK",
        rule_name="Within Policy",
        decision="NO_ACTION",
        rule_path=rule_path,
        context=record,
        explanation="Tenant within acceptable bounds.",
    )
