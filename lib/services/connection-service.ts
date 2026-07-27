import type {
  ConnectionRecord,
  ConnectionSnapshot,
  ConnectionSyncResult,
  DependencyImpact,
  NexusScenario,
} from "@/lib/domain/contracts";

export interface ConnectionService {
  getConnections(scenario: NexusScenario): Promise<ConnectionSnapshot>;
  setupConnection(connectionId: string): Promise<ConnectionRecord>;
  resyncConnection(connectionId: string): Promise<ConnectionSyncResult>;
  reconnectConnection(connectionId: string): Promise<ConnectionRecord>;
  previewDisconnect(connectionId: string): Promise<DependencyImpact>;
  disconnectConnection(connectionId: string): Promise<ConnectionRecord>;
  setCapability(
    connectionId: string,
    capabilityId: string,
    granted: boolean,
  ): Promise<ConnectionRecord>;
}
