# NEXUS AI — Phase 5 Codex Implementation Prompt

Use `$build-nexus-ai` and `$polish-nexus-ui`.

Implement **NEXUS AI Phase 5: Responsive, Accessible, and Motion-Complete
Website**.

This is an implementation and verification task. Inspect the existing product,
make only evidence-backed Phase 5 corrections, validate the complete website,
update the project record, create an intentional commit, and deploy the exact
accepted source privately. Do not stop after producing a plan or audit.

## Phase boundary

Phase 4 is complete at:

- Commit: `cb0b79d6ef49cb0452714d9ec7bcf3af2a7db535`
- Private Sites version: `14`
- Validation: TypeScript, ESLint, 45/45 tests, Next.js build, Sites/vinext
  build, `git diff --check`, and browser verification at 1440×900, 1024×768,
  and 390×844

Phase 4 delivered:

- Canonical state coverage across all 14 product experiences
- Independent data, source, intelligence, action, and configuration dimensions
- Route-to-state matrix under Technicals
- Deterministic recovery paths
- Global Quick Capture using `public/icons/nexus-notepad.svg`
- Manual note capture
- Editable event extraction and explicit confirmation
- Quick Capture provenance in Timeline, NEXUS Notes, and Activity

Quick Capture remains deliberately session-only and mocked. It does not monitor
the clipboard, call an LLM, write to external providers, or use durable storage.

## Read first

Read these files completely before editing:

- `AGENTS.md`
- `docs/00_START_HERE.md`
- `docs/01_PRODUCT_BLUEPRINT.md`
- `docs/02_FULL_PHASE_ROADMAP.md`
- `docs/03_INFORMATION_ARCHITECTURE.md`
- `docs/04_DESIGN_SYSTEM.md`
- `docs/10_CODEX_EXECUTION_PROTOCOL.md`
- `docs/12_ACCEPTANCE_GATES.md`
- `docs/15_DECISIONS.md`
- `docs/PROGRESS.md`
- The Phase 4 prompt and handoff when present
- `.openai/hosting.json` before any Sites action

Repository documents and current product-owner decisions override older bundled
references when they conflict.

Timebox initial discovery to ten minutes. Inspect only the current routes,
layout primitives, tokens, motion utilities, tests, build configuration, and
files directly relevant to Phase 5.

Do not scan:

- `node_modules`
- `.next`
- `dist`
- `coverage`
- `.git`
- `exfonts`
- generated build output
- unrelated assets or OneDrive metadata

Do not search repeatedly for unavailable skills or treat an unavailable skill
as a blocker. If a named skill is unavailable in this Codex environment, follow
the repository documents and this prompt directly.

## Non-negotiable preservation

- Preserve all completed Phase 0–4 functionality.
- Preserve the current approved visual direction. This is not a redesign phase.
- Preserve the existing large cross-screen cube exactly.
- The cube module, scale, position, cross-screen presence, overlap, material,
  lighting, motion, and visual dominance are locked product-owner decisions.
- Compare cube-related files with commit
  `cb0b79d6ef49cb0452714d9ec7bcf3af2a7db535`; they must remain byte-for-byte
  unchanged.
- Do not follow older guidance that suggests shrinking, masking, fading,
  confining, simplifying, or replacing the product cube.
- Preserve `exfonts/` and all 22 of its files untouched and uncommitted.
- Preserve unrelated user-owned and working-tree changes.
- Keep `public/icons/nexus-notepad.svg` as the Quick Capture icon.
- Preserve typed provider-neutral domain contracts and deterministic mock
  behaviour.
- Do not add emoji icons.

The Phase 5 roadmap item “final cube-state language” means verifying and
documenting the already accepted cube/state semantics and ensuring accessible
non-canvas status text exists. It does not authorize changing the locked cube
implementation. If a missing requirement cannot be satisfied without changing
the cube, document that exact limitation instead of modifying it.

## Objective

Bring the complete existing website to its final pre-integration quality gate:

- Responsive across desktop, laptop, tablet, and narrow screens
- Usable with keyboard and assistive technology
- Compliant with the project’s WCAG AA target
- Motion-complete without decorative excess
- Fully usable with reduced motion
- Stable under every canonical Phase 4 state
- Performance-budgeted and free of avoidable regressions
- Coherent from the cinematic landing page into the product shell

Do this without adding live integrations or changing the approved product
direction.

## 1. Establish a measured baseline

Before editing:

1. Run `git status --short`.
2. Confirm the Phase 4 commit remains in history.
3. Identify current package scripts and established validation commands.
4. Run the existing application.
5. Inspect the rendered landing page, application shell, all product routes,
   Quick Capture, and representative Phase 4 states.
6. Record the existing cube integrity reference and `exfonts/` status.
7. Record current production bundle/chunk output and any existing warning.
8. Check browser console output and hydration status.

Do not rewrite already passing areas. Diagnose visible or measurable defects
before changing code.

## 2. Responsive completion

Audit and correct the complete existing route inventory. Do not invent new
routes or features.

At minimum, inspect every existing public and product route at:

- 1440×900 desktop
- 390×844 narrow mobile

Inspect the highest-risk routes and global surfaces additionally at:

- 1280×800 laptop
- 1024×768 compact landscape/tablet
- 768×1024 tablet portrait

The high-risk set must include:

- Landing and landing-to-app transition
- Today
- Timeline
- NEXUS
- Knowledge or Search
- Automations
- Connections or Permissions
- Settings
- Technicals/state matrix
- Quick Capture open, event review, success, and failure surfaces
- Any dialog, drawer, command palette, or fixed navigation shared globally

Verify and correct:

- No horizontal overflow.
- No clipped, truncated, or unreachable essential content.
- Product routes may scroll when content requires it.
- The landing presentation has no accidental scroll at its intended viewport.
- Desktop navigation and narrow navigation preserve the same route access.
- Narrow layouts are recomposed rather than merely stacked.
- Content order keeps the highest-value decision first.
- Fixed navigation and Quick Capture never cover essential controls.
- Safe-area and bottom-navigation spacing remain usable.
- Dialogs, drawers, menus, and popovers remain within the viewport.
- Tables, timelines, filters, and evidence regions have usable narrow
  alternatives.
- Interactive targets remain at least approximately 44×44 px on touch layouts.
- Browser zoom/reflow at 200% remains usable on representative product routes.
- No route depends on precision hovering.

Do not change visual hierarchy merely for preference. Correct only verified
responsive, readability, consistency, or interaction defects.

## 3. Accessibility completion

Meet the project’s WCAG AA target across the existing experience.

Verify and correct:

- One logical page heading and semantic heading order.
- Useful landmarks and a predictable reading order.
- Keyboard access to every interactive element.
- Visible focus against all dark, glass, and neumorphic surfaces.
- Logical Tab and Shift+Tab order.
- Predictable Escape behaviour.
- Correct focus trapping and focus restoration for dialogs, drawers, command
  palette, Quick Capture, and confirmation surfaces.
- Accessible names for icon-only controls.
- Programmatic labels, instructions, descriptions, and errors for forms.
- Status and validation information that does not rely on colour alone.
- AA contrast for normal product text and interactive states.
- Text alternatives for meaningful canvas/system state.
- Core actions that remain available without relying on animation or canvas.
- Appropriate live-region behaviour for asynchronous status and action results
  without excessive announcements.
- No keyboard trap.
- No focus loss after route changes, dismissals, confirmation, or recovery.
- Existing Ctrl/Cmd+K search behaviour and focus restoration remain intact.
- Quick Capture remains fully usable by keyboard.
- Destructive actions retain clear differentiation and confirmation.

Use existing accessibility tooling when available. Do not add a large
dependency solely to produce a report if browser inspection and existing test
tools cover the requirement.

Add automated regression tests for material accessibility defects fixed during
this phase.

## 4. Motion completion

Audit the existing motion system before editing it.

Motion must communicate state, hierarchy, approval, progress, result, or
navigation. Do not add movement merely for visual activity.

Verify and correct where needed:

- Landing-to-app transition is coherent and does not block navigation.
- Route and panel transitions do not cause layout jumps or focus loss.
- Quick Capture opening, review, confirmation, success, failure, and closing
  states remain understandable.
- Loading, processing, approval, acting, success, degraded, offline, and
  privacy/permission states are visibly distinct outside the locked cube.
- Repeated interactions do not replay distracting entrance sequences.
- Hover motion has keyboard and touch equivalents.
- Animation does not conceal information or delay access to controls.
- Non-cube UI motion follows existing design tokens.
- Transform and opacity are preferred for UI animation where practical.
- No new continuous high-intensity animation is introduced.

For `prefers-reduced-motion`:

- Remove non-essential transitions and parallax.
- Replace narrative movement with immediate or short state changes.
- Preserve all information, approvals, outcomes, and recovery controls.
- Keep navigation, dialogs, command palette, and Quick Capture fully usable.
- Do not alter the locked cube module. Verify its existing reduced-motion path
  and provide equivalent accessible status outside the canvas.

## 5. State and workflow regression

Phase 4 state coverage must remain canonical.

For each route, verify the populated state and at least one relevant non-ideal
state at desktop and narrow width. Across the full route set, exercise:

- First use
- No connections
- Partial connections
- Loading
- Empty
- Error
- Rate limited
- Stale source
- Revoked permission
- Offline
- Degraded intelligence
- Action pending
- Action running
- Action succeeded
- Action failed and recoverable
- Reduced motion

Verify that the data, source, intelligence, action, and configuration dimensions
remain independent and do not leak contradictory state across routes.

Preserve these Quick Capture behaviours:

- Manual input only
- Plain-note save
- Editable likely-event extraction
- No silent guessing of ambiguous dates or times
- Explicit confirmation before an event appears in Timeline
- Cancel produces no side effect
- No duplicate result on repeated confirmation
- Correct Notes, Timeline, NEXUS, and Activity provenance
- Deterministic reset on reload or scenario change
- Honest disconnected, denied, offline, and failure handling

Session-only reset remains expected until Phase 6 persistence. Do not “fix” it
with local storage, a database, or a provider write during Phase 5.

## 6. Visual-quality audit

Use the project UI rubric on rendered output, not source code alone.

Score the baseline and final result from 1–5 for:

- Product clarity
- Focal hierarchy
- Brand specificity
- Composition
- Typography
- Material coherence
- Depth
- Motion
- Content hierarchy
- Interaction clarity
- State coverage
- Accessibility
- Responsiveness
- Performance

For every baseline score below 4:

1. Cite the visible or measurable cause.
2. State its product impact.
3. Apply one coherent correction.
4. Re-render the same viewport and state.
5. Re-score it.

Implement P0 defects and Phase-5-relevant P1/P2 defects. Do not manufacture P3
delight work, broadly restyle approved screens, replace functioning components
for preference, or reopen the product’s visual direction.

## 7. Performance budgets

Measure before optimizing.

Record an explicit Phase 5 baseline and budget covering:

- Production route/chunk sizes reported by the established build
- Largest initial JavaScript chunk
- Route-specific lazy-loading boundaries
- Console and hydration errors
- Avoidable layout shift during navigation and loading
- Continuous animation cost

At minimum:

- Do not add a new dependency for a purely cosmetic fix.
- Do not increase the largest initial JavaScript chunk or representative
  route payload by more than 5% without a measured, documented reason.
- Lazy-load non-critical route-specific heavy UI when it produces a measured
  improvement and does not destabilize hydration or transitions.
- Preserve the locked cube implementation and its current loading boundary.
- Do not perform speculative framework or component rewrites.
- Keep new UI animation to compositor-friendly properties where practical.
- Finish with no unexplained console, hydration, build, or runtime errors.

Investigate any existing chunk-size warning. Apply safe splitting only when the
improvement is measurable and does not touch the cube. If the warning cannot be
safely improved within this phase, document its exact source, current size, and
recommended later action.

Update an existing UI audit if one exists. Otherwise create
`docs/PHASE_5_QUALITY_REPORT.md` containing:

- Baseline and final rubric scores
- Viewport and route matrix
- Accessibility checks
- Reduced-motion checks
- Bundle baseline and explicit performance budget
- Corrections made
- Remaining verified limitations

Do not add screenshots or generated browser artifacts to the repository unless
the repository explicitly requires them.

## 8. Engineering verification

Run all established project checks, including:

- TypeScript typecheck
- ESLint
- Complete automated test suite
- Next.js production build
- Sites/vinext production build
- `git diff --check`
- Relevant accessibility and keyboard tests
- Responsive and reduced-motion regression tests where technically appropriate
- Repository-integrity checks
- Cube hash/integrity verification against the Phase 4 commit
- `exfonts/` integrity verification

Run rendered browser verification after the final code change.

Confirm:

- No horizontal overflow at every required viewport.
- No project console errors or warnings requiring action.
- No hydration mismatch.
- Keyboard and focus behaviour pass.
- Core workflows work with reduced motion.
- All Phase 4 tests and behaviour remain intact.

Do not suppress errors or weaken tests merely to pass validation.

## 9. Documentation

Update `docs/PROGRESS.md` with:

- Phase 5 completion status
- Responsive coverage
- Accessibility coverage
- Motion and reduced-motion result
- Performance budget and outcome
- Validation commands and results
- What remains mocked
- Known limitations
- Exact next phase: **Phase 6 — Backend, Identity, and User Profile**

Update `docs/15_DECISIONS.md` only for genuine durable product or architecture
decisions. Do not add routine audit findings or implementation notes.

Do not renumber the roadmap. Phase 5 completes Stage A. Phase 6 begins Stage B.

## 10. Commit and private deployment

After validation:

1. Review the complete diff.
2. Exclude secrets, credentials, screenshots, temporary artifacts, build
   output, `exfonts/`, and unrelated files.
3. Commit only intentional Phase 5 source, tests, and documentation.
4. Push only through the repository’s existing authorized workflow.
5. Reuse the exact Sites project ID in `.openai/hosting.json`.
6. Do not create a new Sites project.
7. Push the exact accepted source state before saving a Sites version.
8. Deploy only the saved version with the existing owner-only access.
9. Inspect deployment status until it reaches a terminal healthy state.
10. Verify the deployed landing page and representative product route.

If only documentation changed after an already successful source deployment, do
not create an unnecessary deployment. Otherwise deploy the Phase 5 source.

## Out of scope

Do not add or begin:

- FastAPI or another backend
- Authentication
- PostgreSQL or migrations
- Durable Quick Capture persistence
- Live weather, geocoding, routing, timezone, or holiday APIs
- OAuth or live Calendar, Gmail, Outlook, Notion, or Drive connections
- Web push, FCM, schedulers, or job queues
- LLM calls, OpenRouter, Gemini, Groq, Nemotron, RAG, or agents
- n8n workflows
- Android work
- New product features or routes
- A new design system
- A cube redesign or cube code change

Do not request, discover, generate, or commit API keys.

## Acceptance criteria

Phase 5 passes only when:

- The full website UI is accepted before integration work starts.
- All existing routes remain coherent and functional.
- Desktop, laptop, tablet, and narrow layouts pass rendered inspection.
- Core workflows remain usable without animation.
- The project WCAG AA target is met or any narrow verified exception is
  documented precisely.
- Keyboard, focus, semantics, contrast, and reduced-motion checks pass.
- No horizontal overflow exists.
- The landing presentation has no accidental scroll.
- Quick Capture and all canonical Phase 4 states remain correct.
- The approved visual direction and locked cube remain unchanged.
- Performance has a measured baseline and explicit budget.
- Typecheck, lint, tests, builds, diff, and integrity checks pass.
- Documentation is current.
- The exact accepted commit is privately deployed when source changed.

## Final report

Lead with the completed outcome, then report:

- Phase 5 commit hash
- Private Sites version, URL label, access level, and deployment result
- Files changed
- Routes and viewport sizes inspected
- Baseline and final UI-rubric scores
- Responsive corrections
- Accessibility corrections and checks
- Motion and reduced-motion result
- Performance baseline, budget, and final result
- Typecheck, lint, test count, and build results
- Browser-console and hydration result
- Quick Capture and Phase 4 regression result
- Cube hash/integrity result
- `exfonts/` integrity result
- Remaining deterministic mocks
- Known limitations
- Exact Phase 6 starting point

Stop after Phase 5. Do not implement Phase 6.

Do not ask non-blocking questions. Use repository decisions and conservative
judgment. Ask only if proceeding would require a destructive action, a secret,
new external authorization, or a product decision that would materially change
the approved experience.
