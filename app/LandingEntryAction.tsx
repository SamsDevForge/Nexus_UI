"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function EntryLink({ className }: { className: string }) {
  return (
    <Link
      className={className}
      href="/app/today"
      aria-label="Enter NEXUS and open your Today dashboard"
    >
      <span className="landing-entry-label">
        <small>Your day is ready</small>
        <strong>Enter NEXUS</strong>
      </span>
      <span className="landing-entry-glyph" aria-hidden="true">
        {"\u2197"}
      </span>
    </Link>
  );
}

export function LandingEntryAction() {
  const [hosts, setHosts] = useState<{
    actions: HTMLElement;
    shell: HTMLElement;
  } | null>(null);

  useEffect(() => {
    const findHosts = () => {
      const actions = document.querySelector<HTMLElement>(".hero-actions");
      const shell = document.querySelector<HTMLElement>(".nexus-shell");
      if (!actions || !shell) return false;

      setHosts({ actions, shell });
      return true;
    };

    if (findHosts()) return;

    const observer = new MutationObserver(() => {
      if (!findHosts()) return;
      observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!hosts) return null;

  return (
    <>
      {createPortal(
        <EntryLink className="landing-entry-action" />,
        hosts.actions,
      )}
      {createPortal(
        <EntryLink className="landing-entry-action landing-entry-action-mobile" />,
        hosts.shell,
      )}
    </>
  );
}
