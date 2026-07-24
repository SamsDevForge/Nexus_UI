import type { TodayScenario } from "@/lib/domain/contracts";
import type { TodayService } from "@/lib/services/today-service";
import { buildTodaySnapshot } from "@/lib/mocks/today-fixtures";

class MockTodayService implements TodayService {
  async getToday(scenario: TodayScenario) {
    return buildTodaySnapshot(scenario);
  }
}

export const todayService: TodayService = new MockTodayService();
