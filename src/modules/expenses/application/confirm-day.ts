import type { ExpenseEventRepository } from "../domain/repositories/expense-event-repository"

export async function confirmDay(
  repo: ExpenseEventRepository,
  dateStart: number,
  dateEnd: number,
  sync?: { flush?: () => Promise<void> },
): Promise<void> {
  await repo.confirmDay(dateStart, dateEnd)
  sync?.flush?.().catch(() => {})
}
