import type { Metadata } from "next";
import { KnowledgeExperience } from "@/components/nexus/KnowledgeExperience";
import { knowledgeService } from "@/lib/mocks/mock-phase2-services";
import { parseNexusScenario } from "@/lib/mocks/phase2-fixtures";

export const metadata: Metadata = {
  title: "Knowledge",
  description: "Browse permitted deterministic knowledge sources and evidence.",
};

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string | string[] }>;
}) {
  const params = await searchParams;
  const scenario = parseNexusScenario(params.scenario);
  const snapshot = await knowledgeService.getKnowledge(scenario);
  return <KnowledgeExperience initialSnapshot={snapshot} />;
}
