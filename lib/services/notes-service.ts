import type {
  NoteArtifact,
  NoteCapturePreview,
  NoteReviewState,
  NotesSnapshot,
  NexusScenario,
} from "@/lib/domain/contracts";

export interface NotesService {
  getNotes(scenario: NexusScenario): Promise<NotesSnapshot>;
  createManualCapture(
    scenario: NexusScenario,
    preview: NoteCapturePreview,
  ): Promise<NoteArtifact>;
  updateNote(
    noteId: string,
    update: { body?: string; state?: NoteReviewState },
  ): Promise<NoteArtifact>;
  resolvePreparation(
    noteId: string,
    decision: "approve" | "reject" | "regenerate",
  ): Promise<{ noteId: string; status: "approved" | "rejected" | "regenerated"; message: string }>;
}
