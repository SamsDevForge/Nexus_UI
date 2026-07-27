import type {
  AuthorityLevel,
  AutomationDefinition,
  AutomationDryRunResult,
  AutomationSnapshot,
  NexusScenario,
} from "@/lib/domain/contracts";

export interface AutomationService {
  getAutomations(scenario: NexusScenario): Promise<AutomationSnapshot>;
  createFromTemplate(templateId: string): Promise<AutomationDefinition>;
  createCustom(input: {
    name: string;
    trigger: string;
    proposedAction: string;
  }): Promise<AutomationDefinition>;
  updateAutomation(
    automationId: string,
    update: Partial<Pick<AutomationDefinition, "name" | "description" | "authority">>,
  ): Promise<AutomationDefinition>;
  duplicateAutomation(automationId: string): Promise<AutomationDefinition>;
  setPaused(automationId: string, paused: boolean): Promise<AutomationDefinition>;
  runDryRun(automationId: string): Promise<AutomationDryRunResult>;
  changeAuthority(
    automationId: string,
    authority: AuthorityLevel,
  ): Promise<AutomationDefinition>;
  recoverAutomation(automationId: string): Promise<AutomationDefinition>;
  deleteAutomation(automationId: string): Promise<{ id: string; deleted: true }>;
  setGlobalPause(paused: boolean): Promise<{ paused: boolean; activityId: string }>;
}
