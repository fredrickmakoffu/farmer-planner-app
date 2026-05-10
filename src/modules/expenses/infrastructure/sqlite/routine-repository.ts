import { container } from "@/bootstrap/container"
import type { Db } from "@/shared/infrastructure/database"

import type { Routine } from "../../domain/entities/routine"
import type { RoutineRepository } from "../../domain/repositories/routine-repository"

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

const COLUMNS = "id, name, category_id, time_start, time_end, days_of_week, is_high_confidence, default_amount"

export class SqliteRoutineRepository implements RoutineRepository {
  private db: Db

  constructor(db?: Db) {
    this.db = db ?? container.resolve<Db>("database")!
    if (!this.db) throw new Error("Database not available in container")
  }

  create(routine: Omit<Routine, "id">): Promise<Routine> {
    const result = this.db.runSync(
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
    )
    return Promise.resolve({ ...routine, id: result.lastInsertRowId })
  }

  findAll(): Promise<Routine[]> {
    const rows = this.db.getAllSync(`SELECT ${COLUMNS} FROM routines;`) as any[]
    return Promise.resolve(rows.map(rowToRoutine))
  }

  findById(id: number): Promise<Routine | undefined> {
    const row = this.db.getFirstSync(
      `SELECT ${COLUMNS} FROM routines WHERE id = ? LIMIT 1;`,
      [id],
    ) as any
    return Promise.resolve(row ? rowToRoutine(row) : undefined)
  }

  update(routine: Routine): Promise<void> {
    this.db.runSync(
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
        routine.id!,
      ],
    )
    return Promise.resolve()
  }

  delete(id: number): Promise<void> {
    this.db.runSync(`DELETE FROM routines WHERE id = ?;`, [id])
    return Promise.resolve()
  }
}

export default SqliteRoutineRepository
