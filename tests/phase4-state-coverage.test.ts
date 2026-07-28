import assert from "node:assert/strict";
import test from "node:test";
import {
  PHASE4_STATES,
  ROUTE_STATE_COVERAGE,
  phase4CoverageIsComplete,
  stateDimensionsForScenario,
} from "../lib/domain/state-coverage";
import {
  buildInsightsSnapshot,
  buildKnowledgeSnapshot,
  buildNexusWorkspaceSnapshot,
  buildNotesSnapshot,
  buildTimelineSnapshot,
} from "../lib/mocks/phase2-fixtures";
import { buildTodaySnapshot } from "../lib/mocks/today-fixtures";
import { createMockPhase3Services } from "../lib/mocks/mock-phase3-services";

test("the route-to-state matrix implements every applicable Phase 4 cell", () => {
  assert.equal(phase4CoverageIsComplete(), true);
  assert.equal(ROUTE_STATE_COVERAGE.length, 14);

  for (const route of ROUTE_STATE_COVERAGE) {
    assert.deepEqual(route.implemented, route.applicable);
    for (const state of PHASE4_STATES) {
      assert.equal(
        route.applicable.includes(state) || Boolean(route.nonApplicable[state]),
        true,
        `${route.route} must implement ${state} or explain why it does not apply`,
      );
    }
  }
});

test("state concerns remain separate instead of collapsing into one view string", () => {
  assert.deepEqual(stateDimensionsForScenario("no-connections"), {
    data: "empty",
    source: "disconnected",
    intelligence: "ready",
    action: "idle",
    configuration: "no-connections",
  });
  assert.deepEqual(stateDimensionsForScenario("degraded-ai"), {
    data: "populated",
    source: "fresh",
    intelligence: "degraded",
    action: "idle",
    configuration: "configured",
  });
  assert.equal(
    stateDimensionsForScenario("action-running").action,
    "running",
  );
});

test("first use, configured empty, and no-connections have distinct behaviour", () => {
  const firstUse = buildTodaySnapshot("first-use");
  const empty = buildTodaySnapshot("empty");
  const noConnections = buildTodaySnapshot("no-connections");
  const notes = buildNotesSnapshot("no-connections");
  const knowledge = buildKnowledgeSnapshot("no-connections");

  assert.equal(firstUse.state.configuration, "first-use");
  assert.equal(empty.state.configuration, "configured");
  assert.equal(noConnections.connections.length, 0);
  assert.match(noConnections.notice?.detail ?? "", /Quick Capture/i);
  assert.equal(notes.notes.length > 0, true);
  assert.equal(notes.notes.every((note) => note.citations.length === 0), true);
  assert.equal(
    knowledge.sources.every((source) => source.kind === "internal-note"),
    true,
  );
});

test("partial, rate-limited, stale, and source-error failures stay regional", () => {
  const partial = buildTimelineSnapshot("partial-connections");
  const limited = buildTimelineSnapshot("rate-limited");
  const stale = buildKnowledgeSnapshot("stale-source");
  const failed = buildKnowledgeSnapshot("error");

  assert.equal(partial.groups.length > 0, true);
  assert.match(partial.notice ?? "", /remain disconnected/i);

  const limitedRoute = limited.sourceHealth.find(
    (source) => source.state === "rate-limited",
  );
  assert.equal(limitedRoute?.freshness, "stale");
  assert.match(limited.notice ?? "", /last-known/i);

  assert.equal(
    stale.sources.some((source) => source.status === "stale"),
    true,
  );
  assert.equal(stale.recent.length > 0, true);

  assert.equal(failed.viewState, "error");
  assert.equal(failed.recent.length > 0, true);
  assert.equal(
    failed.sourceHealth.some((source) => source.state === "error"),
    true,
  );
});

test("revoked permission blocks dependent content and provides recovery language", async () => {
  const timeline = buildTimelineSnapshot("permission-revoked");
  const insights = buildInsightsSnapshot("permission-revoked");
  const { permissionService, automationService } =
    createMockPhase3Services("permission-revoked");
  const permissions = await permissionService.getPermissions(
    "permission-revoked",
  );
  const automations = await automationService.getAutomations(
    "permission-revoked",
  );

  assert.equal(timeline.groups.length, 0);
  assert.equal(insights.primary, null);
  assert.equal(
    permissions.grants.some((grant) => grant.status === "revoked"),
    true,
  );
  assert.equal(
    automations.automations.some((automation) => automation.status === "blocked"),
    true,
  );
  assert.match(permissions.notice ?? "", /revoked/i);
});

test("offline and degraded-AI preserve honest deterministic fallbacks", () => {
  const offline = buildTimelineSnapshot("offline");
  const degraded = buildNexusWorkspaceSnapshot("degraded-ai");
  const degradedNotes = buildNotesSnapshot("degraded-ai");

  assert.equal(offline.state.source, "offline");
  assert.equal(
    offline.groups
      .flatMap((group) => group.entries)
      .every((entry) => entry.freshness === "stale"),
    true,
  );
  assert.equal(degraded.state.intelligence, "degraded");
  assert.match(degraded.notice ?? "", /manual notes/i);
  assert.equal(degradedNotes.notes.length > 0, true);
});

test("pending, running, succeeded, and recoverable action states agree across routes", async () => {
  const scenarios = [
    ["action-pending", "pending-approval", "pending"],
    ["action-running", "running", "running"],
    ["action-succeeded", "succeeded", "success"],
    ["action-recoverable-failure", "failed-recoverably", "failed"],
  ] as const;

  for (const [scenario, expectedAction, expectedActivity] of scenarios) {
    const today = buildTodaySnapshot(scenario);
    const timeline = buildTimelineSnapshot(scenario);
    const nexus = buildNexusWorkspaceSnapshot(scenario);
    const { automationService, activityService } =
      createMockPhase3Services(scenario);
    const automations = await automationService.getAutomations(scenario);
    const activity = await activityService.getActivity(scenario);
    const focus = timeline.groups
      .flatMap((group) => group.entries)
      .find((entry) => entry.id === "timeline-networks-focus");

    assert.equal(today.state.action, expectedAction);
    assert.equal(focus?.proposedAction?.status, expectedAction);
    assert.equal(nexus.state.action, expectedAction);
    assert.equal(automations.state.action, expectedAction);
    assert.equal(activity.state.action, expectedAction);
    assert.equal(
      activity.events.some((event) => event.outcome === expectedActivity),
      true,
    );
  }
});

test("the approved populated scenarios retain their established content", () => {
  const today = buildTodaySnapshot("rain-and-traffic");
  const timeline = buildTimelineSnapshot("student-normal-day");
  const notes = buildNotesSnapshot("rain-and-traffic");

  assert.equal(today.insight?.title, "Leave by 9:12.");
  assert.equal(today.nextEvent?.title, "Machine Learning Systems");
  assert.equal(timeline.groups.length, 3);
  assert.equal(notes.notes.length >= 3, true);
  assert.equal(
    notes.notes.some((note) => note.id === "note-routing-analysis"),
    true,
  );
});
