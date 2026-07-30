export type NexusRuntimeMode = "mock" | "phase6-live";

export function getNexusRuntimeMode(
  value = process.env.NEXT_PUBLIC_NEXUS_RUNTIME_MODE,
): NexusRuntimeMode {
  return value === "phase6-live" ? "phase6-live" : "mock";
}

export const nexusRuntimeMode = getNexusRuntimeMode();

export const nexusApiBaseUrl =
  process.env.NEXT_PUBLIC_NEXUS_API_BASE_URL?.replace(/\/+$/, "") ?? "";

export const nexusApiRequestBaseUrl =
  nexusRuntimeMode === "phase6-live" ? "/api/nexus" : nexusApiBaseUrl;

export const firebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

export function hasPhase6PublicConfiguration() {
  return Boolean(
    nexusApiBaseUrl &&
      firebaseWebConfig.apiKey &&
      firebaseWebConfig.authDomain &&
      firebaseWebConfig.projectId &&
      firebaseWebConfig.appId,
  );
}
