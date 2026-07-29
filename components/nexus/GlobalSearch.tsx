"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  NexusScenario,
  SearchResponse,
} from "@/lib/domain/contracts";
import { searchService } from "@/lib/mocks/mock-phase2-services";
import { scenarioHref } from "@/lib/mocks/phase2-fixtures";
import { InterfaceAssetIcon } from "@/components/nexus/InterfaceAssetIcon";
import { NexusNotesMark } from "@/components/nexus/NexusNotesMark";
import { ProductIcon } from "@/components/nexus/ProductIcon";

export function GlobalSearch({
  scenario,
  open,
  onOpenChange,
}: {
  scenario: NexusScenario;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    void searchService.search(scenario, "").then(setResponse);
    window.requestAnimationFrame(() => inputRef.current?.focus());

    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", trap);
    return () => {
      window.removeEventListener("keydown", trap);
      restoreRef.current?.focus();
    };
  }, [open, onOpenChange, scenario]);

  const runSearch = async (nextQuery: string) => {
    const next = await searchService.search(scenario, nextQuery);
    setResponse(next);
    setActiveIndex(0);
  };

  if (!open) return null;

  return (
    <div
      className="command-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onOpenChange(false);
      }}
    >
      <div
        className="command-palette"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-title"
      >
        <header>
          <div>
            <span className="command-mark" aria-hidden="true">N</span>
            <span>
              <b id="command-title">Search NEXUS</b>
              <small>Context, knowledge, memory and controls</small>
            </span>
          </div>
          <button
            type="button"
            aria-label="Close search"
            onClick={() => onOpenChange(false)}
          >
            Esc
          </button>
        </header>
        <div className="command-input">
          <span className="command-scan-cue" key={query} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            placeholder="Search your permitted context…"
            aria-label="Search your permitted context"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={
              response?.results[activeIndex]
                ? `command-option-${response.results[activeIndex].id}`
                : undefined
            }
            onChange={(event) => {
              setQuery(event.target.value);
              void runSearch(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((current) =>
                  Math.min(
                    current + 1,
                    Math.max((response?.results.length ?? 1) - 1, 0),
                  ),
                );
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((current) => Math.max(current - 1, 0));
              }
              if (event.key === "Enter" && response?.results[activeIndex]) {
                event.preventDefault();
                router.push(
                  scenarioHref(response.results[activeIndex].href, scenario),
                );
                onOpenChange(false);
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
        </div>

        <div
          className="command-results"
          id="command-results"
          role="listbox"
          aria-label="Search results"
        >
          {response?.notice ? <p className="command-notice">{response.notice}</p> : null}
          {response?.results.map((result, index) => (
            <button
              className={activeIndex === index ? "is-active" : undefined}
              type="button"
              role="option"
              id={`command-option-${result.id}`}
              aria-selected={activeIndex === index}
              key={result.id}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => {
                router.push(scenarioHref(result.href, scenario));
                onOpenChange(false);
              }}
            >
              {result.type === "note" ? (
                <NexusNotesMark
                  className="command-result-type is-note"
                  size={24}
                />
              ) : result.type === "email-derived" ? (
                <InterfaceAssetIcon
                  kind="email"
                  className="command-result-type is-email-derived"
                  size={24}
                />
              ) : result.type === "knowledge" ? (
                <InterfaceAssetIcon
                  kind="file"
                  className="command-result-type is-knowledge"
                  size={24}
                />
              ) : result.type === "event" ? (
                <ProductIcon
                  name="date-search"
                  className="command-result-type is-event"
                  size={24}
                />
              ) : (
                <span
                  className={`command-result-type is-${result.type}`}
                  aria-hidden="true"
                />
              )}
              <span>
                <b>{result.title}</b>
                <small>{result.excerpt}</small>
              </span>
              <span>
                {result.source}
                <small>{result.freshness}</small>
              </span>
            </button>
          ))}
          {response && response.results.length === 0 ? (
            <div className="command-empty">
              <b>No permitted matches</b>
              <p>Try a broader term or open the full search view.</p>
            </div>
          ) : null}
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {response
            ? `${response.results.length} search result${response.results.length === 1 ? "" : "s"} available.`
            : "Searching permitted context."}
        </p>

        <footer>
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Open</span>
          <button
            type="button"
            onClick={() => {
              router.push(scenarioHref("/app/search", scenario));
              onOpenChange(false);
            }}
          >
            Open full search
          </button>
        </footer>
      </div>
    </div>
  );
}
