"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  DependencyImpact,
  PermissionGrant,
  PermissionSnapshot,
  RetentionChoice,
  ModelUseChoice,
} from "@/lib/domain/contracts";
import { createMockPhase3Services } from "@/lib/mocks/mock-phase3-services";
import { scenarioHref } from "@/lib/mocks/phase2-fixtures";
import {
  AuthoritySelect,
  ControlBlockingState,
  ControlDialog,
  ControlHeader,
  ControlNotice,
  ControlToggle,
  ImpactList,
  StatusPill,
} from "./Phase3Shared";

function replaceGrant(items: PermissionGrant[], next: PermissionGrant) {
  return items.map((item) => (item.id === next.id ? next : item));
}

export function PermissionsExperience({
  initialSnapshot,
}: {
  initialSnapshot: PermissionSnapshot;
}) {
  const service = useMemo(
    () => createMockPhase3Services(initialSnapshot.scenario).permissionService,
    [initialSnapshot.scenario],
  );
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedId, setSelectedId] = useState(
    initialSnapshot.grants[0]?.id ?? "",
  );
  const [impact, setImpact] = useState<DependencyImpact | null>(null);
  const [dialog, setDialog] = useState<"revoke" | "history" | null>(null);
  const [feedback, setFeedback] = useState("");
  const selected =
    snapshot.grants.find((grant) => grant.id === selectedId) ??
    snapshot.grants[0];
  const blocking = ["loading", "empty"].includes(snapshot.viewState);

  const updateSelected = (next: PermissionGrant) => {
    setSnapshot((current) => ({
      ...current,
      grants: replaceGrant(current.grants, next),
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
        kicker="Trust and authority"
        title="Permission is not one switch."
        summary={snapshot.summary}
        action={
          <Link
            className="secondary-button"
            href={scenarioHref("/app/connections", snapshot.scenario)}
          >
            View connections
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
        noun="permissions"
        scenario={snapshot.scenario}
      />

      {!blocking ? (
        <>
          <section className="control-hero permission-hero" aria-labelledby="permission-gates">
            <div className="control-hero-copy">
              <p className="section-kicker">Two global safety gates</p>
              <h2 id="permission-gates">
                {snapshot.observationPaused
                  ? "Observation is paused."
                  : "NEXUS may read only the purposes shown below."}
              </h2>
              <p>
                Pausing observation stops new reads. The automation kill switch
                separately stops proactive evaluation and prepared actions.
              </p>
            </div>
            <div className="permission-global-controls">
              <ControlToggle
                checked={snapshot.observationPaused}
                danger
                label="Pause observation"
                description="Stop every new permitted read."
                onChange={async (paused) => {
                  await service.setObservationPaused(paused);
                  setSnapshot((current) => ({
                    ...current,
                    observationPaused: paused,
                  }));
                  setFeedback(
                    paused
                      ? "Observation paused and recorded in Activity."
                      : "Observation resumed for individually permitted purposes.",
                  );
                }}
              />
              <ControlToggle
                checked={snapshot.automationsPaused}
                danger
                label="Pause all automations"
                description="Prevent every proactive recipe from evaluating."
                onChange={async (paused) => {
                  await service.setAutomationsPaused(paused);
                  setSnapshot((current) => ({
                    ...current,
                    automationsPaused: paused,
                  }));
                  setFeedback(
                    paused
                      ? "Automation policy paused globally."
                      : "Automation policy resumed; individual states remain.",
                  );
                }}
              />
            </div>
            <div className="permission-ladder" aria-label="Authority ladder">
              {["Observe", "Suggest", "Prepare", "Ask", "Act"].map(
                (level, index) => (
                  <span key={level} className={index === 4 ? "is-locked" : undefined}>
                    <i aria-hidden="true" />
                    <b>{level}</b>
                    <small>{index === 4 ? "Unavailable by default" : "User controlled"}</small>
                  </span>
                ),
              )}
            </div>
          </section>

          {feedback ? <p className="control-feedback" role="status">{feedback}</p> : null}

          <div className="control-workspace permission-workspace">
            <section className="control-rail" aria-labelledby="permission-list-heading">
              <header>
                <div>
                  <p className="section-kicker">Permission inventory</p>
                  <h2 id="permission-list-heading">By source and capability</h2>
                </div>
                <span>{snapshot.grants.length} controls</span>
              </header>
              <div className="control-row-list">
                {snapshot.grants.map((grant) => (
                  <button
                    className={
                      selected?.id === grant.id
                        ? "control-row is-active"
                        : "control-row"
                    }
                    type="button"
                    key={grant.id}
                    aria-pressed={selected?.id === grant.id}
                    onClick={() => setSelectedId(grant.id)}
                  >
                    <span className="permission-class" aria-hidden="true">
                      <i />
                    </span>
                    <span>
                      <b>{grant.sourceLabel}</b>
                      <small>{grant.capability}</small>
                    </span>
                    <StatusPill value={grant.status} />
                  </button>
                ))}
              </div>
            </section>

            {selected ? (
              <section className="control-detail" aria-labelledby="permission-detail-heading">
                <header className="control-detail-heading">
                  <div>
                    <span className={`sensitivity-label is-${selected.dataClass}`}>
                      {selected.sensitive ? "Sensitive · " : ""}
                      {selected.dataClass.replaceAll("-", " ")}
                    </span>
                    <h2 id="permission-detail-heading">{selected.capability}</h2>
                    <p>{selected.sourceLabel}</p>
                  </div>
                  <StatusPill value={selected.status} />
                </header>

                <div className="permission-dimensions">
                  <section>
                    <span className="dimension-index">01</span>
                    <div>
                      <p className="section-kicker">Provider capability</p>
                      <h3>{selected.providerScope}</h3>
                      <p>
                        What the provider could technically expose. This does not
                        grant NEXUS retention, model use, notifications, or action.
                      </p>
                    </div>
                  </section>
                  <section>
                    <span className="dimension-index">02</span>
                    <div>
                      <p className="section-kicker">NEXUS read purpose</p>
                      <h3>{selected.readAllowed ? "Allowed for one purpose" : "Read stopped"}</h3>
                      <p>{selected.readPurpose}</p>
                    </div>
                    <ControlToggle
                      checked={selected.readAllowed}
                      label="Allow read"
                      onChange={async (readAllowed) => {
                        const next = await service.updatePermission(selected.id, {
                          readAllowed,
                        });
                        updateSelected(next);
                        setFeedback(
                          readAllowed
                            ? "Read restored for the stated purpose."
                            : "Read reduced. Provider capability remains separate.",
                        );
                      }}
                    />
                  </section>
                  <section>
                    <span className="dimension-index">03</span>
                    <div>
                      <p className="section-kicker">Retention</p>
                      <h3>Normalized data lifetime</h3>
                      <p>Choose how long NEXUS may keep a useful normalized record.</p>
                    </div>
                    <label className="control-field">
                      <span>Retention choice</span>
                      <select
                        value={selected.retention}
                        onChange={async (event) => {
                          const next = await service.updatePermission(selected.id, {
                            retention: event.target.value as RetentionChoice,
                          });
                          updateSelected(next);
                        }}
                      >
                        <option value="none">Do not retain</option>
                        <option value="working-context">Working context only</option>
                        <option value="30-days">30 days</option>
                        <option value="until-disconnected">Until disconnected</option>
                      </select>
                    </label>
                  </section>
                  <section>
                    <span className="dimension-index">04</span>
                    <div>
                      <p className="section-kicker">Future model use</p>
                      <h3>Whether permitted data may reach future language processing</h3>
                      <p>Retrieval and model use are not connected in Phase 3.</p>
                    </div>
                    <label className="control-field">
                      <span>Model-use choice</span>
                      <select
                        value={selected.modelUse}
                        onChange={async (event) => {
                          const next = await service.updatePermission(selected.id, {
                            modelUse: event.target.value as ModelUseChoice,
                          });
                          updateSelected(next);
                        }}
                      >
                        <option value="never">Never</option>
                        <option value="allowed-for-purpose">Only for this purpose</option>
                      </select>
                    </label>
                  </section>
                  <section>
                    <span className="dimension-index">05</span>
                    <div>
                      <p className="section-kicker">Notification permission</p>
                      <h3>Whether this source may contribute to an interruption</h3>
                      <p>Notification thresholds remain separate from source reads.</p>
                    </div>
                    <ControlToggle
                      checked={selected.notificationsAllowed}
                      label="May notify"
                      onChange={async (notificationsAllowed) => {
                        const next = await service.updatePermission(selected.id, {
                          notificationsAllowed,
                        });
                        updateSelected(next);
                      }}
                    />
                  </section>
                  <section>
                    <span className="dimension-index">06</span>
                    <div>
                      <p className="section-kicker">Action authority</p>
                      <h3>How far NEXUS may go after understanding context</h3>
                      <p>Automatic Act remains unavailable in this Phase 3 mock.</p>
                    </div>
                    <AuthoritySelect
                      value={selected.actionAuthority}
                      onChange={async (actionAuthority) => {
                        const next = await service.updatePermission(selected.id, {
                          actionAuthority,
                        });
                        updateSelected(next);
                        setFeedback(`Authority changed to ${next.actionAuthority}.`);
                      }}
                    />
                  </section>
                </div>

                <div className="permission-impact-summary">
                  <div>
                    <p className="section-kicker">Dependent features</p>
                    <p>{selected.dependentFeatures.join(" · ") || "None"}</p>
                  </div>
                  <div>
                    <p className="section-kicker">Dependent automations</p>
                    <p>{selected.dependentAutomations.join(" · ") || "None"}</p>
                  </div>
                </div>

                <footer className="control-detail-actions">
                  <button type="button" onClick={() => setDialog("history")}>
                    Permission history
                  </button>
                  {selected.status === "revoked" ? (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={async () => {
                        const next = await service.restorePermission(selected.id);
                        updateSelected(next);
                        setFeedback("Minimum safe permission restored.");
                      }}
                    >
                      Restore minimum
                    </button>
                  ) : (
                    <button
                      className="is-danger"
                      type="button"
                      onClick={async () => {
                        setImpact(await service.previewRevocation(selected.id));
                        setDialog("revoke");
                      }}
                    >
                      Revoke permission
                    </button>
                  )}
                </footer>
              </section>
            ) : null}
          </div>
        </>
      ) : null}

      <ControlDialog
        open={dialog === "history" && Boolean(selected)}
        eyebrow="Permission history"
        title={selected?.capability ?? "Permission"}
        onClose={() => setDialog(null)}
      >
        <div className="history-list">
          {selected?.history.map((entry) => (
            <div key={entry.id}>
              <StatusPill value={entry.actor} />
              <b>{entry.summary}</b>
              <small>{entry.changedAt}</small>
            </div>
          ))}
        </div>
      </ControlDialog>

      <ControlDialog
        open={dialog === "revoke" && Boolean(selected && impact)}
        eyebrow="Fresh confirmation required"
        title={impact?.title ?? "Revoke permission?"}
        onClose={() => setDialog(null)}
        footer={
          <>
            <button type="button" onClick={() => setDialog(null)}>Keep permission</button>
            <button
              className="destructive-button"
              type="button"
              onClick={async () => {
                if (!selected) return;
                const next = await service.revokePermission(selected.id);
                updateSelected(next);
                setFeedback(
                  "Permission revoked. Dependent connection and automations were updated and recorded.",
                );
                setDialog(null);
              }}
            >
              Confirm revocation
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
