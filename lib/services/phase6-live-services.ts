"use client";

import type {
  ActivityEvent,
  ActivityFilters,
  ActivitySnapshot,
  EventCapturePreview,
  ImportantPlace,
  NexusScenario,
  NoteArtifact,
  NoteCapturePreview,
  QuickCaptureResult,
  SettingsSnapshot,
  TimelineEntry,
  UserPreferences,
} from "@/lib/domain/contracts";
import type {
  DurableCapture,
  Phase6AuditEvent,
  Phase6Place,
  Phase6PreferencePayload,
  Phase6Profile,
} from "@/lib/api/contracts";
import type { NexusApiClient } from "@/lib/api/client";
import { NexusApiError } from "@/lib/api/client";
import type { SettingsService, SettingsSection } from "./settings-service";
import type { QuickCaptureService } from "./quick-capture-service";
import type { ActivityService } from "./activity-service";
import { createMockQuickCaptureService } from "@/lib/mocks/mock-quick-capture-service";
import { createMockPhase3Services } from "@/lib/mocks/mock-phase3-services";

export const PHASE6_CAPTURE_CHANGE_EVENT = "nexus:phase6-captures-change";

function timeInput(value: string) {
  return value.slice(0, 5);
}

function frontendPlaces(places: Phase6Place[]): ImportantPlace[] {
  return places.map((place) => ({
    id: place.id,
    label: place.label,
    address: place.address,
    travelMode: place.travelMode,
  }));
}

function preferencePayload(preferences: UserPreferences): Phase6PreferencePayload {
  return {
    notifications: preferences.notifications,
    personalization: preferences.personalization,
    privacy: preferences.privacy,
    accessibility: preferences.accessibility,
  };
}

function normalizePreferenceTimes(
  preferences: Phase6PreferencePayload,
): Phase6PreferencePayload {
  return {
    ...preferences,
    notifications: {
      ...preferences.notifications,
      morningBriefAt: timeInput(preferences.notifications.morningBriefAt),
      eveningBriefAt: timeInput(preferences.notifications.eveningBriefAt),
      quietHours: {
        ...preferences.notifications.quietHours,
        startsAt: timeInput(preferences.notifications.quietHours.startsAt),
        endsAt: timeInput(preferences.notifications.quietHours.endsAt),
      },
    },
  };
}

async function loadUserPreferences(
  apiClient: NexusApiClient,
  baseline: UserPreferences,
) {
  const [profile, places, preferences] = await Promise.all([
    apiClient.request<Phase6Profile>("/api/v1/profile"),
    apiClient.request<Phase6Place[]>("/api/v1/places"),
    apiClient.request<Phase6PreferencePayload>("/api/v1/preferences"),
  ]);
  const normalized = normalizePreferenceTimes(preferences.data);
  return {
    ...baseline,
    displayName: profile.data.displayName,
    timezone: profile.data.timezone,
    locale: profile.data.locale,
    places: frontendPlaces(places.data),
    ...normalized,
  } satisfies UserPreferences;
}

async function syncPlaces(
  apiClient: NexusApiClient,
  places: ImportantPlace[],
) {
  const current = (await apiClient.request<Phase6Place[]>("/api/v1/places")).data;
  const nextIds = new Set(places.map((place) => place.id));
  await Promise.all(
    current
      .filter((place) => !nextIds.has(place.id))
      .map((place) =>
        apiClient.request<void>(`/api/v1/places/${place.id}`, { method: "DELETE" }),
      ),
  );
  await Promise.all(
    places.map((place, index) => {
      const body = JSON.stringify({
        label: place.label,
        address: place.address,
        role: ["home", "campus", "work"].includes(place.label.toLowerCase())
          ? place.label.toLowerCase()
          : "other",
        travelMode: place.travelMode,
        isDefaultOrigin: index === 0,
      });
      const exists = current.some((item) => item.id === place.id);
      return apiClient.request<Phase6Place>(
        exists ? `/api/v1/places/${place.id}` : "/api/v1/places",
        { method: exists ? "PUT" : "POST", body },
      );
    }),
  );
}

export function createPhase6SettingsService(
  apiClient: NexusApiClient,
  initialSnapshot: SettingsSnapshot,
): SettingsService {
  const mock = createMockPhase3Services(initialSnapshot.scenario).settingsService;
  let current = initialSnapshot.preferences;

  const persist = async (
    section: SettingsSection,
    update: Partial<UserPreferences>,
  ) => {
    current = { ...current, ...structuredClone(update) };
    if (section === "profile") {
      await apiClient.request<Phase6Profile>("/api/v1/profile", {
        method: "PUT",
        body: JSON.stringify({
          displayName: current.displayName,
          timezone: current.timezone,
          locale: current.locale,
        }),
      });
    } else if (section === "places") {
      await syncPlaces(apiClient, current.places);
    } else {
      await apiClient.request<Phase6PreferencePayload>("/api/v1/preferences", {
        method: "PUT",
        body: JSON.stringify(preferencePayload(current)),
      });
    }
    current = await loadUserPreferences(apiClient, current);
    return structuredClone(current);
  };

  return {
    async getSettings() {
      current = await loadUserPreferences(apiClient, current);
      return {
        ...initialSnapshot,
        summary:
          "Profile and everyday preferences are retained by the Phase 6 NEXUS service.",
        preferences: structuredClone(current),
        notice: undefined,
      };
    },
    saveSection: persist,
    async resetSection(section) {
      const baseline = await mock.resetSection(section);
      const update =
        section === "profile"
          ? {
              displayName: baseline.displayName,
              timezone: baseline.timezone,
              locale: baseline.locale,
            }
          : section === "places"
            ? { places: baseline.places }
            : { [section]: baseline[section] };
      return persist(section, update);
    },
    previewNotification: mock.previewNotification,
    requestExport: mock.requestExport,
    requestDeletion: mock.requestDeletion,
  };
}

function stableKey(parts: string[]) {
  let hash = 2166136261;
  for (const character of parts.join("\u241f")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `quick-capture-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function captureHref(kind: "note" | "event", id: string, scenario: NexusScenario) {
  const route = kind === "note" ? "/app/notes" : "/app/timeline";
  return `${route}?scenario=${encodeURIComponent(scenario)}&capture=${encodeURIComponent(id)}`;
}

export function createPhase6QuickCaptureService(
  apiClient: NexusApiClient,
  scenario: NexusScenario,
): QuickCaptureService {
  const deterministic = createMockQuickCaptureService(scenario);
  const notify = () => window.dispatchEvent(new Event(PHASE6_CAPTURE_CHANGE_EVENT));

  return {
    resetSession() {
      // Durable Phase 6 captures intentionally survive route and browser-session reloads.
    },
    preview: deterministic.preview,
    reviewEvent: deterministic.reviewEvent,
    async saveNote(preview: NoteCapturePreview): Promise<QuickCaptureResult> {
      try {
        const response = await apiClient.request<DurableCapture>(
          "/api/v1/captures/notes",
          {
            method: "POST",
            body: JSON.stringify({
              title: preview.title,
              rawText: preview.body,
              sourceLabel: preview.source.label,
              canonicalFields: { tags: preview.tags },
              idempotencyKey: stableKey([
                "note",
                preview.title,
                preview.body,
                preview.source.label ?? "",
              ]),
            }),
          },
        );
        notify();
        return {
          id: `result-${response.data.id}`,
          mode: "note",
          status: "succeeded",
          summary: "Saved in NEXUS. This note will remain after you reload.",
          createdItemId: response.data.id,
          href: captureHref("note", response.data.id, scenario),
          recordedAt: response.data.createdAt,
        };
      } catch (error) {
        return failedCaptureResult("note", error);
      }
    },
    async scheduleEvent(preview: EventCapturePreview): Promise<QuickCaptureResult> {
      const reviewed = await deterministic.reviewEvent(preview);
      if (reviewed.issues.some((issue) => issue.severity === "error")) {
        return {
          id: "result-capture-event-invalid",
          mode: "event",
          status: "blocked",
          summary: "Review the required event fields before confirming.",
          recordedAt: new Date().toISOString(),
        };
      }
      try {
        const response = await apiClient.request<DurableCapture>(
          "/api/v1/captures/local-event-drafts",
          {
            method: "POST",
            body: JSON.stringify({
              title: preview.title,
              rawText: preview.sourceEvidence,
              sourceLabel: preview.source.label,
              canonicalFields: {
                date: preview.date,
                startTime: preview.startTime,
                endTime: preview.endTime,
                location: preview.location,
                description: preview.description,
                timezone: preview.timezone,
              },
              idempotencyKey: stableKey([
                "event",
                preview.title,
                preview.date,
                preview.startTime,
                preview.endTime,
                preview.location,
              ]),
            }),
          },
        );
        notify();
        return {
          id: `result-${response.data.id}`,
          mode: "event",
          status: "succeeded",
          summary:
            "Saved in NEXUS as a local event draft. No external calendar was changed.",
          createdItemId: response.data.id,
          href: captureHref("event", response.data.id, scenario),
          recordedAt: response.data.createdAt,
        };
      } catch (error) {
        return failedCaptureResult("event", error);
      }
    },
  };
}

function failedCaptureResult(
  mode: "note" | "event",
  error: unknown,
): QuickCaptureResult {
  return {
    id: `result-${mode}-unsaved`,
    mode,
    status: "failed-recoverably",
    summary:
      error instanceof NexusApiError
        ? error.message
        : "NEXUS did not save this item. Your reviewed draft is still available.",
    recordedAt: new Date().toISOString(),
  };
}

function auditToActivity(event: Phase6AuditEvent): ActivityEvent {
  const capture = event.eventType.startsWith("quick_capture.");
  return {
    id: event.id,
    occurredAt: event.createdAt,
    dateLabel: "Today",
    type: capture ? "manual-capture" : "source-read",
    title: event.eventType
      .split(".")
      .map((part) => part.replaceAll("_", " "))
      .join(" · "),
    summary: event.changedFields.length
      ? `Changed fields: ${event.changedFields.join(", ")}.`
      : "Identity and authorization were verified.",
    source: capture ? "Quick Capture" : "NEXUS account",
    actor: { kind: "user", label: "Signed-in user" },
    requiredAuthority: capture ? "prepare" : "observe",
    grantedAuthority: capture ? "prepare" : "observe",
    outcome: event.result === "success" ? "success" : "denied",
    evidence: [],
    result: event.result === "success" ? "Recorded by the Phase 6 API." : "Request denied.",
    reversible: false,
    reversalState: "not-available",
    relatedHref: capture ? "/app/notes" : "/app/settings",
    technicalDetail: `${event.eventType} / request ${event.requestId}`,
  };
}

function matchesActivity(event: ActivityEvent, filters: Partial<ActivityFilters>) {
  const query = filters.query?.trim().toLowerCase();
  if (
    query &&
    !`${event.title} ${event.summary} ${event.source}`.toLowerCase().includes(query)
  ) {
    return false;
  }
  if (filters.types?.length && !filters.types.includes(event.type)) return false;
  if (filters.sources?.length && !filters.sources.includes(event.source)) return false;
  if (filters.authorities?.length && !filters.authorities.includes(event.requiredAuthority)) {
    return false;
  }
  return !(filters.outcomes?.length && !filters.outcomes.includes(event.outcome));
}

export function createPhase6ActivityService(
  apiClient: NexusApiClient,
  initialSnapshot: ActivitySnapshot,
): ActivityService {
  const mock = createMockPhase3Services(initialSnapshot.scenario).activityService;
  return {
    async getActivity(_scenario, filters = {}) {
      const response = await apiClient.request<Phase6AuditEvent[]>("/api/v1/activity");
      const events = response.data.map(auditToActivity).filter((event) =>
        matchesActivity(event, filters),
      );
      return {
        ...initialSnapshot,
        summary: "Audit-safe records from the authenticated Phase 6 service.",
        viewState: events.length ? "populated" : "empty",
        events,
        availableSources: [...new Set(events.map((event) => event.source))],
        notice: undefined,
      };
    },
    recordManualCapture: mock.recordManualCapture,
    retryEvent: mock.retryEvent,
    reverseEvent: mock.reverseEvent,
    exportActivity: mock.exportActivity,
  };
}

export async function loadDurableCaptures(apiClient: NexusApiClient) {
  return (await apiClient.request<DurableCapture[]>("/api/v1/captures")).data;
}

export function durableCaptureToNote(capture: DurableCapture): NoteArtifact | null {
  if (capture.kind !== "note") return null;
  const tags = Array.isArray(capture.canonicalFields.tags)
    ? capture.canonicalFields.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
  return {
    id: capture.id,
    title: capture.title,
    group: "Quick Capture",
    state: "draft",
    updatedAt: capture.updatedAt,
    summary: "Durable manual note saved in NEXUS.",
    body: capture.rawText,
    sourceMaterialAvailable: true,
    citations: [],
    actionItems: [],
    unresolvedQuestions: [],
    confidence: 1,
    provenance: "manual-paste",
    sourceLabel: capture.sourceLabel ?? undefined,
    tags,
  };
}

export function durableCaptureToTimeline(
  capture: DurableCapture,
): TimelineEntry | null {
  if (capture.kind !== "local-event-draft") return null;
  const field = (key: string) =>
    typeof capture.canonicalFields[key] === "string"
      ? (capture.canonicalFields[key] as string)
      : "";
  const date = field("date");
  const startTime = field("startTime");
  const endTime = field("endTime");
  return {
    id: capture.id,
    day: date,
    startsAt: `${date}T${startTime}:00`,
    endsAt: endTime ? `${date}T${endTime}:00` : undefined,
    timeLabel: startTime,
    endLabel: endTime || undefined,
    title: capture.title,
    detail:
      field("location") ||
      "Local NEXUS event draft; no external calendar was changed.",
    kind: "event",
    status: "confirmed",
    source: capture.sourceLabel || "Quick Capture",
    freshness: "fresh",
    requiredAuthority: "ask",
    provenance: "manual-paste",
    sourceEvidence: capture.rawText,
    timezone: field("timezone"),
  };
}
