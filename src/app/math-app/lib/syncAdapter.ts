/**
 * CloudSyncAdapter — swappable backend interface.
 *
 * To swap the DB: implement CloudSyncAdapter and change the `cloudAdapter` export.
 * Current implementation: Supabase REST (no SDK dependency).
 *
 * Supabase table schema (run once in the SQL editor):
 * ─────────────────────────────────────────────────
 *   create table math_profiles (
 *     sync_key   text primary key,
 *     name       text not null,
 *     stats      jsonb not null,
 *     updated_at timestamptz default now()
 *   );
 *   -- Enable Row-Level Security and allow anon reads/writes if desired:
 *   alter table math_profiles enable row level security;
 *   create policy "anon read"  on math_profiles for select using (true);
 *   create policy "anon write" on math_profiles for insert with check (true);
 *   create policy "anon upsert" on math_profiles for update using (true);
 */

import type { StoredStats } from "./types";
import { mergeStats } from "./profiles";

// ── Public interface ──────────────────────────────────────────────────────────

export interface CloudSyncAdapter {
  /** Returns null if the profile doesn't exist in the cloud. */
  pull(syncKey: string): Promise<{ name: string; stats: StoredStats } | null>;
  /** Upserts the profile. Returns true on success. */
  push(syncKey: string, name: string, stats: StoredStats): Promise<boolean>;
  /** True when the adapter has the env vars it needs to make real requests. */
  readonly isConfigured: boolean;
}

// ── Supabase REST adapter ─────────────────────────────────────────────────────

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const TABLE     = "math_profiles";

class SupabaseAdapter implements CloudSyncAdapter {
  get isConfigured(): boolean {
    return Boolean(SUPA_URL && SUPA_ANON);
  }

  async pull(syncKey: string): Promise<{ name: string; stats: StoredStats } | null> {
    if (!this.isConfigured) return null;
    try {
      const res = await fetch(
        `${SUPA_URL}/rest/v1/${TABLE}?sync_key=eq.${encodeURIComponent(syncKey)}&select=name,stats`,
        {
          headers: {
            apikey: SUPA_ANON,
            Authorization: `Bearer ${SUPA_ANON}`,
          },
          cache: "no-store",
        },
      );
      if (!res.ok) return null;
      const rows = (await res.json()) as Array<{ name: string; stats: StoredStats }>;
      if (!Array.isArray(rows) || rows.length === 0) return null;
      return { name: rows[0].name, stats: rows[0].stats };
    } catch {
      return null;
    }
  }

  async push(syncKey: string, name: string, stats: StoredStats): Promise<boolean> {
    if (!this.isConfigured) return false;
    try {
      const res = await fetch(`${SUPA_URL}/rest/v1/${TABLE}`, {
        method: "POST",
        headers: {
          apikey: SUPA_ANON,
          Authorization: `Bearer ${SUPA_ANON}`,
          "Content-Type": "application/json",
          // Upsert: if the sync_key already exists, update it
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          sync_key: syncKey,
          name,
          stats,
          updated_at: new Date().toISOString(),
        }),
      });
      return res.ok || res.status === 201;
    } catch {
      return false;
    }
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────
// Swap this line to change the backend (e.g. `new FirebaseAdapter()`).

export const cloudAdapter: CloudSyncAdapter = new SupabaseAdapter();

// ── Re-export merge helper so callers only need this one import ───────────────

export { mergeStats };
