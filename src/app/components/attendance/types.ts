// Shared types for the worker-facing attendance UI. Lives next to the
// per-screen components so each one can import only what it needs.

export type Step =
  | "phone" | "menu" | "locating" | "project" | "ready" | "submitting"
  | "success" | "error" | "history" | "manual" | "manualSuccess";

export interface GeoCoords { lat: number; lng: number; }

export interface Project { id: string; name: string; status?: string; }

// Shape returned by /api/worker/history (one row per attendance event).
// Inlined as an anonymous type in the original AttendanceForm.tsx — named
// here so HistoryScreen and ManualScreen can share it.
export interface HistoryRecord {
  id: string;
  action: string;
  timestamp_label: string | null;
  clock_at?: string | null;
  created_at: string;
  is_manual?: boolean;
  status?: string;
  project: { id: string; name: string } | null;
}

export interface CorrectionSummary {
  id: string;
  status: string;
  proposed_time: string | null;
}
