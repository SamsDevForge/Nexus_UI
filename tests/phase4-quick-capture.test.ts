import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type {
  EventCapturePreview,
  QuickCaptureDraft,
} from "../lib/domain/contracts";
import { createMockQuickCaptureService } from "../lib/mocks/mock-quick-capture-service";
import {
  notesService,
  timelineService,
} from "../lib/mocks/mock-phase2-services";
import { createMockPhase3Services } from "../lib/mocks/mock-phase3-services";

function draft(
  mode: "note" | "event",
  rawText: string,
): QuickCaptureDraft {
  return {
    id: "test-draft",
    mode,
    rawText,
    source: { kind: "manual-paste", label: "College portal" },
    noteTitle: "",
    tags: ["course"],
    event: {
      title: "",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      description: "",
    },
  };
}

test("Quick Capture uses the supplied launcher asset and accessible focus-safe shell", async () => {
  const [component, css, icon] = await Promise.all([
    readFile("components/nexus/QuickCapture.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
    readFile("public/icons/nexus-notepad.svg", "utf8"),
  ]);

  assert.match(component, /src="\/icons\/nexus-notepad\.svg"/);
  assert.match(component, /aria-label="Open Quick Capture"/);
  assert.match(component, /launcherRef\.current\?\.focus\(\)/);
  assert.match(component, /focusableElements/);
  assert.match(component, /stage === "discard"/);
  assert.match(component, /aria-live="polite"/);
  assert.doesNotMatch(component, /navigator\.clipboard|readText\(/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(icon, /<svg/);
});

test("save-as-note preview preserves plain text and records session note plus Activity", async () => {
  const service = createMockQuickCaptureService("rain-and-traffic");
  service.resetSession();
  const raw = "<img src=x onerror=alert(1)>\nRemember the lab brief.";
  const preview = await service.preview(draft("note", raw));

  assert.equal(preview.mode, "note");
  assert.equal(preview.body, raw);
  assert.equal(preview.provenance, "manual-paste");
  assert.equal(preview.source.label, "College portal");

  const result = await service.saveNote(preview);
  assert.equal(result.status, "succeeded");
  assert.match(result.href ?? "", /\/app\/notes/);

  const notes = await notesService.getNotes("rain-and-traffic");
  const captured = notes.notes.find((note) => note.id === result.createdItemId);
  assert.equal(captured?.body, raw);
  assert.equal(captured?.provenance, "manual-paste");
  assert.equal(captured?.sourceLabel, "College portal");

  const activity = await createMockPhase3Services(
    "rain-and-traffic",
  ).activityService.getActivity("rain-and-traffic");
  assert.equal(
    activity.events.some(
      (event) =>
        event.type === "manual-capture" &&
        event.relatedHref.includes(result.createdItemId ?? ""),
    ),
    true,
  );
});

test("unambiguous event extraction requires confirmation and records Timeline evidence", async () => {
  const service = createMockQuickCaptureService("rain-and-traffic");
  service.resetSession();
  const raw =
    "Networks viva\n25 July 2026\n14:30 to 15:15\nLocation: Lab 4";
  const preview = await service.preview(draft("event", raw));

  assert.equal(preview.mode, "event");
  assert.equal(preview.date, "2026-07-25");
  assert.equal(preview.startTime, "14:30");
  assert.equal(preview.endTime, "15:15");
  assert.equal(preview.location, "Lab 4");
  assert.equal(preview.timezone, "Asia/Kolkata");
  assert.equal(preview.issues.length, 0);

  const result = await service.scheduleEvent(preview);
  assert.equal(result.status, "succeeded");
  assert.match(result.href ?? "", /\/app\/timeline/);

  const timeline = await timelineService.getTimeline("rain-and-traffic");
  const captured = timeline.groups
    .flatMap((group) => group.entries)
    .find((entry) => entry.id === result.createdItemId);
  assert.equal(captured?.provenance, "manual-paste");
  assert.equal(captured?.sourceEvidence, raw);
  assert.equal(captured?.status, "confirmed");

  const activity = await createMockPhase3Services(
    "rain-and-traffic",
  ).activityService.getActivity("rain-and-traffic");
  assert.equal(
    activity.events.some(
      (event) =>
        event.type === "manual-capture" &&
        event.title.startsWith("Scheduled event"),
    ),
    true,
  );
});

test("a labelled location is extracted when it follows event details on the same line", async () => {
  const service = createMockQuickCaptureService("rain-and-traffic");
  service.resetSession();
  const preview = await service.preview(
    draft(
      "event",
      "Systems seminar on 2026-08-02 at 14:30. Location: Lab 4",
    ),
  );

  assert.equal(preview.mode, "event");
  assert.equal(preview.location, "Lab 4");
});

test("ambiguous numeric dates and incomplete times are never guessed", async () => {
  const service = createMockQuickCaptureService("rain-and-traffic");
  service.resetSession();
  const preview = await service.preview(
    draft("event", "Project review\n08/09/2026\nLocation: Studio"),
  );

  assert.equal(preview.mode, "event");
  assert.equal(preview.date, "");
  assert.equal(preview.startTime, "");
  assert.equal(
    preview.issues.some((issue) => issue.code === "ambiguous-date"),
    true,
  );
  assert.equal(
    preview.issues.some(
      (issue) => issue.field === "startTime" && issue.severity === "error",
    ),
    true,
  );

  const corrected: EventCapturePreview = {
    ...preview,
    date: "2026-09-08",
    startTime: "11:00",
  };
  const reviewed = await service.reviewEvent(corrected);
  assert.equal(reviewed.issues.length, 0);
});

test("manual capture stays useful without connections or AI", async () => {
  for (const scenario of ["no-connections", "degraded-ai"] as const) {
    const service = createMockQuickCaptureService(scenario);
    service.resetSession();
    const preview = await service.preview(
      draft("note", `Manual ${scenario} note`),
    );
    assert.equal(preview.mode, "note");
    const result = await service.saveNote(preview);
    assert.equal(result.status, "succeeded");
    const notes = await notesService.getNotes(scenario);
    assert.equal(
      notes.notes.some((note) => note.id === result.createdItemId),
      true,
    );
  }
});

test("offline, revoked-authority, and recoverable failure never claim success", async () => {
  const offline = createMockQuickCaptureService("offline");
  offline.resetSession();
  const offlinePreview = await offline.preview(
    draft("note", "Keep this draft while offline"),
  );
  assert.equal(offlinePreview.mode, "note");
  const offlineResult = await offline.saveNote(offlinePreview);
  assert.equal(offlineResult.status, "failed-recoverably");
  assert.equal(
    (await notesService.getNotes("offline")).notes.some(
      (note) => note.id === offlineResult.createdItemId,
    ),
    false,
  );

  const revoked = createMockQuickCaptureService("permission-revoked");
  revoked.resetSession();
  const revokedPreview = await revoked.preview(
    draft("event", "Review\n2026-07-25\n14:00"),
  );
  assert.equal(revokedPreview.mode, "event");
  const blocked = await revoked.scheduleEvent(revokedPreview);
  assert.equal(blocked.status, "blocked");

  const failed = createMockQuickCaptureService("action-recoverable-failure");
  failed.resetSession();
  const failedPreview = await failed.preview(
    draft("note", "Retry this manual note"),
  );
  assert.equal(failedPreview.mode, "note");
  const failedResult = await failed.saveNote(failedPreview);
  assert.equal(failedResult.status, "failed-recoverably");
});

test("capture records reset predictably with the deterministic scenario session", async () => {
  const service = createMockQuickCaptureService("reduced-motion");
  service.resetSession();
  const preview = await service.preview(draft("note", "Reduced motion note"));
  assert.equal(preview.mode, "note");
  await service.saveNote(preview);
  assert.equal(
    (await notesService.getNotes("reduced-motion")).notes.some(
      (note) => note.provenance === "manual-paste",
    ),
    true,
  );
  service.resetSession();
  assert.equal(
    (await notesService.getNotes("reduced-motion")).notes.some(
      (note) => note.provenance === "manual-paste",
    ),
    false,
  );
});
