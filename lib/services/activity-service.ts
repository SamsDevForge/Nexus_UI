import type {
  ActivityEvent,
  ActivityFilters,
  ActivitySnapshot,
  QuickCaptureMode,
  MockExportRequest,
  NexusScenario,
} from "@/lib/domain/contracts";

export interface ActivityService {
  getActivity(
    scenario: NexusScenario,
    filters?: Partial<ActivityFilters>,
  ): Promise<ActivitySnapshot>;
  recordManualCapture(input: {
    scenario: NexusScenario;
    mode: QuickCaptureMode;
    createdItemId: string;
    title: string;
    summary: string;
    relatedHref: string;
    outcome: "success" | "failed";
  }): Promise<ActivityEvent>;
  retryEvent(eventId: string): Promise<ActivityEvent>;
  reverseEvent(eventId: string): Promise<ActivityEvent>;
  exportActivity(filters?: Partial<ActivityFilters>): Promise<MockExportRequest>;
}
