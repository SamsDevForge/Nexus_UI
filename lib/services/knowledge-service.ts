import type {
  KnowledgeDocument,
  KnowledgeSearchResult,
  KnowledgeSnapshot,
  NexusScenario,
} from "@/lib/domain/contracts";

export interface KnowledgeService {
  getKnowledge(scenario: NexusScenario): Promise<KnowledgeSnapshot>;
  getDocument(
    scenario: NexusScenario,
    documentId: string,
  ): Promise<KnowledgeDocument | null>;
  searchKnowledge(
    scenario: NexusScenario,
    query: string,
  ): Promise<KnowledgeSearchResult[]>;
}
