# NEXUS AI Codex Phase Prompt Template

Replace bracketed fields and use one phase at a time.

---

Use `$build-nexus-ai`.

Implement **NEXUS AI Phase [NUMBER]: [NAME]**.

This is an implementation task. Inspect the repository, make the changes,
validate them, and update project progress. Do not stop after writing a plan.

## Read first

- `AGENTS.md`
- `docs/00_START_HERE.md`
- `docs/01_PRODUCT_BLUEPRINT.md`
- `docs/02_FULL_PHASE_ROADMAP.md`
- `[PHASE-SPECIFIC DOCUMENTS]`
- `docs/12_ACCEPTANCE_GATES.md`
- `docs/15_DECISIONS.md`
- `docs/PROGRESS.md`

## Current state

[State from the last phase, including what is mocked and what is live.]

## Objective

[One precise outcome.]

## In scope

- [Deliverable]
- [Deliverable]
- [Required states]
- [Tests]

## Out of scope

- [Later phase]
- [Later integration]
- [Risky action not yet authorized]

## Required scenarios

- [Normal]
- [Empty]
- [Failure]
- [Permission]
- [Offline/stale if relevant]

## Visual verification

If this phase changes UI, use `$polish-nexus-ui`, inspect representative
desktop and narrow-width renders, implement P0/P1 findings, and verify again.

## Engineering verification

Run typecheck, lint, tests, and production build. Add phase-specific contract,
integration, retrieval, permission, or agent scenario tests.

## Acceptance criteria

- [Criterion from roadmap]
- [Criterion from acceptance gates]
- [Project-specific criterion]

## Documentation

Update `docs/PROGRESS.md` and add only durable choices to
`docs/15_DECISIONS.md`.

## Completion

Lead with the outcome, then list important files, tests, mock/live boundaries,
known limitations, and the next phase. Do not implement the next phase.
