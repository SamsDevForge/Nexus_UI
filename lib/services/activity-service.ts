import type {
  ActivityEvent,
  ActivityFilters,
  ActivitySnapshot,
  MockExportRequest,
  NexusScenario,
} from "@/lib/domain/contracts";

export interface ActivityService {
  getActivity(
    scenario: NexusScenario,
    filters?: Partial<ActivityFilters>,
  ): Promise<ActivitySnapshot>;
  retryEvent(eventId: string): Promise<ActivityEvent>;
  reverseEvent(eventId: string): Promise<ActivityEvent>;
  exportActivity(filters?: Partial<ActivityFilters>): Promise<MockExportRequest>;
}
