import { createClient } from "@supabase/supabase-js";

// Server-only client — uses service role key, never imported in client components.
// Required env vars:
//   SUPABASE_URL          — Project URL from Supabase dashboard
//   SUPABASE_SERVICE_ROLE_KEY — Secret key (Settings > API)

export function createServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// ── Table row types ────────────────────────────────────────────────────────────

export interface StaffRow {
  id: string;
  phone: string;
  name: string;
  role: string | null;
  active: boolean;
}

export interface AttendanceRow {
  id: string;
  staff_id: string;
  action: "in" | "out";
  lat: string;
  lng: string;
  timestamp_label: string;
  recorded_at: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  status: string;
  address: string | null;
  client_name: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface BudgetItemRow {
  id: string;
  project_id: string;
  description: string;
  category: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  created_at: string;
}

export interface SettingRow {
  key: string;
  value: string;
}
