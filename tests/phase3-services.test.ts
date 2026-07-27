import assert from "node:assert/strict";
import test from "node:test";
import type { NexusScenario } from "../lib/domain/contracts";
import { createMockPhase3Services } from "../lib/mocks/mock-phase3-services";

test("automation template, custom creation, pause, authority and dry-run are deterministic", async () => {
  const { automationService } = createMockPhase3Services("rain-and-traffic");
  const initial = await automationService.getAutomations("rain-and-traffic");
  const created = await automationService.createFromTemplate(
    "template-morning-brief",
  );
  const custom = await automationService.createCustom({
    name: "Study-day reset",
    trigger: "When tomorrow has an early class",
    proposedAction: "Suggest a preparation checklist",
  });
  const paused = await automationService.setPaused(created.id, true);
  const resumed = await automationService.setPaused(created.id, false);
  const authority = await automationService.changeAuthority(created.id, "act");
  const firstDryRun = await automationService.runDryRun(
    "automation-rain-commute",
  );
  const secondBundle = createMockPhase3Services("rain-and-traffic");
  const secondDryRun =
    await secondBundle.automationService.runDryRun("automation-rain-commute");

  assert.equal(initial.automations.length, 5);
  assert.equal(created.status, "draft");
  assert.equal(custom.authority, "suggest");
  assert.equal(paused.status, "paused");
  assert.equal(resumed.status, "active");
  assert.equal(authority.authority, "ask");
  assert.deepEqual(firstDryRun, secondDryRun);
  assert.equal(firstDryRun.outcome, "would-ask");
  assert.equal(firstDryRun.trace.every((step) => step.result === "passed"), true);
});

test("permission revocation blocks connected context consistently across services", async () => {
  const services = createMockPhase3Services("rain-and-traffic");
  const impact = await services.permissionService.previewRevocation(
    "permission-calendar-read",
  );
  const revoked = await services.permissionService.revokePermission(
    "permission-calendar-read",
  );
  const [connections, automations, memory, activity] = await Promise.all([
    services.connectionService.getConnections("rain-and-traffic"),
    services.automationService.getAutomations("rain-and-traffic"),
    services.memoryService.getMemory("rain-and-traffic"),
    services.activityService.getActivity("rain-and-traffic"),
  ]);

  assert.equal(impact.affectedFeatures.includes("Today"), true);
  assert.equal(revoked.status, "revoked");
  assert.equal(
    connections.connections.find((item) => item.id === "connection-calendar")
      ?.status,
    "denied",
  );
  assert.equal(
    automations.automations.some(
      (automation) => automation.status === "blocked",
    ),
    true,
  );
  assert.equal(
    memory.items.find((item) => item.id === "memory-commute")?.status,
    "conflicted",
  );
  assert.equal(
    activity.events.some((event) => event.title.startsWith("Revoked")),
    true,
  );
});

test("permission dimensions reduce independently and authority never escalates to Act", async () => {
  const { permissionService } = createMockPhase3Services("rain-and-traffic");
  const reduced = await permissionService.updatePermission(
    "permission-calendar-read",
    {
      retention: "none",
      modelUse: "never",
      notificationsAllowed: false,
      actionAuthority: "act",
    },
  );
  const restored = await permissionService.restorePermission(
    "permission-calendar-read",
  );

  assert.equal(reduced.status, "reduced");
  assert.equal(reduced.retention, "none");
  assert.equal(reduced.modelUse, "never");
  assert.equal(reduced.notificationsAllowed, false);
  assert.equal(reduced.actionAuthority, "ask");
  assert.equal(restored.status, "reduced");
  assert.equal(restored.retention, "working-context");
});

test("global automation kill switch stays coherent in Automation, Permission, Settings and Activity", async () => {
  const services = createMockPhase3Services("rain-and-traffic");
  await services.permissionService.setAutomationsPaused(true);
  const [automations, permissions, settings, activity] = await Promise.all([
    services.automationService.getAutomations("rain-and-traffic"),
    services.permissionService.getPermissions("rain-and-traffic"),
    services.settingsService.getSettings("rain-and-traffic"),
    services.activityService.getActivity("rain-and-traffic"),
  ]);

  assert.equal(automations.globallyPaused, true);
  assert.equal(permissions.automationsPaused, true);
  assert.equal(settings.preferences.privacy.automationsPaused, true);
  assert.equal(
    activity.events.some((event) => event.title === "Paused all automations"),
    true,
  );
  const dryRun = await services.automationService.runDryRun(
    "automation-rain-commute",
  );
  assert.equal(dryRun.outcome, "blocked");
});

test("connection setup, resync, reconnect and confirmed disconnect report dependency impact", async () => {
  const services = createMockPhase3Services("connection-stale");
  const setup = await services.connectionService.setupConnection(
    "connection-email",
  );
  const sync = await services.connectionService.resyncConnection(
    "connection-calendar",
  );
  const reconnected = await services.connectionService.reconnectConnection(
    "connection-notion",
  );
  const impact = await services.connectionService.previewDisconnect(
    "connection-calendar",
  );
  const disconnected = await services.connectionService.disconnectConnection(
    "connection-calendar",
  );
  const automations = await services.automationService.getAutomations(
    "connection-stale",
  );

  assert.equal(setup.status, "connected");
  assert.equal(setup.capabilities.every((item) => item.granted), true);
  assert.equal(sync.status, "succeeded");
  assert.equal(reconnected.status, "connected");
  assert.equal(impact.affectedFeatures.includes("Today"), true);
  assert.equal(disconnected.status, "disconnected");
  assert.equal(
    automations.automations.some(
      (automation) => automation.status === "blocked",
    ),
    true,
  );
});

test("memory confirmation, correction, persistence, deletion and restoration record safe outcomes", async () => {
  const services = createMockPhase3Services("rain-and-traffic");
  const confirmed = await services.memoryService.confirmMemory("memory-commute");
  const corrected = await services.memoryService.correctMemory(
    "memory-commute",
    "Campus commute usually takes 34 minutes by bus.",
  );
  const locked = await services.memoryService.updateMemory("memory-commute", {
    persistence: "temporary",
    inferenceLocked: true,
  });
  const impact =
    await services.memoryService.previewDeletion("memory-commute");
  const deleted = await services.memoryService.deleteMemory("memory-commute");
  const restored = await services.memoryService.restoreMemory("memory-commute");
  const activity = await services.activityService.getActivity("rain-and-traffic", {
    types: ["memory-change"],
  });

  assert.equal(confirmed.status, "confirmed");
  assert.equal(corrected.status, "corrected");
  assert.equal(locked.persistence, "temporary");
  assert.equal(locked.inferenceLocked, true);
  assert.equal(impact.reversible, true);
  assert.equal(deleted.status, "deleted");
  assert.equal(restored.status, "restored");
  assert.equal(activity.events.length >= 3, true);
});

test("activity filters, recoverable retry, reversal and mock export are canonical", async () => {
  const services = createMockPhase3Services("action-failed");
  const failures = await services.activityService.getActivity("action-failed", {
    outcomes: ["failed"],
    types: ["automation-run"],
  });
  const retried = await services.activityService.retryEvent(
    "activity-focus-failed",
  );
  const reversed = await services.activityService.reverseEvent(
    "activity-note-prepared",
  );
  const exported = await services.activityService.exportActivity({
    query: "focus",
  });

  assert.equal(failures.events.length, 1);
  assert.equal(retried.outcome, "success");
  assert.equal(retried.failure, undefined);
  assert.equal(reversed.outcome, "reversed");
  assert.equal(reversed.reversalState, "reversed");
  assert.equal(exported.scope, "activity-filter");
  assert.equal(exported.status, "prepared");
});

test("settings save, reset, notification preview, export and deletion remain deterministic mocks", async () => {
  const { settingsService } = createMockPhase3Services("rain-and-traffic");
  const initial = await settingsService.getSettings("rain-and-traffic");
  const saved = await settingsService.saveSection("profile", {
    displayName: "Aadi S.",
    timezone: "Asia/Singapore",
  });
  const preview = await settingsService.previewNotification({
    ...initial.preferences.notifications,
    style: "essential",
  });
  const reset = await settingsService.resetSection("profile");
  const exported = await settingsService.requestExport();
  const deleted = await settingsService.requestDeletion("source-derived");

  assert.equal(saved.displayName, "Aadi S.");
  assert.equal(saved.timezone, "Asia/Singapore");
  assert.match(preview.body, /Traffic/);
  assert.equal(reset.displayName, "Aadi Sharma");
  assert.equal(exported.scope, "all-data");
  assert.equal(deleted.scope, "source-derived");
  assert.equal(deleted.impact.reversible, false);
  assert.match(deleted.summary, /demo state only/);
});

test("all Phase 3 snapshots are deterministic across shared scenarios", async () => {
  const scenarios: NexusScenario[] = [
    "first-use",
    "loading",
    "student-normal-day",
    "rain-and-traffic",
    "deadline-risk",
    "partial-connections",
    "connection-stale",
    "permission-denied",
    "offline",
    "action-failed",
    "privacy-paused",
    "reduced-motion",
  ];

  for (const scenario of scenarios) {
    const firstServices = createMockPhase3Services(scenario);
    const secondServices = createMockPhase3Services(scenario);
    const first = await Promise.all([
      firstServices.automationService.getAutomations(scenario),
      firstServices.connectionService.getConnections(scenario),
      firstServices.permissionService.getPermissions(scenario),
      firstServices.memoryService.getMemory(scenario),
      firstServices.activityService.getActivity(scenario),
      firstServices.settingsService.getSettings(scenario),
    ]);
    const second = await Promise.all([
      secondServices.automationService.getAutomations(scenario),
      secondServices.connectionService.getConnections(scenario),
      secondServices.permissionService.getPermissions(scenario),
      secondServices.memoryService.getMemory(scenario),
      secondServices.activityService.getActivity(scenario),
      secondServices.settingsService.getSettings(scenario),
    ]);

    assert.deepEqual(first, second);
    assert.equal(first.every((snapshot) => snapshot.scenario === scenario), true);
  }
});
