import { container } from "@/bootstrap/container"
import type { Db } from "@/shared/infrastructure/database"

import type { ExpenseEvent } from "../../domain/entities/expense-event"
import type { ExpenseEventRepository } from "../../domain/repositories/expense-event-repository"

export class SqliteExpenseEventRepository implements ExpenseEventRepository {
  private db: Db

  constructor(db?: Db) {
    this.db = db ?? container.resolve<Db>("database")!
    if (!this.db) throw new Error("Database not available in container")
  }

  create(amount: number, categoryId?: number | null): Promise<ExpenseEvent> {
    const createdAt = Date.now()
    const result = this.db.runSync(
      `INSERT INTO expense_events (amount, category_id, created_at) VALUES (?, ?, ?);`,
      [amount, categoryId ?? null, createdAt],
    )
    return Promise.resolve({
      id: result.lastInsertRowId,
      amount,
      category_id: categoryId ?? null,
      created_at: createdAt,
    })
  }

  findAll(): Promise<ExpenseEvent[]> {
    const rows = this.db.getAllSync(
      `SELECT id, amount, category_id, created_at FROM expense_events ORDER BY created_at DESC;`,
    ) as ExpenseEvent[]
    return Promise.resolve(rows)
  }

  findById(id: number): Promise<ExpenseEvent | undefined> {
    const row = this.db.getFirstSync(
      `SELECT id, amount, category_id, created_at FROM expense_events WHERE id = ? LIMIT 1;`,
      [id],
    ) as ExpenseEvent | null
    return Promise.resolve(row ?? undefined)
  }

  update(id: number, amount: number, categoryId: number | null): Promise<void> {
    this.db.runSync(
      `UPDATE expense_events SET amount = ?, category_id = ? WHERE id = ?;`,
      [amount, categoryId, id],
    )
    return Promise.resolve()
  }

  delete(id: number): Promise<void> {
    this.db.runSync(`DELETE FROM expense_events WHERE id = ?;`, [id])
    return Promise.resolve()
  }
}

export default SqliteExpenseEventRepository
