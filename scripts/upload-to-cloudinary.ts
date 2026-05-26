/**
 * scripts/upload-to-cloudinary.ts — one-shot bulk upload of project images
 *
 * Uploads the five active project image families from /public to the
 * Cloudinary "binyan-eitan" folder, with the project + category tags that
 * /api/cloudinary-gallery expects so the live gallery picks them up
 * automatically (within ~60s thanks to the existing revalidate cache).
 *
 * ─── Safety posture ─────────────────────────────────────────────────────────
 *
 *   - Reads credentials ONLY from .env.local. The file is gitignored
 *     (see .gitignore: ".env*.local"). Credentials never enter the repo.
 *   - Two modes:
 *       --dry-run   prints the planned uploads and exits
 *       --apply     actually uploads (with a 200ms breather between calls)
 *     With no flag, the script prints usage and exits non-zero.
 *   - overwrite: true on every upload, so re-running the script is
 *     idempotent — same files produce same public_ids with same tags.
 *
 * ─── How to supply credentials (one-time setup, Codespaces) ────────────────
 *
 *   1. Get them: https://cloudinary.com/console → Dashboard → "API Keys" section.
 *      You'll find three values:
 *        Cloud Name   (visible in URL, public)
 *        API Key      (visible in dashboard)
 *        API Secret   ← click the eye icon to reveal
 *
 *   2. Open /workspaces/binyan-eitan-site/.env.local in the Codespaces editor
 *      (file is gitignored — it will never be committed). Add these lines:
 *
 *        NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=da5fksoyc
 *        CLOUDINARY_API_KEY=<paste-real-key>
 *        CLOUDINARY_API_SECRET=<paste-real-secret>
 *
 *   3. Save the file. Don't commit it. Don't paste these values into chat
 *      or any other file — .env.local is the only place they belong locally.
 *
 *   4. Run:  npx tsx scripts/upload-to-cloudinary.ts --dry-run
 *
 * ─── Mapping ────────────────────────────────────────────────────────────────
 *
 *  The PROJECT_MAPPINGS list below MUST match PROJECT_META in
 *  src/app/api/cloudinary-gallery/route.ts. If you add a sixth project,
 *  add it in BOTH places. Categories here mirror `defaultCategories` there.
 */

import { v2 as cloudinary } from "cloudinary";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// .env.local lives next to package.json — one level up from scripts/.
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ── Constants ───────────────────────────────────────────────────────────────

const PUBLIC_DIR = path.resolve(__dirname, "../public");
const TARGET_FOLDER = "binyan-eitan";
const SLEEP_BETWEEN_UPLOADS_MS = 200;

interface ProjectMapping {
  prefix: string;
  slug: string;
  categories: string[];
}

// MUST stay in sync with src/app/api/cloudinary-gallery/route.ts PROJECT_META.
// Order is irrelevant here — uploads happen in alphabetical order per project
// inside planUploads(), to keep the "cover" choice deterministic.
const PROJECT_MAPPINGS: ProjectMapping[] = [
  { prefix: "amshinov-",         slug: "amshinov",         categories: ["infrastructure"] },
  { prefix: "bayit-vegan-",      slug: "bayit-vegan",      categories: ["renovations"] },
  { prefix: "ohel-avshalom-",    slug: "ohel-avshalom",    categories: ["renovations", "infrastructure"] },
  { prefix: "ramat-eshkol-",     slug: "ramat-eshkol",     categories: ["finish"] },
  { prefix: "jerusalem-luxury-", slug: "jerusalem-luxury", categories: ["finish", "renovations"] },
];

interface PlannedUpload {
  file: string;       // basename in /public, e.g. "amshinov-1.jpg"
  publicId: string;   // basename without extension, e.g. "amshinov-1"
  tags: string[];     // ["project:amshinov", "category:infrastructure", ("cover")?]
  isCover: boolean;
  slug: string;
}

// ── Credential check ────────────────────────────────────────────────────────

function requireCredentials(): { cloudName: string; apiKey: string; apiSecret: string } {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // Cloud-name field sometimes contains a full "cloudinary://<key>:<secret>@<name>"
  // URI when copy-pasted from the dashboard snippet. Same defensive parse the
  // app's lib/cloudinary.ts and /api/cloudinary-gallery already use.
  function extractCloudName(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const uriMatch = value.match(/@([^/?#\s]+)/);
    if (uriMatch) return uriMatch[1];
    return value.trim() || undefined;
  }
  const cleanCloudName = extractCloudName(cloudName);

  const missing: string[] = [];
  if (!cleanCloudName) missing.push("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
  if (!apiKey)         missing.push("CLOUDINARY_API_KEY");
  if (!apiSecret)      missing.push("CLOUDINARY_API_SECRET");

  if (missing.length > 0) {
    console.error("");
    console.error("✗ Missing required env vars in .env.local:");
    for (const m of missing) console.error(`    - ${m}`);
    console.error("");
    console.error("  See the header comment of this file for one-time setup steps.");
    console.error("");
    process.exit(1);
  }

  return { cloudName: cleanCloudName!, apiKey: apiKey!, apiSecret: apiSecret! };
}

// ── Plan: group /public files by project, sort, tag ─────────────────────────

function planUploads(): PlannedUpload[] {
  if (!fs.existsSync(PUBLIC_DIR)) {
    console.error(`✗ /public not found at ${PUBLIC_DIR}`);
    process.exit(1);
  }
  const allFiles = fs.readdirSync(PUBLIC_DIR);

  const byProject: Record<string, string[]> = {};
  for (const file of allFiles) {
    if (!/\.(jpg|jpeg|png)$/i.test(file)) continue;
    const mapping = PROJECT_MAPPINGS.find((m) => file.toLowerCase().startsWith(m.prefix));
    if (!mapping) continue; // utility / engineering images are skipped by design
    (byProject[mapping.slug] ||= []).push(file);
  }

  const plan: PlannedUpload[] = [];
  for (const mapping of PROJECT_MAPPINGS) {
    const files = (byProject[mapping.slug] ?? []).sort((a, b) => a.localeCompare(b));
    files.forEach((file, idx) => {
      const tags = [
        `project:${mapping.slug}`,
        ...mapping.categories.map((c) => `category:${c}`),
      ];
      const isCover = idx === 0;
      if (isCover) tags.push("cover");
      plan.push({
        file,
        publicId: path.basename(file, path.extname(file)),
        tags,
        isCover,
        slug: mapping.slug,
      });
    });
  }
  return plan;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function parseMode(): "dry-run" | "apply" | null {
  const argv = process.argv.slice(2);
  if (argv.includes("--dry-run")) return "dry-run";
  if (argv.includes("--apply"))   return "apply";
  return null;
}

function printUsage() {
  console.log("");
  console.log("Usage:");
  console.log("  npx tsx scripts/upload-to-cloudinary.ts --dry-run");
  console.log("  npx tsx scripts/upload-to-cloudinary.ts --apply");
  console.log("");
  console.log("First run --dry-run to inspect the planned uploads.");
  console.log("Then --apply to actually upload to Cloudinary.");
  console.log("");
  console.log("Credentials are read from .env.local — see the header comment");
  console.log("of this file for one-time setup.");
  console.log("");
}

function printPlan(plan: PlannedUpload[]) {
  console.log("");
  console.log(`Planned uploads: ${plan.length} images → cloudinary folder "${TARGET_FOLDER}"`);
  console.log("");

  let currentSlug = "";
  for (const a of plan) {
    if (a.slug !== currentSlug) {
      currentSlug = a.slug;
      const total = plan.filter((p) => p.slug === currentSlug).length;
      console.log(`── project: ${currentSlug} (${total} images) ──`);
    }
    const coverMark = a.isCover ? "  ★ cover" : "";
    console.log(`  ${a.publicId.padEnd(38)} → [${a.tags.join(", ")}]${coverMark}`);
  }

  // Summary by project
  console.log("");
  console.log("Summary:");
  const bySlug = new Map<string, { count: number; cover: string }>();
  for (const a of plan) {
    const entry = bySlug.get(a.slug) ?? { count: 0, cover: "" };
    entry.count += 1;
    if (a.isCover) entry.cover = a.publicId;
    bySlug.set(a.slug, entry);
  }
  for (const mapping of PROJECT_MAPPINGS) {
    const e = bySlug.get(mapping.slug);
    if (!e) {
      console.log(`  ${mapping.slug.padEnd(18)} — NO FILES MATCHED prefix "${mapping.prefix}"`);
    } else {
      console.log(`  ${mapping.slug.padEnd(18)} ${e.count} images   cover=${e.cover}`);
    }
  }
  console.log("");
}

async function runApply(plan: PlannedUpload[]) {
  console.log("");
  console.log(`Uploading ${plan.length} images to Cloudinary folder "${TARGET_FOLDER}"...`);
  console.log("(overwrite=true — safe to re-run; same public_id is replaced in place)");
  console.log("");

  const succeeded: string[] = [];
  const failed: { publicId: string; error: string }[] = [];

  for (let i = 0; i < plan.length; i += 1) {
    const a = plan[i];
    const filePath = path.join(PUBLIC_DIR, a.file);
    const progress = `[${String(i + 1).padStart(2, " ")}/${plan.length}]`;

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        public_id: a.publicId,
        folder: TARGET_FOLDER,
        tags: a.tags,
        overwrite: true,
        resource_type: "image",
        // Cloudinary will infer image dimensions etc.; no transformation on upload —
        // delivery URLs apply f_auto,q_auto via lib/cloudinary.ts.
      });
      console.log(`${progress} ✓ ${a.publicId}  →  ${result.secure_url.slice(0, 90)}...`);
      succeeded.push(a.publicId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`${progress} ✗ ${a.publicId}  →  ${msg}`);
      failed.push({ publicId: a.publicId, error: msg });
    }

    // Rate-limit breather. Cloudinary free tier is generous but this keeps us
    // far below any soft caps even on large batches.
    if (i < plan.length - 1) {
      await new Promise((r) => setTimeout(r, SLEEP_BETWEEN_UPLOADS_MS));
    }
  }

  console.log("");
  console.log("─────────────────────────────────────────────────────────");
  console.log(`Done. ✓ ${succeeded.length} succeeded, ✗ ${failed.length} failed.`);
  if (failed.length > 0) {
    console.log("");
    console.log("Failures:");
    for (const f of failed) console.log(`  - ${f.publicId}: ${f.error}`);
    process.exit(1);
  }
  console.log("");
  console.log("Covers chosen:");
  for (const a of plan.filter((p) => p.isCover)) {
    console.log(`  ${a.slug.padEnd(18)} → ${a.publicId}`);
  }
  console.log("");
  console.log("Visit https://binyaneitan.com/api/cloudinary-gallery to verify (may take");
  console.log("up to 60s due to the route's revalidate cache).");
  console.log("");
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const mode = parseMode();
  if (!mode) {
    printUsage();
    process.exit(1);
  }

  // Validate credentials BEFORE doing anything else — fail loud and early.
  const { cloudName, apiKey, apiSecret } = requireCredentials();
  cloudinary.config({
    cloud_name: cloudName,
    api_key:    apiKey,
    api_secret: apiSecret,
    secure:     true,
  });

  const plan = planUploads();

  if (plan.length === 0) {
    console.error("");
    console.error("✗ No matching files found in /public.");
    console.error("  Expected prefixes: " + PROJECT_MAPPINGS.map((m) => m.prefix).join(", "));
    console.error("");
    process.exit(1);
  }

  printPlan(plan);

  if (mode === "dry-run") {
    console.log("DRY RUN — nothing was uploaded. Re-run with --apply to upload.");
    console.log("");
    return;
  }

  await runApply(plan);
}

main().catch((err) => {
  console.error("");
  console.error("✗ Unexpected error:", err instanceof Error ? err.message : err);
  console.error("");
  process.exit(1);
});
