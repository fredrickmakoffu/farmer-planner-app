import { container } from "@/bootstrap/container"
import type { Db } from "@/shared/infrastructure/database"

import type { Category } from "../../domain/entities/category"
import type { CategoryRepository } from "../../domain/repositories/category-repository"

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

export class SqliteCategoryRepository implements CategoryRepository {
  private db: Db

  constructor(db?: Db) {
    this.db = db ?? container.resolve<Db>("database")!
    if (!this.db) throw new Error("Database not available in container")
  }

  create(category: Omit<Category, "id">): Promise<Category> {
    const result = this.db.runSync(
      `INSERT INTO categories (name, color_hex, default_amount, icon, is_system) VALUES (?, ?, ?, ?, ?);`,
      [
        category.name,
        category.color_hex,
        category.default_amount ?? null,
        category.icon ?? "dots-horizontal",
        category.is_system ? 1 : 0,
      ],
    )
    return Promise.resolve({ ...category, id: result.lastInsertRowId })
  }

  findAll(): Promise<Category[]> {
    const rows = this.db.getAllSync(
      `SELECT id, name, color_hex, default_amount, icon, is_system FROM categories;`,
    ) as any[]
    return Promise.resolve(rows.map(rowToCategory))
  }

  findById(id: number): Promise<Category | undefined> {
    const row = this.db.getFirstSync(
      `SELECT id, name, color_hex, default_amount, icon, is_system FROM categories WHERE id = ? LIMIT 1;`,
      [id],
    ) as any
    return Promise.resolve(row ? rowToCategory(row) : undefined)
  }

  update(category: Category): Promise<void> {
    this.db.runSync(
      `UPDATE categories SET name = ?, color_hex = ?, default_amount = ?, icon = ?, is_system = ? WHERE id = ?;`,
      [
        category.name,
        category.color_hex,
        category.default_amount ?? null,
        category.icon ?? "dots-horizontal",
        category.is_system ? 1 : 0,
        category.id!,
      ],
    )
    return Promise.resolve()
  }

  delete(id: number): Promise<void> {
    this.db.runSync(`DELETE FROM categories WHERE id = ?;`, [id])
    return Promise.resolve()
  }
}

export default SqliteCategoryRepository
