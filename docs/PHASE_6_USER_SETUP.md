# Phase 6 user setup

The complete provider-console checklist is maintained in
[`PHASE_06_USER_SETUP.md`](PHASE_06_USER_SETUP.md).

Phase 6 local implementation is complete. Cloud acceptance remains one external
setup block: configure Firebase Authentication, Neon PostgreSQL, Railway, and
the existing private Sites project with the environment-variable names listed
below, then run the real-account persistence and cross-user checks.

```text
NEXT_PUBLIC_NEXUS_RUNTIME_MODE=phase6-live
NEXT_PUBLIC_NEXUS_API_BASE_URL
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID

APP_ENV=production
DATABASE_URL
MIGRATION_DATABASE_URL
CORS_ALLOWED_ORIGINS
FIREBASE_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_JSON_B64
LOG_LEVEL
```

Do not paste the values into a prompt or commit them. The Railway service root
is `backend`; its pre-deploy command is `alembic upgrade head`, start command is
defined in `backend/railway.toml`, and readiness is `/health/ready`.
