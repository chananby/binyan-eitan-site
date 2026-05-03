/* eslint-disable @typescript-eslint/no-require-imports */
import { discoverUIRoutes, discoverAPIRoutes } from "../../../lib/discover-routes";
import { externalLinks } from "../../../data/external-links";
import HubClient from "./HubClient";
import type { UIRoute, APIRoute } from "../../../lib/discover-routes";

type Manifest = { uiRoutes: UIRoute[]; apiRoutes: APIRoute[] };

export default function HubPage() {
  let uiRoutes: UIRoute[]   = [];
  let apiRoutes: APIRoute[] = [];

  // Primary: pre-generated manifest.
  // - In production (Vercel): webpack bundles this static require → works in serverless ✅
  // - In dev: predev script generates the file before next dev starts ✅
  try {
    const m: Manifest = require("../../../data/routes-manifest.json");
    uiRoutes  = m.uiRoutes  ?? [];
    apiRoutes = m.apiRoutes ?? [];
  } catch {
    // Manifest missing (e.g. bypassing npm scripts with `npx next dev`).
    // Fall back to live fs scanning — works in dev, may return empty in Vercel serverless.
    try {
      uiRoutes  = discoverUIRoutes();
      apiRoutes = discoverAPIRoutes();
    } catch { /* fs not available */ }
  }

  return (
    <HubClient
      uiRoutes={uiRoutes}
      apiRoutes={apiRoutes}
      externalLinks={externalLinks}
    />
  );
}
