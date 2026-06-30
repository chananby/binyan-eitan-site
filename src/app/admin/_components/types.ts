// Domain entity shapes shared by AdminPortal and its tab/handler sub-modules.
// Pure move from AdminPortal.tsx — no shape changes. Note that several tab
// files (WorkersTab, PlanningTab, ExpensesTab, IncomeTab, AttendanceTab) keep
// their own local copies of structurally-similar interfaces; those are
// intentionally NOT unified in this pass so a refactor here can't accidentally
// alter how a leaf tab reads its props.

export interface StaffMember {
  id: string; name: string; phone: string; role: string; active: boolean;
  national_id?: string | null; hourly_rate?: number | null; daily_rate?: number | null;
  employment_type?: "hourly" | "daily" | "global";
  monthly_global_salary?: number | null;
  travel_allowance?: boolean;
  pension_status?: string | null;
  holiday_eligible?: boolean;
  is_freelancer?: boolean;
  office_only?: boolean;
  label?: string | null;
  attendance_exempt?: boolean;
  start_date?: string | null;
  employment_end_date?: string | null;
  notes?: string | null;
  has_pin?: boolean;
  // Bank details — surfaced ONLY by admin-authed routes (admin/staff GET
  // admin path, POST, PATCH, export). Foreman and worker portals never
  // see these because their server SELECTs use narrow column lists.
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account?: string | null;
  bank_account_owner?: string | null;
  bank_iban?: string | null;
}

export interface VacationRecord {
  id: string;
  staff_id: string;
  date: string;
  half_day: boolean;
  notes: string | null;
}

export interface PayrollRow {
  staff_id: string;
  name: string;
  national_id: string | null;
  is_freelancer?: boolean;
  employment_type: string;
  days_worked: number;
  hours_worked: number;
  hourly_rate: number | null;
  daily_rate: number | null;
  monthly_global_salary: number | null;
  vacation_days: number;
  holiday_eligible: boolean;
  travel_allowance: boolean;
  pension_status: string | null;
  gross_salary: number;
  deleted_at?: string | null;
}

export interface AttendanceRecord {
  id: string; action: string; timestamp_label: string; recorded_at: string;
  clock_at?: string | null; created_at?: string; is_manual?: boolean; status?: string;
  lat?: string | null; lng?: string | null;
  distance_from_project_m?: number | null;
  source?: string | null;
  staff: { id: string; name: string; phone: string; role?: string } | null;
  project: { id: string; name: string } | null;
}

export interface Project {
  id: string;
  name: string;
  status?: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  foreman_id?: string | null;
  /** 'site' | 'overhead'. Surfaces in ProjectsTab so the overhead row
   *  can hide its payment-milestones accordion (no customer paying us
   *  for company overhead). */
  project_type?: string | null;
}

export interface Task {
  id: string; project_id: string; milestone_id: string | null; task_name: string;
  start_date: string | null; end_date: string | null; contractor: string | null;
  status: "planned" | "in_progress" | "completed" | "delayed";
  notes: string | null; project?: { id: string; name: string } | null;
  material_ready: boolean; sub_confirmed: boolean; equipment_on_site: boolean;
  delay_reason: string | null;
}

export interface Milestone {
  id: string; project_id: string; name: string; description: string | null;
  target_date: string | null; status: "pending" | "in_progress" | "completed";
  created_at: string; project?: { id: string; name: string } | null;
}

export interface Material {
  id: string; project_id: string; material_name: string; quantity: number;
  unit: string; supplier: string | null; cost: number | null; category?: string; received_at: string | null;
}

export interface BudgetLine { project_id: string; project_name: string; total: number; }

export interface IncomeRecord {
  id: string; project_id: string; amount: number; description: string | null;
  received_date: string; created_at: string; project?: { id: string; name: string } | null;
}

// Attendance report types (shared between in-app view and print/PDF export)
export interface AttReportRow    { staff_name: string; staff_phone: string; date: string; entry: string; exit: string; hours: number | null; project: string; }
export interface AttSummaryRow   { name: string; phone: string; days: number; hours: number; }
export interface AttReportData   { rows: AttReportRow[]; summary: AttSummaryRow[]; from: string; to: string; }
