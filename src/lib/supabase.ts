import { createClient } from "@supabase/supabase-js";

// Server-only client — uses service role key, never imported in client components.
// Required env vars (Vercel dashboard → Settings → Environment Variables):
//   SUPABASE_URL  or  NEXT_PUBLIC_SUPABASE_URL — Project URL from Supabase dashboard
//   SUPABASE_SERVICE_ROLE_KEY                  — Secret key (Supabase → Settings → API)
//
// RLS note: the service role key bypasses Row Level Security automatically.
// You do NOT need to add permissive policies for server-side operations.

export function createServerClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const missing = [!url && "SUPABASE_URL", !key && "SUPABASE_SERVICE_ROLE_KEY"]
      .filter(Boolean).join(", ");
    throw new Error(`Missing Supabase env vars: ${missing}`);
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
  created_at: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  status: string;
  address: string | null;
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
