import type {
  NexusScenario,
  TimelineSnapshot,
} from "@/lib/domain/contracts";

export interface TimelineService {
  getTimeline(
    scenario: NexusScenario,
    selectedDay?: string,
  ): Promise<TimelineSnapshot>;
  resolveSuggestion(
    scenario: NexusScenario,
    entryId: string,
    decision: "accept" | "reject" | "reschedule",
  ): Promise<{ entryId: string; status: "accepted" | "rejected" | "rescheduled"; message: string }>;
}
