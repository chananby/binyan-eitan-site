/**
 * Who belongs in a HISTORICAL payroll / attendance report for a given month.
 *
 * The rule is presence-driven, not status-driven. A worker who was
 * deactivated (active=false) but clocked hours during the report month still
 * earned a payslip for that month — dropping them means an unpaid worker and
 * a wrong file to the accountant. So they must appear. But a deactivated
 * worker with NO activity that month must NOT appear, or every report is
 * flooded by the ~21 dormant inactive rows.
 *
 * Soft-deleted workers (deleted_at IS NOT NULL) are a separate concept —
 * they're filtered out upstream by the query and never reach this predicate.
 * "deactivated" (active=false, deleted_at=null) is the case this handles.
 *
 * Shared by all three historical report routes so the inclusion rule has a
 * single source of truth:
 *   - /api/admin/payroll
 *   - /api/admin/payroll/export        (the XLSX the accountant receives)
 *   - /api/admin/attendance/monthly-report
 *
 * NOT used by /api/admin/payroll/forecast — a forecast is forward-looking
 * (who we'd pay next month), so active-only is correct there.
 */
export function includeInReport(active: boolean, workedThisMonth: boolean): boolean {
  return active || workedThisMonth;
}
