"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InterfaceAssetIcon } from "@/components/nexus/InterfaceAssetIcon";
import { NexusNotesMark } from "@/components/nexus/NexusNotesMark";
import { ProductIcon } from "@/components/nexus/ProductIcon";
import type {
  NoteArtifact,
  NoteReviewState,
  NotesSnapshot,
} from "@/lib/domain/contracts";
import { notesService } from "@/lib/mocks/mock-phase2-services";
import { scenarioHref } from "@/lib/mocks/phase2-fixtures";
import { useNexusAuth } from "@/lib/auth/AuthProvider";
import {
  durableCaptureToNote,
  loadDurableCaptures,
  PHASE6_CAPTURE_CHANGE_EVENT,
} from "@/lib/services/phase6-live-services";
import {
  BlockingState,
  HealthStrip,
  PhaseHeader,
  ScenarioBanner,
  SegmentedControl,
} from "@/components/nexus/Phase2Shared";

type NoteFilter = "all" | NoteReviewState;

export function NotesExperience({
  initialSnapshot,
  capturedNoteId,
}: {
  initialSnapshot: NotesSnapshot;
  capturedNoteId?: string;
}) {
  const auth = useNexusAuth();
  const live = auth.mode === "phase6-live" && Boolean(auth.apiClient);
  const [notes, setNotes] = useState(initialSnapshot.notes);
  const [filter, setFilter] = useState<NoteFilter>("all");
  const [selectedId, setSelectedId] = useState(
    capturedNoteId ?? initialSnapshot.notes[0]?.id ?? "",
  );
  const [draftBody, setDraftBody] = useState(initialSnapshot.notes[0]?.body ?? "");
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState("");

  const selected = notes.find((note) => note.id === selectedId) ?? notes[0];
  const visible = useMemo(
    () => notes.filter((note) => filter === "all" || note.state === filter),
    [filter, notes],
  );
  const groups = [...new Set(visible.map((note) => note.group))];

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (live && auth.apiClient) {
        const captures = await loadDurableCaptures(auth.apiClient);
        const durableNotes = captures
          .map(durableCaptureToNote)
          .filter((note): note is NoteArtifact => Boolean(note));
        if (!active) return;
        setNotes([...durableNotes, ...initialSnapshot.notes]);
        if (capturedNoteId) {
          const captured = durableNotes.find((note) => note.id === capturedNoteId);
          if (captured) {
            setSelectedId(captured.id);
            setDraftBody(captured.body);
          }
        }
        return;
      }
      const next = await notesService.getNotes(initialSnapshot.scenario);
      if (!active) return;
      setNotes(next.notes);
      if (capturedNoteId) {
        const captured = next.notes.find((note) => note.id === capturedNoteId);
        if (captured) {
          setSelectedId(captured.id);
          setDraftBody(captured.body);
        }
      }
    };
    const handleSessionChange = (event: Event) => {
      const detail = (event as CustomEvent<{ scenario?: string }>).detail;
      if (detail?.scenario === initialSnapshot.scenario) void refresh();
    };
    void refresh();
    window.addEventListener("nexus:mock-session-change", handleSessionChange);
    window.addEventListener(PHASE6_CAPTURE_CHANGE_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener("nexus:mock-session-change", handleSessionChange);
      window.removeEventListener(PHASE6_CAPTURE_CHANGE_EVENT, refresh);
    };
  }, [
    auth.apiClient,
    capturedNoteId,
    initialSnapshot.notes,
    initialSnapshot.scenario,
    live,
  ]);

  const chooseNote = (note: NoteArtifact) => {
    setSelectedId(note.id);
    setDraftBody(note.body);
    setEditing(false);
    setFeedback("");
  };

  const saveDraft = async () => {
    if (!selected) return;
    if (live && auth.apiClient && selected.provenance === "manual-paste") {
      await auth.apiClient.request(`/api/v1/captures/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ rawText: draftBody }),
      });
      setNotes((current) =>
        current.map((note) =>
          note.id === selected.id
            ? { ...note, body: draftBody, updatedAt: new Date().toISOString() }
            : note,
        ),
      );
      setEditing(false);
      setFeedback("Correction saved in NEXUS.");
      return;
    }
    const updated = await notesService.updateNote(selected.id, {
      body: draftBody,
      state: "draft",
    });
    setNotes((current) =>
      current.map((note) => (note.id === selected.id ? updated : note)),
    );
    setEditing(false);
    setFeedback("Draft saved to local demo state.");
  };

  const markReviewed = async () => {
    if (!selected) return;
    const updated = await notesService.updateNote(selected.id, {
      state: "reviewed",
    });
    setNotes((current) =>
      current.map((note) => (note.id === selected.id ? updated : note)),
    );
    setFeedback("Marked reviewed in demo state.");
  };

  const resolvePreparation = async (
    decision: "approve" | "reject" | "regenerate",
  ) => {
    if (!selected) return;
    const result = await notesService.resolvePreparation(selected.id, decision);
    setFeedback(result.message);
    if (decision === "approve") {
      setNotes((current) =>
        current.map((note) =>
          note.id === selected.id ? { ...note, state: "mock-synced" } : note,
        ),
      );
    }
  };

  const createManualNote = () => {
    const manual: NoteArtifact = {
      id: "note-manual-phase2",
      title: "Untitled Nexus note",
      group: "Personal",
      state: "draft",
      updatedAt: "2026-07-25T09:25:00+05:30",
      summary: "A manual note with no generated factual claims.",
      body: "Start writing here. NEXUS will not invent lecture content without sources.",
      sourceMaterialAvailable: true,
      citations: [],
      actionItems: [],
      unresolvedQuestions: [],
      confidence: 1,
    };
    setNotes((current) => [
      manual,
      ...current.filter((note) => note.id !== manual.id),
    ]);
    chooseNote(manual);
    setEditing(true);
    setFeedback("Nexus note created in demo state.");
  };

  return (
    <div
      className={
        initialSnapshot.scenario === "reduced-motion"
          ? "phase2-page notes-page is-reduced"
          : "phase2-page notes-page"
      }
    >
      <PhaseHeader
        kicker="Native knowledge workspace"
        title="Nexus Notes"
        summary={initialSnapshot.summary}
        mark={<NexusNotesMark className="notes-heading-mark" size={74} eager />}
        action={
          <button className="primary-button" type="button" onClick={createManualNote}>
            New Nexus note
          </button>
        }
      />
      <ScenarioBanner
        notice={initialSnapshot.notice}
        tone={initialSnapshot.viewState === "error" ? "danger" : "warning"}
      />
      <BlockingState
        state={notes.length > 0 ? "populated" : initialSnapshot.viewState}
        noun="notes library"
        scenario={initialSnapshot.scenario}
      />

      {notes.length > 0 ? (
        <>
          <div className="notes-source-rule">
            <NexusNotesMark className="notes-rule-mark" size={30} />
            <p>
              NEXUS can organize permitted source material. It cannot create factual
              lecture notes when no source exists.
            </p>
          </div>
          <SegmentedControl
            label="Note review state"
            value={filter}
            options={[
              { value: "all", label: "All" },
              { value: "draft", label: "Drafts" },
              { value: "needs-review", label: "Needs review" },
              { value: "reviewed", label: "Reviewed" },
              { value: "mock-synced", label: "Mock synced" },
            ]}
            onChange={setFilter}
          />

          <div className="notes-workspace">
            <aside className="notes-library" aria-label="Nexus Notes library">
              {groups.map((group) => (
                <section key={group}>
                  <h2>
                    <InterfaceAssetIcon
                      kind="folder"
                      className="notes-folder-icon"
                      size={14}
                    />
                    <span>{group}</span>
                  </h2>
                  {visible
                    .filter((note) => note.group === group)
                    .map((note) => (
                      <button
                        className={selected?.id === note.id ? "is-active" : undefined}
                        type="button"
                        key={note.id}
                        onClick={() => chooseNote(note)}
                      >
                        <span className={`note-state-dot is-${note.state}`} aria-hidden="true" />
                        <span>
                          <b>{note.title}</b>
                          <small>{note.summary}</small>
                        </span>
                        <em>{note.state.replace("-", " ")}</em>
                      </button>
                    ))}
                </section>
              ))}
            </aside>

            {selected ? (
              <section className="note-editor" aria-labelledby="note-title">
                <header>
                  <div>
                    <p className="section-kicker">
                      {selected.group} · {selected.state.replace("-", " ")}
                    </p>
                    <h2 id="note-title">{selected.title}</h2>
                  </div>
                  <span>{Math.round(selected.confidence * 100)}% confidence</span>
                </header>

                {selected.provenance === "manual-paste" ? (
                  <div className="note-manual-provenance" role="status">
                    <b>Manual paste</b>
                    <span>
                      {selected.sourceLabel
                        ? `Source label · ${selected.sourceLabel}`
                        : "No source app connection"}
                    </span>
                    <small>Session-only · plain text</small>
                  </div>
                ) : null}

                {editing ? (
                  <div className="note-edit-area">
                    <label htmlFor="note-body">Draft content</label>
                    <textarea
                      id="note-body"
                      value={draftBody}
                      onChange={(event) => setDraftBody(event.target.value)}
                    />
                    <div>
                      <button
                        className="primary-button note-save-button"
                        type="button"
                        onClick={saveDraft}
                      >
                        <ProductIcon name="save" size={15} />
                        Save draft
                      </button>
                      <button
                        className="quiet-button"
                        type="button"
                        onClick={() => {
                          setDraftBody(selected.body);
                          setEditing(false);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="note-preview-body">
                    {selected.body.split("\n").map((paragraph, index) =>
                      paragraph ? <p key={`${selected.id}-${index}`}>{paragraph}</p> : <br key={`${selected.id}-${index}`} />,
                    )}
                  </div>
                )}

                <div className="note-detail-columns">
                  <section>
                    <span>Source citations</span>
                    {selected.citations.length === 0 ? (
                      <p>No external citations. This is a manual Nexus note.</p>
                    ) : (
                      selected.citations.map((citation) => (
                        <Link
                          key={citation.id}
                          href={scenarioHref("/app/knowledge", initialSnapshot.scenario)}
                        >
                          <b>{citation.sourceLabel}</b>
                          <small>{citation.excerpt}</small>
                        </Link>
                      ))
                    )}
                  </section>
                  <section>
                    <span>Extracted action items</span>
                    {selected.actionItems.length > 0 ? (
                      <ul>
                        {selected.actionItems.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : (
                      <p>No action items extracted.</p>
                    )}
                  </section>
                  <section>
                    <span>Unresolved questions</span>
                    {selected.unresolvedQuestions.length > 0 ? (
                      <ul>
                        {selected.unresolvedQuestions.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : (
                      <p>No unresolved questions.</p>
                    )}
                  </section>
                </div>

                {selected.preparedAction ? (
                  <section className="note-prepared-action">
                    <div>
                      <p className="section-kicker">Prepared action · Ask</p>
                      <h3>{selected.preparedAction.label}</h3>
                      <p>{selected.preparedAction.reason}</p>
                      <small>Nothing will be published in Phase 2.</small>
                    </div>
                    <div>
                      <button className="primary-button" type="button" onClick={() => resolvePreparation("approve")}>
                        Approve preparation
                      </button>
                      <button className="quiet-button" type="button" onClick={() => resolvePreparation("regenerate")}>
                        Regenerate
                      </button>
                      <button className="text-button" type="button" onClick={() => resolvePreparation("reject")}>
                        Reject
                      </button>
                    </div>
                  </section>
                ) : null}

                <div className="note-editor-actions">
                  <button className="quiet-button" type="button" onClick={() => setEditing(true)}>
                    Edit draft
                  </button>
                  <button className="primary-button" type="button" onClick={markReviewed}>
                    Mark reviewed
                  </button>
                </div>
              </section>
            ) : null}
          </div>
          {feedback ? <p className="phase2-feedback" role="status">{feedback}</p> : null}
          <HealthStrip health={initialSnapshot.sourceHealth} />
        </>
      ) : null}
    </div>
  );
}
