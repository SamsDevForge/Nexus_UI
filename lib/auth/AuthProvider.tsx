"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Auth, User } from "firebase/auth";
import { NexusApiClient } from "@/lib/api/client";
import type {
  NexusUser,
  OnboardingPayload,
  OnboardingResult,
} from "@/lib/api/contracts";
import {
  getNexusFirebaseAuth,
  observeFirebaseUser,
  signInWithGoogle,
  signOutFromFirebase,
} from "./firebase-client";
import {
  hasPhase6PublicConfiguration,
  type NexusPublicRuntimeConfig,
  type NexusRuntimeMode,
} from "@/lib/runtime/config";

interface AuthContextValue {
  mode: NexusRuntimeMode;
  loading: boolean;
  configured: boolean;
  firebaseUser: User | null;
  nexusUser: NexusUser | null;
  error: string;
  apiClient: NexusApiClient | null;
  signIn: (returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshCurrentUser: () => Promise<NexusUser | null>;
  completeOnboarding: (payload: OnboardingPayload) => Promise<OnboardingResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function safeReturnPath(value?: string) {
  return value?.startsWith("/app/") ? value : "/app/today";
}

export function AuthProvider({
  children,
  runtimeConfig,
}: {
  children: ReactNode;
  runtimeConfig: NexusPublicRuntimeConfig;
}) {
  const router = useRouter();
  const mode = runtimeConfig.mode;
  const configured =
    mode === "mock" || hasPhase6PublicConfiguration(runtimeConfig);
  const auth = useMemo<Auth | null>(() => {
    if (mode !== "phase6-live" || !configured) return null;
    try {
      return getNexusFirebaseAuth(runtimeConfig.firebase);
    } catch {
      return null;
    }
  }, [configured, mode, runtimeConfig.firebase]);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [nexusUser, setNexusUser] = useState<NexusUser | null>(null);
  const [loading, setLoading] = useState(
    mode === "phase6-live" && configured,
  );
  const [error, setError] = useState(
    mode === "phase6-live" && !configured
      ? "Phase 6 live mode needs its public Firebase and API configuration."
      : "",
  );

  const apiClient = useMemo(() => {
    if (!configured || mode !== "phase6-live") return null;
    return new NexusApiClient({
      baseUrl: runtimeConfig.apiRequestBaseUrl,
      authenticationTransport: "same-origin-envelope",
      getToken: async (forceRefresh) => {
        if (!auth?.currentUser) return null;
        return auth.currentUser.getIdToken(forceRefresh);
      },
    });
  }, [auth, configured, mode, runtimeConfig.apiRequestBaseUrl]);

  const refreshCurrentUser = useCallback(async () => {
    if (!apiClient || !firebaseUser) return null;
    const response = await apiClient.request<NexusUser>("/api/v1/me");
    setNexusUser(response.data);
    return response.data;
  }, [apiClient, firebaseUser]);

  useEffect(() => {
    if (!auth) {
      if (mode === "phase6-live" && configured) {
        const initializationTimeout = window.setTimeout(() => {
          setLoading(false);
          setError("NEXUS identity could not initialize. Sign in to try again.");
        }, 0);
        return () => window.clearTimeout(initializationTimeout);
      }
      return;
    }

    let resolved = false;
    const resolutionTimeout = window.setTimeout(() => {
      if (resolved) return;
      setLoading(false);
      setError("NEXUS could not restore your identity. Sign in to continue.");
    }, 8_000);
    const unsubscribe = observeFirebaseUser(auth, (user) => {
      resolved = true;
      window.clearTimeout(resolutionTimeout);
      setFirebaseUser(user);
      setNexusUser(null);
      setError("");
      setLoading(false);
    });
    return () => {
      resolved = true;
      window.clearTimeout(resolutionTimeout);
      unsubscribe();
    };
  }, [auth, configured, mode]);

  useEffect(() => {
    if (!firebaseUser || !apiClient) return;
    let active = true;
    void apiClient
      .request<NexusUser>("/api/v1/me")
      .then((response) => {
        if (active) setNexusUser(response.data);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "NEXUS could not load the signed-in account.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [apiClient, firebaseUser]);

  const signIn = useCallback(
    async (returnTo?: string) => {
      if (!auth) {
        setError("Phase 6 live mode is not configured.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const user = await signInWithGoogle(auth);
        setFirebaseUser(user);
        const tokenClient = new NexusApiClient({
          baseUrl: runtimeConfig.apiRequestBaseUrl,
          authenticationTransport: "same-origin-envelope",
          getToken: (forceRefresh) => user.getIdToken(forceRefresh),
        });
        const current = await tokenClient.request<NexusUser>("/api/v1/me");
        setNexusUser(current.data);
        router.replace(
          current.data.onboardingCompleted
            ? safeReturnPath(returnTo)
            : `/onboarding?returnTo=${encodeURIComponent(safeReturnPath(returnTo))}`,
        );
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Google sign-in did not complete.",
        );
      } finally {
        setLoading(false);
      }
    },
    [auth, router, runtimeConfig.apiRequestBaseUrl],
  );

  const signOut = useCallback(async () => {
    if (auth) await signOutFromFirebase(auth);
    setFirebaseUser(null);
    setNexusUser(null);
    router.replace("/sign-in");
  }, [auth, router]);

  const completeOnboarding = useCallback(
    async (payload: OnboardingPayload) => {
      if (!apiClient) {
        throw new Error("Phase 6 live persistence is not configured.");
      }
      const response = await apiClient.request<OnboardingResult>(
        "/api/v1/onboarding/complete",
        { method: "POST", body: JSON.stringify(payload) },
      );
      setNexusUser(response.data.user);
      return response.data;
    },
    [apiClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      mode,
      loading,
      configured,
      firebaseUser,
      nexusUser,
      error,
      apiClient,
      signIn,
      signOut,
      refreshCurrentUser,
      completeOnboarding,
    }),
    [
      apiClient,
      completeOnboarding,
      configured,
      error,
      firebaseUser,
      loading,
      mode,
      nexusUser,
      refreshCurrentUser,
      signIn,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useNexusAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useNexusAuth must be used inside AuthProvider.");
  }
  return context;
}
