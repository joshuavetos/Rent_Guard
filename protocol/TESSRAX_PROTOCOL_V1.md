STATUS: IMMUTABLE — CHANGES REQUIRE FORK
TESSRAX PROTOCOL SPECIFICATION
Version: 1.0.0 (Genesis)
Date: December 20, 2025
Epoch: 0

SECTION 1 — AXIOMS

Axiom 1: Narrative Latency Is Failure  
Any delay between an action and its immutable record creates a narrative gap in which failure may be hidden. Tessrax eliminates narrative latency by requiring that every governed action emit cryptographic residue at execution time.

Axiom 2: Reversibility Is the Constraint  
Governance is not permission-based. Governance is determined by the cost of reversal. Actions with irreversible consequences must be gated, escalated, or refused.

Axiom 3: Residue Is Truth  
If an event emits no cryptographic residue, it is treated as non-existent for governance, audit, and enforcement purposes.

SECTION 2 — STACK DEFINITION

Layer 1 — SysDNA (The Law)  
A declarative definition of structural invariants and jurisdictional rules expressed as JSON. SysDNA defines what executions are possible.

Layer 2 — Kernel (The Executive)  
A deterministic runtime that enforces SysDNA invariants. The kernel may refuse execution. Refusal is a valid and successful outcome.

Layer 3 — Residue (The Evidence)  
An append-only ledger of execution receipts. Each receipt binds inputs, kernel identity, outputs, and signatures.

Layer 4 — Federation (The Witness)  
Third-party verification of execution via public anchoring or zero-knowledge proofs.

SECTION 3 — FORCE OVERRIDE DOCTRINE

A human actor may override kernel refusal if and only if:
1. The actor signs the override using a private key.
2. The system emits a FORCE_OVERRIDE residue transferring liability to the actor.
3. The cost of override is recorded and non-reversible.

SECTION 4 — GENESIS JURISDICTIONS

Authorized kernels at Epoch 0:
- RentGuard
- ValuGuard

This document is immutable. Changes require a fork.
