import type {
  InsightFeedback,
  InsightsSnapshot,
  NexusScenario,
} from "@/lib/domain/contracts";

export interface InsightsService {
  getInsights(scenario: NexusScenario): Promise<InsightsSnapshot>;
  recordFeedback(feedback: InsightFeedback): Promise<InsightFeedback>;
  resolveAction(
    insightId: string,
    decision: "approve" | "reject",
  ): Promise<{ insightId: string; status: "approved" | "rejected"; message: string }>;
}
