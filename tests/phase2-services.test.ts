import assert from "node:assert/strict";
import test from "node:test";
import type { NexusScenario } from "../lib/domain/contracts";
import {
  insightsService,
  knowledgeService,
  nexusService,
  notesService,
  searchService,
  timelineService,
} from "../lib/mocks/mock-phase2-services";

const scenarios: NexusScenario[] = [
  "first-use",
  "loading",
  "student-normal-day",
  "rain-and-traffic",
  "deadline-risk",
  "connection-stale",
  "permission-denied",
  "offline",
  "action-failed",
  "reduced-motion",
];

test("every Phase 2 service is deterministic across the shared scenarios", async () => {
  for (const scenario of scenarios) {
    const first = await Promise.all([
      timelineService.getTimeline(scenario),
      insightsService.getInsights(scenario),
      nexusService.getWorkspace(scenario),
      knowledgeService.getKnowledge(scenario),
      notesService.getNotes(scenario),
      searchService.search(scenario, ""),
    ]);
    const second = await Promise.all([
      timelineService.getTimeline(scenario),
      insightsService.getInsights(scenario),
      nexusService.getWorkspace(scenario),
      knowledgeService.getKnowledge(scenario),
      notesService.getNotes(scenario),
      searchService.search(scenario, ""),
    ]);

    assert.deepEqual(first, second);
    assert.equal(first.every((snapshot) => snapshot.scenario === scenario), true);
  }
});

test("deadline-risk tells one consistent story across every Phase 2 boundary", async () => {
  const [timeline, insights, nexus, knowledge, notes, search] = await Promise.all([
    timelineService.getTimeline("deadline-risk"),
    insightsService.getInsights("deadline-risk"),
    nexusService.getWorkspace("deadline-risk"),
    knowledgeService.getKnowledge("deadline-risk"),
    notesService.getNotes("deadline-risk"),
    searchService.search("deadline-risk", "Packet routing"),
  ]);

  assert.equal(
    timeline.groups.some((group) =>
      group.entries.some((entry) => entry.title === "Packet routing analysis"),
    ),
    true,
  );
  assert.equal(insights.primary?.id, "insight-deadline");
  assert.equal(nexus.selectedScriptId, "script-focus");
  assert.match(nexus.contextSummary, /Packet routing analysis/);
  assert.equal(
    knowledge.recent.some((document) => document.title === "Packet routing lab brief"),
    true,
  );
  assert.equal(
    notes.notes.some((note) => note.title === "Packet routing analysis"),
    true,
  );
  assert.equal(
    search.results.some((result) => result.title === "Packet routing analysis"),
    true,
  );
});

test("denied, offline, stale and failed states remain explicit", async () => {
  for (const service of [
    timelineService.getTimeline.bind(timelineService),
    insightsService.getInsights.bind(insightsService),
    nexusService.getWorkspace.bind(nexusService),
    knowledgeService.getKnowledge.bind(knowledgeService),
    notesService.getNotes.bind(notesService),
  ]) {
    assert.equal((await service("permission-denied")).viewState, "permission-denied");
    assert.equal((await service("offline")).viewState, "offline");
    assert.equal((await service("connection-stale")).viewState, "stale");
    assert.equal((await service("action-failed")).viewState, "error");
  }

  const deniedSearch = await searchService.search("permission-denied", "");
  assert.equal(
    deniedSearch.results.every((result) => result.permission === "restricted"),
    true,
  );
  const offlineSearch = await searchService.search("offline", "");
  assert.equal(offlineSearch.localOnly, true);
  assert.equal(
    offlineSearch.results.every((result) => result.freshness === "stale"),
    true,
  );
});

test("timeline, insight and NEXUS actions record safe deterministic outcomes", async () => {
  const accepted = await timelineService.resolveSuggestion(
    "deadline-risk",
    "timeline-networks-focus",
    "accept",
  );
  const rescheduled = await timelineService.resolveSuggestion(
    "deadline-risk",
    "timeline-networks-focus",
    "reschedule",
  );
  const insightAction = await insightsService.resolveAction(
    "insight-deadline",
    "approve",
  );
  const nexusAction = await nexusService.resolvePreparedAction(
    "proposal-focus-networks",
    "approve",
  );

  assert.equal(accepted.status, "accepted");
  assert.match(accepted.message, /No calendar write/);
  assert.equal(rescheduled.status, "rescheduled");
  assert.equal(insightAction.status, "approved");
  assert.match(insightAction.message, /No provider/);
  assert.equal(nexusAction.status, "approved");
  assert.match(nexusAction.message, /calendar remains unchanged/);
});

test("NEXUS exposes all required scripted conversations and recorded tool truth", async () => {
  const workspace = await nexusService.getWorkspace("deadline-risk");
  const prompts = workspace.scripts.map((script) => script.prompt);

  assert.deepEqual(prompts, [
    "Why should I leave at 9:12?",
    "What do I need for tomorrow?",
    "What am I forgetting?",
    "Find my latest Machine Learning notes.",
    "Prepare a focus block for the assignment.",
  ]);

  const focus = await nexusService.runScript("deadline-risk", "script-focus");
  assert.equal(focus.proposal?.requiredAuthority, "ask");
  assert.equal(focus.toolResult?.status, "not-run");
});

test("knowledge, notes and unified search use their service contracts", async () => {
  const document = await knowledgeService.getDocument(
    "student-normal-day",
    "document-routing-brief",
  );
  const knowledgeResults = await knowledgeService.searchKnowledge(
    "student-normal-day",
    "routing",
  );
  const updatedNote = await notesService.updateNote("note-routing-analysis", {
    state: "reviewed",
  });
  const prepared = await notesService.resolvePreparation(
    "note-routing-analysis",
    "approve",
  );
  const filtered = await searchService.search(
    "student-normal-day",
    "",
    { types: ["note"], sources: ["Nexus Notes"] },
  );

  assert.equal(document?.title, "Packet routing lab brief");
  assert.equal(knowledgeResults.length > 0, true);
  assert.equal(updatedNote.state, "reviewed");
  assert.equal(prepared.status, "approved");
  assert.equal(filtered.results.every((result) => result.type === "note"), true);
  assert.equal(
    filtered.results.every((result) => result.source === "Nexus Notes"),
    true,
  );
});
