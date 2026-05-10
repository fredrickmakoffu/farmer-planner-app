import { container } from "@/bootstrap/container"

import type { Category } from "../../domain/entities/category"
import type { CategoryRepository } from "../../domain/repositories/category-repository"

const COLUMNS = "id, name, color_hex, default_amount, icon, is_system"

function rowToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    color_hex: row.color_hex ?? "#CCCCCC",
    icon: row.icon ?? "dots-horizontal",
    is_system: row.is_system === 1 || row.is_system === true,
    default_amount: row.default_amount ?? null,
  }
}

function resultRowsToArray(result: any): Category[] {
  const rows: Category[] = []
  for (let i = 0; i < result.rows.length; i += 1) {
    rows.push(rowToCategory(result.rows.item(i)))
  }
  return rows
}

export class SqliteCategoryRepository implements CategoryRepository {
  private db: any

  constructor(db?: any) {
    this.db = db || container.resolve("database")
    if (!this.db) throw new Error("Database not available in container")
  }

  create(category: Omit<Category, "id">): Promise<Category> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            `INSERT INTO categories (name, color_hex, default_amount, icon, is_system) VALUES (?, ?, ?, ?, ?);`,
            [
              category.name,
              category.color_hex,
              category.default_amount ?? null,
              category.icon ?? "dots-horizontal",
              category.is_system ? 1 : 0,
            ],
            (_: any, result: any) => {
              resolve({ ...category, id: result.insertId })
            },
          )
        },
        (err: any) => reject(err),
      )
    })
  }

  findAll(): Promise<Category[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            `SELECT ${COLUMNS} FROM categories;`,
            [],
            (_: any, result: any) => resolve(resultRowsToArray(result)),
          )
        },
        (err: any) => reject(err),
      )
    })
  }

  findById(id: number): Promise<Category | undefined> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            `SELECT ${COLUMNS} FROM categories WHERE id = ? LIMIT 1;`,
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

  update(category: Category): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            `UPDATE categories SET name = ?, color_hex = ?, default_amount = ?, icon = ?, is_system = ? WHERE id = ?;`,
            [
              category.name,
              category.color_hex,
              category.default_amount ?? null,
              category.icon ?? "dots-horizontal",
              category.is_system ? 1 : 0,
              category.id,
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
          tx.executeSql(`DELETE FROM categories WHERE id = ?;`, [id])
        },
        (err: any) => reject(err),
        () => resolve(),
      )
    })
  }
}

export default SqliteCategoryRepository
