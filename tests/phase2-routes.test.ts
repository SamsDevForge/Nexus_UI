import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const routes = [
  ["timeline", "TimelineExperience", "timelineService.getTimeline"],
  ["insights", "InsightsExperience", "insightsService.getInsights"],
  ["nexus", "NexusWorkspace", "nexusService.getWorkspace"],
  ["knowledge", "KnowledgeExperience", "knowledgeService.getKnowledge"],
  ["notes", "NotesExperience", "notesService.getNotes"],
  ["search", "SearchExperience", "searchService.search"],
] as const;

test("every Phase 2 route renders a real experience through a service boundary", async () => {
  for (const [route, component, serviceCall] of routes) {
    const source = await readFile(
      path.join(root, "app", "app", route, "page.tsx"),
      "utf8",
    );
    assert.match(source, new RegExp(component));
    assert.match(source, new RegExp(serviceCall.replace(".", "\\.")));
    assert.doesNotMatch(source, /PhasePlaceholder/);
  }
});

test("the shell exposes global keyboard search without changing the cube module", async () => {
  const shell = await readFile(
    path.join(root, "components", "nexus", "ProductShell.tsx"),
    "utf8",
  );
  const globalSearch = await readFile(
    path.join(root, "components", "nexus", "GlobalSearch.tsx"),
    "utf8",
  );
  const backdrop = await readFile(
    path.join(root, "components", "nexus", "ProductLandingCubeBackdrop.tsx"),
    "utf8",
  );

  assert.match(shell, /GlobalSearch/);
  assert.match(globalSearch, /ctrlKey \|\| event\.metaKey/);
  assert.match(globalSearch, /aria-modal="true"/);
  assert.match(globalSearch, /restoreRef\.current\?\.focus/);
  assert.match(backdrop, /product-landing-cube-canvas/);
});

test("reduced-motion and narrow layout rules cover the Phase 2 surfaces", async () => {
  const css = await readFile(path.join(root, "app", "globals.css"), "utf8");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.phase2-page/);
  assert.match(css, /\.timeline-workspace/);
  assert.match(css, /\.nexus-workspace/);
  assert.match(css, /\.knowledge-workspace/);
  assert.match(css, /\.command-palette/);
  assert.match(css, /@media \(max-width: 780px\)/);
});
