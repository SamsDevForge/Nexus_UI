# NEXUS AI

A cinematic NEXUS AI landing experience and a Phase 1 product foundation built
with Next.js, React, React Three Fiber, Drei, Three.js, TypeScript, and CSS
design tokens.

## Current routes

- `/` — preserved cinematic landing page
- `/app/today` — complete mocked Today reference experience
- `/app/*` — intentional phase placeholders for future product screens

The Today route accepts deterministic scenarios through the `scenario` query
parameter. The on-screen prototype-state control is the easiest way to inspect
them.

## Local development

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run build:sites
npm run start
```

Phase 1 uses mock adapters only and requires no environment variables.

## Deploy to Vercel

Import this GitHub repository in Vercel. The framework is detected as Next.js
and no environment variables or backend services are required.

The default Vercel settings are sufficient:

- Build command: `npm run build`
- Output: Next.js default
- Node.js: 20.x or 22.x
