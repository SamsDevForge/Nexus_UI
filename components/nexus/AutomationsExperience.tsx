"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  AutomationDefinition,
  AutomationDryRunResult,
  AutomationSnapshot,
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

function replaceAutomation(
  items: AutomationDefinition[],
  next: AutomationDefinition,
) {
  return items.map((item) => (item.id === next.id ? next : item));
}

export function AutomationsExperience({
  initialSnapshot,
}: {
  initialSnapshot: AutomationSnapshot;
}) {
  const service = useMemo(
    () => createMockPhase3Services(initialSnapshot.scenario).automationService,
    [initialSnapshot.scenario],
  );
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedId, setSelectedId] = useState(
    initialSnapshot.automations[0]?.id ?? "",
  );
  const [dialog, setDialog] = useState<
    "create" | "delete" | "history" | null
  >(null);
  const [createMode, setCreateMode] = useState<"template" | "custom">("template");
  const [customName, setCustomName] = useState("Study-day reset");
  const [customTrigger, setCustomTrigger] = useState(
    "When tomorrow has an early class",
  );
  const [customAction, setCustomAction] = useState(
    "Suggest a preparation checklist",
  );
  const [dryRun, setDryRun] = useState<AutomationDryRunResult | null>(null);
  const [feedback, setFeedback] = useState("");

  const selected =
    snapshot.automations.find((automation) => automation.id === selectedId) ??
    snapshot.automations[0];

  const updateSelected = (next: AutomationDefinition) => {
    setSnapshot((current) => ({
      ...current,
      automations: replaceAutomation(current.automations, next),
    }));
    setSelectedId(next.id);
  };

  const createAutomation = async () => {
    const next =
      createMode === "template"
        ? await service.createFromTemplate(snapshot.templates[0].id)
        : await service.createCustom({
            name: customName,
            trigger: customTrigger,
            proposedAction: customAction,
          });
    setSnapshot((current) => ({
      ...current,
      automations: [...current.automations, next],
    }));
    setSelectedId(next.id);
    setFeedback(`${next.name} created as a safe draft.`);
    setDialog(null);
  };

  const blocking = ["loading", "empty"].includes(snapshot.viewState);

  return (
    <div
      className={
        initialSnapshot.scenario === "reduced-motion"
          ? "control-page is-reduced"
          : "control-page"
      }
    >
      <ControlHeader
        kicker="Proactive behaviour"
        title="Automation, with the lights on."
        summary={snapshot.summary}
        action={
          <button
            className="primary-button"
            type="button"
            onClick={() => setDialog("create")}
            disabled={blocking}
          >
            Create automation
          </button>
        }
      />
      <ControlNotice
        notice={snapshot.notice}
        tone={
          snapshot.viewState === "error" ||
          snapshot.viewState === "permission-denied"
            ? "danger"
            : "warning"
        }
      />
      <ControlBlockingState
        state={snapshot.viewState}
        noun="automations"
        scenario={snapshot.scenario}
      />

      {!blocking ? (
        <>
          <section className="control-hero automation-hero" aria-labelledby="automation-policy">
            <div className="control-hero-copy">
              <p className="section-kicker">Global policy gate</p>
              <h2 id="automation-policy">
                {snapshot.globallyPaused
                  ? "Every automation is paused."
                  : `${snapshot.activeCount} recipes may evaluate. Nothing acts silently.`}
              </h2>
              <p>
                Provider access never grants action authority. Each recipe stops
                at its own Observe, Suggest, Prepare, or Ask boundary.
              </p>
            </div>
            <ControlToggle
              checked={snapshot.globallyPaused}
              danger
              label="Pause all automations"
              description="Emergency stop for every proactive recipe."
              onChange={async (paused) => {
                await service.setGlobalPause(paused);
                setSnapshot((current) => ({
                  ...current,
                  globallyPaused: paused,
                }));
                setFeedback(
                  paused
                    ? "All automations paused and recorded in Activity."
                    : "Automation policy resumed. Individual pauses remain.",
                );
              }}
            />
            <div className="control-hero-metrics" aria-label="Automation summary">
              <span>
                <b>{snapshot.activeCount}</b>
                Active
              </span>
              <span>
                <b>{snapshot.needsAttentionCount}</b>
                Need attention
              </span>
              <span>
                <b>Ask</b>
                Highest current authority
              </span>
            </div>
          </section>

          {feedback ? <p className="control-feedback" role="status">{feedback}</p> : null}

          <div className="control-workspace">
            <section className="control-rail" aria-labelledby="automation-list-heading">
              <header>
                <div>
                  <p className="section-kicker">Your recipes</p>
                  <h2 id="automation-list-heading">Explainable by design</h2>
                </div>
                <span>{snapshot.automations.length} total</span>
              </header>
              <div className="control-row-list">
                {snapshot.automations.map((automation) => (
                  <button
                    className={
                      selected?.id === automation.id
                        ? "control-row is-active"
                        : "control-row"
                    }
                    type="button"
                    key={automation.id}
                    aria-pressed={selected?.id === automation.id}
                    onClick={() => {
                      setSelectedId(automation.id);
                      setDryRun(null);
                    }}
                  >
                    <span className="control-row-state" aria-hidden="true" />
                    <span>
                      <b>{automation.name}</b>
                      <small>{automation.trigger.label}</small>
                    </span>
                    <StatusPill value={automation.status} />
                  </button>
                ))}
              </div>
            </section>

            {selected ? (
              <section className="control-detail" aria-labelledby="automation-detail-heading">
                <header className="control-detail-heading">
                  <div>
                    <StatusPill value={selected.status} />
                    <h2 id="automation-detail-heading">{selected.name}</h2>
                    <p>{selected.description}</p>
                  </div>
                  <ControlToggle
                    checked={selected.status !== "paused"}
                    label={selected.status === "paused" ? "Paused" : "Enabled"}
                    onChange={async (enabled) => {
                      const next = await service.setPaused(selected.id, !enabled);
                      updateSelected(next);
                    }}
                  />
                </header>

                {selected.attentionReason ? (
                  <div className="control-inline-alert">
                    <span aria-hidden="true" />
                    <p>{selected.attentionReason}</p>
                    {["blocked", "needs-attention"].includes(selected.status) ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const next = await service.recoverAutomation(selected.id);
                          updateSelected(next);
                          setFeedback(next.attentionReason ?? "Recovery reviewed.");
                        }}
                      >
                        Review recovery
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <div className="control-flow" aria-label="Automation flow">
                  <div>
                    <span>When</span>
                    <b>{selected.trigger.label}</b>
                    <small>{selected.trigger.cadence}</small>
                  </div>
                  <div>
                    <span>Only if</span>
                    <b>
                      {selected.conditions.length
                        ? `${selected.conditions.filter((item) => item.satisfied).length} of ${selected.conditions.length} conditions pass`
                        : "No extra conditions"}
                    </b>
                    <small>
                      {selected.conditions.map((item) => item.label).join(" · ") ||
                        "Trigger alone"}
                    </small>
                  </div>
                  <div>
                    <span>Then</span>
                    <b>{selected.proposedAction}</b>
                    <small>Bound by {selected.authority} authority</small>
                  </div>
                </div>

                <div className="control-detail-grid">
                  <div className="control-detail-group">
                    <p className="section-kicker">Data and dependencies</p>
                    <h3>What this recipe needs</h3>
                    <div className="dependency-list">
                      {selected.dependencies.map((dependency) => (
                        <span key={dependency.id}>
                          <i className={`is-${dependency.state}`} aria-hidden="true" />
                          <b>{dependency.label}</b>
                          <small>{dependency.kind} · {dependency.state}</small>
                        </span>
                      ))}
                    </div>
                    <p className="control-data-line">
                      <span>Data used</span>
                      {selected.dataUsed.join(" · ")}
                    </p>
                    <Link
                      href={scenarioHref(
                        "/app/settings/permissions",
                        snapshot.scenario,
                      )}
                    >
                      Review dependent permissions
                    </Link>
                  </div>
                  <div className="control-detail-group">
                    <p className="section-kicker">Authority and timing</p>
                    <h3>How far NEXUS may go</h3>
                    <AuthoritySelect
                      value={selected.authority}
                      onChange={async (authority) => {
                        const next = await service.changeAuthority(
                          selected.id,
                          authority,
                        );
                        updateSelected(next);
                        setFeedback(
                          `Authority set to ${next.authority}. Automatic Act remains unavailable.`,
                        );
                      }}
                    />
                    <dl className="control-meta-list">
                      <div>
                        <dt>Last run</dt>
                        <dd>{selected.lastRunAt ?? "Never"}</dd>
                      </div>
                      <div>
                        <dt>Next eligible</dt>
                        <dd>{selected.nextEligibleAt ?? "Not scheduled"}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {dryRun ? (
                  <div className="dry-run-trace" aria-live="polite">
                    <header>
                      <div>
                        <p className="section-kicker">Deterministic dry-run</p>
                        <h3>{dryRun.outcome.replaceAll("-", " ")}</h3>
                      </div>
                      <StatusPill value={dryRun.outcome} />
                    </header>
                    <p>{dryRun.proposedOutcome}</p>
                    {dryRun.trace.map((step) => (
                      <div key={step.id}>
                        <span className={`is-${step.result}`} aria-hidden="true" />
                        <b>{step.label}</b>
                        <small>{step.detail}</small>
                      </div>
                    ))}
                  </div>
                ) : null}

                <footer className="control-detail-actions">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={async () => setDryRun(await service.runDryRun(selected.id))}
                  >
                    Run dry-run
                  </button>
                  <button type="button" onClick={() => setDialog("history")}>
                    Run history
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const next = await service.duplicateAutomation(selected.id);
                      setSnapshot((current) => ({
                        ...current,
                        automations: [...current.automations, next],
                      }));
                      setSelectedId(next.id);
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    className="is-danger"
                    type="button"
                    onClick={() => setDialog("delete")}
                  >
                    Delete
                  </button>
                </footer>
              </section>
            ) : null}
          </div>
        </>
      ) : null}

      <ControlDialog
        open={dialog === "create"}
        eyebrow="Structured editor"
        title="Create an automation"
        onClose={() => setDialog(null)}
        footer={
          <>
            <button type="button" onClick={() => setDialog(null)}>Cancel</button>
            <button className="primary-button" type="button" onClick={createAutomation}>
              Create safe draft
            </button>
          </>
        }
      >
        <div className="dialog-segments" role="group" aria-label="Creation method">
          <button
            type="button"
            className={createMode === "template" ? "is-active" : undefined}
            aria-pressed={createMode === "template"}
            onClick={() => setCreateMode("template")}
          >
            Reviewed template
          </button>
          <button
            type="button"
            className={createMode === "custom" ? "is-active" : undefined}
            aria-pressed={createMode === "custom"}
            onClick={() => setCreateMode("custom")}
          >
            Simple custom
          </button>
        </div>
        {createMode === "template" ? (
          <div className="template-preview">
            <StatusPill value="draft" />
            <h3>{snapshot.templates[0]?.name}</h3>
            <p>{snapshot.templates[0]?.description}</p>
            <ImpactList
              features={snapshot.templates[0]?.dataUsed ?? []}
              automations={[]}
              reversible
            />
          </div>
        ) : (
          <div className="control-form-grid">
            <label className="control-field">
              <span>Name</span>
              <input value={customName} onChange={(event) => setCustomName(event.target.value)} />
            </label>
            <label className="control-field">
              <span>Trigger</span>
              <input value={customTrigger} onChange={(event) => setCustomTrigger(event.target.value)} />
            </label>
            <label className="control-field">
              <span>Proposed outcome</span>
              <textarea value={customAction} onChange={(event) => setCustomAction(event.target.value)} />
            </label>
            <p>Custom drafts always begin at Suggest authority.</p>
          </div>
        )}
      </ControlDialog>

      <ControlDialog
        open={dialog === "history" && Boolean(selected)}
        eyebrow="Recorded runs"
        title={`${selected?.name ?? "Automation"} history`}
        onClose={() => setDialog(null)}
      >
        <div className="history-list">
          {selected?.runHistory.length ? (
            selected.runHistory.map((run) => (
              <div key={run.id}>
                <StatusPill value={run.outcome} />
                <b>{run.summary}</b>
                <small>{run.startedAt} · Authority {run.authorityUsed}</small>
              </div>
            ))
          ) : (
            <p>No runs yet. A dry-run records a safe trace in Activity.</p>
          )}
        </div>
      </ControlDialog>

      <ControlDialog
        open={dialog === "delete" && Boolean(selected)}
        eyebrow="High-impact control"
        title={`Delete ${selected?.name ?? "automation"}?`}
        onClose={() => setDialog(null)}
        footer={
          <>
            <button type="button" onClick={() => setDialog(null)}>Cancel</button>
            <button
              className="destructive-button"
              type="button"
              onClick={async () => {
                if (!selected) return;
                await service.deleteAutomation(selected.id);
                const nextItems = snapshot.automations.filter(
                  (automation) => automation.id !== selected.id,
                );
                setSnapshot((current) => ({ ...current, automations: nextItems }));
                setSelectedId(nextItems[0]?.id ?? "");
                setFeedback("Automation deleted from this demo session.");
                setDialog(null);
              }}
            >
              Delete automation
            </button>
          </>
        }
      >
        <p>
          This removes the recipe and its future eligibility. Existing activity
          history remains so prior decisions are still explainable.
        </p>
        <ImpactList
          features={selected?.dataUsed ?? []}
          automations={[selected?.name ?? "Selected automation"]}
          reversible={false}
        />
      </ControlDialog>
    </div>
  );
}
