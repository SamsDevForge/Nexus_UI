import type { Metadata } from "next";
import { MemoryExperience } from "@/components/nexus/MemoryExperience";
import { createMockPhase3Services } from "@/lib/mocks/mock-phase3-services";
import { parseNexusScenario } from "@/lib/mocks/phase2-fixtures";

export const metadata: Metadata = {
  title: "Memory",
  description: "Inspect, verify, correct, expire, and forget NEXUS memory.",
};

export default async function MemoryPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string | string[] }>;
}) {
  const params = await searchParams;
  const scenario = parseNexusScenario(params.scenario);
  const { memoryService } = createMockPhase3Services(scenario);
  const snapshot = await memoryService.getMemory(scenario);
  return <MemoryExperience initialSnapshot={snapshot} />;
}
