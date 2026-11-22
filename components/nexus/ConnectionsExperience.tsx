"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AmbientMotion } from "./AmbientMotion";
import type {
  ConnectionRecord,
  ConnectionSnapshot,
  DependencyImpact,
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

function replaceConnection(items: ConnectionRecord[], next: ConnectionRecord) {
  return items.map((item) => (item.id === next.id ? next : item));
}

export function ConnectionsExperience({
  initialSnapshot,
}: {
  initialSnapshot: ConnectionSnapshot;
}) {
  const service = useMemo(
    () => createMockPhase3Services(initialSnapshot.scenario).connectionService,
    [initialSnapshot.scenario],
  );
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedId, setSelectedId] = useState(
    initialSnapshot.connections[0]?.id ?? "",
  );
  const [setupId, setSetupId] = useState(
    initialSnapshot.availableSetups[0]?.id ?? "",
  );
  const [dialog, setDialog] = useState<"setup" | "disconnect" | null>(null);
  const [impact, setImpact] = useState<DependencyImpact | null>(null);
  const [feedback, setFeedback] = useState("");
  const selected =
    snapshot.connections.find((connection) => connection.id === selectedId) ??
    snapshot.connections[0];
  const setup = snapshot.availableSetups.find(
    (connection) => connection.id === setupId,
  );
  const blocking = ["loading", "empty"].includes(snapshot.viewState);

  const updateSelected = (next: ConnectionRecord) => {
    setSnapshot((current) => ({
      ...current,
      connections: replaceConnection(current.connections, next),
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
        kicker="Context sources"
        title="Know what is connected."
        summary={snapshot.summary}
        action={
          <Link
            className="secondary-button"
            href={scenarioHref(
              "/app/settings/permissions",
              initialSnapshot.scenario,
            )}
          >
            Permission Centre
          </Link>
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
        noun="connections"
        scenario={snapshot.scenario}
      />

      {!blocking ? (
        <>
          <section className="control-hero connections-hero" aria-labelledby="connection-health">
            <div className="control-hero-copy">
              <p className="section-kicker">Integration health</p>
              <h2 id="connection-health">
                {snapshot.attentionCount
                  ? `${snapshot.attentionCount} source needs a clear next step.`
                  : "Every permitted source is healthy."}
              </h2>
              <p>
                “Connected” describes provider capability only. NEXUS purpose,
                retention, future model use, notifications, and action authority
                remain independent.
              </p>
            </div>
            <AmbientMotion
              className="connection-signal"
              state={
                snapshot.scenario === "privacy-paused"
                  ? "paused"
                  : snapshot.viewState === "offline" ||
                      snapshot.viewState === "error" ||
                      snapshot.viewState === "permission-denied"
                    ? "degraded"
                    : snapshot.attentionCount
                      ? "attention"
                      : "success"
              }
            >
              <span />
              <i />
              <i />
              <i />
            </AmbientMotion>
            <div className="control-hero-metrics">
              <span><b>{snapshot.healthyCount}</b>Healthy</span>
              <span><b>{snapshot.attentionCount}</b>Attention</span>
              <span><b>{snapshot.availableSetups.length}</b>Available</span>
            </div>
          </section>

          {feedback ? <p className="control-feedback" role="status">{feedback}</p> : null}

          <div className="control-workspace">
            <section className="control-rail" aria-labelledby="connection-list-heading">
              <header>
                <div>
                  <p className="section-kicker">Source inventory</p>
                  <h2 id="connection-list-heading">Health and identity</h2>
                </div>
                <span>{snapshot.connections.length} configured</span>
              </header>
              <div className="control-row-list">
                {snapshot.connections.map((connection) => (
                  <button
                    className={
                      selected?.id === connection.id
                        ? "control-row is-active"
                        : "control-row"
                    }
                    type="button"
                    key={connection.id}
                    aria-pressed={selected?.id === connection.id}
                    onClick={() => setSelectedId(connection.id)}
                  >
                    <span
                      className={`connection-family is-${connection.identity.family}`}
                      aria-hidden="true"
                    />
                    <span>
                      <b>{connection.identity.provider}</b>
                      <small>{connection.identity.accountLabel}</small>
                    </span>
                    <StatusPill value={connection.status} />
                  </button>
                ))}
              </div>

              <div className="available-connections">
                <p className="section-kicker">Available demos</p>
                {snapshot.availableSetups.map((connection) => (
                  <button
                    type="button"
                    key={connection.id}
                    onClick={() => {
                      setSetupId(connection.id);
                      setDialog("setup");
                    }}
                  >
                    <span
                      className={`connection-family is-${connection.identity.family}`}
                      aria-hidden="true"
                    />
                    <span>
                      <b>{connection.identity.provider}</b>
                      <small>Review capabilities</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {selected ? (
              <section className="control-detail" aria-labelledby="connection-detail-heading">
                <header className="control-detail-heading">
                  <div>
                    <StatusPill value={selected.status} />
                    <h2 id="connection-detail-heading">{selected.identity.provider}</h2>
                    <p>
                      {selected.identity.accountLabel} · {selected.identity.accountHint}
                    </p>
                  </div>
                  <span className={`freshness-badge is-${selected.freshness}`}>
                    {selected.freshness}
                  </span>
                </header>

                <div className="connection-health-line">
                  <span aria-hidden="true" />
                  <div>
                    <b>{selected.healthDetail}</b>
                    <small>
                      Last successful sync: {selected.lastSuccessfulSyncAt ?? "Never"}
                    </small>
                  </div>
                  {["stale", "reconnect-required", "denied"].includes(
                    selected.status,
                  ) ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const next = await service.reconnectConnection(selected.id);
                        updateSelected(next);
                        setFeedback("Connection restored in deterministic demo state.");
                      }}
                    >
                      Reconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        const result = await service.resyncConnection(selected.id);
                        if (result.status === "succeeded") {
                          const next = await service.reconnectConnection(selected.id);
                          updateSelected(next);
                        }
                        setFeedback(result.summary);
                      }}
                    >
                      Resync
                    </button>
                  )}
                </div>

                <div className="capability-list">
                  <div className="control-section-heading">
                    <div>
                      <p className="section-kicker">Provider capabilities</p>
                      <h3>What the source technically allows</h3>
                    </div>
                    <span>Not action authority</span>
                  </div>
                  {selected.capabilities.map((capability) => (
                    <div className="capability-row" key={capability.id}>
                      <div>
                        <b>{capability.label}</b>
                        <small>{capability.providerScope}</small>
                        <p>{capability.purpose}</p>
                      </div>
                      <ControlToggle
                        checked={capability.granted}
                        label={capability.granted ? "Granted" : "Not granted"}
                        onChange={async (granted) => {
                          const next = await service.setCapability(
                            selected.id,
                            capability.id,
                            granted,
                          );
                          updateSelected(next);
                          setFeedback(
                            granted
                              ? "Capability granted after mock review."
                              : "Capability reduced. Dependent reads stop.",
                          );
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="control-detail-grid">
                  <div className="control-detail-group">
                    <p className="section-kicker">NEXUS use</p>
                    <h3>Purpose and permission</h3>
                    <p>{selected.permissionSummary}</p>
                    <dl className="control-meta-list">
                      <div>
                        <dt>Dependent features</dt>
                        <dd>{selected.dependentFeatures.join(" · ")}</dd>
                      </div>
                      <div>
                        <dt>Dependent automations</dt>
                        <dd>
                          {selected.dependentAutomationIds.length
                            ? selected.dependentAutomationIds.length
                            : "None"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="control-detail-group">
                    <p className="section-kicker">Stored context</p>
                    <h3>Retention boundary</h3>
                    <p>{selected.retentionSummary}</p>
                    <Link
                      href={scenarioHref(
                        "/app/settings/permissions",
                        snapshot.scenario,
                      )}
                    >
                      Change permission dimensions
                    </Link>
                  </div>
                </div>

                <footer className="control-detail-actions">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={async () => {
                      const result = await service.resyncConnection(selected.id);
                      setFeedback(result.summary);
                    }}
                  >
                    Sync now
                  </button>
                  <Link
                    href={scenarioHref(
                      "/app/settings/permissions",
                      snapshot.scenario,
                    )}
                  >
                    Change permissions
                  </Link>
                  <button
                    className="is-danger"
                    type="button"
                    onClick={async () => {
                      setImpact(await service.previewDisconnect(selected.id));
                      setDialog("disconnect");
                    }}
                  >
                    Disconnect
                  </button>
                </footer>
              </section>
            ) : null}
          </div>
        </>
      ) : null}

      <ControlDialog
        open={dialog === "setup" && Boolean(setup)}
        eyebrow="Mock connection setup"
        title={`Review ${setup?.identity.provider ?? "connection"} access`}
        onClose={() => setDialog(null)}
        footer={
          <>
            <button type="button" onClick={() => setDialog(null)}>Cancel</button>
            <button
              className="primary-button"
              type="button"
              onClick={async () => {
                if (!setup) return;
                const next = await service.setupConnection(setup.id);
                setSnapshot((current) => ({
                  ...current,
                  connections: [...current.connections, next],
                  availableSetups: current.availableSetups.filter(
                    (connection) => connection.id !== setup.id,
                  ),
                  healthyCount: current.healthyCount + 1,
                }));
                setSelectedId(next.id);
                setFeedback(
                  "Mock setup completed. No OAuth, credentials, or provider call occurred.",
                );
                setDialog(null);
              }}
            >
              Approve mock setup
            </button>
          </>
        }
      >
        <p>
          Review the minimum capabilities before approval. These are future
          provider scopes represented by deterministic mock state.
        </p>
        <div className="capability-review">
          {setup?.capabilities.map((capability) => (
            <div key={capability.id}>
              <span aria-hidden="true" />
              <span>
                <b>{capability.label}</b>
                <small>{capability.providerScope}</small>
                <p>{capability.purpose}</p>
              </span>
            </div>
          ))}
        </div>
        <ImpactList
          features={setup?.dependentFeatures ?? []}
          automations={setup?.dependentAutomationIds ?? []}
          reversible
        />
      </ControlDialog>

      <ControlDialog
        open={dialog === "disconnect" && Boolean(selected && impact)}
        eyebrow="Dependency impact"
        title={impact?.title ?? "Disconnect source?"}
        onClose={() => setDialog(null)}
        footer={
          <>
            <button type="button" onClick={() => setDialog(null)}>Keep connected</button>
            <button
              className="destructive-button"
              type="button"
              onClick={async () => {
                if (!selected) return;
                const next = await service.disconnectConnection(selected.id);
                updateSelected(next);
                setFeedback(
                  "Disconnected. Dependent automations were blocked and Activity was updated.",
                );
                setDialog(null);
              }}
            >
              Confirm disconnect
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
