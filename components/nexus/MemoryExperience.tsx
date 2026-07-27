"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  DependencyImpact,
  MemoryCategory,
  MemoryItem,
  MemorySnapshot,
} from "@/lib/domain/contracts";
import { createMockPhase3Services } from "@/lib/mocks/mock-phase3-services";
import { scenarioHref } from "@/lib/mocks/phase2-fixtures";
import {
  ControlBlockingState,
  ControlDialog,
  ControlHeader,
  ControlNotice,
  ControlToggle,
  ImpactList,
  StatusPill,
} from "./Phase3Shared";

const categories: ReadonlyArray<{ value: "all" | MemoryCategory; label: string }> = [
  { value: "all", label: "All memory" },
  { value: "user-stated", label: "User stated" },
  { value: "inferred-routine", label: "Routines" },
  { value: "preference", label: "Preferences" },
  { value: "important-place", label: "Places" },
  { value: "person", label: "People" },
  { value: "working-memory", label: "Working" },
];

function replaceMemory(items: MemoryItem[], next: MemoryItem) {
  return items.map((item) => (item.id === next.id ? next : item));
}

export function MemoryExperience({
  initialSnapshot,
}: {
  initialSnapshot: MemorySnapshot;
}) {
  const service = useMemo(
    () => createMockPhase3Services(initialSnapshot.scenario).memoryService,
    [initialSnapshot.scenario],
  );
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [category, setCategory] = useState<"all" | MemoryCategory>("all");
  const [selectedId, setSelectedId] = useState(initialSnapshot.items[0]?.id ?? "");
  const [dialog, setDialog] = useState<"correct" | "delete" | null>(null);
  const [correction, setCorrection] = useState("");
  const [impact, setImpact] = useState<DependencyImpact | null>(null);
  const [feedback, setFeedback] = useState("");
  const visible = snapshot.items.filter(
    (item) => category === "all" || item.category === category,
  );
  const selected =
    snapshot.items.find((memory) => memory.id === selectedId) ?? visible[0];
  const blocking = ["loading", "empty"].includes(snapshot.viewState);

  const updateSelected = (next: MemoryItem) => {
    setSnapshot((current) => ({
      ...current,
      items: replaceMemory(current.items, next),
    }));
  };

  return (
    <div
      className={
        initialSnapshot.scenario === "reduced-motion"
          ? "control-page is-reduced"
          : "control-page"
      }
    >
      <ControlHeader
        kicker="Correctable context"
        title="Memory you can inspect."
        summary={snapshot.summary}
        action={
          <Link
            className="secondary-button"
            href={scenarioHref(
              "/app/settings/permissions",
              snapshot.scenario,
            )}
          >
            Memory permissions
          </Link>
        }
      />
      <ControlNotice
        notice={snapshot.notice}
        tone={
          snapshot.viewState === "permission-denied" ||
          snapshot.viewState === "error"
            ? "danger"
            : "warning"
        }
      />
      <ControlBlockingState
        state={snapshot.viewState}
        noun="memories"
        scenario={snapshot.scenario}
      />

      {!blocking ? (
        <>
          <section className="control-hero memory-hero" aria-labelledby="memory-summary">
            <div className="control-hero-copy">
              <p className="section-kicker">Your context, not a black box</p>
              <h2 id="memory-summary">
                {snapshot.items.filter((item) => item.status === "unconfirmed").length}{" "}
                inferences are ready for your review.
              </h2>
              <p>
                NEXUS stores utility, origin, evidence, confidence, sensitivity,
                verification, and expiry together so a belief can be corrected
                before it shapes a decision.
              </p>
            </div>
            <div className="memory-orbit" aria-hidden="true">
              <span />
              <i />
              <i />
            </div>
            <div className="control-hero-metrics">
              <span>
                <b>{snapshot.items.filter((item) => item.status === "confirmed").length}</b>
                Confirmed
              </span>
              <span>
                <b>{snapshot.items.filter((item) => item.category === "inferred-routine").length}</b>
                Inferred routines
              </span>
              <span>
                <b>{snapshot.items.filter((item) => item.persistence === "temporary").length}</b>
                Expiring
              </span>
            </div>
          </section>

          {feedback ? <p className="control-feedback" role="status">{feedback}</p> : null}

          <div className="memory-category-tabs" role="tablist" aria-label="Memory categories">
            {categories.map((item) => (
              <button
                role="tab"
                type="button"
                key={item.value}
                aria-selected={category === item.value}
                className={category === item.value ? "is-active" : undefined}
                onClick={() => {
                  setCategory(item.value);
                  const next = snapshot.items.find(
                    (memory) => item.value === "all" || memory.category === item.value,
                  );
                  if (next) setSelectedId(next.id);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="control-workspace">
            <section className="control-rail" aria-labelledby="memory-list-heading">
              <header>
                <div>
                  <p className="section-kicker">Memory inventory</p>
                  <h2 id="memory-list-heading">Why each item exists</h2>
                </div>
                <span>{visible.length} shown</span>
              </header>
              <div className="control-row-list">
                {visible.map((memory) => (
                  <button
                    className={
                      selected?.id === memory.id
                        ? "control-row is-active"
                        : "control-row"
                    }
                    type="button"
                    key={memory.id}
                    aria-pressed={selected?.id === memory.id}
                    onClick={() => setSelectedId(memory.id)}
                  >
                    <span className={`memory-kind is-${memory.category}`} aria-hidden="true" />
                    <span>
                      <b>{memory.label}</b>
                      <small>{memory.value}</small>
                    </span>
                    <StatusPill value={memory.status} />
                  </button>
                ))}
              </div>
            </section>

            {selected ? (
              <section className="control-detail" aria-labelledby="memory-detail-heading">
                <header className="control-detail-heading">
                  <div>
                    <span className={`sensitivity-label is-${selected.sensitivity}`}>
                      {selected.sensitivity.replaceAll("-", " ")}
                    </span>
                    <h2 id="memory-detail-heading">{selected.label}</h2>
                    <p>{selected.value}</p>
                  </div>
                  <StatusPill value={selected.status} />
                </header>

                <div className="memory-utility">
                  <span aria-hidden="true" />
                  <div>
                    <p className="section-kicker">Why NEXUS keeps this</p>
                    <h3>{selected.utility}</h3>
                    <p>Used by {selected.usedBy.join(" · ")}.</p>
                  </div>
                </div>

                <div className="memory-provenance">
                  <div>
                    <p className="section-kicker">Origin</p>
                    <h3>{selected.origin.kind.replaceAll("-", " ")}</h3>
                    <p>{selected.origin.sourceLabel}</p>
                  </div>
                  <div>
                    <p className="section-kicker">Confidence</p>
                    <h3>
                      {typeof selected.confidence === "number"
                        ? `${Math.round(selected.confidence * 100)}%`
                        : "User stated"}
                    </h3>
                    <p>Last verified {selected.lastVerifiedAt}</p>
                  </div>
                  <div>
                    <p className="section-kicker">Expiry</p>
                    <h3>{selected.expiresAt ? "Expiring" : "No automatic expiry"}</h3>
                    <p>{selected.expiresAt ?? "Review manually when it changes."}</p>
                  </div>
                </div>

                {selected.evidence.length ? (
                  <div className="memory-evidence-list">
                    <div className="control-section-heading">
                      <div>
                        <p className="section-kicker">Evidence and conflict review</p>
                        <h3>What supports this belief</h3>
                      </div>
                      <span>{selected.evidence.length} sources</span>
                    </div>
                    {selected.evidence.map((evidence) => (
                      <div key={evidence.id}>
                        <span aria-hidden="true" />
                        <span>
                          <b>{evidence.source}</b>
                          <p>{evidence.detail}</p>
                        </span>
                        <small>{evidence.observedAt}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="memory-evidence-empty">
                    <p className="section-kicker">Evidence</p>
                    <p>User-stated information does not need inferred evidence.</p>
                  </div>
                )}

                <div className="memory-controls">
                  <ControlToggle
                    checked={selected.persistence === "persistent"}
                    label={
                      selected.persistence === "persistent"
                        ? "Persistent memory"
                        : "Temporary memory"
                    }
                    description="Temporary items expire at the time shown above."
                    onChange={async (persistent) => {
                      const next = await service.updateMemory(selected.id, {
                        persistence: persistent ? "persistent" : "temporary",
                      });
                      updateSelected(next);
                    }}
                  />
                  <ControlToggle
                    checked={selected.inferenceLocked}
                    label="Lock against inference"
                    description="Only an explicit edit can change this value."
                    onChange={async (inferenceLocked) => {
                      const next = await service.updateMemory(selected.id, {
                        inferenceLocked,
                      });
                      updateSelected(next);
                    }}
                  />
                </div>

                <footer className="control-detail-actions">
                  {selected.status === "deleted" ? (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={async () => {
                        await service.restoreMemory(selected.id);
                        updateSelected({ ...selected, status: "unconfirmed" });
                        setFeedback("Memory restored for review.");
                      }}
                    >
                      Restore memory
                    </button>
                  ) : (
                    <>
                      {selected.status !== "confirmed" ? (
                        <button
                          className="primary-button"
                          type="button"
                          onClick={async () => {
                            await service.confirmMemory(selected.id);
                            updateSelected({
                              ...selected,
                              status: "confirmed",
                              lastVerifiedAt: "2026-07-25T09:20:00+05:30",
                            });
                            setFeedback("Memory confirmed and recorded in Activity.");
                          }}
                        >
                          Confirm
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setCorrection(selected.value);
                          setDialog("correct");
                        }}
                      >
                        Correct
                      </button>
                      <button
                        className="is-danger"
                        type="button"
                        onClick={async () => {
                          setImpact(await service.previewDeletion(selected.id));
                          setDialog("delete");
                        }}
                      >
                        Forget
                      </button>
                    </>
                  )}
                </footer>
              </section>
            ) : null}
          </div>
        </>
      ) : null}

      <ControlDialog
        open={dialog === "correct" && Boolean(selected)}
        eyebrow="Memory correction"
        title={`Correct ${selected?.label ?? "memory"}`}
        onClose={() => setDialog(null)}
        footer={
          <>
            <button type="button" onClick={() => setDialog(null)}>Cancel</button>
            <button
              className="primary-button"
              type="button"
              onClick={async () => {
                if (!selected || !correction.trim()) return;
                await service.correctMemory(selected.id, correction.trim());
                updateSelected({
                  ...selected,
                  value: correction.trim(),
                  status: "confirmed",
                  confidence: 1,
                  lastVerifiedAt: "2026-07-25T09:20:00+05:30",
                });
                setFeedback(
                  "Correction saved for this demo session and recorded in Activity.",
                );
                setDialog(null);
              }}
            >
              Save correction
            </button>
          </>
        }
      >
        <label className="control-field">
          <span>Correct value</span>
          <textarea
            value={correction}
            onChange={(event) => setCorrection(event.target.value)}
          />
        </label>
        <p>
          The correction becomes user-confirmed and updates dependent mock
          features. Future inference cannot silently override a locked value.
        </p>
      </ControlDialog>

      <ControlDialog
        open={dialog === "delete" && Boolean(selected && impact)}
        eyebrow="Dependency preview"
        title={impact?.title ?? "Forget memory?"}
        onClose={() => setDialog(null)}
        footer={
          <>
            <button type="button" onClick={() => setDialog(null)}>Keep memory</button>
            <button
              className="destructive-button"
              type="button"
              onClick={async () => {
                if (!selected) return;
                await service.deleteMemory(selected.id);
                updateSelected({ ...selected, status: "deleted" });
                setFeedback(
                  "Memory excluded from new decisions. A reversible record is available in Activity.",
                );
                setDialog(null);
              }}
            >
              Confirm forget
            </button>
          </>
        }
      >
        <p>{impact?.detail}</p>
        <ImpactList
          features={impact?.affectedFeatures ?? []}
          automations={impact?.affectedAutomations ?? []}
          reversible={impact?.reversible ?? false}
        />
      </ControlDialog>
    </div>
  );
}
