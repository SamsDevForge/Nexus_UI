import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { NexusApiClient, NexusApiError } from "../lib/api/client";
import { NEXUS_PROXY_AUTHORIZATION_HEADER } from "../lib/api/proxy-transport";
import { forwardNexusApiRequest } from "../lib/api/server-proxy";
import {
  getNexusPublicRuntimeConfig,
  getNexusRuntimeMode,
} from "../lib/runtime/config";

test("Phase 6 runtime selection is deliberate and mock-safe", () => {
  assert.equal(getNexusRuntimeMode(undefined), "mock");
  assert.equal(getNexusRuntimeMode("mock"), "mock");
  assert.equal(getNexusRuntimeMode("phase6-live"), "phase6-live");
  assert.equal(getNexusRuntimeMode("live"), "mock");
});

test("Phase 6 public configuration can be supplied at worker runtime", () => {
  const config = getNexusPublicRuntimeConfig({
    NEXT_PUBLIC_NEXUS_RUNTIME_MODE: "phase6-live",
    NEXT_PUBLIC_NEXUS_API_BASE_URL: "https://api.nexus.test/",
    NEXT_PUBLIC_FIREBASE_API_KEY: "public-key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "nexus.firebaseapp.test",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "nexus-project",
    NEXT_PUBLIC_FIREBASE_APP_ID: "nexus-app",
  });

  assert.deepEqual(config, {
    mode: "phase6-live",
    apiBaseUrl: "https://api.nexus.test",
    apiRequestBaseUrl: "/api/nexus",
    firebase: {
      apiKey: "public-key",
      authDomain: "nexus.firebaseapp.test",
      projectId: "nexus-project",
      appId: "nexus-app",
    },
  });
});

test("the typed API client injects identity without exposing it in URLs", async () => {
  const requests: Request[] = [];
  const client = new NexusApiClient({
    baseUrl: "https://api.nexus.test",
    getToken: async () => "private-id-token",
    fetchImplementation: async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return Response.json({
        data: { id: "nexus-user" },
        requestId: "request-1",
      });
    },
  });

  const response = await client.request<{ id: string }>("/api/v1/me");
  assert.equal(response.data.id, "nexus-user");
  assert.equal(requests[0].headers.get("authorization"), "Bearer private-id-token");
  assert.equal(requests[0].url.includes("private-id-token"), false);
});

test("authentication refresh is bounded to one retry", async () => {
  const refreshCalls: boolean[] = [];
  let requestCount = 0;
  const client = new NexusApiClient({
    baseUrl: "https://api.nexus.test",
    getToken: async (forceRefresh) => {
      refreshCalls.push(forceRefresh);
      return forceRefresh ? "refreshed-token" : "expired-token";
    },
    fetchImplementation: async () => {
      requestCount += 1;
      return Response.json(
        {
          error: {
            code: "invalid_identity_token",
            message: "Expired.",
            requestId: `request-${requestCount}`,
          },
        },
        { status: 401 },
      );
    },
  });

  await assert.rejects(
    () => client.request("/api/v1/me"),
    (error: unknown) =>
      error instanceof NexusApiError &&
      error.status === 401 &&
      error.requestId === "request-2",
  );
  assert.equal(requestCount, 2);
  assert.deepEqual(refreshCalls, [false, true, false]);
});

test("the API client can avoid the hosting gate authorization header", async () => {
  const requests: Request[] = [];
  const client = new NexusApiClient({
    baseUrl: "https://nexus.test/api/nexus",
    authorizationHeaderName: NEXUS_PROXY_AUTHORIZATION_HEADER,
    getToken: async () => "private-id-token",
    fetchImplementation: async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return Response.json({
        data: { id: "nexus-user" },
        requestId: "request-proxy-auth",
      });
    },
  });

  await client.request<{ id: string }>("/api/v1/me");

  assert.equal(requests[0].headers.get("authorization"), null);
  assert.equal(
    requests[0].headers.get(NEXUS_PROXY_AUTHORIZATION_HEADER),
    "Bearer private-id-token",
  );
});

test("non-authentication failures are normalized without retry", async () => {
  let requestCount = 0;
  const client = new NexusApiClient({
    baseUrl: "https://api.nexus.test",
    getToken: async () => "valid-token",
    fetchImplementation: async () => {
      requestCount += 1;
      return Response.json(
        {
          error: {
            code: "database_not_ready",
            message: "Persistence is temporarily unavailable.",
            requestId: "request-db",
          },
        },
        { status: 503 },
      );
    },
  });

  await assert.rejects(
    () => client.request("/api/v1/profile"),
    (error: unknown) =>
      error instanceof NexusApiError &&
      error.code === "database_not_ready" &&
      error.message === "Persistence is temporarily unavailable.",
  );
  assert.equal(requestCount, 1);
});

test("the same-origin Phase 6 proxy forwards only approved request metadata", async () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_NEXUS_API_BASE_URL;
  process.env.NEXT_PUBLIC_NEXUS_API_BASE_URL = "https://api.nexus.test";
  const upstreamRequests: Request[] = [];

  try {
    const response = await forwardNexusApiRequest(
      new Request("https://nexus.test/api/nexus/api/v1/profile?view=full", {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer hosting-gate-token",
          "Content-Type": "application/json",
          Cookie: "must-not-forward=1",
          [NEXUS_PROXY_AUTHORIZATION_HEADER]: "Bearer test-token",
          "X-Idempotency-Key": "operation-1",
        },
        body: JSON.stringify({ displayName: "Phase Six Test" }),
      }),
      ["api", "v1", "profile"],
      async (input, init) => {
        upstreamRequests.push(new Request(input, init));
        return Response.json(
          { data: { updated: true }, requestId: "request-proxy" },
          { headers: { "X-Request-ID": "request-proxy" } },
        );
      },
    );

    assert.equal(response.status, 200);
    const upstreamRequest = upstreamRequests[0];
    assert.ok(upstreamRequest);
    assert.equal(
      upstreamRequest.url,
      "https://api.nexus.test/api/v1/profile?view=full",
    );
    assert.equal(
      upstreamRequest.headers.get("authorization"),
      "Bearer test-token",
    );
    assert.equal(
      upstreamRequest.headers.get(NEXUS_PROXY_AUTHORIZATION_HEADER),
      null,
    );
    assert.equal(upstreamRequest.headers.get("cookie"), null);
    assert.equal(
      upstreamRequest.headers.get("x-idempotency-key"),
      "operation-1",
    );
    assert.deepEqual(await upstreamRequest.json(), {
      displayName: "Phase Six Test",
    });
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-request-id"), "request-proxy");
  } finally {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_NEXUS_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_NEXUS_API_BASE_URL = originalBaseUrl;
    }
  }
});

test("the Phase 6 proxy blocks redirects and normalizes upstream outages", async () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_NEXUS_API_BASE_URL;
  process.env.NEXT_PUBLIC_NEXUS_API_BASE_URL = "https://api.nexus.test";

  try {
    const request = new Request(
      "https://nexus.test/api/nexus/api/v1/me",
      {
        headers: {
          [NEXUS_PROXY_AUTHORIZATION_HEADER]: "Bearer test-token",
        },
      },
    );
    const redirected = await forwardNexusApiRequest(
      request,
      ["api", "v1", "me"],
      async () =>
        new Response(null, {
          status: 307,
          headers: { Location: "https://unexpected.example" },
        }),
    );
    assert.equal(redirected.status, 502);
    assert.equal(
      (await redirected.json()).error.code,
      "upstream_redirect_blocked",
    );

    const unavailable = await forwardNexusApiRequest(
      request,
      ["api", "v1", "me"],
      async () => {
        throw new TypeError("network details stay internal");
      },
    );
    assert.equal(unavailable.status, 502);
    const body = await unavailable.json();
    assert.equal(body.error.code, "upstream_unavailable");
    assert.doesNotMatch(body.error.message, /network details stay internal/);
  } finally {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_NEXUS_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_NEXUS_API_BASE_URL = originalBaseUrl;
    }
  }
});

test("live composition only replaces Phase 6 service boundaries", async () => {
  const live = await readFile(
    "lib/services/phase6-live-services.ts",
    "utf8",
  );
  const settings = await readFile(
    "components/nexus/SettingsExperience.tsx",
    "utf8",
  );
  const capture = await readFile("components/nexus/QuickCapture.tsx", "utf8");
  const notes = await readFile("components/nexus/NotesExperience.tsx", "utf8");
  const timeline = await readFile(
    "components/nexus/TimelineExperience.tsx",
    "utf8",
  );

  assert.match(live, /createPhase6SettingsService/);
  assert.match(live, /createPhase6QuickCaptureService/);
  assert.match(live, /createPhase6ActivityService/);
  assert.match(settings, /auth\.mode === "phase6-live"/);
  assert.match(capture, /createPhase6QuickCaptureService/);
  assert.match(notes, /durableCaptureToNote/);
  assert.match(timeline, /durableCaptureToTimeline/);
  assert.doesNotMatch(live, /TodayService|InsightsService|KnowledgeService/);
});

test("protected routes fail closed without a live Firebase user", async () => {
  const gate = await readFile("components/nexus/AuthGate.tsx", "utf8");
  const firebase = await readFile("lib/auth/firebase-client.ts", "utf8");
  const provider = await readFile("lib/auth/AuthProvider.tsx", "utf8");

  assert.match(gate, /!auth\.firebaseUser/);
  assert.match(gate, /\/sign-in\?returnTo=/);
  assert.match(gate, /!auth\.nexusUser\.onboardingCompleted/);
  assert.match(firebase, /onAuthStateChanged/);
  assert.match(firebase, /GoogleAuthProvider/);
  assert.doesNotMatch(firebase, /gmail|calendar/i);
  assert.doesNotMatch(provider, /query.*fake|header.*fake|cookie.*fake/i);
});

test("onboarding explains value and requests no connector permission", async () => {
  const onboarding = await readFile(
    "components/nexus/OnboardingExperience.tsx",
    "utf8",
  );

  assert.match(onboarding, /Start with usefulness, not permissions/);
  assert.match(onboarding, /displayName/);
  assert.match(onboarding, /timezone/);
  assert.match(onboarding, /quietHours/);
  assert.match(onboarding, /preferredTravelMode/);
  assert.match(onboarding, /No external productivity connection is authorized/);
  assert.doesNotMatch(onboarding, /requestCalendar|requestGmail|requestTeams/);
});

test("durable event results never claim an external calendar write", async () => {
  const live = await readFile(
    "lib/services/phase6-live-services.ts",
    "utf8",
  );

  assert.match(live, /Saved in NEXUS as a local event draft/);
  assert.match(live, /No external calendar was changed/);
  assert.doesNotMatch(live, /Added to Google Calendar/);
});

test("the product-owner Teams SVG is passive and keeps its square aspect", async () => {
  const svg = await readFile("public/icons/microsoft-teams.svg", "utf8");

  assert.match(svg, /viewBox="0 0 32 32"/);
  assert.match(svg, /width="800px" height="800px"/);
  assert.doesNotMatch(svg, /<script|<foreignObject|<iframe/i);
  assert.doesNotMatch(svg, /\son[a-z]+\s*=|javascript:/i);
  assert.doesNotMatch(svg, /<image|href=/i);
});
