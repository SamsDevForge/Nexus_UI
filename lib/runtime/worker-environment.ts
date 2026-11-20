const NEXUS_PUBLIC_RUNTIME_KEYS = [
  "NEXT_PUBLIC_NEXUS_RUNTIME_MODE",
  "NEXT_PUBLIC_NEXUS_API_BASE_URL",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export type NexusWorkerRuntimeEnvironment = Partial<
  Record<(typeof NEXUS_PUBLIC_RUNTIME_KEYS)[number], string>
> & { NEXUS_CONTEXT_API_URL?: string };

// This binding stays server-side; it is never serialized into the public Firebase config.
export function installNexusContextRuntimeEnvironment(
  bindings: NexusWorkerRuntimeEnvironment,
  target: Record<string, string | undefined> = process.env,
) {
  if (typeof bindings.NEXUS_CONTEXT_API_URL === "string") {
    target.NEXUS_CONTEXT_API_URL = bindings.NEXUS_CONTEXT_API_URL;
  }
}

export function installNexusPublicRuntimeEnvironment(
  bindings: NexusWorkerRuntimeEnvironment,
  target: Record<string, string | undefined> = process.env,
) {
  for (const key of NEXUS_PUBLIC_RUNTIME_KEYS) {
    const value = bindings[key];
    if (typeof value === "string") target[key] = value;
  }
}
