"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  NoteArtifact,
  NoteReviewState,
  NotesSnapshot,
} from "@/lib/domain/contracts";
import { notesService } from "@/lib/mocks/mock-phase2-services";
import { scenarioHref } from "@/lib/mocks/phase2-fixtures";
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
}: {
  initialSnapshot: NotesSnapshot;
}) {
  const [notes, setNotes] = useState(initialSnapshot.notes);
  const [filter, setFilter] = useState<NoteFilter>("all");
  const [selectedId, setSelectedId] = useState(initialSnapshot.notes[0]?.id ?? "");
  const [draftBody, setDraftBody] = useState(initialSnapshot.notes[0]?.body ?? "");
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState("");

  const selected = notes.find((note) => note.id === selectedId) ?? notes[0];
  const visible = useMemo(
    () => notes.filter((note) => filter === "all" || note.state === filter),
    [filter, notes],
  );
  const groups = [...new Set(visible.map((note) => note.group))];

  const chooseNote = (note: NoteArtifact) => {
    setSelectedId(note.id);
    setDraftBody(note.body);
    setEditing(false);
    setFeedback("");
  };

  const saveDraft = async () => {
    if (!selected) return;
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
      title: "Untitled internal note",
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
    setFeedback("Manual internal note created in demo state.");
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
        kicker="Prepared knowledge artifacts"
        title="Notes"
        summary={initialSnapshot.summary}
        action={
          <button className="primary-button" type="button" onClick={createManualNote}>
            New internal note
          </button>
        }
      />
      <ScenarioBanner
        notice={initialSnapshot.notice}
        tone={initialSnapshot.viewState === "error" ? "danger" : "warning"}
      />
      <BlockingState state={initialSnapshot.viewState} noun="notes library" />

      {notes.length > 0 ? (
        <>
          <div className="notes-source-rule">
            <span aria-hidden="true">i</span>
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
            <aside className="notes-library" aria-label="Notes library">
              {groups.map((group) => (
                <section key={group}>
                  <h2>{group}</h2>
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

                {editing ? (
                  <div className="note-edit-area">
                    <label htmlFor="note-body">Draft content</label>
                    <textarea
                      id="note-body"
                      value={draftBody}
                      onChange={(event) => setDraftBody(event.target.value)}
                    />
                    <div>
                      <button className="primary-button" type="button" onClick={saveDraft}>
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
                      <p>No external citations. This is a manual internal note.</p>
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
