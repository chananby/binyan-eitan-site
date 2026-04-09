"use client";

/**
 * useProfiles()
 * ─────────────
 * Central profile management hook.
 *
 * API
 * ───
 *   profiles          – all stored profiles
 *   activeProfile     – the currently selected Profile (or null)
 *   syncing           – true while a cloud pull is in-flight
 *   createProfile(name)           → Profile
 *   selectProfile(id)             → void
 *   clearActiveProfile()          → void
 *   joinByKey(syncKey)            → Promise<Profile | null>
 *   updateStats(stats)            → void  (localStorage + cloud push)
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  loadProfileStore,
  saveProfileStore,
  makeProfile,
  mergeStats,
  STORE_KEY,
  type Profile,
  type ProfileStore,
} from "../lib/profiles";
import { cloudAdapter } from "../lib/syncAdapter";
import type { StoredStats } from "../lib/types";

export function useProfiles(storageKey = STORE_KEY) {
  const [store, setStore] = useState<ProfileStore>({
    activeProfileId: null,
    profiles: [],
  });
  const [syncing, setSyncing] = useState(false);

  // Hydrate from localStorage once (client-only)
  useEffect(() => {
    setStore(loadProfileStore(storageKey));
  // storageKey is static per mount — intentional single run
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a stable ref to store so callbacks don't close over stale state
  const storeRef = useRef(store);
  useEffect(() => { storeRef.current = store; }, [store]);

  const persist = useCallback((next: ProfileStore) => {
    setStore(next);
    saveProfileStore(next, storageKey);
  }, [storageKey]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const activeProfile =
    store.profiles.find((p) => p.id === store.activeProfileId) ?? null;

  // ── Select / clear ────────────────────────────────────────────────────────

  const selectProfile = useCallback(
    (id: string) => {
      persist({ ...storeRef.current, activeProfileId: id });
    },
    [persist],
  );

  const clearActiveProfile = useCallback(() => {
    persist({ ...storeRef.current, activeProfileId: null });
  }, [persist]);

  // ── Create ────────────────────────────────────────────────────────────────

  const createProfile = useCallback(
    (name: string, pin?: string): Profile => {
      const profile = makeProfile(name, undefined, undefined, pin);
      const next: ProfileStore = {
        activeProfileId: profile.id,
        profiles: [...storeRef.current.profiles, profile],
      };
      persist(next);
      // Fire-and-forget cloud push
      cloudAdapter
        .push(profile.syncKey, profile.name, profile.stats)
        .catch(() => {});
      return profile;
    },
    [persist],
  );

  // ── Join by SyncKey (cross-device resume) ─────────────────────────────────

  const joinByKey = useCallback(
    async (syncKey: string): Promise<Profile | null> => {
      setSyncing(true);
      try {
        const current = storeRef.current;

        // Already exists locally — pull remote and merge
        const existing = current.profiles.find((p) => p.syncKey === syncKey);
        if (existing) {
          const remote = await cloudAdapter.pull(syncKey);
          if (remote) {
            const mergedStats = mergeStats(existing.stats, remote.stats);
            const updated: Profile = { ...existing, stats: mergedStats };
            persist({
              activeProfileId: existing.id,
              profiles: current.profiles.map((p) =>
                p.id === existing.id ? updated : p,
              ),
            });
            return updated;
          }
          persist({ ...current, activeProfileId: existing.id });
          return existing;
        }

        // Try to pull from cloud
        const remote = await cloudAdapter.pull(syncKey);
        if (remote) {
          const profile = makeProfile(remote.name, remote.stats, syncKey);
          persist({
            activeProfileId: profile.id,
            profiles: [...current.profiles, profile],
          });
          return profile;
        }

        return null; // Sync key not found anywhere
      } finally {
        setSyncing(false);
      }
    },
    [persist],
  );

  // ── Update stats for active profile ──────────────────────────────────────

  const updateStats = useCallback(
    (stats: StoredStats) => {
      const current = storeRef.current;
      if (!current.activeProfileId) return;
      const updated = current.profiles.map((p) =>
        p.id === current.activeProfileId ? { ...p, stats } : p,
      );
      persist({ ...current, profiles: updated });
      // Fire-and-forget cloud push
      const active = updated.find((p) => p.id === current.activeProfileId);
      if (active) {
        cloudAdapter.push(active.syncKey, active.name, stats).catch(() => {});
      }
    },
    [persist],
  );

  return {
    profiles: store.profiles,
    activeProfile,
    syncing,
    createProfile,
    selectProfile,
    clearActiveProfile,
    joinByKey,
    updateStats,
  };
}
