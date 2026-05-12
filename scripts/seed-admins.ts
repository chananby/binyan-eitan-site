/**
 * One-time seed for initial admin accounts.
 *
 * Run manually after the admins table migration has been applied:
 *   npx tsx scripts/seed-admins.ts
 *
 * Requires env vars (read from .env.local automatically in dev):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Behaviour:
 *   - Inserts each admin if their email isn't already in the table.
 *   - Generates a fresh 12-char random password per admin.
 *   - Prints plaintext passwords to console once. Pass them on
 *     securely (e.g. WhatsApp); they're not stored anywhere.
 *   - Re-running the script will skip existing admins, not overwrite.
 */

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { config as loadDotenv } from "dotenv";

// Load .env.local (Next.js convention)
loadDotenv({ path: ".env.local" });

const ADMINS = [
  { email: "chanan@binyaneitan.com", name: "חנן" },
  { email: "motti@binyaneitan.com",  name: "מוטי" },
];

const PASSWORD_LEN = 12;
const SALT_ROUNDS  = 10;
// Excludes ambiguous chars (0/O, 1/l/I) so passwords are easy to read+type
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function randomPassword(): string {
  const buf = randomBytes(PASSWORD_LEN);
  let out = "";
  for (let i = 0; i < PASSWORD_LEN; i++) {
    out += CHARSET[buf[i] % CHARSET.length];
  }
  return out;
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const targetEmails = ADMINS.map((a) => a.email.toLowerCase());

  // Pre-check: refuse to run if ANY of the target emails already exist.
  // This prevents overwriting an existing admin's stored password_hash
  // and prevents partial seeds (one created, one skipped) that leave the
  // operator confused about which passwords are current.
  const { data: existingRows, error: precheckErr } = await supabase
    .from("admins")
    .select("email")
    .in("email", targetEmails);
  if (precheckErr) {
    console.error("Pre-check failed:", precheckErr.message);
    process.exit(1);
  }
  if (existingRows && existingRows.length > 0) {
    const existingList = existingRows.map((r) => r.email).join(", ");
    console.error(
      `\nAborting: the following admin email(s) already exist in the database:\n  ${existingList}\n\n` +
      `This script only seeds initial admins. It refuses to run when any target\n` +
      `email already exists, to avoid overwriting stored passwords or producing\n` +
      `a partial seed.\n\n` +
      `If you need to reset a password for an existing admin, use the change-\n` +
      `password UI (Phase 2) or the forgot-password flow (Phase 3) instead.`
    );
    process.exit(1);
  }

  const created: { email: string; password: string }[] = [];
  for (const { email, name } of ADMINS) {
    const normalized = email.toLowerCase();
    const password = randomPassword();
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { error: insertErr } = await supabase
      .from("admins")
      .insert({ email: normalized, name, password_hash });
    if (insertErr) {
      console.error(`  failed to insert ${email}:`, insertErr.message);
      process.exit(1);
    }
    created.push({ email: normalized, password });
    console.log(`  created ${email}`);
  }

  console.log("\n────────────────────────────────────────────────────────");
  console.log("  Initial passwords — copy these NOW, they won't print again");
  console.log("────────────────────────────────────────────────────────");
  for (const { email, password } of created) {
    console.log(`  ${email}   ${password}`);
  }
  console.log("────────────────────────────────────────────────────────");
  console.log("  Share over a secure channel. Hand off and forget.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
