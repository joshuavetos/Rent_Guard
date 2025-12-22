import csv


def load_portfolio(csv_path: str):
    records = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total = len(rows)
    late = sum(1 for r in rows if r.get("is_late", "").strip().lower() == "true")
    portfolio_late_rate = (late / total) if total else 0.0

    for r in rows:
        records.append({
            "tenant_id": r["tenant_id"],
            "due_date": r["due_date"],
            "late_count_window": int(r["late_count_window"]),
            "days_since_eligible_filing": int(r["days_since_eligible_filing"]),
            "portfolio_late_rate": float(portfolio_late_rate),
        })

    return records
