import type { Metadata } from "next";
import { PermissionsExperience } from "@/components/nexus/PermissionsExperience";
import { createMockPhase3Services } from "@/lib/mocks/mock-phase3-services";
import { parseNexusScenario } from "@/lib/mocks/phase2-fixtures";

export const metadata: Metadata = {
  title: "Permission Centre",
  description: "Separate provider capability, purpose, retention, model use, notifications, and authority.",
};

export default async function PermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string | string[] }>;
}) {
  const params = await searchParams;
  const scenario = parseNexusScenario(params.scenario);
  const { permissionService } = createMockPhase3Services(scenario);
  const snapshot = await permissionService.getPermissions(scenario);
  return <PermissionsExperience initialSnapshot={snapshot} />;
}
