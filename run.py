import argparse
import json

from engine.rentguard import evaluate
from engine.rules import configure
from engine.ingest import load_portfolio

parser = argparse.ArgumentParser(description="RentGuard Enforcement Engine")
parser.add_argument("file", help="Path to JSON record or CSV portfolio")
parser.add_argument("--late-days", type=int, help="Override X_DAYS_LATE")
parser.add_argument("--repeat", type=int, help="Override Y_REPEAT")
parser.add_argument("--max-delay", type=int, help="Override Z_MAX_DELAY")
args = parser.parse_args()

overrides = {}
if args.late_days is not None:
    overrides["X_DAYS_LATE"] = args.late_days
if args.repeat is not None:
    overrides["Y_REPEAT"] = args.repeat
if args.max_delay is not None:
    overrides["Z_MAX_DELAY"] = args.max_delay

configure(overrides)

if args.file.endswith(".csv"):
    records = load_portfolio(args.file)
    print(f"Loading portfolio: {len(records)} records found.")
    for r in records:
        evaluate(r)
else:
    with open(args.file, encoding="utf-8") as f:
        record = json.load(f)
    evaluate(record)
