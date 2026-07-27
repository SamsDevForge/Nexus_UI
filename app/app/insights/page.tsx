import type { Metadata } from "next";
import { InsightsExperience } from "@/components/nexus/InsightsExperience";
import { insightsService } from "@/lib/mocks/mock-phase2-services";
import { parseNexusScenario } from "@/lib/mocks/phase2-fixtures";

export const metadata: Metadata = {
  title: "Insights",
  description: "Ranked NEXUS recommendations with evidence and authority.",
};

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string | string[] }>;
}) {
  const params = await searchParams;
  const scenario = parseNexusScenario(params.scenario);
  const snapshot = await insightsService.getInsights(scenario);
  return <InsightsExperience initialSnapshot={snapshot} />;
}
