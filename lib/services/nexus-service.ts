import type {
  NexusScenario,
  NexusWorkspaceSnapshot,
  ScriptedConversation,
} from "@/lib/domain/contracts";

export interface NexusService {
  getWorkspace(scenario: NexusScenario): Promise<NexusWorkspaceSnapshot>;
  runScript(
    scenario: NexusScenario,
    scriptId: string,
  ): Promise<ScriptedConversation>;
  resolvePreparedAction(
    proposalId: string,
    decision: "approve" | "reject" | "retry",
  ): Promise<{ proposalId: string; status: "approved" | "rejected" | "succeeded"; message: string }>;
}
