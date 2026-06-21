/**
 * GET /api/admin/payroll/forecast/export?month=YYYY-MM
 *
 * XLSX download of the per-worker rough monthly salary forecast — same
 * inputs and math as /api/admin/payroll/forecast (the JSON sibling),
 * formatted as a single sheet for the accountant / GM. RTL view, Hebrew
 * headers, currency-formatted numeric cells, a bold total row.
 *
 * Admin only. Defaults month to current Israel time so the dashboard
 * download link doesn't need to compute it.
 */
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createServerClient } from "../../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../../lib/admin-auth";
import { getRatesForMonth } from "../../../../../../lib/staff-rates";
import {
  forecastTotal,
  WORK_DAYS_PER_MONTH,
  WORK_HOURS_PER_DAY,
  type ForecastRates,
} from "../../../../../../lib/payroll-forecast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hebrew labels for the employment_type column. Mirrors EMPLOYMENT_LABELS
// in the payroll export route — kept local rather than imported so the
// two reports can drift independently if the labels ever need to diverge.
const EMPLOYMENT_LABELS: Record<string, string> = {
  hourly: "שעתי",
  daily:  "יומי",
  global: "גלובלי",
};

function currentIsraelMonth(): string {
  return new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" }).slice(0, 7);
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month");
  const month = monthParam ?? currentIsraelMonth();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month query param invalid (YYYY-MM)" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: staff, error: staffErr } = await supabase
    .from("staff")
    .select("id, name, employment_type, hourly_rate, daily_rate, monthly_global_salary")
    .eq("active", true)
    .is("deleted_at", null)
    .in("role", ["עובד", "ממונה"]);
  if (staffErr) {
    console.error("[payroll/forecast/export] staff err:", staffErr.message);
    return NextResponse.json({ error: staffErr.message }, { status: 500 });
  }
  const workers = (staff ?? []) as Array<{
    id: string; name: string; employment_type: string;
    hourly_rate: number | null; daily_rate: number | null; monthly_global_salary: number | null;
  }>;

  const ratesMap = await getRatesForMonth(supabase, workers.map((w) => w.id), month);
  const legacyById = new Map(
    workers.map((w) => [w.id, {
      hourly_rate: w.hourly_rate,
      daily_rate: w.daily_rate,
      monthly_global_salary: w.monthly_global_salary,
    } as ForecastRates]),
  );
  const ratesFor = (id: string): ForecastRates | null => {
    const r = ratesMap.get(id);
    if (r) return { hourly_rate: r.hourly_rate, daily_rate: r.daily_rate, monthly_global_salary: r.monthly_global_salary };
    return legacyById.get(id) ?? null;
  };

  const breakdown = forecastTotal(workers, ratesFor);

  // ── Build the workbook ──────────────────────────────────────────────────
  const monthLabel = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "long",
  }).format(new Date(`${month}-01T12:00:00Z`));
  // ExcelJS forbids `\ / ? * [ ]` in sheet names — same gotcha that bit the
  // staff export. Use a period as the divider so "מאי 2026" is safe.
  const sheetTitle = `צפי שכר ${monthLabel}`.replace(/[\\/?*[\]]/g, ".");

  const wb = new ExcelJS.Workbook();
  wb.creator = "Binyan Eitan";
  wb.created = new Date();
  const sheet = wb.addWorksheet(sheetTitle, { views: [{ rightToLeft: true }] });

  sheet.columns = [
    { header: "שם",         key: "name",     width: 24 },
    { header: "סוג העסקה",  key: "type",     width: 14 },
    { header: "תעריף",      key: "rate",     width: 14 },
    { header: "צפי חודשי",  key: "forecast", width: 16 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E7E3" } };
  headerRow.height = 22;

  for (const line of breakdown.per_worker) {
    sheet.addRow({
      // "⚠️" prefix mirrors the payroll export's missing-rate flag.
      name:     (line.missing_rate ? "⚠️ " : "") + line.worker.name,
      type:     EMPLOYMENT_LABELS[line.worker.employment_type] ?? line.worker.employment_type,
      rate:     line.rate,
      forecast: line.monthly_forecast,
    });
  }

  ["rate", "forecast"].forEach((k) => {
    const col = sheet.getColumn(k);
    col.numFmt = '#,##0.00 ₪;[Red]-#,##0.00 ₪';
    col.alignment = { horizontal: "left" };
  });
  sheet.getColumn("type").alignment = { horizontal: "center" };

  // Total row
  const totalRow = sheet.addRow({
    name: "סה\"כ",
    forecast: breakdown.total,
  });
  totalRow.font = { bold: true };
  totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F2EE" } };
  totalRow.getCell("forecast").numFmt = '#,##0.00 ₪';

  // Tiny footnote one row below the table — context for the accountant
  // so the number doesn't get mistaken for actuals.
  const footnoteRow = sheet.getRow(sheet.rowCount + 2);
  footnoteRow.getCell(1).value =
    `אומדן גס: ${WORK_DAYS_PER_MONTH} ימי עבודה × ${WORK_HOURS_PER_DAY} שעות. לא כולל חופשות, חגים או היעדרויות.`;
  footnoteRow.getCell(1).font = { italic: true, color: { argb: "FF666666" } };

  // Borders on real data rows only — skip the footnote.
  for (let r = 1; r <= sheet.rowCount - 2; r++) {
    const row = sheet.getRow(r);
    row.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = {
        top:    { style: "thin", color: { argb: "FFCCCCCC" } },
        left:   { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
        right:  { style: "thin", color: { argb: "FFCCCCCC" } },
      };
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  const filename = `payroll-forecast-${month}.xlsx`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
