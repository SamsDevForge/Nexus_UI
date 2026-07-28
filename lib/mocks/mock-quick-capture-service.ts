import type {
  CaptureValidationIssue,
  EventCapturePreview,
  NexusScenario,
  NoteCapturePreview,
  QuickCaptureDraft,
  QuickCaptureResult,
} from "@/lib/domain/contracts";
import type { QuickCaptureService } from "@/lib/services/quick-capture-service";
import {
  notesService,
  timelineService,
} from "@/lib/mocks/mock-phase2-services";
import { createMockPhase3Services } from "@/lib/mocks/mock-phase3-services";
import { resetMockSessionState } from "@/lib/mocks/mock-session-state";
import { canonicalScenario } from "@/lib/domain/state-coverage";

const NOW = "2026-07-25T09:30:00+05:30";

const monthByName: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

function cleanLine(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function titleFromText(rawText: string) {
  const line = rawText
    .split(/\r?\n/)
    .map(cleanLine)
    .find((item) => item && !/^(date|time|location|venue)\s*:/i.test(item));
  return line || "Quick capture";
}

function extractDate(rawText: string) {
  const iso = rawText.match(/\b(20\d{2})-(0[1-9]|1[0-2])-([0-2]\d|3[01])\b/);
  if (iso) {
    return { date: iso[0], ambiguous: false };
  }

  const named = rawText.match(
    /\b([0-2]?\d|3[01])\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i,
  );
  if (named) {
    const month = monthByName[named[2].toLowerCase()];
    return {
      date: `${named[3]}-${month}-${named[1].padStart(2, "0")}`,
      ambiguous: false,
    };
  }

  const numeric = rawText.match(
    /\b(0?[1-9]|[12]\d|3[01])[/-](0?[1-9]|1[0-2])[/-](\d{2}|20\d{2})\b/,
  );
  if (numeric) {
    return { date: "", ambiguous: true };
  }
  return { date: "", ambiguous: false };
}

function toTwentyFourHour(hourText: string, minuteText: string, period?: string) {
  let hour = Number(hourText);
  const minute = minuteText.padStart(2, "0");
  if (period) {
    const normalized = period.toLowerCase();
    if (normalized === "pm" && hour < 12) hour += 12;
    if (normalized === "am" && hour === 12) hour = 0;
  }
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function extractTimes(rawText: string) {
  const matches = [
    ...rawText.matchAll(
      /\b(0?[1-9]|1[0-2]):([0-5]\d)\s*(am|pm)\b|\b([01]?\d|2[0-3]):([0-5]\d)\b/gi,
    ),
  ].map((match) =>
    match[1]
      ? toTwentyFourHour(match[1], match[2], match[3])
      : toTwentyFourHour(match[4], match[5]),
  );
  return {
    startTime: matches[0] ?? "",
    endTime: matches[1] ?? "",
  };
}

function extractLocation(rawText: string) {
  const match = rawText.match(
    /(?:^|[\r\n.;!?]\s*)(?:location|venue)\s*:\s*([^\r\n.;!?]+)/i,
  );
  return match ? cleanLine(match[1]) : "";
}

function validateEvent(preview: EventCapturePreview) {
  const issues: CaptureValidationIssue[] = [];
  if (!preview.title.trim()) {
    issues.push({
      field: "eventTitle",
      code: "required",
      severity: "error",
      message: "Add an event title.",
    });
  }
  if (!preview.date) {
    issues.push({
      field: "date",
      code: "required",
      severity: "error",
      message: "Choose an unambiguous date.",
    });
  }
  if (!preview.startTime) {
    issues.push({
      field: "startTime",
      code: "required",
      severity: "error",
      message: "Add a start time.",
    });
  }
  if (
    preview.startTime &&
    preview.endTime &&
    preview.endTime <= preview.startTime
  ) {
    issues.push({
      field: "endTime",
      code: "end-before-start",
      severity: "error",
      message: "End time must be after the start time.",
    });
  }
  return issues;
}

function resultHref(route: "/app/notes" | "/app/timeline", scenario: NexusScenario, id: string) {
  return `${route}?scenario=${encodeURIComponent(scenario)}&capture=${encodeURIComponent(id)}`;
}

export function createMockQuickCaptureService(
  scenario: NexusScenario,
): QuickCaptureService {
  const { activityService, settingsService } = createMockPhase3Services(scenario);
  const canonical = canonicalScenario(scenario);

  const recordFailure = async (
    mode: "note" | "event",
    id: string,
    summary: string,
  ) =>
    activityService.recordManualCapture({
      scenario,
      mode,
      createdItemId: id,
      title: mode === "note" ? "Manual note capture failed" : "Manual event capture failed",
      summary,
      relatedHref: mode === "note" ? "/app/notes" : "/app/timeline",
      outcome: "failed",
    });

  return {
    resetSession() {
      resetMockSessionState(scenario);
    },

    async preview(draft: QuickCaptureDraft) {
      if (draft.mode === "note") {
        const title = draft.noteTitle.trim() || titleFromText(draft.rawText);
        const issues: CaptureValidationIssue[] = [];
        if (!draft.rawText.trim()) {
          issues.push({
            field: "rawText",
            code: "required",
            severity: "error",
            message: "Paste plain text before continuing.",
          });
        }
        if (!title.trim()) {
          issues.push({
            field: "noteTitle",
            code: "required",
            severity: "error",
            message: "Add a note title.",
          });
        }
        const preview: NoteCapturePreview = {
          mode: "note",
          title,
          body: draft.rawText,
          tags: draft.tags,
          source: draft.source,
          provenance: "manual-paste",
          issues,
        };
        return preview;
      }

      const settings = await settingsService.getSettings(scenario);
      const extractedDate = extractDate(draft.rawText);
      const extractedTimes = extractTimes(draft.rawText);
      const preview: EventCapturePreview = {
        mode: "event",
        title: draft.event.title.trim() || titleFromText(draft.rawText),
        date: draft.event.date || extractedDate.date,
        startTime: draft.event.startTime || extractedTimes.startTime,
        endTime: draft.event.endTime || extractedTimes.endTime,
        location: draft.event.location.trim() || extractLocation(draft.rawText),
        description: draft.event.description.trim(),
        timezone: settings.preferences.timezone,
        sourceEvidence: draft.rawText,
        source: draft.source,
        provenance: "manual-paste",
        issues: [],
      };
      preview.issues = validateEvent(preview);
      if (extractedDate.ambiguous && !draft.event.date) {
        preview.issues.unshift({
          field: "date",
          code: "ambiguous-date",
          severity: "review",
          message:
            "The numeric date could use day/month or month/day order. Choose the date explicitly.",
        });
      }
      return preview;
    },

    async reviewEvent(preview: EventCapturePreview) {
      return {
        ...preview,
        issues: validateEvent(preview),
      };
    },

    async saveNote(preview: NoteCapturePreview): Promise<QuickCaptureResult> {
      const pendingId = "capture-note-pending";
      if (canonical === "offline" || canonical === "action-recoverable-failure") {
        const summary =
          canonical === "offline"
            ? "The draft is still editable, but an offline demo result cannot be recorded."
            : "The manual note was not recorded. Review the draft and retry.";
        const activity = await recordFailure("note", pendingId, summary);
        return {
          id: `result-${pendingId}`,
          mode: "note",
          status: "failed-recoverably",
          summary,
          activityId: activity.id,
          recordedAt: NOW,
        };
      }

      const note = await notesService.createManualCapture(scenario, preview);
      const activity = await activityService.recordManualCapture({
        scenario,
        mode: "note",
        createdItemId: note.id,
        title: `Captured note · ${note.title}`,
        summary: "Plain text was saved as a session-only Nexus Note.",
        relatedHref: resultHref("/app/notes", scenario, note.id),
        outcome: "success",
      });
      return {
        id: `result-${note.id}`,
        mode: "note",
        status: "succeeded",
        summary: "Saved as a Nexus Note for this demo session.",
        createdItemId: note.id,
        activityId: activity.id,
        href: resultHref("/app/notes", scenario, note.id),
        recordedAt: NOW,
      };
    },

    async scheduleEvent(preview: EventCapturePreview): Promise<QuickCaptureResult> {
      const reviewed = await this.reviewEvent(preview);
      if (reviewed.issues.some((issue) => issue.severity === "error")) {
        return {
          id: "result-capture-event-invalid",
          mode: "event",
          status: "blocked",
          summary: "Review the required event fields before confirming.",
          recordedAt: NOW,
        };
      }

      const pendingId = "capture-event-pending";
      if (canonical === "permission-revoked") {
        return {
          id: `result-${pendingId}`,
          mode: "event",
          status: "blocked",
          summary:
            "Calendar authority is revoked. Restore the minimum permission before confirming an event.",
          recordedAt: NOW,
          href: resultHref("/app/timeline", scenario, pendingId),
        };
      }
      if (canonical === "offline" || canonical === "action-recoverable-failure") {
        const summary =
          canonical === "offline"
            ? "The event draft is still editable, but no scheduled result can be recorded offline."
            : "The event was not scheduled. Review the fields and retry.";
        const activity = await recordFailure("event", pendingId, summary);
        return {
          id: `result-${pendingId}`,
          mode: "event",
          status: "failed-recoverably",
          summary,
          activityId: activity.id,
          recordedAt: NOW,
        };
      }

      const event = await timelineService.scheduleManualEvent(scenario, reviewed);
      const activity = await activityService.recordManualCapture({
        scenario,
        mode: "event",
        createdItemId: event.id,
        title: `Scheduled event · ${event.title}`,
        summary:
          "The reviewed event was recorded in the session-only Timeline mock.",
        relatedHref: resultHref("/app/timeline", scenario, event.id),
        outcome: "success",
      });
      return {
        id: `result-${event.id}`,
        mode: "event",
        status: "succeeded",
        summary: "Scheduled in Timeline for this demo session.",
        createdItemId: event.id,
        activityId: activity.id,
        href: resultHref("/app/timeline", scenario, event.id),
        recordedAt: NOW,
      };
    },
  };
}
