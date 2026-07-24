import type { TodayScenario, TodaySnapshot } from "@/lib/domain/contracts";

export interface TodayService {
  getToday(scenario: TodayScenario): Promise<TodaySnapshot>;
}
