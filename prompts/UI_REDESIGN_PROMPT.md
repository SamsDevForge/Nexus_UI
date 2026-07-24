# Codex Prompt — Audit and Materially Improve NEXUS UI

Use this after a NEXUS screen has been implemented but still looks bland,
generic, cluttered, or unfinished.

---

Use `$polish-nexus-ui` if available.

The current NEXUS UI is not visually accepted. Perform a screenshot-based UI
audit and implement a **material redesign of the weak areas**. This is not a
request for minor colour, shadow, radius, or spacing adjustments.

## Read first

- `AGENTS.md`
- `docs/03_INFORMATION_ARCHITECTURE.md`
- `docs/04_DESIGN_SYSTEM.md`
- `docs/09_UI_IMPROVEMENT_PLAYBOOK.md`
- `docs/12_ACCEPTANCE_GATES.md`

## Inspect the actual rendered interface

1. Run the project using its documented development command.
2. Inspect the requested route and all states relevant to it.
3. Capture screenshots at:
   - 1440 × 900
   - 1280 × 720
   - Approximately 390 × 844
4. Inspect keyboard focus and reduced-motion mode.
5. Check the console and render performance.

Do not judge visual quality only from JSX, CSS, or component names.

## Audit before editing

Score the rendered screen from 1–5 for:

- Product clarity
- Focal hierarchy
- Brand specificity
- Composition
- Typography
- Material coherence
- Depth
- Motion meaning
- Content prioritization
- Interaction clarity
- State coverage
- Accessibility
- Responsive composition
- Performance

For every score below 4, write one evidence-based diagnosis. Describe the
visible cause, not a vague symptom.

Example:

> The main insight and four supporting cards use the same width, brightness,
> elevation, and title size. The eye has no starting point. Make the insight
> the luminance and scale anchor, collapse supporting data into a timeline, and
> reduce secondary surface contrast.

## Redesign priorities

Prioritize:

1. Broken, clipped, inaccessible, or misleading UI
2. Missing focal hierarchy
3. Generic dashboard/card-grid composition
4. Weak typography and spacing rhythm
5. NEXUS-specific state and evidence language
6. Responsive recomposition
7. Motion and atmospheric refinement
8. Optional delight

Do not solve blandness by adding:

- More cards
- More text
- Random gradient blobs
- Blue-purple glow
- Excessive bloom
- Bright outlines everywhere
- Decorative charts
- Continuous movement
- An AI brain, robot, or circuit pattern

## NEXUS art direction

The product should feel like a quiet intelligence system built from:

- Deep graphite space
- Obsidian or dark-metal material
- Pearl-white and restrained icy-blue light
- Sculpted dark neumorphism
- Precise typography
- Meaningful negative space
- Evidence-first recommendations
- Clear action authority
- State-driven cube motion

The cube must communicate a state or transition. If removing it would not
change the product meaning, reconnect its light, movement, and position to the
current insight or action.

## Implementation authority

You may restructure:

- Page composition
- Component hierarchy
- Typography
- Spacing
- Surface treatment
- Responsive layout
- Animation timing
- Cube scale and framing
- Information grouping
- Navigation emphasis

Preserve working domain behaviour and unrelated user changes. Reuse components
only when they satisfy the design system; do not preserve visibly weak
components merely to minimize the diff.

## Required iteration

1. Implement the P0 and P1 redesign.
2. Capture the same routes, states, and viewports.
3. Compare against the initial screenshots.
4. Re-score the interface.
5. Make a second focused pass if any category remains below 4.
6. Validate typecheck, lint, tests, production build, console, overflow,
   keyboard use, and reduced motion.

Do not stop after creating an audit or describing proposed changes.

## Completion response

Report:

- The main visible problems found
- The material changes implemented
- Before/after rubric scores
- Routes and states inspected
- Validation completed
- Remaining limitations

Implement the redesign now.
