import { container } from "@/bootstrap/container"

import type { ExpenseEvent } from "../../domain/entities/expense-event"
import type { ExpenseEventRepository } from "../../domain/repositories/expense-event-repository"

function resultRowsToArray(result: any): ExpenseEvent[] {
  const rows: ExpenseEvent[] = []
  for (let i = 0; i < result.rows.length; i += 1) {
    rows.push(result.rows.item(i))
  }
  return rows
}

export class SqliteExpenseEventRepository implements ExpenseEventRepository {
  private db: any

  constructor(db?: any) {
    this.db = db || container.resolve("database")
    if (!this.db) throw new Error("Database not available in container")
  }

  create(amount: number, categoryId?: number | null): Promise<ExpenseEvent> {
    const createdAt = Date.now()
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            `INSERT INTO expense_events (amount, category_id, created_at) VALUES (?, ?, ?);`,
            [amount, categoryId ?? null, createdAt],
            (_: any, result: any) => {
              const id = result.insertId
              resolve({ id, amount, category_id: categoryId ?? null, created_at: createdAt })
            },
          )
        },
        (err: any) => reject(err),
      )
    })
  }

  findAll(): Promise<ExpenseEvent[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            `SELECT id, amount, category_id, created_at FROM expense_events ORDER BY created_at DESC;`,
            [],
            (_: any, result: any) => {
              resolve(resultRowsToArray(result))
            },
          )
        },
        (err: any) => reject(err),
      )
    })
  }

  async findById(id: number): Promise<ExpenseEvent | undefined> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            `SELECT id, amount, category_id, created_at FROM expense_events WHERE id = ? LIMIT 1;`,
            [id],
            (_: any, result: any) => {
              const rows = resultRowsToArray(result)
              resolve(rows.length ? rows[0] : undefined)
            },
          )
        },
        (err: any) => reject(err),
      )
    })
  }

  update(id: number, amount: number, categoryId: number | null): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            `UPDATE expense_events SET amount = ?, category_id = ? WHERE id = ?;`,
            [amount, categoryId, id],
          )
        },
        (err: any) => reject(err),
        () => resolve(),
      )
    })
  }

  delete(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(`DELETE FROM expense_events WHERE id = ?;`, [id])
        },
        (err: any) => reject(err),
        () => resolve(),
      )
    })
  }
}

export default SqliteExpenseEventRepository
