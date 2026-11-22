"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type AmbientMotionState =
  | "steady"
  | "attention"
  | "success"
  | "degraded"
  | "paused";

export function AmbientMotion({
  className,
  state = "steady",
  children,
}: {
  className: string;
  state?: AmbientMotionState;
  children: ReactNode;
}) {
  const motionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = motionRef.current;
    if (!element) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isIntersecting = true;

    const syncMotion = () => {
      const shouldPause =
        state === "paused" ||
        reducedMotion.matches ||
        document.visibilityState !== "visible" ||
        !isIntersecting;
      element.dataset.motion = shouldPause ? "paused" : "active";
    };

    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            ([entry]) => {
              isIntersecting = entry?.isIntersecting ?? true;
              syncMotion();
            },
            { rootMargin: "80px", threshold: 0.01 },
          )
        : null;

    observer?.observe(element);
    document.addEventListener("visibilitychange", syncMotion);
    reducedMotion.addEventListener("change", syncMotion);
    syncMotion();

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", syncMotion);
      reducedMotion.removeEventListener("change", syncMotion);
    };
  }, [state]);

  return (
    <div
      className={className}
      data-motion="paused"
      data-motion-state={state}
      ref={motionRef}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}
