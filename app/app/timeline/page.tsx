import type { Metadata } from "next";
import { TimelineExperience } from "@/components/nexus/TimelineExperience";
import { timelineService } from "@/lib/mocks/mock-phase2-services";
import { parseNexusScenario } from "@/lib/mocks/phase2-fixtures";

export const metadata: Metadata = {
  title: "Timeline",
  description: "Time-ordered commitments, preparation and proposed changes.",
};

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{
    scenario?: string | string[];
    capture?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const scenario = parseNexusScenario(params.scenario);
  const captureId = Array.isArray(params.capture)
    ? params.capture[0]
    : params.capture;
  const snapshot = await timelineService.getTimeline(scenario);
  return (
    <TimelineExperience
      initialSnapshot={snapshot}
      capturedEntryId={captureId}
    />
  );
}
