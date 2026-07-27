import type { Metadata } from "next";
import { SearchExperience } from "@/components/nexus/SearchExperience";
import { searchService } from "@/lib/mocks/mock-phase2-services";
import { parseNexusScenario } from "@/lib/mocks/phase2-fixtures";

export const metadata: Metadata = {
  title: "Search",
  description: "Search deterministic permitted NEXUS context.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string | string[]; q?: string | string[] }>;
}) {
  const params = await searchParams;
  const scenario = parseNexusScenario(params.scenario);
  const query = Array.isArray(params.q) ? params.q[0] : params.q ?? "";
  const response = await searchService.search(scenario, query);
  return <SearchExperience initialResponse={response} />;
}
