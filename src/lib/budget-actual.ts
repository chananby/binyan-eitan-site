// Budget-vs-actual calculation for a single project ("תקציב מול ביצוע").
//
// Pure functions — no DB, no I/O — so the logic is fully unit-testable. The
// server fetches the project's budget and its financial_documents (already
// filtered to deleted_at IS NULL), then calls computeProjectBudget().
//
// Definitions (locked):
//   approvedExpense = SUM(total_amount)  direction='expense', status='approved'
//   pendingExpense  = SUM(total_amount)  direction='expense', status='pending'
//   remaining       = budget − approvedExpense   (null when no budget)
//   percentSpent    = approvedExpense / budget × 100   (null when no budget or budget ≤ 0)
//   budget IS NULL  → "no budget defined": remaining/percent stay null.

export interface BudgetDoc {
  direction: string | null;
  status: string | null;
  total_amount: number | null;
}

export interface BudgetActual {
  budget: number | null;
  hasBudget: boolean;
  approvedExpense: number;
  pendingExpense: number;
  remaining: number | null;
  percentSpent: number | null;
}

function sumExpenses(docs: BudgetDoc[], status: string): number {
  let sum = 0;
  for (const d of docs) {
    if (d.direction === "expense" && d.status === status) {
      sum += d.total_amount ?? 0; // a null amount counts as 0
    }
  }
  return sum;
}

export function computeProjectBudget(budget: number | null | undefined, docs: BudgetDoc[]): BudgetActual {
  const hasBudget = budget != null;
  const approvedExpense = sumExpenses(docs, "approved");
  const pendingExpense = sumExpenses(docs, "pending");

  const remaining = hasBudget ? (budget as number) - approvedExpense : null;
  const percentSpent = hasBudget && (budget as number) > 0
    ? (approvedExpense / (budget as number)) * 100
    : null;

  return {
    budget: hasBudget ? (budget as number) : null,
    hasBudget,
    approvedExpense,
    pendingExpense,
    remaining,
    percentSpent,
  };
}
