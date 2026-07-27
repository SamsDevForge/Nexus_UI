import type {
  DependencyImpact,
  MemoryItem,
  MemoryMutationResult,
  MemorySnapshot,
  NexusScenario,
} from "@/lib/domain/contracts";

export interface MemoryService {
  getMemory(scenario: NexusScenario): Promise<MemorySnapshot>;
  confirmMemory(memoryId: string): Promise<MemoryMutationResult>;
  correctMemory(memoryId: string, value: string): Promise<MemoryMutationResult>;
  updateMemory(
    memoryId: string,
    update: Partial<Pick<MemoryItem, "value" | "persistence" | "inferenceLocked">>,
  ): Promise<MemoryItem>;
  previewDeletion(memoryId: string): Promise<DependencyImpact>;
  deleteMemory(memoryId: string): Promise<MemoryMutationResult>;
  restoreMemory(memoryId: string): Promise<MemoryMutationResult>;
}
