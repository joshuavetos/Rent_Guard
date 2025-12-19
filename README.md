# RentGuard

RentGuard is an automated enforcement system used to apply consistent, predefined rent enforcement rules across a rental portfolio. It does not generate legal decisions; it enforces timing and process consistency to generate court-defensible artifacts.

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

## Web & API

The repository includes a FastAPI service and a Next.js 14 web dashboard.

- **Local Development**
  - API: `uvicorn api.index:app --reload`
  - Web: `cd web && npm install && npm run dev`
- **Production / Vercel**
  - Push the repository to Vercel. The included `vercel.json` routes `/api/*` to the FastAPI entrypoint and deploys the Next.js app from `web/`.
