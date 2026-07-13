/**
 * Approval gate for pay-bearing attendance.
 *
 * Only status='approved' rows count toward a payslip or the monthly report.
 * Foreman-submitted rows sit at 'pending' until an admin reviews them, and
 * 'rejected' rows must never reach pay. Verified against production: every
 * live web / phone-call / clock-out row is written 'approved' (the column
 * default), so filtering to approved drops nothing legitimate — only the
 * pending (awaiting review) and rejected rows.
 *
 * Shared by /api/admin/payroll, /api/admin/payroll/export, and
 * /api/admin/attendance/monthly-report so the rule has one source of truth
 * and matches the attendance-based salary split (which already counts
 * approved only). Pending is counted separately (countPendingStatus) so an
 * unreviewed row becomes a visible warning, never a silent omission.
 */
export interface HasStatus {
  status?: string | null;
}

/** Keep only rows an admin has approved — the ones that may be paid. */
export function filterApprovedForPay<T extends HasStatus>(rows: T[]): T[] {
  return rows.filter((r) => r.status === "approved");
}

/** Count rows still awaiting approval — reported to the admin/accountant, not paid. */
export function countPendingStatus<T extends HasStatus>(rows: T[]): number {
  return rows.reduce((n, r) => (r.status === "pending" ? n + 1 : n), 0);
}
