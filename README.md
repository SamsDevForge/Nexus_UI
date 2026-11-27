# NEXUS AI

An interactive, single-screen landing experience for NEXUS AI. The central 3D cube, motion, and typography introduce a product concept that brings personal context and tools into one workspace.

**This branch contains the landing experience.** The workspace, architecture, and phase notes are in the [development branch](https://github.com/SamsDevForge/Nexus_UI/tree/codex/nexus-phase6-reconciliation).

## Run the landing page

Use Node.js 20.9 or newer.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page runs without environment variables or a backend.

## Build and check

```bash
npm run lint
npm run build
npm start
```

The landing page entry point is [`app/page.tsx`](app/page.tsx). The interactive scene is in [`app/NexusExperience.tsx`](app/NexusExperience.tsx), built with React Three Fiber, Drei, and Three.js. [`app/globals.css`](app/globals.css) contains the layout and visual styles.

## Hosting

Import this branch into Vercel with the Next.js framework preset. The landing page uses the repository’s default build command.
