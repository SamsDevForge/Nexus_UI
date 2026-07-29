# NEXUS motion system

## Purpose

Motion communicates arrival, hierarchy, relationship, system state, feedback,
or spatial continuity. Product motion stays restrained and task-first. The
landing composition and locked cube keep their existing behavior.

## Tokens

| Token | Value | Use |
| --- | ---: | --- |
| `--nx-motion-press` | 120 ms | Immediate press acknowledgement |
| `--nx-motion-micro` | 180 ms | Hover, focus, and small state response |
| `--nx-motion-item` | 320 ms | Row and card arrival |
| `--nx-motion-component` | 340 ms | Dialog and panel presence |
| `--nx-motion-panel` | 420 ms | Spatial panel changes |
| `--nx-motion-region` | 440 ms | Route-content region arrival |
| `--nx-ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances and direct feedback |
| `--nx-ease-standard` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Short state movement |

## Entry and stagger

- The shell, navigation, context bar, Quick Capture launcher, and locked cube
  remain stable between product routes.
- Route content uses small opacity, vertical translation, and scale changes.
- The dominant task or recommendation enters first; headings and secondary
  regions follow within 180 ms.
- Repeated rows use 45 ms steps capped at 180 ms. Long lists never create an
  unbounded wait.
- CSS animations attach to mounted regions and keyed items. Ordinary filtering,
  focus changes, and unrelated React updates do not replay the whole page.
- Newly inserted Timeline, Insight, Knowledge, Notes, Search, connection, and
  Activity rows receive the item-arrival cue.

## Icon and feedback rules

- Search uses a single short scan when a query changes and result work occurs.
- Timeline completion, rescheduling, and rejection states receive one bounded
  acknowledgement while retaining their text and color state.
- Quick Capture exposes one availability cue per mounted product shell, then
  uses panel presence and explicit save, success, and failure feedback.
- Buttons and interactive rows use restrained hover depth and a 120 ms press
  response. Transforms never change adjacent layout.
- Navigation glyphs rest unless their existing control state changes.

## Orbital motion

Only three existing signal illustrations use continuous relative motion:

- Connections: provider-status signals around the integration tile.
- Memory: review and expiry signals around the correctable-context tile.
- Activity: outcome signals around the audit-trace tile.

Dots use different radii, phases, speeds, and directions. The central rounded
tile drifts independently. Attention states accelerate slightly, degraded
states slow and dim, success may emit one outward acknowledgement, and
privacy-paused remains static and dim. Fine existing rings, NEXUS colors, and
the original geometry are preserved.

`AmbientMotion` keeps these loops paused until visible, pauses them when
offscreen or when the document is hidden, and honors the system motion
preference without timer-driven rendering.

## Reduced motion and accessibility

With `prefers-reduced-motion: reduce`, or the deterministic reduced-motion
scenario:

- continuous orbit, drift, translation, scale, scan, pulse, and stagger stop;
- content and state changes appear immediately;
- focus, reading order, live regions, status text, authority, freshness,
  success, and failure remain unchanged;
- motion remains decorative to assistive technology and is never the only
  status signal.

## Performance constraints

- Animate `transform` and `opacity`; do not animate layout or large blur.
- Do not add a canvas, WebGL scene, timer-driven React render loop, or motion
  dependency.
- Keep ambient loops limited to the visible semantic hero illustration.
- Pause ambient work offscreen and in background tabs.
- Do not couple motion to, import, or modify the locked Three.js cube.

## Reusable primitives

- CSS timing and easing tokens in `app/globals.css`
- `nx-region-enter`, `nx-item-enter`, and `nx-panel-enter`
- bounded list stagger selectors
- `nx-status-acknowledge` and `nx-status-failure`
- `AmbientMotion` with `steady`, `attention`, `success`, `degraded`, and
  `paused` states
- clockwise/counterclockwise orbit and central-tile drift keyframes
