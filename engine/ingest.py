import csv

def ratio_to_milli(numer: int, denom: int) -> int:
    if denom <= 0:
        return 0
    q, r = divmod(numer * 1000, denom)
    if r * 2 >= denom:
        q += 1
    return int(q)

def load_portfolio(csv_path: str):
    records = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total = len(rows)
    late = sum(1 for r in rows if (r.get("is_late", "") or "").lower() == "true")
    portfolio_late_rate_milli = ratio_to_milli(late, total)

    for r in rows:
        records.append({
            "tenant_id": r["tenant_id"],
            "due_date": r["due_date"],
            "late_count_window": int(r["late_count_window"]),
            "days_since_eligible_filing": int(r["days_since_eligible_filing"]),
            "portfolio_late_rate_milli": portfolio_late_rate_milli,
        })

    return records
