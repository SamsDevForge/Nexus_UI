import type {
  NexusScenario,
  SearchFilters,
  SearchResponse,
} from "@/lib/domain/contracts";

export interface SearchService {
  search(
    scenario: NexusScenario,
    query: string,
    filters?: Partial<SearchFilters>,
  ): Promise<SearchResponse>;
}
