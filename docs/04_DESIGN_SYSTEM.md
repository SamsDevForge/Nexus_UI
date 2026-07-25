# NEXUS AI Design System

## Brand idea

**Light reveals intelligence.**

The cube represents the context core. Separate signals enter it, an internal
process occurs, and one useful insight emerges. Lighting, motion, and UI state
should reinforce that idea.

The interface is premium, quiet, precise, and dark. It must not resemble a
gaming HUD, crypto dashboard, generic admin panel, or blue-purple AI template.

## Visual modes

### Cinematic mode

Used on:

- Landing
- Initial reveal
- Major onboarding completion
- Selected product demonstrations

Characteristics:

- Large cube
- Dramatic light
- Slow camera movement
- Sparse copy
- Strong negative space

### Product mode

Used inside the application:

- Stable composition
- Fast navigation
- Reduced motion
- Landing cube layered behind the glass interface, with a compact state glyph
  retained in the decision surface
- Higher information density
- Clear focus and readable controls

The modes share materials, type, colour, and motion grammar without sharing the
same layout.

## Colour tokens

Suggested starting tokens; adjust through visual testing rather than adding
unrelated colours.

| Token | Value | Role |
| --- | --- | --- |
| `--nx-bg-0` | `#06080C` | Deepest background |
| `--nx-bg-1` | `#090D13` | Main application background |
| `--nx-surface-1` | `#0E141C` | Raised surface |
| `--nx-surface-2` | `#141C26` | Hover or selected surface |
| `--nx-surface-inset` | `#080C12` | Inset controls |
| `--nx-text-1` | `#F3F7FB` | Primary text |
| `--nx-text-2` | `#AAB6C5` | Supporting text |
| `--nx-text-3` | `#6F7D8E` | Metadata |
| `--nx-line` | `rgba(207,226,245,.10)` | Subtle separators |
| `--nx-light` | `#EAF8FF` | Cube light and primary highlight |
| `--nx-accent` | `#9EDCFA` | Interactive intelligence accent |
| `--nx-success` | `#70D6A5` | Confirmed success |
| `--nx-warning` | `#E4BE73` | Attention or stale state |
| `--nx-danger` | `#EF8A8A` | Destructive or failed state |

Use accent colour sparingly. Most hierarchy should come from luminance,
spacing, size, and depth.

## Typography

Use:

- A clean geometric or neo-grotesk variable font for product text
- A restrained display treatment for the NEXUS wordmark and hero
- A bold, architectural Unbounded display face for the Today greeting
- An extra-expanded, black italic Anybody display face for the primary
  recommendation headline
- A very wide, heavy Druk-style display face for the dominant time inside the
  NEXUS timing state
- A monospace face only for system state, timestamps, or identifiers

Unbounded and Anybody are self-hosted under the SIL Open Font License. Druk
Wide remains preferred for the timing state when licensed webfont files are
available; until then, use the bundled licensed visual equivalent behind the
same design token.

Recommended hierarchy:

| Style | Purpose |
| --- | --- |
| Display | Landing statement only |
| H1 | Screen title or current decision |
| H2 | Major section |
| H3 | Component group |
| Body | Instructions and insight explanations |
| Label | Controls and field labels |
| Meta | Source, confidence, freshness, and state |

Do not render every label in uppercase or apply wide letter spacing to normal
body text.

## Spacing and layout

- Base spacing unit: 4 px
- Common steps: 8, 12, 16, 24, 32, 48, 64
- Desktop content max width should be deliberate per screen, not globally tiny.
- Use generous negative space around the dominant insight.
- Align evidence, source, and action regions consistently.
- Prefer grouped rows and section rhythm over separate cards for every object.

## Surfaces and glass

Product mode uses restrained dark glassmorphism over the atmospheric cube
field. Glass must preserve hierarchy and legibility rather than becoming a
collection of decorative translucent cards.

Primary glass:

- Low-opacity graphite-blue fill
- Controlled background blur and saturation
- Thin pearl edge with a brighter top reflection
- Soft depth shadow without muddy black rims

Secondary glass:

- Lower blur and opacity than the primary insight
- Shared boundaries for grouped sections
- Clear focus and hover states

Avoid:

- Bright outlines around every surface
- Excessive blur that obscures the cube or text
- Large collections of identical rounded cards
- Fully transparent controls with weak contrast
- Low-contrast grey-on-grey text

## Component families

Build these from tokens:

- Primary, secondary, quiet, and destructive buttons
- Icon button
- Text input and search
- Select and segmented control
- Toggle and authority selector
- Surface and inset surface
- Insight hero
- Compact insight row
- Context signal
- Timeline item
- Source/evidence chip
- Confidence and freshness indicator
- Connection health row
- Automation recipe
- Memory item
- Action preview and approval panel
- Toast and notification preview
- Empty, error, stale, disconnected, and offline states
- Skeletons
- Dialog, drawer, popover, tooltip, and command palette

## Cube state language

| State | Visual behaviour |
| --- | --- |
| Dormant | Almost still, low internal light |
| Observing | Slow diagonal rotation, orbiting highlight |
| Gathering | Small signals converge toward the cube |
| Processing | Internal seams travel in sequence |
| Insight ready | One controlled outward pulse |
| Approval needed | One face remains illuminated |
| Acting | Directional light moves from cube toward target |
| Success | Brief clean expansion, then calm |
| Degraded | Reduced light and slow irregular pulse |
| Privacy paused | Static, closed, dim |

Do not continuously animate at maximum intensity. Motion gains meaning only
when states differ.

## Motion tokens

| Motion | Duration | Character |
| --- | --- | --- |
| Micro interaction | 120–220 ms | Immediate, controlled |
| Component transition | 240–420 ms | Smooth |
| Panel transition | 400–700 ms | Deliberate |
| Insight sequence | 700–1400 ms | Narrative |
| Landing camera | 2500–5000 ms | Cinematic |

Use smooth deceleration. Avoid elastic bounce, random float, fast spin, and
simultaneous animation of every element.

## Interaction grammar

- Light moving inward means context gathering.
- Edge movement means processing.
- A face opening or illuminating means approval.
- Light moving outward means an action or insight.
- Dimming surrounding surfaces focuses an important decision.

## Landing composition

- One dominant cube
- One product promise
- One primary action
- One proactive example
- Minimal technical labels
- No generic navigation clutter
- No scroll at the presentation viewport

## Product composition

- Stable shell
- One dominant current insight
- Secondary information grouped by time or purpose
- Landing cube behind the glass hierarchy plus a compact state indicator
- Clear evidence and control
- Scrolling where content requires it

## Responsive behaviour

Do not simply stack desktop columns.

At narrow widths:

- Reduce decorative atmosphere
- Use a simplified cube state
- Move secondary controls into drawers
- Keep the highest-value insight first
- Convert sidebar to bottom or compact navigation
- Preserve 44 px minimum touch targets
- Avoid horizontal timelines that require precision dragging

## Accessibility

- Meet WCAG AA contrast for normal product text.
- Do not use colour as the only status signal.
- Keep focus visible against dark surfaces.
- Provide text alternatives for canvas state.
- Make core actions available without the 3D canvas.
- Respect reduced motion.
- Trap and restore focus correctly in dialogs.
- Use semantic headings and labelled controls.

## Anti-blandness checklist

A screen is not complete if:

- Every element has the same visual weight.
- The layout is an evenly distributed card grid.
- The cube could be removed without changing meaning.
- Accent colour is used instead of hierarchy.
- The typography uses only two sizes.
- Empty space appears accidental.
- Motion is decorative rather than stateful.
- Content could belong to any productivity app.

The visual signature should come from purposeful contrast, stateful light,
evidence-first insights, restrained glass depth, and a coherent
context-to-action story.
