import type { Metadata } from "next";
import { ConnectionsExperience } from "@/components/nexus/ConnectionsExperience";
import { createMockPhase3Services } from "@/lib/mocks/mock-phase3-services";
import { parseNexusScenario } from "@/lib/mocks/phase2-fixtures";

export const metadata: Metadata = {
  title: "Connections",
  description: "Provider capability, purpose, health, freshness, and dependency control.",
};

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string | string[] }>;
}) {
  const params = await searchParams;
  const scenario = parseNexusScenario(params.scenario);
  const { connectionService } = createMockPhase3Services(scenario);
  const snapshot = await connectionService.getConnections(scenario);
  return <ConnectionsExperience initialSnapshot={snapshot} />;
}
