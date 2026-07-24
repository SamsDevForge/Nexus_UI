import assert from "node:assert/strict";
import test from "node:test";
import type { TodayScenario } from "../lib/domain/contracts";
import {
  buildTodaySnapshot,
  TODAY_SCENARIOS,
} from "../lib/mocks/today-fixtures";

test("every named scenario builds a matching deterministic snapshot", () => {
  for (const { value } of TODAY_SCENARIOS) {
    const first = buildTodaySnapshot(value);
    const second = buildTodaySnapshot(value);

    assert.equal(first.scenario, value);
    assert.deepEqual(first, second);
  }
});

test("rain and traffic insight is evidence-backed and approval-safe", () => {
  const snapshot = buildTodaySnapshot("rain-and-traffic");

  assert.equal(snapshot.viewState, "populated");
  assert.equal(snapshot.insight?.kind, "departure");
  assert.equal(snapshot.insight?.requiredAuthority, "suggest");
  assert.equal(snapshot.insight?.proposedAction?.requiredAuthority, "ask");
  assert.ok((snapshot.insight?.evidence.length ?? 0) >= 3);
  assert.equal(snapshot.nextEvent?.startsAt, "2026-07-25T10:00:00+05:30");
});

test("first-use and permission states never invent schedule content", () => {
  const scenarios: TodayScenario[] = ["first-use", "permission-denied"];

  for (const scenario of scenarios) {
    const snapshot = buildTodaySnapshot(scenario);
    assert.equal(snapshot.insight, null);
    assert.equal(snapshot.nextEvent, null);
    assert.deepEqual(snapshot.timeline, []);
  }
});

test("stale and offline scenarios expose freshness explicitly", () => {
  const stale = buildTodaySnapshot("connection-stale");
  const offline = buildTodaySnapshot("offline");

  assert.equal(stale.systemState, "degraded");
  assert.equal(stale.connections.some((connection) => connection.health === "stale"), true);
  assert.equal(
    offline.signals.some((signal) => signal.freshness === "stale"),
    true,
  );
});
