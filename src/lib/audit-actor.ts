import { NextRequest } from "next/server";
import {
  getViewContext,
  getAdminRoleFromRequest,
  getAdminIdFromRequest,
  getForemanStaffIdFromRequest,
} from "./admin-auth";

/**
 * Human-readable actor label for an authenticated write, view-aware so an admin
 * "acting-as-foreman" is never hidden behind a clean foreman record:
 *
 *   "admin:<adminName> (בתור <foremanName>)" — admin acting through a foreman
 *   "admin:<adminName>"                       — plain admin
 *   "foreman:<foremanName>"                   — real foreman
 *
 * The view context is checked FIRST: in view mode getAdminRoleFromRequest is
 * suppressed and getForemanStaffIdFromRequest returns the viewed foreman, so
 * without this branch a view-mode write would mislabel itself as a clean
 * "foreman:<name>" — exactly the forged record we must never produce.
 *
 * Name-lookup failures fall back to an id-slice label (an audit gap must never
 * refuse the write).
 */
export async function resolveActorLabel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  req: NextRequest,
): Promise<string> {
  const view = getViewContext(req);
  if (view) {
    try {
      const [{ data: admin }, { data: foreman }] = await Promise.all([
        supabase.from("admins").select("name").eq("id", view.adminId).maybeSingle(),
        supabase.from("staff").select("name").eq("id", view.staffId).maybeSingle(),
      ]);
      const a = admin?.name ?? view.adminId.slice(0, 8);
      const f = foreman?.name ?? view.staffId.slice(0, 8);
      return `admin:${a} (בתור ${f})`;
    } catch {
      return `admin:${view.adminId.slice(0, 8)} (בתור ${view.staffId.slice(0, 8)})`;
    }
  }

  if (getAdminRoleFromRequest(req) === "admin") {
    const id = getAdminIdFromRequest(req)!;
    try {
      const { data } = await supabase.from("admins").select("name").eq("id", id).maybeSingle();
      return data?.name ? `admin:${data.name}` : `admin:${id.slice(0, 8)}`;
    } catch {
      return `admin:${id.slice(0, 8)}`;
    }
  }

  const fid = getForemanStaffIdFromRequest(req);
  if (fid) {
    try {
      const { data } = await supabase.from("staff").select("name").eq("id", fid).maybeSingle();
      return data?.name ? `foreman:${data.name}` : `foreman:${fid.slice(0, 8)}`;
    } catch {
      return `foreman:${fid.slice(0, 8)}`;
    }
  }

  return "unknown";
}
