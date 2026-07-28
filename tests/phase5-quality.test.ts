import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const lockedCubeHashes = new Map([
  [
    "app/NexusExperience.tsx",
    "d5d2f8109e3c9d18532608027cd1b2a5588a53369fcbb687fca80cb9cf4d1ddd",
  ],
  [
    "app/LandingExperienceClient.tsx",
    "5e4c069c2f6b980f34abb0fe19f86b62b6039087ad86da56fb32849a04447949",
  ],
  [
    "components/nexus/ProductLandingCubeBackdrop.tsx",
    "5dbfaa48ece8a35116deae7b644155f98ae58105920654abab147b4a535c03c1",
  ],
]);

test("the Phase 4 cube implementation remains byte-for-byte locked", async () => {
  for (const [path, expected] of lockedCubeHashes) {
    const source = await readFile(path);
    const actual = createHash("sha256").update(source).digest("hex");
    assert.equal(actual, expected, path);
  }
});

test("the product shell hands keyboard focus to routed content and exposes non-canvas state", async () => {
  const shell = await readFile("components/nexus/ProductShell.tsx", "utf8");
  const css = await readFile("app/globals.css", "utf8");

  assert.match(shell, /className="nexus-skip-link"/);
  assert.match(shell, /href="#nexus-main-content"/);
  assert.match(shell, /mainRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(shell, /id="nexus-main-content"/);
  assert.match(shell, /role="status" aria-live="polite"/);
  assert.match(shell, /NEXUS system state:/);
  assert.match(css, /\.nexus-skip-link:focus/);
});

test("Quick Capture keeps typing focus stable and focuses each new workflow stage", async () => {
  const capture = await readFile("components/nexus/QuickCapture.tsx", "utf8");

  assert.doesNotMatch(
    capture,
    /const first = focusableElements\(panel\)\[0\]/,
  );
  assert.match(capture, /stage === "draft"\s*\?\s*"textarea"/);
  assert.match(capture, /data-quick-capture-stage-focus/);
  assert.match(capture, /\[open, preview\?\.mode, stage\]/);
  assert.match(
    capture,
    /aria-label=\{open \? "Close Quick Capture" : "Open Quick Capture"\}/,
  );
});

test("global search announces results and exposes its active option to assistive technology", async () => {
  const search = await readFile("components/nexus/GlobalSearch.tsx", "utf8");

  assert.match(search, /aria-label="Close search"/);
  assert.match(search, /role="combobox"/);
  assert.match(search, /aria-controls="command-results"/);
  assert.match(search, /aria-activedescendant=/);
  assert.match(search, /id=\{`command-option-\$\{result\.id\}`\}/);
  assert.match(search, /search result\$\{/);
});

test("narrow layouts preserve touch targets and reduced-motion coverage", async () => {
  const css = await readFile("app/globals.css", "utf8");

  assert.match(
    css,
    /@media \(max-width: 780px\) \{[\s\S]*\.focus-mode-trigger,[\s\S]*width: 44px;/,
  );
  assert.match(
    css,
    /\.state-coverage-chips a \{[\s\S]*min-height: 44px;/,
  );
  assert.match(
    css,
    /\.command-palette > header button,[\s\S]*min-height: 44px;/,
  );
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("scrollable surfaces share one accessible liquid-glass scrollbar treatment", async () => {
  const css = await readFile("app/globals.css", "utf8");

  assert.match(
    css,
    /scrollbar-color: var\(--nx-scrollbar-thumb\) var\(--nx-scrollbar-track\)/,
  );
  assert.match(css, /:where\(\*\)::-webkit-scrollbar-track/);
  assert.match(css, /:where\(\*\)::-webkit-scrollbar-thumb:hover/);
  assert.match(css, /:where\(\*\)::-webkit-scrollbar-button/);
  assert.match(css, /-webkit-backdrop-filter: blur\(12px\) saturate\(135%\)/);
  assert.match(css, /backdrop-filter: blur\(16px\) saturate\(145%\)/);
  assert.match(css, /--nx-scrollbar-track: rgba\(7, 16, 24, 0\.12\)/);
  assert.match(css, /::-webkit-scrollbar-corner \{[\s\S]*background: transparent;/);
  assert.match(
    css,
    /@media \(forced-colors: active\) \{[\s\S]*scrollbar-color: auto;/,
  );
  assert.match(
    css,
    /\.app-navigation \{[\s\S]*scrollbar-width: none;/,
  );
});

test("the landing page exposes a prominent app entry without modifying the locked cube", async () => {
  const landing = await readFile("app/LandingEntryAction.tsx", "utf8");
  const page = await readFile("app/page.tsx", "utf8");
  const css = await readFile("app/globals.css", "utf8");

  assert.match(landing, /href="\/app\/today"/);
  assert.match(landing, /Enter NEXUS/);
  assert.match(
    landing,
    /aria-label="Enter NEXUS and open your Today dashboard"/,
  );
  assert.match(landing, /createPortal/);
  assert.match(page, /<LandingEntryAction \/>/);
  assert.match(css, /\.landing-entry-action \{/);
  assert.match(css, /\.landing-entry-action:focus-visible/);
  assert.match(css, /\.hero-actions > \.primary-action \{[\s\S]*display: none;/);
  assert.match(
    css,
    /\.nexus-shell\.is-ready > \.landing-entry-action-mobile \{[\s\S]*display: grid;/,
  );
});
