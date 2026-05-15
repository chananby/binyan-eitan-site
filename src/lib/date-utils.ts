import { israelWallClockToISO } from "./israel-time";

const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"] as const;

export function dayNameHe(date: Date): string {
  return `יום ${HE_DAYS[date.getDay()]}`;
}

// Parse "DD.M.YYYY, HH:MM" or "DD.M.YYYY HH:MM" → Date (Israel TZ, DST-aware)
export function parseLabelToDate(label: string | null | undefined): Date | null {
  if (!label) return null;
  const parts = label.replace(",", "").trim().split(/\s+/);
  if (!parts[0]) return null;
  const [d, m, y] = parts[0].split(".");
  if (!d || !m || !y) return null;
  const [h, min] = (parts[1] ?? "00:00").split(":");
  try {
    const ymd = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    const hm  = `${(h ?? "00").padStart(2, "0")}:${(min ?? "00").padStart(2, "0")}`;
    const dt = new Date(israelWallClockToISO(ymd, hm));
    return isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

// "28.4.2026, 08:30" → "יום שני, 28.4.2026, 08:30"  (null/undefined → null)
export function labelWithDayHe(label: string | null | undefined): string | null {
  if (!label) return null;
  const dt = parseLabelToDate(label);
  return dt ? `${dayNameHe(dt)}, ${label}` : label;
}

// Today as "יום שבת, 02.05.2026"
export function todayWithDayHe(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  return `${dayNameHe(now)}, ${dateStr}`;
}
