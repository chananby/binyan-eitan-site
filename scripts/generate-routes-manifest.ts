#!/usr/bin/env tsx
/**
 * Generates src/data/routes-manifest.json at build time.
 * Run via: npx tsx scripts/generate-routes-manifest.ts
 * Triggered automatically by "prebuild" and "predev" npm scripts.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

// Import discovery functions — uses Node fs, works fine in this build-time script
import { discoverUIRoutes, discoverAPIRoutes } from "../src/lib/discover-routes";

const manifest = {
  uiRoutes:  discoverUIRoutes(),
  apiRoutes: discoverAPIRoutes(),
};

const outPath = join(process.cwd(), "src", "data", "routes-manifest.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(
  `✓ routes-manifest.json — ${manifest.uiRoutes.length} UI routes, ${manifest.apiRoutes.length} API endpoints`
);
