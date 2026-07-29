import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the shared motion system centralizes bounded timing and entry choreography", async () => {
  const css = await readFile("app/globals.css", "utf8");

  assert.match(css, /--nx-motion-press: 120ms/);
  assert.match(css, /--nx-motion-item: 320ms/);
  assert.match(css, /--nx-motion-region: 440ms/);
  assert.match(css, /--nx-motion-panel: 420ms/);
  assert.match(css, /@keyframes nx-region-enter/);
  assert.match(css, /@keyframes nx-item-enter/);
  assert.match(css, /\.today-page > \*/);
  assert.match(css, /\.phase2-page > \*/);
  assert.match(css, /\.control-page > \*/);
  assert.match(css, /\.technicals-page > \*/);
  assert.match(css, /--nx-item-delay: 180ms/);
  assert.doesNotMatch(css, /--nx-item-delay: (?:[2-9]\d\d|\d{4,})ms/);
});

test("ambient motion pauses for reduced motion, hidden documents, and offscreen geometry", async () => {
  const controller = await readFile(
    "components/nexus/AmbientMotion.tsx",
    "utf8",
  );
  const css = await readFile("app/globals.css", "utf8");

  assert.match(controller, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(controller, /document\.visibilityState !== "visible"/);
  assert.match(controller, /new IntersectionObserver/);
  assert.match(controller, /data-motion="paused"/);
  assert.match(controller, /data-motion-state=\{state\}/);
  assert.match(controller, /aria-hidden="true"/);
  assert.match(css, /\[data-motion="active"\] > i/);
  assert.match(css, /animation-play-state: paused/);
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.connection-signal > \*/m,
  );
});

test("only the existing semantic signal illustrations receive orbital behavior", async () => {
  const [connections, memory, activity, css] = await Promise.all([
    readFile("components/nexus/ConnectionsExperience.tsx", "utf8"),
    readFile("components/nexus/MemoryExperience.tsx", "utf8"),
    readFile("components/nexus/ActivityExperience.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(connections, /<AmbientMotion[\s\S]*className="connection-signal"/);
  assert.match(memory, /<AmbientMotion[\s\S]*className="memory-orbit"/);
  assert.match(activity, /<AmbientMotion[\s\S]*className="activity-pulse"/);
  assert.match(connections, /snapshot\.attentionCount[\s\S]*"attention"/);
  assert.match(memory, /item\.status === "unconfirmed"/);
  assert.match(activity, /event\.outcome === "failed"/);
  assert.match(css, /@keyframes nx-orbit-clockwise/);
  assert.match(css, /@keyframes nx-orbit-counterclockwise/);
  assert.match(css, /--nx-orbit-radius: 63px/);
  assert.match(css, /--nx-orbit-duration: 22s/);
});

test("search, timeline, and Quick Capture keep semantic status without depending on motion", async () => {
  const [search, capture, css] = await Promise.all([
    readFile("components/nexus/GlobalSearch.tsx", "utf8"),
    readFile("components/nexus/QuickCapture.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(search, /className="command-scan-cue" key=\{query\}/);
  assert.match(search, /role="combobox"/);
  assert.match(capture, /showAvailabilityCue/);
  assert.match(capture, /event\.animationName === "nx-capture-availability"/);
  assert.match(capture, /data-quick-capture-stage-focus/);
  assert.match(capture, /role="status"/);
  assert.match(css, /@keyframes nx-search-scan/);
  assert.match(css, /@keyframes nx-status-acknowledge/);
  assert.match(css, /\.timeline-entry-icon\.status-accepted/);
  assert.match(css, /\.quick-capture-result\.is-failure/);
});
