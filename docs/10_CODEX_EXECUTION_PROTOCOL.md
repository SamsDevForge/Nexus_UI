# Codex Execution Protocol for NEXUS AI

## Purpose

Use Codex as an implementation partner with explicit context, phase boundaries,
and visual verification. Do not rely on one enormous “build NEXUS” prompt.

## Repository setup

Copy into the project:

- `AGENTS.md`
- The complete `docs/` directory
- The `prompts/` directory

Codex should automatically read `AGENTS.md`. Prompts must still name the
specific phase and relevant documents.

## One-phase workflow

### Before implementation

Ask Codex to:

1. Read `AGENTS.md`.
2. Read the roadmap and relevant phase documents.
3. Inspect the repository and current UI.
4. State detected stack, working commands, and conflicts.
5. Record assumptions that materially affect the product.

Do not require it to wait for approval unless a missing decision genuinely
changes the result.

### During implementation

Codex should:

- Preserve unrelated work.
- Implement only the requested phase.
- Keep mock/live boundaries.
- Use existing components when they satisfy the design system.
- Replace weak components when they do not.
- Update tests with behaviour.
- Keep the app runnable.

### Visual work

Codex should:

- Run the application.
- Inspect screenshots, not only source code.
- Use deterministic mock scenarios.
- Compare desktop and narrow layouts.
- Implement the UI audit’s highest-impact issues.
- Repeat until the phase gate passes.

### After implementation

Codex should:

- Run typecheck, lint, tests, and build.
- Report any command not available.
- Update `docs/PROGRESS.md`.
- Record durable decisions in `docs/15_DECISIONS.md`.
- State what remains mocked.
- Name the next phase without starting it.

## Prompt structure

Every implementation prompt should include:

1. **Phase and objective**
2. **Documents to read**
3. **Current known state**
4. **In-scope deliverables**
5. **Explicitly out-of-scope work**
6. **Required scenarios and states**
7. **Visual verification**
8. **Engineering verification**
9. **Acceptance criteria**
10. **Completion report**

## Working with screenshots

When the UI is disappointing, provide Codex:

- The screenshot
- The route and viewport
- What feels wrong in plain language
- The design-system file
- Permission to restructure rather than merely restyle

Ask it to diagnose visible causes before editing. A screenshot gives stronger
feedback than “make it premium.”

## Git discipline

Recommended:

- One branch or checkpoint per phase
- Intentional commits
- No destructive resets
- No unrelated formatting rewrite
- Verify clean build before phase handoff

## Documentation discipline

### `PROGRESS.md`

Update:

- Current phase
- Completed acceptance criteria
- Known limitations
- Mock/live status
- Next phase

### `15_DECISIONS.md`

Add only durable choices:

- Framework migration
- Provider order
- Data retention
- Permission defaults
- Domain-contract changes
- Design-language changes

Do not fill it with routine implementation notes.

## Custom skills

Use:

- `$build-nexus-ai` for roadmap-aware feature implementation
- `$polish-nexus-ui` for screenshot-based visual diagnosis and improvement

The skills reduce repeated context, but project files remain the source of
truth. Update project documentation when product decisions change.

## What not to ask Codex to do

- “Build all phases now.”
- “Use AI wherever possible.”
- “Make everything autonomous.”
- “Improve the UI” without screenshots or criteria.
- “Connect Gmail” without a permission, retention, and revocation plan.
- “Train the AI” without a dataset, baseline, metric, and reason.
- “Use RAG for all user data.”

## Handoff format

A good Codex phase response should contain:

- Outcome first
- Important files changed
- Visible result
- Validation
- Remaining mock boundaries
- Known limitations
- Next phase
