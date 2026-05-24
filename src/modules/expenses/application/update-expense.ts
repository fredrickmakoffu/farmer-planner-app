import type SyncEngine from "@/shared/contracts/sync"
import type { ExpenseEventRepository } from "../domain/repositories/expense-event-repository"

export async function updateExpense(
  repo: ExpenseEventRepository,
  id: number,
  amount: number,
  categoryId: number | null,
  syncEngine?: SyncEngine,
  notes?: string | null,
): Promise<void> {
  await repo.update(id, amount, categoryId, notes)
  try {
    if (syncEngine) {
      await syncEngine.enqueue({ type: "update_expense", payload: { id, amount, categoryId, notes } })
    }
  } catch {
    // ignore enqueue errors
  }
}

export default updateExpense
