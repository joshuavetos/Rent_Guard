# RentGuard

RentGuard is an automated enforcement system used to apply consistent, predefined rent enforcement rules across a rental portfolio. It does not generate legal decisions; it enforces timing and process consistency to generate court-defensible artifacts.
API flows and Judge Packets operate fully in-memory. Disk persistence is optional and explicitly enabled only for batch or CLI workflows that request it.

## Genesis Governance Warnings

- Genesis artifacts in `/protocol` and `/sysdna/core` are immutable. Any modification requires a fork, not a direct edit.
- History is append-only; residue schemas are versioned by addition only.
- Violations of immutability or append-only rules invalidate trust in generated artifacts.
- Optional protection: set `git config core.hooksPath .githooks` to enable the provided pre-commit guard that blocks staged edits under `/protocol` and `/sysdna/core`.

## Usage

**Single Record (JSON):**
`python run.py examples/delayed_filing.json`

**Portfolio Batch (CSV) with Overrides:**
`python run.py examples/portfolio.csv --late-days 5 --repeat 2`

## Force Override Doctrine

RentGuard is designed to remove discretion after defined thresholds are crossed. However, RentGuard does not prevent a human from acting against policy. When a human chooses to override RentGuard, the system requires a **Force Override**.

### What a Force Override Is
A Force Override is a deliberate, recorded decision by a named individual to proceed despite a RentGuard refusal. It does not disable RentGuard. It does not erase the refusal. It adds liability, rather than hiding it.

### When Required
A Force Override is required when:
* RentGuard has refused an action, and
* A human chooses to proceed anyway (e.g., delaying filing beyond the allowed window).

### The Artifact
When a Force Override occurs, RentGuard generates a separate, immutable artifact that records:
1. The original refusal.
2. The name of the human who overrode it.
3. The stated reason for the override.
4. The time and date of the decision.

## The Judge Packet

RentGuard outputs are designed to be zipped into a "Judge Packet" containing:
1. **System Overview:** Explanation of automated consistency.
2. **Tenant History:** Objective payment/lateness data.
3. **Refusal Artifact:** The machine-generated block proving policy was followed.
4. **Force Override (Optional):** The liability transfer record.
5. **Timeline:** A clear sequence of events.

## Validation Status

RentGuard v1.0 has been independently executed against example inputs.
The system successfully produced deterministic enforcement artifacts
without runtime errors or external dependencies.

See `validation/codex_execution_report.md` for execution details.

## Signature Capture Engine (Contract)

The `/backend` signature capture service accepts a JSON payload and generates a PDF containing worker signatures. The contract is intentionally explicit for callers:

- **Payload schema**
  - `project` (string, required, non-empty)
  - `workers` (array, required, at least one)
    - each worker: `name` (string, required, case-insensitive unique) and `signature` (base64 string; `data:` URLs allowed)
  - `signDate` (string, optional ISO-8601 `YYYY-MM-DD`; defaults to today)
- **Rejection rules**
  - structural issues (missing/empty fields, wrong types, bad `signDate`) raise `PayloadShapeError`
  - signature decoding/size issues raise `SignatureError`
  - semantic conflicts such as duplicate worker names raise `ValidationError`
- **Engine guarantees**
  - returns canonicalized data: trimmed project, a `date` instance, and a worker list sorted case-insensitively by name to keep PDFs deterministic
  - rejects signatures over `MAX_SIGNATURE_BYTES` and empty signature content
  - Given identical validated payloads, RentGuard guarantees byte-identical PDF output across runs.

## Web & API

The repository includes a FastAPI service and a Next.js 14 web dashboard.

- **Local Development**
  - API: `uvicorn api.index:app --reload`
  - Web: `cd web && npm install && npm run dev`
- **Production / Vercel**
  - Push the repository to Vercel. The included `vercel.json` routes `/api/*` to the FastAPI entrypoint and deploys the Next.js app from `web/`.
