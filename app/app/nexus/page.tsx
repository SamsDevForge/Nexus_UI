import type { Metadata } from "next";
import { NexusWorkspace } from "@/components/nexus/NexusWorkspace";
import { nexusService } from "@/lib/mocks/mock-phase2-services";
import { parseNexusScenario } from "@/lib/mocks/phase2-fixtures";

export const metadata: Metadata = {
  title: "NEXUS",
  description: "Deterministic context, explanations and prepared action previews.",
};

export default async function NexusPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string | string[] }>;
}) {
  const params = await searchParams;
  const scenario = parseNexusScenario(params.scenario);
  const snapshot = await nexusService.getWorkspace(scenario);
  return <NexusWorkspace initialSnapshot={snapshot} />;
}
