// Budget-vs-actual calculation for a single project ("תקציב מול ביצוע").
//
// Pure functions — no DB, no I/O — so the logic is fully unit-testable. The
// server fetches the project's budget and its financial_documents (already
// filtered to deleted_at IS NULL), then calls computeProjectBudget().
//
// Definitions (locked):
//   approvedExpense = SUM(amount_ils)  direction='expense', status='approved'
//   pendingExpense  = SUM(amount_ils)  direction='expense', status='pending'
//   remaining       = budget − approvedExpense   (null when no budget)
//   percentSpent    = approvedExpense / budget × 100   (null when no budget or budget ≤ 0)
//   budget IS NULL  → "no budget defined": remaining/percent stay null.
//
// Sums use amount_ils (the unified shekel value), NEVER the raw total_amount,
// so a foreign-currency document contributes its ILS value — not its foreign
// nominal. A foreign doc whose amount_ils wasn't entered yet contributes 0.

export interface BudgetDoc {
  direction: string | null;
  status: string | null;
  amount_ils: number | null;
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
      sum += d.amount_ils ?? 0; // a null ILS value counts as 0
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
