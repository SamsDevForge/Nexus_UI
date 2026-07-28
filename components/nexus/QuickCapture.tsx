"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type {
  EventCapturePreview,
  NexusScenario,
  QuickCaptureDraft,
  QuickCapturePreview,
  QuickCaptureResult,
} from "@/lib/domain/contracts";
import { canonicalScenario } from "@/lib/domain/state-coverage";
import { createMockQuickCaptureService } from "@/lib/mocks/mock-quick-capture-service";
import { ProductIcon } from "@/components/nexus/ProductIcon";

type CaptureStage =
  | "draft"
  | "preview"
  | "confirm"
  | "saving"
  | "success"
  | "failure"
  | "discard";

function emptyDraft(): QuickCaptureDraft {
  return {
    id: "quick-capture-draft",
    mode: "note",
    rawText: "",
    source: { kind: "manual-paste" },
    noteTitle: "",
    tags: [],
    event: {
      title: "",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      description: "",
    },
  };
}

function hasDraftContent(draft: QuickCaptureDraft) {
  return Boolean(
    draft.rawText.trim() ||
      draft.source.label?.trim() ||
      draft.noteTitle.trim() ||
      draft.tags.length ||
      Object.values(draft.event).some((value) => value.trim()),
  );
}

function focusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden"));
}

export function QuickCapture({ scenario }: { scenario: NexusScenario }) {
  const [service] = useState(() => {
    const created = createMockQuickCaptureService(scenario);
    created.resetSession();
    return created;
  });
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<CaptureStage>("draft");
  const [draft, setDraft] = useState<QuickCaptureDraft>(emptyDraft);
  const [preview, setPreview] = useState<QuickCapturePreview | null>(null);
  const [result, setResult] = useState<QuickCaptureResult | null>(null);
  const canonical = canonicalScenario(scenario);
  const dirty = hasDraftContent(draft);

  const resetDraft = useCallback(() => {
    setDraft(emptyDraft());
    setPreview(null);
    setResult(null);
    setStage("draft");
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    setStage("draft");
    setPreview(null);
    setResult(null);
    window.requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  const requestClose = useCallback(() => {
    if (
      dirty &&
      !["success", "failure", "discard"].includes(stage)
    ) {
      setStage("discard");
      return;
    }
    closePanel();
  }, [closePanel, dirty, stage]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const first = focusableElements(panel)[0];
    window.requestAnimationFrame(() => first?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusableElements(panel);
      if (elements.length === 0) return;
      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, requestClose]);

  const startPreview = async () => {
    const next = await service.preview(draft);
    setPreview(next);
    setStage("preview");
  };

  const saveNote = async () => {
    if (!preview || preview.mode !== "note") return;
    if (preview.issues.some((issue) => issue.severity === "error")) return;
    setStage("saving");
    const next = await service.saveNote(preview);
    setResult(next);
    setStage(next.status === "succeeded" ? "success" : "failure");
  };

  const prepareEvent = async () => {
    if (!preview || preview.mode !== "event") return;
    const reviewed = await service.reviewEvent(preview);
    setPreview(reviewed);
    if (reviewed.issues.length === 0) {
      setStage("confirm");
    }
  };

  const scheduleEvent = async () => {
    if (!preview || preview.mode !== "event") return;
    setStage("saving");
    const next = await service.scheduleEvent(preview);
    setResult(next);
    setStage(next.status === "succeeded" ? "success" : "failure");
  };

  const updateEventPreview = (
    field: keyof Pick<
      EventCapturePreview,
      "title" | "date" | "startTime" | "endTime" | "location" | "description"
    >,
    value: string,
  ) => {
    setPreview((current) =>
      current?.mode === "event" ? { ...current, [field]: value } : current,
    );
  };

  const stopPropagation = (event: ReactKeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.stopPropagation();
    }
  };

  return (
    <div
      className={[
        "quick-capture-root",
        open ? "is-open" : "",
        scenario === "reduced-motion" ? "is-reduced" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {open ? (
        <div
          className="quick-capture-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-capture-title"
          aria-describedby="quick-capture-description"
        >
          <header className="quick-capture-heading">
            <span className="quick-capture-heading-icon" aria-hidden="true">
              <Image
                src="/icons/nexus-notepad.svg"
                alt=""
                width={26}
                height={26}
                unoptimized
              />
            </span>
            <span>
              <small>Manual input bridge</small>
              <b id="quick-capture-title">Quick Capture</b>
            </span>
            <button
              className="quick-capture-close"
              type="button"
              aria-label="Close Quick Capture"
              onClick={requestClose}
            >
              <span aria-hidden="true" />
            </button>
          </header>

          <p className="quick-capture-intro" id="quick-capture-description">
            Paste plain text yourself. NEXUS never reads your clipboard or
            connects to the source app.
          </p>

          {canonical === "offline" ? (
            <div className="quick-capture-state is-warning" role="status">
              Offline: edit and preview safely. A saved or scheduled result
              cannot be recorded until the demo is available.
            </div>
          ) : canonical === "degraded-ai" ? (
            <div className="quick-capture-state" role="status">
              Generated assistance is unavailable. Deterministic manual capture
              still works.
            </div>
          ) : canonical === "no-connections" ? (
            <div className="quick-capture-state" role="status">
              No connections are needed for manual capture.
            </div>
          ) : canonical === "permission-revoked" && draft.mode === "event" ? (
            <div className="quick-capture-state is-warning" role="status">
              Calendar authority is revoked. You can review an event draft, but
              confirmation remains blocked.
            </div>
          ) : null}

          {stage === "draft" ? (
            <div className="quick-capture-body">
              <label className="quick-capture-field">
                <span>Paste plain text</span>
                <textarea
                  value={draft.rawText}
                  rows={6}
                  placeholder="Paste a message, portal update, or event details"
                  onKeyDown={stopPropagation}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      rawText: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="quick-capture-field">
                <span>Source label <small>Optional</small></span>
                <input
                  value={draft.source.label ?? ""}
                  placeholder="College portal or WhatsApp"
                  onKeyDown={stopPropagation}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      source: {
                        kind: "manual-paste",
                        label: event.target.value,
                      },
                    }))
                  }
                />
              </label>

              <fieldset className="quick-capture-mode">
                <legend>Prepare as</legend>
                <button
                  type="button"
                  className={draft.mode === "note" ? "is-active" : ""}
                  aria-pressed={draft.mode === "note"}
                  onClick={() =>
                    setDraft((current) => ({ ...current, mode: "note" }))
                  }
                >
                  <ProductIcon name="save" size={18} />
                  Save as note
                </button>
                <button
                  type="button"
                  className={draft.mode === "event" ? "is-active" : ""}
                  aria-pressed={draft.mode === "event"}
                  onClick={() =>
                    setDraft((current) => ({ ...current, mode: "event" }))
                  }
                >
                  <ProductIcon name="date-calendar" size={18} />
                  Schedule event
                </button>
              </fieldset>

              {draft.mode === "note" ? (
                <>
                  <label className="quick-capture-field">
                    <span>Note title <small>Optional</small></span>
                    <input
                      value={draft.noteTitle}
                      placeholder="Derived from the first line when empty"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          noteTitle: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="quick-capture-field">
                    <span>Tags <small>Optional, comma separated</small></span>
                    <input
                      value={draft.tags.join(", ")}
                      placeholder="course, follow-up"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          tags: event.target.value
                            .split(",")
                            .map((tag) => tag.trim())
                            .filter(Boolean),
                        }))
                      }
                    />
                  </label>
                </>
              ) : null}

              <footer className="quick-capture-actions">
                <button
                  className="quick-capture-reset"
                  type="button"
                  disabled={!dirty}
                  onClick={resetDraft}
                >
                  Reset
                </button>
                <button
                  className="primary-button"
                  type="button"
                  disabled={!draft.rawText.trim()}
                  onClick={() => void startPreview()}
                >
                  Preview
                </button>
              </footer>
            </div>
          ) : null}

          {stage === "preview" && preview?.mode === "note" ? (
            <div className="quick-capture-body">
              <div className="quick-capture-preview">
                <p className="section-kicker">Note preview</p>
                <h3>{preview.title}</h3>
                <p className="quick-capture-plain-text">{preview.body}</p>
                <dl>
                  <div>
                    <dt>Provenance</dt>
                    <dd>Manual paste</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{preview.source.label || "Not labelled"}</dd>
                  </div>
                </dl>
                {preview.tags.length ? (
                  <div className="quick-capture-tags">
                    {preview.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                ) : null}
              </div>
              {preview.issues.map((issue) => (
                <p className="quick-capture-issue" key={issue.code}>
                  {issue.message}
                </p>
              ))}
              <footer className="quick-capture-actions">
                <button type="button" onClick={() => setStage("draft")}>
                  Edit draft
                </button>
                <button
                  className="primary-button"
                  type="button"
                  disabled={preview.issues.some((issue) => issue.severity === "error")}
                  onClick={() => void saveNote()}
                >
                  Save note
                </button>
              </footer>
            </div>
          ) : null}

          {stage === "preview" && preview?.mode === "event" ? (
            <div className="quick-capture-body">
              <div className="quick-capture-review-heading">
                <p className="section-kicker">Event extraction</p>
                <h3>Review every scheduling detail.</h3>
                <p>Only explicit dates, times, and labelled locations are extracted.</p>
              </div>
              <label className="quick-capture-field">
                <span>Event title</span>
                <input
                  value={preview.title}
                  onChange={(event) => updateEventPreview("title", event.target.value)}
                />
              </label>
              <div className="quick-capture-field-row">
                <label className="quick-capture-field">
                  <span>Date</span>
                  <input
                    type="date"
                    value={preview.date}
                    onChange={(event) => updateEventPreview("date", event.target.value)}
                  />
                </label>
                <label className="quick-capture-field">
                  <span>Start time</span>
                  <input
                    type="time"
                    value={preview.startTime}
                    onChange={(event) =>
                      updateEventPreview("startTime", event.target.value)
                    }
                  />
                </label>
                <label className="quick-capture-field">
                  <span>End <small>Optional</small></span>
                  <input
                    type="time"
                    value={preview.endTime}
                    onChange={(event) =>
                      updateEventPreview("endTime", event.target.value)
                    }
                  />
                </label>
              </div>
              <label className="quick-capture-field">
                <span>Location <small>Optional</small></span>
                <input
                  value={preview.location}
                  onChange={(event) =>
                    updateEventPreview("location", event.target.value)
                  }
                />
              </label>
              <label className="quick-capture-field">
                <span>Description <small>Optional</small></span>
                <textarea
                  rows={3}
                  value={preview.description}
                  onChange={(event) =>
                    updateEventPreview("description", event.target.value)
                  }
                />
              </label>
              <div className="quick-capture-review-meta">
                <span>Timezone · {preview.timezone}</span>
                <span>Provenance · Manual paste</span>
              </div>
              {preview.issues.map((issue) => (
                <p
                  className={`quick-capture-issue is-${issue.severity}`}
                  key={`${issue.field}-${issue.code}`}
                >
                  {issue.message}
                </p>
              ))}
              <footer className="quick-capture-actions">
                <button type="button" onClick={() => setStage("draft")}>
                  Edit paste
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void prepareEvent()}
                >
                  Prepare event
                </button>
              </footer>
            </div>
          ) : null}

          {stage === "confirm" && preview?.mode === "event" ? (
            <div className="quick-capture-body">
              <div className="quick-capture-confirm">
                <ProductIcon name="date-favorite" size={32} />
                <p className="section-kicker">Awaiting confirmation</p>
                <h3>{preview.title}</h3>
                <p>
                  {preview.date} · {preview.startTime}
                  {preview.endTime ? `–${preview.endTime}` : ""} · {preview.timezone}
                </p>
                {preview.location ? <p>{preview.location}</p> : null}
                <small>
                  Confirming records a mock Timeline item for this demo session.
                  No calendar provider is contacted.
                </small>
              </div>
              <footer className="quick-capture-actions">
                <button type="button" onClick={() => setStage("preview")}>
                  Review fields
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void scheduleEvent()}
                >
                  Confirm event
                </button>
              </footer>
            </div>
          ) : null}

          {stage === "saving" ? (
            <div className="quick-capture-progress" aria-live="polite" aria-busy="true">
              <span aria-hidden="true" />
              <b>{preview?.mode === "event" ? "Preparing event" : "Saving note"}</b>
              <p>No result is shown until the deterministic service records it.</p>
            </div>
          ) : null}

          {stage === "success" && result ? (
            <div className="quick-capture-result" role="status">
              <ProductIcon
                name={result.mode === "event" ? "date-check" : "save"}
                size={36}
              />
              <p className="section-kicker">Recorded result</p>
              <h3>{result.summary}</h3>
              <p>
                Manual-paste provenance and an Activity entry were recorded.
                This item lasts only for the active demo session.
              </p>
              <footer className="quick-capture-actions">
                <button type="button" onClick={resetDraft}>
                  Capture another
                </button>
                {result.href ? (
                  <Link className="primary-button" href={result.href} onClick={closePanel}>
                    Open {result.mode === "event" ? "Timeline" : "Nexus Note"}
                  </Link>
                ) : null}
              </footer>
            </div>
          ) : null}

          {stage === "failure" && result ? (
            <div className="quick-capture-result is-failure" role="alert">
              <ProductIcon name="date-cross" size={36} />
              <p className="section-kicker">
                {result.status === "blocked" ? "Confirmation blocked" : "Recoverable failure"}
              </p>
              <h3>{result.summary}</h3>
              <p>Your pasted text and edits remain available. No successful result was claimed.</p>
              <footer className="quick-capture-actions">
                {result.status === "blocked" && canonical === "permission-revoked" ? (
                  <Link
                    href={`/app/settings/permissions?scenario=${encodeURIComponent(scenario)}`}
                    onClick={closePanel}
                  >
                    Review permission
                  </Link>
                ) : null}
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setStage(preview?.mode === "event" ? "preview" : "draft")}
                >
                  Review and retry
                </button>
              </footer>
            </div>
          ) : null}

          {stage === "discard" ? (
            <div className="quick-capture-result is-discard" role="alertdialog" aria-modal="true">
              <ProductIcon name="scissors" size={34} />
              <p className="section-kicker">Unsaved draft</p>
              <h3>Discard this Quick Capture draft?</h3>
              <p>Your pasted text and edits will be removed from this demo session.</p>
              <footer className="quick-capture-actions">
                <button type="button" onClick={() => setStage(preview ? "preview" : "draft")}>
                  Keep editing
                </button>
                <button
                  className="danger-button"
                  type="button"
                  onClick={() => {
                    resetDraft();
                    closePanel();
                  }}
                >
                  Discard draft
                </button>
              </footer>
            </div>
          ) : null}

          <p className="sr-only" aria-live="polite">
            {stage === "saving"
              ? "Quick Capture is recording the deterministic result."
              : result?.summary ?? ""}
          </p>
        </div>
      ) : null}

      <button
        className="quick-capture-launcher"
        ref={launcherRef}
        type="button"
        aria-label="Open Quick Capture"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Quick Capture"
        onClick={() => {
          if (open) {
            requestClose();
          } else {
            setOpen(true);
          }
        }}
      >
        <Image
          src="/icons/nexus-notepad.svg"
          alt=""
          width={30}
          height={30}
          unoptimized
        />
        <span className="quick-capture-tooltip" role="tooltip">
          Quick Capture
        </span>
      </button>
    </div>
  );
}
