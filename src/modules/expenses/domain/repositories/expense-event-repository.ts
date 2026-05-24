import type { ExpenseEvent } from "../entities/expense-event"

export interface ExpenseEventRepository {
  create(amount: number, categoryId?: number | null, notes?: string | null): Promise<ExpenseEvent>
  findAll(): Promise<ExpenseEvent[]>
  findById(id: number): Promise<ExpenseEvent | undefined>
  update(id: number, amount: number, categoryId: number | null, notes?: string | null): Promise<void>
  delete(id: number): Promise<void>
  confirmDay(dateStart: number, dateEnd: number): Promise<void>
}

export default ExpenseEventRepository
