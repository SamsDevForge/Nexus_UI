"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import type {
  AuthorityLevel,
  ControlViewState,
  NexusScenario,
} from "@/lib/domain/contracts";
import { scenarioHref } from "@/lib/mocks/phase2-fixtures";

export function ControlHeader({
  kicker,
  title,
  summary,
  action,
}: {
  kicker: string;
  title: string;
  summary: string;
  action?: ReactNode;
}) {
  return (
    <header className="control-heading">
      <div>
        <p className="page-kicker">
          <span aria-hidden="true" />
          {kicker}
        </p>
        <h1>{title}</h1>
        <p>{summary}</p>
      </div>
      {action ? <div className="control-heading-action">{action}</div> : null}
    </header>
  );
}

export function ControlNotice({
  notice,
  tone = "warning",
}: {
  notice?: string;
  tone?: "warning" | "danger" | "info";
}) {
  if (!notice) return null;
  return (
    <div className={`control-notice is-${tone}`} role="status">
      <span aria-hidden="true" />
      <p>{notice}</p>
    </div>
  );
}

export function ControlBlockingState({
  state,
  noun,
  scenario,
  connectionHref = "/app/connections",
}: {
  state: ControlViewState;
  noun: string;
  scenario: NexusScenario;
  connectionHref?: string;
}) {
  if (!["loading", "empty"].includes(state)) return null;
  if (state === "loading") {
    return (
      <section className="control-blocking control-skeleton" aria-busy="true">
        <span className="sr-only">Loading {noun}</span>
        <i />
        <i />
        <i />
      </section>
    );
  }
  return (
    <section className="control-blocking">
      <span className="control-empty-orbit" aria-hidden="true" />
      <p className="section-kicker">Nothing configured yet</p>
      <h2>Start with one permissioned source.</h2>
      <p>
        Review exactly what a source can provide before creating {noun}. No
        credentials or live provider access are requested in this prototype.
      </p>
      <Link className="primary-button" href={scenarioHref(connectionHref, scenario)}>
        Review connections
      </Link>
    </section>
  );
}

export function StatusPill({ value }: { value: string }) {
  return (
    <span className={`control-status is-${value}`}>
      <i aria-hidden="true" />
      {value.replaceAll("-", " ")}
    </span>
  );
}

export function AuthoritySelect({
  value,
  onChange,
  label = "Action authority",
  includeAct = false,
}: {
  value: AuthorityLevel;
  onChange: (value: AuthorityLevel) => void;
  label?: string;
  includeAct?: boolean;
}) {
  const options: AuthorityLevel[] = includeAct
    ? ["observe", "suggest", "prepare", "ask", "act"]
    : ["observe", "suggest", "prepare", "ask"];
  return (
    <label className="control-field">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as AuthorityLevel)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option[0].toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ControlToggle({
  checked,
  onChange,
  label,
  description,
  danger = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  danger?: boolean;
}) {
  return (
    <label className={danger ? "control-toggle is-danger" : "control-toggle"}>
      <span>
        <b>{label}</b>
        {description ? <small>{description}</small> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}

export function ControlDialog({
  open,
  title,
  eyebrow,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  eyebrow: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    window.requestAnimationFrame(() => closeRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      restoreRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="control-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        className="control-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header>
          <div>
            <p className="section-kicker">{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            className="control-dialog-close"
            ref={closeRef}
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <span aria-hidden="true" />
          </button>
        </header>
        <div className="control-dialog-body">{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </div>
    </div>
  );
}

export function ImpactList({
  features,
  automations,
  reversible,
}: {
  features: string[];
  automations: string[];
  reversible: boolean;
}) {
  return (
    <div className="impact-list">
      <div>
        <span>Affected features</span>
        <p>{features.length ? features.join(" · ") : "None"}</p>
      </div>
      <div>
        <span>Affected automations</span>
        <p>{automations.length ? automations.join(" · ") : "None"}</p>
      </div>
      <div>
        <span>Reversible</span>
        <p>{reversible ? "Yes, this demo control can be restored." : "No."}</p>
      </div>
    </div>
  );
}
