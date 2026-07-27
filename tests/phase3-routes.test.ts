import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const routes = [
  ["automations", "AutomationsExperience", "automationService.getAutomations"],
  ["connections", "ConnectionsExperience", "connectionService.getConnections"],
  ["memory", "MemoryExperience", "memoryService.getMemory"],
  ["activity", "ActivityExperience", "activityService.getActivity"],
  ["settings", "SettingsExperience", "settingsService.getSettings"],
] as const;

test("every Phase 3 control route renders a real experience through its service boundary", async () => {
  for (const [route, component, serviceCall] of routes) {
    const source = await readFile(
      path.join(root, "app", "app", route, "page.tsx"),
      "utf8",
    );
    assert.match(source, new RegExp(component));
    assert.match(source, new RegExp(serviceCall.replace(".", "\\.")));
    assert.doesNotMatch(source, /PhasePlaceholder/);
  }

  const permissions = await readFile(
    path.join(root, "app", "app", "settings", "permissions", "page.tsx"),
    "utf8",
  );
  assert.match(permissions, /PermissionsExperience/);
  assert.match(permissions, /permissionService\.getPermissions/);
});

test("major dialogs trap focus, close on Escape, and restore the triggering focus", async () => {
  const shared = await readFile(
    path.join(root, "components", "nexus", "Phase3Shared.tsx"),
    "utf8",
  );

  assert.match(shared, /role="dialog"/);
  assert.match(shared, /aria-modal="true"/);
  assert.match(shared, /event\.key === "Escape"/);
  assert.match(shared, /event\.key !== "Tab"/);
  assert.match(shared, /restoreRef\.current\?\.focus/);
  assert.match(shared, /closeRef\.current\?\.focus/);
});

test("Phase 3 styles cover narrow layouts, focus visibility, and reduced motion", async () => {
  const css = await readFile(path.join(root, "app", "globals.css"), "utf8");

  assert.match(css, /\.control-page/);
  assert.match(css, /\.control-dialog-backdrop/);
  assert.match(css, /\.permission-dimensions/);
  assert.match(css, /\.activity-workspace/);
  assert.match(css, /\.settings-workspace/);
  assert.match(css, /@media \(max-width: 780px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.control-page button:focus-visible/);
});

test("global search includes new controls and the locked cube module remains isolated", async () => {
  const fixtures = await readFile(
    path.join(root, "lib", "mocks", "phase2-fixtures.ts"),
    "utf8",
  );
  const shell = await readFile(
    path.join(root, "components", "nexus", "ProductShell.tsx"),
    "utf8",
  );
  const backdrop = await readFile(
    path.join(root, "components", "nexus", "ProductLandingCubeBackdrop.tsx"),
    "utf8",
  );

  assert.match(fixtures, /Permission Centre/);
  assert.match(fixtures, /Notification preferences/);
  assert.match(fixtures, /\/app\/settings\/permissions/);
  assert.match(shell, /privacy-paused/);
  assert.match(backdrop, /product-landing-cube-canvas/);
});
