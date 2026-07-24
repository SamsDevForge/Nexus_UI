# NEXUS AI Repository Instructions

These instructions govern all work in this repository.

## Source of truth

Before changing the product, read:

1. `docs/00_START_HERE.md`
2. `docs/01_PRODUCT_BLUEPRINT.md`
3. `docs/02_FULL_PHASE_ROADMAP.md`
4. `docs/03_INFORMATION_ARCHITECTURE.md`
5. `docs/04_DESIGN_SYSTEM.md`
6. The document relevant to the requested phase

If code and documentation disagree, stop and record the discrepancy in
`docs/15_DECISIONS.md` before making a product-level assumption.

## Current strategy

- Build the complete website UI with typed mock data before connecting live services.
- Build the desktop website first and the Android application after the web experience is stable.
- Preserve the cinematic NEXUS landing page, but optimize product screens for clarity and daily use.
- Treat the cube as a meaningful system-state object, not decoration.
- Use n8n for orchestration and integration prototypes, not as the system of record or permission authority.
- Use deterministic code for time, traffic, permissions, conflicts, thresholds, and action safety.
- Use an LLM for language understanding, synthesis, explanations, planning, and tool selection.
- Use RAG only when private knowledge must be retrieved.
- Default to suggestion or approval; never silently expand automatic-action authority.

## Phase discipline

- Implement only the requested phase and its explicit prerequisites.
- Do not quietly start later phases.
- Keep future controls backed by typed mock adapters until their real integration phase.
- Every phase must end with its acceptance criteria passing.
- Update `docs/PROGRESS.md` and `docs/15_DECISIONS.md` when implementation changes project state or a durable decision.

## Frontend quality

- Do not produce a generic dashboard, card grid, chatbot clone, or blue-purple AI template.
- Use the design tokens and motion language in `docs/04_DESIGN_SYSTEM.md`.
- Maintain one dominant focal point per screen.
- Avoid card soup. Prefer hierarchy, spacing, dividers, grouped rows, and progressive disclosure.
- Include loading, empty, error, stale, disconnected, permission-denied, offline, and success states.
- The public landing page must not scroll at the primary presentation viewport. Product pages may and should scroll when the content requires it.
- Verify desktop and mobile-width layouts even during the website phase.
- Respect `prefers-reduced-motion`, keyboard navigation, focus visibility, contrast, and semantic structure.

## Engineering quality

- Inspect the repository before choosing or changing frameworks.
- Preserve useful existing code and unrelated user changes.
- Prefer TypeScript for frontend code and explicit schemas for boundaries.
- Keep UI components, domain logic, service adapters, and mock fixtures separate.
- All external providers must sit behind provider-neutral interfaces.
- Never expose secrets, OAuth tokens, health data, email bodies, or location history in logs.
- Add or update tests for domain logic and important interactions.
- Run the relevant typecheck, lint, tests, and production build before declaring a phase complete.
- Visually inspect meaningful UI changes at representative desktop and narrow viewports.

## Completion report

At the end of a phase, report:

1. What visibly changed
2. What architecture was added
3. What remains mocked
4. Validation performed
5. Known limitations
6. The exact next phase, without implementing it
