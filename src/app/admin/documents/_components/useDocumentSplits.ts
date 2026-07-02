"use client";

/**
 * useDocumentSplits — shared save/clear plumbing for
 * document_project_splits, so every consumer surface (inbox preview
 * dialog, detail-view review form, and any future one) hits the same
 * endpoints with the same error handling.
 *
 * The hook OWNS the network + local UI state (saving flag, error
 * message). It does NOT own the panel's row draft state — that lives
 * inside DocumentSplitPanel. Callers pass `onChanged` so the parent
 * can refresh whatever cached view it holds (inbox counts, split
 * badges, per-doc split rows) after a successful mutation.
 *
 * Kept as a hook rather than a plain helper because the saving flag
 * and error message drive component-local UI; a pure fn would force
 * every consumer to re-implement the same useState pair.
 */

import { useState } from "react";

export interface UseDocumentSplitsResult {
  splitSaving: boolean;
  splitError: string | null;
  /** Clear the local error without touching server state. */
  resetError: () => void;
  /** POST the given splits, then call onChanged on success. */
  saveSplits: (splits: { project_id: string; amount: number }[]) => Promise<boolean>;
  /** DELETE all splits after a confirm prompt. Returns true if the
   *  server actually removed them (or if the user cancelled — no-op). */
  clearSplits: () => Promise<boolean>;
}

export function useDocumentSplits(
  docId: string,
  onChanged?: () => void,
): UseDocumentSplitsResult {
  const [splitSaving, setSaving] = useState(false);
  const [splitError, setError]   = useState<string | null>(null);

  async function saveSplits(splits: { project_id: string; amount: number }[]) {
    if (splitSaving) return false;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/admin/documents/${docId}/splits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ splits }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(`שמירת הפיצול נכשלה: ${b.error ?? res.status}`);
        return false;
      }
      onChanged?.();
      return true;
    } catch (e) {
      setError(`שמירת הפיצול נכשלה: ${String(e)}`);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function clearSplits() {
    if (splitSaving) return false;
    if (!confirm("לבטל את הפיצול? המסמך יחזור להיות ללא שיוך.")) return false;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/admin/documents/${docId}/splits`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(`ביטול הפיצול נכשל: ${b.error ?? res.status}`);
        return false;
      }
      onChanged?.();
      return true;
    } catch (e) {
      setError(`ביטול הפיצול נכשל: ${String(e)}`);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return {
    splitSaving,
    splitError,
    resetError: () => setError(null),
    saveSplits,
    clearSplits,
  };
}
