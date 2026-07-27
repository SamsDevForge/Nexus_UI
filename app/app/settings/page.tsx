import type { Metadata } from "next";
import { SettingsExperience } from "@/components/nexus/SettingsExperience";
import { createMockPhase3Services } from "@/lib/mocks/mock-phase3-services";
import { parseNexusScenario } from "@/lib/mocks/phase2-fixtures";

export const metadata: Metadata = {
  title: "Settings",
  description: "NEXUS profile, places, notifications, privacy, accessibility, and data controls.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string | string[] }>;
}) {
  const params = await searchParams;
  const scenario = parseNexusScenario(params.scenario);
  const { settingsService } = createMockPhase3Services(scenario);
  const snapshot = await settingsService.getSettings(scenario);
  return <SettingsExperience initialSnapshot={snapshot} />;
}
