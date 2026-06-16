// Shared content-filter logic for financial_documents queries — every field
// the Inbox filters on EXCEPT status and date range (each route handles those
// its own way: the list does a single status .eq + doc_date gte/lte; the
// export maps status sets and splits dated/undated by created_at).
//
// Used by BOTH the list GET and the export ZIP so "download the filtered view"
// matches the screen exactly — one source for the .eq / .not / .or chain
// instead of two copies that can drift apart.

export interface DocContentFilters {
  doc_type: string | null;
  direction: string | null;
  category: string | null;
  vendor_id: string | null;
  project_id: string | null;
  duplicates_only: boolean;
  q: string | null;
}

export function readDocContentFilters(sp: URLSearchParams): DocContentFilters {
  return {
    doc_type:        sp.get("doc_type")?.trim()   || null,
    direction:       sp.get("direction")?.trim()  || null,
    category:        sp.get("category")?.trim()   || null,
    vendor_id:       sp.get("vendor_id")?.trim()  || null,
    project_id:      sp.get("project_id")?.trim() || null,
    duplicates_only: sp.get("duplicates_only") === "true",
    q:               sp.get("q")?.trim()          || null,
  };
}

// The chainable subset we use — keeps the helper decoupled from the supabase
// client type while still being satisfied structurally by a real query.
export interface FilterableQuery {
  eq(col: string, val: unknown): FilterableQuery;
  not(col: string, op: string, val: unknown): FilterableQuery;
  or(filters: string): FilterableQuery;
}

// Apply the content filters to a query. Generic over the concrete query type so
// callers can keep chaining (.gte/.lte/.in/…) on the returned builder.
export function applyDocContentFilters<Q extends FilterableQuery>(query: Q, f: DocContentFilters): Q {
  let q: FilterableQuery = query;
  if (f.doc_type)        q = q.eq("doc_type", f.doc_type);
  if (f.direction)       q = q.eq("direction", f.direction);
  if (f.category)        q = q.eq("category", f.category);
  if (f.vendor_id)       q = q.eq("vendor_id", f.vendor_id);
  if (f.project_id)      q = q.eq("project_id", f.project_id);
  if (f.duplicates_only) q = q.not("possible_duplicate_of", "is", null);
  if (f.q) {
    const pat = `%${f.q}%`;
    q = q.or(`vendor_name_raw.ilike.${pat},doc_number.ilike.${pat},description.ilike.${pat}`);
  }
  return q as Q;
}
