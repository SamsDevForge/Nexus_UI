import type {
  MockDeletionRequest,
  MockExportRequest,
  NexusScenario,
  NotificationPolicy,
  SettingsSnapshot,
  UserPreferences,
} from "@/lib/domain/contracts";

export type SettingsSection =
  | "profile"
  | "places"
  | "notifications"
  | "personalization"
  | "privacy"
  | "accessibility";

export interface SettingsService {
  getSettings(scenario: NexusScenario): Promise<SettingsSnapshot>;
  saveSection(
    section: SettingsSection,
    update: Partial<UserPreferences>,
  ): Promise<UserPreferences>;
  resetSection(section: SettingsSection): Promise<UserPreferences>;
  previewNotification(
    policy: NotificationPolicy,
  ): Promise<{ title: string; body: string; delivery: string }>;
  requestExport(): Promise<MockExportRequest>;
  requestDeletion(scope: "source-derived" | "account"): Promise<MockDeletionRequest>;
}
