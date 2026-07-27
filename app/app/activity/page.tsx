import type { Metadata } from "next";
import { ActivityExperience } from "@/components/nexus/ActivityExperience";
import { createMockPhase3Services } from "@/lib/mocks/mock-phase3-services";
import { parseNexusScenario } from "@/lib/mocks/phase2-fixtures";

export const metadata: Metadata = {
  title: "Activity",
  description: "Human-readable audit history for reads, proposals, approvals, and failures.",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string | string[] }>;
}) {
  const params = await searchParams;
  const scenario = parseNexusScenario(params.scenario);
  const { activityService } = createMockPhase3Services(scenario);
  const snapshot = await activityService.getActivity(scenario);
  return <ActivityExperience initialSnapshot={snapshot} />;
}
