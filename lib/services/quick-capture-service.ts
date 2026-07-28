import type {
  EventCapturePreview,
  NoteCapturePreview,
  QuickCaptureDraft,
  QuickCapturePreview,
  QuickCaptureResult,
} from "@/lib/domain/contracts";

export interface QuickCaptureService {
  resetSession(): void;
  preview(draft: QuickCaptureDraft): Promise<QuickCapturePreview>;
  reviewEvent(preview: EventCapturePreview): Promise<EventCapturePreview>;
  saveNote(preview: NoteCapturePreview): Promise<QuickCaptureResult>;
  scheduleEvent(preview: EventCapturePreview): Promise<QuickCaptureResult>;
}
