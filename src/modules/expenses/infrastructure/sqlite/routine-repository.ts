import { container } from "@/bootstrap/container"

import type { Routine } from "../../domain/entities/routine"
import type { RoutineRepository } from "../../domain/repositories/routine-repository"

const COLUMNS = "id, name, category_id, time_start, time_end, days_of_week, is_high_confidence, default_amount"

function rowToRoutine(row: any): Routine {
  return {
    id: row.id,
    name: row.name,
    category_id: row.category_id,
    time_start: row.time_start,
    time_end: row.time_end,
    days_of_week: row.days_of_week,
    is_high_confidence: row.is_high_confidence === 1,
    default_amount: row.default_amount ?? 0,
  }
}

function resultRowsToArray(result: any): Routine[] {
  const rows: Routine[] = []
  for (let i = 0; i < result.rows.length; i += 1) {
    rows.push(rowToRoutine(result.rows.item(i)))
  }
  return rows
}

export class SqliteRoutineRepository implements RoutineRepository {
  private db: any

  constructor(db?: any) {
    this.db = db || container.resolve("database")
    if (!this.db) throw new Error("Database not available in container")
  }

  create(routine: Omit<Routine, "id">): Promise<Routine> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            `INSERT INTO routines (name, category_id, time_start, time_end, days_of_week, is_high_confidence, default_amount)
             VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [
              routine.name,
              routine.category_id,
              routine.time_start,
              routine.time_end,
              routine.days_of_week,
              routine.is_high_confidence ? 1 : 0,
              routine.default_amount ?? 0,
            ],
            (_: any, result: any) => {
              resolve({ ...routine, id: result.insertId })
            },
          )
        },
        (err: any) => reject(err),
      )
    })
  }

  findAll(): Promise<Routine[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            `SELECT ${COLUMNS} FROM routines;`,
            [],
            (_: any, result: any) => resolve(resultRowsToArray(result)),
          )
        },
        (err: any) => reject(err),
      )
    })
  }

  findById(id: number): Promise<Routine | undefined> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            `SELECT ${COLUMNS} FROM routines WHERE id = ? LIMIT 1;`,
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

  update(routine: Routine): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            `UPDATE routines
             SET name = ?, category_id = ?, time_start = ?, time_end = ?,
                 days_of_week = ?, is_high_confidence = ?, default_amount = ?
             WHERE id = ?;`,
            [
              routine.name,
              routine.category_id,
              routine.time_start,
              routine.time_end,
              routine.days_of_week,
              routine.is_high_confidence ? 1 : 0,
              routine.default_amount ?? 0,
              routine.id,
            ],
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
          tx.executeSql(`DELETE FROM routines WHERE id = ?;`, [id])
        },
        (err: any) => reject(err),
        () => resolve(),
      )
    })
  }
}

export default SqliteRoutineRepository
