import csv
from typing import Dict, List

REQUIRED_FIELDS = {"tenant_id", "due_date", "balance"}


def _parse_balance(raw: str) -> float:
    try:
        return float(raw)
    except (TypeError, ValueError):
        return 0.0


def load_portfolio(csv_path: str) -> List[Dict]:
    with open(csv_path) as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    missing = REQUIRED_FIELDS - set(reader.fieldnames or [])
    if missing:
        raise ValueError(f"CSV is missing required columns: {', '.join(sorted(missing))}")

    total = len(rows)
    late = sum(1 for r in rows if r.get("is_late", "").lower() == "true")
    portfolio_late_rate = late / total if total else 0

    records = []
    for row in rows:
        records.append({
            "tenant_id": row["tenant_id"],
            "due_date": row["due_date"],
            "balance": _parse_balance(row.get("balance")),
            "late_count_window": int(row.get("late_count_window", 0) or 0),
            "days_since_eligible_filing": int(row.get("days_since_eligible_filing", 0) or 0),
            "portfolio_late_rate": portfolio_late_rate,
        })

    return records
