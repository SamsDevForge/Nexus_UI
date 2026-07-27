import type { Metadata } from "next";
import { NotesExperience } from "@/components/nexus/NotesExperience";
import { notesService } from "@/lib/mocks/mock-phase2-services";
import { parseNexusScenario } from "@/lib/mocks/phase2-fixtures";

export const metadata: Metadata = {
  title: "Notes",
  description: "Review source-grounded deterministic NEXUS note drafts.",
};

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string | string[] }>;
}) {
  const params = await searchParams;
  const scenario = parseNexusScenario(params.scenario);
  const snapshot = await notesService.getNotes(scenario);
  return <NotesExperience initialSnapshot={snapshot} />;
}
