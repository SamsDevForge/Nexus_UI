export type NexusRuntimeMode = "mock" | "phase6-live";

export interface NexusPublicRuntimeConfig {
  mode: NexusRuntimeMode;
  apiBaseUrl: string;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
  };
}

type PublicRuntimeEnvironment = Partial<
  Record<
    | "NEXT_PUBLIC_NEXUS_RUNTIME_MODE"
    | "NEXT_PUBLIC_NEXUS_API_BASE_URL"
    | "NEXT_PUBLIC_FIREBASE_API_KEY"
    | "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
    | "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    | "NEXT_PUBLIC_FIREBASE_APP_ID",
    string
  >
>;

export function getNexusRuntimeMode(
  value?: string,
): NexusRuntimeMode {
  return value === "phase6-live" ? "phase6-live" : "mock";
}

export function getNexusPublicRuntimeConfig(
  environment?: PublicRuntimeEnvironment,
): NexusPublicRuntimeConfig {
  const source = environment ?? process.env;
  const mode = getNexusRuntimeMode(
    source["NEXT_PUBLIC_NEXUS_RUNTIME_MODE"],
  );
  const apiBaseUrl =
    source["NEXT_PUBLIC_NEXUS_API_BASE_URL"]?.replace(/\/+$/, "") ?? "";
  return {
    mode,
    apiBaseUrl,
    firebase: {
      apiKey: source["NEXT_PUBLIC_FIREBASE_API_KEY"] ?? "",
      authDomain: source["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"] ?? "",
      projectId: source["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] ?? "",
      appId: source["NEXT_PUBLIC_FIREBASE_APP_ID"] ?? "",
    },
  };
}

export function hasPhase6PublicConfiguration(
  config: NexusPublicRuntimeConfig,
) {
  return Boolean(
    config.apiBaseUrl &&
      config.firebase.apiKey &&
      config.firebase.authDomain &&
      config.firebase.projectId &&
      config.firebase.appId,
  );
}
