"use client";

import { useState } from "react";
import type {
  NexusWorkspaceSnapshot,
  ScriptedConversation,
} from "@/lib/domain/contracts";
import { nexusService } from "@/lib/mocks/mock-phase2-services";
import {
  BlockingState,
  EvidenceStack,
  HealthStrip,
  PhaseHeader,
  ScenarioBanner,
} from "@/components/nexus/Phase2Shared";

export function NexusWorkspace({
  initialSnapshot,
}: {
  initialSnapshot: NexusWorkspaceSnapshot;
}) {
  const firstScript =
    initialSnapshot.scripts.find(
      (script) => script.id === initialSnapshot.selectedScriptId,
    ) ?? initialSnapshot.scripts[0];
  const [selected, setSelected] = useState<ScriptedConversation | undefined>(
    firstScript,
  );
  const [input, setInput] = useState("");
  const [actionState, setActionState] = useState<
    "idle" | "approved" | "rejected" | "retry-succeeded"
  >("idle");
  const [feedback, setFeedback] = useState("");

  const openScript = async (scriptId: string) => {
    const script = await nexusService.runScript(
      initialSnapshot.scenario,
      scriptId,
    );
    setSelected(script);
    setActionState("idle");
    setFeedback("");
  };

  const submitPrompt = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = input.trim().toLowerCase();
    const match = initialSnapshot.scripts.find(
      (script) => script.prompt.toLowerCase() === normalized,
    );
    if (!match) {
      setFeedback(
        "Phase 2 supports the five scripted prompts shown here. No model call was made.",
      );
      return;
    }
    await openScript(match.id);
    setInput("");
  };

  const resolve = async (decision: "approve" | "reject" | "retry") => {
    if (!selected?.proposal) return;
    const result = await nexusService.resolvePreparedAction(
      selected.proposal.id,
      decision,
    );
    setActionState(
      decision === "approve"
        ? "approved"
        : decision === "reject"
          ? "rejected"
          : "retry-succeeded",
    );
    setFeedback(result.message);
  };

  return (
    <div
      className={
        initialSnapshot.scenario === "reduced-motion"
          ? "phase2-page nexus-page is-reduced"
          : "phase2-page nexus-page"
      }
    >
      <PhaseHeader
        kicker="Context, explanation and authority"
        title="NEXUS"
        summary="Ask what matters, inspect the evidence, and approve only prepared demo actions."
        action={<span className="mock-boundary-badge">Scripted · deterministic</span>}
      />
      <ScenarioBanner
        notice={initialSnapshot.notice}
        tone={initialSnapshot.viewState === "error" ? "danger" : "warning"}
      />
      <BlockingState
        state={initialSnapshot.viewState}
        noun="assistant workspace"
        scenario={initialSnapshot.scenario}
      />

      {selected ? (
        <>
          <section className="nexus-context" aria-labelledby="context-summary-title">
            <div>
              <p className="section-kicker">Current context</p>
              <h2 id="context-summary-title">{initialSnapshot.contextSummary}</h2>
            </div>
            <div className="nexus-context-signals">
              {initialSnapshot.contextSignals.map((signal) => (
                <span key={signal.id}>
                  <small>{signal.label}</small>
                  <b>{signal.value}</b>
                  <em>{signal.source} · {signal.freshness}</em>
                </span>
              ))}
            </div>
          </section>

          <div className="nexus-workspace">
            <aside className="nexus-thread-list" aria-label="Conversation history">
              <div>
                <p className="section-kicker">History</p>
                <h2>Conversations</h2>
              </div>
              {initialSnapshot.threads.map((thread) => (
                <button type="button" key={thread.id}>
                  <span>{thread.title}</span>
                  <small>{thread.updatedAt.includes("25T") ? "Today" : "Yesterday"}</small>
                </button>
              ))}
              <div className="nexus-suggested">
                <span>Suggested questions</span>
                {initialSnapshot.scripts.map((script) => (
                  <button
                    className={selected.id === script.id ? "is-active" : undefined}
                    type="button"
                    key={script.id}
                    onClick={() => openScript(script.id)}
                  >
                    {script.prompt}
                  </button>
                ))}
              </div>
            </aside>

            <section className="nexus-conversation" aria-labelledby="conversation-title">
              <div className="nexus-conversation-heading">
                <div>
                  <p className="section-kicker">{selected.contextLabel}</p>
                  <h2 id="conversation-title">{selected.prompt}</h2>
                </div>
                <span>No live model</span>
              </div>
              <div className="conversation-messages" aria-live="polite">
                {selected.messages.map((message) => (
                  <article
                    className={`conversation-message is-${message.role} state-${message.state}`}
                    key={message.id}
                  >
                    <span>{message.role === "nexus" ? "N" : "You"}</span>
                    <div>
                      <small>{message.role === "nexus" ? "NEXUS" : "You"}</small>
                      <p>{message.content}</p>
                      {message.evidence.length > 0 ? (
                        <details>
                          <summary>{message.evidence.length} sources used</summary>
                          <EvidenceStack evidence={message.evidence} />
                        </details>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>

              {selected.proposal ? (
                <section className="nexus-action-preview" aria-labelledby="nexus-action-title">
                  <div>
                    <p className="section-kicker">Prepared action · Ask</p>
                    <h3 id="nexus-action-title">{selected.proposal.label}</h3>
                    <p>{selected.proposal.reason}</p>
                    <dl>
                      {Object.entries(selected.proposal.parameters).map(([key, value]) => (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="nexus-action-authority">
                    <span>Required authority</span>
                    <b>{selected.proposal.requiredAuthority}</b>
                    <small>One approval · demo state only</small>
                    {selected.toolResult?.status === "failed" &&
                    actionState !== "retry-succeeded" ? (
                      <button className="primary-button" type="button" onClick={() => resolve("retry")}>
                        Retry safely
                      </button>
                    ) : selected.toolResult?.status === "running" ? (
                      <span className="mock-boundary-badge">Running · result pending</span>
                    ) : selected.toolResult?.status === "succeeded" ? (
                      <span className="mock-boundary-badge">Succeeded · result recorded</span>
                    ) : (
                      <>
                        <button className="primary-button" type="button" onClick={() => resolve("approve")}>
                          Approve once
                        </button>
                        <button className="quiet-button" type="button" onClick={() => resolve("reject")}>
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </section>
              ) : null}

              {selected.toolResult ? (
                <div className={`recorded-tool-result is-${actionState}`}>
                  <span>Recorded mock tool result</span>
                  <b>
                    {actionState === "approved"
                      ? "Approval recorded · no tool run"
                      : actionState === "rejected"
                        ? "Rejected · no tool run"
                        : actionState === "retry-succeeded"
                          ? "Retry recorded as successful in demo state"
                          : selected.toolResult.summary}
                  </b>
                  <small>
                    Tool success is represented only by this deterministic record.
                  </small>
                </div>
              ) : null}

              <form className="nexus-composer" onSubmit={submitPrompt}>
                <label htmlFor="nexus-question">Ask one of the scripted questions</label>
                <div>
                  <input
                    id="nexus-question"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Try “What am I forgetting?”"
                  />
                  <button type="submit">Ask</button>
                </div>
              </form>
            </section>
          </div>
          {feedback ? <p className="phase2-feedback" role="status">{feedback}</p> : null}
          <HealthStrip health={initialSnapshot.sourceHealth} />
        </>
      ) : null}
    </div>
  );
}
