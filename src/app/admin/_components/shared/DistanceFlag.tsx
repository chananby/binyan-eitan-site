import React from "react";

// Distance-from-project flag for an attendance record.
// States:
//   1. distance present + over threshold → red flag "חריגה" with km/m label
//   2. distance present + over warnThreshold (optional middle tier) → amber
//      "רחוק" — only when warnThreshold is passed; live callers omit it, so
//      their two-tier red/neutral behaviour is unchanged.
//   3. distance present + within thresholds → neutral flag with km/m label
//   4. distance missing (no project / project has no coords) but lat/lng
//      present → neutral 📍 pin labelled "מפה", no distance number
// All click through to Google Maps at the actual clock-in coords.
// Renders nothing if lat/lng are missing too.
export default function DistanceFlag({
  r,
  threshold,
  warnThreshold,
}: {
  r: { lat?: string | null; lng?: string | null; distance_from_project_m?: number | null };
  threshold: number;
  // Optional amber middle tier: warnThreshold < d ≤ threshold → "רחוק".
  // Omit for the live board's original binary red/neutral flag.
  warnThreshold?: number;
}) {
  const d = r.distance_from_project_m;
  const hasCoords = !!(r.lat && r.lng);
  if (d == null && !hasCoords) return null;

  const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${r.lat},${r.lng}` : undefined;

  // Case 4: no distance, but we have coords. Show neutral pin.
  if (d == null) {
    const cls = "text-[0.75rem] font-semibold px-1.5 py-0.5 shrink-0 inline-flex items-center gap-0.5 bg-charcoal/[0.04] text-charcoal/65 hover:bg-charcoal/10 transition-colors";
    return (
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={cls} title="לחץ לפתיחה במפה (אין השוואה לאתר)">
        📍 מפה
      </a>
    );
  }

  // Cases 1–3: distance is present. Three tiers when warnThreshold is set,
  // else the original two (over/under threshold).
  const over = d > threshold;
  const warn = !over && warnThreshold != null && d > warnThreshold;
  const label = d < 1000 ? `${d}מ׳` : `${(d / 1000).toFixed(1)}ק"מ`;
  const tierClass = over
    ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
    : warn
      ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
      : "bg-charcoal/[0.04] text-charcoal/65 hover:bg-charcoal/10";
  const className = `text-[0.75rem] font-semibold px-1.5 py-0.5 shrink-0 inline-flex items-center gap-0.5 transition-colors ${tierClass}`;
  const title = over
    ? `📍 ${d} מטרים מהאתר — חריגה (מעל ${threshold} מ׳)`
    : warn
      ? `📍 ${d} מטרים מהאתר — רחוק (מעל ${warnThreshold} מ׳)`
      : `📍 ${d} מטרים מהאתר`;
  if (mapsUrl) {
    return (
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={className} title={title}>
        📍 {label}
      </a>
    );
  }
  return (
    <span className={className} title={title}>📍 {label}</span>
  );
}
