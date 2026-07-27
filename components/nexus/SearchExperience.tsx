"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type {
  SearchResponse,
  UnifiedSearchResultType,
} from "@/lib/domain/contracts";
import { searchService } from "@/lib/mocks/mock-phase2-services";
import { scenarioHref } from "@/lib/mocks/phase2-fixtures";
import {
  BlockingState,
  PhaseHeader,
  ScenarioBanner,
} from "@/components/nexus/Phase2Shared";

const typeLabels: Record<UnifiedSearchResultType, string> = {
  event: "Events",
  task: "Tasks and deadlines",
  insight: "Insights",
  conversation: "Conversations",
  knowledge: "Knowledge",
  note: "Notes",
  control: "Controls",
  "email-derived": "Email-derived",
};

export function SearchExperience({
  initialResponse,
}: {
  initialResponse: SearchResponse;
}) {
  const router = useRouter();
  const [response, setResponse] = useState(initialResponse);
  const [query, setQuery] = useState(initialResponse.query);
  const [types, setTypes] = useState<UnifiedSearchResultType[]>([]);
  const [source, setSource] = useState("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [keyboardNavigating, setKeyboardNavigating] = useState(false);

  const runSearch = async (
    nextQuery = query,
    nextTypes = types,
    nextSource = source,
  ) => {
    const next = await searchService.search(
      initialResponse.scenario,
      nextQuery,
      {
        types: nextTypes,
        sources: nextSource === "all" ? [] : [nextSource],
      },
    );
    setResponse(next);
    setActiveIndex(0);
    setKeyboardNavigating(false);
  };

  const groups = useMemo(
    () =>
      response.availableTypes
        .map((type) => ({
          type,
          results: response.results.filter((result) => result.type === type),
        }))
        .filter((group) => group.results.length > 0),
    [response],
  );

  const toggleType = (type: UnifiedSearchResultType) => {
    const next = types.includes(type)
      ? types.filter((item) => item !== type)
      : [...types, type];
    setTypes(next);
    void runSearch(query, next, source);
  };

  return (
    <div
      className={
        initialResponse.scenario === "reduced-motion"
          ? "phase2-page search-page is-reduced"
          : "phase2-page search-page"
      }
    >
      <PhaseHeader
        kicker="Unified retrieval"
        title="Search"
        summary="Find events, deadlines, insights, conversations and permitted material from one service boundary."
        action={<span className="shortcut-badge">Ctrl / ⌘ + K</span>}
      />
      <ScenarioBanner
        notice={response.notice}
        tone={response.viewState === "error" ? "danger" : "warning"}
      />
      <BlockingState
        state={
          response.viewState === "permission-denied"
            ? "populated"
            : response.viewState
        }
        noun="search index"
      />

      {!["loading", "empty"].includes(response.viewState) ? (
        <div className="search-workspace">
          <aside className="search-filters" aria-label="Search filters">
            <section>
              <span>Type</span>
              {response.availableTypes.map((type) => (
                <label key={type}>
                  <input
                    type="checkbox"
                    checked={types.includes(type)}
                    onChange={() => toggleType(type)}
                  />
                  <span>{typeLabels[type]}</span>
                </label>
              ))}
            </section>
            <section>
              <label htmlFor="source-filter">Source</label>
              <select
                id="source-filter"
                value={source}
                onChange={(event) => {
                  setSource(event.target.value);
                  void runSearch(query, types, event.target.value);
                }}
              >
                <option value="all">All permitted sources</option>
                {response.availableSources.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </section>
            <section className="recent-searches">
              <span>Recent</span>
              {response.recentSearches.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => {
                    setQuery(item);
                    void runSearch(item);
                  }}
                >
                  {item}
                </button>
              ))}
            </section>
            <Link
              className="text-button"
              href={scenarioHref("/app/today", initialResponse.scenario)}
            >
              Return to Today
            </Link>
          </aside>

          <section className="search-results" aria-labelledby="search-results-title">
            <form
              className="dedicated-search"
              onSubmit={(event) => {
                event.preventDefault();
                void runSearch();
              }}
            >
              <label htmlFor="search-query">Search NEXUS</label>
              <div>
                <span aria-hidden="true" />
                <input
                  id="search-query"
                  autoComplete="off"
                  value={query}
                  placeholder="Search Machine Learning, routing, tomorrow…"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setKeyboardNavigating(true);
                      setActiveIndex((current) =>
                        Math.min(current + 1, Math.max(response.results.length - 1, 0)),
                      );
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setKeyboardNavigating(true);
                      setActiveIndex((current) => Math.max(current - 1, 0));
                    }
                    if (
                      event.key === "Enter" &&
                      keyboardNavigating &&
                      response.results[activeIndex]
                    ) {
                      event.preventDefault();
                      router.push(
                        scenarioHref(
                          response.results[activeIndex].href,
                          initialResponse.scenario,
                        ),
                      );
                    }
                  }}
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      void runSearch("");
                    }}
                  >
                    Clear
                  </button>
                ) : null}
                <button type="submit">Search</button>
              </div>
            </form>

            <div className="search-results-heading">
              <div>
                <p className="section-kicker">
                  {response.localOnly ? "Offline · local results" : "Grouped results"}
                </p>
                <h2 id="search-results-title">
                  {query ? `Matches for “${query}”` : "Available demo context"}
                </h2>
              </div>
              <span>{response.results.length} results</span>
            </div>

            {response.viewState === "permission-denied" ? (
              <div className="search-restricted-state">
                <span aria-hidden="true">×</span>
                <div>
                  <b>Some results need permission</b>
                  <p>
                    NEXUS shows the boundary without revealing private content.
                  </p>
                </div>
              </div>
            ) : null}

            {response.results.length === 0 ? (
              <div className="search-empty">
                <span aria-hidden="true" />
                <h2>No permitted matches</h2>
                <p>Try a broader term or clear the active filters.</p>
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() => {
                    setTypes([]);
                    setSource("all");
                    setQuery("");
                    void runSearch("", [], "all");
                  }}
                >
                  Clear search
                </button>
              </div>
            ) : null}

            <div className="search-result-groups">
              {groups.map((group) => (
                <section key={group.type}>
                  <header>
                    <h3>{typeLabels[group.type]}</h3>
                    <span>{group.results.length}</span>
                  </header>
                  {group.results.map((result) => {
                    const flatIndex = response.results.findIndex(
                      (candidate) => candidate.id === result.id,
                    );
                    return (
                      <Link
                        className={
                          flatIndex === activeIndex
                            ? "search-result-row is-keyboard-active"
                            : "search-result-row"
                        }
                        href={scenarioHref(result.href, initialResponse.scenario)}
                        key={result.id}
                      >
                        <span className={`search-result-icon is-${result.type}`} aria-hidden="true" />
                        <span>
                          <b>{result.title}</b>
                          <small>{result.excerpt}</small>
                        </span>
                        <span>
                          {result.source}
                          <small>{result.permission === "restricted" ? "Restricted" : result.freshness}</small>
                        </span>
                      </Link>
                    );
                  })}
                </section>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
