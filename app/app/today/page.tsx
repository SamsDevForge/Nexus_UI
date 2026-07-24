import { TodayExperience } from "@/components/nexus/TodayExperience";
import type { TodayScenario } from "@/lib/domain/contracts";
import { todayService } from "@/lib/mocks/mock-today-service";
import { TODAY_SCENARIOS } from "@/lib/mocks/today-fixtures";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string | string[] }>;
}) {
  const { scenario: scenarioParam } = await searchParams;
  const candidate = Array.isArray(scenarioParam) ? scenarioParam[0] : scenarioParam;
  const scenario: TodayScenario = TODAY_SCENARIOS.some(
    (item) => item.value === candidate,
  )
    ? (candidate as TodayScenario)
    : "rain-and-traffic";
  const initialSnapshot = await todayService.getToday(scenario);

  return <TodayExperience initialSnapshot={initialSnapshot} />;
}
