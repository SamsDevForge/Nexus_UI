import type {
  AuthorityLevel,
  DependencyImpact,
  ModelUseChoice,
  NexusScenario,
  PermissionGrant,
  PermissionSnapshot,
  RetentionChoice,
} from "@/lib/domain/contracts";

export interface PermissionService {
  getPermissions(scenario: NexusScenario): Promise<PermissionSnapshot>;
  updatePermission(
    permissionId: string,
    update: Partial<{
      readAllowed: boolean;
      retention: RetentionChoice;
      modelUse: ModelUseChoice;
      notificationsAllowed: boolean;
      actionAuthority: AuthorityLevel;
    }>,
  ): Promise<PermissionGrant>;
  previewRevocation(permissionId: string): Promise<DependencyImpact>;
  revokePermission(permissionId: string): Promise<PermissionGrant>;
  restorePermission(permissionId: string): Promise<PermissionGrant>;
  setObservationPaused(paused: boolean): Promise<{ paused: boolean; activityId: string }>;
  setAutomationsPaused(paused: boolean): Promise<{ paused: boolean; activityId: string }>;
}
