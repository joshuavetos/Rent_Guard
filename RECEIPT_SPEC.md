Receipt Spec v1.0.3

Purpose
A receipt is a byte-stable, replayable record of what the system accepted and what it produced.

Hard requirements
1. Canonical JSON
   - json.dumps(..., sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
2. Numbers in receipts
   - All numeric values that represent user inputs or evaluated thresholds MUST be encoded as integers.
   - Convention: millipoints (value * 1000).
   - Example: 1.234 becomes 1234.
3. Gate decisions must be explicit
   - Any interactive or conditional clamp/branch MUST be recorded as a boolean or enum in the receipt.
   - Example: ambiguity_deliberate true/false, clamped true/false.
4. Deterministic IDs
   - Any “decision_id” or “receipt_id” MUST be sha256 of the canonical receipt payload with no timestamps or UUIDs.
   - Timestamps may exist in an outer envelope, but not inside the deterministic payload.
5. Replay invariant
   - A verifier must be able to feed the receipt’s “inputs_milli” (or equivalent) into the evaluation logic and reproduce the “final” fields.

Schema template
{
  "receipt_spec": "1.0.3",
  "product": "<name>",
  "product_version": "<version>",
  "decision_id": "<sha256(canonical(payload_without_decision_id))>",
  "inputs_milli": { "<field>": <int>, ... },
  "gates": { "<gate_name>": <bool|enum|object>, ... },
  "outputs": { "<field>": <scalar>, ... },
  "artifacts": { "<field>": "<hash|path>", ... }
}
