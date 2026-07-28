import type { Metadata } from "next";
import { NotesExperience } from "@/components/nexus/NotesExperience";
import { notesService } from "@/lib/mocks/mock-phase2-services";
import { parseNexusScenario } from "@/lib/mocks/phase2-fixtures";

export const metadata: Metadata = {
  title: "Nexus Notes",
  description: "Review source-grounded deterministic drafts in Nexus Notes.",
};

export default async function NotesPage({
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
  const snapshot = await notesService.getNotes(scenario);
  return (
    <NotesExperience initialSnapshot={snapshot} capturedNoteId={captureId} />
  );
}
