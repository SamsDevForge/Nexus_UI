import type {
  EventCapturePreview,
  NexusScenario,
  TimelineEntry,
  TimelineSnapshot,
} from "@/lib/domain/contracts";

export interface TimelineService {
  getTimeline(
    scenario: NexusScenario,
    selectedDay?: string,
  ): Promise<TimelineSnapshot>;
  scheduleManualEvent(
    scenario: NexusScenario,
    preview: EventCapturePreview,
  ): Promise<TimelineEntry>;
  resolveSuggestion(
    scenario: NexusScenario,
    entryId: string,
    decision: "accept" | "reject" | "reschedule",
  ): Promise<{ entryId: string; status: "accepted" | "rejected" | "rescheduled"; message: string }>;
}
