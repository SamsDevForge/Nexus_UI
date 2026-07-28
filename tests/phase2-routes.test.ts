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

test("the shared visual language uses custom glyphs and readable confidence surfaces", async () => {
  const shell = await readFile(
    path.join(root, "components", "nexus", "ProductShell.tsx"),
    "utf8",
  );
  const shared = await readFile(
    path.join(root, "components", "nexus", "Phase2Shared.tsx"),
    "utf8",
  );
  const knowledge = await readFile(
    path.join(root, "components", "nexus", "KnowledgeExperience.tsx"),
    "utf8",
  );
  const notes = await readFile(
    path.join(root, "components", "nexus", "NotesExperience.tsx"),
    "utf8",
  );
  const today = await readFile(
    path.join(root, "components", "nexus", "TodayExperience.tsx"),
    "utf8",
  );
  const timeline = await readFile(
    path.join(root, "components", "nexus", "TimelineExperience.tsx"),
    "utf8",
  );
  const search = await readFile(
    path.join(root, "components", "nexus", "SearchExperience.tsx"),
    "utf8",
  );
  const assetIcon = await readFile(
    path.join(root, "components", "nexus", "InterfaceAssetIcon.tsx"),
    "utf8",
  );
  const productIcon = await readFile(
    path.join(root, "components", "nexus", "ProductIcon.tsx"),
    "utf8",
  );
  const css = await readFile(path.join(root, "app", "globals.css"), "utf8");

  assert.match(shell, /src="\/nexus-logo\.svg"/);
  assert.doesNotMatch(knowledge, /source\.name\.slice/);
  assert.match(shared, /notice-glyph/);
  assert.match(shared, /className="is-confidence"/);
  assert.match(css, /\.confidence-readout/);
  assert.match(css, /\.phase2-meta-line > \.is-confidence/);
  assert.match(knowledge, /\/provider-google-drive\.svg/);
  assert.match(knowledge, /\/provider-notion\.svg/);
  assert.match(knowledge, /\/nexus-notes-logo\.svg/);
  assert.match(knowledge, /\/icon-email\.svg/);
  assert.match(knowledge, /\/icon-file\.svg/);
  assert.match(knowledge, /<KnowledgeKindMark kind=\{selected\.kind\} \/>/);
  assert.match(notes, /title="Nexus Notes"/);
  assert.match(notes, /NexusNotesMark/);
  assert.match(css, /\.knowledge-kind-mark\.is-internal-note img/);
  assert.match(today, /kind="download"/);
  assert.match(today, /timelineStatusIcon\(item\.status\)/);
  assert.match(timeline, /timelineStatusIcon\(visibleStatus\)/);
  assert.match(search, /name="date-search"/);
  assert.match(notes, /name="save"/);
  assert.match(shell, /name="code-sandbox"/);
  assert.match(assetIcon, /upload: "\/icon-transfer\.svg"/);
  assert.match(assetIcon, /folder: "\/icon-folder\.svg"/);
  assert.match(productIcon, /"date-calendar": "\/icon-library\/date-calendar\.svg"/);
  assert.match(productIcon, /"code-sandbox": "\/icon-library\/code-sandbox\.svg"/);
  assert.match(productIcon, /android: "\/icon-library\/android\.svg"/);
  assert.match(css, /\.interface-asset-icon\.is-upload img \{[\s\S]*rotate\(180deg\)/);
  assert.match(css, /\.product-icon img/);
  assert.match(css, /\.search-result-icon\.is-control::after/);
  assert.match(css, /width: calc\(100% \+ 16px\)/);
  assert.match(css, /\.app-brand-mark img \{\s*object-fit: contain;\s*\}/);
  assert.match(css, /\.brand-symbol img \{[\s\S]*object-fit: contain/);
});
