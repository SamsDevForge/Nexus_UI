# NEXUS AI UI Improvement Playbook

## Why Codex-generated UI often remains bland

The usual problem is not missing CSS. It is missing art direction and visual
evaluation.

Common causes:

- Equal visual weight across all elements
- A predictable sidebar plus card grid
- Too many similar rounded rectangles
- Decorative gradients replacing composition
- Weak typography hierarchy
- 3D object disconnected from product meaning
- Motion added without state or narrative
- No screenshot-based iteration
- Mobile treated as a vertically stacked desktop
- Polished populated state but poor empty and failure states

## Improvement loop

Run this loop after each meaningful UI phase.

### 1. Render representative scenarios

At minimum:

- Landing at 1440 × 900
- Product at 1440 × 900
- Product at 1280 × 720
- Narrow layout around 390 × 844
- Populated state
- Empty state
- Error or disconnected state
- Reduced-motion state

### 2. Capture evidence

Use browser screenshots or the available preview tooling. Do not evaluate only
from JSX and CSS source.

Record:

- Screenshot
- Route
- Viewport
- Scenario fixture
- Date or build identifier

### 3. Score the screen

Score each category from 1 to 5.

| Category | Question |
| --- | --- |
| Product clarity | Can the user explain this screen in five seconds? |
| Focal hierarchy | Is one element clearly dominant? |
| Brand specificity | Could this only be NEXUS? |
| Composition | Is spacing and asymmetry deliberate? |
| Typography | Do size, weight, width, and tone guide reading? |
| Material | Do surfaces feel coherent and readable? |
| Depth | Is foreground/background separation purposeful? |
| Motion | Does movement communicate state? |
| Content | Is the most useful decision shown before raw data? |
| Interaction | Are primary, secondary, and destructive actions clear? |
| State coverage | Do empty, stale, error, and permission states work? |
| Accessibility | Is it navigable, readable, and motion-safe? |
| Responsiveness | Is the narrow version recomposed rather than stacked? |
| Performance | Does atmosphere remain smooth on ordinary hardware? |

Any category under 4 needs a concrete issue and proposed change.

### 4. Identify causes, not symptoms

Weak:

> It needs more depth.

Useful:

> The insight card and timeline have equal luminance and size, so the eye does
> not know where to begin. Reduce timeline contrast, widen the insight region,
> and connect it to the cube’s outward light pulse.

### 5. Rank changes

Classify issues:

- **P0:** Broken, unreadable, clipped, inaccessible, or misleading
- **P1:** Weak hierarchy, generic composition, inconsistent design system
- **P2:** Motion, spacing, and responsive refinement
- **P3:** Optional delight

Implement P0 and P1 before decorative improvements.

### 6. Make a coherent pass

Change related composition, typography, and component decisions together.
Avoid endless single-property tweaks without a visual hypothesis.

### 7. Capture the same screenshots again

Compare the same route, viewport, and fixture. Confirm that the target category
improved without creating regression elsewhere.

### 8. Validate

- Typecheck
- Lint
- Tests
- Production build
- Keyboard navigation
- Reduced motion
- Console errors
- Overflow
- Render performance

## NEXUS-specific review questions

- Does the cube communicate the system state?
- Can the user see which signals caused an insight?
- Is the recommendation visually more important than raw metrics?
- Does “Why?” expose understandable evidence?
- Are confidence and freshness visible without dominating?
- Is the permission level clear before an action?
- Is the interface calm when no intervention is necessary?
- Is cinematic motion restricted to moments that deserve it?

## Material improvements for a bland current landing page

1. Replace a symmetrical two-column hero with deliberate asymmetric framing.
2. Enlarge the cube and let the camera/light create depth.
3. Reduce competing labels and cards.
4. Establish a single luminance focal point.
5. Make the overhead light visibly affect the cube material.
6. Use typography width and line breaks intentionally.
7. Connect the proactive card’s reveal to cube processing.
8. Add restrained atmospheric depth, not a generic gradient.
9. Tune animation sequences instead of animating all elements continuously.
10. Inspect the actual render and iterate.

## Material improvements for a bland product dashboard

1. Replace KPI cards with one current decision and a supporting timeline.
2. Use grouped rows, bands, and spatial hierarchy.
3. Keep the cube small but meaningful as a state indicator.
4. Show evidence and action authority.
5. Separate daily-use navigation from system controls.
6. Use context freshness and confidence instead of decorative metrics.
7. Make empty states teach connection value.
8. Give each screen a distinct task while preserving shared components.

## Visual regression record

Maintain a lightweight UI audit document or issue list containing:

- Route and state
- Screenshot reference
- Score
- P0/P1 findings
- Implemented changes
- Remaining compromise

Do not create a new design direction in every prompt. Update the design-system
document when a change is intended to be permanent.

## Best way to prompt Codex

Do not say:

> Make the UI better and more futuristic.

Say:

> Run the interface, capture the specified viewports, audit it against
> `docs/04_DESIGN_SYSTEM.md` and this playbook, list the five highest-impact
> issues with visible evidence, implement P0/P1 corrections, capture the same
> views again, and continue until no category scores below 4. Do not solve
> blandness by adding more cards, glow, gradients, or text.

The reusable complete prompt is in `prompts/UI_REDESIGN_PROMPT.md`.
