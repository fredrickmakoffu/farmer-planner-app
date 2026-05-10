import type { Category } from "../domain/entities/category"
import type { CategoryRepository } from "../domain/repositories/category-repository"

export async function createCategory(
  repo: CategoryRepository,
  name: string,
  colorHex = "#CCCCCC",
  icon = "dots-horizontal",
  isSystem = false,
  defaultAmount?: number | null,
): Promise<Category> {
  const trimmed = name?.trim()
  if (!trimmed) throw new Error("Invalid category name")
  return repo.create({
    name: trimmed,
    color_hex: colorHex,
    icon,
    is_system: isSystem,
    default_amount: defaultAmount ?? null,
  })
}

export default createCategory
