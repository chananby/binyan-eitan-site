/**
 * Profile data model.
 *
 * A Profile is one learner (e.g. "נועה").
 * Each profile has a SyncKey ("נועה123") used as the cloud identifier.
 *
 * localStorage layout
 * ───────────────────
 *   "bm_profiles"  →  JSON { activeProfileId, profiles[] }
 *   (old key "barilan_math_stats" is migrated once on first load)
 */

import type { StoredStats, Difficulty } from "./types";
import { EMPTY_STATS } from "./types";

export type { StoredStats };

// ── Avatar pool ───────────────────────────────────────────────────────────────

const AVATARS = ["🦁", "🐯", "🐬", "🦊", "🐸", "🦉", "🐧", "🦄", "🐨", "🐙"];

function pickAvatar(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return AVATARS[h % AVATARS.length];
}

// ── ID + SyncKey helpers ──────────────────────────────────────────────────────

function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function genSyncKey(name: string): string {
  const digits = String(Math.floor(Math.random() * 900000) + 100000); // 100000–999999
  return name.trim() + digits;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  syncKey: string;   // "נועה123456" — doubles as cloud row key
  avatar: string;    // emoji
  createdAt: string; // ISO
  stats: StoredStats;
  pin?: string;      // 4-digit PIN (plain text — no sensitive data here)
}

export interface ProfileStore {
  activeProfileId: string | null;
  profiles: Profile[];
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function makeProfile(
  name: string,
  stats: StoredStats = { ...EMPTY_STATS },
  syncKey?: string,
  pin?: string,
): Profile {
  const id = genId();
  return {
    id,
    name: name.trim(),
    syncKey: syncKey ?? genSyncKey(name),
    avatar: pickAvatar(id),
    createdAt: new Date().toISOString(),
    stats,
    ...(pin ? { pin } : {}),
  };
}

// ── localStorage helpers ──────────────────────────────────────────────────────

export const STORE_KEY  = "bm_profiles";
export const LEGACY_KEY = "barilan_math_stats";

export function loadProfileStore(storeKey = STORE_KEY): ProfileStore {
  if (typeof window === "undefined") return { activeProfileId: null, profiles: [] };

  // One-time migration from the old single-profile key (only for the default key)
  if (storeKey === STORE_KEY && !localStorage.getItem(STORE_KEY)) {
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      try {
        const oldStats = JSON.parse(legacyRaw) as StoredStats;
        const legacy = makeProfile("תלמיד", oldStats);
        const migrated: ProfileStore = { activeProfileId: null, profiles: [legacy] };
        localStorage.setItem(STORE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_KEY);
        return migrated;
      } catch { /* fall through to empty */ }
    }
  }

  try {
    const raw = localStorage.getItem(storeKey);
    if (raw) return JSON.parse(raw) as ProfileStore;
  } catch { /* fall through */ }

  return { activeProfileId: null, profiles: [] };
}

export function saveProfileStore(store: ProfileStore, storeKey = STORE_KEY): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(storeKey, JSON.stringify(store)); } catch { /* ignore */ }
}

// ── Stats merge (used by cloud sync) ─────────────────────────────────────────

export function mergeStats(local: StoredStats, remote: StoredStats): StoredStats {
  // Merge per-topic stats (take best values from each side)
  const allKeys = new Set([
    ...Object.keys(local.topicStats  ?? {}),
    ...Object.keys(remote.topicStats ?? {}),
  ]);
  const topicStats: Record<string, import("./types").TopicStats> = {};
  for (const key of allKeys) {
    const l = local.topicStats?.[key];
    const r = remote.topicStats?.[key];
    if (!l) { topicStats[key] = r!; continue; }
    if (!r) { topicStats[key] = l;  continue; }
    topicStats[key] = {
      highestLevel: Math.max(l.highestLevel, r.highestLevel) as Difficulty,
      totalCorrect: Math.max(l.totalCorrect, r.totalCorrect),
      totalWrong:   Math.max(l.totalWrong,   r.totalWrong),
      pointsTotal:  Math.max(l.pointsTotal,  r.pointsTotal),
      lastPlayed:   l.lastPlayed > r.lastPlayed ? l.lastPlayed : r.lastPlayed,
    };
  }

  return {
    totalCorrect:   Math.max(local.totalCorrect,   remote.totalCorrect),
    totalWrong:     Math.max(local.totalWrong,     remote.totalWrong),
    highestLevel:   Math.max(local.highestLevel,   remote.highestLevel) as Difficulty,
    sessionsPlayed: Math.max(local.sessionsPlayed, remote.sessionsPlayed),
    pointsTotal:    Math.max(local.pointsTotal,    remote.pointsTotal),
    lastPlayed:     local.lastPlayed > remote.lastPlayed ? local.lastPlayed : remote.lastPlayed,
    ...(allKeys.size > 0 ? { topicStats } : {}),
  };
}
