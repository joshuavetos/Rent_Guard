import json, sys, argparse
from engine.rentguard import evaluate
from engine.rules import configure
from engine.ingest import load_portfolio

# CLI Configuration
parser = argparse.ArgumentParser(description="RentGuard Enforcement Engine")
parser.add_argument("file", help="Path to JSON record or CSV portfolio")
parser.add_argument("--late-days", type=int, help="Override X_DAYS_LATE")
parser.add_argument("--repeat", type=int, help="Override Y_REPEAT")
parser.add_argument("--max-delay", type=int, help="Override Z_MAX_DELAY")

args = parser.parse_args()

# Apply Runtime Overrides
overrides = {}
if args.late_days: overrides["X_DAYS_LATE"] = args.late_days
if args.repeat: overrides["Y_REPEAT"] = args.repeat
if args.max_delay: overrides["Z_MAX_DELAY"] = args.max_delay

configure(overrides)

# Execution Strategy
if args.file.endswith(".csv"):
    records = load_portfolio(args.file)
    print(f"Loading portfolio: {len(records)} records found.")
    for r in records:
        evaluate(r)
else:
    with open(args.file) as f:
        record = json.load(f)
    evaluate(record)
