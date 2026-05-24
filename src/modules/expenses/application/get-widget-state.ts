import type { CategoryRepository } from "@/modules/expenses/domain/repositories/category-repository"
import type { ExpenseEventRepository } from "@/modules/expenses/domain/repositories/expense-event-repository"
import type { RoutineRepository } from "@/modules/expenses/domain/repositories/routine-repository"

import { predictCategory } from "./predict-category"

export type WidgetState = {
  /** Predicted category id, or null when no categories are configured. */
  categoryId: number | null
  categoryName: string
  /** Hex color to tint the widget button. */
  colorHex: string
  /** MaterialCommunityIcons icon name, e.g. "silverware-fork-knife". */
  icon: string
  /** Pre-filled amount shown on widget, 0 when no default is set. */
  defaultAmount: number
  /** Unix ms timestamp when this state was computed. */
  predictedAt: number
}

const FALLBACK_COLOR = "#4A90D9"

export async function getWidgetState(
  categoryRepo: CategoryRepository,
  expenseRepo: ExpenseEventRepository,
  routineRepo: RoutineRepository,
  nowMs?: number,
): Promise<WidgetState> {
  const predictedAt = nowMs ?? Date.now()
  const prediction = await predictCategory(categoryRepo, expenseRepo, routineRepo, predictedAt)
  const categoryId = prediction.categoryId

  if (categoryId !== null) {
    const category = await categoryRepo.findById(categoryId)
    if (category) {
      return {
        categoryId,
        categoryName: category.name,
        colorHex: category.color_hex ?? FALLBACK_COLOR,
        icon: category.icon,
        defaultAmount: category.default_amount ?? 0,
        predictedAt,
      }
    }
  }

  // No categories at all — return a neutral placeholder
  return {
    categoryId: null,
    categoryName: "Tap",
    colorHex: FALLBACK_COLOR,
    icon: "hand-pointing-up",
    defaultAmount: 0,
    predictedAt,
  }
}

export default getWidgetState
