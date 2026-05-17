import { NextResponse } from "next/server";

/**
 * Centralized API error response helpers.
 *
 * Purpose: consistent error response shapes across all API routes.
 * The shape is intentionally identical to what we returned manually before
 * this utility existed — `{ error: <message> }` with an appropriate status —
 * so existing frontend callers continue to work unchanged.
 *
 * NOTE: There is intentionally NO `success()` helper. Each route returns
 * its own success shape (e.g. `{ staff: [...] }`, `{ report: {...} }`)
 * and wrapping those would require changes in every caller. Migrate only
 * the error paths.
 */

export function badRequest(message: string = "Bad Request") {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message: string = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message: string = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message: string = "Not Found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message: string = "Conflict") {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serverError(message: string = "Internal Server Error") {
  return NextResponse.json({ error: message }, { status: 500 });
}
