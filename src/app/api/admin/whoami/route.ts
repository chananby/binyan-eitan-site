import { NextRequest, NextResponse } from "next/server";
import { getRoleFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export function GET(req: NextRequest) {
  const role = getRoleFromRequest(req);
  return NextResponse.json({ role });
}
