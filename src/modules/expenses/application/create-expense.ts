import type SyncEngine from "@/shared/contracts/sync"

import type { ExpenseEvent } from "../domain/entities/expense-event"
import type { ExpenseEventRepository } from "../domain/repositories/expense-event-repository"

export async function createExpense(
  repo: ExpenseEventRepository,
  amount: number,
  categoryId?: number | null,
  syncEngine?: SyncEngine,
  notes?: string | null,
): Promise<ExpenseEvent> {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount")

  const created = await repo.create(amount, categoryId, notes)

  try {
    if (syncEngine) {
      // enqueue a minimal payload describing the created event so it can be flushed later
      await syncEngine.enqueue({ type: "expense_event", payload: created })
    }
  } catch {
    // allow writes to succeed even if enqueuing fails; sync can be retried later
  }

  return created
}

export default createExpense
