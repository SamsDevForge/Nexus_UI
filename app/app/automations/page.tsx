import type { Metadata } from "next";
import { AutomationsExperience } from "@/components/nexus/AutomationsExperience";
import { createMockPhase3Services } from "@/lib/mocks/mock-phase3-services";
import { parseNexusScenario } from "@/lib/mocks/phase2-fixtures";

export const metadata: Metadata = {
  title: "Automations",
  description: "Explainable proactive recipes, authority, dry-runs, and control.",
};

export default async function AutomationsPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string | string[] }>;
}) {
  const params = await searchParams;
  const scenario = parseNexusScenario(params.scenario);
  const { automationService } = createMockPhase3Services(scenario);
  const snapshot = await automationService.getAutomations(scenario);
  return <AutomationsExperience initialSnapshot={snapshot} />;
}
