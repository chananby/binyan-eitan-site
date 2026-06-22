import React from "react";

// Distance-from-project flag for an attendance record.
// Three states:
//   1. distance present + over threshold → red flag with km/m label
//   2. distance present + within threshold → neutral flag with km/m label
//   3. distance missing (no project / project has no coords) but lat/lng
//      present → neutral 📍 pin labelled "מפה", no distance number
// All three click through to Google Maps at the actual clock-in coords.
// Renders nothing if lat/lng are missing too.
export default function DistanceFlag({
  r,
  threshold,
}: {
  r: { lat?: string | null; lng?: string | null; distance_from_project_m?: number | null };
  threshold: number;
}) {
  const d = r.distance_from_project_m;
  const hasCoords = !!(r.lat && r.lng);
  if (d == null && !hasCoords) return null;

  const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${r.lat},${r.lng}` : undefined;

  // Case 3: no distance, but we have coords. Show neutral pin.
  if (d == null) {
    const cls = "text-[0.75rem] font-semibold px-1.5 py-0.5 shrink-0 inline-flex items-center gap-0.5 bg-charcoal/[0.04] text-charcoal/65 hover:bg-charcoal/10 transition-colors";
    return (
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={cls} title="לחץ לפתיחה במפה (אין השוואה לאתר)">
        📍 מפה
      </a>
    );
  }

  // Cases 1+2: distance is present
  const over = d > threshold;
  const label = d < 1000 ? `${d}מ׳` : `${(d / 1000).toFixed(1)}ק"מ`;
  const className = `text-[0.75rem] font-semibold px-1.5 py-0.5 shrink-0 inline-flex items-center gap-0.5 transition-colors ${
    over
      ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
      : "bg-charcoal/[0.04] text-charcoal/65 hover:bg-charcoal/10"
  }`;
  const title = over
    ? `📍 ${d} מטרים מהאתר — מעל הסף (${threshold} מ׳)`
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
