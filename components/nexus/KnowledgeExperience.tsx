"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  KnowledgeDocument,
  KnowledgeSnapshot,
  KnowledgeSourceKind,
} from "@/lib/domain/contracts";
import { scenarioHref } from "@/lib/mocks/phase2-fixtures";
import {
  BlockingState,
  HealthStrip,
  MetaLine,
  PhaseHeader,
  ScenarioBanner,
} from "@/components/nexus/Phase2Shared";

type SourceFilter = "all" | KnowledgeSourceKind;

export function KnowledgeExperience({
  initialSnapshot,
}: {
  initialSnapshot: KnowledgeSnapshot;
}) {
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [selected, setSelected] = useState<KnowledgeDocument | null>(
    initialSnapshot.recent[0] ?? null,
  );
  const [feedback, setFeedback] = useState("");

  const visibleDocuments = useMemo(
    () =>
      initialSnapshot.recent.filter(
        (document) => filter === "all" || document.kind === filter,
      ),
    [filter, initialSnapshot.recent],
  );

  return (
    <div
      className={
        initialSnapshot.scenario === "reduced-motion"
          ? "phase2-page knowledge-page is-reduced"
          : "phase2-page knowledge-page"
      }
    >
      <PhaseHeader
        kicker="Permitted sources and material"
        title="Knowledge"
        summary={initialSnapshot.summary}
        action={
          <Link
            className="quiet-button"
            href={scenarioHref("/app/search", initialSnapshot.scenario)}
          >
            Search everything
          </Link>
        }
      />
      <ScenarioBanner
        notice={initialSnapshot.notice}
        tone={initialSnapshot.viewState === "error" ? "danger" : "warning"}
      />
      <BlockingState state={initialSnapshot.viewState} noun="knowledge view" />

      {initialSnapshot.sources.length > 0 ? (
        <>
          <section className="knowledge-source-overview" aria-labelledby="knowledge-sources-title">
            <div>
              <p className="section-kicker">Source boundary</p>
              <h2 id="knowledge-sources-title">What NEXUS may retrieve from</h2>
              <p>
                These are deterministic future-source shapes, not connected accounts.
              </p>
            </div>
            <div className="knowledge-source-rail">
              {initialSnapshot.sources.map((source) => (
                <button
                  className={filter === source.kind ? "is-active" : undefined}
                  type="button"
                  key={source.id}
                  onClick={() =>
                    setFilter((current) => (current === source.kind ? "all" : source.kind))
                  }
                >
                  <span className={`source-glyph source-${source.kind}`} aria-hidden="true">
                    {source.name.slice(0, 1)}
                  </span>
                  <span>
                    <b>{source.name}</b>
                    <small>{source.permission}</small>
                  </span>
                  <em>{source.status}</em>
                </button>
              ))}
            </div>
          </section>

          <div className="knowledge-workspace">
            <section className="knowledge-library" aria-labelledby="recent-material-title">
              <div className="knowledge-library-heading">
                <div>
                  <p className="section-kicker">Recent material</p>
                  <h2 id="recent-material-title">
                    {filter === "all" ? "Across permitted sources" : filter.replace("-", " ")}
                  </h2>
                </div>
                <button type="button" onClick={() => setFilter("all")}>
                  Clear filter
                </button>
              </div>
              <div className="knowledge-document-list">
                {visibleDocuments.map((document) => (
                  <button
                    className={selected?.id === document.id ? "is-active" : undefined}
                    type="button"
                    key={document.id}
                    onClick={() => setSelected(document)}
                  >
                    <span className={`document-kind is-${document.kind}`} aria-hidden="true" />
                    <span>
                      <small>{document.course}</small>
                      <b>{document.title}</b>
                      <em>{document.excerpt}</em>
                    </span>
                    <span>
                      {document.sourceLabel}
                      <small>{document.freshness}</small>
                    </span>
                  </button>
                ))}
              </div>

              <div className="knowledge-related">
                <p className="section-kicker">Related material</p>
                {initialSnapshot.related.map((document) => (
                  <button type="button" key={document.id} onClick={() => setSelected(document)}>
                    <span>{document.course}</span>
                    <b>{document.title}</b>
                  </button>
                ))}
              </div>
            </section>

            {selected ? (
              <aside className="knowledge-preview" aria-label={`${selected.title} preview`}>
                <div className="knowledge-preview-heading">
                  <span className={`document-kind is-${selected.kind}`} aria-hidden="true" />
                  <div>
                    <p className="section-kicker">{selected.course}</p>
                    <h2>{selected.title}</h2>
                  </div>
                </div>
                <MetaLine
                  source={selected.sourceLabel}
                  freshness={selected.freshness}
                />
                <div className="knowledge-excerpt">
                  <span>Document preview</span>
                  <p>{selected.excerpt}</p>
                </div>
                <blockquote>
                  <span>Evidence excerpt</span>
                  {selected.evidenceExcerpt}
                </blockquote>
                <div className="permission-boundary">
                  <span>Permission boundary</span>
                  <b>{selected.permission}</b>
                  <small>No full provider document was fetched.</small>
                </div>
                <div className="knowledge-preview-actions">
                  {selected.noteId ? (
                    <Link
                      className="primary-button"
                      href={scenarioHref("/app/notes", initialSnapshot.scenario)}
                    >
                      Open in Notes
                    </Link>
                  ) : null}
                  <Link
                    className="quiet-button"
                    href={scenarioHref("/app/search", initialSnapshot.scenario)}
                  >
                    Find related
                  </Link>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() =>
                      setFeedback(
                        "Delete-from-index remains a future control; no source was changed.",
                      )
                    }
                  >
                    Source options
                  </button>
                </div>
              </aside>
            ) : null}
          </div>
          {feedback ? <p className="phase2-feedback" role="status">{feedback}</p> : null}
          <HealthStrip health={initialSnapshot.sourceHealth} />
        </>
      ) : null}
    </div>
  );
}
