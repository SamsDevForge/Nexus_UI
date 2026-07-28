# NEXUS AI — Phase 6 User Setup

This checklist covers only Phase 6:

- Firebase Authentication
- Neon PostgreSQL
- Railway FastAPI deployment
- Existing private Sites frontend

Do not create Gmail, Calendar, Maps, Weather, Notion, Teams, LLM, n8n, or
notification credentials yet.

Never paste secret values into ChatGPT or a Codex prompt. Add them directly to
the relevant provider dashboard when the Phase 6 implementation asks for them.

## 1. Before starting Codex

### Repository

Confirm Phase 5 is accepted at:

```text
3b4acdd15c6a39d8a143fab4f4611c27ec533140
```

If a later documentation-only commit corrected the Phase 5 test count, use
that descendant as the Phase 6 base.

Place the Phase 6 prompt at:

```text
C:\Users\tonma\OneDrive\Documents\NEXUS UI\prompts\PHASE_06_CODEX_PROMPT.md
```

Attach your Microsoft Teams SVG to the new Phase 6 Codex message. Codex is
instructed to sanitize and save it as:

```text
public/icons/microsoft-teams.svg
```

### Accounts needed

Create or confirm access to:

- Firebase / Google Cloud
- Neon
- Railway
- The existing GitHub repository used by Railway
- The existing private Sites project

Phase 6 does not need OpenRouter, Gemini, Groq, Gmail API, Calendar API, Google
Maps, a weather API, Notion, Microsoft Azure/Teams, or n8n credentials.

## 2. Firebase Authentication

Official guide:

https://firebase.google.com/docs/auth/web/start

### Create the project

1. Open Firebase Console.
2. Create a project for NEXUS AI, preferably a development project first.
3. Do not enable unrelated analytics or paid services unless you need them.
4. Add a **Web app** to the project.
5. Save the public web configuration shown by Firebase.

The frontend will eventually need these public values:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

These identify the Firebase web application. They are not substitutes for
backend authorization and must still be restricted through Firebase settings.

### Enable sign-in

1. Open **Authentication**.
2. Open **Sign-in method**.
3. Enable **Google** as the initial provider.
4. Select the correct support email.
5. Add authorized domains:
   - `localhost`
   - The current private Sites hostname
   - Any later custom NEXUS domain

Do not enable Gmail or Calendar OAuth scopes here. Firebase Google sign-in
authenticates the user to NEXUS; it does not authorize access to Google data.

### Prepare backend verification

Official token-verification guide:

https://firebase.google.com/docs/auth/admin/verify-id-tokens

1. Open Firebase project settings.
2. Open **Service accounts**.
3. Generate a service-account key only when the backend implementation is
   ready.
4. Save the downloaded JSON securely outside the repository and OneDrive
   project folder.
5. Never attach it to a chat, commit it, or place it under the project.

The planned backend secret names are:

```text
FIREBASE_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_JSON_B64
```

When Codex provides the exact final command, encode the service-account JSON
locally and paste the encoded value directly into Railway's secret-variable
field. Do not paste it into Codex.

On Windows PowerShell, a local encoding command can use this form:

```powershell
[Convert]::ToBase64String(
  [IO.File]::ReadAllBytes("C:\private-path\firebase-service-account.json")
)
```

Do not share or screenshot the output.

## 3. Neon PostgreSQL

Official connection guide:

https://neon.com/docs/connect/choose-connection

### Create the database

1. Create a Neon project for NEXUS AI development.
2. Choose an available region reasonably near the Railway service.
3. Keep the default PostgreSQL database or create a clearly named development
   database.
4. Create a dedicated application role if the dashboard workflow supports it.
5. Do not use the database owner's credentials in frontend code.

Collect two server-side connection strings:

- Pooled connection for the running FastAPI service
- Direct connection for Alembic migrations when required

The planned Railway secret names are:

```text
DATABASE_URL
MIGRATION_DATABASE_URL
```

Both are backend secrets. Never use `NEXT_PUBLIC_` for them.

Do not manually create Phase 6 tables in the Neon SQL editor. Alembic migrations
in the repository must remain the source of truth.

Neon supports pgvector for later NEXUS Knowledge/RAG work, but Phase 6 does not
need vector tables:

https://neon.com/docs/extensions/pgvector

## 4. Railway FastAPI

Official FastAPI deployment guide:

https://docs.railway.com/guides/fastapi

### Create the service

Wait until Codex has created the backend structure and deployment files.

Then:

1. Create a Railway project.
2. Connect the existing NEXUS GitHub repository.
3. Create one FastAPI service from the Phase 6 branch/commit.
4. Set the Railway service root directory to `backend`; Railway will use
   `backend/railway.toml`.
5. Do not create a Render deployment.
6. Set the health-check path to the path reported by Codex, expected to be:

   ```text
   /health/ready
   ```

7. Configure the migration command reported by Codex as Railway's pre-deploy
   command, expected to be equivalent to:

   ```text
   alembic upgrade head
   ```

8. Generate a Railway domain only after the backend deploys successfully.

### Railway variables

Add values directly in Railway:

```text
APP_ENV=production
DATABASE_URL
MIGRATION_DATABASE_URL
CORS_ALLOWED_ORIGINS
FIREBASE_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_JSON_B64
LOG_LEVEL
```

`CORS_ALLOWED_ORIGINS` must contain exact authorized frontend origins, not `*`.

Never add:

- Firebase service-account JSON to Git
- Database URLs to frontend environment variables
- Auth tokens to logs
- A permissive production CORS wildcard

## 5. Existing Sites frontend

After Railway provides the deployed API URL, the existing Sites project will
need public frontend configuration such as:

```text
NEXT_PUBLIC_NEXUS_API_BASE_URL
NEXT_PUBLIC_NEXUS_RUNTIME_MODE
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

These are the exact frontend variable names implemented by Phase 6.

Keep the current Sites deployment:

- Private
- Owner-only
- Reusing the project ID in `.openai/hosting.json`

Do not create a second NEXUS Sites project.

After setting the Railway domain:

1. Add the Sites origin to Railway's CORS allowlist.
2. Add the Sites hostname to Firebase authorized domains.
3. Deploy the exact accepted Phase 6 frontend commit.
4. Test sign-in from the deployed site.

## 6. Verification you should perform

Use a real test Google account that does not contain important production data.

Verify:

1. Sign in.
2. Complete onboarding.
3. Save timezone, travel mode, quiet hours, and at least one place.
4. Reload the browser.
5. Confirm the saved values remain.
6. Sign out and sign back in.
7. Confirm the same values remain.
8. Save a Quick Capture note.
9. Reload and confirm the note remains.
10. Create and confirm a Quick Capture event draft.
11. Confirm it says it was saved in NEXUS, not Google Calendar.
12. Confirm it remains after reload.
13. Sign in as a second test user.
14. Confirm the second user cannot see the first user's profile, places,
    captures, or Activity records.

Do not use real private WhatsApp text during initial testing. Use synthetic
examples until access isolation and deletion have passed.

## 7. Teams SVG

Attach the SVG in the same message that starts Phase 6.

Add this sentence after the launcher:

```text
The attached SVG is the product-owner-supplied Microsoft Teams icon. Sanitize
it, preserve its appearance and aspect ratio, and save it at
public/icons/microsoft-teams.svg. Do not redraw it or replace it with an emoji.
It is an asset-registration task only; do not implement Microsoft Graph in
Phase 6.
```

If Codex cannot access the attachment, continue Phase 6 and add the SVG later.
The missing icon must not block backend work.

## 8. Not needed yet

Do not spend time configuring these during Phase 6:

- Gmail API
- Google Calendar API
- Google Maps Platform
- Weather provider
- Microsoft Azure/Graph application
- Notion integration
- Google Drive
- OpenRouter or another LLM provider
- n8n
- Firebase Cloud Messaging
- Android project

Those are introduced in their corresponding later phases.

## 9. Local implementation status

The local implementation uses Alembic revision
`20260728_0001_phase6_foundation`. The frontend default remains
`NEXT_PUBLIC_NEXUS_RUNTIME_MODE=mock`; set `phase6-live` only after both
Firebase and the deployed API are configured.

The product-owner-supplied Teams asset is registered at
`public/icons/microsoft-teams.svg`. It does not authorize or call Microsoft
Graph.

## 10. Phase 6 completion evidence

Do not consider Phase 6 complete until the handoff contains:

- Commit and branch
- Alembic migration revision
- Backend and frontend test counts
- Railway health result
- Private Sites version
- Successful real sign-in
- Successful onboarding reload persistence
- Successful Quick Capture reload persistence
- Cross-user isolation result
- Cube integrity result
- `exfonts/` integrity result
- Clear list of anything still mocked
- Exact Phase 7 starting point
